import assert from 'node:assert/strict';
import { GalxCredentialPool } from '../src/core/pool/GalxCredentialPool';
import { GalxCircuitBreaker } from '../src/core/circuit/GalxCircuitBreaker';

const now = Date.now();
function fixture() {
  let account: any = { id: 's', status: 'healthy', fencingToken: 2, registryRevision: 3,
    tokenBucket: { remainingTokens: 1000, reservedTokens: 10 }, stats: { consecutiveFailures: 0 } };
  const captured: any[] = [];
  const transitions: any[] = [];
  const pool: any = Object.create(GalxCredentialPool.prototype);
  Object.assign(pool, {
    settlingLeases: new Map(),
    activeLeases: new Map([['lease', { leaseId: 'lease', shardId: 's', userId: 'u', fencingToken: 2,
      estimatedTokens: 10, acquiredAtMs: now, expiresAtMs: now + 120000, account: { ...account } }]]),
    leaseTable: { delete() {} }, inFlightCounts: new Map([['s', 1]]), tenantInFlightCounts: new Map([['u', 1]]),
    circuitBreaker: new GalxCircuitBreaker(),
    substrate: { getAccount: () => account, updateAccount: (value: any) => { account = value; } },
    shardRepository: { isAuthorityConfigured: () => true,
      applyLeaseHealthTransitions: async (values: any[]) => { captured.push({ health: values }); },
      releaseLease: async (value: any) => { captured.push(value); return { success: true }; } },
    syncBuffer: { enqueueProbe() {}, enqueueStateTransition: (value: any) => transitions.push(value) },
    rateGovernor: { commit: (bucket: any) => ({ ...bucket, reservedTokens: 0 }) },
    drainAdmissionQueue() {}
  });
  return { pool, captured, transitions, get account() { return account; }, set account(value: any) { account = value; } };
}
for (const options of [
  { success: false, healthImpact: 'neutral', statusCode: 503, errorReason: 'Relay unavailable' },
  { success: false, statusCode: 400, errorReason: 'Invalid prompt' },
  { success: false, statusCode: 499, errorReason: 'Request cancelled' }
]) {
  const f = fixture();
  assert.equal(await f.pool.releaseLeaseAuthoritatively('lease', options), true);
  assert.equal(f.captured[0].success, null);
  assert.equal(f.account.status, 'healthy');
  assert.equal(f.account.stats.consecutiveFailures, 0);
  assert.equal(f.account.tokenBucket.reservedTokens, 0);
  assert.equal(f.transitions.length, 0);
  assert.equal(f.pool.activeLeases.size, 0);
}
for (const change of [{ status: 'cooldown', cooldownUntilMs: now + 60000 }, { fencingToken: 3 }, { registryRevision: 4 }]) {
  const f = fixture();
  f.account = { ...f.account, ...change };
  await f.pool.releaseLeaseAuthoritatively('lease', { success: true, nowMs: now + 1000 });
  assert.equal(f.transitions.length, 0, 'stale success must not overwrite newer state');
  if (change.status) assert.equal(f.account.status, 'cooldown');
}
const limited = fixture();
await limited.pool.releaseLeaseAuthoritatively('lease', { success: false, statusCode: 429, errorReason: 'Rate limit',
  upstreamHeaders: { 'retry-after': '600' }, nowMs: now });
assert(limited.captured[0].health[0].cooldownUntilMs >= now + 600000,
  'explicit backoff must reach durable storage before failed-probe settlement advances the revision');
assert.equal(limited.captured[1].success, false);
const abandoned = fixture();
abandoned.pool.activeLeases.get('lease').expiresAtMs = now - 1;
assert.equal(abandoned.pool.circuitBreaker.acquireCanarySlot('s'), true);
assert.equal(abandoned.pool.scavengeExpiredLeases(now), 1);
assert.equal(abandoned.pool.circuitBreaker.acquireCanarySlot('s'), true, 'expired probe must not leave a permanent local canary lock');
const expired = fixture();
expired.pool.activeLeases.get('lease').expiresAtMs = now - 1;
await expired.pool.releaseLeaseAuthoritatively('lease', { success: false, statusCode: 429, nowMs: now });
assert.equal(expired.captured.length, 1, 'expired callback cannot publish health evidence');
assert.equal(expired.captured[0].success, null);
assert.equal(expired.transitions.length, 0);
const concurrent = fixture();
const originalRelease = concurrent.pool.shardRepository.releaseLease;
let finish!: () => void;
const gate = new Promise<void>(resolve => { finish = resolve; });
concurrent.pool.shardRepository.releaseLease = async (options: any) => { await gate; return originalRelease(options); };
const releases = Array.from({ length: 100 }, () => concurrent.pool.releaseLeaseAuthoritatively('lease', { success: true }));
finish();
assert((await Promise.all(releases)).every(Boolean));
assert.equal(concurrent.captured.length, 1, '100 concurrent callbacks share one authoritative settlement');
assert.equal(concurrent.pool.settlingLeases.size, 0);
const retry = fixture();
const workingRelease = retry.pool.shardRepository.releaseLease;
retry.pool.shardRepository.releaseLease = async () => { throw new Error('temporary failure'); };
await assert.rejects(retry.pool.releaseLeaseAuthoritatively('lease'), /temporary failure/);
assert.equal(retry.pool.settlingLeases.size, 0, 'failed settlement must remain retryable');
retry.pool.shardRepository.releaseLease = workingRelease;
assert(await retry.pool.releaseLeaseAuthoritatively('lease'));
console.log('PASS: neutral failures settle once, release reservations and preserve health; stale successes cannot overwrite newer state.');
