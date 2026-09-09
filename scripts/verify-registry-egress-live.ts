/** Read-only production checks. No inference dispatch or application data is returned. */
import assert from 'node:assert/strict';

const admin = (process.env.RELAY_ADMIN_API_KEYS || '').split(',').find(Boolean);
const user = (process.env.RELAY_API_KEYS || '').split(',').find(Boolean);
if (!admin || !user) throw new Error('Relay administrator and inference keys are required.');
const base = `http://127.0.0.1:${process.env.RELAY_FEDERATION_PORT || 3001}`;
const request = (route: string, key?: string) => fetch(base + route, {
  headers: key ? { Authorization: `Bearer ${key}` } : {}, redirect: 'error', signal: AbortSignal.timeout(10_000),
});
if (process.argv.includes('--check-idle')) {
  const response = await request('/api/capabilities', admin);
  assert.equal(response.status, 200);
  const state = await response.json();
  assert(Array.isArray(state.shards));
  const active = state.shards.reduce((sum: number, shard: any) => sum + Number(shard.activeStreams || 0), 0);
  const queued = state.shards.reduce((sum: number, shard: any) => sum + Number(shard.queueDepth || 0), 0);
  console.log(JSON.stringify({ registryFresh: state.registryFresh, workers: state.shards.length, active, queued }));
  assert.equal(active, 0); assert.equal(queued, 0); assert.equal(state.registryFresh, true);
  process.exit(0);
}
const denied = await Promise.all([request('/api/egress'), request('/api/egress', user)]);
assert(denied.every(response => response.status === 401));
for (const response of denied) await response.body?.cancel();
const response = await request('/api/egress', admin);
assert.equal(response.status, 200);
assert.equal(response.headers.get('cache-control'), 'no-store');
const metrics = await response.json();
assert.equal(metrics.persistent, true);
assert(metrics.policy.maxResponseBytes <= 256 * 1024);
assert(metrics.policy.bytesPerHour <= 3 * 1024 * 1024);
assert(metrics.policy.requestsPerMinute <= 40);
assert(metrics.policy.requestBurst <= 4);
assert.equal(metrics.consecutiveFailures, 0);
const healthResponse = await request('/health/ready', admin);
assert.equal(healthResponse.status, 200);
const health = await healthResponse.json();
assert.equal(health.ready, true);
console.log(JSON.stringify({ unauthorizedDenied: true, ordinaryUserDenied: true, ready: true,
  budget: metrics }, null, 2));
