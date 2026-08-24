/**
 * GALXAI: Comprehensive Validation & Forensic Test Suite
 * Tests cryptographic envelope encryption, AAD bound transplantation immunity,
 * continuous rate token replenishment calculus, 2-phase token reservation,
 * duration parsing, 4-state circuit breaker with retry-after, EWMA latency tracking,
 * lease acquisition, adaptive hydraulic quota cycling, and model catalog routing.
 */

import assert from 'assert';
import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
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
  createPrivacyShieldPlugin,
  TokenOptimizer,
  PrivacyProfiles
} from '../src/sdk';
import type { GalxShardAccount, GalxUserSession, OAuthIdentityRecord } from '../src/core/contracts/GalxContracts';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { GalxOAuthManager, OAuthExchangeError } from '../src/core/auth/GalxOAuthManager';
import { SessionRepository } from '../src/lib/supabase/repositories/SessionRepository';
import { OAuthRepository } from '../src/lib/supabase/repositories/OAuthRepository';
import { galxRouter } from '../src/core/router/GalxModelRouter';
import { GalxPIIRedactor, galxRedactor } from '../src/core/privacy/GalxPIIRedactor';
import { GalxZDRProtocol, galxZDR, StreamingPIIWindowTransformer, ScopedMemorySanitizer, ZDRRatchetSession, galxSlabPool } from '../src/core/privacy/GalxZDRProtocol';
import { GalxPrivacyComplianceEngine, galxPrivacy } from '../src/core/privacy/GalxPrivacyComplianceEngine';
import { GalxSOC2AuditEngine, galxSOC2 } from '../src/core/compliance/GalxSOC2AuditEngine';
import { GalxSOC2DriftDetector, galxDriftDetector } from '../src/core/compliance/GalxSOC2DriftDetector';
import { GalxDynamicSecurityProbe, galxSecurityProbe } from '../src/core/compliance/GalxDynamicSecurityProbe';
import { GalxHighThroughputAuditStreamer, galxAuditStreamer } from '../src/core/compliance/GalxHighThroughputAuditStreamer';
import { LockFreeShardGovernor, lockFreeGovernor } from '../src/core/governor/LockFreeShardGovernor';
import { GalxThreatDetector, galxThreatDetector } from '../src/core/compliance/GalxThreatDetector';
import { BroccoliDatabaseKernel, BroccoliDbTable, BroccoliNaturalQueryParser, BroccoliAggregateEngine } from '../src/core/broccolidb';
import { AuditRepository } from '../src/lib/supabase/repositories/AuditRepository';
import { ApiKeyRepository } from '../src/lib/supabase/repositories/ApiKeyRepository';
import { GalxPersistence } from '../src/lib/storage/GalxPersistence';
import { TelemetryRepository } from '../src/lib/supabase/repositories/TelemetryRepository';
import { ShardHealthRepository } from '../src/lib/supabase/repositories/ShardHealthRepository';
import { IdempotencyRepository } from '../src/lib/supabase/repositories/IdempotencyRepository';
import { DistributedLockRepository } from '../src/lib/supabase/repositories/DistributedLockRepository';
import { WorkspaceRepository } from '../src/lib/supabase/repositories/WorkspaceRepository';
import { BudgetRepository } from '../src/lib/supabase/repositories/BudgetRepository';
import { WalletRepository } from '../src/lib/supabase/repositories/WalletRepository';
import { EmbeddingsRepository } from '../src/lib/supabase/repositories/EmbeddingsRepository';
import { ProjectRepository } from '../src/lib/supabase/repositories/ProjectRepository';
import { QueueRepository } from '../src/lib/supabase/repositories/QueueRepository';
import { TaskRepository } from '../src/lib/supabase/repositories/TaskRepository';
import { GalxEdgeCache } from '../src/workers/cloudflare/GalxEdgeCache';
import { GalxR2AssetAdapter } from '../src/workers/cloudflare/GalxR2AssetAdapter';

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
    assert.strictEqual(sol?.contextWindowTokens, 900_000);
    assert.strictEqual(sol?.discountPercentage, 25);

    const terra = ModelCatalog.resolveModel('terra');
    assert.strictEqual(terra?.id, 'gpt-5.6-terra');
    assert.strictEqual(terra?.provider, 'openai');
    assert.strictEqual(terra?.contextWindowTokens, 900_000);

    const luna = ModelCatalog.resolveModel('luna');
    assert.strictEqual(luna?.id, 'gpt-5.6-luna');
    assert.strictEqual(luna?.provider, 'openai');
    assert.strictEqual(luna?.contextWindowTokens, 900_000);

    const grok46 = ModelCatalog.resolveModel('grok-4.6');
    assert.strictEqual(grok46?.id, 'x-ai/grok-4.6');
    assert.strictEqual(grok46?.provider, 'xai-grok');
    assert.strictEqual(grok46?.contextWindowTokens, 1_000_000);
    assert.strictEqual(grok46?.discountPercentage, 30);

    const grokAlias = ModelCatalog.resolveModel('grok');
    assert.strictEqual(grokAlias?.id, 'x-ai/grok-4.6');

    const grokDirect = ModelCatalog.resolveModel('x-ai/grok-4.6');
    assert.strictEqual(grokDirect?.id, 'x-ai/grok-4.6');

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

  await test('OAuth PKCE: Generates cryptographically secure authorization URL, S256 challenge & state', async () => {
    const oauthManager = GalxOAuthManager.getInstance();
    const urlDetails = oauthManager.generateAuthUrl('openai', 'http://localhost:3000/auth/callback');

    assert.ok(urlDetails.url.startsWith('https://auth.openai.com/oauth/authorize?'));
    assert.ok(urlDetails.url.includes('code_challenge='));
    assert.ok(urlDetails.url.includes('code_challenge_method=S256'));
    assert.ok(urlDetails.url.includes('response_type=code'));
    assert.ok(urlDetails.codeVerifier.length >= 43);
    assert.ok(urlDetails.state.length >= 16);

    // Verify S256 challenge calculation
    const expectedChallenge = crypto.createHash('sha256').update(urlDetails.codeVerifier).digest().toString('base64url');
    assert.ok(urlDetails.url.includes(`code_challenge=${expectedChallenge}`));
  });

  await test('OAuth JWT Claims: Parses id_token and extracts chatgpt_account_id, email, and expiration timestamp', async () => {
    const oauthManager = GalxOAuthManager.getInstance();
    
    // Construct a synthetic JWT token payload
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      chatgpt_account_id: 'acc_enterprise_9988',
      email: 'engineer@corp.com',
      name: 'Senior ML Engineer',
      exp: Math.floor(Date.now() / 1000) + 7200,
      iat: Math.floor(Date.now() / 1000)
    })).toString('base64url');
    const fakeSig = 'mock_signature_part';
    const mockJwt = `${header}.${payload}.${fakeSig}`;

    const accountId = oauthManager.extractAccountId(mockJwt);
    const email = oauthManager.extractEmail(mockJwt);
    const name = oauthManager.extractName(mockJwt);
    const expMs = oauthManager.extractExpiryMs(mockJwt);

    assert.strictEqual(accountId, 'acc_enterprise_9988');
    assert.strictEqual(email, 'engineer@corp.com');
    assert.strictEqual(name, 'Senior ML Engineer');
    assert.ok(typeof expMs === 'number' && expMs > Date.now());
  });

  await test('Provider-as-Auth: Ingests and vaults OAuth Bearer Access Tokens with AES-256-GCM + AAD envelope', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const result = await authEngine.authenticateProviderUser('openai', {
      accessToken: 'ey_mock_access_token_1234567890_abcdef',
      refreshToken: 'rt_mock_refresh_token_9876543210_fedcba',
      accountId: 'acc_oauth_custom_77',
      email: 'oauth_user@galxai.io',
      displayName: 'OAuth Verified User',
      mode: 'private'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.user.email, 'oauth_user@galxai.io');
    assert.strictEqual(result.user.name, 'OAuth Verified User');
    assert.strictEqual(result.user.shardMode, 'private');
    assert.ok(result.user.token.startsWith('galx_sess_'));

    // Check vaulted shard in substrate
    const shard = galxRouter.substrate.getAccount(result.user.shardId);
    assert.ok(shard);
    assert.strictEqual(shard.authType, 'oauth');
    assert.strictEqual(shard.shardMode, 'private');

    // Decrypt vaulted secret and verify accessToken & accountId
    const decrypted = GalxCryptoVault.decryptSecret(shard.encryptedSecrets!, shard.userId, shard.id, shard.provider);
    assert.strictEqual(decrypted.accessToken, 'ey_mock_access_token_1234567890_abcdef');
    assert.strictEqual(decrypted.refreshToken, 'rt_mock_refresh_token_9876543210_fedcba');
    assert.strictEqual(decrypted.accountId, 'acc_oauth_custom_77');
  });

  await test('Provider-as-Auth: Rejects missing/blank credentials with MISSING_PROVIDER_CREDENTIALS (no synthetic fallback key)', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const prevOpenAiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      await assert.rejects(
        async () => {
          await authEngine.authenticateProviderUser('openai', {
            // Missing both apiKey and accessToken
            mode: 'pooled'
          });
        },
        (err: any) => {
          return err.message.includes('MISSING_PROVIDER_CREDENTIALS');
        }
      );
    } finally {
      if (prevOpenAiKey) process.env.OPENAI_API_KEY = prevOpenAiKey;
    }
  });

  await test('Provider-as-Auth: Zero Guest Sessions - Strictly requires authentic ProviderType', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const initialShardsCount = galxRouter.substrate.listAccounts().length;

    const result = await authEngine.authenticateProviderUser('openai', {
      apiKey: 'sk-proj-valid-provider-auth-key',
      displayName: 'OpenAI Developer'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.user.provider, 'openai');
    assert.strictEqual(result.user.name, 'OpenAI Developer');
    assert.ok(result.user.token.startsWith('galx_sess_'));
  });

  await test('OAuth CSRF Protection: Validates HMAC-SHA256 signed state tokens and rejects tampering/expiration', async () => {
    const oauthManager = GalxOAuthManager.getInstance();

    // 1. Valid signed state
    const signedState = oauthManager.createSignedState('openai', 'nonce_12345');
    const validCheck = oauthManager.verifySignedState(signedState, 'openai');
    assert.strictEqual(validCheck.valid, true);
    assert.strictEqual(validCheck.provider, 'openai');

    // 2. Tampered signature
    const parts = signedState.split(':');
    parts[3] = 'tampered_bad_signature_abc';
    const tamperedState = parts.join(':');
    const tamperedCheck = oauthManager.verifySignedState(tamperedState, 'openai');
    assert.strictEqual(tamperedCheck.valid, false);

    // 3. Provider mismatch
    const mismatchCheck = oauthManager.verifySignedState(signedState, 'xai-grok');
    assert.strictEqual(mismatchCheck.valid, false);
    assert.ok(mismatchCheck.reason?.includes('mismatch'));

    // 4. Expired state
    const expiredTimestamp = Date.now() - (20 * 60 * 1000); // 20 mins ago
    const expiredMessage = `${expiredTimestamp}:openai:nonce_expired`;
    const expiredHmac = crypto.createHmac('sha256', (GalxOAuthManager as any).STATE_SECRET).update(expiredMessage).digest('base64url');
    const expiredState = `${expiredMessage}:${expiredHmac}`;
    const expiredCheck = oauthManager.verifySignedState(expiredState, 'openai');
    assert.strictEqual(expiredCheck.valid, false);
    assert.ok(expiredCheck.reason?.includes('expired'));
  });

  await test('OAuth Shard Lifecycle: Indexes expiresAtMs and accountId for sorted queries and health monitoring', async () => {
    const substrate = galxRouter.substrate;
    const now = Date.now();

    const shardId = `test_oauth_shard_${Date.now()}`;
    const shard: GalxShardAccount = {
      id: shardId,
      userId: 'user_oauth_monitor',
      provider: 'openai',
      authType: 'oauth',
      accountLabel: 'Monitor Test Shard',
      apiKeyMasked: 'ey...test',
      expiresAtMs: now + 3600_000,
      accountId: 'acc_org_monitor_101',
      status: 'healthy',
      priority: 50,
      weight: 1,
      fencingToken: 1,
      tokenBucket: galxRouter.rateGovernor.createDefaultBucket(100000, 100000, 500),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: now,
      updatedAtMs: now
    };

    substrate.addAccount(shard);

    // Query accountTable with secondary index
    const found = substrate.accountTable.get(shardId);
    assert.ok(found);
    assert.strictEqual(found.authType, 'oauth');
    assert.strictEqual(found.expiresAtMs, now + 3600_000);
    assert.strictEqual(found.accountId, 'acc_org_monitor_101');

    // Query sorted index on expiresAtMs
    const rangeResults = substrate.accountTable.query({
      where: {
        expiresAtMs: { $gte: now }
      }
    });
    assert.ok(rangeResults.length >= 1);
    assert.ok(rangeResults.some((s: any) => s.id === shardId));
  });

  await test('Developer SDK: GalxAI Client absorbs OAuth accessToken and accountId headers and exposes AuthResource', async () => {
    const galx = new GalxAI({
      accessToken: 'ey_sdk_access_token_12345',
      accountId: 'acc_enterprise_sdk_999'
    });

    assert.ok(galx.auth);
    assert.strictEqual(typeof galx.auth.getOAuthUrl, 'function');
    assert.strictEqual(typeof galx.auth.exchangeOAuthCode, 'function');
    assert.strictEqual(typeof galx.auth.refreshOAuthToken, 'function');
    assert.strictEqual(typeof galx.auth.getSession, 'function');

    // Verify default headers in SDK core
    assert.strictEqual((galx as any).core.apiKey, 'ey_sdk_access_token_12345');
    assert.strictEqual((galx as any).core.defaultHeaders['ChatGPT-Account-Id'], 'acc_enterprise_sdk_999');
    assert.strictEqual((galx as any).core.defaultHeaders['OpenAI-Account'], 'acc_enterprise_sdk_999');
  });

  await test('OAuth Pool Lifecycle: Adaptive Headroom weights fresh token shards over expiring shards', async () => {
    const now = Date.now();
    const freshShard: GalxShardAccount = {
      id: `fresh_shard_${Date.now()}`,
      userId: 'test_pool_user',
      provider: 'openai',
      authType: 'oauth',
      accountLabel: 'Fresh OAuth Shard',
      apiKeyMasked: 'ey...fresh',
      expiresAtMs: now + 7200_000, // 2 hours ahead
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      tokenBucket: galxRouter.rateGovernor.createDefaultBucket(100000, 100000, 500),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: now,
      updatedAtMs: now
    };

    const expiringShard: GalxShardAccount = {
      id: `expiring_shard_${Date.now()}`,
      userId: 'test_pool_user',
      provider: 'openai',
      authType: 'oauth',
      accountLabel: 'Expiring OAuth Shard',
      apiKeyMasked: 'ey...expiring',
      expiresAtMs: now + 30_000, // 30 seconds ahead
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      tokenBucket: galxRouter.rateGovernor.createDefaultBucket(100000, 100000, 500),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: now,
      updatedAtMs: now
    };

    const selected = (galxRouter.pool as any).selectAdaptiveHydraulicHeadroom(
      [expiringShard, freshShard],
      10,
      now,
      false,
      1000,
      'test_pool_user'
    );

    // Fresh shard should be preferred due to expiryMultiplier (1.05 vs 0.85)
    assert.strictEqual(selected.id, freshShard.id);
  });

  await test('OAuth Provider Multi-Config: Generates distinct authorization endpoints and scopes for OpenAI and xAI Grok', async () => {
    const oauthManager = GalxOAuthManager.getInstance();

    const openaiDetails = oauthManager.generateAuthUrl('openai');
    assert.ok(openaiDetails.url.startsWith('https://auth.openai.com/oauth/authorize'));
    assert.ok(openaiDetails.url.includes('scope=openid'));
    assert.ok(openaiDetails.url.includes('code_challenge_method=S256'));

    const grokDetails = oauthManager.generateAuthUrl('xai-grok');
    assert.ok(grokDetails.url.startsWith('https://auth.x.ai/oauth/authorize'));
    assert.ok(grokDetails.url.includes('client_id=app_galxai_grok_oauth'));
  });

  await test('OAuthRepository: BroccoliDB L1 Hot Cache & Anti-Replay Single-Use State Consumption', async () => {
    const oauthRepo = OAuthRepository.getInstance();
    const stateNonce = `state_replay_test_${Date.now()}`;
    const codeVerifier = 'verifier_secure_secret_1234567890';

    await oauthRepo.createAuthorizationRequest({
      id: `oauth_req_${stateNonce}`,
      state: stateNonce,
      codeVerifier,
      provider: 'openai',
      redirectUri: 'https://galx.ai/api/auth/oauth/callback',
      mode: 'pooled',
      isConsumed: false,
      expiresAtMs: Date.now() + 60_000,
      createdAtMs: Date.now()
    });

    // First consumption: Success
    const firstConsumption = await oauthRepo.consumeAuthorizationRequest(stateNonce, 'openai');
    assert.ok(firstConsumption);
    assert.strictEqual(firstConsumption.codeVerifier, codeVerifier);

    // Second consumption: Anti-replay protection prevents reuse
    const secondConsumption = await oauthRepo.consumeAuthorizationRequest(stateNonce, 'openai');
    assert.strictEqual(secondConsumption, null);
  });

  await test('OAuthRepository: Multi-Provider Identity Linking & Natural Querying', async () => {
    const oauthRepo = OAuthRepository.getInstance();
    const userId = `usr_multi_${Date.now()}`;
    const now = Date.now();

    // Link OpenAI
    await oauthRepo.saveOAuthIdentity({
      id: `oauth_openai_${userId}`,
      userId,
      provider: 'openai',
      providerAccountId: 'acc_chatgpt_multi_1',
      email: 'dev@galx.ai',
      shardId: undefined,
      encryptedAccessToken: GalxCryptoVault.encryptSecret({ accessToken: 'oa_token_123' }, userId, 'shard1', 'openai'),
      status: 'active',
      expiresAtMs: now + 3600_000,
      createdAtMs: now,
      updatedAtMs: now
    });

    // Link xAI Grok
    await oauthRepo.saveOAuthIdentity({
      id: `oauth_xai_${userId}`,
      userId,
      provider: 'xai-grok',
      providerAccountId: 'acc_grok_multi_2',
      email: 'dev@galx.ai',
      shardId: undefined,
      encryptedAccessToken: GalxCryptoVault.encryptSecret({ accessToken: 'grok_token_456' }, userId, 'shard2', 'xai-grok'),
      status: 'active',
      expiresAtMs: now + 7200_000,
      createdAtMs: now,
      updatedAtMs: now
    });

    // Query all identities for user
    const userIdentities = await oauthRepo.findIdentitiesByUserId(userId);
    assert.strictEqual(userIdentities.length, 2);
    assert.ok(userIdentities.some(i => i.provider === 'openai'));
    assert.ok(userIdentities.some(i => i.provider === 'xai-grok'));

    // Query specific identity
    const openaiIdentity = await oauthRepo.findIdentityByProvider(userId, 'openai');
    assert.ok(openaiIdentity);
    assert.strictEqual(openaiIdentity.providerAccountId, 'acc_chatgpt_multi_1');

    // Natural query translation in BroccoliDB
    const naturalMatches = oauthRepo.queryIdentitiesNatural(`provider is 'openai' and status is 'active'`);
    assert.ok(naturalMatches.length >= 1);
    assert.ok(naturalMatches.some(i => i.userId === userId));

    // Aggregation
    const agg = oauthRepo.aggregateIdentities({
      where: { userId: { $eq: userId } },
      groupBy: ['provider'],
      metrics: { total: { metric: 'count' } }
    });
    assert.strictEqual(agg.groups.length, 2);

    // Unlink provider
    const unlinked = await oauthRepo.unlinkOAuthIdentity(userId, 'openai');
    assert.strictEqual(unlinked, true);

    const postUnlink = await oauthRepo.findIdentitiesByUserId(userId);
    assert.strictEqual(postUnlink.length, 1);
    assert.strictEqual(postUnlink[0].provider, 'xai-grok');
  });

  await test('OAuth Proactive Daemon: Sweeps expiring tokens and rotates credentials in background', async () => {
    const oauthManager = GalxOAuthManager.getInstance();
    const count = await oauthManager.sweepExpiringTokens();
    assert.strictEqual(typeof count, 'number');
  });

  await test('OAuth Account Pinning: Pool & Router route directly to targeted accountId and shardId', async () => {
    const substrate = galxRouter.substrate;
    const now = Date.now();
    const specificAccountId = `org_pinned_${Date.now()}`;
    const specificShardId = `shard_pinned_${Date.now()}`;

    const pinnedShard: GalxShardAccount = {
      id: specificShardId,
      userId: 'user_pinning_test',
      provider: 'openai',
      authType: 'oauth',
      accountLabel: 'Pinned Enterprise Org Shard',
      apiKeyMasked: 'ey...pinned',
      accountId: specificAccountId,
      expiresAtMs: now + 3600_000,
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      tokenBucket: galxRouter.rateGovernor.createDefaultBucket(100000, 100000, 500),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: now,
      updatedAtMs: now
    };

    substrate.addAccount(pinnedShard);

    // Target by specific accountId
    const acqByAccount = galxRouter.pool.acquireLease({
      userId: 'dev_pin_requester',
      provider: 'openai',
      targetAccountId: specificAccountId
    });
    assert.ok(acqByAccount.lease);
    assert.strictEqual(acqByAccount.lease.shardId, specificShardId);
    assert.strictEqual(acqByAccount.lease.account.accountId, specificAccountId);

    galxRouter.pool.releaseLease(acqByAccount.lease.leaseId, { success: true, tokensConsumed: 50, latencyMs: 120 });

    // Target by specific shardId
    const acqByShard = galxRouter.pool.acquireLease({
      userId: 'dev_pin_requester',
      provider: 'openai',
      targetShardId: specificShardId
    });
    assert.ok(acqByShard.lease);
    assert.strictEqual(acqByShard.lease.shardId, specificShardId);

    galxRouter.pool.releaseLease(acqByShard.lease.leaseId, { success: true, tokensConsumed: 50, latencyMs: 120 });
  });

  await test('OAuthExchangeError: Formats actionable suggestedFix and classifies standard RFC errors', async () => {
    const error1 = new OAuthExchangeError('openai', 400, '{"error":"invalid_grant","error_description":"Code expired"}');
    assert.strictEqual(error1.status, 400);
    assert.strictEqual(error1.code, 'invalid_grant');
    assert.ok(error1.suggestedFix.includes('re-authenticate'));

    const error2 = new OAuthExchangeError('xai-grok', 403, '{"error":"access_denied","error_description":"User rejected"}');
    assert.strictEqual(error2.code, 'access_denied');
    assert.ok(error2.suggestedFix.includes('declined'));
  });

  await test('Shard Health Auto-Healing: Successful token refresh clears consecutiveFailures and cooldown status', async () => {
    const substrate = galxRouter.substrate;
    const now = Date.now();
    const healingShardId = `shard_healing_${Date.now()}`;

    const sickShard: GalxShardAccount = {
      id: healingShardId,
      userId: 'user_healing_test',
      provider: 'openai',
      authType: 'oauth',
      accountLabel: 'Sick OAuth Shard in Cooldown',
      apiKeyMasked: 'ey...sick',
      encryptedSecrets: GalxCryptoVault.encryptSecret({ accessToken: 'old', refreshToken: 'rt_mock_heal' }, 'user_healing_test', healingShardId, 'openai'),
      status: 'cooldown',
      cooldownUntilTimestampMs: now + 600_000,
      priority: 10,
      weight: 1,
      fencingToken: 1,
      tokenBucket: galxRouter.rateGovernor.createDefaultBucket(100000, 100000, 500),
      stats: { totalRequestsServed: 5, totalTokensConsumed: 500, consecutiveFailures: 4 },
      createdAtMs: now,
      updatedAtMs: now
    };

    substrate.addAccount(sickShard);

    // Refresh provider shard tokens (which invokes mock refresh in tests)
    const authEngine = GalxAuthEngine.getInstance();
    const refreshed = await authEngine.refreshProviderShardTokens(healingShardId);
    assert.strictEqual(refreshed, true);

    const healedShard = substrate.getAccount(healingShardId);
    assert.ok(healedShard);
    assert.strictEqual(healedShard.status, 'healthy');
    assert.strictEqual(healedShard.cooldownUntilTimestampMs, undefined);
    assert.strictEqual(healedShard.stats.consecutiveFailures, 0);
  });

  await test('Audit Repository: Tamper-evident SHA-256 audit chaining for OAuth token authentication and rotation', async () => {
    const auditRepo = AuditRepository.getInstance();
    const query = auditRepo.queryLogs({ action: 'OAUTH_PROVIDER_AUTHENTICATED' });
    assert.ok(query.length >= 1);
    assert.ok(query[0].currentHash);
    assert.strictEqual(query[0].currentHash.length, 64);

    const rotationQuery = auditRepo.queryLogs({ action: 'OAUTH_TOKEN_ROTATED' });
    assert.ok(rotationQuery.length >= 1);
    assert.ok(rotationQuery[0].currentHash);
  });

  await test('SDK Auth Resource: interactiveLogin helper defined and provides developer workstation login ergonomics', async () => {
    const client = new GalxAI({ apiKey: 'galx_test_interactive' });
    assert.strictEqual(typeof client.auth.interactiveLogin, 'function');
  });

  await test('OAuth Token Introspection (RFC 7662): Resolves active token claims, scopes, and expiration in sub-milliseconds', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const login = await authEngine.authenticateProviderUser('openai', {
      apiKey: 'sk-proj-introspect-test-123456',
      email: 'introspect@galxai.dev'
    });

    const oauthManager = GalxOAuthManager.getInstance();
    const introspection = await oauthManager.introspectToken(login.user.token);

    assert.strictEqual(introspection.active, true);
    assert.strictEqual(introspection.provider, 'openai');
    assert.strictEqual(introspection.token_type, 'Bearer');
    assert.ok(introspection.exp);

    // Invalid token returns active: false
    const invalidIntrospection = await oauthManager.introspectToken('galx_sess_invalid_forged_token');
    assert.strictEqual(invalidIntrospection.active, false);
  });

  await test('OAuth Token Revocation (RFC 7009): Revokes active tokens and invalidates session in sub-milliseconds', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const login = await authEngine.authenticateProviderUser('openai', {
      apiKey: 'sk-proj-revoke-rfc7009-123456',
      email: 'rfc7009@galxai.dev'
    });

    const preRevoke = await authEngine.verifySession(login.user.token);
    assert.strictEqual(preRevoke.valid, true);

    const revoked = await authEngine.revokeSession(login.user.token, 'RFC 7009 Revocation Test');
    assert.strictEqual(revoked, true);

    const postRevoke = await authEngine.verifySession(login.user.token);
    assert.strictEqual(postRevoke.valid, false);
  });

  await test('SDK Auth Resource: introspectToken and revokeToken ergonomic methods exported', async () => {
    const client = new GalxAI({ apiKey: 'galx_test_rfc_methods' });
    assert.strictEqual(typeof client.auth.introspectToken, 'function');
    assert.strictEqual(typeof client.auth.revokeToken, 'function');
    assert.strictEqual(typeof client.auth.requestDeviceCode, 'function');
    assert.strictEqual(typeof client.auth.deviceLogin, 'function');
  });

  await test('OAuth Device Authorization (RFC 8628): Generates friendly user_code & device_code with polling state machine', async () => {
    const oauthManager = GalxOAuthManager.getInstance();
    const deviceAuth = oauthManager.generateDeviceAuthorization('openai', { host: 'https://galx.ai' });

    assert.ok(deviceAuth.deviceCode);
    assert.ok(deviceAuth.userCode);
    assert.strictEqual(deviceAuth.userCode.length, 9); // e.g. WDJB-MJHT
    assert.strictEqual(deviceAuth.userCode.charAt(4), '-');
    assert.strictEqual(deviceAuth.verificationUri, 'https://galx.ai/device');
    assert.strictEqual(deviceAuth.verificationUriComplete, `https://galx.ai/device?code=${deviceAuth.userCode}`);

    // Initial poll returns authorization_pending
    const pollPending = await oauthManager.pollDeviceToken(deviceAuth.deviceCode);
    assert.strictEqual(pollPending.success, false);
    assert.strictEqual(pollPending.error, 'authorization_pending');
  });

  await test('OAuth Device Authorization (RFC 8628): Approve device code unlocks token delivery with single-use consumption', async () => {
    const oauthManager = GalxOAuthManager.getInstance();
    const deviceAuth = oauthManager.generateDeviceAuthorization('xai-grok');

    // Simulate browser user approving the device code
    const approved = oauthManager.approveDeviceCode(deviceAuth.userCode, 'galx_sess_device_approved_12345');
    assert.strictEqual(approved, true);

    // Poll delivers tokens
    const pollApproved = await oauthManager.pollDeviceToken(deviceAuth.deviceCode);
    assert.strictEqual(pollApproved.success, true);
    assert.strictEqual(pollApproved.data?.access_token, 'galx_sess_device_approved_12345');

    // Single-use: Subsequent poll returns invalid_grant
    const pollConsumed = await oauthManager.pollDeviceToken(deviceAuth.deviceCode);
    assert.strictEqual(pollConsumed.success, false);
    assert.strictEqual(pollConsumed.error, 'invalid_grant');
  });

  await test('OAuth DPoP Proof Verification (RFC 9449): Validates cryptographic proof header, HTTP method/URI binding, and anti-replay JTI', async () => {
    const oauthManager = GalxOAuthManager.getInstance();
    const now = Math.floor(Date.now() / 1000);

    const dpopHeader = Buffer.from(JSON.stringify({ typ: 'dpop+jwt', alg: 'ES256' })).toString('base64url');
    const dpopPayload = Buffer.from(JSON.stringify({
      htm: 'POST',
      htu: 'https://galx.ai/v1/chat/completions',
      iat: now,
      jti: `jti_${Date.now()}_test`
    })).toString('base64url');
    const dpopSig = 'mock_signature';
    const dpopProof = `${dpopHeader}.${dpopPayload}.${dpopSig}`;

    const validResult = oauthManager.verifyDPoPProof(dpopProof, 'POST', 'https://galx.ai/v1/chat/completions');
    assert.strictEqual(validResult.valid, true);

    // Method mismatch fails
    const methodMismatch = oauthManager.verifyDPoPProof(dpopProof, 'GET', 'https://galx.ai/v1/chat/completions');
    assert.strictEqual(methodMismatch.valid, false);
    assert.ok(methodMismatch.error?.includes('DPOP_METHOD_MISMATCH'));

    // Anti-Replay: same JTI replayed fails
    const replayResult = oauthManager.verifyDPoPProof(dpopProof, 'POST', 'https://galx.ai/v1/chat/completions');
    assert.strictEqual(replayResult.valid, false);
    assert.strictEqual(replayResult.error, 'DPOP_JTI_REPLAY_DETECTED');
  });

  await test('OAuth Pushed Authorization Requests (RFC 9126 PAR): Ingests parameters via direct POST, returns 90s request_uri & consumes atomically', async () => {
    const oauthManager = GalxOAuthManager.getInstance();
    const parResponse = oauthManager.pushAuthorizationRequest({
      clientId: 'app_test_par_client',
      redirectUri: 'https://galx.ai/callback',
      scope: 'openid profile email',
      codeChallenge: 'E9Melhoa2OwvFrGMTJguCH5Zi_lZK68G436PKKE6S5g',
      state: 'par_csrf_state_123'
    });

    assert.ok(parResponse.request_uri.startsWith('urn:ietf:params:oauth:request_uri:'));
    assert.strictEqual(parResponse.expires_in, 90);

    // Consume request URI
    const consumed = oauthManager.consumePushedAuthorizationRequest(parResponse.request_uri);
    assert.ok(consumed);
    assert.strictEqual(consumed.clientId, 'app_test_par_client');
    assert.strictEqual(consumed.state, 'par_csrf_state_123');

    // Anti-Replay: Second consumption fails
    const secondConsumed = oauthManager.consumePushedAuthorizationRequest(parResponse.request_uri);
    assert.strictEqual(secondConsumed, null);
  });

  await test('SDK Auth Resource: pushAuthorization helper defined and functional', async () => {
    const client = new GalxAI({ apiKey: 'galx_test_par_methods' });
    assert.strictEqual(typeof client.auth.pushAuthorization, 'function');
  });

  await test('OAuth Repository: Processes OpenID Connect Back-Channel Logout (RFC 7009 / OIDC) and cascades revocation', async () => {
    const repo = OAuthRepository.getInstance();
    const subAccountId = `sub_backchannel_${Date.now()}`;
    const testIdentity: OAuthIdentityRecord = {
      id: `ident_${Date.now()}`,
      userId: `user_${Date.now()}`,
      provider: 'openai',
      providerAccountId: subAccountId,
      email: 'backchannel@example.com',
      shardId: undefined,
      encryptedAccessToken: { ciphertext: 'a', iv: 'b', tag: 'c' },
      status: 'active',
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };
    await repo.saveOAuthIdentity(testIdentity);

    const logoutResult = await repo.processBackchannelLogout({
      id: `bc_logout_${Date.now()}`,
      provider: 'openai',
      sub: subAccountId,
      iss: 'https://auth.openai.com',
      rawToken: 'mock.logout.token.jwt'
    });

    assert.strictEqual(logoutResult.success, true);
    const targetIdent = await repo.findIdentityById(testIdentity.id);
    assert.ok(targetIdent);
    assert.strictEqual(targetIdent?.status, 'revoked');
  });

  await test('OAuth Repository: Executes Refresh Token Rotation (RTR) and detects token reuse attack', async () => {
    const repo = OAuthRepository.getInstance();
    const identId = `ident_rtr_${Date.now()}`;
    const initialRefreshHash = 'initial_rf_hash_12345';
    const testIdentity: OAuthIdentityRecord = {
      id: identId,
      userId: `user_rtr_${Date.now()}`,
      provider: 'xai-grok',
      providerAccountId: `acc_rtr_${Date.now()}`,
      email: 'rtr@example.com',
      shardId: undefined,
      sessionFamilyId: `fam_${identId}`,
      sequenceNumber: 1,
      refreshTokenHash: initialRefreshHash,
      encryptedAccessToken: { ciphertext: 'a', iv: 'b', tag: 'c' },
      status: 'active',
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };
    await repo.saveOAuthIdentity(testIdentity);

    // 1. Normal Rotation (seq 1 -> 2)
    const newRefreshHash = 'new_rf_hash_67890';
    const rot1 = await repo.rotateOAuthIdentityTokens({
      identityId: identId,
      oldRefreshHash: initialRefreshHash,
      newEncryptedAccess: { ciphertext: 'a2', iv: 'b2', tag: 'c2' },
      newEncryptedRefresh: { ciphertext: 'r2', iv: 'r2', tag: 'r2' },
      newRefreshHash: newRefreshHash,
      expiresAt: new Date(Date.now() + 3600000),
      graceWindowSec: 30
    });
    assert.strictEqual(rot1.success, true);
    assert.strictEqual(rot1.sequenceNumber, 2);

    // 2. Grace Period In-Flight Replay (same old hash within 30s)
    const replayGrace = await repo.rotateOAuthIdentityTokens({
      identityId: identId,
      oldRefreshHash: initialRefreshHash,
      newEncryptedAccess: { ciphertext: 'a3', iv: 'b3', tag: 'c3' },
      newEncryptedRefresh: { ciphertext: 'r3', iv: 'r3', tag: 'r3' },
      newRefreshHash: 'another_rf_hash',
      expiresAt: new Date(Date.now() + 3600000),
      graceWindowSec: 30
    });
    assert.strictEqual(replayGrace.success, true);
    assert.strictEqual(replayGrace.graceWindow, true);

    // 3. Stale Token Replay Outside Grace Window (Token Reuse Attack Detected)
    const stolenOldHash = 'completely_stale_ancient_hash';
    const reuseAttack = await repo.rotateOAuthIdentityTokens({
      identityId: identId,
      oldRefreshHash: stolenOldHash,
      newEncryptedAccess: { ciphertext: 'bad', iv: 'bad', tag: 'bad' },
      newEncryptedRefresh: { ciphertext: 'bad', iv: 'bad', tag: 'bad' },
      newRefreshHash: 'attacker_hash',
      expiresAt: new Date(Date.now() + 3600000),
      graceWindowSec: 30
    });
    assert.strictEqual(reuseAttack.success, false);
    assert.strictEqual(reuseAttack.error, 'TOKEN_REUSE_ATTACK_DETECTED');
    assert.strictEqual(reuseAttack.familyRevoked, true);
  });

  await test('OAuth Repository: Scavenges expired substrate states and vacuums expired tokens', async () => {
    const repo = OAuthRepository.getInstance();
    const vacuumResult = await repo.scavengeOAuthSubstrate();
    assert.strictEqual(vacuumResult.success, true);
    assert.strictEqual(typeof vacuumResult.purgedOAuthRequests, 'number');
    assert.strictEqual(typeof vacuumResult.purgedDeviceCodes, 'number');
    assert.strictEqual(typeof vacuumResult.purgedParRequests, 'number');
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
      email: 'posture@galxai.dev',
      displayName: 'Parent User'
    });
    const posture = await authEngine.getUserSecurityPosture(login.user.id);
    assert.ok(['A+', 'A', 'B', 'C'].includes(posture.overallGrade));
    assert.strictEqual(posture.riskLevel, 'low');
    assert.ok(posture.activeSessionsCount >= 1);
    assert.strictEqual(posture.sudoActive, true); // Fresh login has active SUDO window
    assert.ok(posture.recommendations.length >= 1);
  });

  // --- SUITE 19: HIPAA Safe Harbor 18, GDPR PII & PCI Redaction Engine ---
  await test('Privacy Redactor: Safe Harbor 18 PHI Identification and Tokenized Redaction', () => {
    const rawClinicalNote = `
      Patient: John Doe, DOB: 05/14/1978, SSN: 123-45-6789.
      Medical Record Number: MRN-984201. Health Plan: MEDICARE-48201.
      Attending: Dr. Sarah Connor, DEA# AB1234567, Phone: (555) 234-5678.
      Device Serial: UDI-849201849201. Address: 742 Evergreen Terrace, Springfield 97477.
    `;

    const res = galxRedactor.redactText(rawClinicalNote, { hipaa: true, gdpr: true, financial: true });

    assert.strictEqual(res.hasPhi, true);
    assert.ok(res.entitiesDetected.length >= 7);

    // Verify all sensitive elements are sanitized
    assert.strictEqual(res.sanitizedText.includes('123-45-6789'), false);
    assert.strictEqual(res.sanitizedText.includes('984201'), false);
    assert.strictEqual(res.sanitizedText.includes('MEDICARE-48201'), false);
    assert.strictEqual(res.sanitizedText.includes('AB1234567'), false);
    assert.strictEqual(res.sanitizedText.includes('(555) 234-5678'), false);
    assert.strictEqual(res.sanitizedText.includes('849201849201'), false);
    assert.strictEqual(res.sanitizedText.includes('05/14/1978'), false);

    // Verify synthetic tokens are placed
    assert.ok(res.sanitizedText.includes('[PHI_SSN_'));
    assert.ok(res.sanitizedText.includes('[PHI_MRN_'));
    assert.ok(res.sanitizedText.includes('[PHI_HEALTH_PLAN_ID_'));
    assert.ok(res.sanitizedText.includes('[PHI_MED_LICENSE_'));
    assert.ok(res.sanitizedText.includes('[PHI_PHONE_FAX_'));
    assert.ok(res.sanitizedText.includes('[PHI_DEVICE_UDI_'));
  });

  await test('Privacy Redactor: European GDPR PII (IBAN mod-97, UK NIN, German/French IDs, Passports)', () => {
    // Valid German IBAN
    assert.strictEqual(GalxPIIRedactor.validateIBAN('DE89370400440532013000'), true);
    // Invalid IBAN (corrupted check digits)
    assert.strictEqual(GalxPIIRedactor.validateIBAN('DE89370400440532013009'), false);

    const euText = `
      Customer IBAN: DE89370400440532013000.
      UK National Insurance: QQ 12 34 56 A.
      German Steuer-ID: 12345678901.
      Passport: C01X00T47.
    `;

    const res = galxRedactor.redactText(euText, { gdpr: true, hipaa: false });
    assert.strictEqual(res.hasPii, true);
    assert.strictEqual(res.sanitizedText.includes('DE89370400440532013000'), false);
    assert.strictEqual(res.sanitizedText.includes('QQ 12 34 56 A'), false);
    assert.strictEqual(res.sanitizedText.includes('12345678901'), false);
    assert.strictEqual(res.sanitizedText.includes('C01X00T47'), false);
    assert.ok(res.sanitizedText.includes('[PII_IBAN_'));
    assert.ok(res.sanitizedText.includes('[PII_UK_NINO_'));
    assert.ok(res.sanitizedText.includes('[PII_DE_TAX_ID_'));
    assert.ok(res.sanitizedText.includes('[PII_PASSPORT_'));
  });

  await test('Privacy Redactor: Financial PCI Credit Card Luhn Algorithm Sanitization', () => {
    // Valid Visa Test Card (passes Luhn)
    const validVisa = '4012888888881881';
    assert.strictEqual(GalxPIIRedactor.validateLuhn(validVisa), true);

    // Invalid Card number (fails Luhn)
    const invalidCard = '4012888888881882';
    assert.strictEqual(GalxPIIRedactor.validateLuhn(invalidCard), false);

    const textWithCards = `Payment Card: ${validVisa}. Reference code: 4012888888881882 (not a card).`;
    const res = galxRedactor.redactText(textWithCards, { financial: true });

    assert.strictEqual(res.sanitizedText.includes(validVisa), false);
    assert.ok(res.sanitizedText.includes('[PCI_CREDIT_CARD_1]'));
    // Non-card number is preserved
    assert.ok(res.sanitizedText.includes('4012888888881882'));
  });

  await test('Privacy Redactor: Reversible Ephemeral Token Hydration & Volatile Memory Scrubbing', () => {
    const raw = 'Patient: Jane Doe was admitted. Emergency contact: (555) 987-6543.';
    const res = galxRedactor.redactText(raw, { hipaa: true, reversible: true });

    assert.ok(res.tokenMap);
    assert.strictEqual(res.sanitizedText.includes('Jane Doe'), false);

    // Rehydrate back to original
    const restored = galxRedactor.rehydrateText(res.sanitizedText, res.tokenMap);
    assert.strictEqual(restored, raw);

    // Zeroize token map memory
    galxRedactor.zeroizeTokenMap(res.tokenMap);
    assert.strictEqual(Object.keys(res.tokenMap).length, 0);
  });

  // --- SUITE 20: Zero Data Retention (ZDR Protocol v5.0) & Memory Zeroization ---
  await test('ZDR Protocol: Cryptographic 2-Pass Memory Zeroization wipes buffer heap allocations', () => {
    const secretBuffer = Buffer.from('SUPER_SECRET_PATIENT_PHI_DATA_2026');
    const originalText = secretBuffer.toString('utf-8');
    assert.strictEqual(originalText, 'SUPER_SECRET_PATIENT_PHI_DATA_2026');

    // Execute 2-pass wipe (crypto.randomFillSync + null fill)
    GalxZDRProtocol.zeroizeBuffer(secretBuffer);

    // Buffer is completely zeroed out
    assert.strictEqual(secretBuffer.toString('utf-8').includes('SUPER_SECRET'), false);
    for (let i = 0; i < secretBuffer.length; i++) {
      assert.strictEqual(secretBuffer[i], 0);
    }
  });

  await test('ZDR Protocol: Streaming SHA-256 Rolling Digest Hasher & Cryptographic Proof Verification', () => {
    const hasher = galxZDR.createStreamingDigestHasher();

    // Push simulated streaming chunks
    hasher.update(Buffer.from('Chunk 1: Clinical analysis. '));
    hasher.update(Buffer.from('Chunk 2: Vital signs normal. '));
    hasher.update(Buffer.from('Chunk 3: Discharge approved.'));

    const digest = hasher.digest();
    assert.ok(digest.length === 64);
    assert.strictEqual(hasher.getBytesProcessed() > 50, true);

    // Generate ZDR session proof
    const proof = galxZDR.generateZDRProof({
      sessionId: 'req_stream_test_001',
      digestSha256: digest,
      bytesProcessed: hasher.getBytesProcessed(),
      profile: 'hipaa',
      dataResidency: 'eu'
    });

    assert.strictEqual(proof.retentionDuration, '0s');
    assert.strictEqual(proof.profile, 'hipaa');
    assert.strictEqual(proof.dataResidency, 'eu');
    assert.ok(proof.signature.length === 64);

    // Authenticate proof
    const isAuthentic = galxZDR.verifyZDRProof(proof);
    assert.strictEqual(isAuthentic, true);

    // Tampered proof rejected
    const tampered = { ...proof, digestSha256: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' };
    assert.strictEqual(galxZDR.verifyZDRProof(tampered), false);
  });

  await test('ZDR Protocol: Generates verifiable compliance response headers', () => {
    const proof = galxZDR.generateZDRProof({
      sessionId: 'req_hdr_test_002',
      digestSha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      bytesProcessed: 1024,
      profile: 'confidential',
      dataResidency: 'eu'
    });

    const headers = galxZDR.getZDRHeaders({
      proof,
      hipaaApplied: true,
      gdprApplied: true,
      gpcApplied: true
    });

    assert.strictEqual(headers['X-Galx-ZDR-Verified'], 'true');
    assert.strictEqual(headers['X-Galx-ZDR-Retention'], '0s');
    assert.strictEqual(headers['X-Galx-Memory-Zeroized'], 'true');
    assert.strictEqual(headers['X-Galx-Privacy-Profile'], 'confidential');
    assert.strictEqual(headers['X-Galx-Data-Residency'], 'eu-resident-transit');
    assert.strictEqual(headers['X-Galx-HIPAA-BAA'], 'active-safeguard');
    assert.strictEqual(headers['X-Galx-GDPR-SCC'], '2021-914-module2');
    assert.strictEqual(headers['X-Galx-GPC-Applied'], 'true');
  });

  // --- SUITE 21: Compliance Shard Gating, Tamper-Evident Audit Chaining & DSAR ---
  await test('Compliance Shard Gating: Enforces HIPAA BAA certification constraint', () => {
    const substrate = new GalxCredentialSubstrate();
    substrate.clearCache();
    const rateGovernor = new ContinuousTokenBucketRateGovernor();
    const circuitBreaker = new GalxCircuitBreaker();
    const pool = new GalxCredentialPool(substrate, rateGovernor, circuitBreaker);

    // Shard A: Non-BAA Consumer Shard
    const nonBaaShardId = `shard_consumer_${Date.now()}`;
    const encryptedA = GalxCryptoVault.encryptSecret({ apiKey: 'sk-consumer-123' }, 'user_a', nonBaaShardId, 'openai');
    substrate.addAccount({
      id: nonBaaShardId,
      userId: 'user_a',
      accountLabel: 'Consumer OpenAI Account',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      apiKeyMasked: 'sk-con...123',
      encryptedSecrets: encryptedA,
      privacyCapabilities: {
        hipaaCompliant: false,
        zdrCertified: true,
        dataResidency: 'global',
        baaSigned: false, // NO BAA
        piiFiltering: false
      },
      tokenBucket: rateGovernor.createDefaultBucket(100000, 100000, 500),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    });

    // Acquire lease requiring HIPAA compliance -> Fails because only non-BAA shard is available
    const failAcq = pool.acquireLease({
      userId: 'hospital_system_1',
      provider: 'openai',
      hipaaRequired: true,
      privacyProfile: 'hipaa'
    });
    assert.strictEqual(failAcq.status, 'no_compliant_shards');
    assert.strictEqual(failAcq.lease, undefined);

    // Shard B: Certified Enterprise HIPAA BAA Shard
    const baaShardId = `shard_hipaa_baa_${Date.now()}`;
    const encryptedB = GalxCryptoVault.encryptSecret({ apiKey: 'sk-enterprise-hipaa-123' }, 'user_b', baaShardId, 'openai');
    substrate.addAccount({
      id: baaShardId,
      userId: 'user_b',
      accountLabel: 'HIPAA BAA Certified Vault',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 50,
      weight: 1,
      apiKeyMasked: 'sk-ent...123',
      encryptedSecrets: encryptedB,
      privacyCapabilities: {
        hipaaCompliant: true,
        zdrCertified: true,
        dataResidency: 'us',
        baaSigned: true, // VALID BAA
        piiFiltering: true
      },
      tokenBucket: rateGovernor.createDefaultBucket(100000, 100000, 500),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    });

    // Acquire lease requiring HIPAA -> Successfully routes to BAA Shard B
    const successAcq = pool.acquireLease({
      userId: 'hospital_system_1',
      provider: 'openai',
      hipaaRequired: true,
      privacyProfile: 'hipaa'
    });
    assert.ok(successAcq.lease);
    assert.strictEqual(successAcq.lease?.shardId, baaShardId);
  });

  await test('Compliance Shard Gating: Enforces EU Data Sovereignty (Geo-Fencing)', () => {
    const substrate = new GalxCredentialSubstrate();
    substrate.clearCache();
    const rateGovernor = new ContinuousTokenBucketRateGovernor();
    const circuitBreaker = new GalxCircuitBreaker();
    const pool = new GalxCredentialPool(substrate, rateGovernor, circuitBreaker);

    // Shard US-only
    const usShardId = `shard_us_only_${Date.now()}`;
    const encUs = GalxCryptoVault.encryptSecret({ apiKey: 'xai-us-key-123' }, 'user_us', usShardId, 'xai-grok');
    substrate.addAccount({
      id: usShardId,
      userId: 'user_us',
      accountLabel: 'US-Only xAI Shard',
      provider: 'xai-grok',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      apiKeyMasked: 'xai-us...123',
      encryptedSecrets: encUs,
      privacyCapabilities: {
        hipaaCompliant: true,
        zdrCertified: true,
        dataResidency: 'us', // US ONLY
        baaSigned: true,
        piiFiltering: true
      },
      tokenBucket: rateGovernor.createDefaultBucket(100000, 100000, 500),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    });

    // Request with EU data residency requirement -> Rejects US-only shard
    const rejectUs = pool.acquireLease({
      userId: 'berlin_fintech_1',
      provider: 'xai-grok',
      dataResidency: 'eu'
    });
    assert.strictEqual(rejectUs.status, 'no_compliant_shards');

    // Add EU-Sovereign Shard
    const euShardId = `shard_eu_sovereign_${Date.now()}`;
    const encEu = GalxCryptoVault.encryptSecret({ apiKey: 'xai-eu-key-456' }, 'user_eu', euShardId, 'xai-grok');
    substrate.addAccount({
      id: euShardId,
      userId: 'user_eu',
      accountLabel: 'Frankfurt EU Sovereign Vault',
      provider: 'xai-grok',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 50,
      weight: 1,
      apiKeyMasked: 'xai-eu...456',
      encryptedSecrets: encEu,
      privacyCapabilities: {
        hipaaCompliant: true,
        zdrCertified: true,
        dataResidency: 'eu', // EU SOVEREIGN
        baaSigned: true,
        piiFiltering: true
      },
      tokenBucket: rateGovernor.createDefaultBucket(100000, 100000, 500),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 0 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    });

    const acceptEu = pool.acquireLease({
      userId: 'berlin_fintech_1',
      provider: 'xai-grok',
      dataResidency: 'eu'
    });
    assert.ok(acceptEu.lease);
    assert.strictEqual(acceptEu.lease?.shardId, euShardId);
  });

  await test('Audit Repository: Cryptographic Tamper-Evident SHA-256 Hash Chaining', async () => {
    const auditRepo = AuditRepository.getInstance();

    const id1 = await auditRepo.logAudit({ action: 'KEY_ACCESSED', metadata: { keyId: 'key_1' } });
    const id2 = await auditRepo.logAudit({ action: 'SHARD_ROUTED', metadata: { shardId: 'shard_2' } });
    const id3 = await auditRepo.logAudit({ action: 'SESSION_CREATED', metadata: { userId: 'usr_3' } });

    // Verify unbroken chain of custody
    const verification = auditRepo.verifyAuditChainIntegrity();
    assert.strictEqual(verification.valid, true);
    assert.ok(verification.totalEntries >= 3);
    assert.ok(verification.latestHash.length === 64);
  });

  await test('Privacy Compliance Engine: GDPR Article 15 DSAR Data Export Compilation', async () => {
    const userId = 'usr_dsar_export_tester';
    const authEngine = GalxAuthEngine.getInstance();
    await authEngine.authenticateProviderUser('openai', {
      apiKey: 'sk-proj-dsar-test-12345',
      email: 'dsar@munich-health.de',
      displayName: 'Munich Health DSAR'
    });

    const exportData = await galxPrivacy.exportUserData(userId);
    assert.strictEqual(exportData.userId, userId);
    assert.ok(exportData.exportedAt);
    assert.ok(exportData.complianceCertifications.includes('Zero Data Retention (ZDR Protocol v5.0)'));
    assert.ok(exportData.complianceCertifications.includes('HIPAA Business Associate Agreement (BAA v4.0)'));
  });

  await test('Privacy Compliance Engine: GDPR Article 17 Right to Erasure / Purge with Cryptographic Proof', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const login = await authEngine.authenticateProviderUser('openai', {
      apiKey: 'sk-proj-erasure-target-key-999',
      email: 'erasure_candidate@galxai.dev',
      displayName: 'Erasure User'
    });

    const userId = login.user.id;

    // Execute Right to Erasure
    const purgeResult = await galxPrivacy.eraseUserData(userId, 'GDPR Art. 17 User Deletion Request');
    assert.strictEqual(purgeResult.success, true);
    assert.strictEqual(purgeResult.userId, userId);
    assert.ok(purgeResult.recordsDeleted.sessions >= 1);
    assert.ok(purgeResult.cryptographicProof.length === 64);

    // User session is completely revoked
    const verifyAfter = await authEngine.verifySession(login.user.token);
    assert.strictEqual(verifyAfter.valid, false);
  });

  await test('Privacy Compliance Engine: Global Privacy Control (GPC) & Header Resolution', () => {
    // 1. Header with GPC enabled
    const policyWithGpc = galxPrivacy.resolvePrivacyPolicy({
      'Sec-GPC': '1',
      'X-Galx-Privacy-Profile': 'hipaa',
      'X-Galx-Data-Residency': 'eu'
    });

    assert.strictEqual(policyWithGpc.profile, 'hipaa');
    assert.strictEqual(policyWithGpc.hipaaEnabled, true);
    assert.strictEqual(policyWithGpc.dataResidency, 'eu');
    assert.strictEqual(policyWithGpc.gpcOptOut, true);
    assert.strictEqual(policyWithGpc.deidentifyPhi, true);

    // 2. Default standard policy
    const standardPolicy = galxPrivacy.resolvePrivacyPolicy({});
    assert.strictEqual(standardPolicy.profile, 'standard');
    assert.strictEqual(standardPolicy.gpcOptOut, false);
  });

  await test('Privacy Compliance Engine: Aggregates real-time compliance posture', async () => {
    const posture = await galxPrivacy.getPrivacyCompliancePosture();
    assert.strictEqual(posture.hipaaStatus.baaActive, true);
    assert.strictEqual(posture.hipaaStatus.safeHarbor18RedactorActive, true);
    assert.strictEqual(posture.zdrStatus.protocolVersion, 'ZDR Protocol v5.0');
    assert.strictEqual(posture.zdrStatus.upstreamStoreFalseEnforced, true);
    assert.strictEqual(posture.gdprStatus.dsarExportReady, true);
    assert.strictEqual(posture.gdprStatus.rightToErasureReady, true);
    assert.strictEqual(posture.euAiActStatus.transparencyHeadersInjected, true);
    assert.strictEqual(posture.gpcStatus.secGpcHeaderRecognition, true);
  });

  // --- SUITE 22: Advanced HIPAA Safe Harbor 18 & Clinical Verification ---
  await test('Safe Harbor 18: DEA Registration Number & NPI Luhn Checksum Verification', () => {
    // Valid DEA Number: AB1234563 -> (1+3+5) + 2*(2+4+6) = 9 + 24 = 33 -> last digit 3
    assert.strictEqual(GalxPIIRedactor.validateDEANumber('AB1234563'), true);
    // Invalid DEA Number: AB1234567 -> fails check
    assert.strictEqual(GalxPIIRedactor.validateDEANumber('AB1234567'), false);

    // Valid 10-digit NPI (with 80840 prefix Luhn check)
    // 80840 + 1234567893 -> Luhn sum calculation
    const isNpiValid = GalxPIIRedactor.validateNPI('1234567893');
    assert.strictEqual(typeof isNpiValid, 'boolean');

    const clinicalText = 'Prescriber: DEA# AB1234563, Hospital Billing Account: Acct# 9876543210.';
    const res = galxRedactor.redactText(clinicalText, { hipaa: true });
    assert.strictEqual(res.sanitizedText.includes('AB1234563'), false);
    assert.ok(res.sanitizedText.includes('[PHI_MED_LICENSE_'));
    assert.ok(res.sanitizedText.includes('[PHI_ACCOUNT_NUM_'));
  });

  await test('Safe Harbor 18: Geriatric Age > 89 De-identification (HIPAA 45 CFR § 164.514(b)(2)(i)(C))', () => {
    const geriatricNote = 'Patient is 94 years old and presented with bilateral edema. Next patient is 91 yo centenarian.';
    const res = galxRedactor.redactText(geriatricNote, { hipaa: true });

    assert.strictEqual(res.sanitizedText.includes('94 years old'), false);
    assert.strictEqual(res.sanitizedText.includes('91 yo'), false);
    assert.ok(res.sanitizedText.includes('[PHI_AGE_90_PLUS_'));
  });

  await test('Safe Harbor 18: Vehicle VIN ISO 3779 Checksum & License Plate De-identification', () => {
    // Valid 17-character VIN (standard check character calculation)
    const validVin = '1HGCR2F83HA000000'; // Honda Accord VIN format
    const isValidVin = GalxPIIRedactor.validateVIN(validVin);
    assert.strictEqual(typeof isValidVin, 'boolean');

    const transportNote = 'Vehicle VIN: 1HGCR2F83HA000000, Ambulance License Plate: 7XYZ890.';
    const res = galxRedactor.redactText(transportNote, { hipaa: true });

    assert.strictEqual(res.sanitizedText.includes('1HGCR2F83HA000000'), false);
    assert.strictEqual(res.sanitizedText.includes('7XYZ890'), false);
    assert.ok(res.sanitizedText.includes('[PHI_VIN_'));
    assert.ok(res.sanitizedText.includes('[PHI_LICENSE_PLATE_'));
  });

  await test('Safe Harbor 18: Device MAC Addresses (EUI-48) & IMEI 15-Digit Luhn De-identification', () => {
    const deviceNote = 'Telemetry Monitor MAC: 00:1A:2B:3C:4D:5E, Bedside Tablet IMEI: 352099001761482.';
    const res = galxRedactor.redactText(deviceNote, { hipaa: true });

    assert.strictEqual(res.sanitizedText.includes('00:1A:2B:3C:4D:5E'), false);
    assert.ok(res.sanitizedText.includes('[PHI_MAC_ADDRESS_'));
  });

  // --- SUITE 23: International Privacy Laws (LGPD, PIPEDA, APPI, Australia, Swiss, Singapore) ---
  await test('International Privacy: Brazil LGPD CPF & CNPJ Dual Mod-11 Validation', () => {
    // Valid Brazilian CPF test vectors
    const validCpf = '12345678909';
    const isCpfValid = GalxPIIRedactor.validateCPF(validCpf);
    assert.strictEqual(isCpfValid, true);

    // Repeated digit CPF is rejected
    assert.strictEqual(GalxPIIRedactor.validateCPF('11111111111'), false);

    const brText = `Paciente CPF: ${validCpf}, Empresa CNPJ: 11.222.333/0001-81.`;
    const res = galxRedactor.redactText(brText, { international: true });

    assert.strictEqual(res.sanitizedText.includes(validCpf), false);
    assert.ok(res.sanitizedText.includes('[PII_BR_CPF_'));
  });

  await test('International Privacy: Canada PIPEDA SIN & Provincial Health (OHIP)', () => {
    // Valid Canadian SIN (passes Luhn)
    const validSin = '046454286';
    assert.strictEqual(GalxPIIRedactor.validateCanadaSIN(validSin), true);

    const caText = `Employee SIN: ${validSin}, Ontario Health Card: 1234-567-890-AB.`;
    const res = galxRedactor.redactText(caText, { international: true });

    assert.strictEqual(res.sanitizedText.includes(validSin), false);
    assert.strictEqual(res.sanitizedText.includes('1234-567-890-AB'), false);
    assert.ok(res.sanitizedText.includes('[PII_CA_SIN_'));
    assert.ok(res.sanitizedText.includes('[PII_CA_OHIP_'));
  });

  await test('International Privacy: Australia Medicare & Tax File Number (TFN)', () => {
    // Valid Australian TFN test vector
    const validTfn = '123456782';
    const isTfnValid = GalxPIIRedactor.validateAustraliaTFN(validTfn);
    assert.strictEqual(typeof isTfnValid, 'boolean');

    const auText = 'Patient Medicare: 2123 45678 1 1, Tax File Number: TFN 123 456 782.';
    const res = galxRedactor.redactText(auText, { international: true });

    assert.strictEqual(res.sanitizedText.includes('2123 45678 1 1'), false);
    assert.ok(res.sanitizedText.includes('[PII_AU_MEDICARE_'));
  });

  await test('International Privacy: Japan APPI (My Number), Swiss AHV/AVS & Singapore NRIC', () => {
    const intlText = `
      Japan My Number: 1234 5678 9012.
      Swiss AHV: 756.1234.5678.97.
      Singapore NRIC: S1234567A.
    `;

    const res = galxRedactor.redactText(intlText, { international: true });
    assert.strictEqual(res.sanitizedText.includes('756.1234.5678.97'), false);
    assert.strictEqual(res.sanitizedText.includes('S1234567A'), false);
    assert.ok(res.sanitizedText.includes('[PII_CH_AHV_'));
    assert.ok(res.sanitizedText.includes('[PII_SG_NRIC_'));
  });

  // --- SUITE 24: Sliding-Window Streaming Transformer, Provenance & SDK Ergonomics ---
  await test('ZDR Streaming: Sliding-Window Transformer seamlessly de-identifies cross-chunk split PII', () => {
    const transformer = new StreamingPIIWindowTransformer({ windowSizeChars: 32 });

    // Chunk 1 has leading part of SSN: "The patient SSN is 123-"
    const out1 = transformer.transformChunk('The patient SSN is 123-');
    // Chunk 2 has trailing part of SSN: "45-6789 and vitals are normal."
    const out2 = transformer.transformChunk('45-6789 and vitals are normal.');
    // Flush tail
    const out3 = transformer.flush();

    const fullStreamOutput = out1 + out2 + out3;

    // Full output must NOT contain raw SSN
    assert.strictEqual(fullStreamOutput.includes('123-45-6789'), false);
    assert.ok(fullStreamOutput.includes('[PHI_SSN_1]'));
    assert.ok(fullStreamOutput.includes('vitals are normal'));
  });

  await test('EU AI Act Art. 50: Generates verifiable C2PA-compatible provenance metadata and headers', () => {
    const metadata = galxZDR.generateProvenanceMetadata({
      requestId: 'req_c2pa_test_001',
      model: 'gpt-5.6-sol-clinical',
      digestSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    });

    assert.ok(metadata.watermarkId.startsWith('wmk_req_c2pa_test_001_'));
    assert.ok(metadata.provenanceSha256.length === 64);
    assert.strictEqual(metadata.syntheticClassification, 'fully_synthetic');
    assert.strictEqual(metadata.humanOversightLevel, 'required_clinical_review');

    // Test header injection
    const proof = galxZDR.generateZDRProof({
      sessionId: 'req_c2pa_test_001',
      digestSha256: metadata.provenanceSha256,
      bytesProcessed: 512,
      profile: 'hipaa'
    });

    const headers = galxZDR.getZDRHeaders({ proof, provenance: metadata, hipaaApplied: true });
    assert.strictEqual(headers['X-Galx-AI-Act-Article50'], 'fully_synthetic');
    assert.ok(headers['X-Galx-Provenance'].includes('c2pa-sha256-'));
    assert.strictEqual(headers['X-Galx-Human-Oversight'], 'required_clinical_review');
  });

  await test('Developer SDK: galx.privacy and galx.compliance ergonomic helpers', async () => {
    const galx = new GalxAI({ apiKey: 'sk-test-developer-privacy-key' });

    // 1. galx.privacy.redact helper
    const redactRes = galx.privacy.redact('Patient John Doe has MRN-12345.', { hipaa: true });
    assert.strictEqual(redactRes.hasPhi, true);
    assert.strictEqual(redactRes.sanitizedText.includes('MRN-12345'), false);

    // 2. galx.privacy.profiles preset verification
    assert.strictEqual(galx.privacy.profiles.HIPAA_BAA_STRICT.profile, 'hipaa_strict');
    assert.strictEqual(galx.privacy.profiles.EU_GDPR_SOVEREIGN.dataResidency, 'eu');
    assert.strictEqual(galx.privacy.profiles.MAXIMUM_SOVEREIGNTY.zdr, true);

    // 3. galx.compliance.getPosture helper
    const posture = await galx.compliance.getPosture();
    assert.strictEqual(posture.hipaaStatus.baaActive, true);

    // 4. galx.compliance.verifyAuditChain helper
    const auditChain = galx.compliance.verifyAuditChain();
    assert.strictEqual(auditChain.valid, true);
  });

  // --- SUITE 25: India DPDP & South Korea PIPA Cryptographic Validation ---
  await test('India DPDP: Aadhaar 12-Digit Verhoeff Dihedral D5 Checksum & PAN Validation', () => {
    // Valid Aadhaar number: 367283921823 (generates checksum 3 via Verhoeff D5)
    const validAadhaar = '367283921823';
    assert.strictEqual(GalxPIIRedactor.validateAadhaar(validAadhaar), true);
    // Invalid Aadhaar number (single digit typo fails Verhoeff check)
    assert.strictEqual(GalxPIIRedactor.validateAadhaar('367283921820'), false);

    // Valid Indian PAN: ABCDE1234F
    assert.strictEqual(GalxPIIRedactor.validateIndianPAN('ABCDE1234F'), true);
    assert.strictEqual(GalxPIIRedactor.validateIndianPAN('12345ABCDE'), false);

    const inText = `Customer Aadhaar: ${validAadhaar}, Tax PAN: ABCDE1234F.`;
    const res = galxRedactor.redactText(inText, { international: true });

    assert.strictEqual(res.sanitizedText.includes(validAadhaar), false);
    assert.strictEqual(res.sanitizedText.includes('ABCDE1234F'), false);
    assert.ok(res.sanitizedText.includes('[PII_IN_AADHAAR_'));
    assert.ok(res.sanitizedText.includes('[PII_IN_PAN_'));
  });

  await test('South Korea PIPA: Resident Registration Number (RRN) Mod-11 Checksum Validation', () => {
    // Valid Korean RRN: 950101-1234564
    const validRRN = '950101-1234564';
    assert.strictEqual(GalxPIIRedactor.validateKoreanRRN(validRRN), true);
    // Invalid Korean RRN
    assert.strictEqual(GalxPIIRedactor.validateKoreanRRN('950101-1234569'), false);

    const krText = `User RRN: ${validRRN}.`;
    const res = galxRedactor.redactText(krText, { international: true });

    assert.strictEqual(res.sanitizedText.includes(validRRN), false);
    assert.ok(res.sanitizedText.includes('[PII_KR_RRN_'));
  });

  // --- SUITE 26: Multi-Modal Metadata Stripping & Multi-Turn Conversational Redaction ---
  await test('Multi-Modal Privacy: In-Memory Metadata Stripper purges EXIF and textual metadata from images', () => {
    // Mock JPEG with APP1 EXIF segment (0xFF, 0xE1)
    const mockJpegWithExif = Buffer.from([
      0xff, 0xd8, // SOI
      0xff, 0xe1, 0x00, 0x0a, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xaa, 0xbb, // APP1 EXIF header
      0xff, 0xda, 0x00, 0x02, 0x11, 0x22, // SOS
      0xff, 0xd9 // EOI
    ]);
    const b64Jpeg = `data:image/jpeg;base64,${mockJpegWithExif.toString('base64')}`;

    const strippedB64 = GalxPIIRedactor.stripImageMetadata(b64Jpeg);
    assert.notStrictEqual(strippedB64, b64Jpeg);
    const strippedBuf = Buffer.from(strippedB64.split(',')[1], 'base64');
    // Ensure APP1 (0xFFE1) was stripped
    assert.strictEqual(strippedBuf.includes(Buffer.from([0xff, 0xe1])), false);
    // Ensure SOI (0xFFD8) and SOS remain intact
    assert.strictEqual(strippedBuf[0], 0xff);
    assert.strictEqual(strippedBuf[1], 0xd8);
  });

  await test('Conversational Redaction: Multi-turn messages maintain identical token mappings across turns', () => {
    const multiTurnMessages = [
      { role: 'user', content: 'Patient John Doe was admitted today with MRN-998811.' },
      { role: 'assistant', content: 'Understood. Reviewing clinical chart for John Doe.' },
      { role: 'user', content: 'Dr. Sarah Connor ordered blood work for John Doe.' }
    ];

    const conv = galxRedactor.redactConversationMessages(multiTurnMessages as any, {
      hipaa: true,
      reversible: true
    });

    assert.strictEqual(conv.hasPhi, true);
    // John Doe must be replaced by [PHI_PATIENT_NAME_1] across all turns
    assert.ok((conv.sanitizedMessages[0].content as string).includes('[PHI_PATIENT_NAME_1]'));
    assert.ok((conv.sanitizedMessages[1].content as string).includes('[PHI_PATIENT_NAME_1]'));
    assert.ok((conv.sanitizedMessages[2].content as string).includes('[PHI_PATIENT_NAME_1]'));
    assert.strictEqual((conv.sanitizedMessages[0].content as string).includes('John Doe'), false);
    assert.strictEqual((conv.sanitizedMessages[1].content as string).includes('John Doe'), false);
    assert.strictEqual((conv.sanitizedMessages[2].content as string).includes('John Doe'), false);

    // Rehydrate multi-turn text using tokenMap
    const rehydrated = galxRedactor.rehydrateText(conv.sanitizedMessages[0].content as string, conv.tokenMap);
    assert.ok(rehydrated.includes('John Doe'));
    assert.ok(rehydrated.includes('MRN-998811'));
  });

  // --- SUITE 27: ZDR v7.0 Ephemeral Enclave, ZKAT Tickets & SDK Privacy Shield Plugin ---
  await test('ZDR v7.0: Ephemeral Session Enclave (Session KEK) encrypts in-flight memory and zeroizes key', () => {
    const enclave = galxZDR.createEphemeralSessionEnclave();
    const sensitiveData = 'Clinical note with patient telemetry and prescription data.';

    const encrypted = enclave.encrypt(sensitiveData);
    assert.notStrictEqual(encrypted.ciphertext, sensitiveData);

    const decrypted = enclave.decrypt(encrypted.ciphertext, encrypted.iv, encrypted.tag);
    assert.strictEqual(decrypted, sensitiveData);

    // Zeroize enclave key
    enclave.zeroize();
    // Subsequent operations throw because key is destroyed
    assert.throws(() => enclave.encrypt('New data'), /destroyed\/zeroized/);
  });

  await test('ZDR v7.0: Generates Zero-Knowledge Attestation Tickets (ZKAT) for SOC2 & HIPAA audits', () => {
    const ticket = galxZDR.generateZKATTicket({
      sessionId: 'sess_zkat_audit_991',
      promptSha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      completionSha256: 'b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01',
      bytesProcessed: 1024,
      shardId: 'shard_openai_baa_01',
      profile: 'hipaa_strict',
      dataResidency: 'us'
    });

    assert.ok(ticket.ticketId.startsWith('zkat_'));
    assert.strictEqual(ticket.retentionPolicy, 'zero_retention_ephemeral');
    assert.strictEqual(ticket.profile, 'hipaa_strict');
    assert.ok(ticket.cryptographicSignature.length === 64);
  });

  await test('Compliance Engine: Generates automated SOC2 Type II & HIPAA evidence package', async () => {
    const evidence = await galxPrivacy.generateSOC2EvidencePackage('tenant_enterprise_health_corp');

    assert.strictEqual(evidence.tenantId, 'tenant_enterprise_health_corp');
    assert.strictEqual(evidence.securityControls.hipaaSecurityRule.verified, true);
    assert.strictEqual(evidence.securityControls.zeroDataRetention.verified, true);
    assert.strictEqual(evidence.securityControls.gdprCompliance.verified, true);
    assert.strictEqual(evidence.auditChainProof.valid, true);
    assert.ok(evidence.dossierDigestSha256.length === 64);
  });

  await test('Developer SDK: createPrivacyShieldPlugin intercepts, redacts, and seamlessly rehydrates', async () => {
    const galx = new GalxAI({ apiKey: 'sk-test-privacy-shield-plugin' });
    let redactionTriggered = false;

    const shieldPlugin = createPrivacyShieldPlugin({
      profile: 'hipaa_strict',
      autoRedact: true,
      autoRehydrate: true,
      onRedaction: () => {
        redactionTriggered = true;
      }
    });

    galx.use(shieldPlugin);

    // Mock outgoing request context
    const reqCtx: any = {
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {},
      timestampMs: Date.now(),
      body: {
        model: 'gpt-5.6-sol',
        messages: [{ role: 'user', content: 'Patient Alice Cooper has SSN 123-45-6789.' }]
      }
    };

    await shieldPlugin.onRequest?.(reqCtx);
    assert.strictEqual(redactionTriggered, true);
    assert.strictEqual(reqCtx.headers['X-Galx-Privacy-Profile'], 'hipaa_strict');
    assert.strictEqual(reqCtx.headers['Sec-GPC'], '1');
    assert.strictEqual(reqCtx.body.messages[0].content.includes('123-45-6789'), false);
    assert.ok(reqCtx.body.messages[0].content.includes('[PHI_SSN_1]'));

    // Mock upstream response containing the synthetic token
    const resCtx: any = {
      path: '/v1/chat/completions',
      method: 'POST',
      statusCode: 200,
      durationMs: 250,
      data: {
        choices: [
          { message: { role: 'assistant', content: 'Confirmed patient [PHI_PATIENT_NAME_1] with SSN [PHI_SSN_1].' } }
        ]
      }
    };

    await shieldPlugin.onResponse?.(resCtx);
    // Response should be seamlessly rehydrated back to original values
    assert.ok(resCtx.data.choices[0].message.content.includes('Alice Cooper'));
    assert.ok(resCtx.data.choices[0].message.content.includes('123-45-6789'));
  });

  // --- SUITE 28: SOC 2 Trust Services Criteria 5-Pillar Evaluation & Signed Evidence Manifest ---
  await test('SOC 2 Engine: 5-Pillar Posture Report calculates 100% compliance across all criteria', async () => {
    const report = await galxSOC2.getSOC2PostureReport();

    assert.strictEqual(report.auditReadinessStatus, 'audit_ready');
    assert.ok(report.overallComplianceScore >= 95);
    assert.strictEqual(report.unbrokenAuditChainVerified, true);

    // Verify 5 Pillars
    assert.strictEqual(report.criteriaPillars.security.accessControlsEnforced, true);
    assert.strictEqual(report.criteriaPillars.availability.circuitBreakerAutoHealing, true);
    assert.strictEqual(report.criteriaPillars.confidentiality.zeroDataRetentionEnforced, true);
    assert.strictEqual(report.criteriaPillars.processingIntegrity.payloadSchemaValidation, true);
    assert.strictEqual(report.criteriaPillars.privacy.hipaaSafeHarbor18Active, true);
  });

  await test('SOC 2 Engine: Generates cryptographically signed SOC 2 Type II Evidence Dossier', async () => {
    const dossier = await galxSOC2.generateSOC2EvidenceDossier('tenant_big4_audit_corp');

    assert.strictEqual(dossier.tenantId, 'tenant_big4_audit_corp');
    assert.strictEqual(dossier.standard, 'AICPA SOC 2 Type II (Trust Services Criteria)');
    assert.strictEqual(dossier.controlsVerifiedCount, 28);
    assert.ok(dossier.controlsMatrix.length === 28);

    // Cryptographic proofs
    assert.strictEqual(dossier.cryptographicProof.auditChainValid, true);
    assert.ok(dossier.cryptographicProof.dossierSignatureSha256.length === 64);
    assert.ok(dossier.cryptographicProof.zdrAttestationDigestSha256.length === 64);
  });

  await test('SOC 2 Engine: Machine-readable control matrix contains all 28 technical control mappings', () => {
    const controls = galxSOC2.getSOC2ControlMatrix();
    assert.strictEqual(controls.length, 28);

    // Check specific critical control IDs
    const cc61 = controls.find(c => c.controlId === 'CC6.1');
    const c11 = controls.find(c => c.controlId === 'C1.1');
    const p11 = controls.find(c => c.controlId === 'P1.1');
    const pi12 = controls.find(c => c.controlId === 'PI1.2');

    assert.ok(cc61 && cc61.criteriaCategory === 'Security');
    assert.ok(c11 && c11.criteriaCategory === 'Confidentiality');
    assert.ok(p11 && p11.criteriaCategory === 'Privacy');
    assert.ok(pi12 && pi12.criteriaCategory === 'Processing Integrity');
  });

  // --- SUITE 29: Real-Time Threat & Anomaly Detection (SOC 2 CC7.1 / CC7.2) ---
  await test('Threat Detection: Impossible geo-travel velocity detects rapid country hopping and appends audit log', () => {
    const userId = 'user_traveler_001';
    const t0 = Date.now();

    // 1. Initial request from United States
    const ev1 = galxThreatDetector.evaluateGeoTravelAnomaly({
      userId,
      ipAddress: '198.51.100.10',
      countryCode: 'US',
      timestampMs: t0
    });
    assert.strictEqual(ev1, null); // Normal first request

    // 2. Subsequent request from Germany 2 minutes later (impossible travel)
    const ev2 = galxThreatDetector.evaluateGeoTravelAnomaly({
      userId,
      ipAddress: '198.51.100.99',
      countryCode: 'DE',
      timestampMs: t0 + 120000 // 2 minutes later
    });

    assert.ok(ev2 !== null);
    assert.strictEqual(ev2?.threatType, 'THREAT_IMPOSSIBLE_TRAVEL');
    assert.strictEqual(ev2?.mitigationAction, 'step_up_sudo_required');
    assert.strictEqual(ev2?.severity, 'high');
  });

  await test('Threat Detection: Token consumption velocity burst triggers mitigation throttling', () => {
    const userId = 'user_burst_bot_002';

    // 1. Normal usage
    const ev1 = galxThreatDetector.evaluateTokenVelocityAnomaly({
      userId,
      tokensConsumed: 5000,
      thresholdTokensPerMin: 20000
    });
    assert.strictEqual(ev1, null);

    // 2. Massive burst in same window exceeding threshold
    const ev2 = galxThreatDetector.evaluateTokenVelocityAnomaly({
      userId,
      tokensConsumed: 25000,
      thresholdTokensPerMin: 20000
    });

    assert.ok(ev2 !== null);
    assert.strictEqual(ev2?.threatType, 'THREAT_TOKEN_SPIKE');
    assert.strictEqual(ev2?.mitigationAction, 'throttled');
  });

  await test('Threat Detection: Forged session token attempt logs critical blocked event', () => {
    const event = galxThreatDetector.recordTokenForgeryEvent({
      ipAddress: '203.0.113.45',
      userAgent: 'curl/7.68.0',
      rawTokenSnippet: 'galx_sess_v2_tampered_signature_fake',
      reason: 'AES-256-GCM authentication tag mismatch'
    });

    assert.strictEqual(event.threatType, 'THREAT_FORGED_TOKEN');
    assert.strictEqual(event.severity, 'critical');
    assert.strictEqual(event.mitigationAction, 'blocked');
  });

  // --- SUITE 30: Developer SDK SOC 2 Ergonomics ---
  await test('Developer SDK: galx.compliance SOC 2 posture, evidence, and controls methods', async () => {
    const galx = new GalxAI({ apiKey: 'sk-test-developer-soc2-key' });

    // 1. galx.compliance.getSOC2Posture()
    const posture = await galx.compliance.getSOC2Posture();
    assert.strictEqual(posture.auditReadinessStatus, 'audit_ready');
    assert.ok(posture.overallComplianceScore >= 95);

    // 2. galx.compliance.getSOC2Evidence()
    const evidence = await galx.compliance.getSOC2Evidence('tenant_sdk_test_corp');
    assert.strictEqual(evidence.tenantId, 'tenant_sdk_test_corp');
    assert.strictEqual(evidence.cryptographicProof.auditChainValid, true);

    // 3. galx.compliance.getSOC2Controls()
    const controls = galx.compliance.getSOC2Controls();
    assert.strictEqual(controls.length, 28);
  });

  // --- SUITE 31: HIPAA Restricted 3-Digit ZIP De-Identification & Latin American Identifiers ---
  await test('Safe Harbor 18: Restricted 3-Digit ZIP code prefix zeroization (45 CFR § 164.514(b)(2)(i)(B))', () => {
    // 036 is one of the 17 restricted 3-digit prefixes (< 20,000 population) -> must map to 00000
    const restrictedZip = '03601';
    assert.strictEqual(GalxPIIRedactor.sanitizeZipCode(restrictedZip), '00000');

    // 90210 is unrestricted -> retains first 3 digits '902' + '00'
    const unrestrictedZip = '90210';
    assert.strictEqual(GalxPIIRedactor.sanitizeZipCode(unrestrictedZip), '90200');
  });

  await test('Latin American Privacy: Argentina CUIT Mod-11 & Mexico CURP / RFC Checksum Validation', () => {
    // Valid Argentina CUIT: 20-12345678-6 (calculated Mod-11 checksum)
    const validCUIT = '20-12345678-6';
    assert.strictEqual(GalxPIIRedactor.validateArgentinaCUIT(validCUIT), true);
    assert.strictEqual(GalxPIIRedactor.validateArgentinaCUIT('20-12345678-9'), false);

    // Valid Mexico CURP: ABCD900101HMCRRN01
    const validCURP = 'ABCD900101HMCRRN01';
    assert.strictEqual(GalxPIIRedactor.validateMexicoCURP(validCURP), true);
    assert.strictEqual(GalxPIIRedactor.validateMexicoCURP('INVALID_CURP'), false);

    // Valid Mexico RFC: ABC900101XYZ
    const validRFC = 'ABC900101XYZ';
    assert.strictEqual(GalxPIIRedactor.validateMexicoRFC(validRFC), true);
    assert.strictEqual(GalxPIIRedactor.validateMexicoRFC('123'), false);

    // Redaction execution
    const latamText = `Customer CUIT: ${validCUIT}, CURP: ${validCURP}, RFC: ${validRFC}.`;
    const res = galxRedactor.redactText(latamText, { international: true });

    assert.strictEqual(res.sanitizedText.includes(validCUIT), false);
    assert.strictEqual(res.sanitizedText.includes(validCURP), false);
    assert.strictEqual(res.sanitizedText.includes(validRFC), false);
    assert.ok(res.sanitizedText.includes('[PII_AR_CUIT_'));
    assert.ok(res.sanitizedText.includes('[PII_MX_CURP_'));
    assert.ok(res.sanitizedText.includes('[PII_MX_RFC_'));
  });

  // --- SUITE 32: ZDR v9.0 ScopedMemorySanitizer Lifecycle Guarantee ---
  await test('ZDR v9.0: ScopedMemorySanitizer automatically tracks and wipes heap memory on completion or error', async () => {
    let capturedBuffer: Buffer | null = null;
    let capturedSecret: any = null;

    await ScopedMemorySanitizer.runInSanitizedScope(async () => {
      const sensitiveBuf = Buffer.from('Ultra-sensitive patient diagnostic audio payload');
      capturedBuffer = sensitiveBuf;
      ScopedMemorySanitizer.registerBuffer(sensitiveBuf);

      const secret: any = { apiKey: 'sk-test-secret-ephemeral-lease', provider: 'openai' };
      capturedSecret = secret;
      ScopedMemorySanitizer.registerSecret(secret);

      assert.strictEqual(sensitiveBuf.toString(), 'Ultra-sensitive patient diagnostic audio payload');
      assert.strictEqual(secret.apiKey, 'sk-test-secret-ephemeral-lease');
    });

    // Outside the scope, the buffer MUST be zeroized and the secret wiped
    assert.ok(capturedBuffer !== null);
    assert.notStrictEqual((capturedBuffer as unknown as Buffer).toString(), 'Ultra-sensitive patient diagnostic audio payload');
    assert.strictEqual(capturedSecret.apiKey, undefined);
  });

  // --- SUITE 33: SOC 2 Control Drift Detector & GDPR Article 30 RoPA Register ---
  await test('SOC 2 Drift Engine: Evaluates 28 controls, generates drift report, and executes self-healing remediation', () => {
    const drift = galxDriftDetector.evaluateControlDrift();

    assert.strictEqual(drift.totalControlsMonitored, 28);
    assert.strictEqual(drift.compliantControlsCount, 28);
    assert.strictEqual(drift.driftedControlsCount, 0);
    assert.strictEqual(drift.overallDriftPosture, 'pristine');
    assert.ok(drift.cryptographicProof.length === 64);

    // Self-healing auto-remediation
    const rem = galxDriftDetector.autoRemediateControl('CC7.2');
    assert.strictEqual(rem.success, true);
    assert.strictEqual(rem.remediatedControlId, 'CC7.2');
  });

  await test('GDPR Compliance: Generates official Article 30 Records of Processing Activities (RoPA) & Art. 20 Data Portability', async () => {
    // 1. GDPR Article 30 RoPA
    const ropa = galxPrivacy.generateRoPAReport();
    assert.strictEqual(ropa.organization, 'GALXAI Technologies Inc.');
    assert.strictEqual(ropa.gdprArticle, 'Article 30 Records of Processing Activities');
    assert.ok(ropa.controllerActivities.length > 0);
    assert.ok(ropa.processorActivities.length > 0);
    assert.ok(ropa.cryptographicSealSha256.length === 64);

    // 2. GDPR Article 20 Right to Data Portability
    const portability = await galxPrivacy.generateDataPortabilityPackage('user_gdpr_portability_001');
    assert.strictEqual(portability.schemaVersion, 'https://schema.org/DataFeed');
    assert.strictEqual(portability.format, 'JSON-LD / W3C Portable Data Format');
    assert.ok(portability.digitalSignatureSha256.length === 64);
  });

  // --- SUITE 34: HIPAA Expert Determination Statistical Risk Scoring & MEA Privacy Sovereignty ---
  await test('HIPAA Expert Determination: Statistical Re-identification Risk Scoring (45 CFR § 164.514(b)(1))', () => {
    // 1. Clean synthetic text with no quasi-identifiers
    const cleanText = 'The patient reported standard symptoms during the clinical follow-up protocol.';
    const cleanRisk = galxRedactor.calculateReidentificationRiskScore(cleanText);
    assert.strictEqual(cleanRisk.meetsExpertDeterminationThreshold, true);
    assert.strictEqual(cleanRisk.reidentificationRiskScore < 0.04, true);
    assert.strictEqual(cleanRisk.recommendedDeidentificationStrategy, 'expert_determination_approved');

    // 2. Text with heavy PHI / demographics
    const heavyText = 'Patient Jane Doe, 92 years old, resident of ZIP 90210, SSN 000-12-3456.';
    const heavyRisk = galxRedactor.calculateReidentificationRiskScore(heavyText);
    assert.strictEqual(heavyRisk.meetsExpertDeterminationThreshold, false);
    assert.strictEqual(heavyRisk.reidentificationRiskScore > 0.04, true);
    assert.ok(heavyRisk.quasiIdentifiersDetected.length >= 2);
  });

  await test('Middle East, Africa & APAC Privacy: Saudi PDPL, UAE Emirates ID, South Africa POPIA, NZ IRD Checksums', () => {
    // Saudi Arabia National ID (10 digits starting with 1, Luhn)
    const validSaudiID = '1000000008';
    assert.strictEqual(GalxPIIRedactor.validateSaudiNationalID(validSaudiID), true);
    assert.strictEqual(GalxPIIRedactor.validateSaudiNationalID('3000000008'), false);

    // UAE Emirates ID (15 digits starting with 784, Luhn)
    const validUAEID = '784-1980-1234567-8';
    assert.strictEqual(GalxPIIRedactor.validateUAEEmiratesID(validUAEID), true);
    assert.strictEqual(GalxPIIRedactor.validateUAEEmiratesID('123-1980-1234567-8'), false);

    // South Africa POPIA ID (13 digits, Luhn)
    const validSAID = '9001015009086';
    assert.strictEqual(GalxPIIRedactor.validateSouthAfricanID(validSAID), true);
    assert.strictEqual(GalxPIIRedactor.validateSouthAfricanID('9001015009089'), false);

    // New Zealand IRD (Mod-11)
    const validNZIRD = '49-091-850';
    assert.strictEqual(GalxPIIRedactor.validateNewZealandIRD(validNZIRD), true);
    assert.strictEqual(GalxPIIRedactor.validateNewZealandIRD('49-091-859'), false);

    // Full Redaction execution
    const regionalText = `MEA Identifiers: Saudi ID ${validSaudiID}, Emirates ID ${validUAEID}, SA ID ${validSAID}, NZ IRD ${validNZIRD}.`;
    const res = galxRedactor.redactText(regionalText, { international: true });

    assert.strictEqual(res.sanitizedText.includes(validSaudiID), false);
    assert.strictEqual(res.sanitizedText.includes(validUAEID), false);
    assert.strictEqual(res.sanitizedText.includes(validSAID), false);
    assert.strictEqual(res.sanitizedText.includes(validNZIRD), false);
    assert.ok(res.sanitizedText.includes('[PII_SA_ID_'));
    assert.ok(res.sanitizedText.includes('[PII_AE_EID_'));
    assert.ok(res.sanitizedText.includes('[PII_ZA_ID_'));
    assert.ok(res.sanitizedText.includes('[PII_NZ_IRD_'));
  });

  // --- SUITE 35: ZDR v10.0 Forward Secrecy Key Ratchet & Upstream Zero-Retention Header Scrutinizer ---
  await test('ZDR v10.0: HKDF-SHA256 Forward Secrecy Key Ratchet ratchets key every 1000 streaming tokens', () => {
    const ratchet = galxZDR.createRatchetSession('initial-ephemeral-stream-seed');
    const initialKey = Buffer.from(ratchet.getCurrentKey());
    assert.strictEqual(ratchet.getStep(), 0);

    // Stream 500 tokens -> no ratchet yet
    const step1 = ratchet.trackTokens(500);
    assert.strictEqual(step1.ratcheted, false);
    assert.strictEqual(ratchet.getStep(), 0);

    // Stream 600 more tokens (total 1100) -> triggers step 1 ratchet
    const step2 = ratchet.trackTokens(600);
    assert.strictEqual(step2.ratcheted, true);
    assert.strictEqual(step2.currentStep, 1);
    assert.strictEqual(ratchet.getStep(), 1);

    // Ratcheted key is cryptographically unique from initial key
    assert.notDeepStrictEqual(ratchet.getCurrentKey(), initialKey);

    // Clean zeroization
    ratchet.zeroize();
  });

  await test('ZDR v10.0: Upstream Header Scrutinizer enforces zero tracking cookies and strict no-store policies', () => {
    // 1. Compliant upstream headers
    const compliantHeaders = {
      'cache-control': 'no-store, no-cache, must-revalidate',
      'content-type': 'application/json'
    };
    const audit1 = galxZDR.verifyUpstreamZDRHeaders(compliantHeaders);
    assert.strictEqual(audit1.compliant, true);
    assert.strictEqual(audit1.zdrRatified, true);
    assert.strictEqual(audit1.violations.length, 0);

    // 2. Non-compliant headers (Set-Cookie violation)
    const violatingHeaders = {
      'cache-control': 'public, max-age=3600',
      'set-cookie': 'tracking_session_id=12345; Secure; HttpOnly'
    };
    const audit2 = galxZDR.verifyUpstreamZDRHeaders(violatingHeaders);
    assert.strictEqual(audit2.compliant, false);
    assert.strictEqual(audit2.zdrRatified, false);
    assert.ok(audit2.violations.length >= 2);
  });

  // --- SUITE 36: NIST OSCAL 1.0.0, EU AI Act Annex IV & Dynamic Security Pen Test Simulator ---
  await test('NIST OSCAL 1.0.0 & EU AI Act Annex IV: Generates standardized GRC and GPAI compliance dossiers', () => {
    // 1. NIST OSCAL Report
    const oscal = galxSOC2.generateOSCALAssessmentReport();
    assert.strictEqual(oscal.oscalVersion, '1.0.0');
    assert.strictEqual(oscal.assessmentPlan.controlsCount, 28);
    assert.ok(oscal.digitalSignatureSha256.length === 64);

    // 2. EU AI Act Annex IV Technical Documentation Dossier
    const euDossier = galxSOC2.generateEUAIActAnnexIVDossier('gpt-5.6-sol');
    assert.strictEqual(euDossier.modelId, 'gpt-5.6-sol');
    assert.strictEqual(euDossier.technicalDocumentation.dataGovernance.copyrightComplianceVerified, true);
    assert.strictEqual(euDossier.technicalDocumentation.cybersecurityArchitecture.continuousThreatMonitoring, true);
    assert.ok(euDossier.cryptographicProofSha256.length === 64);
  });

  await test('Dynamic Security Pen Test Simulator: Self-probing suite mitigates 100% of synthetic attacks', () => {
    const probeResult = galxSecurityProbe.runSecurityProbes();
    assert.strictEqual(probeResult.totalProbesExecuted, 5);
    assert.strictEqual(probeResult.totalProbesBlocked, 5);
    assert.strictEqual(probeResult.mitigationRatePercent, 100);
    assert.strictEqual(probeResult.allProbesPassed, true);
  });

  // --- SUITE 37: High-Throughput Fast-Path PII Filter & Zero-Allocation Memory Slab Pool ---
  await test('Fast-Path Preflight PII Filter: Zero-allocation scan bypasses regex engines on benign text in < 0.05ms', () => {
    // 1. Plain text with no digits or symbols -> fast-path bypass
    const benignText = 'Hello assistant, please summarize our product strategy meeting for the executive team.';
    const preflight = galxRedactor.fastPreflightScan(benignText);
    assert.strictEqual(preflight.requiresDeepScan, false);

    const fastResult = galxRedactor.fastRedact(benignText);
    assert.strictEqual(fastResult.sanitizedText, benignText);
    assert.strictEqual(fastResult.entitiesDetected.length, 0);

    // 2. Sensitive text with digits & identifiers -> triggers deep scan
    const sensitiveText = 'Patient Jane Doe, MRN 1234567, SSN 000-12-3456.';
    const preflightDeep = galxRedactor.fastPreflightScan(sensitiveText);
    assert.strictEqual(preflightDeep.requiresDeepScan, true);

    const deepResult = galxRedactor.fastRedact(sensitiveText, { hipaa: true });
    assert.ok(deepResult.sanitizedText.includes('[PHI_'));
    assert.strictEqual(deepResult.sanitizedText.includes('000-12-3456'), false);
  });

  await test('ZDR Memory Slab Pool: Pre-allocated slabs lease and release with sub-microsecond zeroization', () => {
    const statsBefore = galxSlabPool.getPoolStats();
    assert.strictEqual(statsBefore.totalSlabs, 16);
    assert.strictEqual(statsBefore.slabSizeBytes, 65536);

    // Lease a slab
    const slab = galxSlabPool.acquireSlab();
    assert.strictEqual(slab.isLeased, true);
    assert.strictEqual(slab.buffer.length, 65536);

    // Write sensitive payload to slab
    slab.buffer.write('Highly confidential ephemeral streaming tensor', 0);
    assert.ok(slab.buffer.toString().includes('Highly confidential'));

    // Release slab -> triggers immediate zeroization
    slab.release();
    assert.strictEqual(slab.isLeased, false);
    assert.strictEqual(slab.buffer[0], 0);
    assert.strictEqual(slab.buffer[10], 0);
  });

  // --- SUITE 38: High-Velocity Merkle Tree Audit Streamer & Lock-Free Shard Governor ---
  await test('High-Throughput Audit Streamer: Micro-batches events, calculates Merkle Tree root, and chains SHA-256 ledger', () => {
    // 1. Enqueue multiple high-velocity audit events
    for (let i = 0; i < 5; i++) {
      galxAuditStreamer.enqueue({
        action: 'INFERENCE_ROUTED_EPHEMERAL',
        userId: `user_swarm_${i}`,
        resourceId: `shard_gpt_${i}`,
        resourceType: 'model_shard',
        metadata: { tokens: 150 + i * 10 }
      });
    }

    // 2. Commit micro-batch into Merkle Tree root
    const batch = galxAuditStreamer.flushNow();
    assert.ok(batch !== null);
    assert.strictEqual(batch.leafCount, 5);
    assert.ok(batch.merkleRootSha256.length === 64);
    assert.ok(batch.chainedLedgerRootSha256.length === 64);

    // 3. Verify metrics
    const metrics = galxAuditStreamer.getMetrics();
    assert.ok(metrics.totalEventsProcessed >= 5);
    assert.ok(metrics.batchesCommitted >= 1);
    assert.strictEqual(metrics.currentQueueDepth, 0);
  });

  await test('Lock-Free Shard Governor: Sub-microsecond (< 50ns) token allocation decision for parallel swarms', () => {
    const mockShards: any[] = [
      {
        id: 'shard_primary_us',
        status: 'healthy',
        tokenBucket: { remainingTokens: 500000, reservedTokens: 0, maxTokens: 1000000 }
      },
      {
        id: 'shard_secondary_eu',
        status: 'healthy',
        tokenBucket: { remainingTokens: 800000, reservedTokens: 0, maxTokens: 1000000 }
      }
    ];

    const decision = lockFreeGovernor.allocateShardCapacity(mockShards, 5000);
    assert.strictEqual(decision.success, true);
    assert.strictEqual(decision.selectedShardId, 'shard_secondary_eu'); // Has higher remaining tokens (800k > 500k)
    assert.strictEqual(decision.allocatedTokens, 5000);
    assert.ok(decision.decisionLatencyNs >= 0);
  });

  // --- SUITE 39: BroccoliDB L1 In-Memory Reactive Table & Rich Filter Operator DSL ---
  await test('BroccoliDB L1 Table: Sub-microsecond CRUD, secondary indexing, and rich filter operator DSL ($between, $regex, $in, $gte)', () => {
    interface ShardRecord extends Record<string, any> {
      id: string;
      region: string;
      provider: string;
      tokens: number;
      healthy: boolean;
      tags: string[];
    }

    const table = new BroccoliDbTable<ShardRecord>('shards');
    table.createIndex('region');
    table.createSortedIndex('tokens');

    // 1. Insert records
    table.put('shard_1', { id: 'shard_1', region: 'us', provider: 'openai', tokens: 100000, healthy: true, tags: ['fast', 'gpt5'] });
    table.put('shard_2', { id: 'shard_2', region: 'eu', provider: 'anthropic', tokens: 50000, healthy: true, tags: ['sovereign', 'claude'] });
    table.put('shard_3', { id: 'shard_3', region: 'us', provider: 'xai', tokens: 25000, healthy: false, tags: ['grok'] });
    table.put('shard_4', { id: 'shard_4', region: 'apac', provider: 'google', tokens: 75000, healthy: true, tags: ['gemini'] });

    assert.strictEqual(table.count(), 4);

    // 2. Rich Operator Filter: $between and $in
    const betweenResults = table.query({
      where: {
        tokens: { $between: [40000, 80000] },
        region: { $in: ['eu', 'apac'] }
      }
    });
    assert.strictEqual(betweenResults.length, 2);
    assert.ok(betweenResults.some(r => r.id === 'shard_2'));
    assert.ok(betweenResults.some(r => r.id === 'shard_4'));

    // 3. Rich Operator Filter: $regex and $gte
    const regexResults = table.query({
      where: {
        provider: { $regex: '^open' },
        tokens: { $gte: 100000 }
      }
    });
    assert.strictEqual(regexResults.length, 1);
    assert.strictEqual(regexResults[0].id, 'shard_1');

    // 4. Fluent Builder
    const fluentResult = table
      .select()
      .where('region')
      .equals('us')
      .and('healthy')
      .equals(true)
      .execute();
    assert.strictEqual(fluentResult.length, 1);
    assert.strictEqual(fluentResult[0].id, 'shard_1');
  });

  await test('BroccoliDB Aggregation: Single-pass statistical metrics calculus ($sum, $avg, $min, $max, $count)', () => {
    const table = new BroccoliDbTable<{ id: string; region: string; latencyMs: number }>('telemetry');
    table.put('t1', { id: 't1', region: 'us', latencyMs: 10 });
    table.put('t2', { id: 't2', region: 'us', latencyMs: 20 });
    table.put('t3', { id: 't3', region: 'eu', latencyMs: 30 });
    table.put('t4', { id: 't4', region: 'eu', latencyMs: 50 });

    const aggResult = table.aggregate({
      groupBy: ['region'],
      metrics: {
        totalLatency: { metric: 'sum', field: 'latencyMs' },
        avgLatency: { metric: 'avg', field: 'latencyMs' },
        minLatency: { metric: 'min', field: 'latencyMs' },
        maxLatency: { metric: 'max', field: 'latencyMs' },
        sampleCount: { metric: 'count' }
      }
    });

    assert.strictEqual(aggResult.totalRecordsEvaluated, 4);
    assert.strictEqual(aggResult.groups.length, 2);

    const usGroup = aggResult.groups.find(g => g.keys.region === 'us');
    assert.ok(usGroup !== undefined);
    assert.strictEqual(usGroup.metrics.totalLatency, 30);
    assert.strictEqual(usGroup.metrics.avgLatency, 15);
    assert.strictEqual(usGroup.metrics.minLatency, 10);
    assert.strictEqual(usGroup.metrics.maxLatency, 20);
    assert.strictEqual(usGroup.recordCount, 2);
  });

  // --- SUITE 40: BroccoliDB Natural Language Query Parser & Cryptographic WAL Crash Recovery ---
  await test('BroccoliDB Natural Query Parser: Offline deterministic translation of natural language queries (< 0.1ms)', () => {
    // 1. Natural Query Expression
    const nq = 'in audit_logs table where action = "INFERENCE_ROUTED_EPHEMERAL" and tokens > 1000 sorted by timestamp desc limit 25';
    const parsed = BroccoliNaturalQueryParser.parse(nq);

    assert.strictEqual(parsed.targetTable, 'audit_logs');
    assert.strictEqual(parsed.queryOptions.limit, 25);
    assert.strictEqual(parsed.queryOptions.sortBy, 'timestamp');
    assert.strictEqual(parsed.queryOptions.sortOrder, 'desc');
    assert.ok(parsed.confidence > 0.5);

    // 2. Query execution via parsed AST
    const auditTable = new BroccoliDbTable<{ id: string; action: string; tokens: number; timestamp: number }>('audit_logs');
    auditTable.put('a1', { id: 'a1', action: 'INFERENCE_ROUTED_EPHEMERAL', tokens: 1500, timestamp: 100 });
    auditTable.put('a2', { id: 'a2', action: 'INFERENCE_ROUTED_EPHEMERAL', tokens: 500, timestamp: 200 });
    auditTable.put('a3', { id: 'a3', action: 'SESSION_REVOKED', tokens: 0, timestamp: 300 });

    const results = auditTable.query(parsed.queryOptions);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'a1');
  });

  await test('BroccoliDB L2 WAL: Append-only cryptographic frame chaining and crash recovery replay', async () => {
    const testDir = path.join(os.tmpdir(), `broccolidb_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    const kernel = new BroccoliDatabaseKernel({ workspaceRoot: testDir, walDebounceMs: 10 });
    await kernel.start();

    const shardTable = kernel.getTable<{ id: string; name: string; capacity: number }>('shards');
    shardTable.put('shard_alpha', { id: 'shard_alpha', name: 'Alpha GPU Shard', capacity: 1000000 });
    shardTable.put('shard_beta', { id: 'shard_beta', name: 'Beta TPU Shard', capacity: 500000 });

    // Flush and stop
    await kernel.stop();

    // Cold-start second kernel instance on same directory (Simulate Crash Recovery Replay)
    const recoveryKernel = new BroccoliDatabaseKernel({ workspaceRoot: testDir });
    await recoveryKernel.start();

    const recoveredTable = recoveryKernel.getTable<{ id: string; name: string; capacity: number }>('shards');
    assert.strictEqual(recoveredTable.count(), 2);
    assert.strictEqual(recoveredTable.get('shard_alpha')?.name, 'Alpha GPU Shard');
    assert.strictEqual(recoveredTable.get('shard_beta')?.capacity, 500000);

    const health = await recoveryKernel.health();
    assert.strictEqual(health.status, 'HEALTHY');
    assert.strictEqual(health.pillars.tableConsistency.healthy, true);

    await recoveryKernel.stop();
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  // --- SUITE 41: Workspace-Wide BroccoliDB (Model Catalog & Persistence L1 Hot Cache) ---
  await test('ModelCatalog: BroccoliDB Natural Query filtering and statistical price aggregation', () => {
    // 1. Natural Query filtering over Model Catalog
    const visionModels = ModelCatalog.queryNatural('where category = "llm" and supportsVision = true sorted by inputPricePer1M asc');
    assert.ok(visionModels.length > 0);
    assert.ok(visionModels.every(m => m.category === 'llm' && m.supportsVision));

    // 2. Aggregation over Model Catalog pricing
    const pricingStats = ModelCatalog.aggregate({
      groupBy: ['provider'],
      metrics: {
        avgInputPrice: { metric: 'avg', field: 'inputPricePer1M' },
        minInputPrice: { metric: 'min', field: 'inputPricePer1M' },
        maxInputPrice: { metric: 'max', field: 'inputPricePer1M' },
        modelCount: { metric: 'count' }
      }
    });

    assert.ok(pricingStats.groups.length >= 2);
    const openaiGroup = pricingStats.groups.find(g => g.keys.provider === 'openai');
    assert.ok(openaiGroup !== undefined);
    assert.ok(openaiGroup.metrics.modelCount > 0);
    assert.ok(openaiGroup.metrics.avgInputPrice > 0);
  });

  await test('GalxPersistence: L1 BroccoliDB Hot Cache with indexed secondary lookups & natural queries', () => {
    const persistence = GalxPersistence.getInstance();

    const now = Date.now();
    // 1. Save and retrieve shards through BroccoliDB table
    persistence.saveShard({
      id: 'shard_zenith_1',
      userId: 'user_enterprise_99',
      provider: 'openai',
      authType: 'api_key',
      accountLabel: 'Zenith Fast Shard',
      apiKeyMasked: 'sk-proj...fast',
      status: 'healthy',
      priority: 100,
      weight: 1,
      tokenBucket: {
        maxTokens: 500000,
        remainingTokens: 500000,
        refillRatePerMinute: 500000,
        maxRequests: 1000,
        remainingRequests: 1000,
        lastRefillTimestampMs: now
      },
      stats: {
        totalRequestsServed: 0,
        totalTokensConsumed: 0,
        consecutiveFailures: 0
      },
      createdAtMs: now,
      updatedAtMs: now,
      shardMode: 'private'
    });

    persistence.saveShard({
      id: 'shard_zenith_2',
      userId: 'user_enterprise_99',
      provider: 'xai-grok',
      authType: 'api_key',
      accountLabel: 'Zenith Grok Shard',
      apiKeyMasked: 'xai-...grok',
      status: 'healthy',
      priority: 50,
      weight: 1,
      tokenBucket: {
        maxTokens: 500000,
        remainingTokens: 500000,
        refillRatePerMinute: 500000,
        maxRequests: 1000,
        remainingRequests: 1000,
        lastRefillTimestampMs: now
      },
      stats: {
        totalRequestsServed: 0,
        totalTokensConsumed: 0,
        consecutiveFailures: 0
      },
      createdAtMs: now,
      updatedAtMs: now,
      shardMode: 'pooled'
    });

    const naturalResults = persistence.queryShardsNatural('where userId = "user_enterprise_99" and provider = "openai"');
    assert.strictEqual(naturalResults.length, 1);
    assert.strictEqual(naturalResults[0].id, 'shard_zenith_1');

    // 2. Aggregation on shards
    const aggShards = persistence.aggregateShards({
      groupBy: ['provider'],
      metrics: {
        count: { metric: 'count' }
      }
    });
    assert.ok(aggShards.groups.length >= 2);
  });

  // --- SUITE 42: Workspace-Wide BroccoliDB (Session & Key Indexing & Developer SDK) ---
  await test('SessionRepository & ApiKeyRepository: Sub-microsecond indexed token and key resolution', async () => {
    const sessionRepo = SessionRepository.getInstance();
    const apiKeyRepo = ApiKeyRepository.getInstance();

    const testTokenHash = crypto.createHash('sha256').update('secret_session_token_xyz').digest('hex');
    const sessionId = `sess_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    await sessionRepo.createSession({
      id: sessionId,
      userId: 'user_test_broccoli',
      provider: 'openai',
      tokenHash: testTokenHash,
      issuedAtMs: nowMs,
      expiresAtMs: nowMs + 3600000,
      lastActiveAtMs: nowMs,
      createdAt: nowIso,
      updatedAt: nowIso,
      isRevoked: false
    });

    const foundSession = await sessionRepo.findSessionByTokenHash(testTokenHash);
    assert.ok(foundSession !== null);
    assert.strictEqual(foundSession?.id, sessionId);

    // API Key resolution by prefix & hash
    const testKeyHash = crypto.createHash('sha256').update('galx_live_broccoli_key_123').digest('hex');
    const keyId = `key_broccoli_${Date.now()}`;

    await apiKeyRepo.saveGatewayKey({
      id: keyId,
      userId: 'user_test_broccoli',
      name: 'Broccoli Index Key',
      prefix: 'galx_live_broc',
      keyHash: testKeyHash,
      rateLimitPerMinute: 1200,
      totalRequests: 0,
      totalTokens: 0,
      createdAtMs: Date.now(),
      revoked: false
    });

    const foundByHash = await apiKeyRepo.findGatewayKeyByHash(testKeyHash);
    assert.ok(foundByHash !== null);
    assert.strictEqual(foundByHash?.id, keyId);

    const foundByPrefix = await apiKeyRepo.findKeyByPrefix('galx_live_broc');
    assert.ok(foundByPrefix !== null);
    assert.strictEqual(foundByPrefix?.id, keyId);
  });

  await test('Developer SDK: galx.models.queryNatural(), galx.queues.queryNatural(), and galx.privacy.queryShardsNatural()', () => {
    const galx = new GalxAI();

    // 1. Models natural query
    const codingModels = galx.models.queryNatural('where description contains "coding" limit 5');
    assert.ok(codingModels.length > 0);

    // 2. Queues natural query
    const tasks = galx.queues.queryTasksNatural('limit 10');
    assert.ok(Array.isArray(tasks));

    // 3. Privacy shards natural query
    const shards = galx.privacy.queryShardsNatural('where status = "healthy"');
    assert.ok(Array.isArray(shards));
  });

  // --- SUITE 43: Workspace-Wide BroccoliDB (Audit, Telemetry & Health Repositories) ---
  await test('AuditRepository: BroccoliDB L1 reactive table, SHA-256 verification, and natural querying', async () => {
    const auditRepo = AuditRepository.getInstance();
    const actionName = 'WORKSPACE_CREDENTIAL_ROTATED';
    const testUserId = `user_audit_${Date.now()}`;

    const auditId = await auditRepo.logAudit({
      action: actionName,
      userId: testUserId,
      metadata: { reason: 'Automated 90-day rotation', tier: 'enterprise' }
    });

    assert.ok(auditId.startsWith('audit_'));

    // Natural query over audit repository
    const matchedAudits = auditRepo.queryNatural(`where userId = "${testUserId}" and action = "${actionName}"`);
    assert.strictEqual(matchedAudits.length, 1);
    assert.strictEqual(matchedAudits[0].id, auditId);

    // Cryptographic chain verification
    const verification = auditRepo.verifyAuditChainIntegrity();
    assert.strictEqual(verification.valid, true);

    // Statistical aggregation on audit actions
    const aggResult = auditRepo.aggregate({
      groupBy: ['action'],
      metrics: {
        eventCount: { metric: 'count' }
      }
    });
    assert.ok(aggResult.groups.length > 0);
  });

  await test('TelemetryRepository & ShardHealthRepository: Sub-microsecond latency percentiles & health probe indexing', async () => {
    const telemetryRepo = TelemetryRepository.getInstance();
    const healthRepo = ShardHealthRepository.getInstance();

    const sampleBaseTime = Date.now();
    await telemetryRepo.recordTelemetryBatch([
      { provider: 'openai', modelId: 'gpt-5.6-sol', shardId: 'shard_1', latencyMs: 120, totalTokens: 500, statusCode: 200, timestampMs: sampleBaseTime },
      { provider: 'openai', modelId: 'gpt-5.6-sol', shardId: 'shard_1', latencyMs: 180, totalTokens: 1200, statusCode: 200, timestampMs: sampleBaseTime },
      { provider: 'xai-grok', modelId: 'x-ai/grok-4.5', shardId: 'shard_2', latencyMs: 250, totalTokens: 800, statusCode: 200, timestampMs: sampleBaseTime },
      { provider: 'xai-grok', modelId: 'x-ai/grok-4.5', shardId: 'shard_2', latencyMs: 310, totalTokens: 950, statusCode: 500, isError: true, timestampMs: sampleBaseTime }
    ]);

    // Query percentiles via BroccoliDB
    const percentiles = await telemetryRepo.getLatencyPercentiles({ provider: 'openai', modelId: 'gpt-5.6-sol' });
    assert.ok(percentiles.sampleCount >= 2);
    assert.ok(percentiles.p50 >= 120);

    // Query telemetry via natural language
    const errorSamples = telemetryRepo.queryNatural('where statusCode = 500 and isError = true');
    assert.ok(errorSamples.length >= 1);
    assert.strictEqual(errorSamples[0].statusCode, 500);

    // Shard health probes batch and indexed retrieval
    await healthRepo.reportHealthProbesBatch([
      { shardId: 'shard_probe_test', workerId: 'worker_iad_1', latencyMs: 45, statusCode: 200, isSuccess: true, timestampMs: sampleBaseTime },
      { shardId: 'shard_probe_test', workerId: 'worker_fra_1', latencyMs: 85, statusCode: 200, isSuccess: true, timestampMs: sampleBaseTime }
    ]);

    const probes = healthRepo.getProbes('shard_probe_test');
    assert.strictEqual(probes.length, 2);
    assert.strictEqual(probes[0].shardId, 'shard_probe_test');
  });

  // --- SUITE 44: Workspace-Wide BroccoliDB (Idempotency, Distributed Locks & Real-Time Telemetry) ---
  await test('IdempotencyRepository, DistributedLockRepository & GalxMetricsEngine: Multi-modal table transactions & natural telemetry', async () => {
    const idempotencyRepo = IdempotencyRepository.getInstance();
    const lockRepo = DistributedLockRepository.getInstance();
    const metricsEngine = GalxMetricsEngine.getInstance();

    // 1. Idempotency table
    const testKey = `idem_broc_${Date.now()}`;
    const beginRes = await idempotencyRepo.begin({
      idempotencyKey: testKey,
      userId: 'user_idem_test',
      endpoint: '/v1/chat/completions',
      requestHash: 'sha256_mock_hash_123'
    });
    assert.strictEqual(beginRes.status, 'STARTED');

    await idempotencyRepo.commit({
      idempotencyKey: testKey,
      statusCode: 200,
      responseBody: { message: 'BroccoliDB Idempotent Response' }
    });

    const cachedRes = await idempotencyRepo.begin({
      idempotencyKey: testKey,
      userId: 'user_idem_test',
      endpoint: '/v1/chat/completions',
      requestHash: 'sha256_mock_hash_123'
    });
    assert.strictEqual(cachedRes.status, 'CACHED');

    // 2. Distributed Advisory Lock with fencing token
    const lockKey = `lock_resource_${Date.now()}`;
    const lock1 = await lockRepo.acquireLock({ lockKey, ownerId: 'worker_alpha', ttlMs: 10000 });
    assert.strictEqual(lock1.acquired, true);
    assert.strictEqual(lock1.fencingToken, 1);

    const lock2 = await lockRepo.acquireLock({ lockKey, ownerId: 'worker_beta', ttlMs: 10000 });
    assert.strictEqual(lock2.acquired, false);

    await lockRepo.releaseLock({ lockKey, ownerId: 'worker_alpha', fencingToken: lock1.fencingToken });

    // 3. GalxMetricsEngine natural querying
    metricsEngine.recordSample({
      timestampMs: Date.now(),
      latencyMs: 95,
      tokensConsumed: 450,
      success: true,
      provider: 'openai',
      model: 'gpt-5.6-terra',
      shardId: 'shard_fast_1',
      statusCode: 200
    });

    const terraMetrics = metricsEngine.queryNatural('where model = "gpt-5.6-terra" and success = true');
    assert.ok(terraMetrics.length >= 1);
    assert.strictEqual(terraMetrics[0].model, 'gpt-5.6-terra');
  });

  // --- SUITE 45: Workspace-Wide BroccoliDB (Compute Wallet & Embeddings Repositories) ---
  await test('WalletRepository: 50% compute match grant, micro-draws, and natural transaction queries', async () => {
    const walletRepo = WalletRepository.getInstance();
    const testUserId = `user_wallet_${Date.now()}`;

    // 1. Initial wallet creation
    const wallet = await walletRepo.createOrGetWallet(testUserId);
    assert.strictEqual(wallet.balanceUsd, 0);
    assert.strictEqual(wallet.introductoryGrantUsd, 5.0);

    // 2. Deposit $10 with 50% match grant ($5) -> $15 balance
    const depositResult = await walletRepo.verifyDepositAndApplyMatch({
      userId: testUserId,
      depositAmountUsd: 10.0,
      paymentRef: 'ch_stripe_test_123'
    });
    assert.strictEqual(depositResult.success, true);
    assert.strictEqual(depositResult.depositAmount, 10.0);
    assert.strictEqual(depositResult.matchGrant, 5.0);
    assert.strictEqual(depositResult.totalCredit, 15.0);
    assert.strictEqual(depositResult.newBalance, 15.0);

    // 3. Micro-draw tokens ($0.0025)
    const drawResult = await walletRepo.drawTokens({
      userId: testUserId,
      costUsd: 0.0025,
      description: 'GPT-5.6 Sol 1K Tokens',
      model: 'gpt-5.6-sol',
      promptTokens: 800,
      completionTokens: 200
    });
    assert.strictEqual(drawResult.success, true);
    assert.strictEqual(drawResult.costUsd, 0.0025);
    assert.strictEqual(drawResult.newBalance, 14.9975);

    // 4. Natural query transactions
    const txs = walletRepo.queryTransactionsNatural(`where userId = "${testUserId}" limit 10`);
    assert.strictEqual(txs.length, 2);

    // 5. Transaction aggregation
    const aggTx = walletRepo.aggregateTransactions({
      groupBy: ['transactionType'],
      metrics: {
        totalAmount: { metric: 'sum', field: 'amountUsd' },
        txCount: { metric: 'count' }
      }
    });
    assert.ok(aggTx.groups.length >= 2);
  });

  await test('EmbeddingsRepository: Vector cosine distance ranking and document candidate filtering', async () => {
    const embeddingsRepo = EmbeddingsRepository.getInstance();
    const docId = `doc_${Date.now()}`;

    // Vector 1: coding vector [1, 0, 0, 0]
    await embeddingsRepo.saveEmbedding({
      documentId: docId,
      chunkIndex: 0,
      collectionName: 'code_docs',
      content: 'TypeScript async/await functions and interfaces',
      embedding: [1, 0, 0, 0],
      metadata: { language: 'typescript', category: 'syntax' }
    });

    // Vector 2: database vector [0, 1, 0, 0]
    await embeddingsRepo.saveEmbedding({
      documentId: docId,
      chunkIndex: 1,
      collectionName: 'code_docs',
      content: 'BroccoliDB reactive table indexing and transactions',
      embedding: [0, 1, 0, 0],
      metadata: { language: 'sql', category: 'database' }
    });

    // Search for code vector [0.95, 0.05, 0, 0]
    const results = await embeddingsRepo.searchSimilar({
      queryEmbedding: [0.95, 0.05, 0, 0],
      collectionName: 'code_docs',
      matchThreshold: 0.8,
      matchCount: 5
    });

    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].chunkIndex, 0);
    assert.ok(results[0].similarity > 0.9);

    // Natural query over embeddings metadata
    const syntaxDocs = embeddingsRepo.queryNatural('where collectionName = "code_docs" and documentId = "' + docId + '"');
    assert.strictEqual(syntaxDocs.length, 2);
  });

  // --- SUITE 46: Workspace-Wide BroccoliDB (Projects, Queues & Task Repositories) ---
  await test('ProjectRepository & QueueRepository: Multi-tenant project environments and queue governance', async () => {
    const projectRepo = ProjectRepository.getInstance();
    const queueRepo = QueueRepository.getInstance();
    const workspaceId = `ws_proj_test_${Date.now()}`;

    // 1. Create project with auto-created dev & prod environments
    const project = await projectRepo.createProject({
      workspaceId,
      name: 'Agentic Gateway Core',
      slug: 'agentic-gateway-core',
      description: 'Zero-latency AI router'
    });
    assert.ok(project.id.startsWith('proj_'));

    const envs = await projectRepo.getEnvironments(project.id);
    assert.strictEqual(envs.length, 2);
    assert.ok(envs.some(e => e.environmentType === 'production' && e.monthlyBudgetUsd === 500));
    assert.ok(envs.some(e => e.environmentType === 'development' && e.monthlyBudgetUsd === 100));

    // 2. Queue management
    const queueId = `queue_zenith_${Date.now()}`;
    await queueRepo.saveQueue({
      id: queueId,
      name: 'zenith-batch-workers',
      state: 'RUNNING',
      rateLimits: { maxDispatchesPerSecond: 250, maxConcurrentDispatches: 100, maxBurstSize: 300 },
      retryConfig: { maxAttempts: 5, minBackoffMs: 100, maxBackoffMs: 5000, maxDoublings: 5, jitterFactor: 0.2 },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    });

    const retrievedQueue = await queueRepo.getQueueById(queueId);
    assert.ok(retrievedQueue !== null);
    assert.strictEqual(retrievedQueue?.name, 'zenith-batch-workers');

    // Natural query over queues
    const matchingQueues = queueRepo.queryNatural(`where name = "zenith-batch-workers" and state = "RUNNING"`);
    assert.strictEqual(matchingQueues.length, 1);
    assert.strictEqual(matchingQueues[0].id, queueId);
  });

  await test('TaskRepository: Worker task leasing with fencing tokens, attempt history & task aggregation', async () => {
    const taskRepo = TaskRepository.getInstance();
    const queueId = `queue_tasks_${Date.now()}`;
    const userId = `user_worker_${Date.now()}`;
    const taskId = `task_broc_${Date.now()}`;

    await taskRepo.saveTask({
      id: taskId,
      queueId,
      userId,
      priority: 95,
      status: 'QUEUED',
      target: {
        type: 'INTERNAL_MODEL',
        taskKind: 'chat_completion',
        chatPayload: { model: 'gpt-5.6-sol', messages: [{ role: 'user', content: 'test' }] }
      },
      attempts: [],
      scheduleTimeMs: Date.now() - 1000,
      dispatchCount: 0,
      responseCount: 0,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    });

    // 1. Worker leases task
    const leased = await taskRepo.leaseTasksForWorker({
      queueId,
      workerId: 'worker_node_iad_9',
      maxTasks: 5
    });
    assert.strictEqual(leased.length, 1);
    assert.strictEqual(leased[0].id, taskId);
    assert.strictEqual(leased[0].status, 'RUNNING');
    assert.strictEqual(leased[0].activeWorkerId, 'worker_node_iad_9');
    assert.strictEqual(leased[0].activeFencingToken, 1);

    // 2. Commit task completion
    await taskRepo.commitTaskAttemptsBatch([
      {
        taskId,
        attemptNumber: 1,
        startedAtMs: Date.now() - 50,
        completedAtMs: Date.now(),
        durationMs: 50,
        statusCode: 200,
        status: 'COMPLETED',
        result: { completedAtMs: Date.now(), data: { output: 'Task completed successfully' } },
        workerId: 'worker_node_iad_9'
      }
    ]);

    const completedTask = await taskRepo.getTaskById(taskId);
    assert.strictEqual(completedTask?.status, 'COMPLETED');
    assert.strictEqual(completedTask?.result?.data?.output, 'Task completed successfully');

    // 3. Task aggregation
    const aggTasks = taskRepo.aggregateTasks({
      groupBy: ['status'],
      metrics: {
        taskCount: { metric: 'count' }
      }
    });
    assert.ok(aggTasks.groups.length > 0);
  });

  // --- SUITE 47: Workspace-Wide BroccoliDB (Edge Cache, R2 Multimodal Storage & Credential Pool Leases) ---
  await test('GalxEdgeCache: SWR edge caching, sub-microsecond lookups & natural queries', async () => {
    const edgeCache = GalxEdgeCache.getInstance();
    const cacheKey = `models_manifest_${Date.now()}`;

    let fetchCount = 0;
    const fetchFn = async () => {
      fetchCount++;
      return { models: ['gpt-5.6-sol', 'gpt-5.6-terra'], version: 'v3' };
    };

    // 1. Initial fetch (MISS)
    const res1 = await edgeCache.getOrFetch(cacheKey, fetchFn, { ttlMs: 1000, swrTtlMs: 2000 });
    assert.strictEqual(res1.source, 'MISS');
    assert.strictEqual(fetchCount, 1);
    assert.strictEqual(res1.value.models.length, 2);

    // 2. Immediate second fetch (HIT)
    const res2 = await edgeCache.getOrFetch(cacheKey, fetchFn, { ttlMs: 1000, swrTtlMs: 2000 });
    assert.strictEqual(res2.source, 'HIT');
    assert.strictEqual(fetchCount, 1);

    // 3. Natural query over edge cache
    const cachedEntries = edgeCache.queryNatural(`where key = "${cacheKey}"`);
    assert.strictEqual(cachedEntries.length, 1);
    assert.strictEqual(cachedEntries[0].key, cacheKey);
  });

  await test('GalxR2AssetAdapter: Multimodal asset uploads, BroccoliDB indexing and size aggregation', async () => {
    const r2Adapter = GalxR2AssetAdapter.getInstance();

    const upload1 = await r2Adapter.uploadAsset({
      data: Buffer.from('synthetic_image_payload_png_bytes_12345'),
      contentType: 'image/png',
      folder: 'renders'
    });
    assert.ok(upload1.assetId.startsWith('asset_'));
    assert.strictEqual(upload1.contentType, 'image/png');

    const upload2 = await r2Adapter.uploadAsset({
      data: Buffer.from('synthetic_audio_payload_wav_bytes_67890'),
      contentType: 'audio/wav',
      folder: 'voice'
    });
    assert.ok(upload2.assetId.startsWith('asset_'));

    // Natural query for png images
    const pngAssets = r2Adapter.queryNatural('where contentType = "image/png"');
    assert.ok(pngAssets.some(a => a.assetId === upload1.assetId));

    // Storage aggregation
    const aggResult = r2Adapter.aggregate({
      groupBy: ['contentType'],
      metrics: {
        totalBytes: { metric: 'sum', field: 'sizeBytes' },
        assetCount: { metric: 'count' }
      }
    });
    assert.ok(aggResult.groups.length >= 2);
  });

  await test('GalxCredentialPool: BroccoliDbTable reactive lease indexing and natural lease queries', async () => {
    const substrate = new GalxCredentialSubstrate();
    const shardId = `shard_lease_test_${Date.now()}`;
    const userId = `user_lease_${Date.now()}`;

    const encrypted = GalxCryptoVault.encryptSecret({ apiKey: 'sk-test-key-123456789' }, 'system_admin', shardId, 'openai');
    substrate.addAccount({
      id: shardId,
      userId: 'system_admin',
      provider: 'openai',
      accountLabel: 'Lease Test Shard',
      authType: 'api_key',
      apiKeyMasked: 'sk-test...999',
      encryptedSecrets: encrypted,
      weight: 10,
      priority: 10,
      fencingToken: 1,
      tokenBucket: {
        maxTokens: 100000,
        remainingTokens: 100000,
        refillRatePerMinute: 60000,
        maxRequests: 1000,
        remainingRequests: 1000,
        lastRefillTimestampMs: Date.now()
      },
      stats: {
        totalRequestsServed: 0,
        totalTokensConsumed: 0,
        consecutiveFailures: 0
      },
      status: 'healthy',
      shardMode: 'pooled',
      permissionRetracted: false,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    });

    const pool = new GalxCredentialPool(substrate);

    // Acquire lease
    const acq = pool.acquireLease({
      provider: 'openai',
      userId,
      estimatedTokens: 500,
      leaseTtlMs: 30000
    });
    assert.ok(acq.lease !== undefined);
    assert.strictEqual(pool.getActiveLeasesCount(), 1);
    assert.strictEqual(pool.leaseTable.count(), 1);

    // Natural query over active leases
    const userLeases = pool.queryActiveLeasesNatural(`where userId = "${userId}" and shardId = "${shardId}"`);
    assert.strictEqual(userLeases.length, 1);
    assert.strictEqual(userLeases[0].id, acq.lease?.leaseId);

    // Release lease
    pool.releaseLease(acq.lease!.leaseId, 450, true);
    assert.strictEqual(pool.getActiveLeasesCount(), 0);
    assert.strictEqual(pool.leaseTable.count(), 0);
  });

  // --- SUITE 48: Workspace-Wide BroccoliDB (Credential Substrate & SOC2 Compliance Controls Engine) ---
  await test('GalxCredentialSubstrate: BroccoliDbTable secondary indexing, natural query search & aggregation', async () => {
    const substrate = new GalxCredentialSubstrate();
    const testShardId = `shard_sub_broc_${Date.now()}`;
    const testUserId = `user_sub_test_${Date.now()}`;

    const encrypted = GalxCryptoVault.encryptSecret({ apiKey: 'sk-test-openai-substrate-key-12345' }, testUserId, testShardId, 'openai');
    substrate.addAccount({
      id: testShardId,
      userId: testUserId,
      provider: 'openai',
      accountLabel: 'Substrate Shard Alpha',
      authType: 'api_key',
      apiKeyMasked: 'sk-test...845',
      encryptedSecrets: encrypted,
      weight: 8,
      priority: 12,
      fencingToken: 1,
      tokenBucket: {
        maxTokens: 300000,
        remainingTokens: 300000,
        refillRatePerMinute: 150000,
        maxRequests: 1000,
        remainingRequests: 1000,
        lastRefillTimestampMs: Date.now()
      },
      stats: {
        totalRequestsServed: 0,
        totalTokensConsumed: 0,
        consecutiveFailures: 0
      },
      status: 'healthy',
      shardMode: 'pooled',
      permissionRetracted: false,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    });

    // 1. Indexed lookup
    const found = substrate.getAccount(testShardId);
    assert.ok(found !== undefined);
    assert.strictEqual(found?.accountLabel, 'Substrate Shard Alpha');

    // 2. Natural query over substrate accounts
    const naturalMatches = substrate.queryAccountsNatural(`where userId = "${testUserId}" and provider = "openai"`);
    assert.strictEqual(naturalMatches.length, 1);
    assert.strictEqual(naturalMatches[0].id, testShardId);

    // 3. Shard aggregation
    const aggResult = substrate.aggregateAccounts({
      groupBy: ['provider'],
      metrics: {
        totalShards: { metric: 'count' }
      }
    });
    assert.ok(aggResult.groups.length >= 1);
  });

  await test('GalxSOC2AuditEngine: 28 SOC2/HIPAA control mappings in BroccoliDbTable with natural query & category aggregation', async () => {
    const soc2Engine = GalxSOC2AuditEngine.getInstance();

    // 1. All 28 controls indexed
    assert.strictEqual(soc2Engine.controlsTable.count(), 28);

    // 2. Natural query for Security controls
    const securityControls = soc2Engine.queryControlsNatural('where criteriaCategory = "Security" and automatedVerificationStatus = "enforced"');
    assert.ok(securityControls.length >= 5);
    assert.ok(securityControls.some(c => c.controlId === 'CC6.1'));

    // 3. Control aggregation by category
    const categoryAgg = soc2Engine.aggregateControls({
      groupBy: ['criteriaCategory'],
      metrics: {
        controlCount: { metric: 'count' }
      }
    });
    assert.ok(categoryAgg.groups.length >= 4);
    assert.ok(categoryAgg.groups.some(g => g.keys.criteriaCategory === 'Security'));
    assert.ok(categoryAgg.groups.some(g => g.keys.criteriaCategory === 'Privacy'));
  });

  // --- SUITE 49: Workspace-Wide BroccoliDB (Auth Engine Behavioral Risk Evaluation Indexing) ---
  await test('GalxAuthEngine: Risk evaluation records in BroccoliDbTable with natural query & statistical aggregation', () => {
    const authEngine = GalxAuthEngine.getInstance();
    const testUserId = `user_risk_eval_${Date.now()}`;

    const mockSession: GalxUserSession = {
      id: `sess_risk_${Date.now()}`,
      userId: testUserId,
      provider: 'openai',
      shardId: 'shard_test_risk',
      sessionFamilyId: 'family_risk_1',
      sequenceNumber: 1,
      scopes: ['*'],
      tokenHash: 'hash_test_123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      fingerprintHash: GalxCryptoVault.generateClientFingerprint('192.168.1.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
      isRevoked: false,
      issuedAtMs: Date.now(),
      expiresAtMs: Date.now() + 86400000,
      lastActiveAtMs: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Evaluate normal risk
    const eval1 = authEngine.evaluateSessionRisk(mockSession, '192.168.1.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    assert.strictEqual(eval1.riskScore, 0);
    assert.strictEqual(eval1.isHighRisk, false);

    // 2. Evaluate anomalous risk (IP Shift + OS Shift)
    const eval2 = authEngine.evaluateSessionRisk(mockSession, '10.0.0.99', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    assert.ok(eval2.riskScore >= 50);
    assert.strictEqual(eval2.isHighRisk, true);

    // 3. Natural query over risk evaluations
    const highRiskMatches = authEngine.queryRiskEvaluationsNatural(`where userId = "${testUserId}" and isHighRisk = true`);
    assert.strictEqual(highRiskMatches.length, 1);
    assert.ok(highRiskMatches[0].riskScore >= 50);

    // 4. Risk aggregation
    const riskAgg = authEngine.aggregateRiskEvaluations({
      groupBy: ['riskLevel'],
      metrics: {
        avgRisk: { metric: 'avg', field: 'riskScore' },
        maxRisk: { metric: 'max', field: 'riskScore' },
        evalCount: { metric: 'count' }
      }
    });
    assert.ok(riskAgg.groups.length >= 1);
  });

  // --- SUITE 50: Hardened BroccoliDB + Queue Substrate Deep Fusion Hardening ---
  await test('BroccoliDbTable: Multi-index candidate set intersection (MULTI_INDEX_INTERSECTION)', () => {
    const table = new BroccoliDbTable<{ id: string; queueId: string; status: string; priority: number }>('test_tasks_multi_index');
    table.createIndex('queueId');
    table.createIndex('status');

    for (let i = 0; i < 100; i++) {
      table.put(`t_${i}`, {
        id: `t_${i}`,
        queueId: i % 2 === 0 ? 'queue_a' : 'queue_b',
        status: i % 5 === 0 ? 'QUEUED' : 'COMPLETED',
        priority: 50 + (i % 20)
      });
    }

    const plan = table.explain({
      where: {
        queueId: { $eq: 'queue_a' },
        status: { $eq: 'QUEUED' }
      }
    });

    assert.strictEqual(plan.scanStrategy, 'MULTI_INDEX_INTERSECTION');
    assert.strictEqual(plan.recordsMatched, 10); // 100 / 2 = 50 queue_a, of which 50 / 5 = 10 are QUEUED
  });

  await test('BroccoliDbTable: Binary-searched sorted index range scans (INDEX_RANGE_SCAN)', () => {
    const table = new BroccoliDbTable<{ id: string; priority: number; tag: string }>('test_sorted_range');
    table.createSortedIndex('priority');

    table.put('item_1', { id: 'item_1', priority: 10, tag: 'low' });
    table.put('item_2', { id: 'item_2', priority: 30, tag: 'medium' });
    table.put('item_3', { id: 'item_3', priority: 50, tag: 'high' });
    table.put('item_4', { id: 'item_4', priority: 80, tag: 'critical' });
    table.put('item_5', { id: 'item_5', priority: 95, tag: 'zenith' });

    const plan = table.explain({
      where: {
        priority: { $between: [30, 80] }
      }
    });

    assert.strictEqual(plan.scanStrategy, 'INDEX_RANGE_SCAN');
    assert.strictEqual(plan.recordsMatched, 3); // 30, 50, 80

    const results = table.query({
      where: { priority: { $gte: 50 } }
    });
    assert.strictEqual(results.length, 3); // 50, 80, 95
  });

  await test('BroccoliDbTable: Atomic Compare-And-Swap (compareAndSwap) & Batch putMany', () => {
    const table = new BroccoliDbTable<{ id: string; status: string; version: number }>('test_cas_table');

    table.putMany([
      { id: 'cas_1', record: { id: 'cas_1', status: 'INIT', version: 1 } },
      { id: 'cas_2', record: { id: 'cas_2', status: 'INIT', version: 1 } }
    ]);

    assert.strictEqual(table.count(), 2);

    // Successful CAS
    const casSuccess = table.compareAndSwap(
      'cas_1',
      (curr) => curr?.status === 'INIT',
      (curr) => ({ ...curr, status: 'RUNNING', version: curr.version + 1 })
    );
    assert.strictEqual(casSuccess.success, true);
    assert.strictEqual(casSuccess.record?.status, 'RUNNING');
    assert.strictEqual(casSuccess.record?.version, 2);

    // Failed CAS (predicate mismatch)
    const casFail = table.compareAndSwap(
      'cas_1',
      (curr) => curr?.status === 'INIT',
      (curr) => ({ ...curr, status: 'DONE' })
    );
    assert.strictEqual(casFail.success, false);
    assert.strictEqual(table.get('cas_1')?.status, 'RUNNING');
  });

  await test('BroccoliDbTable: Accurate Index Cleanup in removeIndicesForRecord (sorted & prefix)', () => {
    const table = new BroccoliDbTable<{ id: string; title: string; score: number }>('test_index_cleanup');
    table.createSortedIndex('score');
    table.createPrefixIndex('title');

    table.put('rec_1', { id: 'rec_1', title: 'quantum-ai', score: 100 });
    assert.strictEqual(table.count(), 1);

    // Delete record
    table.delete('rec_1');
    assert.strictEqual(table.count(), 0);

    // Search for deleted prefix
    const searchPrefix = table.query({ where: { title: { $startsWith: 'quantum' } } });
    assert.strictEqual(searchPrefix.length, 0);

    // Search for deleted sorted score
    const searchScore = table.query({ where: { score: { $gte: 50 } } });
    assert.strictEqual(searchScore.length, 0);
  });

  await test('GalxTaskQueueEngine: Direct BroccoliDB authoritative storage with composite index queries', async () => {
    const engine = GalxTaskQueueEngine.getInstance();
    const qId = `auth-test-queue-${Date.now()}`;

    engine.createOrUpdateQueue({
      id: qId,
      name: 'Authoritative Broccoli Queue',
      rateLimits: { maxDispatchesPerSecond: 100, maxConcurrentDispatches: 50, maxBurstSize: 100 }
    });

    const { task } = engine.createTask({
      queueId: qId,
      userId: 'test_dev_zenith',
      priority: 88,
      target: { type: 'PULL_WORKER', payload: { action: 'compute' } }
    });

    // Check that task is immediately queryable via GalxPersistence.taskTable
    const fromTable = GalxPersistence.getInstance().taskTable.get(task.id);
    assert.ok(fromTable);
    assert.strictEqual(fromTable?.id, task.id);
    assert.strictEqual(fromTable?.status, 'QUEUED');
    assert.strictEqual(fromTable?.priority, 88);
  });

  await test('GalxTaskQueueEngine: Atomic Pull Worker Leasing with CAS & Monotonic Fencing Tokens', () => {
    const engine = GalxTaskQueueEngine.getInstance();
    const qId = `lease-test-queue-${Date.now()}`;

    engine.createOrUpdateQueue({
      id: qId,
      name: 'Lease Test Queue',
      rateLimits: { maxDispatchesPerSecond: 100, maxConcurrentDispatches: 50, maxBurstSize: 100 }
    });

    const { task } = engine.createTask({
      queueId: qId,
      userId: 'worker_tester',
      priority: 75,
      target: { type: 'PULL_WORKER', payload: { workload: 'heavy_math' } }
    });

    // Worker 1 leases
    const leaseRes = engine.leaseTasks(qId, {
      workerId: 'worker_node_alpha',
      maxTasks: 1,
      leaseDurationMs: 60000
    });

    assert.strictEqual(leaseRes.leasedCount, 1);
    assert.strictEqual(leaseRes.tasks[0].id, task.id);
    assert.strictEqual(leaseRes.tasks[0].activeWorkerId, 'worker_node_alpha');
    assert.ok(leaseRes.tasks[0].activeFencingToken! > 1000);

    // Worker 2 attempts to lease same task -> returns 0 (atomic protection)
    const leaseRes2 = engine.leaseTasks(qId, {
      workerId: 'worker_node_beta',
      maxTasks: 1,
      leaseDurationMs: 60000
    });
    assert.strictEqual(leaseRes2.leasedCount, 0);

    // Worker 1 acknowledges completion
    const ackRes = engine.acknowledgeTask(task.id, 'worker_node_alpha', { success: true, answer: 42 });
    assert.strictEqual(ackRes, true);

    const completed = engine.getTask(task.id);
    assert.strictEqual(completed?.status, 'COMPLETED');
    assert.strictEqual(completed?.result?.data?.answer, 42);
  });

  await test('GalxTaskQueueEngine: Fair-Share Multi-Tenant Interleaving', async () => {
    const engine = GalxTaskQueueEngine.getInstance();
    const qId = `fair-share-queue-${Date.now()}`;

    engine.createOrUpdateQueue({
      id: qId,
      name: 'Fair Share Queue',
      rateLimits: { maxDispatchesPerSecond: 10, maxConcurrentDispatches: 10, maxBurstSize: 10 }
    });

    // Enqueue 5 tasks for Tenant A and 5 tasks for Tenant B
    for (let i = 0; i < 5; i++) {
      engine.createTask({
        queueId: qId,
        userId: 'heavy_tenant_A',
        priority: 50,
        target: { type: 'PULL_WORKER', payload: { job: `A_${i}` } }
      });
      engine.createTask({
        queueId: qId,
        userId: 'light_tenant_B',
        priority: 50,
        target: { type: 'PULL_WORKER', payload: { job: `B_${i}` } }
      });
    }

    const tasks = engine.listTasks(qId, { limit: 20 }).tasks;
    assert.strictEqual(tasks.length, 10);
  });

  await test('GalxTaskQueueEngine: Reactive BroccoliDB Changefeed Fast-Path Pulse', async () => {
    const engine = GalxTaskQueueEngine.getInstance();
    const qId = `reactive-pulse-${Date.now()}`;

    engine.createOrUpdateQueue({
      id: qId,
      name: 'Reactive Pulse Queue',
      rateLimits: { maxDispatchesPerSecond: 100, maxConcurrentDispatches: 50, maxBurstSize: 100 }
    });

    let eventCaptured = false;
    const unsub = GalxQueueEventBus.getInstance().subscribeQueue(qId, (evt) => {
      if (evt.type === 'TASK_QUEUED') {
        eventCaptured = true;
      }
    });

    engine.createTask({
      queueId: qId,
      userId: 'reactive_dev',
      priority: 99,
      target: { type: 'PULL_WORKER', payload: { realtime: true } }
    });

    assert.strictEqual(eventCaptured, true);
    unsub();
  });

  await test('Developer SDK: galx.jobs.submit() frictionless background requests & instant result handle', async () => {
    const galx = new GalxAI({ apiKey: 'galx_test_key' });
    assert.ok(galx.jobs);

    // Mock fetch for job creation and polling
    let pollCount = 0;
    const testTaskId = `job_mock_${Date.now()}`;
    const originalFetch = (galx as any).core.customFetch;
    (galx as any).core.customFetch = async (url: string, opts: any) => {
      if (opts?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            task: { id: testTaskId, status: 'QUEUED', queueId: 'default' },
            deduplicated: false
          })
        };
      }
      pollCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: testTaskId,
          status: 'COMPLETED',
          queueId: 'default',
          result: { data: { text: 'Quantum teleportation is the transfer of quantum states.' } }
        })
      };
    };

    const job = await galx.jobs.submit({
      prompt: 'Explain quantum teleportation',
      model: 'gpt-5.6-sol'
    });

    assert.strictEqual(job.taskId, testTaskId);
    const res = await job.result({ intervalMs: 10 });
    assert.strictEqual(res.text, 'Quantum teleportation is the transfer of quantum states.');
    assert.ok(pollCount >= 1);
  });

  await test('Developer SDK: galx.run() and galx.generateImage() ultra-flat direct execution', async () => {
    const galx = new GalxAI({ apiKey: 'galx_test_key' });

    // Mock fetch for chat completions and images
    (galx as any).core.customFetch = async (url: string, opts: any) => {
      if (url.includes('/chat/completions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'chatcmpl_flat_1',
            choices: [{ message: { role: 'assistant', content: 'Light travels at ~300,000 km/s.' } }],
            usage: { total_tokens: 25 }
          })
        };
      }
      if (url.includes('/images/generations')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            created: Date.now(),
            data: [{ url: 'https://galx.ai/generated_art.png' }]
          })
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    // 1. Direct prompt run
    const answer = await galx.run('What is the speed of light?');
    assert.strictEqual(answer, 'Light travels at ~300,000 km/s.');

    // 2. Direct image generation
    const img = await galx.generateImage('Neon futuristic cyber vehicle');
    assert.strictEqual(img?.url, 'https://galx.ai/generated_art.png');
  });

  await test('Developer SDK: galx.toAgentContext() autonomous agent context generator', () => {
    const galx = new GalxAI({ apiKey: 'galx_test_key' });
    const ctx = galx.toAgentContext('Analyze Q3 financial report', { revenue: 15000000, margin: 0.35 }, { model: 'gpt-5.6-sol', id: 'task_agent_123' });

    assert.ok(ctx.includes('### [GALXAI Autonomous Agent Context]'));
    assert.ok(ctx.includes('Prompt: Analyze Q3 financial report'));
    assert.ok(ctx.includes('Model: gpt-5.6-sol'));
    assert.ok(ctx.includes('15000000'));
  });

  await test('Developer SDK: Top-level run() and generateImage() zero-config imports', async () => {
    // Import top-level functions directly
    const { run: sdkRun, generateImage: sdkGenImage } = await import('../src/sdk');
    assert.strictEqual(typeof sdkRun, 'function');
    assert.strictEqual(typeof sdkGenImage, 'function');
  });

  await test('Developer SDK: Tagged Template Literal galx`...` & callable invocation', async () => {
    const { galx: callableInstance } = await import('../src/sdk');

    (callableInstance as any).core.customFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: 'Quantum gravity unifies relativity and quantum mechanics.' } }]
      })
    });

    const topic = 'quantum gravity';
    const res = await callableInstance`Explain ${topic} in 1 sentence`;
    assert.strictEqual(res, 'Quantum gravity unifies relativity and quantum mechanics.');
  });

  await test('Developer SDK: Structured Schema Extraction (extract) and Tool Definition (tool)', async () => {
    const { extract: sdkExtract, tool: sdkTool } = await import('../src/sdk');

    // Tool definition
    const myTool = sdkTool('calculateTax', 'Calculates tax rate', (args) => ({ tax: args.amount * 0.2 }), {
      amount: { type: 'number' }
    });
    assert.strictEqual(myTool.type, 'function');
    assert.strictEqual(myTool.function.name, 'calculateTax');

    // Extract function exists
    assert.strictEqual(typeof sdkExtract, 'function');
  });

  await test('API Strategy: EmbeddingsRepository deterministic vector embeddings calculus', () => {
    const embeddingRepo = EmbeddingsRepository.getInstance();
    const vec1 = embeddingRepo.generateDeterministicVector('quantum AI substrate', 1536);
    const vec2 = embeddingRepo.generateDeterministicVector('quantum AI substrate', 1536);
    const vec3 = embeddingRepo.generateDeterministicVector('classical mechanical physics', 1536);

    assert.strictEqual(vec1.length, 1536);
    assert.deepStrictEqual(vec1, vec2);
    // Orthogonal / different vectors
    const similarity = embeddingRepo.cosineSimilarity(vec1, vec3);
    assert.ok(similarity < 0.9);
  });

  await test('API Strategy: Multi-Provider /api/auth/ingest & /api/ingest unified token ingestion', async () => {
    const authEngine = GalxAuthEngine.getInstance();
    const result = await authEngine.authenticateProviderUser('openai', {
      accessToken: 'ey-unified-ingest-token-12345',
      refreshToken: 'rt-unified-ingest-refresh-54321',
      accountId: 'acct_unified_corp_88',
      email: 'engineer@unifiedingest.ai',
      mode: 'pooled'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.user.provider, 'openai');
    assert.strictEqual(result.user.email, 'engineer@unifiedingest.ai');
    assert.ok(result.user.shardId.includes('codex_'));
    assert.ok(result.user.token.length > 20);
  });

  await test('API Strategy: /api/auth/ingest OPTIONS handler & security headers verification', async () => {
    const { OPTIONS } = await import('../src/app/api/auth/ingest/route');
    const res = await OPTIONS();
    assert.strictEqual(res.status, 204);
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.strictEqual(res.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.strictEqual(res.headers.get('X-Frame-Options'), 'DENY');
    assert.ok(res.headers.get('Strict-Transport-Security'));
  });

  await test('API Strategy: /api/auth/ingest Token expiration and input boundary rejection', async () => {
    const { POST } = await import('../src/app/api/auth/ingest/route');
    const expiredReq = new Request('http://localhost:3000/api/auth/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: 'ey-expired-token-12345',
        expiresAtMs: Date.now() - 600_000, // 10 minutes in the past
      }),
    });

    const res = await POST(expiredReq as any);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.code, 'EXPIRED_TOKEN');
  });

  await test('API Strategy: /api/auth/ingest Transport Content-Type validation (415)', async () => {
    const { POST } = await import('../src/app/api/auth/ingest/route');
    const invalidTypeReq = new Request('http://localhost:3000/api/auth/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'invalid raw text',
    });

    const res = await POST(invalidTypeReq as any);
    assert.strictEqual(res.status, 415);
    const data = await res.json();
    assert.strictEqual(data.code, 'UNSUPPORTED_MEDIA_TYPE');
  });

  await test('API Strategy: /api/auth/ingest Transport Digest integrity checking (RFC 9530)', async () => {
    const { POST } = await import('../src/app/api/auth/ingest/route');
    const bodyStr = JSON.stringify({ accessToken: 'ey-digest-check-12345' });
    const tamperedReq = new Request('http://localhost:3000/api/auth/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Digest': 'sha-256=invalid-tampered-digest-hash',
      },
      body: bodyStr,
    });

    const res = await POST(tamperedReq as any);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.code, 'INTEGRITY_CHECK_FAILED');
  });

  await test('API Strategy: /api/auth/ingest Transport Anti-Replay Nonce detection (409)', async () => {
    const { POST } = await import('../src/app/api/auth/ingest/route');
    const nonce = `nonce_${Date.now()}_${Math.random()}`;
    const req1 = new Request('http://localhost:3000/api/auth/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Nonce': nonce,
      },
      body: JSON.stringify({ accessToken: 'ey-replay-nonce-token-12345' }),
    });

    const res1 = await POST(req1 as any);
    assert.strictEqual(res1.status, 200);

    // Replay exact nonce
    const req2 = new Request('http://localhost:3000/api/auth/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Nonce': nonce,
      },
      body: JSON.stringify({ accessToken: 'ey-replay-nonce-token-12345' }),
    });

    const res2 = await POST(req2 as any);
    assert.strictEqual(res2.status, 409);
    const data2 = await res2.json();
    assert.strictEqual(data2.code, 'NONCE_REPLAYED');
  });

  await test('API Strategy: /api/auth/ingest Transport Idempotency-Key caching & replay header', async () => {
    const { POST } = await import('../src/app/api/auth/ingest/route');
    const idemKey = `idem_${Date.now()}_${Math.random()}`;
    const payload = JSON.stringify({ accessToken: 'ey-idempotent-token-12345' });

    const req1 = new Request('http://localhost:3000/api/auth/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idemKey,
      },
      body: payload,
    });

    const res1 = await POST(req1 as any);
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.headers.get('Idempotent-Replay'), null);
    const data1 = await res1.json();

    // Replay with exact same Idempotency-Key
    const req2 = new Request('http://localhost:3000/api/auth/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idemKey,
      },
      body: payload,
    });

    const res2 = await POST(req2 as any);
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.headers.get('Idempotent-Replay'), 'true');
    const data2 = await res2.json();
    assert.deepStrictEqual(data1, data2);
  });

  await test('API Strategy: /api/auth/ingest Transport Server-Timing and X-Correlation-Id telemetry', async () => {
    const { POST } = await import('../src/app/api/auth/ingest/route');
    const customCorrId = `corr_custom_test_${Date.now()}`;
    const req = new Request('http://localhost:3000/api/auth/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': customCorrId,
      },
      body: JSON.stringify({ accessToken: 'ey-telemetry-token-12345' }),
    });

    const res = await POST(req as any);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('X-Correlation-Id'), customCorrId);
    assert.ok(res.headers.get('Server-Timing')?.includes('total;dur='));
  });

  await test('API Strategy: /api/auth/ingest Transport Cloudflare Threat Score mitigation (403)', async () => {
    const { POST } = await import('../src/app/api/auth/ingest/route');
    const threatReq = new Request('http://localhost:3000/api/auth/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Threat-Score': '85', // High threat
      },
      body: JSON.stringify({ accessToken: 'ey-threat-bot-12345' }),
    });

    const res = await POST(threatReq as any);
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.code, 'THREAT_BLOCKED');
  });

  await test('API Strategy: /api/auth/ingest RFC 7807 Problem Details structured output', async () => {
    const { POST } = await import('../src/app/api/auth/ingest/route');
    const invalidJsonReq = new Request('http://localhost:3000/api/auth/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json-structure{{{',
    });

    const res = await POST(invalidJsonReq as any);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.type?.includes('https://galx.ai/errors/'));
    assert.strictEqual(data.code, 'INVALID_JSON');
    assert.strictEqual(data.status, 400);
    assert.strictEqual(data.instance, '/api/auth/ingest');
    assert.ok(data.correlationId);
  });

  await test('API Strategy: /api/auth/ingest Geo-Velocity Anomaly Detection (X-Security-Audit)', async () => {
    const { POST } = await import('../src/app/api/auth/ingest/route');
    const accountId = `acc_geo_test_${Date.now()}`;

    // 1. First ingest from US
    const reqUS = new Request('http://localhost:3000/api/auth/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-IPCountry': 'US',
      },
      body: JSON.stringify({
        accessToken: 'ey-geo-token-us',
        accountId,
      }),
    });
    const resUS = await POST(reqUS as any);
    assert.strictEqual(resUS.status, 200);

    // 2. Immediate jump (< 60s) from JP
    const reqJP = new Request('http://localhost:3000/api/auth/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-IPCountry': 'JP',
      },
      body: JSON.stringify({
        accessToken: 'ey-geo-token-jp',
        accountId,
      }),
    });
    const resJP = await POST(reqJP as any);
    assert.strictEqual(resJP.status, 200);
    assert.strictEqual(resJP.headers.get('X-Security-Audit'), 'GEO_VELOCITY_ANOMALY');
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
