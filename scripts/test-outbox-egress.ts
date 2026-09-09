import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BroccoliOutboxEngineImpl } from '../src/lib/resilience/BroccoliOutboxEngine';
import { OutboxCoordinator, OUTBOX_KEY, OUTBOX_BUDGET_KEY, type OutboxLock, retryDelay } from '../src/lib/resilience/outbox-coordinator';

function fixture() {
  let now = 100_000, online = false, visible = true, failWrites = false;
  let transport: typeof fetch = async () => new Response(null, { status: 204 });
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null,
    setItem(key: string, value: string) { if (failWrites) throw Error('disk full'); data.set(key, value); } };
  const locks = new Map<string, Promise<void>>();
  const lock: OutboxLock = async (key, onlyIfAvailable, work) => {
    if (onlyIfAvailable && locks.has(key)) return undefined;
    const previous = locks.get(key);
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    locks.set(key, held);
    await previous;
    try { return await work(); }
    finally { release(); if (locks.get(key) === held) locks.delete(key); }
  };
  const coordinator = new OutboxCoordinator(storage, lock, () => now);
  const engine = () => new BroccoliOutboxEngineImpl(coordinator, { background: false,
    now: () => now, random: () => 0, online: () => online, visible: () => visible,
    fetch: (input, init) => transport(input, init) });
  return { engine, data, storage, coordinator,
    advance: (ms: number) => { now += ms; },
    online: (value: boolean) => { online = value; }, visible: (value: boolean) => { visible = value; },
    failWrites: (value: boolean) => { failWrites = value; },
    transport: (value: typeof fetch) => { transport = value; } };
}

test('failures spend a durable five-attempt allowance without dropping work', async () => {
  const f = fixture(), outbox = f.engine(); let calls = 0;
  f.transport(async () => { calls++; throw Error('private upstream diagnostic'); });
  await outbox.enqueue({ url: '/api/test', maxAttempts: 1000000, payload: { keep: true } });
  f.online(true);
  await Promise.all(Array.from({ length: 50 }, () => outbox.drain()));
  assert.equal(calls, 1); assert.equal(outbox.getPendingMutations()[0].attempts, 1);
  await outbox.drain(); assert.equal(calls, 1);
  for (let n = 0; n < 10; n++) { f.advance(300000); await f.engine().drain(); }
  assert.equal(calls, 5); assert.equal(f.coordinator.read()[0].attempts, 5);
  assert(!JSON.stringify(f.coordinator.read()).includes('private upstream'));
  assert.equal(f.engine().getRecoverySummary().needsAttention, 1);
});

test('Retry-After longer than five minutes is never shortened; endless error bodies are cancelled', async () => {
  const f = fixture(), outbox = f.engine(); let calls = 0, cancelled = false;
  f.transport(async () => { calls++; return new Response(new ReadableStream({
    pull(c) { c.enqueue(new Uint8Array(1024)); }, cancel() { cancelled = true; }
  }), { status: 429, headers: { 'Retry-After': '600' } }); });
  await outbox.enqueue({ url: '/api/test' }); f.online(true); await outbox.drain();
  assert(cancelled); f.advance(599000); await f.engine().drain(); assert.equal(calls, 1);
  f.advance(1000); await f.engine().drain(); assert.equal(calls, 2);
  assert.equal(retryDelay(1, new Date(900000).toUTCString(), 100000, () => 0), 800000);
  assert.equal(retryDelay(1, '9'.repeat(1000), 100000), Number.MAX_SAFE_INTEGER - 100000);
});

test('permanent rejection and explicit no-retry headers stop replay, preserving the action', async () => {
  for (const [status, headers] of [[403, {}], [503, { 'x-should-retry': 'false' }]] as const) {
    const f = fixture(), outbox = f.engine(); let calls = 0;
    f.transport(async () => { calls++; return new Response(null, { status, headers }); });
    await outbox.enqueue({ url: '/api/test' }); f.online(true); await outbox.drain();
    f.advance(300000); await f.engine().drain();
    assert.equal(calls, 1); assert.equal(f.engine().getRecoverySummary().needsAttention, 1);
  }
});

test('shared pacing cannot be bypassed by repeated drains, new tabs, or backwards clocks', async () => {
  const f = fixture(), outbox = f.engine(); let calls = 0;
  f.transport(async () => { calls++; return new Response(null, { status: 204 }); });
  for (let i = 0; i < 25; i++) await outbox.enqueue({ url: '/api/test', payload: { i } });
  f.online(true); await outbox.drain(); assert.equal(calls, 20);
  await f.engine().drain(); assert.equal(calls, 20);
  f.advance(-3000); await f.engine().drain(); assert.equal(calls, 20);
  f.advance(6000); await f.engine().drain(); assert.equal(calls, 21);
  assert.equal(f.coordinator.read().length, 4);
});

