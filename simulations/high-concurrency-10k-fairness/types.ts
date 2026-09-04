/**
 * @file types.ts
 * @description High-Concurrency 100,000 QPS Multi-Tenant Fair Admission Types & Interfaces.
 * Mirrors industrial standards from Google Cloud Tasks, Google Cloud Run, AWS SQS FIFO,
 * Google SRE, LMAX Disruptor, and Netflix.
 */

export type PriorityTier = 'enterprise' | 'developer' | 'free';

export type QueueDiscipline = 'fifo' | 'lifo_overload';

export interface TenantConfig {
  id: string;
  tier: PriorityTier;
  quantumWeight: number;      // DRR quantum credits per round
  maxBurstCapacity: number;   // Immediate burst bucket depth
  rateLimitPerSec: number;    // Sustained token replenishment rate
  maxQueueDepth?: number;     // Bounded queue limit
  maxDispatchesPerSecond?: number; // Cloud Tasks Axis 1
  maxConcurrentDispatches?: number; // Cloud Tasks Axis 2
}

export interface ClientRequest {
  id: string;
  tenantId: string;
  prompt: string;
  promptHash: string;
  priorityTier: PriorityTier;
  deadlineMs: number;          // Maximum wait before client timeout / abort
  enqueuedAtMs: number;
  payloadSizeTokens: number;
  isCancelled?: boolean;
  signal?: AbortSignal;        // Standard cancellation context (Fetch/Node.js)
  idempotencyKey?: string;     // Stripe-style idempotency key for replay caching
  taskName?: string;           // Google Cloud Tasks named task deduplication
  groupId?: string;            // AWS SQS FIFO Message Group ID for sequential ordering
  dispatchDeadlineMs?: number; // Cloud Tasks dispatch execution deadline
  estimatedExecutionMs?: number; // SRE remaining budget calculation
  attemptCount?: number;       // Cloud Tasks retry count
  estimatedTokens?: number;    // Estimated total tokens for virtual weighting
  reasoningEffort?: 'low' | 'medium' | 'high'; // o1/o3 style reasoning effort
  isInteractive?: boolean;     // Interactive fast-track indicator (<10s)
  allowRelaxedMode?: boolean;  // Opt-in to opportunistic scavenger mode
  mlfqClass?: 0 | 1 | 2;       // 0: Fast-Track, 1: Deep Standard, 2: Relaxed Scavenger
}

export interface ShardCapacity {
  shardId: string;
  accountId: string;
  maxConcurrency: number;      // Cloud Run containerConcurrency hard limit
  softConcurrencyTarget?: number; // Cloud Run soft target for least-loaded routing
  inFlight: number;
  avgLatencyMs: number;
  ewmaLatencyMs?: number;      // Peak EWMA latency tracking
  isHealthy: boolean;
  cooldownUntilMs?: number;
  consecutiveFailures?: number; // Envoy Outlier Detection
}

export interface AdmissionResult {
  status:
    | 'admitted'
    | 'queued'
    | 'shed_overflow'
    | 'dropped_aged'
    | 'coalesced'
    | 'idempotent_hit'
    | 'cancelled'
    | 'deduplicated'
    | 'dlq_routed'
    | 'hedged_won'
    | 'shadow_handover_won'
    | 'client_aborted_rescued';
  queueLatencyMs: number;
  totalExecutionTimeMs?: number;
  executedByShardId?: string;
  retryAfterSec?: number;
  error?: string;
  wasCachedIdempotent?: boolean;
  wasHedged?: boolean;
  groupIdSequence?: number;
  isAttachedDuplicate?: boolean;
}

export interface CloudTasksConfig {
  maxDispatchesPerSecond: number;  // Axis 1
  maxConcurrentDispatches: number; // Axis 2
  maxBurstSize: number;
  minBackoffMs: number;
  maxBackoffMs: number;
  maxDoublings: number;
  maxAttempts: number;
  deduplicationTtlMs: number;
}

export interface CloudRunInstanceConfig {
  containerConcurrency: number;
  softConcurrencyTarget: number;
  ewmaAlpha: number;
  outlierFailureThreshold: number;
  baseEjectionDurationMs: number;
}

export interface DeadLetterTaskRecord {
  taskId: string;
  taskName?: string;
  tenantId: string;
  attempts: number;
  lastError: string;
  enqueuedAtMs: number;
  routedToDlqAtMs: number;
}

