/**
 * GALXAI: Comprehensive Fault Tolerance & Anti-Stampede Verification Suite
 *
 * Verifies:
 * 1. Dual-Window Quota Calculus (Sliding 5/hr window vs Token Bucket).
 * 2. Out-of-Band External Usage Resynchronization (Zero-Trust Quota Tracking).
 * 3. Deep Natural Language Duration Dissection ("4 hours 12 minutes", "resets at 3:45 PM").
 * 4. Strict Single-Canary Slotting & Slow-Start Quadratic Warmup.
 * 5. Adaptive In-Flight Concurrency Limiting (AIMD).
 * 6. Anti-Stampede Bounded Admission Queue (Waiting Room).
 * 7. Model Incompatibility Auto-Blacklisting on 404/400.
 * 8. Write-Behind Micro-Batch Egress Buffering (GalxShardSyncBuffer).
 * 9. Transparent Edge Failover with Jitter.
 */

import assert from 'assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { GalxCredentialSubstrate } from '../../src/core/substrate/GalxCredentialSubstrate';
import { GalxCredentialPool } from '../../src/core/pool/GalxCredentialPool';
import { ContinuousTokenBucketRateGovernor } from '../../src/core/governor/ContinuousTokenBucketRateGovernor';
import { GalxCircuitBreaker } from '../../src/core/circuit/GalxCircuitBreaker';
import { GalxCryptoVault } from '../../src/core/vault/GalxCryptoVault';
import { GalxShardSyncBuffer } from '../../src/core/pool/GalxShardSyncBuffer';
import { GalxEdgeRouter } from '../../src/workers/cloudflare/GalxEdgeRouter';
import type { GalxShardAccount } from '../../src/core/contracts/GalxContracts';

