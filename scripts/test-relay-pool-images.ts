import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { GalxaiRelayServer } from '../src/relay/relay-server.js';

for (const pool of ['premium', 'standard'] as const) {
  test(`${pool} image mode: real engine, no admissions or leaked diagnostics`, async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'galx-pool-test-'));
    let upstreamCalls = 0;
    const relay = new GalxaiRelayServer({ stagedPool: pool, host: '127.0.0.1', port: 0,
      registryEnabled: false, assignedShard: undefined, assignedShardId: undefined,
      discoverHostCredentials: false, apiKeys: ['inference-fixture-key'], adminApiKeys: ['admin-fixture-key'],
      capabilityDiscovery: async () => { upstreamCalls++; return ['fixture']; },
      stateSnapshotPath: path.join(directory, 'snapshot.json'), drainTimeoutMs: 100 });
    try {
      await relay.start();
      const address = relay.server.address();
      assert(address && typeof address !== 'string');
      const origin = `http://127.0.0.1:${address.port}`;
      const request = (url: string, key?: string, method = 'GET') => fetch(origin + url, {
        method, headers: key ? { Authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(3000) });
      const live = await request('/health');
      assert.equal(live.status, 200); assert.deepEqual(await live.json(), { status: 'ok' });
      for (const key of [undefined, 'inference-fixture-key', 'peer-admin-key']) {
        assert.equal((await request('/health/ready', key)).status, 401);
        assert.equal((await request('/api/dashboard/stats', key)).status, 401);
      }
      const readiness = await request('/health/ready', 'admin-fixture-key');
      assert.equal(readiness.status, 503);
      assert.deepEqual(await readiness.json(), { ready: false, stage: 'awaiting-central-authorization', pool,
        accountClass: pool === 'premium' ? 'paid' : 'free',
        allowedWorkloads: pool === 'premium' ? ['text', 'sites', 'images'] : ['text'] });
      for (const route of ['/v1/chat/completions', '/chat/completions', '/v1/images/generations',
        '/images/generations', '/api/capabilities/probe-image', '/api/sites/contract',
        '/api/shards/enroll', '/v1/responses', '/v1/jobs/fake/stream', '/federation', '/?secret=fixture']) {
        const response = await request(route, 'admin-fixture-key', 'POST');
        assert.equal(response.status, 503, route);
        assert.deepEqual(await response.json(), { error: { code: 'service_unavailable', message: 'This service is temporarily unavailable.' } });
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert(![...response.headers].some(([k,v]) => /premium|standard|shard|supabase|galx-pool-test/.test(k + v)));
      }
      assert.equal(upstreamCalls, 0);
    } finally { await relay.stop(); await rm(directory, { recursive: true, force: true }); }
  });
}
test('staged mode rejects account-bearing and ambiguous administrator configurations', () => {
  const base = { stagedPool: 'standard' as const, registryEnabled: false, discoverHostCredentials: false,
    assignedShard: undefined, assignedShardId: undefined, apiKeys: ['inference'], adminApiKeys: ['administrator'] };
  for (const extra of [{ registryEnabled: true }, { assignedShardId: 'foreign' }, { testOnlyMultiShard: true },
    { adminApiKeys: ['inference'] }, { adminApiKeys: [] }, { stagedPool: 'other' as any }]) {
    assert.throws(() => new GalxaiRelayServer({ ...base, ...extra }));
  }
});
