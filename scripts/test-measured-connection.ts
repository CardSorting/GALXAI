import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SlaHealthEngine, CONNECTION_CHECK_INTERVAL_MS } from '../src/lib/resilience/SlaHealthEngine';
import { BroccoliResilienceSubstrate } from '../src/lib/resilience/BroccoliResilienceSubstrate';

test('empty and legacy synthetic histories never imply availability or fabricated latency', () => {
  const substrate = BroccoliResilienceSubstrate.getInstance();
  assert.equal(substrate.incidentTable.count(), 0);
  substrate.slaTable.clear();
  substrate.recordSlaProbe({ timestampMs: Date.now(), latencyMs: 14, success: true, status: 'healthy', endpoint: '/api/version' });
  const stats = substrate.getSlaStats();
  assert.equal(stats.totalProbes, 0); assert.equal(stats.p50LatencyMs, null);
  assert.equal(stats.p99LatencyMs, null); assert.equal(stats.successPercentage, null);
  const engine = new SlaHealthEngine({ online: () => true });
  assert.deepEqual(engine.getStatus(), { status: 'unknown', responseLatencyMs: null, checkedAtMs: null });
  assert.equal(substrate.slaTable.count(), 1, 'constructing the health engine must not seed history');
});

test('connection checks share a request, measure actual response time and expire evidence', async () => {
  let now = 1000, monotonic = 10, requests = 0, cancelled = false;
  let resolve!: (response: Response) => void;
  const engine = new SlaHealthEngine({ now: () => now, monotonicNow: () => monotonic,
    online: () => true, visible: () => true, record: () => {},
    fetch: async (_input, init) => {
      requests++; assert.equal(init?.method, 'HEAD'); assert.equal(init?.redirect, 'error');
      return new Promise<Response>(done => { resolve = done; });
    },
  });
  const first = engine.probe();
  assert.equal(engine.probe(), first); assert.equal(requests, 1);
  monotonic = 47; now = 1100;
  resolve(new Response(new ReadableStream({ cancel() { cancelled = true; } })));
  const measured = await first;
  assert.deepEqual(measured, { status: 'healthy', responseLatencyMs: 37, checkedAtMs: 1100 });
  assert(cancelled);
  measured.responseLatencyMs = 9999;
  assert.equal(engine.getStatus().responseLatencyMs, 37);
  await engine.probe(); assert.equal(requests, 1, 'mounts/visibility events share the cooldown');
  now += 120_000;
  assert.deepEqual(engine.getStatus(), { status: 'unknown', responseLatencyMs: null, checkedAtMs: 1100 });
});

test('offline and hidden tabs send no probes; network changes invalidate previous evidence', async () => {
  let online = false, visible = true, requests = 0;
  const engine = new SlaHealthEngine({ online: () => online, visible: () => visible, record: () => {},
    fetch: async () => { requests++; return new Response(null); },
  });
  assert.equal((await engine.probe()).status, 'offline');
  online = true; visible = false;
  assert.equal((await engine.probe()).status, 'unknown'); assert.equal(requests, 0);
  visible = true; assert.equal((await engine.probe()).status, 'healthy');
  online = false; assert.equal(engine.getStatus().status, 'offline');
  online = true; assert.equal(engine.getStatus().status, 'unknown');
  await engine.probe(); assert.equal(requests, 1, 'network events do not reset request limits');
});

test('failed checks never become healthy and do not invent timeout latency', async t => {
  let now = 1000, calls = 0;
  const engine = new SlaHealthEngine({ now: () => now, online: () => true, visible: () => true, record: () => {},
    fetch: async () => { calls++; throw new Error('offline'); },
  });
  assert.deepEqual(await engine.probe(), { status: 'degraded', responseLatencyMs: null, checkedAtMs: 1000 });
  await engine.probe(); assert.equal(calls, 1);
  now += CONNECTION_CHECK_INTERVAL_MS;
  await engine.probe(); assert.equal(calls, 2);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const timed = new SlaHealthEngine({ online: () => true, visible: () => true, record: () => {},
    fetch: async (_input, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(new Error('timeout')))),
  });
  const pending = timed.probe(); t.mock.timers.tick(4000);
  assert.equal((await pending).status, 'degraded');
});

test('sample aggregates preserve zero measurements and exclude failure sentinels/future timestamps', () => {
  const substrate = BroccoliResilienceSubstrate.getInstance();
  substrate.slaTable.clear();
  const sample = { timestampMs: Date.now(), latencyMs: 0, success: true, status: 'healthy' as const,
    endpoint: '/api/version', measurementSource: 'browser-http-v1' as const };
  substrate.recordSlaProbe(sample);
  substrate.recordSlaProbe({ ...sample, latencyMs: null, success: false, status: 'degraded' });
  substrate.recordSlaProbe({ ...sample, timestampMs: Date.now() + 1000000, latencyMs: 999 });
  const stats = substrate.getSlaStats();
  assert.equal(stats.totalProbes, 2); assert.equal(stats.successPercentage, 50);
  assert.equal(stats.p50LatencyMs, 0); assert.equal(stats.p90LatencyMs, 0);
  assert.equal(stats.p99LatencyMs, 0); assert.equal(stats.avgLatencyMs, 0);
});
