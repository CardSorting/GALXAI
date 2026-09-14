import test from 'node:test';
import assert from 'node:assert/strict';
import { ShardRepository } from '../src/lib/supabase/repositories/ShardRepository';
import { GalxCredentialPool } from '../src/core/pool/GalxCredentialPool';

function account(id: string, window: unknown, expiresAt = Date.now() + 60000) {
  return (Object.create(ShardRepository.prototype) as any).mapRowToShard({
    id, user_id: 'owner', provider: 'openai', status: 'healthy', permission_retracted: false,
    auth_type: 'oauth', priority: 10, weight: 1, shard_mode: 'pooled',
    max_tokens: 10000, remaining_tokens: 10000, reserved_tokens: 0, refill_rate_per_minute: 10000,
    max_requests: 1000, remaining_requests: 1000, last_refill_timestamp_ms: Date.now(),
    total_requests_served: 0, total_tokens_consumed: 0, consecutive_failures: 0, consecutive_successes: 0,
    average_latency_ms: 250, fencing_token: 1, credential_expires_at_ms: expiresAt,
    sliding_window_quota: window,
  });
}
function poolFor(accounts: any[]) {
  const map = new Map(accounts.map(a => [a.id, a]));
  const admitted: string[] = [];
  const pool = new GalxCredentialPool({ listAccounts: () => [...map.values()], getAccount: (id: string) => map.get(id),
    updateAccount: (a: any) => map.set(a.id, a), onRetract() {} } as any, undefined, undefined, undefined,
    { isAuthorityConfigured: () => true, acquireLease: async ({ shardId }: any) => {
      admitted.push(shardId); return { success: true, leaseId: `durable-${shardId}`, fencingToken: 2 };
    } } as any);
  return { pool, admitted };
}
const request = { userId: 'owner', provider: 'openai' as const, targetModel: 'openai-gpt-image-latest', jobId: 'image', estimatedTokens: 100, queueIfExhausted: false };

test('empty optional window does not block usable capacity; expired candidate cannot starve it', async () => {
  const healthy = account('healthy', {}), expired = account('expired', { windowDurationMs: 10000, maxRequestsPerWindow: 40, requestHistoryTimestampsMs: [] }, Date.now() - 1);
  assert.equal(healthy.slidingWindowQuota, undefined);
  const { pool, admitted } = poolFor([expired, healthy]);
  assert.equal((await pool.acquireLeaseAuthoritatively(request)).lease?.shardId, 'healthy');
  assert.deepEqual(admitted, ['healthy'], 'durable authority remains mandatory');
});
test('configured exhausted and malformed nonempty windows remain denied', async () => {
  for (const window of [{ windowDurationMs: 60000, maxRequestsPerWindow: 1, requestHistoryTimestampsMs: [Date.now()] }, { windowDurationMs: 60000 }]) {
    const { pool, admitted } = poolFor([account('limited', window)]);
    assert.equal((await pool.acquireLeaseAuthoritatively(request)).lease, undefined);
    assert.deepEqual(admitted, []);
  }
});
test('expired and revoked credentials remain denied', async () => {
  const revoked = { ...account('revoked', {}), permissionRetracted: true };
  const { pool, admitted } = poolFor([revoked, account('expired', {}, Date.now() - 1)]);
  assert.equal((await pool.acquireLeaseAuthoritatively(request)).lease, undefined);
  assert.deepEqual(admitted, []);
});
