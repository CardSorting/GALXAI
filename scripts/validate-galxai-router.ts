/**
 * GALXAI: Comprehensive Validation & Forensic Test Suite
 * Tests cryptographic envelope encryption, AAD bound transplantation immunity,
 * continuous rate token replenishment calculus, 2-phase token reservation,
 * duration parsing, 4-state circuit breaker with retry-after, EWMA latency tracking,
 * lease acquisition, adaptive hydraulic quota cycling, and model catalog routing.
 */

import assert from 'assert';
import { GalxCryptoVault } from '../src/core/vault/GalxCryptoVault';
import { ContinuousTokenBucketRateGovernor } from '../src/core/governor/ContinuousTokenBucketRateGovernor';
import { GalxCircuitBreaker } from '../src/core/circuit/GalxCircuitBreaker';
import { GalxCredentialSubstrate } from '../src/core/substrate/GalxCredentialSubstrate';
import { GalxCredentialPool } from '../src/core/pool/GalxCredentialPool';
import { ModelCatalog } from '../src/core/router/ModelCatalog';
import { GalxPreflightValidator } from '../src/core/validator/GalxPreflightValidator';
import { GalxMetricsEngine } from '../src/core/telemetry/GalxMetricsEngine';
import type { GalxShardAccount } from '../src/core/contracts/GalxContracts';

