import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FederationTelemetry, monitorTrace } from '../src/relay/federation-telemetry.js';
import { RelayFederationLifecycle, type RelayHandle } from '../src/relay/federation-lifecycle.js';
import { MonitorActivity } from '../src/relay/monitor-activity.js';
import { CapabilityRegistry } from '../src/relay/capability-registry.js';

const start = 1800000000000;
const trace = (id = 'trace-1', status = 'running') => ({ id, operation: 'Chat completion', startedAt: start, durationMs: 1000, status,
  chunks: 2, maxChunkGapMs: 10, layer: 'provider', model: 'example-model', firstOutputMs: 500,
  attempts: [{ number: 1, shard: 'shard-0', startMs: 5 }], spans: [{ name: 'Request intake', layer: 'relay', startMs: 0, endMs: 5 }, { name: 'Wait for first output', layer: 'provider', startMs: 5 }], droppedSpans: 0 });
const handle = (i = 0): RelayHandle => ({ id: 'worker-' + i, shardId: 'shard-' + i, generation: 'generation-1', credentialRevision: 'rev', endpoint: 'http://worker-' + i, adminKey: 'ADMIN_SECRET_CANARY', inferenceKey: 'INFERENCE_SECRET_CANARY' });
function fake(count = 1) {
  let now = start + 1000;
  const handles = Array.from({ length: count }, (_, i) => handle(i)), activity = new MonitorActivity(() => now);
  const lifecycle = { monitorHandles: () => handles, handle: (id: string) => handles.find(h => h.shardId === id), activity } as unknown as RelayFederationLifecycle;
  return { lifecycle, handles, activity, now: () => now, advance: (ms: number) => { now += ms; } };
}
test('trace DTO excludes arbitrary upstream fields and clamps nested payloads', () => {
  const t = monitorTrace({ ...trace(), prompt: 'PROMPT_SECRET_CANARY', credentials: 'ADMIN_SECRET_CANARY', output: 'OUTPUT_SECRET_CANARY',
    error: 'PROVIDER_MESSAGE_SECRET_CANARY', spans: Array(80).fill({ name: 'PROMPT_SECRET_CANARY', layer: 'ADMIN_SECRET_CANARY', startMs: 0, endMs: 99999999, output: 'OUTPUT_SECRET_CANARY' }),
    attempts: Array(50).fill({ number: 1, shard: 'shard-0', startMs: 0, error: 'PROVIDER_MESSAGE_SECRET_CANARY' }) }, start + 1000)!;
  assert.equal(t.spans.length, 64); assert.equal(t.attempts.length, 16); assert.equal(t.error, 'unclassified_failure');
  assert.equal(t.spans[0].name, 'Unclassified phase'); assert.equal(t.spans[0].endMs, undefined);
  assert(!JSON.stringify(t).includes('SECRET_CANARY'));
  for (const bad of [{ startedAt: Infinity }, { durationMs: -1 }, { id: '<script>' }, { status: 'unknown' }, { startedAt: start - 3600000 }]) assert.equal(monitorTrace({ ...trace(), ...bad }, start + 1000), undefined);
});
test('collector is single-flight, bounds concurrency and caches without browser-driven fanout', async () => {
  const f = fake(14); let active = 0, maximum = 0, calls = 0;
  const transport = (async (_url: string, options: RequestInit) => {
    calls++; active++; maximum = Math.max(maximum, active);
    assert.equal((options.headers as Record<string, string>).Authorization, 'Bearer ADMIN_SECRET_CANARY'); assert.equal(options.redirect, 'error');
    await new Promise(resolve => setImmediate(resolve)); active--;
    return Response.json({ capturedAt: f.now(), evicted: 0, traces: [trace()] });
  }) as typeof fetch;
  const collector = new FederationTelemetry(f.lifecycle, transport, f.now);
  const first = collector.collect(); assert.equal(collector.collect(), first); await first;
  assert.equal(calls, 12); assert.equal(maximum, 3); assert.equal(collector.snapshot().partial, true);
  for (let i = 0; i < 20; i++) collector.snapshot(); assert.equal(calls, 12);
  await collector.collect(); assert.equal(collector.snapshot().sources.filter(s => s.fresh).length, 14);
  assert(!JSON.stringify(collector.snapshot()).includes('SECRET_CANARY')); await collector.stop();
});
test('generation fencing rejects telemetry returned by a replaced worker', async () => {
  const f = fake(); let resolve!: (value: Response) => void;
  const collector = new FederationTelemetry(f.lifecycle, (() => new Promise<Response>(r => { resolve = r; })) as typeof fetch, f.now);
  const pending = collector.collect(); f.handles[0] = { ...f.handles[0], generation: 'replacement' };
  resolve(Response.json({ capturedAt: f.now(), traces: [trace()] })); await pending;
  assert.equal(collector.snapshot().traces.length, 0); assert.equal(collector.snapshot().partial, true); await collector.stop();
});
test('failed samples retain evidence, mark running traces unconfirmed, deduplicate outages and recover', async () => {
  const f = fake(); let fail = false;
  const collector = new FederationTelemetry(f.lifecycle, (async () => { if (fail) throw Error('SECRET_CANARY'); return Response.json({ capturedAt: f.now(), traces: [trace()] }); }) as typeof fetch, f.now);
  await collector.collect(); assert.equal(collector.snapshot().traces[0].stale, false);
  fail = true; await collector.collect(); await collector.collect();
  assert.equal(collector.snapshot().traces[0].stale, true); assert.equal(collector.snapshot().partial, true);
  assert.equal(f.activity.snapshot().events.filter(e => e.code === 'telemetry_unavailable').length, 1);
  assert(!JSON.stringify(f.activity.snapshot()).includes('SECRET_CANARY'));
  fail = false; await collector.collect(); assert.equal(collector.snapshot().traces[0].stale, false);
  assert.equal(f.activity.snapshot().events.filter(e => e.code === 'telemetry_recovered').length, 1);
  f.advance(10001); assert.equal(collector.snapshot().traces[0].stale, true); await collector.stop();
});
test('completed evidence survives worker removal; retained data is capacity- and time-bounded', async () => {
  const f = fake(2);
  const collector = new FederationTelemetry(f.lifecycle, (async () => Response.json({ capturedAt: f.now(), traces: Array.from({ length: 500 }, (_, i) => trace('trace-' + i, 'completed')) })) as typeof fetch, f.now);
  await collector.collect(); assert.equal(collector.snapshot().traces.length, 500); assert.equal(collector.snapshot().evicted, 500);
  f.handles.splice(0); await collector.collect(); assert.equal(collector.snapshot().traces.length, 500); assert.equal(collector.snapshot().traces[0].stale, false);
  f.advance(3600001); assert.equal(collector.snapshot().traces.length, 0); await collector.stop();
});
test('malformed, oversized, stale and unsuccessful source responses do not establish fresh telemetry', async () => {
  for (const body of [Response.json({ capturedAt: start - 10000, traces: [trace()] }), Response.json({ capturedAt: start, traces: {} }), new Response('x'.repeat(4 * 1024 * 1024 + 1)), new Response('secret', { status: 500 })]) {
    const f = fake(), collector = new FederationTelemetry(f.lifecycle, (async () => body) as typeof fetch, f.now);
    await collector.collect(); assert.equal(collector.snapshot().partial, true); assert.equal(collector.snapshot().traces.length, 0); await collector.stop();
  }
});
test('lifecycle records decisions once instead of narrating every unchanged heartbeat', async () => {
  let now = start; const h = handle(), registry = new CapabilityRegistry(() => now); let invalid = false, listed = true, starts = 0;
  const shard = { id: h.shardId, provider: 'openai', credentialRevision: h.credentialRevision, accessToken: 'SECRET_CANARY', accountId: 'PRIVATE_ACCOUNT' };
  registry.register(h.shardId, h.id, h.generation, 'openai'); registry.publishInventory(registry.beginRefresh(h.shardId)!, ['example-model']);
  const lifecycle = new RelayFederationLifecycle(async () => [shard], { list: async () => listed ? [h] : [], start: async () => { starts++; return h; }, remove: async () => { listed = false; }, inspect: async () => ({ record: registry.get(h.shardId), invalidCredential: invalid }) }, () => now);
  await lifecycle.reconcile(); now += 1; registry.heartbeat(h.shardId, {}); await lifecycle.reconcile();
  assert.equal(lifecycle.activity.snapshot().events.filter(e => e.code === 'worker_adopted').length, 1);
  assert.equal(lifecycle.activity.snapshot().events.filter(e => e.code === 'worker_models_changed').length, 1);
  invalid = true; await lifecycle.reconcile(); await new Promise(resolve => setImmediate(resolve)); await lifecycle.reconcile();
  assert.equal(starts, 0); assert.equal(lifecycle.activity.snapshot().events.filter(e => e.code === 'credential_rejected').length, 1);
  assert(lifecycle.activity.snapshot().events.some(e => e.code === 'drain_credential_rejected'));
  assert(lifecycle.activity.snapshot().events.some(e => e.code === 'worker_removed'));
  assert(!JSON.stringify(lifecycle.monitorState()).includes('SECRET_CANARY')); await lifecycle.stop();
});
test('local event journal bounds records and reports truncation', () => {
  let now = start; const journal = new MonitorActivity(() => now);
  for (let i = 0; i < 600; i++) journal.record({ category: 'fleet', level: 'info', code: 'worker_started', count: i });
  assert.equal(journal.snapshot().events.length, 500); assert.equal(journal.snapshot().evicted, 100);
  now += 3600001; assert.equal(journal.snapshot().events.length, 0); assert.equal(journal.snapshot().evicted, 600);
});


test('activity drops unexpected runtime payloads and invalid numeric context', () => {
  const activity = new MonitorActivity();
  activity.record({ category: 'fleet', level: 'info', code: 'worker_adopted',
    shardId: 's', count: Infinity, durationMs: 25, headers: { Authorization: 'PRIVATE_TOKEN' },
    error: 'PRIVATE_EXCEPTION', prompt: 'PRIVATE_PROMPT', clipboard: 'PRIVATE_CLIPBOARD' } as any);
  const snapshot = activity.snapshot(), event = snapshot.events[0];
  assert.equal(event.durationMs, 25); assert.equal(event.count, undefined);
  assert.deepEqual(Object.keys(event).sort(), ['at', 'category', 'code', 'durationMs', 'id', 'level', 'shardId']);
  assert(!JSON.stringify(snapshot).includes('PRIVATE_'));
  event.shardId = 'mutated'; assert.equal(activity.snapshot().events[0].shardId, 's');
});
