/**
 * GALXAI: Comprehensive Validation & Forensic Test Suite
 * Tests cryptographic envelope encryption, AAD bound transplantation immunity,
 * continuous rate token replenishment calculus, 2-phase token reservation,
 * duration parsing, 4-state circuit breaker with retry-after, EWMA latency tracking,
 * lease acquisition, adaptive hydraulic quota cycling, and model catalog routing.
 */

import assert from 'assert';
import * as crypto from 'node:crypto';
import { GalxCryptoVault } from '../src/core/vault/GalxCryptoVault';

import { ContinuousTokenBucketRateGovernor } from '../src/core/governor/ContinuousTokenBucketRateGovernor';
import { GalxCircuitBreaker } from '../src/core/circuit/GalxCircuitBreaker';
import { GalxCredentialSubstrate } from '../src/core/substrate/GalxCredentialSubstrate';
import { GalxCredentialPool } from '../src/core/pool/GalxCredentialPool';
import { ModelCatalog } from '../src/core/router/ModelCatalog';
import { GalxPreflightValidator } from '../src/core/validator/GalxPreflightValidator';
import { GalxMetricsEngine } from '../src/core/telemetry/GalxMetricsEngine';
import { GalxTaskQueueEngine } from '../src/core/queue/GalxTaskQueueEngine';
import { GalxQueueClient } from '../src/core/queue/GalxQueueClient';
import { GalxQueueEventBus } from '../src/core/queue/GalxQueueEventBus';
import {
  GalxAI,
  RateLimitError,
  AuthenticationError,
  APITimeoutError,
  createCostTrackerPlugin,
  createLRUCachePlugin,
  TokenOptimizer
} from '../src/sdk';
import type { GalxShardAccount } from '../src/core/contracts/GalxContracts';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { SessionRepository } from '../src/lib/supabase/repositories/SessionRepository';
import { galxRouter } from '../src/core/router/GalxModelRouter';









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

  await test('Post-Allocation Headroom Leveling: Alternates concurrent shard acquisition', () => {
    pool.setStrategy('adaptive_headroom');
    const substrateLevel = new GalxCredentialSubstrate();
    substrateLevel.clearCache();
    const poolLevel = new GalxCredentialPool(substrateLevel, governor, breaker, 'adaptive_headroom');

    const encL1 = GalxCryptoVault.encryptSecret({ apiKey: 'sk-proj-level1' }, 'user_l1', 'shard_level_1', 'openai');
    const shardL1: GalxShardAccount = {
      id: 'shard_level_1',
      userId: 'user_l1',
      accountLabel: 'Level Shard 1',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...lvl1',
      encryptedPayload: encL1,
      tokenBucket: governor.createDefaultBucket(200_000, 200_000, 100),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };

    const encL2 = GalxCryptoVault.encryptSecret({ apiKey: 'sk-proj-level2' }, 'user_l2', 'shard_level_2', 'openai');
    const shardL2: GalxShardAccount = {
      id: 'shard_level_2',
      userId: 'user_l2',
      accountLabel: 'Level Shard 2',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...lvl2',
      encryptedPayload: encL2,
      tokenBucket: governor.createDefaultBucket(200_000, 200_000, 100),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };

    substrateLevel.addAccount(shardL1);
    substrateLevel.addAccount(shardL2);

    // Pick 1: Should pick shard_level_1 or shard_level_2
    const lease1 = poolLevel.acquireLease({ userId: 'u_l1', provider: 'openai', estimatedTokens: 50_000 });
    assert.ok(lease1.lease);

    // Pick 2: Because lease 1 reserved 50K tokens on the first shard, post-allocation headroom MUST pick the other shard
    const lease2 = poolLevel.acquireLease({ userId: 'u_l2', provider: 'openai', estimatedTokens: 50_000 });
    assert.ok(lease2.lease);
    assert.notStrictEqual(lease1.lease.shardId, lease2.lease.shardId);

    poolLevel.releaseLease(lease1.lease.leaseId, 45_000, true);
    poolLevel.releaseLease(lease2.lease.leaseId, 45_000, true);
  });

  await test('Lease Management: Extends TTL during long streaming generation', () => {
    const substrateExt = new GalxCredentialSubstrate();
    substrateExt.clearCache();
    const poolExt = new GalxCredentialPool(substrateExt, governor, breaker, 'adaptive_headroom');

    const enc = GalxCryptoVault.encryptSecret({ apiKey: 'sk-proj-ttl' }, 'user_ttl', 'shard_ttl', 'openai');
    const shard: GalxShardAccount = {
      id: 'shard_ttl',
      userId: 'user_ttl',
      accountLabel: 'TTL Shard',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...ttl',
      encryptedPayload: enc,
      tokenBucket: governor.createDefaultBucket(),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };
    substrateExt.addAccount(shard);

    const { lease } = poolExt.acquireLease({ userId: 'u_ttl', provider: 'openai', leaseTtlMs: 50_000 });
    assert.ok(lease);
    const initialExpiry = lease.expiresAtMs;

    const extended = poolExt.extendLeaseTtl(lease.leaseId, 60_000);
    assert.strictEqual(extended, true);
    assert.strictEqual(lease.expiresAtMs, initialExpiry + 60_000);

    poolExt.releaseLease(lease.leaseId, 1000, true);
  });

  await test('Lease Scavenger: Reclaims orphaned soft token reservations upon lease expiry', () => {
    const substrateScav = new GalxCredentialSubstrate();
    substrateScav.clearCache();
    const poolScav = new GalxCredentialPool(substrateScav, governor, breaker, 'adaptive_headroom');

    const enc = GalxCryptoVault.encryptSecret({ apiKey: 'sk-proj-scav' }, 'user_scav', 'shard_scav', 'openai');
    const shard: GalxShardAccount = {
      id: 'shard_scav',
      userId: 'user_scav',
      accountLabel: 'Scavenger Shard',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...scav',
      encryptedPayload: enc,
      tokenBucket: governor.createDefaultBucket(100_000, 100_000, 100),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };
    substrateScav.addAccount(shard);

    const now = Date.now();
    const { lease } = poolScav.acquireLease({
      userId: 'u_scav',
      provider: 'openai',
      leaseTtlMs: 1000,
      estimatedTokens: 25_000,
      nowMs: now
    });
    assert.ok(lease);

    // Verify reservation was placed
    const accBefore = substrateScav.getAccount('shard_scav');
    assert.strictEqual(accBefore?.tokenBucket.reservedTokens, 25_000);

    // Trigger scavenger at t = now + 5000ms (after TTL expired)
    const scavengedCount = poolScav.scavengeStaleLeases(now + 5000);
    assert.strictEqual(scavengedCount, 1);

    // Verify soft reservation was cleanly reclaimed
    const accAfter = substrateScav.getAccount('shard_scav');
    assert.strictEqual(accAfter?.tokenBucket.reservedTokens, 0);
  });

  await test('Tenant-Affinity Shard Dispersion (TASD): Naturally distributes multi-request burst across distinct pool shards', () => {
    const substrateDisp = new GalxCredentialSubstrate();
    substrateDisp.clearCache();
    const poolDisp = new GalxCredentialPool(substrateDisp, governor, breaker, 'adaptive_headroom');

    const shardD1: GalxShardAccount = {
      id: 'shard_disp_1',
      userId: 'user_d1',
      accountLabel: 'Dispersion Shard 1',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...d1',
      encryptedPayload: GalxCryptoVault.encryptSecret({ apiKey: 'sk-proj-d1' }, 'user_d1', 'shard_disp_1', 'openai'),
      tokenBucket: governor.createDefaultBucket(500_000, 500_000, 100),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };

    const shardD2: GalxShardAccount = {
      id: 'shard_disp_2',
      userId: 'user_d2',
      accountLabel: 'Dispersion Shard 2',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...d2',
      encryptedPayload: GalxCryptoVault.encryptSecret({ apiKey: 'sk-proj-d2' }, 'user_d2', 'shard_disp_2', 'openai'),
      tokenBucket: governor.createDefaultBucket(500_000, 500_000, 100),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };

    substrateDisp.addAccount(shardD1);
    substrateDisp.addAccount(shardD2);

    // Tenant A acquires 2 parallel leases
    const leaseA1 = poolDisp.acquireLease({ userId: 'tenant_heavy', provider: 'openai', estimatedTokens: 1000 });
    assert.ok(leaseA1.lease);

    const leaseA2 = poolDisp.acquireLease({ userId: 'tenant_heavy', provider: 'openai', estimatedTokens: 1000 });
    assert.ok(leaseA2.lease);

    // Assert that TASD and post-allocation leveling routed the 2 requests to separate shards
    assert.notStrictEqual(leaseA1.lease.shardId, leaseA2.lease.shardId);

    poolDisp.releaseLease(leaseA1.lease.leaseId, 1000, true);
    poolDisp.releaseLease(leaseA2.lease.leaseId, 1000, true);
  });

  // --- SUITE 6: Asynchronous Task Queue & Push/Pull Worker Substrate (CloudTasks & CloudRun Pattern) ---
  const queueEngine = GalxTaskQueueEngine.getInstance();

  await test('Queue Engine: Initializes default queues and retrieves queue configurations', () => {
    const queues = queueEngine.listQueues();
    assert.ok(queues.length >= 5);
    const defaultQueue = queueEngine.getQueue('default');
    assert.ok(defaultQueue);
    assert.strictEqual(defaultQueue.state, 'RUNNING');
    assert.strictEqual(defaultQueue.rateLimits.maxDispatchesPerSecond, 100);
    assert.strictEqual(defaultQueue.rateLimits.maxConcurrentDispatches, 50);

    const batchQueue = queueEngine.getQueue('llm-batch');
    assert.ok(batchQueue);
    assert.strictEqual(batchQueue.rateLimits.maxDispatchesPerSecond, 50);
  });

  await test('Queue Engine: Strict Idempotency Deduplication Window prevents duplicate tasks', () => {
    const dedupKey = `test-idemp-${Date.now()}`;
    const res1 = queueEngine.createTask({
      queueId: 'default',
      userId: 'test_user_idemp',
      idempotencyKey: dedupKey,
      target: {
        type: 'HTTP_PUSH',
        url: 'https://example.com/webhook',
        body: { hello: 'world' }
      }
    });

    assert.strictEqual(res1.deduplicated, false);
    assert.ok(res1.task.id);

    const res2 = queueEngine.createTask({
      queueId: 'default',
      userId: 'test_user_idemp',
      idempotencyKey: dedupKey,
      target: {
        type: 'HTTP_PUSH',
        url: 'https://example.com/webhook',
        body: { hello: 'world-duplicate' }
      }
    });

    assert.strictEqual(res2.deduplicated, true);
    assert.strictEqual(res2.task.id, res1.task.id);
  });

  await test('Queue Engine: Delayed task scheduling places future tasks into SCHEDULED state', () => {
    const futureTime = Date.now() + 60000;
    const res = queueEngine.createTask({
      queueId: 'default',
      userId: 'test_user_sched',
      scheduleTimeMs: futureTime,
      target: {
        type: 'PULL_WORKER',
        payload: { job: 'cleanup' }
      }
    });

    assert.strictEqual(res.task.status, 'SCHEDULED');
    assert.strictEqual(res.task.scheduleTimeMs, futureTime);
  });

  await test('Queue Engine: Exponential backoff calculus computes bounded jittered backoff intervals', () => {
    const retryConfig = {
      maxAttempts: 5,
      minBackoffMs: 200,
      maxBackoffMs: 10000,
      maxDoublings: 5,
      jitterFactor: 0.2
    };

    const b1 = queueEngine.calculateBackoff(retryConfig, 1);
    assert.ok(b1 >= 200 && b1 <= 250);

    const b2 = queueEngine.calculateBackoff(retryConfig, 2);
    assert.ok(b2 >= 400 && b2 <= 500);

    const b3 = queueEngine.calculateBackoff(retryConfig, 3);
    assert.ok(b3 >= 800 && b3 <= 1000);

    const bMax = queueEngine.calculateBackoff(retryConfig, 10);
    assert.ok(bMax <= 12000);
  });

  await test('Queue Engine: Pull worker leases tasks atomically with monotonic fencing token', () => {
    const customQueueId = `pull-test-queue-${Date.now()}`;
    queueEngine.createOrUpdateQueue({
      id: customQueueId,
      name: 'Pull Test Queue',
      rateLimits: { maxDispatchesPerSecond: 10, maxConcurrentDispatches: 5, maxBurstSize: 10 },
      retryConfig: { maxAttempts: 3, minBackoffMs: 100, maxBackoffMs: 1000 }
    });

    const { task } = queueEngine.createTask({
      queueId: customQueueId,
      userId: 'worker_tester',
      priority: 90,
      target: {
        type: 'PULL_WORKER',
        payload: { chunkIndex: 1, dataset: 'eval-set-v1' },
        tag: 'eval-v1'
      }
    });

    const leaseRes = queueEngine.leaseTasks(customQueueId, {
      workerId: 'worker_node_alpha',
      maxTasks: 5,
      leaseDurationMs: 30000,
      tagFilter: 'eval-v1'
    });

    assert.strictEqual(leaseRes.leasedCount, 1);
    assert.strictEqual(leaseRes.tasks[0].id, task.id);
    assert.strictEqual(leaseRes.tasks[0].status, 'RUNNING');
    assert.strictEqual(leaseRes.tasks[0].activeWorkerId, 'worker_node_alpha');
    assert.ok(leaseRes.tasks[0].activeFencingToken);

    // Heartbeat extension
    const extRes = queueEngine.extendLease(task.id, 'worker_node_alpha', 60000);
    assert.strictEqual(extRes.extended, true);

    // Acknowledge completion
    const ackRes = queueEngine.acknowledgeTask(task.id, 'worker_node_alpha', { processedRows: 500 });
    assert.strictEqual(ackRes, true);

    const completedTask = queueEngine.getTask(task.id);
    assert.strictEqual(completedTask?.status, 'COMPLETED');
    assert.strictEqual(completedTask?.result?.data?.processedRows, 500);
  });

  await test('Queue Engine: Worker failure reporting triggers retry backoff and routes to DLQ on max attempts', () => {
    const customQueueId = `fail-test-queue-${Date.now()}`;
    queueEngine.createOrUpdateQueue({
      id: customQueueId,
      name: 'Fail Test Queue',
      rateLimits: { maxDispatchesPerSecond: 10, maxConcurrentDispatches: 5, maxBurstSize: 10 },
      retryConfig: { maxAttempts: 2, minBackoffMs: 100, maxBackoffMs: 1000 }
    });

    const { task } = queueEngine.createTask({
      queueId: customQueueId,
      userId: 'worker_tester_fail',
      target: {
        type: 'PULL_WORKER',
        payload: { test: 'fail' }
      }
    });

    // Attempt 1: Lease and Fail
    const lease1 = queueEngine.leaseTasks(customQueueId, { workerId: 'worker_beta', maxTasks: 1 });
    assert.strictEqual(lease1.leasedCount, 1);
    const fail1Res = queueEngine.failTask(task.id, 'worker_beta', 'Out of memory', true);
    assert.strictEqual(fail1Res, true);

    const retryingTask = queueEngine.getTask(task.id);
    assert.strictEqual(retryingTask?.status, 'RETRYING');
    assert.strictEqual(retryingTask?.dispatchCount, 1);

    // Attempt 2: Lease and Fail (should transition to DEAD_LETTERED)
    const lease2 = queueEngine.leaseTasks(customQueueId, { workerId: 'worker_gamma', maxTasks: 1 });
    assert.strictEqual(lease2.leasedCount, 1);
    const fail2Res = queueEngine.failTask(task.id, 'worker_gamma', 'Out of memory permanent', true);
    assert.strictEqual(fail2Res, true);

    const dlqTask = queueEngine.getTask(task.id);
    assert.strictEqual(dlqTask?.status, 'DEAD_LETTERED');
    assert.strictEqual(dlqTask?.dispatchCount, 2);

    // Manual Re-drive from DLQ
    const redriveRes = queueEngine.retryTask(task.id);
    assert.strictEqual(redriveRes, true);
    assert.strictEqual(queueEngine.getTask(task.id)?.status, 'QUEUED');
  });

  await test('Queue Engine: Batch Ingestion creates multiple tasks atomically', () => {
    const batchTasks = Array.from({ length: 25 }, (_, i) => ({
      queueId: 'agent-swarms',
      userId: 'swarm_coordinator',
      priority: 60,
      target: {
        type: 'PULL_WORKER' as const,
        payload: { agentId: `agent_${i}`, instruction: `Execute turn #${i}` }
      }
    }));

    const batchRes = queueEngine.createTasksBatch({ tasks: batchTasks });
    assert.strictEqual(batchRes.totalSubmitted, 25);
    assert.strictEqual(batchRes.createdCount, 25);
    assert.strictEqual(batchRes.tasks.length, 25);
  });

  await test('Queue Engine: Pause, resume, and purge queue operations', () => {
    const queueId = `control-test-queue-${Date.now()}`;
    queueEngine.createOrUpdateQueue({
      id: queueId,
      name: 'Control Test Queue',
      rateLimits: { maxDispatchesPerSecond: 10, maxConcurrentDispatches: 5, maxBurstSize: 10 },
      retryConfig: { maxAttempts: 3, minBackoffMs: 100, maxBackoffMs: 1000 }
    });

    queueEngine.pauseQueue(queueId);
    assert.strictEqual(queueEngine.getQueue(queueId)?.state, 'PAUSED');

    queueEngine.resumeQueue(queueId);
    assert.strictEqual(queueEngine.getQueue(queueId)?.state, 'RUNNING');

    queueEngine.createTask({
      queueId,
      userId: 'purge_user',
      target: { type: 'PULL_WORKER', payload: { a: 1 } }
    });

    const statsBefore = queueEngine.getQueueStats(queueId);
    assert.ok((statsBefore?.pendingTasks || 0) >= 1);

    const purged = queueEngine.purgeQueue(queueId);
    assert.ok(purged >= 1);

    const statsAfter = queueEngine.getQueueStats(queueId);
    assert.strictEqual(statsAfter?.pendingTasks, 0);
  });

  await test('Queue Engine: Strict FIFO Partition Grouping enforces sequential execution per groupId', () => {
    const queueId = `fifo-test-queue-${Date.now()}`;
    queueEngine.createOrUpdateQueue({
      id: queueId,
      name: 'FIFO Test Queue',
      rateLimits: { maxDispatchesPerSecond: 50, maxConcurrentDispatches: 20, maxBurstSize: 50 },
      retryConfig: { maxAttempts: 3, minBackoffMs: 100, maxBackoffMs: 1000 }
    });

    const groupId = `conv_thread_${Date.now()}`;

    // Enqueue 2 tasks in the SAME groupId
    const res1 = queueEngine.createTask({
      queueId,
      userId: 'fifo_user',
      groupId,
      target: { type: 'PULL_WORKER', payload: { turn: 1 } }
    });

    const res2 = queueEngine.createTask({
      queueId,
      userId: 'fifo_user',
      groupId,
      target: { type: 'PULL_WORKER', payload: { turn: 2 } }
    });

    // Lease 1: Should lease Task 1
    const lease1 = queueEngine.leaseTasks(queueId, { workerId: 'worker_fifo_1', maxTasks: 5 });
    assert.strictEqual(lease1.leasedCount, 1);
    assert.strictEqual(lease1.tasks[0].id, res1.task.id);

    // Lease 2: While Task 1 is RUNNING, Task 2 in the same group CANNOT be leased
    const lease2 = queueEngine.leaseTasks(queueId, { workerId: 'worker_fifo_2', maxTasks: 5 });
    assert.strictEqual(lease2.leasedCount, 0);

    // Acknowledge Task 1
    queueEngine.acknowledgeTask(res1.task.id, 'worker_fifo_1', { success: true });

    // Lease 3: Now Task 2 can be leased!
    const lease3 = queueEngine.leaseTasks(queueId, { workerId: 'worker_fifo_2', maxTasks: 5 });
    assert.strictEqual(lease3.leasedCount, 1);
    assert.strictEqual(lease3.tasks[0].id, res2.task.id);

    queueEngine.acknowledgeTask(res2.task.id, 'worker_fifo_2', { success: true });
  });

  await test('Queue Engine: Cron & Recurring Schedule next timestamp calculus', () => {
    const now = Date.now();
    const next1 = queueEngine.calculateNextCronTimestampMs({ repeatEveryMs: 30000 }, now);
    assert.strictEqual(next1, now + 30000);

    const next2 = queueEngine.calculateNextCronTimestampMs({ cronExpression: '*/10 * * * *' }, now);
    assert.strictEqual(next2, now + 600000);
  });

  await test('Queue Engine: Worker interim progress and execution log streaming', () => {
    const queueId = `progress-test-queue-${Date.now()}`;
    queueEngine.createOrUpdateQueue({
      id: queueId,
      name: 'Progress Test Queue',
      rateLimits: { maxDispatchesPerSecond: 10, maxConcurrentDispatches: 5, maxBurstSize: 10 },
      retryConfig: { maxAttempts: 3, minBackoffMs: 100, maxBackoffMs: 1000 }
    });

    const { task } = queueEngine.createTask({
      queueId,
      userId: 'progress_tester',
      target: { type: 'PULL_WORKER', payload: { data: 123 } }
    });

    queueEngine.updateTaskProgress(task.id, {
      percentage: 45,
      message: 'Processing batch items 450/1000',
      currentStep: 'data_transformation',
      stepIndex: 2,
      totalSteps: 4,
      logLine: 'Chunk 45 parsed without error'
    });

    const updated = queueEngine.getTask(task.id);
    assert.strictEqual(updated?.progress?.percentage, 45);
    assert.strictEqual(updated?.progress?.currentStep, 'data_transformation');
    assert.ok(updated?.progress?.logs?.some(l => l.includes('Chunk 45 parsed')));
  });

  await test('Queue Engine: Bulk DLQ Redrive and Bulk Cancellation', () => {
    const queueId = `bulk-test-queue-${Date.now()}`;
    queueEngine.createOrUpdateQueue({
      id: queueId,
      name: 'Bulk Test Queue',
      rateLimits: { maxDispatchesPerSecond: 10, maxConcurrentDispatches: 5, maxBurstSize: 10 },
      retryConfig: { maxAttempts: 1, minBackoffMs: 100, maxBackoffMs: 1000 }
    });

    // Create 3 tasks with specific tag
    const tag = `bulk-tag-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      queueEngine.createTask({
        queueId,
        userId: 'bulk_user',
        tag,
        target: { type: 'PULL_WORKER', payload: { i } }
      });
    }

    // Lease and fail all 3 tasks -> moves to DEAD_LETTERED
    const lease = queueEngine.leaseTasks(queueId, { workerId: 'bulk_worker', maxTasks: 3 });
    assert.strictEqual(lease.leasedCount, 3);
    for (const t of lease.tasks) {
      queueEngine.failTask(t.id, 'bulk_worker', 'Fatal failure', false);
    }

    const statsBefore = queueEngine.getQueueStats(queueId);
    assert.strictEqual(statsBefore?.deadLetteredTasks, 3);

    // Bulk Redrive
    const redriveRes = queueEngine.bulkRedrive(queueId, { tag });
    assert.strictEqual(redriveRes.redrivenCount, 3);

    const statsAfter = queueEngine.getQueueStats(queueId);
    assert.strictEqual(statsAfter?.deadLetteredTasks, 0);
    assert.strictEqual(statsAfter?.pendingTasks, 3);

    // Bulk Cancel
    const cancelRes = queueEngine.bulkCancel(queueId, { tag });
    assert.strictEqual(cancelRes.cancelledCount, 3);
  });

  await test('GalxQueueClient SDK: Fluent helper and HMAC signature verification', () => {
    const client = new GalxQueueClient(queueEngine);
    const queueId = `client-test-queue-${Date.now()}`;

    queueEngine.createOrUpdateQueue({
      id: queueId,
      name: 'Client Test Queue',
      rateLimits: { maxDispatchesPerSecond: 50, maxConcurrentDispatches: 20, maxBurstSize: 50 },
      retryConfig: { maxAttempts: 3, minBackoffMs: 100, maxBackoffMs: 1000 }
    });

    // Enqueue Chat helper
    const chatRes = client.enqueueChat({
      queueId,
      userId: 'sdk_user',
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'SDK test message' }],
      priority: 85
    });

    assert.ok(chatRes.task.id);
    assert.strictEqual(chatRes.task.priority, 85);
    assert.strictEqual(chatRes.task.target.type, 'INTERNAL_MODEL');

    // Webhook Signature verification
    const secret = 'whsec_test_secret_key_12345';
    const payload = JSON.stringify({ event: 'task_completed', id: chatRes.task.id });
    const timestamp = Date.now();
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
    const header = `t=${timestamp},v1=${signature}`;

    const isValid = GalxQueueClient.verifyWebhookSignature(header, payload, secret);
    assert.strictEqual(isValid, true);

    const isTampered = GalxQueueClient.verifyWebhookSignature(header, payload + 'tampered', secret);
    assert.strictEqual(isTampered, false);
  });

  await test('Queue Engine: Directed Acyclic Graph (DAG) Task Dependencies (Fan-In with dependsOn)', () => {
    const queueId = `dag-test-queue-${Date.now()}`;
    queueEngine.createOrUpdateQueue({
      id: queueId,
      name: 'DAG Test Queue',
      rateLimits: { maxDispatchesPerSecond: 50, maxConcurrentDispatches: 20, maxBurstSize: 50 },
      retryConfig: { maxAttempts: 3, minBackoffMs: 100, maxBackoffMs: 1000 }
    });

    // Parent Task 1
    const p1 = queueEngine.createTask({
      queueId,
      userId: 'dag_user',
      target: { type: 'PULL_WORKER', payload: { step: 'A' } }
    });

    // Parent Task 2
    const p2 = queueEngine.createTask({
      queueId,
      userId: 'dag_user',
      target: { type: 'PULL_WORKER', payload: { step: 'B' } }
    });

    // Child Task waiting on Parent 1 and Parent 2
    const child = queueEngine.createTask({
      queueId,
      userId: 'dag_user',
      dependsOn: [p1.task.id, p2.task.id],
      target: { type: 'PULL_WORKER', payload: { step: 'C_Aggregation' } }
    });

    // Assert Child starts in WAITING_DEPENDENCIES
    assert.strictEqual(child.task.status, 'WAITING_DEPENDENCIES');

    // Lease and complete Parent 1 with maxTasks: 1
    const leaseP1 = queueEngine.leaseTasks(queueId, { workerId: 'w1', maxTasks: 1 });
    assert.strictEqual(leaseP1.leasedCount, 1);
    assert.strictEqual(leaseP1.tasks[0].id, p1.task.id);
    queueEngine.acknowledgeTask(p1.task.id, 'w1', { resultA: 100 });

    // Child should STILL be in WAITING_DEPENDENCIES
    assert.strictEqual(queueEngine.getTask(child.task.id)?.status, 'WAITING_DEPENDENCIES');

    // Lease and complete Parent 2
    const leaseP2 = queueEngine.leaseTasks(queueId, { workerId: 'w2', maxTasks: 1 });
    assert.strictEqual(leaseP2.leasedCount, 1);
    assert.strictEqual(leaseP2.tasks[0].id, p2.task.id);
    queueEngine.acknowledgeTask(p2.task.id, 'w2', { resultB: 200 });

    // Now Child should automatically transition to QUEUED with parent outputs aggregated!
    const childAfter = queueEngine.getTask(child.task.id);
    assert.strictEqual(childAfter?.status, 'QUEUED');
    assert.strictEqual(childAfter?.parentTaskResults?.[p1.task.id]?.resultA, 100);
    assert.strictEqual(childAfter?.parentTaskResults?.[p2.task.id]?.resultB, 200);

    // Child can now be leased and completed
    const leaseChild = queueEngine.leaseTasks(queueId, { workerId: 'w3', maxTasks: 1 });
    assert.strictEqual(leaseChild.leasedCount, 1);
    assert.strictEqual(leaseChild.tasks[0].id, child.task.id);
    queueEngine.acknowledgeTask(child.task.id, 'w3', { final: 300 });
    assert.strictEqual(queueEngine.getTask(child.task.id)?.status, 'COMPLETED');
  });

  await test('Queue Engine: Real-Time EventBus Subscriptions (Task and Queue Level)', () => {
    const bus = GalxQueueEventBus.getInstance();
    const queueId = `bus-test-queue-${Date.now()}`;
    queueEngine.createOrUpdateQueue({
      id: queueId,
      name: 'Bus Test Queue',
      rateLimits: { maxDispatchesPerSecond: 10, maxConcurrentDispatches: 5, maxBurstSize: 10 },
      retryConfig: { maxAttempts: 3, minBackoffMs: 100, maxBackoffMs: 1000 }
    });

    const eventsReceived: string[] = [];

    const unsubscribeQueue = bus.subscribeQueue(queueId, (evt) => {
      eventsReceived.push(`QUEUE:${evt.type}`);
    });

    const { task } = queueEngine.createTask({
      queueId,
      userId: 'bus_user',
      target: { type: 'PULL_WORKER', payload: { x: 1 } }
    });

    const taskEvents: string[] = [];
    const unsubscribeTask = bus.subscribeTask(task.id, (evt) => {
      taskEvents.push(evt.type);
    });

    queueEngine.updateTaskProgress(task.id, { percentage: 50, message: 'Halfway' });
    queueEngine.cancelTask(task.id);

    unsubscribeQueue();
    unsubscribeTask();

    assert.ok(eventsReceived.includes('QUEUE:TASK_QUEUED') || eventsReceived.includes('QUEUE:TASK_PROGRESS'));
    assert.ok(taskEvents.includes('TASK_PROGRESS'));
    assert.ok(taskEvents.includes('TASK_CANCELLED'));
  });

  await test('Queue Engine: Content-Based SHA-256 Deduplication', () => {
    const queueId = `content-dedup-queue-${Date.now()}`;
    queueEngine.createOrUpdateQueue({
      id: queueId,
      name: 'Content Dedup Queue',
      contentBasedDeduplication: true,
      defaultDeduplicationWindowMs: 60000,
      rateLimits: { maxDispatchesPerSecond: 10, maxConcurrentDispatches: 5, maxBurstSize: 10 },
      retryConfig: { maxAttempts: 3, minBackoffMs: 100, maxBackoffMs: 1000 }
    });

    // Enqueue identical payload without explicit idempotencyKey
    const target = { type: 'PULL_WORKER' as const, payload: { query: 'same_unique_query', id: 42 } };

    const res1 = queueEngine.createTask({
      queueId,
      userId: 'dedup_user',
      contentBasedDeduplication: true,
      target
    });
    assert.strictEqual(res1.deduplicated, false);

    const res2 = queueEngine.createTask({
      queueId,
      userId: 'dedup_user',
      contentBasedDeduplication: true,
      target
    });
    assert.strictEqual(res2.deduplicated, true);
    assert.strictEqual(res2.task.id, res1.task.id);
  });

  await test('Queue Engine: Dynamic Priority Anti-Starvation Aging', () => {
    const queue = queueEngine.getQueue('default')!;
    const now = Date.now();

    const task = {
      id: 'aging_task_1',
      queueId: 'default',
      userId: 'aging_user',
      priority: 20,
      createdAtMs: now - 30000, // waiting for 30s
      target: { type: 'PULL_WORKER' as const, payload: {} },
      status: 'QUEUED' as const,
      scheduleTimeMs: now,
      updatedAtMs: now,
      dispatchCount: 0,
      responseCount: 0,
      attempts: []
    };

    // With 10s aging interval (5 boost per 10s): 30s wait = +15 boost -> effective priority 35
    const effPriority = queueEngine.getEffectivePriority(task, queue, now);
    assert.strictEqual(effPriority, 35);
  });

  await test('Queue Engine: Wall-Clock Deadlines and Task SLA Expiration', async () => {
    const queueId = `deadline-queue-${Date.now()}`;
    queueEngine.createOrUpdateQueue({
      id: queueId,
      name: 'Deadline Queue',
      rateLimits: { maxDispatchesPerSecond: 10, maxConcurrentDispatches: 5, maxBurstSize: 10 },
      retryConfig: { maxAttempts: 3, minBackoffMs: 100, maxBackoffMs: 1000 }
    });

    // Task with 1ms TTL
    const { task } = queueEngine.createTask({
      queueId,
      userId: 'sla_user',
      ttlMs: 1,
      target: { type: 'PULL_WORKER', payload: { urgent: true } }
    });

    // Wait 10ms so deadline is guaranteed elapsed
    await new Promise(r => setTimeout(r, 10));

    // Trigger watchdog sweep
    (queueEngine as any).scavengeExpiredLeasesAndDeadlines();

    const expiredTask = queueEngine.getTask(task.id);
    assert.strictEqual(expiredTask?.status, 'EXPIRED');
  });


  await test('Queue Engine: Queue Draining and Graceful Maintenance Mode', () => {
    const queueId = `draining-queue-${Date.now()}`;
    queueEngine.createOrUpdateQueue({
      id: queueId,
      name: 'Draining Queue',
      rateLimits: { maxDispatchesPerSecond: 10, maxConcurrentDispatches: 5, maxBurstSize: 10 },
      retryConfig: { maxAttempts: 3, minBackoffMs: 100, maxBackoffMs: 1000 }
    });

    queueEngine.drainQueue(queueId);
    const qState = queueEngine.getQueue(queueId)?.state;
    assert.strictEqual(qState, 'DRAINING');

    // Standard task (priority 50) should be rejected
    assert.throws(() => {
      queueEngine.createTask({
        queueId,
        priority: 50,
        target: { type: 'PULL_WORKER', payload: {} }
      });
    }, /DRAINING/);

    // High-priority emergency task (priority 95) should be allowed
    const highPri = queueEngine.createTask({
      queueId,
      priority: 95,
      target: { type: 'PULL_WORKER', payload: {} }
    });
    assert.ok(highPri.task.id);

    queueEngine.resumeQueue(queueId);
    assert.strictEqual(queueEngine.getQueue(queueId)?.state, 'RUNNING');
  });

  await test('GalxAI Developer SDK: Client Initialization & Config', () => {
    const sdk = new GalxAI({
      apiKey: 'galx_live_test_client_key_123',
      baseURL: 'https://gateway.galx.ai',
      timeoutMs: 45000,
      maxRetries: 3
    });

    assert.ok(sdk.chat);
    assert.ok(sdk.images);
    assert.ok(sdk.models);
    assert.ok(sdk.queues);
    assert.ok(sdk.workflows);
    assert.ok(sdk.webhooks);
  });

  await test('GalxAI Developer SDK: Models & Cost Calculator', () => {
    const sdk = new GalxAI({ apiKey: 'galx_live_test' });

    const estimate = sdk.models.calculateCost({
      model: 'gpt-5.6-sol',
      inputTokens: 10000,
      outputTokens: 2000,
      cachedTokens: 5000
    });

    assert.strictEqual(estimate.model, 'gpt-5.6-sol');
    assert.ok(estimate.totalCost > 0);
    assert.ok(estimate.cachedSavings > 0);
    assert.ok(estimate.estimatedSavingsPercentage > 0);
    assert.ok(estimate.retailComparisonCost > estimate.totalCost);
  });

  await test('GalxAI Developer SDK: Webhooks Signature Generation & Verification', () => {
    const sdk = new GalxAI();
    const secret = 'whsec_enterprise_webhook_secret_999';
    const payload = JSON.stringify({ event: 'agent_turn_completed', tokens: 1450 });

    const signatureHeader = sdk.webhooks.generateSignature(payload, secret);
    assert.ok(signatureHeader.startsWith('t='));
    assert.ok(signatureHeader.includes('v1='));

    const isValid = sdk.webhooks.verifySignature(payload, signatureHeader, secret);
    assert.strictEqual(isValid, true);

    const isTampered = sdk.webhooks.verifySignature(payload + 'corrupt', signatureHeader, secret);
    assert.strictEqual(isTampered, false);
  });

  await test('GalxAI Developer SDK: Typed Error Hierarchy Classes', () => {
    const authErr = new AuthenticationError('Invalid key');
    assert.strictEqual(authErr.name, 'AuthenticationError');
    assert.strictEqual(authErr.statusCode, 401);

    const rateErr = new RateLimitError('Quota exhausted', 30);
    assert.strictEqual(rateErr.name, 'RateLimitError');
    assert.strictEqual(rateErr.statusCode, 429);
    assert.strictEqual(rateErr.retryAfterSeconds, 30);

    const timeoutErr = new APITimeoutError(15000);
    assert.strictEqual(timeoutErr.name, 'APITimeoutError');
    assert.strictEqual(timeoutErr.timeoutMs, 15000);
  });

  await test('GalxAI Developer SDK: Queue Client & In-Memory Polling Handle Mock', async () => {
    const queueId = `sdk-queue-${Date.now()}`;
    queueEngine.createOrUpdateQueue({
      id: queueId,
      name: 'SDK Queue',
      rateLimits: { maxDispatchesPerSecond: 20, maxConcurrentDispatches: 10, maxBurstSize: 20 },
      retryConfig: { maxAttempts: 2, minBackoffMs: 100, maxBackoffMs: 1000 }
    });

    const sdk = new GalxAI({
      apiKey: 'galx_live_test_sdk',
      baseURL: 'http://localhost:3000',
      fetch: async (url, opts) => {
        // Mock gateway response for SDK async enqueue
        return new Response(JSON.stringify({
          id: `task_sdk_${Date.now()}`,
          queue: queueId,
          status: 'QUEUED',
          task_url: `/api/queues/${queueId}/tasks/task_sdk_123`
        }), { status: 202, headers: { 'Content-Type': 'application/json' } });
      }
    });

    const handle = await sdk.chat.completions.createAsync({
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'SDK async task test' }],
      queue: queueId
    });

    assert.ok(handle.taskId.startsWith('task_sdk_'));
    assert.strictEqual(handle.queueId, queueId);
    assert.strictEqual(typeof handle.result, 'function');
    assert.strictEqual(typeof handle.streamProgress, 'function');
    assert.strictEqual(typeof handle.cancel, 'function');
  });

  await test('GalxAI Developer SDK: Fluent Builder Method Chaining & Async Execution', async () => {
    let capturedBody: any;
    let capturedHeaders: any;

    const sdk = new GalxAI({
      apiKey: 'galx_live_test_builder',
      baseURL: 'http://localhost:3000',
      fetch: async (url, opts: any) => {
        capturedBody = JSON.parse(opts.body);
        capturedHeaders = opts.headers;
        return new Response(JSON.stringify({
          id: 'chatcmpl_builder_123',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-5.6-sol',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Builder response OK' }, finish_reason: 'stop' }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    });

    const res = await sdk.chat
      .builder('gpt-5.6-sol')
      .system('You are an expert system engineer.')
      .user('Explain Raft consensus.')
      .temperature(0.2)
      .maxTokens(2048)
      .execute();

    assert.ok(capturedBody);
    assert.strictEqual(capturedBody.model, 'gpt-5.6-sol');
    assert.strictEqual(capturedBody.temperature, 0.2);
    assert.strictEqual(capturedBody.max_tokens, 2048);
    assert.strictEqual(capturedBody.messages.length, 2);
    assert.strictEqual(capturedBody.messages[0].role, 'system');
    assert.strictEqual(capturedBody.messages[1].role, 'user');
    assert.strictEqual((res as any).choices[0].message.content, 'Builder response OK');
  });

  await test('GalxAI Developer SDK: Structured JSON Outputs & Schema Extraction', async () => {
    const sdk = new GalxAI({
      apiKey: 'galx_live_test_structured',
      baseURL: 'http://localhost:3000',
      fetch: async (url, opts: any) => {
        const body = JSON.parse(opts.body);
        assert.strictEqual(body.response_format?.type, 'json_schema');
        assert.ok(body.response_format?.json_schema?.schema?.properties?.invoiceId);

        return new Response(JSON.stringify({
          id: 'chatcmpl_struct_123',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-5.6-sol',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify({ invoiceId: 'INV-2026-001', amount: 450.50, currency: 'USD' })
            },
            finish_reason: 'stop'
          }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    });

    interface InvoiceData {
      invoiceId: string;
      amount: number;
      currency: string;
    }

    const structured = await sdk.chat.structured<InvoiceData>({
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'Extract invoice metadata' }],
      schema: {
        type: 'object',
        properties: {
          invoiceId: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' }
        },
        required: ['invoiceId', 'amount', 'currency']
      },
      validator: (data): data is InvoiceData => typeof data.invoiceId === 'string' && typeof data.amount === 'number'
    });

    assert.strictEqual(structured.invoiceId, 'INV-2026-001');
    assert.strictEqual(structured.amount, 450.50);
    assert.strictEqual(structured.currency, 'USD');
  });

  await test('GalxAI Developer SDK: Multi-Modal Content Ingestion Helpers', () => {
    const sdk = new GalxAI();

    // 1. Encode URL
    const urlPart = sdk.multimodal.encodeImage('https://images.galx.ai/diagram.png');
    assert.strictEqual(urlPart.type, 'image_url');
    assert.strictEqual(urlPart.image_url.url, 'https://images.galx.ai/diagram.png');

    // 2. Encode Buffer
    const buf = Buffer.from('mock_image_bytes');
    const bufPart = sdk.multimodal.encodeImage(buf);
    assert.strictEqual(bufPart.type, 'image_url');
    assert.ok(bufPart.image_url.url.startsWith('data:image/png;base64,'));

    // 3. Create Multi-Modal User Message
    const msg = sdk.multimodal.createUserMessage('Inspect this architecture:', [
      'https://images.galx.ai/arch.png',
      buf
    ]);
    assert.strictEqual(msg.role, 'user');
    assert.ok(Array.isArray(msg.content));
    assert.strictEqual(msg.content.length, 3); // 1 text + 2 images
  });

  await test('GalxAI Developer SDK: Stream Protocol Adapters (toTextStream & toDataStreamResponse)', async () => {
    const sdk = new GalxAI();

    async function* mockChunks() {
      yield { id: '1', object: 'chunk', created: 1, model: 'm', choices: [{ index: 0, delta: { content: 'Hello' }, finish_reason: null }] };
      yield { id: '2', object: 'chunk', created: 2, model: 'm', choices: [{ index: 0, delta: { content: ' World' }, finish_reason: 'stop' }] };
    }

    // 1. Plain Text Stream
    const textStream = sdk.adapters.toTextStream(mockChunks());
    const reader = textStream.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value);
    }
    assert.strictEqual(accumulated, 'Hello World');

    // 2. Vercel AI SDK Data Stream Response
    const dataResponse = sdk.adapters.toDataStreamResponse(mockChunks());
    assert.strictEqual(dataResponse.headers.get('x-vercel-ai-data-stream'), 'v1');
    const dataText = await dataResponse.text();
    assert.ok(dataText.includes('0:"Hello"'));
    assert.ok(dataText.includes('0:" World"'));
    assert.ok(dataText.includes('d:{"finishReason":"stop"}'));
  });

  await test('GalxAI Developer SDK: Batch Swarm Concurrency Evaluator (mapConcurrent)', async () => {
    const sdk = new GalxAI();
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const processedProgress: number[] = [];

    const results = await sdk.batch.mapConcurrent(
      items,
      async (item) => {
        await new Promise(r => setTimeout(r, 10));
        return item * 10;
      },
      {
        concurrency: 4,
        onProgress: (completed, total) => {
          processedProgress.push(completed);
        }
      }
    );

    assert.strictEqual(results.length, 8);
    assert.strictEqual(results.every(r => r.status === 'fulfilled'), true);
    assert.strictEqual(results[0].result, 10);
    assert.strictEqual(results[7].result, 80);
    assert.ok(processedProgress.includes(8));
  });

  await test('GalxAI Autonomous Agent: Multi-Step Tool Calling Loop Execution', async () => {
    let callCount = 0;
    const sdk = new GalxAI({
      apiKey: 'galx_live_test_agent',
      baseURL: 'http://localhost:3000',
      fetch: async (url, opts: any) => {
        callCount++;
        const body = JSON.parse(opts.body);

        // Step 1: Model requests tool call
        if (callCount === 1) {
          return new Response(JSON.stringify({
            id: 'chatcmpl_agent_step1',
            object: 'chat.completion',
            created: Date.now(),
            model: 'gpt-5.6-sol',
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: 'Checking stock quote...',
                tool_calls: [{
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'getQuote',
                    arguments: JSON.stringify({ ticker: 'NVDA' })
                  }
                }]
              },
              finish_reason: 'tool_calls'
            }]
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // Step 2: Model synthesizes final answer with tool output
        return new Response(JSON.stringify({
          id: 'chatcmpl_agent_step2',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-5.6-sol',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'Nvidia is currently trading at $135.50.'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 150, completion_tokens: 25, total_tokens: 175 }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    });

    let toolExecuted = false;
    const agent = sdk.agent({
      model: 'gpt-5.6-sol',
      systemPrompt: 'You are a market analyst.',
      tools: {
        getQuote: {
          description: 'Get stock quote',
          parameters: { ticker: { type: 'string' } },
          execute: async ({ ticker }) => {
            toolExecuted = true;
            return { ticker, price: 135.50, currency: 'USD' };
          }
        }
      }
    });

    const res = await agent.run('What is Nvidia stock price?');

    assert.strictEqual(toolExecuted, true);
    assert.strictEqual(res.stepsCount, 2);
    assert.strictEqual(res.text, 'Nvidia is currently trading at $135.50.');
    assert.strictEqual(res.toolCallsExecuted.length, 1);
    assert.strictEqual(res.toolCallsExecuted[0].toolName, 'getQuote');
    assert.strictEqual(res.toolCallsExecuted[0].result.price, 135.50);
  });

  await test('GalxAI Middleware Pipeline: Lifecycle Hooks & Request Context Tracing', async () => {
    let beforeHookFired = false;
    let afterHookFired = false;

    const sdk = new GalxAI({
      apiKey: 'galx_live_test_middleware',
      baseURL: 'http://localhost:3000',
      fetch: async () => {
        return new Response(JSON.stringify({
          id: 'chatcmpl_mid_123',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-5.6-sol',
          choices: [{ index: 0, message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    });

    sdk.use({
      onRequest: (ctx) => {
        beforeHookFired = true;
        assert.strictEqual(ctx.method, 'POST');
        assert.strictEqual(ctx.path, '/v1/chat/completions');
      },
      onResponse: (ctx) => {
        afterHookFired = true;
        assert.strictEqual(ctx.statusCode, 200);
        assert.ok(ctx.durationMs >= 0);
      }
    });

    await sdk.chat.completions.create({
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'Test middleware' }]
    });

    assert.strictEqual(beforeHookFired, true);
    assert.strictEqual(afterHookFired, true);
  });

  await test('GalxAI Middleware: Semantic In-Memory LRU Response Caching Plugin', async () => {
    let networkFetches = 0;

    const sdk = new GalxAI({
      apiKey: 'galx_live_test_cache',
      baseURL: 'http://localhost:3000',
      fetch: async () => {
        networkFetches++;
        return new Response(JSON.stringify({
          id: `chatcmpl_cache_${networkFetches}`,
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-5.6-sol',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Cached data' }, finish_reason: 'stop' }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    });

    sdk.use(createLRUCachePlugin({ maxEntries: 10, ttlMs: 5000 }));

    // Request 1: cache miss -> network call
    const res1 = await sdk.chat.completions.create({
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'Same unique prompt' }]
    });
    assert.strictEqual(networkFetches, 1);
    assert.strictEqual(res1.choices[0].message.content, 'Cached data');

    // Request 2: cache hit -> 0 additional network calls!
    const res2 = await sdk.chat.completions.create({
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'Same unique prompt' }]
    });
    assert.strictEqual(networkFetches, 1);
    assert.strictEqual(res2.choices[0].message.content, 'Cached data');
  });

  await test('GalxAI Middleware: Real-Time Token Cost & Dollar Budget Tracker Plugin', async () => {
    let capturedStats: any = null;
    let budgetExceeded = false;

    const sdk = new GalxAI({
      apiKey: 'galx_live_test_cost',
      baseURL: 'http://localhost:3000',
      fetch: async () => {
        return new Response(JSON.stringify({
          id: 'chatcmpl_cost_123',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-5.6-sol',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Token response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    });

    sdk.use(createCostTrackerPlugin({
      maxBudgetUsd: 0.005,
      onUsageUpdate: (stats) => { capturedStats = stats; },
      onBudgetExceeded: () => { budgetExceeded = true; }
    }));

    await sdk.chat.completions.create({
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'Track cost' }]
    });

    assert.ok(capturedStats);
    assert.strictEqual(capturedStats.totalRequests, 1);
    assert.strictEqual(capturedStats.totalTokens, 1500);
    assert.ok(capturedStats.totalCostUsd > 0);
    assert.strictEqual(budgetExceeded, true);
  });

  await test('GalxAI Resilience: Multi-Model Fallback Cascade on 429/5xx Failover', async () => {
    let triedModels: string[] = [];

    const sdk = new GalxAI({
      apiKey: 'galx_live_test_cascade',
      baseURL: 'http://localhost:3000',
      fetch: async (url, opts: any) => {
        const body = JSON.parse(opts.body);
        triedModels.push(body.model);

        // Fail primary model with 429
        if (body.model === 'gpt-5.6-sol') {
          return new Response(JSON.stringify({ error: { message: 'Primary quota exhausted' } }), { status: 429 });
        }

        // Succeed on secondary model
        return new Response(JSON.stringify({
          id: 'chatcmpl_cascade_success',
          object: 'chat.completion',
          created: Date.now(),
          model: body.model,
          choices: [{ index: 0, message: { role: 'assistant', content: 'Cascade success' }, finish_reason: 'stop' }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    });

    const res = await sdk.chat.fallbackCascade(
      ['gpt-5.6-sol', 'x-ai/grok-4.5', 'gpt-5.6-luna'],
      { messages: [{ role: 'user', content: 'Failover test' }] }
    );

    assert.strictEqual(res.successfulModel, 'x-ai/grok-4.5');
    assert.strictEqual(res.attemptsMade, 2);
    assert.ok(triedModels.includes('gpt-5.6-sol'));
    assert.ok(triedModels.includes('x-ai/grok-4.5'));
    assert.strictEqual(res.choices[0].message.content, 'Cascade success');
  });

  await test('GalxAI Context Optimizer: Token Estimation & Conversation Pruning', () => {
    // 1. Estimate Tokens
    const text = 'Distributed consensus protocols require quorum agreement across physical shards.';
    const tokens = TokenOptimizer.estimateTokens(text);
    assert.ok(tokens > 5 && tokens < 30);

    // 2. Message History Pruning
    const messages = [
      { role: 'system' as const, content: 'You are an AI assistant.' },
      { role: 'user' as const, content: 'Old message 1' },
      { role: 'assistant' as const, content: 'Old reply 1' },
      { role: 'user' as const, content: 'Old message 2' },
      { role: 'assistant' as const, content: 'Old reply 2' },
      { role: 'user' as const, content: 'Recent question' }
    ];

    const pruned = TokenOptimizer.truncateToFit(messages, 30, 'preserve_system_and_recent');

    // System instruction is strictly preserved
    assert.strictEqual(pruned[0].role, 'system');
    // Most recent user question is preserved
    assert.strictEqual(pruned[pruned.length - 1].content, 'Recent question');
    // Total count reduced
    assert.ok(pruned.length < messages.length);
  });

  // --- SUITE 16: Hardened Provider-as-Auth & Bearer Token Security ---
  await test('Vault: Generates HMAC-SHA256 signed bearer session tokens with claims', () => {
    const tokenResult = GalxCryptoVault.generateSessionToken({
      userId: 'usr_creator_999',
      provider: 'openai',
      shardId: 'codex_shard_01',
      shardMode: 'pooled',
      email: 'creator@openai.user',
      displayName: 'OpenAI Pro Creator',
      version: 'v1'
    });

    assert.ok(tokenResult.token.startsWith('galx_sess_'));
    assert.ok(tokenResult.tokenHash.length === 64);
    assert.strictEqual(tokenResult.claims.sub, 'usr_creator_999');
    assert.strictEqual(tokenResult.claims.provider, 'openai');
    assert.strictEqual(tokenResult.claims.shardId, 'codex_shard_01');
    assert.ok(tokenResult.expiresAtMs > Date.now());
  });

  await test('Vault: Verifies valid HMAC-SHA256 session token', () => {
    const tokenResult = GalxCryptoVault.generateSessionToken({
      userId: 'usr_valid_123',
      provider: 'xai-grok',
      shardId: 'grok_shard_456',
      email: 'dev@x.ai',
      version: 'v1'
    });

    const verify = GalxCryptoVault.verifySessionToken(tokenResult.token);
    assert.strictEqual(verify.valid, true);
    assert.ok(verify.claims);
    assert.strictEqual(verify.claims?.sub, 'usr_valid_123');
    assert.strictEqual(verify.claims?.provider, 'xai-grok');
  });

  await test('Vault: Rejects tampered session token (corrupted signature or payload)', () => {
    const tokenResult = GalxCryptoVault.generateSessionToken({
      userId: 'usr_legit_123',
      provider: 'openai',
      version: 'v1'
    });

    // 1. Corrupt signature
    const corruptedSigToken = tokenResult.token.slice(0, -4) + 'ffff';
    const verifyCorruptedSig = GalxCryptoVault.verifySessionToken(corruptedSigToken);
    assert.strictEqual(verifyCorruptedSig.valid, false);
    assert.strictEqual(verifyCorruptedSig.error, 'INVALID_SIGNATURE_TAMPER_DETECTED');

    // 2. Corrupt payload
    const parts = tokenResult.token.split('.');
    const fakePayload = Buffer.from(JSON.stringify({ sub: 'usr_attacker', provider: 'openai', exp: Date.now() + 100000 })).toString('base64url');
    const forgedToken = `galx_sess_${fakePayload}.${parts[1]}`;
    const verifyForged = GalxCryptoVault.verifySessionToken(forgedToken);
    assert.strictEqual(verifyForged.valid, false);
    assert.strictEqual(verifyForged.error, 'INVALID_SIGNATURE_TAMPER_DETECTED');
  });

  await test('Vault: Rejects expired session token', () => {
    const expiredToken = GalxCryptoVault.generateSessionToken({
      userId: 'usr_expired_123',
      provider: 'openai',
      ttlMs: -5000, // Already expired 5s ago
      version: 'v1'
    });

    const verifyExpired = GalxCryptoVault.verifySessionToken(expiredToken.token);
    assert.strictEqual(verifyExpired.valid, false);
    assert.strictEqual(verifyExpired.error, 'TOKEN_EXPIRED');
  });


  await test('Provider-as-Auth: Orchestrates OpenAI 1-Click login and provisions vaulted shard + signed session', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const result = await authEngine.authenticateProviderUser('openai', {
      apiKey: 'sk-proj-testkey1234567890abcdef',
      email: 'alex@enterprise.ai',
      displayName: 'Alex Enterprise',
      mode: 'private'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.user.id.startsWith('openai_'));
    assert.strictEqual(result.user.email, 'alex@enterprise.ai');
    assert.strictEqual(result.user.provider, 'openai');
    assert.strictEqual(result.user.shardMode, 'private');
    assert.ok(result.user.token.startsWith('galx_sess_'));

    // Verify session in auth engine
    const sessionCheck = await authEngine.verifySession(result.user.token);
    assert.strictEqual(sessionCheck.valid, true);
    assert.strictEqual(sessionCheck.claims?.sub, result.user.id);
  });

  await test('Provider-as-Auth: Orchestrates xAI Grok 1-Click login and provisions vaulted shard + signed session', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const result = await authEngine.authenticateProviderUser('xai-grok', {
      apiKey: 'xai-testkey9876543210fedcba',
      email: 'elon@x.ai',
      displayName: 'Elon Creator',
      mode: 'pooled'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.user.id.startsWith('grok_'));
    assert.strictEqual(result.user.provider, 'xai-grok');
    assert.strictEqual(result.user.shardMode, 'pooled');
    assert.ok(result.user.token.startsWith('galx_sess_'));
  });

  await test('Auth Engine: Refreshes active session token and rotates token hash', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const login = await authEngine.authenticateProviderUser('openai', {
      apiKey: 'sk-proj-refresh-test-key-123456',
      email: 'refresh@galxai.dev'
    });

    const refreshResult = await authEngine.refreshSession(login.user.token);
    assert.strictEqual(refreshResult.success, true);
    assert.ok(refreshResult.token);
    assert.ok(refreshResult.token?.startsWith('galx_sess_'));
    assert.notStrictEqual(refreshResult.token, login.user.token);

    // New token is valid
    const checkNew = await authEngine.verifySession(refreshResult.token!);
    assert.strictEqual(checkNew.valid, true);
  });

  await test('Auth Engine: Instant session revocation killswitch invalidates active token', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const login = await authEngine.authenticateProviderUser('openai', {
      apiKey: 'sk-proj-revoke-test-key-123456',
      email: 'revoked@galxai.dev'
    });

    // Before revocation: valid
    const beforeCheck = await authEngine.verifySession(login.user.token);
    assert.strictEqual(beforeCheck.valid, true);

    // Revoke
    const revoked = await authEngine.revokeSession(login.user.token, 'User logout');
    assert.strictEqual(revoked, true);

    // After revocation: invalid
    const afterCheck = await authEngine.verifySession(login.user.token);
    assert.strictEqual(afterCheck.valid, false);
    assert.strictEqual(afterCheck.error, 'SESSION_REVOKED');
  });

  await test('Gateway Identity Resolver: Authenticates valid developer keys and signed session tokens while rejecting forged tokens', async () => {
    const authEngine = GalxAuthEngine.getInstance();

    // 1. Valid Session Token
    const sessionAuth = await authEngine.authenticateProviderUser('openai', {
      apiKey: 'sk-proj-gateway-resolver-test-key',
      email: 'gateway@galxai.dev'
    });
    const sessionResolve = await authEngine.resolveAuthIdentity({
      headers: { authorization: `Bearer ${sessionAuth.user.token}` }
    });
    assert.strictEqual(sessionResolve.authenticated, true);
    assert.strictEqual(sessionResolve.authType, 'session_token');
    assert.strictEqual(sessionResolve.userId, sessionAuth.user.id);

    // 2. Forged Session Token (modified signature)
    const forgedToken = sessionAuth.user.token.slice(0, -6) + '000000';
    const forgedResolve = await authEngine.resolveAuthIdentity({
      headers: { authorization: `Bearer ${forgedToken}` }
    });
    assert.strictEqual(forgedResolve.authenticated, false);
    assert.strictEqual(forgedResolve.authType, 'session_token');
    assert.strictEqual(forgedResolve.error, 'INVALID_SIGNATURE_TAMPER_DETECTED');

    // 3. Unauthenticated / missing header
    const anonResolve = await authEngine.resolveAuthIdentity({
      headers: {}
    });
    assert.strictEqual(anonResolve.authenticated, false);
    assert.strictEqual(anonResolve.authType, 'anonymous');
  });

  // --- SUITE 17: V2 JWE Encrypted Tokens, Replay Protection, & Multi-Device Governance ---
  await test('Vault V2: Generates and decrypts JWE-grade AES-256-GCM encrypted session tokens (galx_sess_v2...) without leaking plaintext claims', () => {
    const encrypted = GalxCryptoVault.generateEncryptedSessionToken({
      userId: 'usr_jwe_007',
      provider: 'openai',
      shardId: 'codex_shard_jwe',
      email: 'secret_agent@enterprise.ai',
      displayName: 'Secret Agent',
      familyId: 'fam_jwe_root',
      sequenceNumber: 1
    });

    assert.ok(encrypted.token.startsWith('galx_sess_v2.'));
    // Ensure raw email is not readable in token plaintext
    assert.strictEqual(encrypted.token.includes('secret_agent@enterprise.ai'), false);

    // Verify and decrypt
    const verify = GalxCryptoVault.verifySessionToken(encrypted.token);
    assert.strictEqual(verify.valid, true);
    assert.ok(verify.claims);
    assert.strictEqual(verify.claims?.sub, 'usr_jwe_007');
    assert.strictEqual(verify.claims?.email, 'secret_agent@enterprise.ai');
    assert.strictEqual(verify.claims?.familyId, 'fam_jwe_root');
    assert.strictEqual(verify.claims?.seq, 1);
  });

  await test('Vault V2: Client Fingerprint Generation & User-Agent Parsing (DPoP)', () => {
    const fpt1 = GalxCryptoVault.generateClientFingerprint('192.168.1.55, 10.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    const fpt2 = GalxCryptoVault.generateClientFingerprint('192.168.1.99', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    // Same /24 subnet and user agent should yield identical subnet-tolerant fingerprint
    assert.strictEqual(fpt1, fpt2);

    const uaParsed = GalxCryptoVault.parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    assert.strictEqual(uaParsed.browser, 'Google Chrome');
    assert.strictEqual(uaParsed.os, 'macOS');
  });

  await test('Auth Engine V2: OAuth 2.0 Token Rotation with 30s Grace Period and Monotonic Sequence Counter', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const login = await authEngine.authenticateProviderUser('openai', {
      apiKey: 'sk-proj-rotation-test-key-999',
      email: 'rotate@galxai.dev',
      ipAddress: '198.51.100.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'
    });

    const token1 = login.user.token;
    assert.ok(token1.startsWith('galx_sess_v2.'));

    // First rotation -> token2
    const rotate1 = await authEngine.refreshSession(token1, '198.51.100.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0');
    assert.strictEqual(rotate1.success, true);
    assert.ok(rotate1.token);
    assert.strictEqual(rotate1.claims?.seq, 2);

    // Concurrent in-flight replay of token1 within grace window succeeds
    const graceReplay = await authEngine.refreshSession(token1, '198.51.100.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0');
    assert.strictEqual(graceReplay.success, true);
  });

  await test('Auth Engine V2: Token Reuse Attack Detection triggers Automatic Session Family Killswitch', async () => {
    const sessionRepo = SessionRepository.getInstance();
    const mockOldHash = 'hash_attack_source_old_token_1234567890abcdef1234567890abcdef1234';
    const mockNewHash = 'hash_attack_source_new_token_1234567890abcdef1234567890abcdef1234';
    const familyId = 'fam_reuse_target_999';
    const sessionId = 'sess_reuse_test_1';
    const now = Date.now();

    // Setup active session that was already rotated 2 minutes ago (grace period expired)
    await sessionRepo.createSession({
      id: sessionId,
      userId: 'usr_victim_123',
      provider: 'openai',
      sessionFamilyId: familyId,
      sequenceNumber: 2,
      tokenHash: mockNewHash,
      previousTokenHash: mockOldHash,
      gracePeriodUntilMs: now - 60000, // Expired 1 min ago
      isRevoked: false,
      issuedAtMs: now - 120000,
      expiresAtMs: now + 86400000,
      lastActiveAtMs: now,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Attacker tries to rotate using already-rotated, expired-grace token (mockOldHash)
    const attackResult = await sessionRepo.rotateSessionTokenAtomic(
      mockOldHash,
      'hash_attacker_forged_new_token_77777777777777777777777777777777',
      now + 86400000
    );

    assert.strictEqual(attackResult.success, false);
    assert.strictEqual(attackResult.reuseDetected, true);
    assert.strictEqual(attackResult.error, 'TOKEN_REUSE_ATTACK_DETECTED');

    // The session family must be instantly revoked
    const victimSession = await sessionRepo.findSessionById(sessionId);
    assert.strictEqual(victimSession?.isRevoked, true);
    assert.strictEqual(victimSession?.revokedReason, 'TOKEN_REUSE_ATTACK_DETECTED');
  });

  await test('Auth Engine V2: Multi-Device Session Governance & Remote Logout', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const sessionRepo = SessionRepository.getInstance();
    const userId = 'usr_multidevice_tester';
    const now = Date.now();

    // Create Device A (MacBook Chrome - Current)
    const sessA = 'sess_device_macbook';
    await sessionRepo.createSession({
      id: sessA,
      userId,
      provider: 'openai',
      tokenHash: 'hash_macbook_token_1234567890abcdef1234567890abcdef12345678',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      ipAddress: '72.14.201.1',
      isRevoked: false,
      issuedAtMs: now,
      expiresAtMs: now + 86400000 * 7,
      lastActiveAtMs: now,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Create Device B (iPhone Safari - Remote)
    const sessB = 'sess_device_iphone';
    await sessionRepo.createSession({
      id: sessB,
      userId,
      provider: 'openai',
      tokenHash: 'hash_iphone_token_1234567890abcdef1234567890abcdef12345678',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      ipAddress: '172.56.21.9',
      isRevoked: false,
      issuedAtMs: now - 3600000,
      expiresAtMs: now + 86400000 * 7,
      lastActiveAtMs: now - 3600000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 1. List active devices
    const activeDevices = await authEngine.getUserActiveSessions(userId, sessA);
    assert.strictEqual(activeDevices.length, 2);
    const macDevice = activeDevices.find(d => d.id === sessA);
    const phoneDevice = activeDevices.find(d => d.id === sessB);
    assert.strictEqual(macDevice?.isCurrent, true);
    assert.strictEqual(macDevice?.browser, 'Google Chrome');
    assert.strictEqual(macDevice?.os, 'macOS');
    assert.strictEqual(phoneDevice?.isCurrent, false);
    assert.strictEqual(phoneDevice?.browser, 'Apple Safari');
    assert.strictEqual(phoneDevice?.os, 'iOS');

    // 2. Remote Logout of all other devices (keep Mac, terminate iPhone)
    const revokedCount = await authEngine.revokeOtherSessions(userId, sessA, 'User remote logout');
    assert.strictEqual(revokedCount, 1);

    // Verify phone is revoked, Mac is still active
    const postLogoutMac = await sessionRepo.findSessionById(sessA);
    const postLogoutPhone = await sessionRepo.findSessionById(sessB);
    assert.strictEqual(postLogoutMac?.isRevoked, false);
    assert.strictEqual(postLogoutPhone?.isRevoked, true);
  });

  // --- SUITE 18: V3 Step-Up SUDO Mode, Token Scoping, Risk Scoring, & KMS Re-Wrapping ---
  await test('Vault V3: Wildcard Token Scope matching calculus', () => {
    // 1. Full superuser wildcard
    assert.strictEqual(GalxCryptoVault.validateTokenScope(['*'], 'chat:completions'), true);
    assert.strictEqual(GalxCryptoVault.validateTokenScope(['*'], 'admin:sudo'), true);

    // 2. Prefix wildcard
    assert.strictEqual(GalxCryptoVault.validateTokenScope(['chat:*', 'images:*'], 'chat:completions'), true);
    assert.strictEqual(GalxCryptoVault.validateTokenScope(['chat:*', 'images:*'], 'chat:stream'), true);
    assert.strictEqual(GalxCryptoVault.validateTokenScope(['chat:*', 'images:*'], 'images:generations'), true);
    assert.strictEqual(GalxCryptoVault.validateTokenScope(['chat:*', 'images:*'], 'admin:sudo'), false);
    assert.strictEqual(GalxCryptoVault.validateTokenScope(['chat:*', 'images:*'], 'billing:read'), false);

    // 3. Exact matching
    assert.strictEqual(GalxCryptoVault.validateTokenScope(['billing:read'], 'billing:read'), true);
    assert.strictEqual(GalxCryptoVault.validateTokenScope(['billing:read'], 'billing:write'), false);
  });

  await test('Auth Engine V3: Ephemeral Restricted Sub-Token minting and scope enforcement', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const login = await authEngine.authenticateProviderUser('openai', {
      apiKey: 'sk-proj-restricted-mint-test',
      email: 'parent_user@enterprise.ai',
      displayName: 'Parent User'
    });

    // Parent token has full access ('*')
    const parentToken = login.user.token;

    // 1. Mint downstream restricted token for a subagent (`chat:*` only)
    const mintRes = await authEngine.createRestrictedToken(parentToken, {
      scopes: ['chat:*'],
      ttlMs: 3600000,
      name: 'Chat Subagent Worker'
    });

    assert.strictEqual(mintRes.success, true);
    assert.ok(mintRes.token);
    assert.deepStrictEqual(mintRes.scopes, ['chat:*']);

    // 2. Resolve identity with restricted token on chat endpoint -> Authorized
    const chatResolve = await authEngine.resolveAuthIdentity(
      { headers: { authorization: `Bearer ${mintRes.token}` } },
      'chat:completions'
    );
    assert.strictEqual(chatResolve.authenticated, true);
    assert.strictEqual(chatResolve.userId, login.user.id);

    // 3. Resolve identity with restricted token on admin endpoint -> Forbidden (Scope Exceeded)
    const adminResolve = await authEngine.resolveAuthIdentity(
      { headers: { authorization: `Bearer ${mintRes.token}` } },
      'admin:sudo'
    );
    assert.strictEqual(adminResolve.authenticated, false);
    assert.ok(adminResolve.error?.includes('FORBIDDEN_INSUFFICIENT_SCOPE'));
  });

  await test('Auth Engine V3: Step-Up SUDO Mode elevation and high-risk gatekeeper check', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const sessionRepo = SessionRepository.getInstance();
    const userId = 'usr_sudo_tester_888';
    const sessionId = `sess_sudo_test_${Date.now()}`;
    const now = Date.now();

    // Create an un-elevated session (SUDO mode expired 10 minutes ago)
    const tokenResult = GalxCryptoVault.generateEncryptedSessionToken({
      userId,
      provider: 'openai',
      sudoUntilMs: now - 600000 // Expired
    });

    await sessionRepo.createSession({
      id: sessionId,
      userId,
      provider: 'openai',
      tokenHash: tokenResult.tokenHash,
      sudoElevatedUntilMs: now - 600000,
      isRevoked: false,
      issuedAtMs: now - 3600000,
      expiresAtMs: now + 86400000,
      lastActiveAtMs: now,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const authCheck = await authEngine.resolveAuthIdentity({
      headers: { authorization: `Bearer ${tokenResult.token}` }
    });
    assert.strictEqual(authCheck.authenticated, true);
    assert.strictEqual(authCheck.isSudoElevated, false);

    // High-risk action rejected
    const sudoCheck = authEngine.requireSudoElevation(authCheck);
    assert.strictEqual(sudoCheck.elevated, false);
    assert.ok(sudoCheck.error?.includes('SUDO_MODE_REQUIRED'));

    // Elevate SUDO mode for 15 minutes
    const elevateRes = await authEngine.elevateSessionSudo(sessionId, userId, 15 * 60 * 1000);
    assert.strictEqual(elevateRes.success, true);
    assert.strictEqual(elevateRes.sudoActive, true);
    assert.ok(elevateRes.sudoElevatedUntilMs > now);

    // Re-check elevation
    const elevatedSession = await sessionRepo.findSessionById(sessionId);
    assert.ok(elevatedSession?.sudoElevatedUntilMs && elevatedSession.sudoElevatedUntilMs > Date.now());
  });

  await test('Auth Engine V3: Adaptive Behavioral Risk Scoring evaluates subnet and OS anomalies', () => {
    const authEngine = GalxAuthEngine.getInstance();
    const session: any = {
      id: 'sess_risk_eval_1',
      userId: 'usr_risk_target',
      ipAddress: '198.51.100.22',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      fingerprintHash: GalxCryptoVault.generateClientFingerprint('198.51.100.22', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'),
      riskScore: 0
    };

    // 1. Normal traffic (same IP subnet and browser) -> Low Risk (0)
    const lowRisk = authEngine.evaluateSessionRisk(session, '198.51.100.88', session.userAgent);
    assert.strictEqual(lowRisk.riskScore, 0);
    assert.strictEqual(lowRisk.riskLevel, 'low');
    assert.strictEqual(lowRisk.isHighRisk, false);

    // 2. Anomalous traffic (drastic IP subnet shift + OS shift: macOS -> Linux curl) -> High Risk
    const highRisk = authEngine.evaluateSessionRisk(
      session,
      '203.0.113.50',
      'curl/8.4.0 (x86_64-pc-linux-gnu)'
    );
    assert.ok(highRisk.riskScore >= 50);
    assert.strictEqual(highRisk.isHighRisk, true);
    assert.ok(highRisk.riskFactors.includes('IP_SUBNET_SHIFT_DETECTED'));
  });

  await test('Vault V3: Zero-Downtime KMS Key Re-Wrapping Pipeline', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const login = await authEngine.authenticateProviderUser('openai', {
      apiKey: 'sk-proj-kms-rewrap-test-key-12345',
      email: 'rewrap@galxai.dev'
    });

    const shardId = login.user.shardId;
    const shard = galxRouter.substrate.getAccount(shardId);
    assert.ok(shard);
    assert.ok(shard.encryptedSecrets);

    // Re-wrap all shards to primary key version
    const rewrapResult = await authEngine.reencryptVaultShards('v1');
    assert.ok(rewrapResult.total >= 1);
    assert.ok(rewrapResult.reencrypted >= 1);

    // Decrypting the re-wrapped shard credentials produces exact original secret
    const decrypted = GalxCryptoVault.decryptSecret(shard.encryptedSecrets, login.user.id, shardId, 'openai');
    assert.strictEqual(decrypted.apiKey, 'sk-proj-kms-rewrap-test-key-12345');
  });

  await test('Auth Engine V3: User Security Posture aggregation and composite health grading', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const login = await authEngine.authenticateProviderUser('openai', {
      apiKey: 'sk-proj-posture-test-key-999',
      email: 'posture@galxai.dev'
    });

    const posture = await authEngine.getUserSecurityPosture(login.user.id);
    assert.ok(['A+', 'A', 'B', 'C'].includes(posture.overallGrade));
    assert.strictEqual(posture.riskLevel, 'low');
    assert.ok(posture.activeSessionsCount >= 1);
    assert.strictEqual(posture.sudoActive, true); // Fresh login has active SUDO window
    assert.ok(posture.recommendations.length >= 1);
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