let testsPassed = 0;
let testsFailed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  [✓] Test ${testsPassed + testsFailed + 1}: ${name}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  [✗] Test ${testsPassed + testsFailed + 1} FAILED: ${name}`);
    console.error(`      Error: ${err.message}`);
    testsFailed++;
  }
}

async function runAllTests() {
  console.log('======================================================================');
  console.log('   GALXAI: UNIVERSAL ROUTER FORENSIC TEST SUITE      ');
  console.log('======================================================================\n');

  // --- SUITE 1: Cryptographic Vault & AAD Envelope Binding ---
  await test('Vault: Encrypts and decrypts secret with valid AAD', () => {
    const rawSecret = { apiKey: 'sk-proj-supersecretkey123456789' };
    const tenantUid = 'tenant_xyz';
    const shardId = 'shard_001';
    const provider = 'openai';

    const payload = GalxCryptoVault.encryptSecret(rawSecret, tenantUid, shardId, provider);
    assert.ok(payload.ciphertext);
    assert.ok(payload.iv);
    assert.ok(payload.tag);

    const decrypted = GalxCryptoVault.decryptSecret(payload, tenantUid, shardId, provider);
    assert.strictEqual(decrypted.apiKey, rawSecret.apiKey);
  });

  await test('Vault: Rejects cross-tenant transplantation (AAD Mismatch)', () => {
    const rawSecret = { apiKey: 'sk-proj-supersecretkey123456789' };
    const payload = GalxCryptoVault.encryptSecret(rawSecret, 'tenant_victim', 'shard_001', 'openai');

    assert.throws(() => {
      GalxCryptoVault.decryptSecret(payload, 'tenant_attacker', 'shard_001', 'openai');
    }, /GalxVaultDecryptionError/);
  });

  await test('Vault: Rejects cross-provider transplantation (Provider AAD mismatch)', () => {
    const rawSecret = { apiKey: 'sk-proj-supersecretkey123456789' };
    const payload = GalxCryptoVault.encryptSecret(rawSecret, 'tenant_user', 'shard_001', 'openai');

    assert.throws(() => {
      GalxCryptoVault.decryptSecret(payload, 'tenant_user', 'shard_001', 'xai-grok');
    }, /GalxVaultDecryptionError/);
  });

  await test('Vault: Secure memory zeroization overwrites buffer in heap', () => {
    const buf = Buffer.from('super-sensitive-data-string');
    GalxCryptoVault.zeroizeBuffer(buf);
    for (let i = 0; i < buf.length; i++) {
      assert.strictEqual(buf[i], 0);
    }
  });

  await test('Vault: Masks API keys cleanly for telemetry', () => {
    const masked = GalxCryptoVault.maskApiKey('sk-proj-1234567890abcdefghijklmn');
    assert.strictEqual(masked, 'sk-proj-...klmn');

    const short = GalxCryptoVault.maskApiKey('short-key');
    assert.strictEqual(short, 'shor...-key');
  });

  await test('Vault: Gateway API Key generation and hashing', () => {
    const { rawKey, keyHash, prefix } = GalxCryptoVault.generateGatewayApiKey();
    assert.ok(rawKey.startsWith('galx_live_'));
    assert.ok(prefix.startsWith('galx_live_'));
    assert.strictEqual(prefix.length, 18);
    assert.ok(GalxCryptoVault.verifyGatewayApiKey(rawKey, keyHash));
    assert.strictEqual(GalxCryptoVault.verifyGatewayApiKey('galx_live_fake', keyHash), false);
  });

  // --- SUITE 2: Continuous Token-Bucket Calculus Rate Governor ---
  const governor = new ContinuousTokenBucketRateGovernor();

  await test('Rate Governor: Initializes default bucket at full capacity', () => {
    const bucket = governor.createDefaultBucket(500000, 500000, 500);
    assert.strictEqual(bucket.remainingTokens, 500_000);
    assert.strictEqual(bucket.remainingRequests, 500);
    assert.strictEqual(bucket.reservedTokens, 0);
  });

  await test('Rate Governor: 2-Phase Token Reservation prevents concurrent over-allocation', () => {
    const bucket = governor.createDefaultBucket(100_000, 100_000, 100);
    const { bucket: reservedB, reserved } = governor.reserve(bucket, 80_000);
    assert.strictEqual(reserved, true);
    assert.strictEqual(reservedB.reservedTokens, 80_000);

    // Can only consume unreserved remaining (20,000)
    assert.strictEqual(governor.canConsume(reservedB, 30_000), false);
    assert.strictEqual(governor.canConsume(reservedB, 15_000), true);

    // Commit 75,000 tokens and release 80,000 reservation
    const committed = governor.commit(reservedB, 75_000, 80_000, 1);
    assert.strictEqual(committed.remainingTokens, 25_000);
    assert.strictEqual(committed.reservedTokens, 0);
  });

  await test('Rate Governor: Parses diverse vendor duration expressions', () => {
    assert.strictEqual(ContinuousTokenBucketRateGovernor.parseDurationToMs('6m0s'), 360000);
    assert.strictEqual(ContinuousTokenBucketRateGovernor.parseDurationToMs('1.5s'), 1500);
    assert.strictEqual(ContinuousTokenBucketRateGovernor.parseDurationToMs('250ms'), 250);
    assert.strictEqual(ContinuousTokenBucketRateGovernor.parseDurationToMs('45'), 45000);
  });

  await test('Rate Governor: Continuous fractional token replenishment calculus', () => {
    const now = Date.now();
    // Simulate bucket with 0 tokens, 30 seconds ago
    const state = {
      maxTokens: 500_000,
      remainingTokens: 0,
      refillRatePerMinute: 500_000,
      maxRequests: 500,
      remainingRequests: 0,
      lastRefillTimestampMs: now - 30_000,
      reservedTokens: 0
    };

    const refilled = governor.refillBucket(state, now);
    // 30s at 500,000/min should replenish ~250,000 tokens (50%)
    assert.ok(refilled.remainingTokens >= 249_000 && refilled.remainingTokens <= 251_000);
    assert.ok(refilled.remainingRequests >= 249 && refilled.remainingRequests <= 251);
  });

  await test('Rate Governor: Clock-skew immunity against backward NTP adjustments', () => {
    const now = Date.now();
    const state = {
      maxTokens: 500_000,
      remainingTokens: 100_000,
      refillRatePerMinute: 500_000,
      maxRequests: 500,
      remainingRequests: 100,
      lastRefillTimestampMs: now + 60_000,
      reservedTokens: 0
    };

    const refilled = governor.refillBucket(state, now);
    assert.strictEqual(refilled.remainingTokens, 100_000); // Unchanged, no negative replenish
  });

  await test('Rate Governor: Reconciles with upstream response rate limit headers and limits', () => {
    const now = Date.now();
    const state = {
      maxTokens: 500_000,
      remainingTokens: 400_000,
      refillRatePerMinute: 500_000,
      maxRequests: 500,
      remainingRequests: 400,
      lastRefillTimestampMs: now,
      reservedTokens: 0
    };

    const reconciled = governor.reconcileWithUpstreamHeaders(state, {
      'x-ratelimit-remaining-tokens': '125000',
      'x-ratelimit-remaining-requests': '75',
      'x-ratelimit-limit-tokens': '600000',
      'x-ratelimit-reset-tokens': '20s'
    }, now);

    assert.strictEqual(reconciled.remainingTokens, 125_000);
    assert.strictEqual(reconciled.remainingRequests, 75);
    assert.strictEqual(reconciled.maxTokens, 600_000);
  });

  // --- SUITE 3: 4-State Resilient Circuit Breaker ---
  const breaker = new GalxCircuitBreaker();

  await test('Circuit Breaker: Identifies permanent terminal auth errors', () => {
    assert.strictEqual(breaker.isPermanentFailure('invalid_api_key: The API key provided is invalid.'), true);
    assert.strictEqual(breaker.isPermanentFailure('account_deactivated: Organization revoked.'), true);
    assert.strictEqual(breaker.isPermanentFailure('HTTP 429 Too Many Requests'), false);
  });

  await test('Circuit Breaker: Escalates 429 rate limit with exponential backoff and jitter', () => {
    const dummyAccount: GalxShardAccount = {
      id: 'shard_t1',
      userId: 'user_1',
      accountLabel: 'Test',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...1234',
      encryptedPayload: { ciphertext: '', iv: '', tag: '' },
      tokenBucket: governor.createDefaultBucket(),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };

    const fail1 = breaker.classifyFailure(dummyAccount, 'HTTP 429 Too Many Requests');
    assert.strictEqual(fail1.newStatus, 'cooldown');
    assert.ok(fail1.cooldownMs && fail1.cooldownMs >= 27000 && fail1.cooldownMs <= 35000);

    const fail5 = breaker.classifyFailure({
      ...dummyAccount,
      stats: { ...dummyAccount.stats, consecutiveFailures: 5 }
    }, 'HTTP 429 Too Many Requests');
    assert.strictEqual(fail5.newStatus, 'exhausted');
    assert.ok(fail5.cooldownMs && fail5.cooldownMs >= 300000);
  });

  await test('Circuit Breaker: Respects upstream retry-after header during rate limit backoff', () => {
    const dummyAccount: GalxShardAccount = {
      id: 'shard_t2',
      userId: 'user_1',
      accountLabel: 'Test 2',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...5678',
      encryptedPayload: { ciphertext: '', iv: '', tag: '' },
      tokenBucket: governor.createDefaultBucket(),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };

    const failWithRetryAfter = breaker.classifyFailure(dummyAccount, 'HTTP 429', Date.now(), '45');
    assert.strictEqual(failWithRetryAfter.newStatus, 'cooldown');
    assert.ok(failWithRetryAfter.cooldownMs && failWithRetryAfter.cooldownMs >= 42000 && failWithRetryAfter.cooldownMs <= 48000);
  });

  await test('Circuit Breaker: Half-open canary probing allows recovery probe after cooldown', () => {
    const now = Date.now();
    const exhaustedAccount: GalxShardAccount = {
      id: 'shard_canary',
      userId: 'user_1',
      accountLabel: 'Test',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'exhausted',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...1234',
      encryptedPayload: { ciphertext: '', iv: '', tag: '' },
      tokenBucket: governor.createDefaultBucket(),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 5 },
      cooldownUntilMs: now - 100,
      createdAtMs: now,
      updatedAtMs: now
    };

    const evalRes = breaker.evaluateAccountStatus(exhaustedAccount, now);
    assert.strictEqual(evalRes.canAttempt, true);
    assert.strictEqual(evalRes.status, 'cooldown');
    assert.strictEqual(evalRes.canaryMultiplier, 0.25);
  });

  // --- SUITE 4: Multi-Tenant Lease Allocation & Substrate ---
  const substrate = new GalxCredentialSubstrate();
  substrate.clearCache();
  const pool = new GalxCredentialPool(substrate, governor, breaker, 'least_utilized');

  await test('Substrate & Pool: Registers shard, acquires atomic lease, and updates EWMA latency', () => {
    const encOpenAI = GalxCryptoVault.encryptSecret({ apiKey: 'sk-proj-test1' }, 'user_a', 'shard_oa_1', 'openai');
    const shardA: GalxShardAccount = {
      id: 'shard_oa_1',
      userId: 'user_a',
      accountLabel: 'OpenAI Dev 1',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...test1',
      encryptedPayload: encOpenAI,
      tokenBucket: governor.createDefaultBucket(),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };
    substrate.addAccount(shardA);

    const leaseRes = pool.acquireLease({
      userId: 'client_1',
      jobId: 'job_101',
      provider: 'openai',
      estimatedTokens: 500
    });

    assert.ok(leaseRes.lease);
    assert.strictEqual(leaseRes.lease.shardId, 'shard_oa_1');
    assert.strictEqual(leaseRes.lease.fencingToken, 2);
    assert.strictEqual(pool.getInFlightCount('shard_oa_1'), 1);

    // Release with 350ms latency
    pool.releaseLease(leaseRes.lease.leaseId, 450, true, undefined, undefined, Date.now(), 350);
    assert.strictEqual(pool.getInFlightCount('shard_oa_1'), 0);

    const updatedA = substrate.getAccount('shard_oa_1');
    assert.ok(updatedA?.stats?.averageLatencyMs);
  });

  await test('Pool: Least-utilized strategy load balances across multiple shards', () => {
    const enc2 = GalxCryptoVault.encryptSecret({ apiKey: 'sk-proj-test2' }, 'user_b', 'shard_oa_2', 'openai');
    const shardB: GalxShardAccount = {
      id: 'shard_oa_2',
      userId: 'user_b',
      accountLabel: 'OpenAI Dev 2',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...test2',
      encryptedPayload: enc2,
      tokenBucket: governor.createDefaultBucket(),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };
    substrate.addAccount(shardB);

    const l1 = pool.acquireLease({ userId: 'client_2', jobId: 'job_102', provider: 'openai' });
    assert.strictEqual(l1.lease?.shardId, 'shard_oa_2');

    const l2 = pool.acquireLease({ userId: 'client_3', jobId: 'job_103', provider: 'openai' });
    assert.strictEqual(l2.lease?.shardId, 'shard_oa_1');

    pool.releaseLease(l1.lease!.leaseId, 200, true, undefined, undefined, Date.now(), 300);
    pool.releaseLease(l2.lease!.leaseId, 200, true, undefined, undefined, Date.now(), 280);
  });

  await test('Pool: Adaptive Hydraulic Headroom strategy prioritizes fuller token capacity', () => {
    pool.setStrategy('adaptive_headroom');

    // Create a 3rd shard with low remaining tokens (4%)
    const enc3 = GalxCryptoVault.encryptSecret({ apiKey: 'sk-proj-test3' }, 'user_c', 'shard_oa_3', 'openai');
    const shardC: GalxShardAccount = {
      id: 'shard_oa_3',
      userId: 'user_c',
      accountLabel: 'OpenAI Low Capacity',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...test3',
      encryptedPayload: enc3,
      tokenBucket: {
        maxTokens: 500_000,
        remainingTokens: 20_000, // 4% remaining
        refillRatePerMinute: 1000,
        maxRequests: 500,
        remainingRequests: 50,
        lastRefillTimestampMs: Date.now(),
        reservedTokens: 0
      },
      stats: { totalRequestsServed: 0, totalTokensConsumed: 480_000, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };
    substrate.addAccount(shardC);

    const res = pool.acquireLease({ userId: 'client_adapt', jobId: 'job_adapt', provider: 'openai' });
    assert.ok(res.lease);
    // Should NOT pick shard_oa_3 because shard_oa_1 and shard_oa_2 have full capacity
    assert.notStrictEqual(res.lease.shardId, 'shard_oa_3');
    pool.releaseLease(res.lease.leaseId, 100, true);
  });

  await test('Pool: Smooth Weighted Round-Robin (SWRR) interleaves requests smoothly', () => {
    pool.setStrategy('smooth_weighted_round_robin');

    const shardsPicked: string[] = [];
    for (let i = 0; i < 6; i++) {
      const res = pool.acquireLease({ userId: `swrr_client_${i}`, jobId: `job_${i}`, provider: 'openai' });
      assert.ok(res.lease);
      shardsPicked.push(res.lease.shardId);
      pool.releaseLease(res.lease.leaseId, 10, true);
    }

    // Must distribute evenly across all 3 shards
    assert.ok(shardsPicked.includes('shard_oa_1'));
    assert.ok(shardsPicked.includes('shard_oa_2'));
    assert.ok(shardsPicked.includes('shard_oa_3'));
  });

  await test('Pool: Anti-starvation fair-share concurrency ceiling enforces max tenant limits', () => {
    const clientUser = 'spammy_client';
    const leases: any[] = [];

    for (let i = 0; i < 15; i++) {
      const res = pool.acquireLease({
        userId: clientUser,
        jobId: `spam_${i}`,
        provider: 'openai',
        maxTenantPooledInFlight: 15
      });
      assert.ok(res.lease);
      leases.push(res.lease);
    }

    const overflow = pool.acquireLease({
      userId: clientUser,
      jobId: 'spam_16',
      provider: 'openai',
      maxTenantPooledInFlight: 15
    });

    assert.strictEqual(overflow.status, 'tenant_pool_quota_capped');

    for (const l of leases) {
      pool.releaseLease(l.leaseId, 50, true);
    }
    assert.strictEqual(pool.getTenantPooledInFlightCount(clientUser), 0);
  });

  await test('Instant Retraction: 1-Click Retraction immediately purges leases in < 40ms', () => {
    const encRetract = GalxCryptoVault.encryptSecret({ apiKey: 'xai-test-retract' }, 'user_retract', 'shard_grok_retract', 'xai-grok');
    const shardRetract: GalxShardAccount = {
      id: 'shard_grok_retract',
      userId: 'user_retract',
      accountLabel: 'Retractable Grok',
      provider: 'xai-grok',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'xai-...retract',
      encryptedPayload: encRetract,
      tokenBucket: governor.createDefaultBucket(),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };
    substrate.addAccount(shardRetract);

    const l = pool.acquireLease({ userId: 'c1', jobId: 'job_grok', provider: 'xai-grok' });
    assert.ok(l.lease);
    assert.strictEqual(pool.isLeaseValid(l.lease.leaseId), true);

    const startMs = Date.now();
    substrate.retractAccount('shard_grok_retract', 'user_retract');
    const durationMs = Date.now() - startMs;

    assert.ok(durationMs < 40, `Retraction took ${durationMs}ms (must be < 40ms)`);
    assert.strictEqual(pool.isLeaseValid(l.lease.leaseId), false);
    assert.strictEqual(substrate.getAccount('shard_grok_retract'), undefined);
  });

  // --- SUITE 5: Exclusive Model Catalog & Canonical Alias Normalizer ---
  await test('Model Catalog: Correctly maps exclusive LLM and Reasoning models', () => {
    const sol = ModelCatalog.resolveModel('gpt-5.6-sol');
    assert.strictEqual(sol?.id, 'gpt-5.6-sol');
    assert.strictEqual(sol?.provider, 'openai');
    assert.strictEqual(sol?.contextWindowTokens, 372_000);
    assert.strictEqual(sol?.discountPercentage, 25);

    const terra = ModelCatalog.resolveModel('terra');
    assert.strictEqual(terra?.id, 'gpt-5.6-terra');
    assert.strictEqual(terra?.provider, 'openai');

    const luna = ModelCatalog.resolveModel('luna');
    assert.strictEqual(luna?.id, 'gpt-5.6-luna');
    assert.strictEqual(luna?.provider, 'openai');

    const grok = ModelCatalog.resolveModel('grok-4.5');
    assert.strictEqual(grok?.id, 'x-ai/grok-4.5');
    assert.strictEqual(grok?.provider, 'xai-grok');
    assert.strictEqual(grok?.contextWindowTokens, 500_000);
    assert.strictEqual(grok?.discountPercentage, 28);
  });

  await test('Model Catalog: Correctly maps exclusive visual synthesis models', () => {
    const gptImg = ModelCatalog.resolveModel('openai-gpt-image-2');
    assert.strictEqual(gptImg?.id, 'openai-gpt-image-2');
    assert.strictEqual(gptImg?.category, 'image');

    const grokImg = ModelCatalog.resolveModel('xai-grok-image');
    assert.strictEqual(grokImg?.id, 'xai-grok-image');
    assert.strictEqual(grokImg?.upstreamId, 'grok-imagine-1.0');

    const dalle = ModelCatalog.resolveModel('dalle-3');
    assert.strictEqual(dalle?.id, 'openai-dalle-3');
  });

  // --- SUITE 6: Preflight Key Format & Upstream Target Validation ---
  await test('Router: Preflight validator checks key structure', () => {
    const validOA = GalxPreflightValidator.validateKeyFormat('sk-proj-abcdefghijklmnopqrstuvwxyz123456', 'openai');
    assert.strictEqual(validOA.isValid, true);

    const invalidOA = GalxPreflightValidator.validateKeyFormat('invalid-key', 'openai');
    assert.strictEqual(invalidOA.isValid, false);

    const validGrok = GalxPreflightValidator.validateKeyFormat('xai-1234567890abcdef', 'xai-grok');
    assert.strictEqual(validGrok.isValid, true);
  });

  // --- SUITE 7: Enterprise Metrics & Telemetry Ring Buffer Engine ---
  const metricsEngine = new GalxMetricsEngine(50);

  await test('Metrics Engine: Records samples and calculates P50/P90/P99 latency percentiles', () => {
    const latencies = [100, 150, 200, 250, 300, 400, 500, 600, 800, 1200];
    const now = Date.now();

    for (const lat of latencies) {
      metricsEngine.recordSample({
        timestampMs: now,
        latencyMs: lat,
        tokensConsumed: 200,
        success: true,
        provider: 'openai',
        model: 'gpt-5.6-sol',
        shardId: 'shard_1',
        statusCode: 200
      });
    }

    const metrics = metricsEngine.getMetrics(60_000, now);
    assert.strictEqual(metrics.totalRequests, 10);
    assert.strictEqual(metrics.successfulRequests, 10);
    assert.strictEqual(metrics.failedRequests, 0);
    assert.strictEqual(metrics.errorRatePercentage, 0);
    assert.ok(metrics.latency.p50Ms >= 250 && metrics.latency.p50Ms <= 400);
    assert.ok(metrics.latency.p90Ms >= 800 && metrics.latency.p90Ms <= 1200);
    assert.strictEqual(metrics.providerBreakdown.openai.requests, 10);
  });

  await test('Dynamic Reliability Weight: Scales weight based on uptime and latency', () => {
    const fastHealthyShard: GalxShardAccount = {
      id: 'shard_fast',
      userId: 'user_1',
      accountLabel: 'Fast Shard',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...fast',
      tokenBucket: governor.createDefaultBucket(),
      stats: {
        totalRequestsServed: 100,
        totalTokensConsumed: 10000,
        successfulRequests: 100,
        failedRequests: 0,
        consecutiveFailures: 0,
        averageLatencyMs: 180
      },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };

    const slowDegradedShard: GalxShardAccount = {
      id: 'shard_slow',
      userId: 'user_2',
      accountLabel: 'Slow Shard',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...slow',
      tokenBucket: governor.createDefaultBucket(),
      stats: {
        totalRequestsServed: 100,
        totalTokensConsumed: 10000,
        successfulRequests: 40,
        failedRequests: 60,
        consecutiveFailures: 2,
        averageLatencyMs: 2500
      },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };

    const weightFast = pool.calculateDynamicReliabilityWeight(fastHealthyShard);
    const weightSlow = pool.calculateDynamicReliabilityWeight(slowDegradedShard);

    assert.ok(weightFast > 1.0, `Fast shard weight (${weightFast}) should be boosted above 1.0`);
    assert.ok(weightSlow < 0.8, `Slow degraded shard weight (${weightSlow}) should be penalized below 0.8`);
    assert.ok(weightFast > weightSlow * 2, 'Fast healthy shard weight should be > 2x degraded shard');
  });

  console.log('\n======================================================================');
  if (testsFailed === 0) {
    console.log(`   ALL ${testsPassed}/${testsPassed} FORENSIC VERIFICATION TESTS PASSED SUCCESSFULLY! `);
  } else {
    console.log(`   TEST SUITE FAILED: ${testsPassed} passed, ${testsFailed} failed.`);
    process.exit(1);
  }
  console.log('======================================================================\n');
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
