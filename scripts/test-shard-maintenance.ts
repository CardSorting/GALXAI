import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CapabilityRegistry } from '../src/relay/capability-registry.js';
import { RelayFederationLifecycle, type DesiredShard, type RelayHandle, type RelayDriver } from '../src/relay/federation-lifecycle.js';
import { FileShardMaintenanceStore } from '../src/relay/shard-maintenance-store.js';

function fixture() {
  let now = 100000, failRegistry = false, rejected = false;
  let desired: DesiredShard[] = ['a', 'b'].map(id => ({ id, provider: 'openai', accountId: 'PRIVATE_ACCOUNT', accessToken: 'PRIVATE_TOKEN', credentialRevision: 'revision' }));
  const workers = new Map<string, RelayHandle>(), records = new CapabilityRegistry(() => now), calls: string[] = [];
  const driver: RelayDriver = {
    list: async () => [...workers.values()],
    start: async s => { calls.push('start:' + s.id); const h = { id: 'worker-' + s.id, shardId: s.id, generation: 'gen-' + s.credentialRevision, credentialRevision: s.credentialRevision, endpoint: 'PRIVATE_ENDPOINT', adminKey: 'PRIVATE_ADMIN', inferenceKey: 'PRIVATE_INFERENCE', running: true }; workers.set(s.id, h); records.remove(s.id); records.register(s.id, h.id, h.generation, 'openai'); records.publishInventory(records.beginRefresh(s.id)!, [s.id === 'a' ? 'A' : 'B']); return h; },
    inspect: async h => { records.heartbeat(h.shardId, { activeStreams: 1, queueDepth: 0 }); return { record: records.get(h.shardId), invalidCredential: h.shardId === 'a' && rejected }; },
    remove: async h => { calls.push('remove:' + h.shardId); workers.delete(h.shardId); },
  };
  const read = async () => { if (failRegistry) throw Error('private registry error'); return desired; };
  return { driver, calls, workers, records, read, now: () => now, advance: () => { now += 16000; }, reject: () => { rejected = true; }, heal: () => { rejected = false; }, registryFail: () => { failRegistry = true; }, rotate: () => { desired = desired.map(s => s.id === 'a' ? { ...s, credentialRevision: 'rotated' } : s); }, removeShard: () => { desired = desired.filter(s => s.id !== 'a'); } };
}

test('expired accounts remain repairable without allocating or admitting workers, then recover on credential refresh', async () => {
  const f = fixture(); let expired = true, removed = false;
  const lifecycle = new RelayFederationLifecycle(async () => (await f.read()).filter(s => !removed || s.id !== 'a').map(s => s.id === 'a' ? { ...s, expiresAtMs: expired ? f.now() - 1 : f.now() + 60000, credentialRevision: expired ? 'old' : 'refreshed' } : s), f.driver, f.now);
  try {
    for (let i = 0; i < 3; i++) await lifecycle.reconcile();
    const repair = lifecycle.workspaceShards().find(s => s.id === 'a')!;
    assert.equal(repair.health, 'expired'); assert.equal(repair.canManage, false); assert.equal(repair.registryFresh, true);
    assert.equal(repair.eligibleModels, 0); assert.equal(repair.activeStreams, null); assert.equal(repair.workerState, 'missing');
    assert.equal(lifecycle.monitorState().desiredCount, 1); assert(!f.calls.includes('start:a')); assert.equal(lifecycle.capabilities.select('A'), undefined);
    assert(!/PRIVATE_|credentialRevision|accessToken|accountId|adminKey|inferenceKey|endpoint/.test(JSON.stringify(repair)));
    assert.throws(() => lifecycle.setMaintenance('a', false, null), /no longer registered/);
    expired = false; await lifecycle.reconcile(); await lifecycle.reconcile();
    assert.equal(f.calls.filter(c => c === 'start:a').length, 1); assert(lifecycle.capabilities.select('A'));
    assert.equal(lifecycle.workspaceShards().find(s => s.id === 'a')!.health, 'healthy');
    removed = true; await lifecycle.reconcile();
    assert(!lifecycle.workspaceShards().some(s => s.id === 'a')); assert.equal(lifecycle.capabilities.select('A'), undefined);
  } finally { await lifecycle.stop(); }
});