test('one cross-tab drain owner dispatches once while enqueues stay independent of slow I/O', async () => {
  const f = fixture(), one = f.engine(), two = f.engine();
  let calls = 0, release!: () => void, started!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  f.transport(async () => { calls++; started(); await gate; return new Response(null, { status: 204 }); });
  await one.enqueue({ url: '/api/test' }); f.online(true);
  const drain = one.drain(); await entered;
  await Promise.all(Array.from({ length: 50 }, () => two.drain()));
  assert.equal(calls, 1);
  assert.equal(f.coordinator.read()[0].attempts, 1, 'attempt written before dispatch');
  f.online(false);
  await two.enqueue({ url: '/api/test', payload: { savedDuringRequest: true } });
  assert.equal(f.coordinator.read().length, 2, 'enqueue does not wait for the network lock');
  release(); await drain;
  assert.equal(f.coordinator.read().length, 1, 'completion does not overwrite a concurrent enqueue');
  assert.deepEqual(f.coordinator.read()[0].payload, { savedDuringRequest: true });
});

test('interrupted attempts retain their budget and mutation snapshots cannot change authority', async () => {
  const f = fixture(), outbox = f.engine(); let calls = 0;
  await outbox.enqueue({ url: '/api/test' });
  const rows = f.coordinator.read(); rows[0].status = 'inflight'; rows[0].attempts = 4;
  f.storage.setItem(OUTBOX_KEY, JSON.stringify(rows));
  const resumed = f.engine();
  const mirror = resumed.getPendingMutations(); mirror[0].attempts = 0;
  f.transport(async () => { calls++; return new Response(null, { status: 503 }); });
  f.online(true); await resumed.drain(); f.advance(300000); await f.engine().drain();
  assert.equal(calls, 1); assert.equal(f.coordinator.read()[0].attempts, 5);
});

test('failed durable writes, missing Web Locks, and malformed budgets fail closed before I/O', async () => {
  const f = fixture(), outbox = f.engine(); let calls = 0;
  f.transport(async () => { calls++; return new Response(null, { status: 204 }); });
  await outbox.enqueue({ url: '/api/test' }); f.online(true); f.failWrites(true);
  await outbox.drain(); assert.equal(calls, 0); assert(outbox.getRecoverySummary().paused);
  f.failWrites(false); f.data.set(OUTBOX_BUDGET_KEY, '{}');
  await outbox.drain(); assert.equal(calls, 0); assert.equal(f.coordinator.read().length, 1);
  const unsupported = new BroccoliOutboxEngineImpl(new OutboxCoordinator(f.storage, undefined), { online: () => true, background: false });
  await unsupported.drain(); assert.equal(calls, 0);
  await assert.rejects(unsupported.enqueue({ url: '/api/test' }), /unavailable/);
});

test('background tabs do not replay and queue limits reject new work without removing old work', async () => {
  const f = fixture(), outbox = f.engine(); let calls = 0;
  f.transport(async () => { calls++; return new Response(null, { status: 204 }); });
  await outbox.enqueue({ url: '/api/test' });
  await assert.rejects(outbox.enqueue({ url: '/api/test', payload: 'x'.repeat(70000) }), /too large/);
  f.online(true); f.visible(false); await outbox.drain(); assert.equal(calls, 0);
  assert.equal(f.coordinator.read().length, 1);
});

test('external targets, account switches, and legacy unscoped actions never replay under another user', async () => {
  const f = fixture(), outbox = f.engine(); let calls = 0;
  f.transport(async () => { calls++; return new Response(null, { status: 204 }); });
  await assert.rejects(outbox.enqueue({ url: 'https://example.com/api/test' }), /cannot/);
  await outbox.enqueue({ url: '/api/test' });
  f.data.set('galx_custom_auth_user', JSON.stringify({ id: 'another-user' }));
  f.online(true); await outbox.drain(); assert.equal(calls, 0);
  assert.equal(outbox.getRecoverySummary().pending, 0, 'other users queue status is not shown');
  f.data.delete('galx_custom_auth_user');
  const rows = f.coordinator.read(); delete rows[0].ownerId;
  f.data.set(OUTBOX_KEY, JSON.stringify(rows));
  const legacy = f.engine(); await legacy.drain(); assert.equal(calls, 0);
  assert.equal(legacy.getRecoverySummary().needsAttention, 1);
});
