/**
 * GALXAI: CloudTasks & CloudRun Inspired Asynchronous Task Queue Contracts
 * High-concurrency background scheduling, HTTP push dispatching, worker pull leases, and DLQ topologies.
 */

import type { ChatCompletionRequest, ImageGenerationRequest, ProviderType } from './GalxContracts';

export type QueueState = 'RUNNING' | 'PAUSED' | 'DISABLED' | 'DRAINING';

export type TaskStatus =
  | 'QUEUED'
  | 'SCHEDULED'
  | 'WAITING_DEPENDENCIES' // Blocked waiting for parent DAG dependencies
  | 'DISPATCHING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'RETRYING'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DEAD_LETTERED';

export type DispatchTargetType = 'HTTP_PUSH' | 'INTERNAL_MODEL' | 'PULL_WORKER';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface QueueRateLimits {
  /** Maximum dispatches initiated per second (continuous token bucket) */
  readonly maxDispatchesPerSecond: number;
  /** Maximum concurrent dispatches actively running simultaneously */
  readonly maxConcurrentDispatches: number;
  /** Token bucket capacity for burst traffic allowances */
  readonly maxBurstSize: number;
}

export interface QueueRetryConfig {
  /** Maximum retry attempts before routing task to Dead-Letter Queue (DLQ) */
  readonly maxAttempts: number;
  /** Maximum total elapsed duration (ms) allowed for all retry attempts */
  readonly maxRetryDurationMs?: number;
  /** Initial exponential backoff delay (ms) */
  readonly minBackoffMs: number;
  /** Maximum backoff ceiling (ms) */
  readonly maxBackoffMs: number;
  /** Maximum exponential doublings of backoff */
  readonly maxDoublings?: number;
  /** Full randomized jitter multiplier (0.0 - 1.0) */
  readonly jitterFactor?: number;
}

export interface DeadLetterConfig {
  /** Target queue ID to forward dead-lettered tasks to */
  readonly targetQueueId?: string;
  /** Retention duration for dead letter records in milliseconds (default: 7 days) */
  readonly retentionMs?: number;
  /** Optional webhook notification URL when a task enters DLQ */
  readonly notificationWebhookUrl?: string;
}