test('manual hold keeps a worker and its health evidence, blocks new routing, persists across restart, and resumes explicitly', async () => {
  const f = fixture(), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maintenance-')), store = new FileShardMaintenanceStore(path.join(dir, 'holds.json'));
  let lifecycle = new RelayFederationLifecycle(f.read, f.driver, f.now, 15000, undefined, store);
  try {
    await lifecycle.reconcile(); const h = lifecycle.handle('a')!;
    assert.equal(lifecycle.workspaceShards().find(s => s.id === 'a')!.uncoveredModels, 1);
    lifecycle.setMaintenance('a', true, h.generation);
    assert.equal(lifecycle.capabilities.select('A'), undefined); assert(lifecycle.capabilities.select('B'));
    await lifecycle.reconcile(); assert.equal(lifecycle.handle('a')!.generation, h.generation);
    const state = lifecycle.workspaceShards().find(s => s.id === 'a')!;
    assert.equal(state.paused, true); assert.equal(state.health, 'healthy'); assert.equal(state.activeStreams, 1); assert.equal(state.eligibleModels, 0);
    assert(!/PRIVATE_|credentialRevision|accessToken|accountId|adminKey|inferenceKey|endpoint/.test(JSON.stringify(state)));
    await lifecycle.stop(); assert(f.workers.has('a')); assert(!f.calls.includes('remove:a'));
    lifecycle = new RelayFederationLifecycle(f.read, f.driver, f.now, 15000, undefined, store); await lifecycle.reconcile();
    assert.equal(lifecycle.handle('a')!.generation, h.generation); assert.equal(lifecycle.capabilities.select('A'), undefined);
    lifecycle.setMaintenance('a', false, h.generation); assert(lifecycle.capabilities.select('A'));
    assert.equal(store.load().size, 0); assert.equal(fs.statSync(path.join(dir, 'holds.json')).mode & 0o777, 0o600);
    assert.equal(f.calls.filter(c => c === 'start:a').length, 1);
  } finally { await lifecycle.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('rejection during manual hold retains the worker without forgetting rejected evidence or restarting it', async () => {
  const f = fixture(), lifecycle = new RelayFederationLifecycle(f.read, f.driver, f.now);
  await lifecycle.reconcile(); const h = lifecycle.handle('a')!; lifecycle.setMaintenance('a', true, h.generation); f.reject();
  for (let i = 0; i < 4; i++) await lifecycle.reconcile();
  assert(f.workers.has('a')); assert(!f.calls.includes('remove:a')); assert.equal(lifecycle.workspaceShards()[0].health, 'rejected');
  assert.equal(lifecycle.activity.snapshot().events.filter(e => e.code === 'credential_rejected').length, 1);
  f.heal(); await lifecycle.reconcile(); assert.equal(lifecycle.capabilities.select('A'), undefined, 'same revision cannot erase rejection with a later report');
  lifecycle.setMaintenance('a', false, h.generation); await lifecycle.reconcile();
  assert(!f.workers.has('a')); await lifecycle.reconcile(); assert.equal(f.calls.filter(c => c === 'start:a').length, 1); await lifecycle.stop();
});

test('holds prevent replacement startup but do not override credential rotation or registry removal', async () => {
  const f = fixture(), lifecycle = new RelayFederationLifecycle(f.read, f.driver, f.now);
  await lifecycle.reconcile(); lifecycle.setMaintenance('a', true, lifecycle.handle('a')!.generation); f.rotate();
  await lifecycle.reconcile(); await lifecycle.reconcile(); assert(!f.workers.has('a')); assert.equal(f.calls.filter(c => c === 'start:a').length, 1);
  const status = lifecycle.workspaceShards()[0]; assert.equal(status.paused, true); assert.equal(status.workerState, 'missing');
  lifecycle.setMaintenance('a', false, null); await lifecycle.reconcile(); assert(f.workers.has('a'));
  lifecycle.setMaintenance('a', true, lifecycle.handle('a')!.generation); f.removeShard(); await lifecycle.reconcile();
  assert.equal(lifecycle.monitorState().maintenance.length, 0); assert(!f.workers.has('a')); await lifecycle.stop();
});

test('missing registry evidence and changed generations cannot mutate traffic; stale metrics are unknown', async () => {
  const f = fixture(), lifecycle = new RelayFederationLifecycle(f.read, f.driver, f.now); await lifecycle.reconcile();
  assert.throws(() => lifecycle.setMaintenance('a', true, 'old-generation'), /worker changed/);
  assert.throws(() => lifecycle.setMaintenance('foreign', true, null), /no longer registered/);
  f.advance(); f.registryFail(); await lifecycle.reconcile();
  const state = lifecycle.workspaceShards()[0]; assert.equal(state.health, 'stale'); assert.equal(state.activeStreams, null); assert.equal(state.capacity, null); assert.equal(state.canManage, false);
  assert.throws(() => lifecycle.setMaintenance('a', true, lifecycle.handle('a')!.generation), /ownership is stale/); await lifecycle.stop();
});

test('journal failure cannot claim a saved hold and corrupt persisted intent fails closed', async () => {
  const f = fixture(), lifecycle = new RelayFederationLifecycle(f.read, f.driver, f.now, 15000, undefined, { load: () => new Map(), save: () => { throw Error('PRIVATE_DISK_ERROR'); } });
  await lifecycle.reconcile(); assert.throws(() => lifecycle.setMaintenance('a', true, lifecycle.handle('a')!.generation), /could not be saved/);
  assert(lifecycle.capabilities.select('A')); assert.equal(lifecycle.monitorState().maintenance.length, 0); await lifecycle.stop();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bad-holds-')), file = path.join(dir, 'holds.json'), store = new FileShardMaintenanceStore(file);
  try { for (const raw of ['{broken', JSON.stringify({ version: 2, entries: [] }), JSON.stringify({ version: 1, entries: [['../a', 1]] }), JSON.stringify({ version: 1, entries: [['a', 1], ['a', 2]] })]) { fs.writeFileSync(file, raw); assert.throws(() => store.load()); } }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
