import { readRelayJson } from './federation-http-policy.js';
import type { RelayFederationLifecycle } from './federation-lifecycle.js';
import { safeLabel, type Trace, type Layer, type TraceStatus } from './telemetry.js';

const layers: Layer[] = ['provider', 'transport', 'relay', 'client', 'unknown'];
const statuses: TraceStatus[] = ['running', 'completed', 'failed', 'cancelled', 'attached'];
const phases = new Set(['Request intake', 'Attach to existing job', 'Shard selection', 'Connect to provider', 'Provider request (includes network)', 'Wait for first output', 'Stream output', 'Retry / shard selection', 'Generate image (includes network)']);
const failures = new Set(['relay_memory_pressure', 'relay_overloaded', 'relay_rate_limited', 'relay_retry_budget_exhausted', 'image_wall_time_exceeded', 'quota_exhausted', 'credential_rejected', 'provider_error', 'client_cancelled', 'upstream_timeout_or_disconnect', 'relay_unavailable', 'unclassified_failure']);
const object = (x: unknown): Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : {};
const number = (x: unknown, max = Number.MAX_SAFE_INTEGER) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= max ? x : undefined;
const layer = (x: unknown): Layer => layers.includes(x as Layer) ? x as Layer : 'unknown';
const failure = (x: unknown): string | undefined => typeof x === 'string' ? failures.has(x) || /^(?:upstream_)?http_[1-5]\d{2}$/.test(x) ? x : 'unclassified_failure' : undefined;
export function monitorTrace(value: unknown, now: number): Trace | undefined {
  const t = object(value), id = safeLabel(t.id), startedAt = number(t.startedAt, now + 10000), durationMs = number(t.durationMs, 86400000);
  if (!id || startedAt === undefined || startedAt < now - 3600000 || durationMs === undefined || !statuses.includes(t.status as TraceStatus)) return;
  // Explicit DTO: no prompts, output, arbitrary phase/error strings, headers or worker runtime objects.
  return { id, jobId: safeLabel(t.jobId), attachedToJobId: safeLabel(t.attachedToJobId), taskId: safeLabel(t.taskId),
    operation: ['Image generation', 'Chat completion'].includes(t.operation as string) ? t.operation as string : 'Request',
    model: safeLabel(t.model), requestedModel: safeLabel(t.requestedModel), startedAt, durationMs, status: t.status as TraceStatus,
    httpStatus: number(t.httpStatus, 599), error: failure(t.error), layer: layer(t.layer), firstOutputMs: number(t.firstOutputMs, durationMs),
    chunks: number(t.chunks) ?? 0, maxChunkGapMs: number(t.maxChunkGapMs, durationMs) ?? 0, droppedSpans: number(t.droppedSpans) ?? 0,
    attempts: (Array.isArray(t.attempts) ? t.attempts.slice(0, 16) : []).flatMap(value => {
      const a = object(value), startMs = number(a.startMs, durationMs); if (startMs === undefined) return [];
      const endMs = number(a.endMs, durationMs);
      return [{ number: number(a.number, 16) ?? 1, shard: safeLabel(a.shard) ?? 'unknown', startMs, endMs: endMs !== undefined && endMs >= startMs ? endMs : undefined, error: failure(a.error), layer: layer(a.layer) }];
    }),
    spans: (Array.isArray(t.spans) ? t.spans.slice(0, 64) : []).flatMap(value => {
      const s = object(value), startMs = number(s.startMs, durationMs); if (startMs === undefined) return [];
      const endMs = number(s.endMs, durationMs);
      return [{ name: phases.has(s.name as string) ? s.name as string : 'Unclassified phase', layer: layer(s.layer), startMs, endMs: endMs !== undefined && endMs >= startMs ? endMs : undefined, attempt: number(s.attempt, 16) }];
    }) };
}
interface Sample { shardId: string; generation: string; lastAttemptAt: number; lastSuccessAt?: number; state: 'ok' | 'unavailable'; evicted?: number; }
interface CollectedTrace extends Trace { key: string; shardId: string; generation: string; observedAt: number; }
/** Background, single-flight, bounded collection: opening more browser tabs never adds worker traffic. */
export class FederationTelemetry {
  private readonly traces = new Map<string, CollectedTrace>();
  private readonly sources = new Map<string, Sample>();
  private pending?: Promise<void>;
  private timer?: NodeJS.Timeout;
  private readonly abort = new AbortController();
  private cursor = 0;
  private evicted = 0;
  readonly startedAt: number;
  readonly capacity = 500;
  readonly retentionMs = 3600000;
  constructor(private readonly lifecycle: RelayFederationLifecycle, private readonly transport: typeof fetch = fetch, private readonly now = Date.now) { this.startedAt = now(); }
  start() { if (this.timer) return; void this.collect(); this.timer = setInterval(() => { void this.collect(); }, 3000); this.timer.unref(); }
  async stop() { if (this.timer) clearInterval(this.timer); this.abort.abort(); await this.pending; }
  collect(): Promise<void> {
    if (this.abort.signal.aborted) return Promise.resolve();
    return this.pending ??= this.run().finally(() => { this.pending = undefined; });
  }
  private async run() {
    const handles = this.lifecycle.monitorHandles();
    for (const [id, source] of this.sources) if (!handles.some(h => h.shardId === id && h.generation === source.generation)) this.sources.delete(id);
    const batch = Array.from({ length: Math.min(12, handles.length) }, (_, i) => handles[(this.cursor + i) % handles.length]);
    this.cursor = handles.length ? (this.cursor + batch.length) % handles.length : 0;
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(3, batch.length) }, async () => {
      while (cursor < batch.length && !this.abort.signal.aborted) {
        const handle = batch[cursor++], old = this.sources.get(handle.shardId);
        const source: Sample = { shardId: handle.shardId, generation: handle.generation, lastAttemptAt: this.now(), state: 'unavailable', lastSuccessAt: old?.lastSuccessAt, evicted: old?.evicted };
        const current = () => this.lifecycle.handle(handle.shardId)?.generation === handle.generation && !this.abort.signal.aborted;
        try {
          const response = await this.transport(`${handle.endpoint}/api/telemetry`, { headers: { Authorization: `Bearer ${handle.adminKey}` }, redirect: 'error', signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(2000)]) });
          if (!response.ok) { await response.body?.cancel(); throw new Error('unavailable'); }
          const body = await readRelayJson(response, 4 * 1024 * 1024);
          if (!Array.isArray(body.traces) || number(body.capturedAt, this.now() + 10000) === undefined || body.capturedAt < this.now() - 10000) throw new Error('stale');
          if (!current()) continue;
          source.state = 'ok'; source.lastSuccessAt = this.now(); source.evicted = number(body.evicted) ?? 0;
          for (const item of body.traces.slice(0, 500)) {
            const t = monitorTrace(item, this.now()); if (!t) continue;
            const key = `${handle.shardId}:${handle.generation}:${t.id}`;
            this.traces.set(key, { ...t, key, shardId: handle.shardId, generation: handle.generation, observedAt: this.now() });
          }
          if (old?.state === 'unavailable') this.lifecycle.activity.record({ category: 'telemetry', level: 'info', code: 'telemetry_recovered', shardId: handle.shardId });
        } catch {
          if (!current()) continue;
          if (old?.state !== 'unavailable') this.lifecycle.activity.record({ category: 'telemetry', level: 'warning', code: 'telemetry_unavailable', shardId: handle.shardId });
        }
        if (current()) this.sources.set(handle.shardId, source);
      }
    }));
    this.prune();
  }
  private prune() {
    const ordered = [...this.traces.values()].sort((a, b) => b.startedAt - a.startedAt);
    for (const [i, t] of ordered.entries()) if (i >= this.capacity || t.startedAt < this.now() - this.retentionMs) { this.traces.delete(t.key); this.evicted++; }
  }
  snapshot() {
    this.prune(); const now = this.now(), handles = this.lifecycle.monitorHandles();
    const sources = handles.map(h => {
      const s = this.sources.get(h.shardId);
      return s?.generation === h.generation ? { ...s, fresh: s.state === 'ok' && now - (s.lastSuccessAt ?? 0) < 10000 } : { shardId: h.shardId, generation: h.generation, state: 'pending' as const, fresh: false };
    });
    return { startedAt: this.startedAt, capturedAt: now, capacity: this.capacity, retentionMs: this.retentionMs, evicted: this.evicted,
      sources, partial: sources.some(s => !s.fresh),
      traces: [...this.traces.values()].sort((a, b) => b.startedAt - a.startedAt).map(t => ({ ...structuredClone(t),
        stale: t.status === 'running' && (!sources.some(s => s.shardId === t.shardId && s.generation === t.generation && s.fresh) || now - t.observedAt >= 10000) })) };
  }
}
