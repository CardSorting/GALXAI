import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { GalxaiRelayServer } from '../src/relay/relay-server.js';
import { CapabilityDiscoveryError } from '../src/relay/capability-discovery.js';
import { DockerShardDriver } from '../src/relay/docker-shard-driver.js';
import { FileInvalidCredentialStore } from '../src/relay/invalid-credential-store.js';
import { RelayFederationLifecycle, type DesiredShard, type RelayDriver, type RelayHandle } from '../src/relay/federation-lifecycle.js';
import { CapabilityRegistry } from '../src/relay/capability-registry.js';

const revision = (value: string) => createHash('sha256').update(value).digest('hex');
const shard = (id: string): DesiredShard => ({ id, provider: 'openai', accessToken: 'synthetic-secret', accountId: id, credentialRevision: revision(id) });
const handle = (s: DesiredShard): RelayHandle => ({ id: 'relay-' + s.id, shardId: s.id, generation: 'generation@start',
  credentialRevision: s.credentialRevision, endpoint: 'http://127.0.0.1:1', inferenceKey: 'inference', adminKey: 'admin', running: true });

test('rejected credentials remain visible to the controller after worker recovery and clear on rotation', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'relay-recovery-'));
  let discoveries = 0;
  const config = { port: 0, host: '127.0.0.1', assignedShardId: 'a', assignedShard: { id: 'a', accountId: 'a', accessToken: 'synthetic-secret' },
    apiKeys: ['inference'], adminApiKeys: ['admin'], stateSnapshotPath: path.join(dir, 'snapshot'), drainTimeoutMs: 20,
    capabilityDiscovery: async () => { discoveries++; throw new CapabilityDiscoveryError('invalid_credential', 401); } };
  let worker = new GalxaiRelayServer(config);
  try {
    await worker.start();
    assert.equal((worker as any).capabilitySnapshot().error, 'invalid_credential');
    await worker.stop();
    worker = new GalxaiRelayServer(config);
    await worker.start();
    assert.equal(discoveries, 1, 'the restored rejection prevents rediscovery with the same token');
    const base = 'http://127.0.0.1:' + (worker as any).server.address().port;
    assert.equal((await fetch(base + '/api/capabilities')).status, 401);
    assert.equal((await fetch(base + '/api/capabilities', { headers: { Authorization: 'Bearer inference' } })).status, 403);
    const body = await (await fetch(base + '/api/capabilities', { headers: { Authorization: 'Bearer admin' } })).json();
    assert.equal(body.error, 'invalid_credential');
    assert.equal(body.shards.length, 1);
    assert(!JSON.stringify(body).includes('synthetic-secret'));
    (worker as any).installFleet([{ ...config.assignedShard, accessToken: 'rotated-secret' }]);
    assert.equal((worker as any).capabilitySnapshot().error, undefined);
    assert.equal((worker as any).shardsTable.get('a').status, 'active');
    (worker as any).recordShardFailure('a', true);
    assert.equal((worker as any).capabilitySnapshot().error, 'invalid_credential', 'inference rejection also retires a worker');
    (worker as any).capabilityError = 'invalid_credential';
    (worker as any).installFleet([{ ...config.assignedShard, accessToken: 'third-secret' }]);
    assert.equal((worker as any).capabilitySnapshot().error, undefined, 'stale discovery error cannot reject a rotated token');
  } finally { await worker.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('legacy worker rejection requires matching identity, explicit evidence and a current generation', async t => {
  const h = handle(shard('a'));
  const driver = new DockerShardDriver({ namespace: 'test', image: 'test', secret: 'x'.repeat(32) });
  let currentGeneration = h.generation;
  t.mock.method(driver as any, 'inspectContainer', async () => ({ ...h, generation: currentGeneration }));
  let status = 'disabled', reason = 'credential_rejected', id = 'a', statusCode = 200, error: string | undefined;
  let models: any[] = [], health = 'unavailable', requests = 0, extra = false;
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal((init.headers as any).Authorization, 'Bearer admin');
    if (url.endsWith('/api/capabilities')) return Response.json({ error, shards: [{ shardId: 'a', relayId: h.id, generation: 'generation',
      health, lastCapabilityRefreshMs: 0, models }] });
    requests++;
    return Response.json({ shards: [{ id, status, availabilityReason: reason }, ...(extra ? [{ id: 'b', status, availabilityReason: reason }] : [])] }, { status: statusCode });
  });
  assert.equal((await driver.inspect(h)).invalidCredential, true);
  for (const other of ['cooldown', 'credential_expired', 'registry_unavailable', 'at_capacity']) {
    reason = other; assert.equal((await driver.inspect(h)).invalidCredential, false);
  }
  reason = 'credential_rejected'; id = 'foreign'; assert.equal((await driver.inspect(h)).invalidCredential, false);
  id = 'a'; extra = true; assert.equal((await driver.inspect(h)).invalidCredential, false);
  extra = false; statusCode = 403; assert.equal((await driver.inspect(h)).invalidCredential, false);
  statusCode = 200; currentGeneration = 'replacement@start'; assert.deepEqual(await driver.inspect(h), {});
  currentGeneration = h.generation; status = 'cooldown'; assert.equal((await driver.inspect(h)).invalidCredential, false);
  const before = requests; error = 'inventory_unavailable'; assert.equal((await driver.inspect(h)).invalidCredential, false);
  assert.equal(requests, before, 'temporary discovery failure does not request terminal status');
  error = undefined; health = 'healthy'; await driver.inspect(h); assert.equal(requests, before);
  health = 'unavailable'; models = [{ model: 'A' }]; await driver.inspect(h); assert.equal(requests, before);
  error = 'invalid_credential'; assert.equal((await driver.inspect(h)).invalidCredential, true); assert.equal(requests, before);
});

