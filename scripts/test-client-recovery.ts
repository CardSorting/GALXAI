import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { resilientFetch, safeJsonParse } from '../src/lib/resilience/ResilientClient';
import { BroccoliOutboxEngine } from '../src/lib/resilience/BroccoliOutboxEngine';
import { claimChunkReload } from '../src/lib/resilience/chunk-recovery';
import { RecoveryNotice } from '../src/components/common/RecoveryNotice';

function network(t: TestContext, online: boolean) {
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: online } });
  t.after(() => { if (prior) Object.defineProperty(globalThis, 'navigator', prior); else Reflect.deleteProperty(globalThis, 'navigator'); });
}
test('permanent or ambiguous online failures never acquire a second outbox retry budget', async t => {
  network(t, true); let queued = 0, calls = 0;
  t.mock.method(BroccoliOutboxEngine, 'enqueue', async () => { queued++; });
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response(null, { status: 403 }); });
  await assert.rejects(resilientFetch('/api/test-recovery', { method: 'POST', enableOutboxOfflineFallback: true }));
  assert.equal(calls, 1); assert.equal(queued, 0);
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw Error('network ambiguous'); });
  await assert.rejects(resilientFetch('/api/test-recovery', { method: 'POST', enableOutboxOfflineFallback: true }));
  assert.equal(calls, 2); assert.equal(queued, 0);
});
test('server no-retry and long Retry-After return control without retrying', async t => {
  network(t, true); let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response(null, { status: 503, headers: { 'x-should-retry': 'false' } }); });
  await assert.rejects(resilientFetch('/api/no-retry', { enableCacheFallback: false }));
  assert.equal(calls, 1);
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response(null, { status: 429, headers: { 'retry-after': '600' } }); });
  await assert.rejects(resilientFetch('/api/long-cooldown', { enableCacheFallback: false }));
  assert.equal(calls, 2);
});
test('offline acknowledgement waits for durable enqueue and never claims completion', async t => {
  network(t, false); let calls = 0, queued = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw Error('unexpected dispatch'); });
  t.mock.method(BroccoliOutboxEngine, 'enqueue', async (item: any) => { queued++; assert.equal(item.idempotencyKey, 'stable'); assert.deepEqual(item.payload, { keep: true }); });
  const result = await resilientFetch<any>('/api/offline', { method: 'POST', body: JSON.stringify({ keep: true }), idempotencyKey: 'stable', enableOutboxOfflineFallback: true });
  assert.equal(result.status, 202); assert.equal(result.data.queued, true); assert.equal(result.data.success, undefined);
  assert.equal(calls, 0); assert.equal(queued, 1);
  t.mock.method(BroccoliOutboxEngine, 'enqueue', async () => { throw Error('storage unavailable'); });
  await assert.rejects(resilientFetch('/api/offline', { method: 'POST', idempotencyKey: 'stable', enableOutboxOfflineFallback: true }), /could not be saved/);
  assert.equal(calls, 0);
});
test('caller cancellation interrupts retry waiting without queuing or resending', async t => {
  network(t, true); let calls = 0;
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response(null, { status: 503 }); });
  await assert.rejects(resilientFetch('/api/cancel', { enableCacheFallback: false, signal: controller.signal,
    onRetry: () => controller.abort(), baseDelayMs: 1000 }));
  assert.equal(calls, 1);
});
test('large response bodies are bounded and cancelled before buffering unbounded JSON', async () => {
  let cancelled = false, bytes = 0;
  const response = new Response(new ReadableStream({ pull(c) { bytes += 65536; c.enqueue(new Uint8Array(65536)); }, cancel() { cancelled = true; } }));
  await assert.rejects(safeJsonParse(response), /too large/);
  assert(cancelled); assert(bytes <= 2 * 1024 * 1024 + 2 * 65536);
});
test('both chunk error paths share a fail-closed reload budget across reloads', () => {
  const data = new Map<string, string>();
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
  assert(claimChunkReload(storage, 100000)); assert(!claimChunkReload(storage, 100001));
  assert(!claimChunkReload(storage, 1)); assert(claimChunkReload(storage, 400001));
  assert(!claimChunkReload({ getItem: () => null, setItem: () => { throw Error('denied'); } }, 1));
});
test('recovery notices distinguish connection, waiting and attention without false completion claims', () => {
  for (const [summary, expected] of [
    [{ pending: 0, active: 0, needsAttention: 0, paused: false }, 'Connection restored'],
    [{ pending: 1, active: 0, needsAttention: 0, paused: false }, 'Saved actions are waiting'],
    [{ pending: 1, active: 0, needsAttention: 1, paused: false }, 'Saved actions need attention'],
  ] as const) {
    const html = renderToStaticMarkup(React.createElement(RecoveryNotice, { summary, reconnected: true, offline: false, needsRefresh: false, onReload() {} }));
    assert(html.includes(expected)); assert(html.includes('role="status"'));
    assert(!/All Systems Synced|Replaying|shard|Supabase|provider/i.test(html));
    if (summary.pending) assert(html.includes('Recovery details'));
  }
});
