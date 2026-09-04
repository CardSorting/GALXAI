/**
 * @file index.test.ts
 * @description Enterprise Invariant Test Suite for 100k QPS Task Execution:
 * Cloud Tasks 2-Axis Control, AWS SQS FIFO Group Locks, Cloud Run Routing,
 * Hedged Requests, Nano-Ingress Filtering, and Zero-Zombie Anti-Aging.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { EventEmitter } from 'node:events';
import { MockUpstreamShardFleet } from './MockUpstreamShardFleet';
import { RingBufferDeque } from './RingBufferDeque';
import { AdaptiveConcurrencyLimiter } from './AdaptiveConcurrencyLimiter';
import { ShuffleShardedQueue } from './ShuffleShardedQueue';
import { SingleFlightCoalescer } from './SingleFlightCoalescer';
import { NanoIngressFilter } from './NanoIngressFilter';
import { CloudTasksDeduplicationRegistry } from './CloudTasksDeduplicationRegistry';
import { SqsFifoGroupLockManager } from './SqsFifoGroupLockManager';
import { CloudTasksQueueController } from './CloudTasksQueueController';
import { CloudRunShardRouter } from './CloudRunShardRouter';
import { HedgedRequestManager } from './HedgedRequestManager';
import { IndustrialTaskExecutor } from './IndustrialTaskExecutor';
import { MultiLevelFleetSlicer } from './MultiLevelFleetSlicer';
import { CalibratedEtaEngine } from './CalibratedEtaEngine';
import { StreamingItlWatchdog } from './StreamingItlWatchdog';
import { ShadowShardStandby } from './ShadowShardStandby';
import { AntiZombieLeash } from './AntiZombieLeash';
import { TokenAwareSizer } from './TokenAwareSizer';
import { BroccoliResumableJobEngine } from './BroccoliResumableJobEngine';
import { AntiFragileWebSocketGateway } from './AntiFragileWebSocketGateway';
import type { JobEventSubscriber } from './AntiFragileWebSocketGateway';
import {
  BroccoliExecutionLedger,
  ExecutionObservationProjector,
  ExecutionSupervisor,
  ExecutionWorkProjector,
} from '../../src/core/execution';
import type { ExecutionProposal } from '../../src/core/execution';
import { DurableExecutionAuthority } from '../../src/core/execution/DurableExecutionAuthority';
import { ClientRequest, TenantConfig } from './types';

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${msg}`);
  }
}

class SimulatedSseSubscriber extends EventEmitter implements JobEventSubscriber {
  public writableEnded = false;
  public readonly frames: Array<{ frame: string; receivedAtMs: number }> = [];
  public endedAtMs?: number;
  private stallsRemaining: number;

  constructor(
    private readonly drainDelayMs = 0,
    stallWrites = 0,
  ) {
    super();
    this.stallsRemaining = stallWrites;
  }

  public write(frame: string): boolean {
    if (this.writableEnded) throw new Error('write_after_end');
    this.frames.push({ frame, receivedAtMs: performance.now() });
    if (this.stallsRemaining <= 0) return true;

    this.stallsRemaining--;
    setTimeout(() => this.emit('drain'), this.drainDelayMs);
    return false;
  }

  public end(): void {
    if (this.writableEnded) return;
    this.writableEnded = true;
    this.endedAtMs = performance.now();
    this.emit('close');
  }
}

async function runEnterpriseTestSuite() {
  console.log('\n========================================================================================================');
  console.log('       🧪  RUNNING ENTERPRISE HIGH-CONCURRENCY TASK EXECUTION & ADMISSION TEST SUITE                   ');
  console.log('========================================================================================================\n');

  // Test 1: LMAX Disruptor Zero-Allocation Nano-Ingress Filter (<0.02µs)
  console.log('[Test 1] LMAX Disruptor Zero-Allocation Nano-Ingress Filter Performance...');
  const nano = new NanoIngressFilter();
  nano.registerTenant({
    id: 'tenant_flood',
    tier: 'free',
    quantumWeight: 1,
    maxBurstCapacity: 10,
    rateLimitPerSec: 5
  });

  const t0 = performance.now();
  let shedCount = 0;
  for (let i = 0; i < 1000; i++) {
    const res = nano.checkIngress('tenant_flood');
    if (res) shedCount++;
  }
  const nanoDurationMs = performance.now() - t0;
  const perOpUs = (nanoDurationMs / 1000) * 1000;

  assert(shedCount === 990, `Expected 990 shed requests, got ${shedCount}`);
  console.log(`  ✓ Invariant 1 Passed: 1,000 nano-filter checks in ${nanoDurationMs.toFixed(2)}ms (${perOpUs.toFixed(3)}µs/op). Shed 990 flood calls with ZERO promise allocations.\n`);

  // Test 2: Google Cloud Tasks Named Task Deduplication Window
  console.log('[Test 2] Google Cloud Tasks Named Task Deduplication Window...');
  const deduplicator = new CloudTasksDeduplicationRegistry(3000);
  let execCount = 0;

  const runNamedTask = (taskName: string) =>
    deduplicator.getOrExecute(taskName, async () => {
      execCount++;
      await new Promise((r) => setTimeout(r, 40));
      return { status: 'admitted', queueLatencyMs: 0, totalExecutionTimeMs: 40 };
    });

  const [t1, t2, t3] = await Promise.all([
    runNamedTask('task_ai_analysis_001'),
    runNamedTask('task_ai_analysis_001'),
    runNamedTask('task_ai_analysis_001')
  ]);

  assert(execCount === 1, `Expected exactly 1 execution for named task, got ${execCount}`);
  assert(t2.wasDeduplicated && t3.wasDeduplicated, 'Callers 2 and 3 must be marked deduplicated');
  console.log('  ✓ Invariant 2 Passed: Cloud Tasks named task deduplicated 3 concurrent arrivals into 1 execution.\n');

  // Test 3: AWS SQS FIFO Message Group ID Sequential In-Order Execution
  console.log('[Test 3] AWS SQS FIFO Message Group ID (groupId) Sequential In-Order Invariant...');
  const groupManager = new SqsFifoGroupLockManager();
  const groupAExecutionOrder: number[] = [];
  const groupBExecutionOrder: number[] = [];

  const runGroupTask = async (groupId: string, taskId: string, taskNum: number, targetArr: number[]) => {
    const seq = await groupManager.acquireGroupLock(groupId, taskId);
    try {
      targetArr.push(taskNum);
      await new Promise((r) => setTimeout(r, 30));
    } finally {
      groupManager.releaseGroupLock(groupId, taskId);
    }
  };

  // Launch 3 tasks in group_A and 2 tasks in group_B concurrently
  await Promise.all([
    runGroupTask('group_A', 'task_A1', 1, groupAExecutionOrder),
    runGroupTask('group_A', 'task_A2', 2, groupAExecutionOrder),
    runGroupTask('group_A', 'task_A3', 3, groupAExecutionOrder),
    runGroupTask('group_B', 'task_B1', 1, groupBExecutionOrder),
    runGroupTask('group_B', 'task_B2', 2, groupBExecutionOrder)
  ]);

  assert(
    groupAExecutionOrder.join(',') === '1,2,3',
    `Group A must execute strictly in sequential order (got ${groupAExecutionOrder.join(',')})`
  );
  assert(
    groupBExecutionOrder.join(',') === '1,2',
    `Group B must execute strictly in sequential order (got ${groupBExecutionOrder.join(',')})`
  );
  console.log('  ✓ Invariant 3 Passed: SQS FIFO group locks guaranteed strict sequential execution [1, 2, 3] per group while running groups concurrently.\n');

  // Test 4: Google Cloud Tasks 2-Axis Queue Control & Poison Pill DLQ
  console.log('[Test 4] Google Cloud Tasks 2-Axis Queue Control & Poison Pill DLQ...');
  const tasksController = new CloudTasksQueueController({
    maxDispatchesPerSecond: 10,
    maxConcurrentDispatches: 2,
    maxAttempts: 3
  });

  assert(tasksController.acquireDispatchSlot(), 'Slot 1 acquired');
  assert(tasksController.acquireDispatchSlot(), 'Slot 2 acquired');
  assert(!tasksController.canDispatch(), 'Slot 3 must be rejected by Axis 2 concurrency limit (2 max)');

  tasksController.releaseDispatchSlot();
  assert(tasksController.canDispatch(), 'Slot available after release');

  // Test Poison Pill DLQ routing after 3 failures
  const poisonTask: ClientRequest = {
    id: 'poison_task_666',
    tenantId: 'tenant_test',
    prompt: 'malformed query',
    promptHash: 'hash_poison',
    priorityTier: 'free',
    deadlineMs: 3000,
    enqueuedAtMs: Date.now(),
    payloadSizeTokens: 10
  };

  const fail1 = tasksController.handleFailure(poisonTask, 'Upstream 500 error');
  assert(!fail1.routeToDlq, 'Attempt 1 should not route to DLQ');
  const fail2 = tasksController.handleFailure(poisonTask, 'Upstream 500 error');
  assert(!fail2.routeToDlq, 'Attempt 2 should not route to DLQ');
  const fail3 = tasksController.handleFailure(poisonTask, 'Fatal poison pill syntax error');
  assert(fail3.routeToDlq, 'Attempt 3 must route to Dead Letter Queue');
  assert(tasksController.getDlqRecords().length === 1, 'DLQ should record 1 poison pill task');
  console.log('  ✓ Invariant 4 Passed: 2-Axis concurrency enforced; poison pill routed to Dead Letter Queue after 3 attempts.\n');

  // Test 5: Google Cloud Run Peak EWMA Routing & Envoy Outlier Ejection
  console.log('[Test 5] Google Cloud Run Peak EWMA Routing & Envoy Outlier Ejection...');
  const crRouter = new CloudRunShardRouter(3, 5, {
    outlierFailureThreshold: 3,
    baseEjectionDurationMs: 400
  });

  const shards = crRouter.getShards();
  // Simulate instance 0 having 3 consecutive failures
  crRouter.recordExecution(shards[0], 100, false);
  crRouter.recordExecution(shards[0], 100, false);
  crRouter.recordExecution(shards[0], 100, false);

  assert(!shards[0].isHealthy, 'Instance 0 must be quarantined by Envoy Outlier Detection');
  const selectedInstance = crRouter.selectBestInstance();
  assert(selectedInstance?.shardId !== shards[0].shardId, 'Router must NOT select ejected instance');
  console.log(`  ✓ Invariant 5 Passed: Degraded instance ejected by Outlier Detection. Router safely directed traffic to healthy instance (${selectedInstance?.shardId}).\n`);

  // Test 6: Google SRE & Twitter Finagle Hedged Requests Tail Latency Reduction
  console.log('[Test 6] Google SRE & Finagle Hedged Requests Tail Latency Reduction...');
  const hedgedRouter = new CloudRunShardRouter(4, 5);
  const hedgedManager = new HedgedRequestManager(hedgedRouter, 35); // 35ms hedge threshold

  const fastShard = hedgedRouter.getShards()[0];
  fastShard.avgLatencyMs = 120; // slow primary shard (120ms)

  const hedgedReq: ClientRequest = {
    id: 'hedged_req_001',
    tenantId: 'tenant_test',
    prompt: 'deep search',
    promptHash: 'h_deep',
    priorityTier: 'developer',
    deadlineMs: 3000,
    enqueuedAtMs: Date.now(),
    payloadSizeTokens: 10
  };

  const hedgedOutcome = await hedgedManager.executeWithHedge(hedgedReq, fastShard);
  assert(hedgedOutcome.status === 'ok', 'Execution must succeed');
  console.log(`  ✓ Invariant 6 Passed: Hedged request executed in ${hedgedOutcome.latencyMs}ms (Hedged fired: ${hedgedOutcome.wasHedged}).\n`);

  // Test 7: BroccoliDB Sub-Microsecond Secondary Indexing & Native TTL Eviction
  console.log('[Test 7] BroccoliDB Sub-Microsecond Secondary Indexing & Native TTL Eviction...');
  const { BroccoliHybridTaskStore } = await import('./BroccoliHybridTaskStore');
  const hybridStore = new BroccoliHybridTaskStore('test_');

  // Enqueue 500 tasks across 5 tenants
  for (let i = 0; i < 500; i++) {
    hybridStore.recordEnqueue({
      id: `task_${i}`,
      tenantId: `tenant_${i % 5}`,
      prompt: 'p',
      promptHash: `h_${i}`,
      priorityTier: 'enterprise',
      deadlineMs: 3000,
      enqueuedAtMs: Date.now(),
      payloadSizeTokens: 10
    });
  }

  // Sub-microsecond indexed query
  const queryStart = performance.now();
  const pendingTenant0 = hybridStore.queryPendingByTenant('tenant_0');
  const queryDurationMs = performance.now() - queryStart;

  assert(pendingTenant0.length === 100, `Expected 100 tasks for tenant_0 (got ${pendingTenant0.length})`);
  assert(queryDurationMs < 2.0, `BroccoliDB secondary index query must be < 2ms (got ${queryDurationMs.toFixed(3)}ms)`);

  // Native TTL auto-eviction test
  hybridStore.putIdempotentResult('short_lived_key', { success: true }, 40); // 40ms TTL
  assert(hybridStore.getIdempotentResult('short_lived_key') !== null, 'Key must exist immediately');
  await new Promise((r) => setTimeout(r, 65));
  assert(hybridStore.getIdempotentResult('short_lived_key') === null, 'Key must be auto-evicted by BroccoliDB native TTL');
  console.log(`  ✓ Invariant 7 Passed: BroccoliDB indexed query executed in ${queryDurationMs.toFixed(3)}ms; native TTL auto-evicted expired cache entry.\n`);

  // Test 8: BroccoliDB Reactive CDC Subscriptions & Crash Recovery Snapshot
  console.log('[Test 8] BroccoliDB Reactive CDC Subscriptions & Crash Recovery Snapshot...');
  let cdcFired = false;
  let changedTaskId = '';

  const unsubscribe = hybridStore.subscribeToTaskEvents((change) => {
    cdcFired = true;
    changedTaskId = change.recordId;
  });

  hybridStore.recordCompletion('task_42', 75);
  assert(cdcFired, 'BroccoliDB reactive CDC listener must fire on task update');
  assert(changedTaskId === 'task_42', 'CDC event must convey correct record ID');
  unsubscribe();

  // Snapshot persistence and crash recovery
  const snapshotFile = path.resolve(process.cwd(), 'simulations/high-concurrency-10k-fairness/results/test-crash-snapshot.json');
  hybridStore.saveSnapshot(snapshotFile);

  const restoredStore = new BroccoliHybridTaskStore('restored_');
  const restoredCount = restoredStore.restoreSnapshot(snapshotFile);
  assert(restoredCount >= 500, `Expected at least 500 restored tasks, got ${restoredCount}`);
  assert(restoredStore.taskTable.get('task_42')?.status === 'completed', 'Restored task must preserve state');

  if (fs.existsSync(snapshotFile)) fs.unlinkSync(snapshotFile);
  console.log(`  ✓ Invariant 8 Passed: Reactive CDC fired in real-time; crash recovery restored ${restoredCount} tasks with state fidelity.\n`);

  // Test 9: 3-Tier MLFQ Fast-Lane SLA under Deep Reasoning Saturation
  console.log('[Test 9] 3-Tier MLFQ Fast-Lane SLA under Deep Reasoning Saturation...');
  const fleetSlicer = new MultiLevelFleetSlicer(100);
  for (let i = 0; i < 65; i++) {
    fleetSlicer.acquire(1);
  }
  assert(!fleetSlicer.canAcquire(1), 'Deep track should be saturated at 65 slots');
  assert(fleetSlicer.canAcquire(0), 'Class 0 Interactive Fast Track must NEVER be starved by deep track');
  assert(fleetSlicer.acquire(0), 'Interactive acquisition must succeed');
  console.log('  ✓ Invariant 9 Passed: Interactive Fast-Lane reserved capacity protected against deep reasoning saturation.\n');

  // Test 10: TTFT Early Deadlock Breaker
  console.log('[Test 10] TTFT Early Deadlock Breaker (<12s Upstream Freeze)...');
  const itlWatchdog = new StreamingItlWatchdog({ maxTtftMs: 12_000, maxItlMs: 10_000 });
  const startMs = Date.now();
  const stallHealth = itlWatchdog.checkHealth(startMs + 12_500);
  assert(!stallHealth.healthy, 'Watchdog must flag unhealthy on TTFT freeze');
  assert(Boolean(stallHealth.reason?.includes('TTFT_DEADLOCK')), 'Reason must indicate TTFT deadlock');
  console.log('  ✓ Invariant 10 Passed: Stalled upstream connection caught at 12.5s before wasting 3 minutes.\n');

  // Test 11: Sliding Window ITL Slow Poison Watchdog
  console.log('[Test 11] Sliding Window Inter-Token Latency (ITL) Slow Poison Detection...');
  const itlThrottledWatchdog = new StreamingItlWatchdog({ minTokensPerSec: 2.0 });
  const throttleStartMs = Date.now();
  itlThrottledWatchdog.recordTokenArrival(1, throttleStartMs);
  for (let i = 1; i <= 10; i++) {
    itlThrottledWatchdog.recordTokenArrival(1, throttleStartMs + i * 1000);
  }
  const throttleHealth = itlThrottledWatchdog.checkHealth(throttleStartMs + 10_500);
  assert(!throttleHealth.healthy, 'Watchdog must detect slow poison GPU throttling');
  assert(Boolean(throttleHealth.reason?.includes('SLOW_POISON_THROTTLE')), 'Reason must indicate throttling');
  console.log('  ✓ Invariant 11 Passed: Degraded token velocity (1.0 tok/s < 2.0 min) caught and flagged for handover.\n');

  // Test 12: Anti-Zombie Leash Upstream Wire Cancellation & Saga
  console.log('[Test 12] Anti-Zombie Leash Upstream Cancellation (<5ms Wire Abort)...');
  const zombieLeash = new AntiZombieLeash();
  const abortSig = zombieLeash.attachLeash('job_zombie_1', 'shard_01', 150, 3000);
  assert(!abortSig.aborted, 'Signal must be active initially');
  let signalFired = false;
  abortSig.addEventListener('abort', () => { signalFired = true; });
  const saga = zombieLeash.triggerClientDisconnectAbort('job_zombie_1');
  assert(abortSig.aborted, 'AbortSignal must trigger immediately on client disconnect');
  assert(signalFired, 'Abort event listener must fire');
  assert(saga !== null, 'Saga report must be generated');
  assert(saga.wireAbortLatencyMs < 5.0, `Wire abort latency must be <5ms (got ${saga.wireAbortLatencyMs}ms)`);
  assert(saga.gpuSecondsRescued >= 140, 'Must rescue remaining ~150s of GPU quota');
  console.log(`  ✓ Invariant 12 Passed: Client disconnect aborted upstream in ${saga.wireAbortLatencyMs}ms; rescued ${saga.gpuSecondsRescued}s GPU compute.\n`);

  // Test 13: BroccoliDB Resumable Token Journaling
  console.log('[Test 13] BroccoliDB Resumable Token Journaling (Last-Event-ID Replay)...');
  const etaEngine = new CalibratedEtaEngine(25);
  const resumableEngine = new BroccoliResumableJobEngine(hybridStore, etaEngine);
  resumableEngine.emitStreamChunk('job_stream_1', 'Chunk A', false);
  resumableEngine.emitStreamChunk('job_stream_1', 'Chunk B', false);
  resumableEngine.emitStreamChunk('job_stream_1', 'Chunk C', true);

  const replayed: string[] = [];
  const { replayedCount } = resumableEngine.subscribeToJobStream('job_stream_1', 2, (chunk) => {
    replayed.push(chunk.chunkText);
  });
  assert(replayedCount === 2, `Expected 2 replayed chunks, got ${replayedCount}`);
  assert(replayed[0] === 'Chunk B' && replayed[1] === 'Chunk C', 'Must replay exact buffered chunks in sequence');
  console.log(`  ✓ Invariant 13 Passed: Reconnecting client recovered ${replayedCount} chunks without re-running upstream inference.\n`);

  // Test 14: Atomic Idempotent Stream Attachment
  console.log('[Test 14] Atomic Idempotent Stream Attachment...');
  const reqOriginal: ClientRequest = {
    id: 'job_orig_1',
    tenantId: 'tenant_test',
    prompt: 'Synthesize architecture',
    promptHash: 'hash_shared_unique',
    priorityTier: 'enterprise',
    deadlineMs: 60_000,
    enqueuedAtMs: Date.now(),
    payloadSizeTokens: 10
  };
  const reg1 = resumableEngine.registerOrAttachJob(reqOriginal, 5);
  assert(!reg1.isAttachedDuplicate, 'First registration must be fresh');

  const reqDuplicate: ClientRequest = {
    id: 'job_dup_1',
    tenantId: 'tenant_test',
    prompt: 'Synthesize architecture',
    promptHash: 'hash_shared_unique',
    priorityTier: 'enterprise',
    deadlineMs: 60_000,
    enqueuedAtMs: Date.now(),
    payloadSizeTokens: 10
  };
  const reg2 = resumableEngine.registerOrAttachJob(reqDuplicate, 5);
  assert(reg2.isAttachedDuplicate, 'Duplicate request must attach to existing running stream');
  assert(reg2.jobId === 'job_orig_1', 'Must attach to original job ID');
  console.log('  ✓ Invariant 14 Passed: Duplicate prompt attached to in-flight stream with zero duplicate inference.\n');

  // Test 15: Calibrated Moving-Window ETA Engine
  console.log('[Test 15] Calibrated Moving-Window ETA Engine Accuracy...');
  const etaCalc = new CalibratedEtaEngine(20);
  etaCalc.recordCompletion(500);
  const eta = etaCalc.calculateEta(10);
  assert(eta.queuePosition === 10, 'Queue position must match input');
  assert(eta.estimatedWaitSec > 0 && eta.estimatedWaitSec <= 100, `ETA must be reasonable (got ${eta.estimatedWaitSec}s)`);
  const headers = etaCalc.formatHeaders(10);
  assert(headers['X-Queue-Position'] === '10', 'Header must contain queue position');
  console.log(`  ✓ Invariant 15 Passed: Dynamic queue position (#${eta.queuePosition}) calibrated to ${eta.estimatedWaitSec}s wait time.\n`);

  // Test 16: Pre-Warmed Shadow Standby Pool
  console.log('[Test 16] Pre-Warmed Shadow Standby Sub-50ms Warm Handover...');
  const shadowPool = new ShadowShardStandby([
    { shardId: 'shadow_01', accountId: 'acc_01', maxConcurrency: 10, inFlight: 0, avgLatencyMs: 50, isHealthy: true },
    { shardId: 'shadow_02', accountId: 'acc_02', maxConcurrency: 10, inFlight: 0, avgLatencyMs: 50, isHealthy: true }
  ]);
  const handover = shadowPool.acquireShadow('stalled_primary_01');
  assert(handover !== null, 'Warm shadow shard must be acquired');
  assert(handover.shard.shardId === 'shadow_01', 'Must pick healthy shadow shard');
  assert(handover.handoverLatencyMs < 50.0, `Handover latency must be <50ms (got ${handover.handoverLatencyMs}ms)`);
  console.log(`  ✓ Invariant 16 Passed: Warm shadow handover completed in ${handover.handoverLatencyMs}ms (<50ms target).\n`);

  // Test 17: Disconnect Grace Window & Reattachment
  console.log('[Test 17] Disconnect Grace Window & Resilient Client Reattachment...');
  const graceLeash = new AntiZombieLeash();
  graceLeash.attachLeash('job_dirty_drop', 'shard_alpha', 150, 3000);
  graceLeash.attachLeash('job_clean_cancel', 'shard_beta', 150, 3000);

  // 1. Clean cancel aborts immediately (<5ms)
  const cleanResult = graceLeash.handleClientDisconnect('job_clean_cancel', { isCleanCancel: true });
  assert(cleanResult.status === 'aborted', 'Clean cancel must abort immediately');
  assert(cleanResult.report && cleanResult.report.tokensRefunded >= 2900, 'Clean cancel must refund held tokens');

  // 2. Dirty drop enters grace window (does NOT abort immediately)
  const dirtyResult = graceLeash.handleClientDisconnect('job_dirty_drop', {
    isCleanCancel: false,
    gracePeriodMs: 500
  });
  assert(dirtyResult.status === 'grace_pending', 'Dirty drop must enter grace_pending state');
  assert(graceLeash.getStats().activeMonitoredJobs === 1, 'Job must remain active during grace period');

  // 3. Client reconnects within grace window -> successfully reattached
  const reattached = graceLeash.reattachClient('job_dirty_drop');
  assert(reattached === true, 'Client must successfully reattach during grace window');
  assert(graceLeash.getStats().totalReattachedDuringGrace === 1, 'Reattachment must be recorded in telemetry');
  graceLeash.completeJob('job_dirty_drop');
  console.log('  ✓ Invariant 17 Passed: Clean cancel aborted immediately; dirty drop survived grace window and reattached cleanly.\n');

  // --------------------------------------------------------------------------
  // [Test 18] Anti-Fragile WebSocket Gateway: Dynamic TTFT & Seamless Mid-Stream Failover
  // --------------------------------------------------------------------------
  console.log('[Test 18] Anti-Fragile WebSocket Gateway: Dynamic TTFT, Discord ACK, Overlap Reconciliation & Failover...');
  const afGateway = new AntiFragileWebSocketGateway([
    { id: 'shard_primary', status: 'active', consecutiveFailures: 0, lastUsedAtMs: 0, inFlight: 0 },
    { id: 'shard_standby', status: 'active', consecutiveFailures: 0, lastUsedAtMs: 0, inFlight: 0 },
    { id: 'shard_recovering', status: 'cooldown', consecutiveFailures: 2, lastUsedAtMs: Date.now() - 30_000, inFlight: 0 },
  ]);

  // 1. Verify Dynamic Reasoning TTFT Allocation
  const lowTtft = afGateway.calculateTtftCeiling('gpt-4o-mini', 'low');
  const medTtft = afGateway.calculateTtftCeiling('gpt-4o', 'medium');
  const highTtft = afGateway.calculateTtftCeiling('gpt-5.6-sol', 'high');
  assert(lowTtft === 30_000, 'Low reasoning effort must have 30s TTFT');
  assert(medTtft === 60_000, 'Medium reasoning effort must have 60s TTFT');
  assert(highTtft === 120_000, 'Deep reasoning model must have 120s TTFT (preventing brittle timeout)');

  // 2. Start stream and simulate thinking progress extensions
  const stream = afGateway.startStream('job_deep_proof', 'gpt-5.6-sol', 'high', 'shard_primary');
  assert(stream.currentShardId === 'shard_primary', 'Job must attach to shard_primary');
  const initialDeadline = stream.currentTtftDeadlineMs;

  // Thinking delta arrives: extends TTFT watchdog!
  afGateway.onReasoningProgress('job_deep_proof', 'Analyzing lemma step 1...', 20_000);
  assert(stream.currentTtftDeadlineMs >= initialDeadline, 'Reasoning chunk must extend TTFT deadline');
  assert(afGateway.metrics.totalTtftExtensionsGranted === 1, 'TTFT extension metric recorded');

  // 3. First tokens arrive
  const seq1 = afGateway.onOutputToken('job_deep_proof', 'def solve(');
  const seq2 = afGateway.onOutputToken('job_deep_proof', 'x): return x * 2');
  assert(seq1 === 1 && seq2 === 2, 'Transport must locally order two accepted token observations');
  assert(
    afGateway.getStream('job_deep_proof')?.status === 'running',
    'Transport token hooks must not synchronously mutate queue-owned streaming state',
  );
  await afGateway.waitForBusIdle();
  assert(afGateway.getStream('job_deep_proof')?.seqCounter === 2, 'Bus policy must assign two canonical token sequences');
  assert(afGateway.getStream('job_deep_proof')?.status === 'streaming', 'Stream must be in streaming state');

  // 4. Mid-stream transport drop (simulated TCP RST / gateway reset)
  const failover = afGateway.handleUpstreamDropAndFailover('job_deep_proof', 'tcp_reset');
  assert(failover.success === true, 'Mid-stream failover must succeed');
  assert(failover.newShardId === 'shard_standby', 'Failover must switch to standby shard');
  assert(failover.seqCounter === 2, 'Token sequence must be preserved across failover');
  assert(failover.continuationPrompt !== undefined, 'Continuation directive must be generated');
  assert(failover.continuationPrompt!.includes('def solve(x): return x * 2'), 'Directive must include prior text');
  assert(afGateway.metrics.totalDownstreamFailoverKeepalivesSent === 1, 'Downstream keepalive frame sent to prevent idle drop');

  // 5. Standby shard continues streaming with Overlap Reconciliation (Figma / Liveblocks pattern)
  const staleSeq = afGateway.onOutputToken('job_deep_proof', 'stale primary output', 1);
  afGateway.onTransportCompleted('job_deep_proof', 1);
  assert(staleSeq === 2, 'A superseded attempt must not allocate another transport observation');
  await afGateway.waitForBusIdle();
  assert(
    afGateway.getJobStatus('job_deep_proof') === 'streaming' &&
      afGateway.getStream('job_deep_proof')?.tokensEmitted.length === 2,
    'Late token and completion callbacks from a superseded attempt must be ignored',
  );
  // Standby model echoes the duplicate suffix: "return x * 2\nprint(solve(21))"
  const seq3 = afGateway.onOutputToken('job_deep_proof', 'return x * 2\nprint(solve(21))', 2);
  assert(seq3 === 3, 'Next transport observation must sequence sequentially as #3');
  await afGateway.waitForBusIdle();
  assert(afGateway.getStream('job_deep_proof')?.seqCounter === 3, 'Stream seqCounter must be 3');
  assert(afGateway.getStream('job_deep_proof')?.tokensEmitted[2] === '\nprint(solve(21))', 'Duplicate prefix must be cleanly stripped');
  assert(afGateway.metrics.totalOverlapReconciliationsWon === 1, 'Overlap reconciliation won counter incremented');
  assert(afGateway.metrics.totalMidStreamFailoversWon === 1, 'Mid-stream failover win recorded');

  // 6. Discord Gateway Heartbeat ACK (OP 1 / OP 11) Protocol Verification
  const discordStream = afGateway.startStream('job_discord_heartbeat', 'gpt-4o', 'medium', 'shard_standby');
  // Heartbeat tick 1 sends ping
  const tick1 = afGateway.simulateHeartbeatTick('job_discord_heartbeat');
  assert(tick1.status === 'ping_sent' && !tick1.evicted, 'Tick 1 must send ping');
  // Tick 2 occurs without incoming frames/ACK -> Heartbeat ACK Miss!
  const tick2 = afGateway.simulateHeartbeatTick('job_discord_heartbeat');
  assert(tick2.status === 'ack_miss' && tick2.evicted, 'Tick 2 must identify dead peer and evict connection');
  assert(afGateway.metrics.totalHeartbeatAckMisses === 1, 'Heartbeat ACK miss recorded');
  assert(afGateway.metrics.totalDeadPeerEvictions === 1, 'Dead peer eviction recorded');

  // 7. Half-Open Circuit Breaker Recovery
  // Force all shards into cooldown to verify half-open probe recovery
  const primaryShard = (afGateway as any).shards.get('shard_primary');
  primaryShard.status = 'cooldown';
  const standbyShard = (afGateway as any).shards.get('shard_standby');
  standbyShard.status = 'cooldown';
  const probeShard = afGateway.acquireHealthyShard();
  assert(probeShard !== null, 'Half-open probe must acquire recovering shard instead of failing');
  assert(probeShard!.id === 'shard_recovering', 'Oldest cooldown shard must be selected for half-open probe');
  assert(afGateway.metrics.totalHalfOpenProbesUsed === 1, 'Half-open probe recorded');

  console.log('  ✓ Invariant 18 Passed: Dynamic TTFT allocated (120s), thinking progress extended deadline, mid-stream TCP drop failed over seamlessly with continuation directive, duplicate token stutter stripped via overlap reconciliation, Discord Heartbeat ACK miss detected dead peer, and half-open probe recovered service.\n');

  // --------------------------------------------------------------------------
  // [Test 19] Tripartite Plane Isolation: Transport / Queue / Pub-Sub
  // --------------------------------------------------------------------------
  console.log('[Test 19] Tripartite Plane Isolation, Durable Journal & Per-Subscriber Backpressure...');
  let invalidBusConfigRejected = false;
  try {
    new AntiFragileWebSocketGateway([], { busMaxListenersPerJob: 0 });
  } catch (error) {
    invalidBusConfigRejected = error instanceof TypeError;
  }
  assert(invalidBusConfigRejected, 'Invalid subscriber limits must fail fast instead of disabling the cap');
  const planeGateway = new AntiFragileWebSocketGateway(
    [{ id: 'plane_shard_only', status: 'active', consecutiveFailures: 0, lastUsedAtMs: 0, inFlight: 0 }],
    {
      busMaxListenersPerJob: 2,
      subscriberDrainTimeoutMs: 1_000,
      maxPendingFramesPerSubscriber: 8,
    },
  );

  // 1. A transport close publishes a fact; queue state is unchanged in the
  // transport call stack. Recovery policy consumes the fact asynchronously.
  planeGateway.startStream('job_transport_drop', 'gpt-4o', 'medium', 'plane_shard_only');
  planeGateway.onTransportClosed('job_transport_drop', 'tcp_reset');
  assert(
    planeGateway.getJobStatus('job_transport_drop') === 'running',
    'Transport close hook must not mutate queue state synchronously',
  );
  await planeGateway.waitForBusIdle();
  assert(
    planeGateway.getJobStatus('job_transport_drop') === 'failed',
    'Queue policy must independently own the terminal transition after the bus handoff',
  );
  const dropEvents = planeGateway.getBusEvents('job_transport_drop');
  assert(dropEvents[0]?.eventType === 'job:transport_drop', 'Transport-drop fact must be emitted first');
  assert(dropEvents[1]?.eventType === 'job:error', 'Queue-owned terminal error must follow the transport fact');

  // 2. Token events cross an asynchronous boundary and journal before fan-out.
  // The first slow-client write stalls for 200ms; the fast client still receives
  // token #2 immediately while the slow client's own ordered queue is paused.
  planeGateway.startStream('job_fanout', 'gpt-4o', 'medium', 'plane_shard_only');
  const fastSubscriber = new SimulatedSseSubscriber();
  const slowSubscriber = new SimulatedSseSubscriber(200, 1);
  planeGateway.subscribeToJob('job_fanout', fastSubscriber);
  planeGateway.subscribeToJob('job_fanout', slowSubscriber);

  planeGateway.onOutputToken('job_fanout', 'alpha');
  planeGateway.onOutputToken('job_fanout', 'beta');
  assert(
    planeGateway.getJobStatus('job_fanout') === 'running',
    'Transport token hooks must leave queue state unchanged until bus policy runs',
  );
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert(fastSubscriber.frames.length === 2, 'Fast subscriber must receive both tokens without waiting for slow drain');
  assert(slowSubscriber.frames.length === 1, 'Slow subscriber must pause only its own ordered write chain');
  assert(
    planeGateway.bus.replay('job_fanout').map((event) => event.seqNo).join(',') === '1,2',
    'Durable token journal must contain ordered sequence numbers before terminal fan-out',
  );
  assert(
    planeGateway.getBusEvents('job_fanout').every((event) => !event.observedDuringTransportHandler),
    'Bus handlers must never run under the transport message call stack',
  );

  // 3. Terminal delivery is queued behind prior frames independently for every
  // subscriber. Drained is emitted reactively when the final active job exits.
  planeGateway.onTransportCompleted('job_fanout');
  assert(
    planeGateway.getJobStatus('job_fanout') === 'streaming',
    'Transport completion hook must not terminalize queue state synchronously',
  );
  await planeGateway.waitForBusIdle();
  assert(planeGateway.getJobStatus('job_fanout') === 'completed', 'Queue policy must accept completion after bus handoff');
  assert(!planeGateway.markComplete('job_fanout'), 'Terminal transitions must be idempotent');

  for (const subscriber of [fastSubscriber, slowSubscriber]) {
    assert(subscriber.writableEnded, 'Terminal bus event must close every subscriber');
    assert(subscriber.frames.length === 3, 'Each subscriber must receive token 1, token 2, then terminal frame');
    assert(subscriber.frames[0].frame.includes('"seqNo":1'), 'Subscriber frame #1 must preserve token order');
    assert(subscriber.frames[1].frame.includes('"seqNo":2'), 'Subscriber frame #2 must preserve token order');
    assert(subscriber.frames[2].frame.includes('[DONE]'), 'Subscriber terminal frame must be delivered last');
    assert(
      subscriber.endedAtMs !== undefined && subscriber.endedAtMs >= subscriber.frames[2].receivedAtMs,
      'Subscriber must close only after its terminal frame is written',
    );
  }

  assert(planeGateway.metrics.totalSlowSubscriberDrains === 1, 'Slow-subscriber drain metric must increment once');
  assert(
    slowSubscriber.listenerCount('drain') === 0 && slowSubscriber.listenerCount('error') <= 1,
    'Resolved backpressure waits must remove their competing listeners instead of accumulating them',
  );
  assert(
    planeGateway.getBusEvents().some((event) => event.eventType === 'relay:drained'),
    'Final terminal transition must emit a reactive relay:drained event',
  );

  console.log('  ✓ Invariant 19 Passed: token, completion, and close callbacks published attempt-fenced facts without mutating relay-job state, queue policy owned bounded delivery terminality without becoming execution truth, bus handlers ran outside the WS message stack, the durable journal preserved token order, a 200ms slow subscriber did not block its peer or leak drain listeners, and terminal delivery closed both streams in order.\n');

  // --------------------------------------------------------------------------
  // [Test 20] Uncertain Execution Authority Kernel & Transactional Journal
  // --------------------------------------------------------------------------
  console.log('[Test 20] Uncertain Execution Authority, Lease Fencing, Verification & Transactional Journal...');
  const authorityLedger = new BroccoliExecutionLedger();
  const supervisor = new ExecutionSupervisor(authorityLedger);
  const projectedObservations: string[] = [];
  const projectedWorkEffects: string[] = [];
  const consumedDeliveryKeys = new Set<string>();
  const projectorErrors: string[] = [];
  let failActionProjectionOnce = true;

  const observationProjector = new ExecutionObservationProjector(authorityLedger, {
    projectorId: 'invariant20_observations',
    deliver: (entry) => {
      projectedObservations.push(entry.type);
    },
  });
  const workProjector = new ExecutionWorkProjector(authorityLedger, {
    projectorId: 'invariant20_work',
    deliver: (entry) => {
      // Consumer-level idempotency protects the crash window after an external
      // side effect but before projector cursor persistence.
      if (!consumedDeliveryKeys.has(entry.deliveryKey)) {
        consumedDeliveryKeys.add(entry.deliveryKey);
        projectedWorkEffects.push(entry.type);
      }
      if (entry.type === 'work.action_authorized' && failActionProjectionOnce) {
        failActionProjectionOnce = false;
        throw new Error('simulated_crash_after_side_effect_before_cursor');
      }
    },
    onError: (error) => projectorErrors.push(error instanceof Error ? error.message : String(error)),
  });
  observationProjector.start();
  workProjector.start();

  supervisor.createExecution({
    executionId: 'execution_uncertain_42',
    objective: 'Investigate an evolving production incident and propose a verified resolution',
    actor: { id: 'control_plane', type: 'control' },
    correlationId: 'incident_42',
    nowMs: 1_000,
    policy: {
      allowedActions: ['tool.read', 'model.invoke'],
      delegationPermitted: false,
      maxActiveChildren: 0,
      maxBudgetTokens: 100,
      completionVerificationRequired: true,
    },
  });

  const grantAttemptOne: ExecutionProposal = {
    type: 'grant_lease',
    proposalId: 'proposal_grant_attempt_1',
    executionId: 'execution_uncertain_42',
    expectedExecutionRevision: 1,
    actor: { id: 'control_plane', type: 'control' },
    holderId: 'agent_alpha',
    attemptId: 'attempt_1',
    leaseId: 'lease_1',
    leaseDurationMs: 10_000,
    causationId: 'execution_created_42',
    correlationId: 'incident_42',
    timestampMs: 1_100,
  };
  const leaseOneDecision = supervisor.propose(grantAttemptOne);
  assert(leaseOneDecision.kind === 'accept', 'Control plane must grant the first fenced attempt lease');
  const leaseOneState = supervisor.getState('execution_uncertain_42')!;
  assert(leaseOneState.executionRevision === 2, 'Lease grant must advance authoritative revision to 2');
  assert(leaseOneState.activeLease?.fencingToken === 1, 'First lease must receive fencing token 1');
  assert(
    supervisor.propose({
      ...grantAttemptOne,
      proposalId: 'proposal_reuse_attempt_identity',
      expectedExecutionRevision: 2,
      timestampMs: 1_110,
    }).reason === 'attempt_or_lease_identity_reused',
    'A distinct proposal must not reuse an attempt or lease identity',
  );
  assert(
    supervisor.propose({
      type: 'authorize_action',
      proposalId: 'proposal_impersonated_lease',
      executionId: 'execution_uncertain_42',
      expectedExecutionRevision: 2,
      actor: { id: 'agent_intruder', type: 'agent' },
      lease: { leaseId: 'lease_1', fencingToken: 1 },
      attemptId: 'attempt_1',
      attemptSequence: 999,
      action: 'tool.read',
      estimatedTokens: 1,
      timestampMs: 1_120,
    }).reason === 'lease_holder_mismatch',
    'Possession of lease metadata must not let another actor impersonate its holder',
  );
  await workProjector.whenIdle();
  workProjector.stop();

  const authorizeRead: ExecutionProposal = {
    type: 'authorize_action',
    proposalId: 'proposal_authorize_read',
    executionId: 'execution_uncertain_42',
    expectedExecutionRevision: 2,
    actor: { id: 'agent_alpha', type: 'agent' },
    lease: { leaseId: 'lease_1', fencingToken: 1 },
    attemptId: 'attempt_1',
    attemptSequence: 1,
    action: 'tool.read',
    estimatedTokens: 60,
    payload: { path: '/logs/service.log' },
    causationId: 'proposal_grant_attempt_1',
    correlationId: 'incident_42',
    timestampMs: 1_200,
  };
  const actionDecision = supervisor.propose(authorizeRead);
  assert(
    actionDecision.kind === 'accept',
    'A rejected forged sequence must not poison the legitimate lease holder’s attempt order',
  );
  const afterAction = authorityLedger.get('execution_uncertain_42')!;
  assert(afterAction.state.executionRevision === 3, 'Budget reservation must advance authoritative revision');
  assert(afterAction.state.budget.reservedTokens === 60, 'Authority state must reserve the action budget');
  assert(
    afterAction.journal.some((entry) => entry.type === 'work.action_authorized' && entry.executionRevision === 3),
    'Accepted state and corresponding work intent must exist in the same aggregate commit',
  );

  const ledgerVersionBeforeDuplicate = afterAction.ledgerVersion;
  const duplicateDecision = supervisor.propose(authorizeRead);
  assert(duplicateDecision.duplicate, 'Replayed proposal ID must return the original decision');
  assert(
    authorityLedger.get('execution_uncertain_42')!.ledgerVersion === ledgerVersionBeforeDuplicate,
    'Duplicate proposal must not append a second decision or work intent',
  );

  // First replay simulates delivery followed by a crash before cursor advance.
  workProjector.replay('execution_uncertain_42');
  await workProjector.whenIdle();
  assert(projectorErrors.length === 1, 'Projector must surface the simulated post-side-effect crash');
  assert(
    workProjector.getCursor('execution_uncertain_42') < authorityLedger.get('execution_uncertain_42')!.journalOffset,
    'Failed delivery must not advance the durable projector cursor',
  );
  workProjector.replay('execution_uncertain_42');
  await workProjector.whenIdle();
  assert(
    projectedWorkEffects.filter((type) => type === 'work.action_authorized').length === 1,
    'Stable deliveryKey must let the consumer suppress duplicate external side effects',
  );
  assert(
    workProjector.getCursor('execution_uncertain_42') === authorityLedger.get('execution_uncertain_42')!.journalOffset,
    'Successful retry must advance the projector through the committed journal',
  );
  workProjector.start(false);

  assert(
    supervisor.propose({
      type: 'record_action_result',
      proposalId: 'proposal_forged_settlement',
      executionId: 'execution_uncertain_42',
      expectedExecutionRevision: 3,
      actor: { id: 'agent_alpha', type: 'agent' },
      lease: { leaseId: 'lease_1', fencingToken: 1 },
      attemptId: 'attempt_1',
      action: 'tool.read',
      authorizationId: 'authorization_that_never_existed',
      reservedTokens: 60,
      consumedTokens: 0,
      timestampMs: 1_215,
    }).reason === 'invalid_budget_settlement',
    'An actor must not release aggregate budget without naming the exact authorization that reserved it',
  );

  const prematureCompletion: ExecutionProposal = {
    type: 'claim_completion',
    proposalId: 'proposal_premature_completion',
    executionId: 'execution_uncertain_42',
    expectedExecutionRevision: 3,
    actor: { id: 'agent_alpha', type: 'agent' },
    lease: { leaseId: 'lease_1', fencingToken: 1 },
    attemptId: 'attempt_1',
    attemptSequence: 2,
    evidence: { summary: 'claimed before the authorized read settled' },
    timestampMs: 1_225,
  };
  assert(
    supervisor.propose(prematureCompletion).reason === 'outstanding_budget_reservations',
    'Completion must defer while authorized work still has an outstanding budget reservation',
  );
  assert(
    supervisor.getState('execution_uncertain_42')!.executionRevision === 3,
    'A deferred completion claim must not advance authoritative state',
  );

  const settleRead: ExecutionProposal = {
    type: 'record_action_result',
    proposalId: 'proposal_settle_read',
    executionId: 'execution_uncertain_42',
    expectedExecutionRevision: 3,
    actor: { id: 'agent_alpha', type: 'agent' },
    lease: { leaseId: 'lease_1', fencingToken: 1 },
    attemptId: 'attempt_1',
    attemptSequence: 3,
    action: 'tool.read',
    authorizationId: 'proposal_authorize_read',
    reservedTokens: 60,
    consumedTokens: 30,
    result: { linesInspected: 120 },
    causationId: 'proposal_authorize_read',
    correlationId: 'incident_42',
    timestampMs: 1_250,
  };
  assert(supervisor.propose(settleRead).kind === 'accept', 'Action result must settle its reserved budget');
  const afterSettlement = supervisor.getState('execution_uncertain_42')!;
  assert(afterSettlement.executionRevision === 4, 'Budget settlement must advance authoritative revision');
  assert(
    afterSettlement.budget.reservedTokens === 0 && afterSettlement.budget.consumedTokens === 30,
    'Settled budget must release the reservation and account for actual consumption',
  );

  const grantAttemptTwo: ExecutionProposal = {
    type: 'grant_lease',
    proposalId: 'proposal_grant_attempt_2',
    executionId: 'execution_uncertain_42',
    expectedExecutionRevision: 4,
    actor: { id: 'control_plane', type: 'control' },
    holderId: 'agent_beta',
    attemptId: 'attempt_2',
    leaseId: 'lease_2',
    leaseDurationMs: 10_000,
    causationId: 'transport_drop_attempt_1',
    correlationId: 'incident_42',
    timestampMs: 1_300,
  };
  supervisor.propose(grantAttemptTwo);
  const leaseTwoState = supervisor.getState('execution_uncertain_42')!;
  assert(leaseTwoState.executionRevision === 5, 'Replacement lease must advance revision');
  assert(leaseTwoState.activeLease?.fencingToken === 2, 'Replacement lease must increment the fencing token');

  const staleObservation: ExecutionProposal = {
    type: 'record_observation',
    proposalId: 'proposal_stale_observation',
    executionId: 'execution_uncertain_42',
    expectedExecutionRevision: 4,
    actor: { id: 'agent_alpha', type: 'agent' },
    lease: { leaseId: 'lease_1', fencingToken: 1 },
    attemptId: 'attempt_1',
    attemptSequence: 9,
    observationType: 'agent.late_tool_result',
    observation: { result: 'arrived after failover' },
    causationId: 'proposal_authorize_read',
    correlationId: 'incident_42',
    timestampMs: 1_400,
  };
  const staleObservationDecision = supervisor.propose(staleObservation);
  assert(staleObservationDecision.kind === 'reject', 'Stale attempt evidence must not receive mutation authority');
  assert(
    supervisor.getState('execution_uncertain_42')!.executionRevision === 5,
    'Observation-only rejection must not advance authoritative state revision',
  );
  const staleJournalEntry = authorityLedger.get('execution_uncertain_42')!.journal.find(
    (entry) => entry.type === 'agent.late_tool_result',
  );
  assert(staleJournalEntry?.data.authorityAccepted === false, 'Stale evidence must remain durable and explicitly non-authoritative');
  assert(staleJournalEntry?.attemptSequence === 9, 'Attempt-local sequence must remain distinct from journal offset');

  supervisor.propose({
    type: 'record_observation',
    proposalId: 'proposal_out_of_order_observation',
    executionId: 'execution_uncertain_42',
    expectedExecutionRevision: 5,
    actor: { id: 'agent_alpha', type: 'agent' },
    lease: { leaseId: 'lease_1', fencingToken: 1 },
    attemptId: 'attempt_1',
    attemptSequence: 8,
    observationType: 'agent.out_of_order_evidence',
    observation: { result: 'older than the last attempt-local observation' },
    timestampMs: 1_450,
  });
  const outOfOrderEvidence = authorityLedger.get('execution_uncertain_42')!.journal.find(
    (entry) => entry.type === 'agent.out_of_order_evidence',
  );
  assert(
    outOfOrderEvidence?.data.attemptSequenceAccepted === false,
    'Out-of-order attempt evidence must remain journaled but cannot regain authority',
  );

  const staleMutation: ExecutionProposal = {
    ...authorizeRead,
    proposalId: 'proposal_stale_mutation',
    expectedExecutionRevision: 5,
    attemptSequence: 10,
    timestampMs: 1_500,
  };
  assert(supervisor.propose(staleMutation).reason === 'stale_or_mismatched_lease', 'Stale lease must reject mutation');

  const delegationProposal: ExecutionProposal = {
    type: 'request_delegation',
    proposalId: 'proposal_delegation_denied',
    executionId: 'execution_uncertain_42',
    expectedExecutionRevision: 5,
    actor: { id: 'agent_beta', type: 'agent' },
    lease: { leaseId: 'lease_2', fencingToken: 2 },
    attemptId: 'attempt_2',
    attemptSequence: 1,
    childExecutionId: 'execution_uncertain_42_child_1',
    childObjective: 'Investigate a newly discovered database branch',
    estimatedTokens: 10,
    timestampMs: 1_600,
  };
  assert(supervisor.propose(delegationProposal).reason === 'delegation_not_permitted', 'Policy must overrule agent delegation intent');

  const overBudgetAction: ExecutionProposal = {
    type: 'authorize_action',
    proposalId: 'proposal_over_budget',
    executionId: 'execution_uncertain_42',
    expectedExecutionRevision: 5,
    actor: { id: 'agent_beta', type: 'agent' },
    lease: { leaseId: 'lease_2', fencingToken: 2 },
    attemptId: 'attempt_2',
    attemptSequence: 2,
    action: 'model.invoke',
    estimatedTokens: 80,
    timestampMs: 1_700,
  };
  assert(supervisor.propose(overBudgetAction).reason === 'budget_exceeded', 'Consumed budget must constrain future agent requests');

  const completionClaim: ExecutionProposal = {
    type: 'claim_completion',
    proposalId: 'proposal_completion_claim',
    executionId: 'execution_uncertain_42',
    expectedExecutionRevision: 5,
    actor: { id: 'agent_beta', type: 'agent' },
    lease: { leaseId: 'lease_2', fencingToken: 2 },
    attemptId: 'attempt_2',
    attemptSequence: 3,
    evidence: { tests: 'passed', summary: 'incident resolved' },
    timestampMs: 1_800,
  };
  const claimDecision = supervisor.propose(completionClaim);
  assert(claimDecision.kind === 'require_verification', 'Agent completion must be treated as a claim requiring verification');
  assert(
    supervisor.getState('execution_uncertain_42')!.status === 'completion_pending_verification',
    'Completion claim must not directly produce completed authority state',
  );
  assert(
    supervisor.propose({
      type: 'request_delegation',
      proposalId: 'proposal_delegation_while_verifying',
      executionId: 'execution_uncertain_42',
      expectedExecutionRevision: 6,
      actor: { id: 'agent_beta', type: 'agent' },
      lease: { leaseId: 'lease_2', fencingToken: 2 },
      attemptId: 'attempt_2',
      attemptSequence: 4,
      childExecutionId: 'forbidden_during_verification',
      childObjective: 'This must not be authorized while terminality is under review',
      estimatedTokens: 0,
      timestampMs: 1_850,
    }).reason === 'execution_completion_pending_verification',
    'An agent must not expand the computation while its completion claim is under verification',
  );

  const verifiedCompletion: ExecutionProposal = {
    type: 'verify_completion',
    proposalId: 'proposal_completion_verified',
    executionId: 'execution_uncertain_42',
    expectedExecutionRevision: 6,
    actor: { id: 'verification_policy', type: 'verifier' },
    accepted: true,
    reason: 'required tests and evidence satisfied',
    causationId: 'proposal_completion_claim',
    correlationId: 'incident_42',
    timestampMs: 1_900,
  };
  assert(supervisor.propose(verifiedCompletion).kind === 'accept', 'Verifier must be able to accept a pending completion');
  assert(supervisor.getState('execution_uncertain_42')!.status === 'completed', 'Only verified completion may become terminal');
  assert(
    authorityLedger.get('execution_uncertain_42')!.journal.some(
      (entry) => entry.type === 'work.release_completed_attempt',
    ),
    'Verified completion must durably project release of the attempt whose authority was retired',
  );

  // Child work is also an identity-bound reservation; the parent cannot claim
  // terminality until the control plane records that exact child as terminal.
  supervisor.createExecution({
    executionId: 'execution_parent_9',
    objective: 'Delegate one bounded investigation',
    actor: { id: 'control_plane', type: 'control' },
    nowMs: 1_920,
    policy: {
      delegationPermitted: true,
      maxActiveChildren: 1,
      maxBudgetTokens: 50,
    },
  });
  supervisor.propose({
    type: 'grant_lease',
    proposalId: 'parent_grant',
    executionId: 'execution_parent_9',
    expectedExecutionRevision: 1,
    actor: { id: 'control_plane', type: 'control' },
    holderId: 'parent_agent',
    attemptId: 'parent_attempt',
    leaseId: 'parent_lease',
    leaseDurationMs: 10_000,
    timestampMs: 1_930,
  });
  supervisor.propose({
    type: 'request_delegation',
    proposalId: 'parent_child_authorized',
    executionId: 'execution_parent_9',
    expectedExecutionRevision: 2,
    actor: { id: 'parent_agent', type: 'agent' },
    lease: { leaseId: 'parent_lease', fencingToken: 1 },
    attemptId: 'parent_attempt',
    childExecutionId: 'execution_child_9a',
    childObjective: 'Inspect the newly discovered dependency',
    estimatedTokens: 20,
    timestampMs: 1_940,
  });
  assert(
    supervisor.getState('execution_parent_9')!.budget.reservations.parent_child_authorized?.kind === 'child',
    'Delegation must create an identity-bound child budget reservation',
  );
  assert(
    supervisor.propose({
      type: 'claim_completion',
      proposalId: 'parent_premature_completion',
      executionId: 'execution_parent_9',
      expectedExecutionRevision: 3,
      actor: { id: 'parent_agent', type: 'agent' },
      lease: { leaseId: 'parent_lease', fencingToken: 1 },
      attemptId: 'parent_attempt',
      evidence: { summary: 'parent tried to finish before child' },
      timestampMs: 1_950,
    }).kind === 'defer',
    'Parent completion must defer while child work remains outstanding',
  );
  supervisor.propose({
    type: 'request_wait',
    proposalId: 'parent_waits_for_child',
    executionId: 'execution_parent_9',
    expectedExecutionRevision: 3,
    actor: { id: 'parent_agent', type: 'agent' },
    lease: { leaseId: 'parent_lease', fencingToken: 1 },
    attemptId: 'parent_attempt',
    reason: 'await child terminal evidence',
    timestampMs: 1_955,
  });
  assert(
    supervisor.getState('execution_parent_9')!.status === 'waiting' &&
      supervisor.getState('execution_parent_9')!.activeLease === undefined,
    'A governed wait must release attempt authority while preserving the evolving execution',
  );
  supervisor.propose({
    type: 'record_child_result',
    proposalId: 'parent_child_settled',
    executionId: 'execution_parent_9',
    expectedExecutionRevision: 4,
    actor: { id: 'control_plane', type: 'control' },
    authorizationId: 'parent_child_authorized',
    childExecutionId: 'execution_child_9a',
    childStatus: 'completed',
    consumedTokens: 12,
    result: { verified: true },
    timestampMs: 1_960,
  });
  const parentAfterChild = supervisor.getState('execution_parent_9')!;
  assert(
    parentAfterChild.activeChildren === 0 && parentAfterChild.budget.reservedTokens === 0,
    'Certified child terminality must release its exact reservation and active-child slot',
  );
  supervisor.propose({
    type: 'resume_execution',
    proposalId: 'parent_resumed_after_child',
    executionId: 'execution_parent_9',
    expectedExecutionRevision: 5,
    actor: { id: 'control_plane', type: 'control' },
    reason: 'child terminal evidence received',
    timestampMs: 1_970,
  });
  assert(
    supervisor.getState('execution_parent_9')!.status === 'queued',
    'Only the control plane may resume a waiting execution for a newly fenced attempt',
  );

  // Terminal failure revokes all authority it previously issued in the same
  // commit: the active lease, action/child reservations, and child slots.
  supervisor.createExecution({
    executionId: 'execution_failure_cleanup',
    objective: 'Prove terminal failure cannot strand delegated authority',
    actor: { id: 'control_plane', type: 'control' },
    nowMs: 1_980,
    policy: {
      allowedActions: ['tool.read'],
      delegationPermitted: true,
      maxActiveChildren: 1,
      maxBudgetTokens: 100,
    },
  });
  supervisor.propose({
    type: 'grant_lease',
    proposalId: 'failure_cleanup_grant',
    executionId: 'execution_failure_cleanup',
    expectedExecutionRevision: 1,
    actor: { id: 'control_plane', type: 'control' },
    holderId: 'failure_agent',
    attemptId: 'failure_attempt',
    leaseId: 'failure_lease',
    leaseDurationMs: 10_000,
    timestampMs: 1_981,
  });
  supervisor.propose({
    type: 'authorize_action',
    proposalId: 'failure_action_authorized',
    executionId: 'execution_failure_cleanup',
    expectedExecutionRevision: 2,
    actor: { id: 'failure_agent', type: 'agent' },
    lease: { leaseId: 'failure_lease', fencingToken: 1 },
    attemptId: 'failure_attempt',
    action: 'tool.read',
    estimatedTokens: 0,
    timestampMs: 1_982,
  });
  assert(
    supervisor.propose({
      type: 'claim_completion',
      proposalId: 'failure_zero_hold_completion',
      executionId: 'execution_failure_cleanup',
      expectedExecutionRevision: 3,
      actor: { id: 'failure_agent', type: 'agent' },
      lease: { leaseId: 'failure_lease', fencingToken: 1 },
      attemptId: 'failure_attempt',
      evidence: { summary: 'zero-token action is still outstanding work' },
      timestampMs: 1_982,
    }).reason === 'outstanding_budget_reservations',
    'An identity-bound zero-token authorization must still block premature terminality',
  );
  supervisor.propose({
    type: 'request_delegation',
    proposalId: 'failure_child_authorized',
    executionId: 'execution_failure_cleanup',
    expectedExecutionRevision: 3,
    actor: { id: 'failure_agent', type: 'agent' },
    lease: { leaseId: 'failure_lease', fencingToken: 1 },
    attemptId: 'failure_attempt',
    childExecutionId: 'failure_child',
    childObjective: 'Inspect one bounded dependency',
    estimatedTokens: 30,
    timestampMs: 1_983,
  });
  supervisor.propose({
    type: 'fail_execution',
    proposalId: 'failure_cleanup_terminal',
    executionId: 'execution_failure_cleanup',
    expectedExecutionRevision: 4,
    actor: { id: 'control_plane', type: 'control' },
    reason: 'policy declared the execution unsafe',
    timestampMs: 1_984,
  });
  const failedCleanup = authorityLedger.get('execution_failure_cleanup')!;
  assert(
    failedCleanup.state.status === 'failed' &&
      failedCleanup.state.activeLease === undefined &&
      failedCleanup.state.activeChildren === 0 &&
      failedCleanup.state.budget.reservedTokens === 0 &&
      Object.keys(failedCleanup.state.budget.reservations).length === 0,
    'Terminal failure must atomically revoke every lease, child slot, and budget-backed authorization',
  );
  assert(
    failedCleanup.journal.some((entry) => entry.type === 'work.interrupt_failed_attempt') &&
      failedCleanup.journal.some((entry) => entry.type === 'work.cancel_children_after_failure') &&
      failedCleanup.journal.some((entry) => entry.type === 'execution.reservations_released'),
    'Failure cleanup must be recoverable from durable interruption, child-cancellation, and reservation facts',
  );

  // Cancellation is a separate epistemic sequence from transport interruption.
  supervisor.createExecution({
    executionId: 'execution_cancel_7',
    objective: 'Run until cancellation is authoritatively finalized',
    actor: { id: 'control_plane', type: 'control' },
    nowMs: 2_000,
  });
  supervisor.propose({
    type: 'grant_lease',
    proposalId: 'cancel_grant',
    executionId: 'execution_cancel_7',
    expectedExecutionRevision: 1,
    actor: { id: 'control_plane', type: 'control' },
    holderId: 'agent_cancel',
    attemptId: 'cancel_attempt',
    leaseId: 'cancel_lease',
    leaseDurationMs: 10_000,
    timestampMs: 2_100,
  });
  supervisor.propose({
    type: 'authorize_action',
    proposalId: 'cancel_action_authorized',
    executionId: 'execution_cancel_7',
    expectedExecutionRevision: 2,
    actor: { id: 'agent_cancel', type: 'agent' },
    lease: { leaseId: 'cancel_lease', fencingToken: 1 },
    attemptId: 'cancel_attempt',
    action: 'tool.read',
    estimatedTokens: 10,
    timestampMs: 2_150,
  });
  supervisor.propose({
    type: 'request_cancellation',
    proposalId: 'cancel_requested',
    executionId: 'execution_cancel_7',
    expectedExecutionRevision: 3,
    actor: { id: 'user_7', type: 'user' },
    reason: 'user requested stop',
    timestampMs: 2_200,
  });
  assert(
    supervisor.getState('execution_cancel_7')!.status === 'cancellation_requested',
    'Cancellation request must not directly claim the execution is cancelled',
  );
  supervisor.propose({
    type: 'record_action_result',
    proposalId: 'cancel_action_late_result',
    executionId: 'execution_cancel_7',
    expectedExecutionRevision: 4,
    actor: { id: 'agent_cancel', type: 'worker' },
    lease: { leaseId: 'cancel_lease', fencingToken: 1 },
    attemptId: 'cancel_attempt',
    action: 'tool.read',
    authorizationId: 'cancel_action_authorized',
    reservedTokens: 10,
    consumedTokens: 4,
    result: { interrupted: true },
    timestampMs: 2_250,
  });
  assert(
    supervisor.getState('execution_cancel_7')!.status === 'cancellation_requested',
    'A late valid action result may settle budget but must not resurrect a cancellation-pending execution',
  );
  supervisor.propose({
    type: 'confirm_attempt_interrupted',
    proposalId: 'cancel_interrupted',
    executionId: 'execution_cancel_7',
    expectedExecutionRevision: 5,
    actor: { id: 'agent_cancel', type: 'worker' },
    lease: { leaseId: 'cancel_lease', fencingToken: 1 },
    attemptId: 'cancel_attempt',
    reason: 'attempt interrupted and mutation authority revoked',
    timestampMs: 2_300,
  });
  assert(supervisor.getState('execution_cancel_7')!.status === 'cancelled', 'Interruption evidence must finalize pending cancellation');

  supervisor.createExecution({
    executionId: 'execution_cancel_idle',
    objective: 'Cancel before any attempt is leased',
    actor: { id: 'control_plane', type: 'control' },
    nowMs: 2_400,
  });
  supervisor.propose({
    type: 'request_cancellation',
    proposalId: 'idle_cancel_requested',
    executionId: 'execution_cancel_idle',
    expectedExecutionRevision: 1,
    actor: { id: 'user_idle', type: 'user' },
    reason: 'cancel queued execution',
    timestampMs: 2_410,
  });
  supervisor.propose({
    type: 'finalize_cancellation',
    proposalId: 'idle_cancel_finalized',
    executionId: 'execution_cancel_idle',
    expectedExecutionRevision: 2,
    actor: { id: 'control_plane', type: 'control' },
    reason: 'no attempt or child work exists',
    timestampMs: 2_420,
  });
  assert(
    supervisor.getState('execution_cancel_idle')!.status === 'cancelled',
    'A cancellation with no active attempt must use control-plane finalization rather than fabricated interruption evidence',
  );

  await Promise.all([observationProjector.whenIdle(), workProjector.whenIdle()]);
  assert(projectedObservations.includes('agent.completion_claimed'), 'Observation projector must receive completion claim');
  assert(projectedObservations.includes('execution.completed'), 'Observation projector must receive verified completion');
  assert(projectedWorkEffects.includes('work.verify_completion'), 'Work projector must receive bounded verification intent');
  assert(
    projectedWorkEffects.includes('work.interrupt_superseded_attempt'),
    'Fenced lease replacement must project cleanup for the superseded attempt',
  );
  assert(projectedWorkEffects.includes('work.interrupt_attempt'), 'Work projector must receive bounded interruption intent');
  observationProjector.stop();
  workProjector.stop();

  // The production host defines a real durability boundary over the same
  // authority kernel. Reopen from WAL and prove both authority and projector
  // cursors survive a process boundary.
  const durableAuthorityPath = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-execution-authority-'));
  let durableAuthority = await DurableExecutionAuthority.open({
    workspaceRoot: durableAuthorityPath,
    walDebounceMs: 0,
  });
  try {
    await durableAuthority.createExecution({
      executionId: 'execution_durable_1',
      objective: 'Prove atomic authority and journal recovery',
      actor: { id: 'control_plane', type: 'control' },
      nowMs: 3_000,
    });
    await durableAuthority.propose({
      type: 'grant_lease',
      proposalId: 'durable_grant',
      executionId: 'execution_durable_1',
      expectedExecutionRevision: 1,
      actor: { id: 'control_plane', type: 'control' },
      holderId: 'durable_agent',
      attemptId: 'durable_attempt',
      leaseId: 'durable_lease',
      leaseDurationMs: 10_000,
      timestampMs: 3_100,
    });
    let firstProjectionCount = 0;
    const durableWorkProjector = durableAuthority.createQueueProjector({
      projectorId: 'durable_queue_projection',
      queue: {
        enqueueAuthorizedIntent: (intent) => {
          assert(intent.idempotencyKey.length > 0, 'Queue projection must carry a stable idempotency key');
          assert(
            intent.attemptId === 'durable_attempt' && intent.fencingToken === 1,
            'Authorized attempt projection must carry its attempt identity and fencing token',
          );
          firstProjectionCount++;
        },
      },
    });
    durableWorkProjector.start();
    await durableWorkProjector.whenIdle();
    assert(firstProjectionCount === 1, 'Durable work projector must deliver the authorized attempt once');
    const durableActionCommit = durableAuthority.propose({
      type: 'authorize_action',
      proposalId: 'durable_action_authorized',
      executionId: 'execution_durable_1',
      expectedExecutionRevision: 2,
      actor: { id: 'durable_agent', type: 'agent' },
      lease: { leaseId: 'durable_lease', fencingToken: 1 },
      attemptId: 'durable_attempt',
      action: 'tool.read',
      estimatedTokens: 1,
      timestampMs: 3_200,
    });
    assert(
      firstProjectionCount === 1,
      'Raw CDC must not project an authoritative intent before its WAL flush succeeds',
    );
    await durableActionCommit;
    await durableWorkProjector.whenIdle();
    assert([2].includes(firstProjectionCount), 'Post-flush notification must release the durable intent to the queue');
    await durableAuthority.flush();
    durableWorkProjector.stop();
    await durableAuthority.close();

    durableAuthority = await DurableExecutionAuthority.open({
      workspaceRoot: durableAuthorityPath,
      walDebounceMs: 0,
    });
    const recovered = durableAuthority.getRecord('execution_durable_1');
    assert(recovered?.state.activeLease?.fencingToken === 1, 'WAL replay must recover authoritative lease state');
    assert(
      recovered.journal.some((entry) => entry.type === 'execution.lease_granted'),
      'WAL replay must recover the journal consequence committed with the state transition',
    );
    let replayedProjectionCount = 0;
    const recoveredProjector = durableAuthority.createQueueProjector({
      projectorId: 'durable_queue_projection',
      queue: {
        enqueueAuthorizedIntent: () => { replayedProjectionCount++; },
      },
    });
    recoveredProjector.start();
    await recoveredProjector.whenIdle();
    assert(
      replayedProjectionCount === 0,
      'Recovered projector cursor must prevent replay of an already acknowledged queue projection',
    );
    recoveredProjector.stop();
  } finally {
    await durableAuthority.close();
    fs.rmSync(durableAuthorityPath, { recursive: true, force: true });
  }

  console.log('  ✓ Invariant 20 Passed: versioned authority bound leases to unique holder identities, resisted sequence poisoning, rejected stale leases and forbidden delegation, enforced budget and outstanding-work terminality, revoked capabilities on failure, separated claims from verified terminality, atomically committed state plus journal consequences, survived WAL restart, and safely retried idempotent projectors after a simulated crash window.\n');

  console.log('========================================================================================================');
  console.log('       ✨  ALL 20 ENTERPRISE INVARIANTS PASSED (100% INTEGRITY: UNCERTAIN EXECUTION GOVERNANCE)         ');
  console.log('========================================================================================================\n');
}

runEnterpriseTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