export interface AdaptiveConcurrencyConfig {
  minLimit: number;
  maxLimit: number;
  smoothingFactor: number;   // EWMA alpha (e.g. 0.2)
  toleranceBeta: number;     // Headroom beta added to gradient limit
  probeIntervalMs: number;
}

export interface AdaptiveConcurrencyState {
  currentLimit: number;
  minRttMs: number;
  smoothedRttMs: number;
  sampleCount: number;
  lastAdjustmentMs: number;
}

export interface ShuffleShardConfig {
  totalVirtualQueues: number;  // e.g. 32
  queuesPerTenant: number;     // e.g. 4 (C(32, 4) = 35,960 hash permutations)
  maxDepthPerQueue: number;
  overloadSojournThresholdMs: number; // Switch to LIFO if median wait exceeds this
}

export interface SimulationMetrics {
  totalSubmitted: number;
  admitted: number;
  coalesced: number;
  idempotentHits?: number;
  deduplicatedTasks?: number;  // Cloud Tasks task_name deduplications
  shedOverflow: number;
  droppedAged: number;
  completedSuccess: number;
  hedgedDispatches?: number;   // Finagle / SRE hedged requests fired
  hedgedWon?: number;          // Hedged backup requests that beat the primary
  dlqRouted?: number;          // Cloud Tasks poison pill tasks sent to DLQ
  groupIdSequenced?: number;   // SQS FIFO sequential group orderings
  zombieUpstreamExecutions: number;
  p50QueueLatencyMs: number;
  p90QueueLatencyMs: number;
  p99QueueLatencyMs: number;
  p999QueueLatencyMs?: number;
  throughputQps: number;
  tenantStats: Record<string, {
    submitted: number;
    completed: number;
    shed: number;
    aged: number;
    successRate: number;
  }>;
  cloudRunStats?: {
    totalInstances: number;
    peakInFlight: number;
    outlierEjections: number;
  };
  adaptiveConcurrency?: {
    initialLimit: number;
    finalLimit: number;
    minRttObservedMs: number;
    smoothedRttMs: number;
  };
  hybridStoreStats?: HybridStoreStats;
}

export interface PersistedTaskRecord {
  id: string;
  tenantId: string;
  taskName?: string;
  groupId?: string;
  promptHash: string;
  status: 'enqueued' | 'dispatching' | 'completed' | 'dropped_aged' | 'cancelled' | 'failed' | 'dlq';
  enqueuedAtMs: number;
  deadlineMs: number;
  dispatchedAtMs?: number;
  completedAtMs?: number;
  assignedShardId?: string;
  executionLatencyMs?: number;
  errorReason?: string;
  attemptCount: number;
}

export interface HybridStoreStats {
  totalTasksIndexed: number;
  activeEnqueued: number;
  completedTasks: number;
  idempotencyEntries: number;
  dlqEntries: number;
  shardRecords: number;
  bufferedTokenChunks?: number;
}

export type MlfqClass = 0 | 1 | 2; // 0: Interactive (<10s), 1: Deep Reasoning (30-90s), 2: Relaxed Scavenger (120-180s)

export interface JobTokenRecord {
  id: string;
  jobId: string;
  seqIndex: number;
  chunkText: string;
  isFinal: boolean;
  createdAtMs: number;
}

export interface EtaEstimate {
  queuePosition: number;
  estimatedWaitMs: number;
  estimatedWaitSec: number;
  activeThroughputEwma: number;
  activeShardsCount: number;
}

export interface ItlMetrics {
  totalTokensReceived: number;
  ttftMs: number;
  ewmaItlMs: number;
  p99ItlMs: number;
  isStalled: boolean;
  isThrottled: boolean;
  tokensPerSec: number;
}

export interface ShadowShardStats {
  totalShadowShards: number;
  warmHandoverCount: number;
  avgHandoverLatencyMs: number;
}

export interface AntiZombieSagaReport {
  jobId: string;
  shardId: string;
  disconnectedAtMs: number;
  wireAbortLatencyMs: number;
  gpuSecondsRescued: number;
  tokensAvoided: number;
  tokensRefunded: number;
}

export interface UnpredictableInferenceMetrics {
  fastTrackDispatches: number;
  deepTrackDispatches: number;
  relaxedTrackDispatches: number;
  fastTrackP99LatencyMs: number;
  deepTrackP99LatencyMs: number;
  ttftEjections: number;
  itlEjections: number;
  shadowHandovers: number;
  zombieClientsAborted: number;
  totalGpuSecondsRescued: number;
  resumableStreamReconnections: number;
  tokensServedFromBuffer: number;
  idempotentStreamAttachments: number;
}
