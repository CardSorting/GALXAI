import { readFile } from 'node:fs/promises';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { AdmissionReceipts } from './admission-receipts.js';
import { MonitorSessions } from './monitor-sessions.js';
import { FederationTelemetry } from './federation-telemetry.js';
import { safeLabel } from './telemetry.js';
import { DesktopGateway } from './desktop-gateway.js';
import type { DesktopManager } from './desktop-manager.js';
import { readRelayJson, relayRequestHeaders, relayResponseHeaders } from './federation-http-policy.js';
import { readJsonBody, RequestError, validateModelRequest } from './request-policy.js';
import type { RelayFederationLifecycle, RelayHandle } from './federation-lifecycle.js';

interface Options { apiKeys: string[]; adminKeys: string[]; secret: string; host?: string; port?: number; drainTimeoutMs?: number; admissionTimeoutMs?: number; transport?: typeof fetch; egressSnapshot?: () => unknown; desktops?: DesktopManager; }
interface Affinity { shard: string; generation: string; job: string; tenant: string; expires: number; }
const equal = (a: string, b: string) => Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const terminal = (status: string) => ['completed', 'failed', 'cancelled'].includes(status);

/** Exact-model admission and signed, tenant-bound job affinity. No replay of ambiguous admissions. */
export class RelayFederationServer {
  readonly server: http.Server;
  private readonly reservations = new Map<string, number>();
  private readonly jobs = new Map<string, { relay: RelayHandle; tenant: string; job: string; expires: number; nextPollAt: number; pollDelayMs: number }>();
  private readonly acknowledgements = new Map<string, number[]>();
  private readonly holds = new Set<NodeJS.Timeout>();
  private polling = false;
  private stopping?: Promise<void>;
  private draining = false;
  private readonly shutdown = new AbortController();
  private readonly instanceId = randomUUID();
  private readonly receipts = new AdmissionReceipts();
  private readonly monitor = new MonitorSessions();
  private readonly telemetry: FederationTelemetry;
  private readonly desktops: DesktopGateway;
  private readonly observations = new WeakMap<IncomingMessage, { startedAt: number; code?: string; model?: string; shardId?: string }>();
  private readonly requests = new WeakMap<IncomingMessage, string>();
  private readonly timer: NodeJS.Timeout;
  constructor(readonly lifecycle: RelayFederationLifecycle, private readonly options: Options) {
    if (!options.apiKeys.length || !options.adminKeys.length || [...options.apiKeys, ...options.adminKeys].some(k => !k.trim()) || options.secret.length < 32) throw new Error('Federation requires inference, admin and signing credentials');
    for (const value of [options.drainTimeoutMs ?? 30000, options.admissionTimeoutMs ?? 15000]) if (!Number.isSafeInteger(value) || value < 1 || value > 360000) throw new Error('Invalid federation timeout');
    this.telemetry = new FederationTelemetry(lifecycle, options.transport ?? fetch);
    this.desktops = new DesktopGateway(options.desktops, req => this.authenticate(req, true), () => lifecycle.workspaceShards(),
      (id, paused, generation) => lifecycle.setMaintenance(id, paused, generation),
      (id, revision) => lifecycle.monitorHandles().some(h => h.shardId === id && h.credentialRevision === revision));
    this.server = http.createServer((req, res) => { const requestId = randomUUID(); this.requests.set(req, requestId); res.setHeader('X-Request-Id', requestId); res.setHeader('X-Galx-Idempotency-Scope', this.instanceId); res.setHeader('X-Galx-Idempotency-Ttl', '600'); void this.route(req, res).catch(error => {
      if (res.headersSent) { res.destroy(); return; }
      const e = error instanceof RequestError ? error : new RequestError(502, 'relay_unavailable', 'The selected relay could not complete this request.');
      const observation = this.observations.get(req); if (observation) observation.code = e.code;
      const uncertain = ['relay_admission_unknown', 'idempotency_scope_changed', 'request_in_progress', 'idempotency_conflict'].includes(e.code);
      const accepted = ['job_transport_unavailable', 'relay_generation_gone', 'result_not_retained'].includes(e.code);
      this.json(res, e.status, { error: { code: e.code, message: e.message, request_id: requestId, execution_state: uncertain ? 'unknown' : accepted ? 'accepted' : 'not_accepted' } },
        e.code === 'request_in_progress' || e.code === 'job_transport_unavailable' ? { 'retry-after': '2', 'x-should-retry': 'true' } : uncertain || accepted ? { 'x-should-retry': 'false' } : {});
    }); });
    this.server.headersTimeout = 15000;
    this.server.on('upgrade', (req, socket, head) => { void this.desktops.upgrade(req, socket, head); });
    this.server.requestTimeout = 30000;
    this.timer = setInterval(() => { void this.poll(); }, 1000); this.timer.unref();
  }
  private json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(status === 503 ? { 'retry-after': '5', 'x-should-retry': 'true' } : {}), ...headers });
    res.end(JSON.stringify(body));
  }
  private authenticate(req: IncomingMessage, admin = false): string {
    const authorization = req.headers.authorization;
    const token = (authorization ? /^Bearer\s+(.+)$/i.exec(authorization)?.[1] : req.headers['x-galx-api-key'])?.toString().trim() ?? '';
    if (!(admin ? this.options.adminKeys : this.options.apiKeys).some(key => equal(key, token))) throw new RequestError(401, 'unauthorized', 'A valid API key is required.');
    return createHash('sha256').update(token).digest('hex');
  }
  private headers(relay: RelayHandle, tenant: string) { return { Authorization: `Bearer ${relay.inferenceKey}`, 'Content-Type': 'application/json', 'X-Galx-Tenant': tenant }; }
  private sign(value: Affinity): string {
    const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${payload}.${createHmac('sha256', this.options.secret).update(payload).digest('base64url')}`;
  }
  private verify(token: string, tenant: string): Affinity {
    const [payload, signature, extra] = token.split('.');
    if (token.length > 2048 || extra || !signature || !equal(signature, createHmac('sha256', this.options.secret).update(payload).digest('base64url'))) throw new RequestError(404, 'job_not_found', 'Job not found or no longer retained.');
    let value: Affinity;
    try { value = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw new RequestError(404, 'job_not_found', 'Job not found.'); }
    if (value.tenant !== tenant || !Number.isFinite(value.expires) || value.expires < Date.now() || !/^[\w-]{1,128}$/.test(value.job)) throw new RequestError(404, 'job_not_found', 'Job not found or no longer retained.');
    return value;
  }
  private owner(relay: Pick<RelayHandle, 'shardId' | 'generation'>) { return JSON.stringify([relay.shardId, relay.generation]); }
  private request(url: string, init: RequestInit) { return (this.options.transport ?? fetch)(url, { ...init, signal: init.signal ? AbortSignal.any([init.signal, this.shutdown.signal]) : this.shutdown.signal }); }
  private reserve(shard: string) { this.reservations.set(shard, (this.reservations.get(shard) ?? 0) + 1); }
  private release(shard: string) { const n = (this.reservations.get(shard) ?? 1) - 1; if (n) this.reservations.set(shard, n); else this.reservations.delete(shard); }
  private async poll() {
    if (this.polling || this.draining) return;
    this.polling = true;
    try {
      this.receipts.prune();
      for (const [id, times] of this.acknowledgements) {
        const fresh = times.filter(at => at > Date.now() - 360000);
        if (!fresh.length) this.acknowledgements.delete(id); else this.acknowledgements.set(id, fresh);
      }
      const entries: Array<[string, { relay: RelayHandle; tenant: string; job: string; expires: number; nextPollAt: number; pollDelayMs: number }]> = [];
      const perOwner = new Map<string, number>();
      for (const [key, entry] of this.jobs) {
        if (entry.expires <= Date.now() || this.lifecycle.handle(entry.relay.shardId)?.generation !== entry.relay.generation) { this.jobs.delete(key); continue; }
        const owner = this.owner(entry.relay);
        if (entry.nextPollAt > Date.now() || (perOwner.get(owner) ?? 0) >= 2 || entries.length >= 32) continue;
        perOwner.set(owner, (perOwner.get(owner) ?? 0) + 1); entries.push([key, entry]);
      }
      // Move only the selected batch to the tail. A slow shard cannot monopolize the next batch.
      for (const [key, entry] of entries) { this.jobs.delete(key); this.jobs.set(key, entry); }
      let cursor = 0;
      await Promise.all(Array.from({ length: Math.min(4, entries.length) }, async () => {
        while (cursor < entries.length && !this.draining) {
          const [key, entry] = entries[cursor++];
          let done = entry.expires < Date.now();
          if (!done) try {
            const response = await this.request(`${entry.relay.endpoint}/v1/jobs/${entry.job}`, { headers: this.headers(entry.relay, entry.tenant), redirect: 'error', signal: AbortSignal.timeout(2000) });
            const body = await readRelayJson(response); done = response.status === 404 || (response.ok && terminal(body.status));
          } catch { /* An unavailable status endpoint does not release running work. */ }
          if (done) this.jobs.delete(key);
          else { entry.pollDelayMs = Math.min(16000, entry.pollDelayMs * 2); entry.nextPollAt = Date.now() + entry.pollDelayMs; }
        }
      }));
    } finally { this.polling = false; }
  }
  private async proxy(req: IncomingMessage, res: ServerResponse, relay: RelayHandle, tenant: string, path: string, publicId: string) {
    const controller = new AbortController();
    const abort = () => controller.abort(); res.once('close', abort);
    const timeout = setTimeout(abort, 360000);
    try {
      const upstream = await this.request(`${relay.endpoint}${path}`, { method: req.method, headers: { ...this.headers(relay, tenant), ...(typeof req.headers['last-event-id'] === 'string' ? { 'Last-Event-ID': req.headers['last-event-id'] } : {}) }, redirect: 'error', signal: controller.signal });
      if (!path.split('?')[0].endsWith('/stream')) {
        const result = await readRelayJson(upstream);
        if (upstream.ok) {
          if (result.id !== undefined) result.id = publicId;
          if (result.jobId !== undefined) result.jobId = publicId;
          if (result.streamUrl !== undefined) result.streamUrl = `/v1/jobs/${publicId}/stream`;
          if (result.statusUrl !== undefined) result.statusUrl = `/v1/jobs/${publicId}`;
        }
        this.json(res, upstream.status, result, relayResponseHeaders(upstream.headers)); return;
      }
      res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', ...relayResponseHeaders(upstream.headers) });
      if (upstream.body) await pipeline(Readable.fromWeb(upstream.body as any), res); else res.end();
    } catch { throw new RequestError(502, 'job_transport_unavailable', 'This job was already accepted. Retry its status or stream URL; do not submit a new inference request.'); }
    finally { clearTimeout(timeout); res.off('close', abort); }
  }
  private async route(req: IncomingMessage, res: ServerResponse) {
    // This is a server-to-server front door; browser requests need an application backend.
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) throw new RequestError(403, 'origin_not_allowed', 'Use the application backend for relay requests.');
    const forwarded = relayRequestHeaders(req.headers);
    const url = new URL(req.url ?? '/', 'http://relay.local');
    const path = url.pathname;
    if (await this.desktops.route(req, res, url)) return;
    if (req.method === 'GET' && ['/', '/monitor', '/dashboard'].includes(path)) {
      res.writeHead(302, { Location: '/federation', 'Cache-Control': 'no-store' }); res.end(); return;
    }
    if (path.startsWith('/api/monitor/')) {
      this.monitor.origin(req);
      if (path === '/api/monitor/access' && req.method === 'POST') {
        this.authenticate(req, true);
        return this.json(res, 200, this.monitor.issue(req));
      }
      if (path === '/api/monitor/session' && req.method === 'POST') {
        const body = await readJsonBody(req, 1024, 3000);
        return this.json(res, 200, { connected: true }, { 'Set-Cookie': this.monitor.exchange(req, body.ticket) });
      }
      if (path === '/api/monitor/session' && req.method === 'DELETE') {
        return this.json(res, 200, { connected: false }, { 'Set-Cookie': this.monitor.revoke(req) });
      }
      if (!this.monitor.authorized(req)) throw new RequestError(401, 'monitor_session_required', 'Open the monitor from the host computer to reconnect.');
      if (path === '/api/monitor/state' && req.method === 'GET') return this.json(res, 200, this.monitorSnapshot());
      if (path === '/api/monitor/capabilities' && req.method === 'GET') return this.json(res, 200, this.lifecycle.snapshot());
      throw new RequestError(404, 'not_found', 'Route not found.');
    }
    if (req.method === 'GET' && ['/federation', '/federation.js', '/monitor-login.js'].includes(path)) {
      const script = path.endsWith('.js');
      const connected = this.monitor.authorized(req) && (script || url.searchParams.get('connect') !== '1');
      if (path === '/federation.js' && !connected) throw new RequestError(401, 'monitor_session_required', 'Open the monitor to reconnect.');
      const resource = path === '/monitor-login.js' ? './monitor-login.js' : connected
        ? script ? './federation.js' : './federation.html' : './monitor-login.html';
      const content = await readFile(new URL(resource, import.meta.url));
      res.writeHead(200, { 'Content-Type': script ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
      res.end(content); return;
    }
    if (req.method === 'GET' && path === '/health') return this.json(res, 200, { status: 'ok' });
    if (path.startsWith('/api/') || path === '/health/ready') {
      this.authenticate(req, true);
      if (req.method !== 'GET') throw new RequestError(405, 'method_not_allowed', 'Use GET.');
      if (path === '/api/capabilities') return this.json(res, 200, this.lifecycle.snapshot());
      if (path === '/api/telemetry') return this.json(res, 200, this.monitorSnapshot());
      if (path === '/api/egress' && this.options.egressSnapshot) return this.json(res, 200, this.options.egressSnapshot());
      if (path === '/health/ready') {
        const ready = !this.draining && this.lifecycle.routable() && this.lifecycle.capabilities.snapshot().models.some(m => m.eligibleShardCount > 0);
        return this.json(res, ready ? 200 : 503, { ready });
      }
      throw new RequestError(404, 'not_found', 'Route not found.');
    }
    const tenant = this.authenticate(req);
    const match = path.match(/^\/v1\/jobs\/([^/]+)(\/(?:stream|cancel))?$/);
    if (match) {
      if (req.method !== (match[2] === '/cancel' ? 'POST' : 'GET')) throw new RequestError(405, 'method_not_allowed', 'Unsupported job method.');
      const affinity = this.verify(match[1], tenant);
      const relay = this.lifecycle.handle(affinity.shard);
      if (!relay || relay.generation !== affinity.generation) throw new RequestError(410, 'relay_generation_gone', 'The relay that owns this job is no longer available.');
      return this.proxy(req, res, relay, tenant, `/v1/jobs/${affinity.job}${match[2] ?? ''}${url.search}`, match[1]);
    }
    if (req.method === 'GET' && path === '/v1/models') return this.json(res, 200, { object: 'list', data: this.lifecycle.routable() ? this.lifecycle.capabilities.snapshot().models.filter(m => m.eligibleShardCount && !m.model.startsWith('image:')).map(m => ({ id: m.model, object: 'model', owned_by: 'galx' })) : [] });
    const image = path === '/v1/images/generations';
    if (req.method !== 'POST' || (!image && path !== '/v1/chat/completions')) throw new RequestError(404, 'not_found', 'Route not found.');
    const observation: { startedAt: number; code?: string; model?: string; shardId?: string } = { startedAt: performance.now() };
    this.observations.set(req, observation);
    let reported = false;
    const report = (closed: boolean) => {
      if (reported) return; reported = true;
      const status = res.statusCode;
      this.lifecycle.activity.record({ category: 'request', level: closed || status >= 500 ? 'error' : status >= 400 ? 'warning' : 'info',
        code: closed ? 'response_interrupted' : observation.code ?? (status === 202 ? 'request_accepted' : status >= 400 ? 'request_failed' : 'response_completed'),
        requestId: this.requests.get(req), traceId: safeLabel(res.getHeader('x-galx-trace-id')), model: observation.model, shardId: observation.shardId,
        httpStatus: closed ? undefined : status, durationMs: Math.max(0, performance.now() - observation.startedAt) });
    };
    res.once('finish', () => report(false)); res.once('close', () => report(!res.writableFinished));
    if (this.draining) throw new RequestError(503, 'server_draining', 'New work is paused while accepted requests finish.');
    const body = await readJsonBody(req, 2 * 1024 * 1024, 10000); validateModelRequest(body, image);
    observation.model = safeLabel(body.model);
    if (this.draining) throw new RequestError(503, 'server_draining', 'New work is paused while accepted requests finish.');
    if (!body.model) throw new RequestError(400, 'model_required', 'Specify the exact requested model.');
    const scope = req.headers['x-galx-idempotency-scope'];
    if (scope !== undefined && scope !== this.instanceId) throw new RequestError(409, 'idempotency_scope_changed', 'The relay retry window changed after a restart. Inspect the existing job before submitting new work.');
    const replayKey = forwarded['idempotency-key'] || (image ? body.idempotency_key : undefined);
    const fingerprintBody = { ...body };
    if (image) delete fingerprintBody.idempotency_key;
    const replay = replayKey ? this.receipts.begin(tenant, path, replayKey, fingerprintBody) : undefined;
    if (replay?.existing) {
      if (replay.receipt.state === 'pending') throw new RequestError(409, 'request_in_progress', 'This request is already running. Retry with the same key to retrieve its result.');
      if (replay.receipt.state === 'unknown') throw new RequestError(502, 'relay_admission_unknown', 'This request may have executed. Its acknowledgement is unavailable; do not submit duplicate work.');
      const cached = replay.receipt.response;
      if (!cached) throw new RequestError(409, 'result_not_retained', 'This request finished, but its response exceeded the replay budget. Do not repeat it as new work.');
      res.writeHead(cached.status, { ...cached.headers, 'x-galx-idempotency-hit': 'true' }); res.end(cached.body); return;
    }
    try {
      if (!this.lifecycle.routable()) throw new RequestError(503, 'federation_unavailable', 'Shard ownership is being refreshed.');
      const capability = image ? `image:${body.model}` : body.model;
      const effectiveLoad = new Map<string, number>();
      for (const candidate of this.lifecycle.capabilities.eligibleLoad(capability)) {
        // Count admissions newer than the worker sample, then let fresh worker authority replace them.
        const recent = (this.acknowledgements.get(this.owner(candidate)) ?? []).filter(at => at >= candidate.heartbeatObservedAtMs);
        if (recent.length) this.acknowledgements.set(this.owner(candidate), recent); else this.acknowledgements.delete(this.owner(candidate));
        effectiveLoad.set(candidate.shardId, candidate.activeStreams + candidate.queueDepth + recent.length + (this.reservations.get(this.owner(candidate)) ?? 0));
      }
      const selected = this.lifecycle.capabilities.select(capability, effectiveLoad);
      if (!selected) throw new RequestError(503, this.lifecycle.capabilities.eligible(capability).length ? 'model_capacity_exhausted' : 'model_temporarily_unavailable', 'The requested model has no available capacity. Try again shortly.');
      if (this.jobs.size >= 10000) throw new RequestError(503, 'admission_capacity_exhausted', 'The relay is at its admission limit.');
      const relay = this.lifecycle.handle(selected.shardId);
      if (!relay || relay.generation !== selected.generation) throw new RequestError(503, 'relay_reconciling', 'Relay ownership is changing.');
      const owner = this.owner(relay);
      observation.shardId = relay.shardId;
      this.reserve(owner);
      let retained = false;
      let acknowledged = false;
      try {
        const upstream = await this.request(`${relay.endpoint}${path}`, { method: 'POST', headers: { ...this.headers(relay, tenant), ...forwarded, 'x-request-id': this.requests.get(req)! }, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(image ? 360000 : this.options.admissionTimeoutMs ?? 15000) });
        if (image) {
          acknowledged = true; // Image headers are sent only after synthesis has settled.
          const headers = { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store', ...relayResponseHeaders(upstream.headers) };
          res.writeHead(upstream.status, headers);
          const capture = replay ? this.receipts.capture() : undefined;
          try {
            if (upstream.body) {
              const tap = new Transform({ transform(chunk, _encoding, done) { capture?.append(chunk); done(null, chunk); } });
              await pipeline(Readable.fromWeb(upstream.body as any), tap, res);
            } else res.end();
            if (replay) this.receipts.complete(replay.receipt, upstream.status, headers, capture!.finish());
          } finally { capture?.discard(); }
          return;
        }
        const result = await readRelayJson(upstream);
        if (upstream.status === 202) {
          const job = result.id ?? result.jobId;
          if (typeof job !== 'string' || !/^[\w-]{1,128}$/.test(job)) throw new Error('Invalid worker admission');
          acknowledged = true;
          const expires = Date.now() + 360000;
          const key = `${relay.generation}:${job}`;
          if (!this.jobs.has(key)) { this.jobs.set(key, { relay, tenant, job, expires, nextPollAt: Date.now() + 2000, pollDelayMs: 2000 });
            this.acknowledgements.set(owner, [...(this.acknowledgements.get(owner) ?? []), Date.now()]); }
          const id = this.sign({ shard: relay.shardId, generation: relay.generation, job, tenant, expires: Date.now() + 86400000 });
          const answer = { ...result, id, jobId: id, streamUrl: `/v1/jobs/${id}/stream`, statusUrl: `/v1/jobs/${id}` };
          const headers = { ...relayResponseHeaders(upstream.headers), 'Location': answer.streamUrl, 'Operation-Location': answer.statusUrl,
            'retry-after': upstream.headers.get('retry-after') || '2', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
          if (replay) this.receipts.complete(replay.receipt, 202, headers, Buffer.from(JSON.stringify(answer)));
          return this.json(res, 202, answer, headers);
        }
        if (upstream.status < 400) throw new Error('Unexpected relay admission contract');
        if (replay) this.receipts.forget(replay.id);
        if (upstream.status === 503) void this.lifecycle.reconcile();
        this.json(res, upstream.status, result, relayResponseHeaders(upstream.headers));
      } catch (error) {
        // A lost acknowledgement may conceal admitted work. Never replay it or immediately return its slot.
        retained = !acknowledged && !this.shutdown.signal.aborted;
        if (replay) replay.receipt.state = 'unknown';
        if (retained) {
          const hold = setTimeout(() => { this.release(owner); this.holds.delete(hold); }, 360000);
          hold.unref(); this.holds.add(hold);
        }
        throw new RequestError(502, 'relay_admission_unknown', 'The relay acknowledgement was lost. Execution may have started; do not submit duplicate work.');
      } finally { if (!retained) this.release(owner); }
    } catch (error) { if (replay && replay.receipt.state === 'pending') this.receipts.forget(replay.id); throw error; }
  }
  private monitorSnapshot() { return { capturedAt: Date.now(), availability: this.lifecycle.snapshot(), fleet: this.lifecycle.monitorState(),
    desktops: this.options.desktops?.snapshot().desktops.map(d => ({ id: d.id, name: d.name, shardId: d.relayId ?? null })) ?? [],
    activity: this.lifecycle.activity.snapshot(), telemetry: this.telemetry.snapshot(), admission: { draining: this.draining,
      pending: [...this.reservations.values()].reduce((a, b) => a + b, 0), trackedJobs: this.jobs.size } }; }
  async start() { if (this.draining) throw new Error('Federation already stopped'); await new Promise<void>((resolve, reject) => { this.server.once('error', reject); this.server.listen(this.options.port ?? 3301, this.options.host ?? '127.0.0.1', resolve); }); this.telemetry.start(); }
  stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    this.draining = true; clearInterval(this.timer); void this.telemetry.stop(); const desktopSettled = this.desktops.close();
    this.stopping = new Promise<void>(resolve => {
      const deadline = setTimeout(() => { this.shutdown.abort(); this.server.closeAllConnections(); }, this.options.drainTimeoutMs ?? 30000);
      this.server.close(() => { clearTimeout(deadline); this.shutdown.abort(); for (const hold of this.holds) clearTimeout(hold); this.holds.clear(); this.jobs.clear(); this.reservations.clear(); resolve(); });
      this.server.closeIdleConnections();
    }).then(() => desktopSettled);
    return this.stopping;
  }
}