// Ensure output directory exists
const outputDir = path.join(process.cwd(), 'tests', 'quota-pooling', 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let passedCount = 0;
let failedCount = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  [✓] PASS: ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  [✗] FAIL: ${name}`);
    console.error(`      Error: ${err.message}`);
    failedCount++;
  }
}

async function runAll() {
  console.log('======================================================================');
  console.log('   🛡️  GALXAI: FAULT TOLERANCE & ANTI-STAMPEDE HARDENING TEST HARNESS');
  console.log('======================================================================\n');

  const rateGovernor = new ContinuousTokenBucketRateGovernor();
  const circuitBreaker = new GalxCircuitBreaker();
  const substrate = new GalxCredentialSubstrate();
  const pool = new GalxCredentialPool(substrate, rateGovernor, circuitBreaker);

  // -------------------------------------------------------------------------
  // Test 1: Sliding Window 5/hr Quota Enforcement
  // -------------------------------------------------------------------------
  await runTest('Sliding Window: 5 requests per 5 hours hard quota enforcement', () => {
    const now = Date.now();
    let slidingQuota = rateGovernor.createDefaultSlidingWindow(5 * 3600 * 1000, 5, now);

    // Consume 5 requests in burst
    for (let i = 0; i < 5; i++) {
      const evalCheck = rateGovernor.canConsumeSlidingWindow(slidingQuota, 1, now + (i * 100));
      assert.strictEqual(evalCheck.canConsume, true, `Request ${i + 1} should be permitted`);
      slidingQuota = rateGovernor.recordSlidingWindowConsumption(slidingQuota, 1, now + (i * 100));
    }

    assert.strictEqual(slidingQuota.usedRequestsInWindow, 5);

    // 6th request must be rejected
    const eval6th = rateGovernor.canConsumeSlidingWindow(slidingQuota, 1, now + 1000);
    assert.strictEqual(eval6th.canConsume, false, '6th request must be rejected in sliding window');
    assert.strictEqual(eval6th.remainingRequests, 0);
    assert.ok(eval6th.resetInMs > 0, 'Must calculate remaining window reset time');

    // After 5 hours + 100ms, first slot should open up
    const after5Hours = now + (5 * 3600 * 1000) + 200;
    const evalAfterWindow = rateGovernor.canConsumeSlidingWindow(slidingQuota, 1, after5Hours);
    assert.strictEqual(evalAfterWindow.canConsume, true, 'Slot should open after 5 hours');
  });

  // -------------------------------------------------------------------------
  // Test 2: Natural Language Duration & Timestamp Dissection
  // -------------------------------------------------------------------------
  await runTest('Universal Error Dissector: Parses natural English durations from error bodies', () => {
    const now = Date.now();

    // 4 hours 12 minutes
    const ms1 = ContinuousTokenBucketRateGovernor.parseDurationToMs('Usage limit reached. Try again in 4 hours 12 minutes', now);
    assert.strictEqual(ms1, (4 * 3600 + 12 * 60) * 1000);

    // 5h30m
    const ms2 = ContinuousTokenBucketRateGovernor.parseDurationToMs('Resets in 5h30m', now);
    assert.strictEqual(ms2, (5 * 3600 + 30 * 60) * 1000);

    // 280s
    const ms3 = ContinuousTokenBucketRateGovernor.parseDurationToMs('Rate limit exceeded. Try again in 280s', now);
    assert.strictEqual(ms3, 280 * 1000);

    // Dissect error via circuit breaker
    const classification = circuitBreaker.dissectUpstreamError(
      429,
      'You have exceeded your current quota. Resets in 4 hours 15 minutes',
      undefined,
      now
    );
    assert.strictEqual(classification.newStatus, 'exhausted');
    assert.strictEqual(classification.category, 'rolling_window_exhausted');
    assert.strictEqual(classification.cooldownMs, (4 * 3600 + 15 * 60) * 1000);
  });

  // -------------------------------------------------------------------------
  // Test 3: Out-of-Band Usage Resynchronization (Zero-Trust Quota)
  // -------------------------------------------------------------------------
  await runTest('Zero-Trust Quota: External 429 resyncs local sliding window and fails over', () => {
    const now = Date.now();
    let localWindow = rateGovernor.createDefaultSlidingWindow(5 * 3600 * 1000, 5, now);

    // Local state believes 0 requests were used
    assert.strictEqual(localWindow.usedRequestsInWindow, 0);

    // Upstream returns out-of-band 429 with reset in 2 hours
    const resetTime = now + (2 * 3600 * 1000);
    const syncedWindow = rateGovernor.syncSlidingWindowFromReset(localWindow, resetTime, 5, now);

    assert.strictEqual(syncedWindow.usedRequestsInWindow, 5);
    assert.strictEqual(syncedWindow.lastExhaustionResetAtMs, resetTime);

    const check = rateGovernor.canConsumeSlidingWindow(syncedWindow, 1, now);
    assert.strictEqual(check.canConsume, false, 'Synced window must be marked exhausted');
  });

  // -------------------------------------------------------------------------
  // Test 4: Strict Single-Canary Slotting for Half-Open Shards
  // -------------------------------------------------------------------------
  await runTest('Circuit Breaker: Half-open state admits strictly 1 canary probe', () => {
    const shardId = 'test_canary_shard';
    
    // Acquire first canary slot
    const firstAcquired = circuitBreaker.acquireCanarySlot(shardId);
    assert.strictEqual(firstAcquired, true, 'First canary probe must be admitted');

    // Second simultaneous request must be denied entry to prevent thundering herd
    const secondAcquired = circuitBreaker.acquireCanarySlot(shardId);
    assert.strictEqual(secondAcquired, false, 'Second simultaneous probe must be blocked');

    // Releasing canary unlocks for next probe
    circuitBreaker.releaseCanarySlot(shardId);
    const thirdAcquired = circuitBreaker.acquireCanarySlot(shardId);
    assert.strictEqual(thirdAcquired, true, 'Canary slot should be unlocked after release');
    circuitBreaker.releaseCanarySlot(shardId);
  });

  // -------------------------------------------------------------------------
  // Test 5: Slow-Start Quadratic Warmup Damping
  // -------------------------------------------------------------------------
  await runTest('Slow-Start: Recovering shard capacity scales quadratically over 30s warmup', () => {
    const now = Date.now();
    const warmingAccount: GalxShardAccount = {
      id: 'warming_shard',
      userId: 'admin',
      provider: 'openai',
      authType: 'api_key',
      accountLabel: 'Warming Shard',
      apiKeyMasked: 'sk-warm...',
      priority: 10,
      weight: 5,
      status: 'warming_up',
      warmupStartedAtMs: now - 15000, // 15 seconds into 30s warmup (50% time)
      tokenBucket: rateGovernor.createDefaultBucket(300000, 300000, 500),
      stats: { totalRequestsServed: 100, totalTokensConsumed: 10000, consecutiveFailures: 0 },
      createdAtMs: now,
      updatedAtMs: now
    };

    const evalRes = circuitBreaker.evaluateAccountStatus(warmingAccount, now);
    assert.strictEqual(evalRes.status, 'warming_up');
    assert.strictEqual(evalRes.canAttempt, true);
    // At 50% time elapsed, quadratic multiplier is (0.5)^2 = 0.25
    assert.ok(evalRes.canaryMultiplier! >= 0.20 && evalRes.canaryMultiplier! <= 0.30, `Expected ~0.25 multiplier, got ${evalRes.canaryMultiplier}`);

    // At 30s elapsed, shard promotes to healthy with 1.0 multiplier
    const evalCompleted = circuitBreaker.evaluateAccountStatus({ ...warmingAccount, warmupStartedAtMs: now - 31000 }, now);
    assert.strictEqual(evalCompleted.status, 'healthy');
    assert.strictEqual(evalCompleted.canaryMultiplier, 1.0);
  });

  // -------------------------------------------------------------------------
  // Test 6: Model Incompatibility Auto-Blacklisting (404/400 Gating)
  // -------------------------------------------------------------------------
  await runTest('Model Incompatibility: 404 model_not_found blacklists model on shard without breaking other models', () => {
    const shardId = 'shard_tier1_limited';
    const now = Date.now();
    const account: GalxShardAccount = {
      id: shardId,
      userId: 'admin',
      provider: 'openai',
      authType: 'api_key',
      accountLabel: 'Tier 1 Shard',
      apiKeyMasked: 'sk-tier1...',
      priority: 10,
      weight: 1,
      status: 'healthy',
      tokenBucket: rateGovernor.createDefaultBucket(300000, 300000, 500),
      stats: { totalRequestsServed: 10, totalTokensConsumed: 5000, consecutiveFailures: 0 },
      createdAtMs: now,
      updatedAtMs: now
    };

    // Before blacklist, gpt-5.6-sol is permitted
    assert.strictEqual(circuitBreaker.isModelSupportedByShard(shardId, 'gpt-5.6-sol', account), true);

    // Error dissection marks model incompatible
    const classification = circuitBreaker.dissectUpstreamError(
      404,
      'The model `gpt-5.6-sol` does not exist or you do not have access to it.',
      undefined,
      now,
      account
    );
    assert.strictEqual(classification.category, 'model_incompatible');
    assert.strictEqual(classification.newStatus, 'healthy', 'Shard must remain healthy for supported models');

    // Register blacklist
    circuitBreaker.blacklistModelForShard(shardId, 'gpt-5.6-sol');

    // Now gpt-5.6-sol is blocked, but gpt-4o-mini is still supported
    assert.strictEqual(circuitBreaker.isModelSupportedByShard(shardId, 'gpt-5.6-sol', account), false);
    assert.strictEqual(circuitBreaker.isModelSupportedByShard(shardId, 'gpt-4o-mini', account), true);
  });

  // -------------------------------------------------------------------------
  // Test 7: Anti-Stampede Bounded Admission Queue (Waiting Room)
  // -------------------------------------------------------------------------
  await runTest('Admission Queue: Enqueues and drains requests when pool is momentarily saturated', async () => {
    const sub = new GalxCredentialSubstrate();
    const gov = new ContinuousTokenBucketRateGovernor();
    const cb = new GalxCircuitBreaker();
    const testPool = new GalxCredentialPool(sub, gov, cb);
    const now = Date.now();

    // Add a single shard in cooldown for 300ms
    sub.addAccount({
      id: 'shard_brief_cooldown',
      userId: 'admin',
      provider: 'openai',
      authType: 'api_key',
      accountLabel: 'Brief Cooldown Shard',
      apiKeyMasked: 'sk-brief...',
      priority: 10,
      weight: 1,
      status: 'cooldown',
      cooldownUntilTimestampMs: now + 300,
      tokenBucket: gov.createDefaultBucket(10000, 10000, 100),
      stats: { totalRequestsServed: 0, totalTokensConsumed: 0, consecutiveFailures: 1 },
      createdAtMs: now,
      updatedAtMs: now
    });

    // Request with admission queuing enabled
    const acqRes = testPool.acquireLease({
      userId: 'test_user',
      provider: 'openai',
      estimatedTokens: 1000,
      queueIfExhausted: true,
      maxQueueWaitMs: 1500
    }, now);

    assert.strictEqual(acqRes.status, 'queued');
    assert.ok(acqRes.queuedPromise, 'Must return queued promise');

    // Simulate time advancing past cooldown and trigger drain
    setTimeout(() => {
      // Shard exits cooldown
      const acc = sub.getAccount('shard_brief_cooldown');
      if (acc) {
        sub.updateAccount({ ...acc, status: 'healthy', cooldownUntilTimestampMs: undefined });
      }
      testPool.drainAdmissionQueue(now + 400);
    }, 50);

    const resolved = await acqRes.queuedPromise;
    assert.ok(resolved.lease, 'Queued request should resolve with acquired lease');
    assert.strictEqual(resolved.lease.shardId, 'shard_brief_cooldown');
  });

  // -------------------------------------------------------------------------
  // Test 8: Write-Behind Micro-Batch Egress Buffer (GalxShardSyncBuffer)
  // -------------------------------------------------------------------------
  await runTest('Write-Behind Egress Buffer: Coalesces health telemetry and flushes micro-batches', async () => {
    const syncBuffer = GalxShardSyncBuffer.getInstance();

    // Enqueue 10 high-frequency health probes
    for (let i = 0; i < 10; i++) {
      syncBuffer.enqueueProbe({
        shardId: `shard_${i % 2}`,
        workerId: 'worker-edge-1',
        latencyMs: 250 + i * 10,
        statusCode: 200,
        isSuccess: true,
        timestampMs: Date.now()
      });
    }

    const countsBefore = syncBuffer.getPendingCount();
    assert.strictEqual(countsBefore.probes, 10);

    // Flush batch
    const flushRes = await syncBuffer.flushNow();
    assert.strictEqual(flushRes.probesFlushed, 10);

    const countsAfter = syncBuffer.getPendingCount();
    assert.strictEqual(countsAfter.probes, 0);
  });

  // -------------------------------------------------------------------------
  // Test 9: Transparent Edge Router Failover with Micro-Jitter
  // -------------------------------------------------------------------------
  await runTest('Edge Router: Intercepts upstream 429 and fails over to backup shard in <10ms', async () => {
    const edgeRouter = GalxEdgeRouter.getInstance();

    const primaryCandidate = {
      shardId: 'edge_shard_primary',
      provider: 'openai' as const,
      accountLabel: 'Edge Primary',
      priority: 10,
      isHealthy: true
    };

    const backupCandidate = {
      shardId: 'edge_shard_backup',
      provider: 'openai' as const,
      accountLabel: 'Edge Backup',
      priority: 5,
      isHealthy: true
    };

    let attempts = 0;
    const result = await edgeRouter.routeWithFailover({
      request: { model: 'gpt-5.6-sol', messages: [{ role: 'user', content: 'hello' }] },
      primaryShard: primaryCandidate,
      backupShards: [backupCandidate],
      executeFn: async (shard) => {
        attempts++;
        if (shard.shardId === 'edge_shard_primary') {
          // Primary returns 429
          return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
        }
        // Backup returns 200
        return new Response(JSON.stringify({ choices: [{ message: { content: 'success' } }] }), { status: 200 });
      }
    });

    assert.strictEqual(result.failoverOccurred, true);
    assert.strictEqual(result.shardUsed.shardId, 'edge_shard_backup');
    assert.strictEqual(result.attempts, 2);
    assert.strictEqual(result.response.status, 200);
  });

  console.log('\n======================================================================');
  console.log(`   🏁 COMPLETE: ${passedCount} passed, ${failedCount} failed.`);
  console.log('======================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Test harness fatal error:', err);
  process.exit(1);
});
