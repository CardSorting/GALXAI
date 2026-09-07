import { readFile } from 'node:fs/promises';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { readJsonBody, RequestError, validateModelRequest } from './request-policy.js';
import type { RelayFederationLifecycle, RelayHandle } from './federation-lifecycle.js';

interface Options { apiKeys: string[]; adminKeys: string[]; secret: string; host?: string; port?: number; }
interface Affinity { shard: string; generation: string; job: string; tenant: string; expires: number; }
const equal = (a: string, b: string) => Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const terminal = (status: string) => ['completed', 'failed', 'cancelled'].includes(status);

/** Exact-model admission and signed, tenant-bound job affinity. No replay of ambiguous admissions. */
export class RelayFederationServer {
  readonly server: http.Server;
  private readonly reservations = new Map<string, number>();
  private readonly jobs = new Map<string, { relay: RelayHandle; tenant: string; job: string; expires: number }>();
  private readonly acknowledgements = new Map<string, number[]>();
  private readonly holds = new Set<NodeJS.Timeout>();
  private polling = false;
  private readonly timer: NodeJS.Timeout;
  constructor(readonly lifecycle: RelayFederationLifecycle, private readonly options: Options) {
    if (!options.apiKeys.length || !options.adminKeys.length || [...options.apiKeys, ...options.adminKeys].some(k => !k.trim()) || options.secret.length < 32) throw new Error('Federation requires inference, admin and signing credentials');
    this.server = http.createServer((req, res) => { void this.route(req, res).catch(error => {
      if (res.headersSent) { res.destroy(); return; }
      const e = error instanceof RequestError ? error : new RequestError(502, 'relay_unavailable', 'The selected relay could not complete this request.');
      this.json(res, e.status, { error: { code: e.code, message: e.message } });
    }); });
    this.server.headersTimeout = 15000;
    this.server.requestTimeout = 30000;
    this.timer = setInterval(() => { void this.poll(); }, 1000); this.timer.unref();
  }
  private json(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(status === 503 ? { 'Retry-After': '5', 'X-Should-Retry': 'true' } : {}) });
    res.end(JSON.stringify(body));
  }
  private authenticate(req: IncomingMessage, admin = false): string {
    const token = String(req.headers.authorization ?? '').replace(/^Bearer /, '');
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
  private reserve(shard: string) { this.reservations.set(shard, (this.reservations.get(shard) ?? 0) + 1); }
  private release(shard: string) { const n = (this.reservations.get(shard) ?? 1) - 1; if (n) this.reservations.set(shard, n); else this.reservations.delete(shard); }
  private async poll() {
    if (this.polling) return;
    this.polling = true;
    try {
      for (const [id, times] of this.acknowledgements) {
        const fresh = times.filter(at => at > Date.now() - 360000);
        if (!this.lifecycle.handle(id) || !fresh.length) this.acknowledgements.delete(id);
        else this.acknowledgements.set(id, fresh);
      }
      const entries = [...this.jobs.entries()]; let cursor = 0;
      await Promise.all(Array.from({ length: Math.min(8, entries.length) }, async () => {
        while (cursor < entries.length) {
          const [key, entry] = entries[cursor++];
          let done = entry.expires < Date.now();
          if (!done) try {
            const response = await fetch(`${entry.relay.endpoint}/v1/jobs/${entry.job}`, { headers: this.headers(entry.relay, entry.tenant), redirect: 'error', signal: AbortSignal.timeout(2000) });
            const body = await response.json(); done = response.status === 404 || (response.ok && terminal(body.status));
          } catch { /* An unavailable status endpoint does not release running work. */ }
          if (done) this.jobs.delete(key);
        }
      }));
    } finally { this.polling = false; }
  }
  private async proxy(req: IncomingMessage, res: ServerResponse, relay: RelayHandle, tenant: string, path: string) {
    const controller = new AbortController();
    const abort = () => controller.abort(); res.once('close', abort);
    const timeout = setTimeout(abort, 360000);
    try {
      const upstream = await fetch(`${relay.endpoint}${path}`, { method: req.method, headers: { ...this.headers(relay, tenant), ...(typeof req.headers['last-event-id'] === 'string' ? { 'Last-Event-ID': req.headers['last-event-id'] } : {}) }, redirect: 'error', signal: controller.signal });
      res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
      if (upstream.body) await pipeline(Readable.fromWeb(upstream.body as any), res); else res.end();
    } finally { clearTimeout(timeout); res.off('close', abort); }
  }
  private async route(req: IncomingMessage, res: ServerResponse) {
    // This is a server-to-server front door; browser requests need an application backend.
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) throw new RequestError(403, 'origin_not_allowed', 'Use the application backend for relay requests.');
    const url = new URL(req.url ?? '/', 'http://relay.local');
    const path = url.pathname;
    if (req.method === 'GET' && ['/federation', '/federation.js'].includes(path)) {
      const script = path.endsWith('.js');
      const content = await readFile(new URL(script ? './federation.js' : './federation.html', import.meta.url));
      res.writeHead(200, { 'Content-Type': script ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'", 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
      res.end(content); return;
    }
    if (req.method === 'GET' && path === '/health') return this.json(res, 200, { status: 'ok' });
    if (path.startsWith('/api/') || path === '/health/ready') {
      this.authenticate(req, true);
      if (req.method !== 'GET') throw new RequestError(405, 'method_not_allowed', 'Use GET.');
      if (path === '/api/capabilities') return this.json(res, 200, this.lifecycle.snapshot());
      if (path === '/health/ready') {
        const ready = this.lifecycle.routable() && this.lifecycle.capabilities.snapshot().models.some(m => m.eligibleShardCount > 0);
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
      return this.proxy(req, res, relay, tenant, `/v1/jobs/${affinity.job}${match[2] ?? ''}${url.search}`);
    }
    if (req.method === 'GET' && path === '/v1/models') return this.json(res, 200, { object: 'list', data: this.lifecycle.routable() ? this.lifecycle.capabilities.snapshot().models.filter(m => m.eligibleShardCount && !m.model.startsWith('image:')).map(m => ({ id: m.model, object: 'model', owned_by: 'galx' })) : [] });
    const image = path === '/v1/images/generations';
    if (req.method !== 'POST' || (!image && path !== '/v1/chat/completions')) throw new RequestError(404, 'not_found', 'Route not found.');
    const body = await readJsonBody(req, 2 * 1024 * 1024, 10000); validateModelRequest(body, image);
    if (!body.model) throw new RequestError(400, 'model_required', 'Specify the exact requested model.');
    if (!this.lifecycle.routable()) throw new RequestError(503, 'federation_unavailable', 'Shard ownership is being refreshed.');
    const capability = image ? `image:${body.model}` : body.model;
    const effectiveLoad = new Map<string, number>();
    for (const candidate of this.lifecycle.capabilities.eligible(capability)) {
      // Count admissions newer than the worker sample, then let fresh worker authority replace them.
      const recent = (this.acknowledgements.get(candidate.shardId) ?? []).filter(at => at >= candidate.heartbeatObservedAtMs);
      if (recent.length) this.acknowledgements.set(candidate.shardId, recent); else this.acknowledgements.delete(candidate.shardId);
      effectiveLoad.set(candidate.shardId, candidate.activeStreams + candidate.queueDepth + recent.length + (this.reservations.get(candidate.shardId) ?? 0));
    }
    const selected = this.lifecycle.capabilities.select(capability, effectiveLoad);
    if (!selected) throw new RequestError(503, this.lifecycle.capabilities.eligible(capability).length ? 'model_capacity_exhausted' : 'model_temporarily_unavailable', 'The requested model has no available capacity. Try again shortly.');
    if (this.jobs.size >= 10000) throw new RequestError(503, 'admission_capacity_exhausted', 'The relay is at its admission limit.');
    const relay = this.lifecycle.handle(selected.shardId);
    if (!relay || relay.generation !== selected.generation) throw new RequestError(503, 'relay_reconciling', 'Relay ownership is changing.');
    this.reserve(relay.shardId);
    let retained = false;
    try {
      const upstream = await fetch(`${relay.endpoint}${path}`, { method: 'POST', headers: this.headers(relay, tenant), body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(image ? 360000 : 15000) });
      if (image) {
        res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' });
        if (upstream.body) await pipeline(Readable.fromWeb(upstream.body as any), res); else res.end();
        return;
      }
      const result = await upstream.json();
      if (upstream.status === 202) {
        const job = result.id ?? result.jobId;
        if (typeof job !== 'string' || !/^[\w-]{1,128}$/.test(job)) throw new Error('Invalid worker admission');
        const expires = Date.now() + 360000;
        const key = `${relay.generation}:${job}`;
        if (!this.jobs.has(key)) { this.jobs.set(key, { relay, tenant, job, expires });
          this.acknowledgements.set(relay.shardId, [...(this.acknowledgements.get(relay.shardId) ?? []), Date.now()]); }
        const id = this.sign({ shard: relay.shardId, generation: relay.generation, job, tenant, expires: Date.now() + 86400000 });
        return this.json(res, 202, { ...result, id, jobId: id, streamUrl: `/v1/jobs/${id}/stream`, statusUrl: `/v1/jobs/${id}` });
      }
      if (upstream.status === 503) void this.lifecycle.reconcile();
      this.json(res, upstream.status, result);
    } catch (error) {
      // A lost acknowledgement may conceal admitted work. Never replay it or immediately return its slot.
      retained = true;
      const hold = setTimeout(() => { this.release(relay.shardId); this.holds.delete(hold); }, 360000);
      hold.unref(); this.holds.add(hold);
      throw error;
    } finally { if (!retained) this.release(relay.shardId); }
  }
  async start() { await new Promise<void>((resolve, reject) => { this.server.once('error', reject); this.server.listen(this.options.port ?? 3301, this.options.host ?? '127.0.0.1', resolve); }); }
  async stop() { clearInterval(this.timer); for (const hold of this.holds) clearTimeout(hold); await new Promise<void>(resolve => this.server.close(() => resolve())); }
}