export interface GalxTaskQueueConfig {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly state: QueueState;
  readonly rateLimits: QueueRateLimits;
  readonly retryConfig: QueueRetryConfig;
  readonly deadLetterConfig?: DeadLetterConfig;
  readonly defaultTenantMaxConcurrency?: number;
  readonly contentBasedDeduplication?: boolean;
  readonly defaultDeduplicationWindowMs?: number;
  readonly priorityAgingIntervalMs?: number; // Time in queue after which priority increases
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export interface HttpPushTarget {
  readonly type: 'HTTP_PUSH';
  readonly url: string;
  readonly method?: HttpMethod;
  readonly headers?: Record<string, string>;
  readonly body?: any;
  /** HMAC secret key used to compute X-Galx-Signature header */
  readonly hmacSecret?: string;
  /** Timeout in milliseconds before task is aborted and retried (default: 60,000ms, max: 900,000ms) */
  readonly timeoutMs?: number;
}

export interface InternalModelTarget {
  readonly type: 'INTERNAL_MODEL';
  readonly taskKind: 'chat_completion' | 'image_generation';
  readonly chatPayload?: ChatCompletionRequest;
  readonly imagePayload?: ImageGenerationRequest;
  readonly isPriorityUser?: boolean;
  /** Optional webhook callback URL where completion results are POSTed */
  readonly webhookCompletionUrl?: string;
  /** HMAC secret for completion webhook signing */
  readonly webhookHmacSecret?: string;
}

export interface PullWorkerTarget {
  readonly type: 'PULL_WORKER';
  readonly payload: any;
  readonly tag?: string;
}

export type TaskDispatchTarget = HttpPushTarget | InternalModelTarget | PullWorkerTarget;

export interface TaskAttemptRecord {
  readonly attemptNumber: number;
  readonly startedAtMs: number;
  readonly completedAtMs?: number;
  readonly durationMs?: number;
  readonly responseStatusCode?: number;
  readonly errorMessage?: string;
  readonly errorDetails?: any;
  readonly shardIdUsed?: string;
  readonly modelUsed?: string;
  readonly workerId?: string;
}

export interface TaskPipelineStep {
  readonly name: string;
  readonly target: TaskDispatchTarget;
  /** If true, step failure halts the pipeline */
  readonly required?: boolean;
}

export interface TaskProgressInfo {
  readonly percentage: number; // 0 - 100
  readonly message?: string;
  readonly currentStep?: string;
  readonly stepIndex?: number;
  readonly totalSteps?: number;
  readonly updatedAtMs: number;
  readonly logs?: string[];
}

export interface TaskProgressUpdate {
  readonly percentage: number;
  readonly message?: string;
  readonly currentStep?: string;
  readonly stepIndex?: number;
  readonly totalSteps?: number;
  readonly logLine?: string;
}

export interface CronScheduleConfig {
  readonly cronExpression?: string; // Standard 5-field cron or interval (e.g. '*/5 * * * *')
  readonly repeatEveryMs?: number;
  readonly maxExecutions?: number;
  readonly currentExecutionCount?: number;
}

export interface GalxTask {
  readonly id: string;
  readonly queueId: string;
  readonly userId: string;
  readonly idempotencyKey?: string;
  readonly tag?: string;
  readonly groupId?: string; // Strict FIFO sequential partitioning key
  readonly dependsOn?: string[]; // Parent task IDs that must complete first (DAG)
  readonly priority: number; // 1 - 100 (higher = priority)
  readonly target: TaskDispatchTarget;
  readonly pipelineSteps?: TaskPipelineStep[];
  readonly cronConfig?: CronScheduleConfig;
  readonly deadlineMs?: number; // Absolute wall-clock expiration timestamp
  readonly ttlMs?: number; // Duration in ms before expiration
  readonly contentBasedDeduplication?: boolean;
  readonly deduplicationWindowMs?: number;
  status: TaskStatus;
  scheduleTimeMs: number;
  createdAtMs: number;
  updatedAtMs: number;
  dispatchCount: number;
  responseCount: number;
  firstAttemptMs?: number;
  lastAttemptMs?: number;
  leaseExpiresAtMs?: number;
  activeWorkerId?: string;
  activeFencingToken?: number;
  parentTaskResults?: Record<string, any>; // Aggregated outputs from dependsOn parents
  progress?: TaskProgressInfo;
  activePipelineStepIndex?: number;
  pipelineStepResults?: Array<{ stepName: string; result: any; durationMs: number }>;
  attempts: TaskAttemptRecord[];
  result?: {
    statusCode?: number;
    data?: any;
    tokensUsed?: number;
    shardId?: string;
    modelUsed?: string;
    provider?: ProviderType;
    completedAtMs: number;
  };
  lastError?: {
    message: string;
    code?: string;
    statusCode?: number;
    isPermanent?: boolean;
    timestampMs: number;
  };
}

export interface CreateTaskOptions {
  id?: string;
  queueId?: string;
  userId?: string;
  idempotencyKey?: string;
  tag?: string;
  groupId?: string; // FIFO partition key
  dependsOn?: string[]; // DAG parent task IDs
  priority?: number;
  scheduleTimeMs?: number;
  delayMs?: number;
  deadlineMs?: number;
  ttlMs?: number;
  contentBasedDeduplication?: boolean;
  deduplicationWindowMs?: number;
  target: TaskDispatchTarget;
  pipelineSteps?: TaskPipelineStep[];
  cronConfig?: CronScheduleConfig;
}

export interface TaskLeaseRequest {
  readonly workerId: string;
  readonly maxTasks?: number;
  readonly leaseDurationMs?: number;
  readonly tagFilter?: string;
  readonly groupIdFilter?: string;
}

export interface TaskLeaseResult {
  readonly tasks: GalxTask[];
  readonly leasedCount: number;
  readonly leaseExpiresAtMs: number;
}

export interface QueueTelemetryStats {
  readonly queueId: string;
  readonly queueName: string;
  readonly state: QueueState;
  readonly pendingTasks: number;
  readonly scheduledTasks: number;
  readonly waitingDependenciesTasks: number;
  readonly runningTasks: number;
  readonly completedTasks: number;
  readonly retryingTasks: number;
  readonly deadLetteredTasks: number;
  readonly cancelledTasks: number;
  readonly expiredTasks: number;
  readonly totalTasksProcessed: number;
  readonly currentDispatchesPerSecond: number;
  readonly maxDispatchesPerSecond: number;
  readonly currentConcurrentDispatches: number;
  readonly maxConcurrentDispatches: number;
  readonly activeFifoGroupsCount: number;
  readonly averageExecutionDurationMs: number;
}

export interface BatchCreateTasksRequest {
  readonly tasks: CreateTaskOptions[];
}

export interface BatchCreateTasksResponse {
  readonly totalSubmitted: number;
  readonly createdCount: number;
  readonly deduplicatedCount: number;
  readonly tasks: GalxTask[];
  readonly errors?: Array<{ index: number; error: string }>;
}

export interface BulkRedriveRequest {
  readonly maxTasks?: number;
  readonly tag?: string;
  readonly userId?: string;
}

export interface BulkRedriveResponse {
  readonly redrivenCount: number;
  readonly taskIds: string[];
}

export interface BulkCancelRequest {
  readonly tag?: string;
  readonly userId?: string;
  readonly groupId?: string;
  readonly statusFilter?: TaskStatus;
}

export interface BulkCancelResponse {
  readonly cancelledCount: number;
  readonly taskIds: string[];
}

export type GalxQueueEventType =
  | 'TASK_CREATED'
  | 'TASK_QUEUED'
  | 'TASK_SCHEDULED'
  | 'TASK_WAITING_DEPENDENCIES'
  | 'TASK_DISPATCHING'
  | 'TASK_RUNNING'
  | 'TASK_PROGRESS'
  | 'TASK_COMPLETED'
  | 'TASK_RETRYING'
  | 'TASK_DEAD_LETTERED'
  | 'TASK_CANCELLED'
  | 'TASK_EXPIRED'
  | 'QUEUE_STATE_CHANGED';

export interface GalxQueueEvent {
  readonly eventId: string;
  readonly type: GalxQueueEventType;
  readonly queueId: string;
  readonly taskId?: string;
  readonly timestampMs: number;
  readonly data?: any;
}