test('fleet cleanup drains more than three rejected workers and does not respawn them across controller restarts', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'relay-journal-'));
  const filename = path.join(dir, 'invalid.json');
  const store = new FileInvalidCredentialStore(filename);
  let desired = Array.from({ length: 12 }, (_, i) => shard(String(i)));
  const workers = new Map(desired.map(s => [s.id, handle(s)]));
  const starts: string[] = [], removals: string[] = [];
  let activeDrains = 0, maxDrains = 0;
  const driver: RelayDriver = {
    list: async () => [...workers.values()],
    start: async s => { assert(!workers.has(s.id)); starts.push(s.id); const h = handle(s); workers.set(s.id, h); return h; },
    inspect: async h => {
      if (h.shardId !== '0' && h.credentialRevision === revision(h.shardId)) return { invalidCredential: true };
      const r = new CapabilityRegistry(); r.register(h.shardId, h.id, h.generation, 'openai');
      r.publishInventory(r.beginRefresh(h.shardId)!, ['A']); r.heartbeat(h.shardId, {});
      return { record: r.get(h.shardId) };
    },
    remove: async h => {
      if (h.shardId !== '0') assert.equal(store.load().get(h.shardId), h.credentialRevision, 'persist rejection before removal');
      activeDrains++; maxDrains = Math.max(maxDrains, activeDrains);
      await new Promise(resolve => setTimeout(resolve, 1));
      workers.delete(h.shardId); removals.push(h.shardId); activeDrains--;
    },
  };
  let lifecycle = new RelayFederationLifecycle(async () => desired, driver, Date.now, 15000, store);
  try {
    for (let i = 0; i < 12; i++) { await lifecycle.reconcile(); await new Promise(resolve => setTimeout(resolve, 5)); }
    assert.equal(workers.size, 1); assert.equal(removals.length, 11); assert.equal(starts.length, 0);
    assert(maxDrains <= 3); assert.equal(lifecycle.capabilities.eligible('A').length, 1);
    assert.equal(store.load().size, 11); assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    assert(!fs.readFileSync(filename, 'utf8').includes('synthetic-secret'));
    await lifecycle.stop();
    lifecycle = new RelayFederationLifecycle(async () => desired, driver, Date.now, 15000, new FileInvalidCredentialStore(filename));
    await lifecycle.reconcile(); await lifecycle.reconcile();
    assert.deepEqual(starts, ['0']); assert.equal(workers.size, 1);
    desired = desired.map(s => s.id === '1' ? { ...s, credentialRevision: revision('rotated') } : s);
    await lifecycle.reconcile(); await lifecycle.reconcile();
    assert.deepEqual(starts, ['0', '1']); assert.equal(store.load().has('1'), false);
    assert.equal(lifecycle.capabilities.eligible('A').length, 2);
    desired = desired.filter(s => s.id !== '2');
    await lifecycle.reconcile(); assert.equal(store.load().has('2'), false);
  } finally {
    // Teardown removes a rotated, now healthy worker too.
    driver.remove = async h => { workers.delete(h.shardId); };
    await lifecycle.stop(); fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('unexpected worker exits use one controller restart authority with backoff and a bounded storm budget', async () => {
  let now = 100000, generation = 0, starts = 0;
  const desired = shard('restartable');
  let workers: RelayHandle[] = [];
  const records = new CapabilityRegistry(() => now);
  const driver: RelayDriver = {
    list: async () => workers.slice(),
    start: async s => {
      starts++;
      const h = { ...handle(s), id: `worker-${++generation}`, generation: `generation-${generation}`, running: true };
      workers = [h]; records.remove(s.id); records.register(s.id, h.id, h.generation, s.provider);
      records.publishInventory(records.beginRefresh(s.id)!, ['A']); records.heartbeat(s.id, {});
      return h;
    },
    inspect: async h => { records.heartbeat(h.shardId, {}); return { record: records.get(h.shardId) }; },
    remove: async () => { workers = []; },
  };
  const lifecycle = new RelayFederationLifecycle(async () => [desired], driver, () => now);
  try {
    await lifecycle.reconcile();
    assert.equal(starts, 1);
    // A process exit is retired, then the controller waits for its bounded
    // retry delay before allocating the next generation.
    for (let attempt = 1; attempt <= 5; attempt++) {
      workers[0].running = false;
      await lifecycle.reconcile();
      await new Promise(resolve => setImmediate(resolve));
      const retry = lifecycle.monitorState().retries.find(row => row.shardId === desired.id);
      assert(retry, `restart ${attempt} has a retry deadline`);
      assert.equal(starts, attempt, 'a stopped worker is not replaced in the same reconciliation');
      now = retry.retryAt;
      await lifecycle.reconcile();
      assert.equal(starts, attempt + 1);
    }
    workers[0].running = false;
    await lifecycle.reconcile();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(starts, 6, 'the sixth crash is contained instead of starting another worker');
    assert.equal(lifecycle.snapshot().lastError, 'worker_restart_budget_exhausted');
    assert.equal(lifecycle.monitorState().restartBudgets.find(row => row.shardId === desired.id)?.blocked, true);
    assert(lifecycle.activity.snapshot().events.some(event => event.code === 'worker_restart_budget_exhausted'));
    now += 600000;
    await lifecycle.reconcile();
    assert.equal(starts, 6, 'a bounded budget does not silently reset on a timer');
  } finally { await lifecycle.stop(); }
});

test('journal write failure prevents destruction and a corrupt journal fails closed', async () => {
  const s = shard('a'), h = handle(s);
  let removals = 0;
  const lifecycle = new RelayFederationLifecycle(async () => [s], {
    list: async () => [h], start: async () => { throw Error('unexpected start'); },
    inspect: async () => ({ invalidCredential: true }), remove: async () => { removals++; },
  }, Date.now, 15000, { load: () => new Map(), save: () => { throw Error('disk failure'); } });
  await lifecycle.reconcile(); await lifecycle.reconcile();
  assert.equal(removals, 0); assert.equal(lifecycle.capabilities.snapshot().shards.length, 0);
  await lifecycle.stop();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'relay-corrupt-'));
  try {
    const filename = path.join(dir, 'invalid.json'), store = new FileInvalidCredentialStore(filename);
    for (const data of ['{', JSON.stringify({ version: 2, entries: [] }), JSON.stringify({ version: 1, entries: [['a', 'plaintext-token']] }),
      JSON.stringify({ version: 1, entries: [['a', revision('a')], ['a', revision('a')]] })]) {
      fs.writeFileSync(filename, data); assert.throws(() => store.load());
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
