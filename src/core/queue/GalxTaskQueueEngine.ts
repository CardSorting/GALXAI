import * as crypto from 'node:crypto';
import type {
  GalxTaskQueueConfig,
  GalxTask,
  TaskStatus,
  CreateTaskOptions,
  TaskLeaseRequest,
  TaskLeaseResult,
  QueueTelemetryStats,
  BatchCreateTasksRequest,
  BatchCreateTasksResponse,
  QueueRetryConfig,
  TaskAttemptRecord,
  TaskProgressUpdate,
  CronScheduleConfig,
  BulkRedriveRequest,
  BulkRedriveResponse,
  BulkCancelRequest,
  BulkCancelResponse
} from '../contracts/GalxContracts';
import { GalxPersistence } from '../../lib/storage/GalxPersistence';
import { GalxModelRouter } from '../router/GalxModelRouter';
import { GalxSeatTierEngine } from '../subscription/GalxSeatTierEngine';
import { GalxQueueEventBus } from './GalxQueueEventBus';

interface DestinationCircuitBreakerState {
  consecutiveFailures: number;
  state: 'CLOSED' | 'OPEN';
  openUntilMs: number;
}

/**
 * Enterprise CloudTasks & CloudRun-Inspired Asynchronous Queue & Push/Pull Worker Substrate.
 * Fully backed by BroccoliDB L1 In-Memory Reactive Tables, Multi-Modal Secondary & Composite Indexing,
 * Atomic Compare-And-Swap (CAS) Leasing, Dynamic Priority Aging, and Real-Time Event Streams.
 */
export class GalxTaskQueueEngine {
  private static instance: GalxTaskQueueEngine;
  private readonly persistence: GalxPersistence;
  private readonly eventBus: GalxQueueEventBus;
  private readonly idempotencyMap = new Map<string, { taskId: string; expiresAtMs: number }>();
  private readonly inFlightPerQueue = new Map<string, number>();
  private readonly inFlightPerTenant = new Map<string, number>();
  private readonly inFlightGroups = new Map<string, string>(); // groupId -> active taskId
  private readonly dispatchTokensPerQueue = new Map<string, { tokens: number; lastRefillMs: number }>();
  private readonly destinationCircuitBreakers = new Map<string, DestinationCircuitBreakerState>();
  private isDispatcherRunning = false;
  private dispatcherTimer: NodeJS.Timeout | null = null;
  private leaseWatchdogTimer: NodeJS.Timeout | null = null;
  private fencingTokenCounter = 1000;
  private lastCreatedAtMs = 0;

  private constructor(
    persistence = GalxPersistence.getInstance(),
    eventBus = GalxQueueEventBus.getInstance()
  ) {
    this.persistence = persistence;
    this.eventBus = eventBus;
    this.initializeDefaultQueues();
    this.loadStateFromPersistence();
    this.setupReactiveBroccoliSubscription();
    this.startDispatcher();
  }

  public static getInstance(): GalxTaskQueueEngine {
    if (!GalxTaskQueueEngine.instance) {
      GalxTaskQueueEngine.instance = new GalxTaskQueueEngine();
    }
    return GalxTaskQueueEngine.instance;
  }

  /**
   * Initializes standard high-throughput default queues if not already existing.
   */
  private initializeDefaultQueues(): void {
    const now = Date.now();
    const defaults: GalxTaskQueueConfig[] = [
      {
        id: 'default',
        name: 'Default Universal Queue',
        description: 'General purpose asynchronous execution queue for AI completions and webhooks',
        state: 'RUNNING',
        rateLimits: {
          maxDispatchesPerSecond: 100,
          maxConcurrentDispatches: 50,
          maxBurstSize: 200
        },
        retryConfig: {
          maxAttempts: 5,
          maxRetryDurationMs: 86400000,
          minBackoffMs: 200,
          maxBackoffMs: 300000,
          maxDoublings: 8,
          jitterFactor: 0.25
        },
        deadLetterConfig: {
          targetQueueId: 'dead-letter',
          retentionMs: 7 * 86400000
        },
        defaultTenantMaxConcurrency: 20,
        priorityAgingIntervalMs: 10000,
        createdAtMs: now,
        updatedAtMs: now
      },
      {
        id: 'llm-batch',
        name: 'LLM High-Volume Batch Queue',
        description: 'Optimized queue for mass evaluation and agent turn processing without rate limit dropouts',
        state: 'RUNNING',
        rateLimits: {
          maxDispatchesPerSecond: 50,
          maxConcurrentDispatches: 30,
          maxBurstSize: 100
        },
        retryConfig: {
          maxAttempts: 5,
          maxRetryDurationMs: 86400000,
          minBackoffMs: 500,
          maxBackoffMs: 600000,
          maxDoublings: 8,
          jitterFactor: 0.3
        },
        deadLetterConfig: {
          targetQueueId: 'dead-letter'
        },
        defaultTenantMaxConcurrency: 15,
        priorityAgingIntervalMs: 15000,
        createdAtMs: now,
        updatedAtMs: now
      },
      {
        id: 'image-gen',
        name: 'Visual Synthesis Queue',
        description: 'Dedicated rate-managed queue for GPU-intensive image generations',
        state: 'RUNNING',
        rateLimits: {
          maxDispatchesPerSecond: 10,
          maxConcurrentDispatches: 10,
          maxBurstSize: 20
        },
        retryConfig: {
          maxAttempts: 3,
          maxRetryDurationMs: 43200000,
          minBackoffMs: 1000,
          maxBackoffMs: 300000,
          maxDoublings: 6,
          jitterFactor: 0.2
        },
        deadLetterConfig: {
          targetQueueId: 'dead-letter'
        },
        defaultTenantMaxConcurrency: 5,
        createdAtMs: now,
        updatedAtMs: now
      },
      {
        id: 'agent-swarms',
        name: 'Agent Swarm Micro-Task Queue',
        description: 'Ultra-low latency micro-dispatching queue for autonomous multi-agent swarms',
        state: 'RUNNING',
        rateLimits: {
          maxDispatchesPerSecond: 200,
          maxConcurrentDispatches: 100,
          maxBurstSize: 500
        },
        retryConfig: {
          maxAttempts: 5,
          maxRetryDurationMs: 86400000,
          minBackoffMs: 100,
          maxBackoffMs: 120000,
          maxDoublings: 8,
          jitterFactor: 0.2
        },
        deadLetterConfig: {
          targetQueueId: 'dead-letter'
        },
        defaultTenantMaxConcurrency: 50,
        priorityAgingIntervalMs: 5000,
        createdAtMs: now,
        updatedAtMs: now
      },
      {
        id: 'webhooks',
        name: 'Cloud Run HTTP Push Webhook Queue',
        description: 'Dispatches signed HTTP push events to serverless Cloud Run endpoints with HMAC-SHA256 signatures',
        state: 'RUNNING',
        rateLimits: {
          maxDispatchesPerSecond: 50,
          maxConcurrentDispatches: 25,
          maxBurstSize: 100
        },
        retryConfig: {
          maxAttempts: 5,
          maxRetryDurationMs: 86400000,
          minBackoffMs: 500,
          maxBackoffMs: 300000,
          maxDoublings: 8,
          jitterFactor: 0.25
        },
        deadLetterConfig: {
          targetQueueId: 'dead-letter'
        },
        defaultTenantMaxConcurrency: 20,
        createdAtMs: now,
        updatedAtMs: now
      },
      {
        id: 'dead-letter',
        name: 'Dead-Letter Queue (DLQ)',
        description: 'Holds exhausted and unresolvable tasks for inspection, diagnostic debugging, and manual re-drive',
        state: 'RUNNING',
        rateLimits: {
          maxDispatchesPerSecond: 10,
          maxConcurrentDispatches: 5,
          maxBurstSize: 20
        },
        retryConfig: {
          maxAttempts: 1,
          minBackoffMs: 60000,
          maxBackoffMs: 60000
        },
        createdAtMs: now,
        updatedAtMs: now
      }
    ];

    for (const q of defaults) {
      if (!this.persistence.queueTable.get(q.id)) {
        this.persistence.queueTable.put(q.id, q);
      }
    }
  }

  private loadStateFromPersistence(): void {
    const savedTasks = this.persistence.taskTable.getAll();
    const now = Date.now();

    for (const t of savedTasks) {
      if (t.idempotencyKey) {
        this.idempotencyMap.set(`${t.queueId}:${t.userId}:${t.idempotencyKey}`, {
          taskId: t.id,
          expiresAtMs: t.createdAtMs + (t.deduplicationWindowMs || 86400000)
        });
      }
      // If task was in DISPATCHING or RUNNING when restarted, reset to RETRYING
      if (t.status === 'DISPATCHING' || t.status === 'RUNNING') {
        const updated: GalxTask = {
          ...t,
          status: 'RETRYING',
          scheduleTimeMs: now + 1000,
          updatedAtMs: now
        };
        this.persistence.taskTable.put(t.id, updated);
      }
    }
  }

  /**
   * Sets up reactive event-driven wakeups directly from BroccoliDB changefeeds.
   */
  private setupReactiveBroccoliSubscription(): void {
    this.persistence.taskTable.subscribe((evt) => {
      if (evt.operation === 'INSERT' || evt.operation === 'UPDATE') {
        const status = evt.after?.status;
        if (status === 'QUEUED' || status === 'RETRYING' || status === 'SCHEDULED') {
          this.pulseDispatcher();
        }
      }
    });
  }

  // =========================================================================
  // QUEUE MANAGEMENT
  // =========================================================================

  public createOrUpdateQueue(config: Partial<GalxTaskQueueConfig> & { id: string; name: string }): GalxTaskQueueConfig {
    const existing = this.persistence.queueTable.get(config.id);
    const now = Date.now();

    const fullConfig: GalxTaskQueueConfig = {
      id: config.id,
      name: config.name,
      description: config.description ?? existing?.description ?? '',
      state: config.state ?? existing?.state ?? 'RUNNING',
      rateLimits: {
        maxDispatchesPerSecond: config.rateLimits?.maxDispatchesPerSecond ?? existing?.rateLimits.maxDispatchesPerSecond ?? 100,
        maxConcurrentDispatches: config.rateLimits?.maxConcurrentDispatches ?? existing?.rateLimits.maxConcurrentDispatches ?? 50,
        maxBurstSize: config.rateLimits?.maxBurstSize ?? existing?.rateLimits.maxBurstSize ?? 200
      },
      retryConfig: {
        maxAttempts: config.retryConfig?.maxAttempts ?? existing?.retryConfig.maxAttempts ?? 5,
        maxRetryDurationMs: config.retryConfig?.maxRetryDurationMs ?? existing?.retryConfig.maxRetryDurationMs ?? 86400000,
        minBackoffMs: config.retryConfig?.minBackoffMs ?? existing?.retryConfig.minBackoffMs ?? 200,
        maxBackoffMs: config.retryConfig?.maxBackoffMs ?? existing?.retryConfig.maxBackoffMs ?? 300000,
        maxDoublings: config.retryConfig?.maxDoublings ?? existing?.retryConfig.maxDoublings ?? 8,
        jitterFactor: config.retryConfig?.jitterFactor ?? existing?.retryConfig.jitterFactor ?? 0.25
      },
      deadLetterConfig: config.deadLetterConfig ?? existing?.deadLetterConfig,
      defaultTenantMaxConcurrency: config.defaultTenantMaxConcurrency ?? existing?.defaultTenantMaxConcurrency ?? 25,
      contentBasedDeduplication: config.contentBasedDeduplication ?? existing?.contentBasedDeduplication ?? false,
      defaultDeduplicationWindowMs: config.defaultDeduplicationWindowMs ?? existing?.defaultDeduplicationWindowMs ?? 86400000,
      priorityAgingIntervalMs: config.priorityAgingIntervalMs ?? existing?.priorityAgingIntervalMs ?? 10000,
      createdAtMs: existing?.createdAtMs ?? now,
      updatedAtMs: now
    };

    this.persistence.saveQueue(fullConfig);
    this.eventBus.emitEvent('QUEUE_STATE_CHANGED', fullConfig.id, undefined, { state: fullConfig.state });
    this.pulseDispatcher();
    return fullConfig;
  }

  public getQueue(queueId: string): GalxTaskQueueConfig | undefined {
    return this.persistence.queueTable.get(queueId);
  }

  public listQueues(): GalxTaskQueueConfig[] {
    return this.persistence.queueTable.getAll() as GalxTaskQueueConfig[];
  }

  public pauseQueue(queueId: string): boolean {
    const q = this.persistence.queueTable.get(queueId);
    if (!q) return false;
    const updated: GalxTaskQueueConfig = { ...q, state: 'PAUSED', updatedAtMs: Date.now() };
    this.persistence.saveQueue(updated);
    this.eventBus.emitEvent('QUEUE_STATE_CHANGED', queueId, undefined, { state: 'PAUSED' });
    return true;
  }

  public resumeQueue(queueId: string): boolean {
    const q = this.persistence.queueTable.get(queueId);
    if (!q) return false;
    const updated: GalxTaskQueueConfig = { ...q, state: 'RUNNING', updatedAtMs: Date.now() };
    this.persistence.saveQueue(updated);
    this.eventBus.emitEvent('QUEUE_STATE_CHANGED', queueId, undefined, { state: 'RUNNING' });
    this.pulseDispatcher();
    return true;
  }

  public drainQueue(queueId: string): boolean {
    const q = this.persistence.queueTable.get(queueId);
    if (!q) return false;
    const updated: GalxTaskQueueConfig = { ...q, state: 'DRAINING', updatedAtMs: Date.now() };
    this.persistence.saveQueue(updated);
    this.eventBus.emitEvent('QUEUE_STATE_CHANGED', queueId, undefined, { state: 'DRAINING' });
    return true;
  }

  public deleteQueue(queueId: string): boolean {
    if (queueId === 'default' || queueId === 'dead-letter') {
      throw new Error(`Cannot delete system queue: '${queueId}'`);
    }
    const existed = !!this.persistence.queueTable.get(queueId);
    if (existed) {
      this.persistence.deleteQueue(queueId);
    }
    return existed;
  }

  public purgeQueue(queueId: string, statusFilter?: string): number {
    const q = this.persistence.queueTable.get(queueId);
    if (!q) throw new Error(`Queue '${queueId}' does not exist.`);
    return this.persistence.purgeQueueTasks(queueId, statusFilter);
  }

  // =========================================================================
  // TASK INGESTION & CREATION (Strict Idempotency, DAGs, Deadlines & Dedup)
  // =========================================================================

  public createTask(options: CreateTaskOptions): { task: GalxTask; deduplicated: boolean } {
    const queueId = options.queueId || 'default';
    const queue = this.persistence.queueTable.get(queueId);
    if (!queue) {
      throw new Error(`Target queue '${queueId}' does not exist.`);
    }

    if (queue.state === 'DRAINING' && (options.priority ?? 50) < 90) {
      throw new Error(`Queue '${queueId}' is currently DRAINING and not accepting standard traffic.`);
    }

    const userId = options.userId || 'anonymous_developer';
    const now = Date.now();

    // Determine Idempotency / Content-Based Deduplication Key
    let dedupKey = options.idempotencyKey;
    const isContentDedup = options.contentBasedDeduplication ?? queue.contentBasedDeduplication ?? false;

    if (!dedupKey && isContentDedup) {
      const canonical = JSON.stringify(options.target);
      dedupKey = `content_${crypto.createHash('sha256').update(canonical).digest('hex')}`;
    }

    const dedupWindowMs = options.deduplicationWindowMs || queue.defaultDeduplicationWindowMs || 86400000;

    // Strict Deduplication Window Check
    if (dedupKey) {
      const fullDedupKey = `${queueId}:${userId}:${dedupKey}`;
      const existingRecord = this.idempotencyMap.get(fullDedupKey);
      if (existingRecord && existingRecord.expiresAtMs > now) {
        const existingTask = this.persistence.taskTable.get(existingRecord.taskId);
        if (existingTask) {
          return { task: existingTask, deduplicated: true };
        }
      }
    }

    const taskId = options.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let scheduleTimeMs = options.scheduleTimeMs
      ? options.scheduleTimeMs
      : options.delayMs
      ? now + options.delayMs
      : now;

    // Evaluate initial Cron schedule if configured
    if (options.cronConfig && !options.scheduleTimeMs && !options.delayMs) {
      const nextCronMs = this.calculateNextCronTimestampMs(options.cronConfig, now);
      if (nextCronMs) {
        scheduleTimeMs = nextCronMs;
      }
    }

    // Check DAG Parent Dependencies
    let initialStatus: TaskStatus = scheduleTimeMs > now + 50 ? 'SCHEDULED' : 'QUEUED';
    if (options.dependsOn && options.dependsOn.length > 0) {
      const allParentsCompleted = options.dependsOn.every(pId => {
        const p = this.persistence.taskTable.get(pId);
        return p && p.status === 'COMPLETED';
      });
      if (!allParentsCompleted) {
        initialStatus = 'WAITING_DEPENDENCIES';
      }
    }

    const deadlineMs = options.deadlineMs
      ? options.deadlineMs
      : options.ttlMs
      ? now + options.ttlMs
      : undefined;

    const taskCreatedAtMs = Math.max(now, this.lastCreatedAtMs + 1);
    this.lastCreatedAtMs = taskCreatedAtMs;

    const task: GalxTask = {
      id: taskId,
      queueId,
      userId,
      idempotencyKey: dedupKey,
      tag: options.tag ?? (options.target.type === 'PULL_WORKER' ? options.target.tag : undefined),
      groupId: options.groupId,
      dependsOn: options.dependsOn,
      priority: Math.min(100, Math.max(1, options.priority ?? 50)),
      target: options.target,
      pipelineSteps: options.pipelineSteps,
      cronConfig: options.cronConfig ? { ...options.cronConfig, currentExecutionCount: 0 } : undefined,
      deadlineMs,
      ttlMs: options.ttlMs,
      contentBasedDeduplication: isContentDedup,
      deduplicationWindowMs: dedupWindowMs,
      status: initialStatus,
      scheduleTimeMs,
      createdAtMs: taskCreatedAtMs,
      updatedAtMs: taskCreatedAtMs,
      dispatchCount: 0,
      responseCount: 0,
      attempts: [],
      progress: {
        percentage: 0,
        message: initialStatus === 'WAITING_DEPENDENCIES' ? 'Waiting for parent DAG task completion' : 'Task enqueued in substrate',
        updatedAtMs: now,
        logs: [`[${new Date(now).toISOString()}] Task created with status ${initialStatus}`]
      }
    };

    this.persistence.taskTable.put(task.id, task);

    if (dedupKey) {
      const fullDedupKey = `${queueId}:${userId}:${dedupKey}`;
      this.idempotencyMap.set(fullDedupKey, {
        taskId: task.id,
        expiresAtMs: now + dedupWindowMs
      });
    }

    this.eventBus.emitEvent(
      initialStatus === 'WAITING_DEPENDENCIES' ? 'TASK_WAITING_DEPENDENCIES' : initialStatus === 'SCHEDULED' ? 'TASK_SCHEDULED' : 'TASK_QUEUED',
      queueId,
      task.id,
      { status: task.status, priority: task.priority }
    );

    this.pulseDispatcher();
    return { task, deduplicated: false };
  }

  public createTasksBatch(batch: BatchCreateTasksRequest): BatchCreateTasksResponse {
    const createdTasks: GalxTask[] = [];
    const errors: Array<{ index: number; error: string }> = [];
    let createdCount = 0;
    let deduplicatedCount = 0;

    for (let i = 0; i < batch.tasks.length; i++) {
      try {
        const res = this.createTask(batch.tasks[i]);
        createdTasks.push(res.task);
        if (res.deduplicated) {
          deduplicatedCount++;
        } else {
          createdCount++;
        }
      } catch (err: any) {
        errors.push({ index: i, error: err.message || 'Task creation failed' });
      }
    }

    return {
      totalSubmitted: batch.tasks.length,
      createdCount,
      deduplicatedCount,
      tasks: createdTasks,
      ...(errors.length > 0 ? { errors } : {})
    };
  }

  public getTask(taskId: string): GalxTask | undefined {
    return this.persistence.taskTable.get(taskId);
  }

  public listTasks(
    queueId?: string,
    filter?: { status?: TaskStatus; tag?: string; groupId?: string; userId?: string; limit?: number; offset?: number }
  ): { tasks: GalxTask[]; totalCount: number } {
    const whereClause: Record<string, any> = {};
    if (queueId) whereClause.queueId = { $eq: queueId };
    if (filter?.status) whereClause.status = { $eq: filter.status };
    if (filter?.tag) whereClause.tag = { $eq: filter.tag };
    if (filter?.groupId) whereClause.groupId = { $eq: filter.groupId };
    if (filter?.userId) whereClause.userId = { $eq: filter.userId };

    let results = this.persistence.taskTable.query({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined
    }) as GalxTask[];

    results.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.createdAtMs - a.createdAtMs;
    });

    const totalCount = results.length;
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 100;
    const paged = results.slice(offset, offset + limit);

    return { tasks: paged, totalCount };
  }

  public cancelTask(taskId: string): boolean {
    const task = this.persistence.taskTable.get(taskId);
    if (!task) return false;
    if (task.status === 'COMPLETED' || task.status === 'CANCELLED' || task.status === 'EXPIRED') {
      return false;
    }
    if (task.groupId) {
      this.inFlightGroups.delete(task.groupId);
    }
    const updated: GalxTask = {
      ...task,
      status: 'CANCELLED',
      updatedAtMs: Date.now()
    };
    this.persistence.taskTable.put(taskId, updated);
    this.updateTaskProgress(taskId, {
      percentage: 100,
      message: 'Task cancelled by user/administrator',
      logLine: 'Task cancelled.'
    });
    this.eventBus.emitEvent('TASK_CANCELLED', task.queueId, taskId);
    return true;
  }

  public retryTask(taskId: string): boolean {
    const task = this.persistence.taskTable.get(taskId);
    if (!task) return false;
    const now = Date.now();
    const updated: GalxTask = {
      ...task,
      status: 'QUEUED',
      scheduleTimeMs: now,
      updatedAtMs: now,
      lastError: undefined
    };
    this.persistence.taskTable.put(taskId, updated);
    this.updateTaskProgress(taskId, {
      percentage: 0,
      message: 'Task re-queued for execution',
      logLine: 'Task manually re-driven into queue.'
    });
    this.eventBus.emitEvent('TASK_QUEUED', task.queueId, taskId);
    this.pulseDispatcher();
    return true;
  }

  // =========================================================================
  // BULK MANAGEMENT (Redrive DLQ & Bulk Cancel)
  // =========================================================================

  public bulkRedrive(queueId: string, req: BulkRedriveRequest): BulkRedriveResponse {
    const queue = this.persistence.queueTable.get(queueId);
    if (!queue) throw new Error(`Queue '${queueId}' not found.`);

    const maxTasks = req.maxTasks ?? 100;
    const candidates = (this.persistence.taskTable.query({
      where: {
        queueId: { $eq: queueId },
        status: { $in: ['DEAD_LETTERED', 'EXPIRED'] }
      }
    }) as GalxTask[]).filter(t => {
      if (req.tag && t.tag !== req.tag) return false;
      if (req.userId && t.userId !== req.userId) return false;
      return true;
    }).slice(0, maxTasks);

    const redrivenIds: string[] = [];
    const now = Date.now();

    for (const t of candidates) {
      const updated: GalxTask = {
        ...t,
        status: 'QUEUED',
        scheduleTimeMs: now,
        updatedAtMs: now,
        dispatchCount: 0,
        lastError: undefined
      };
      this.persistence.taskTable.put(t.id, updated);
      this.eventBus.emitEvent('TASK_QUEUED', queueId, t.id);
      redrivenIds.push(t.id);
    }

    this.pulseDispatcher();
    return {
      redrivenCount: redrivenIds.length,
      taskIds: redrivenIds
    };
  }

  public bulkCancel(queueId: string, req: BulkCancelRequest): BulkCancelResponse {
    const queue = this.persistence.queueTable.get(queueId);
    if (!queue) throw new Error(`Queue '${queueId}' not found.`);

    const cancelableStatuses: TaskStatus[] = req.statusFilter
      ? [req.statusFilter]
      : ['QUEUED', 'SCHEDULED', 'WAITING_DEPENDENCIES', 'RETRYING'];

    const candidates = (this.persistence.taskTable.query({
      where: {
        queueId: { $eq: queueId },
        status: { $in: cancelableStatuses }
      }
    }) as GalxTask[]).filter(t => {
      if (req.tag && t.tag !== req.tag) return false;
      if (req.userId && t.userId !== req.userId) return false;
      if (req.groupId && t.groupId !== req.groupId) return false;
      return true;
    });

    const cancelledIds: string[] = [];
    const now = Date.now();

    for (const t of candidates) {
      if (t.groupId) this.inFlightGroups.delete(t.groupId);
      const updated: GalxTask = {
        ...t,
        status: 'CANCELLED',
        updatedAtMs: now
      };
      this.persistence.taskTable.put(t.id, updated);
      this.eventBus.emitEvent('TASK_CANCELLED', queueId, t.id);
      cancelledIds.push(t.id);
    }

    return {
      cancelledCount: cancelledIds.length,
      taskIds: cancelledIds
    };
  }

  // =========================================================================
  // TASK PROGRESS & HEARTBEAT LOGGING (With SSE Event Dispatch)
  // =========================================================================

  public updateTaskProgress(taskId: string, update: TaskProgressUpdate): boolean {
    const task = this.persistence.taskTable.get(taskId);
    if (!task) return false;

    const now = Date.now();
    const existingLogs = task.progress?.logs || [];
    const updatedLogs = update.logLine
      ? [...existingLogs, `[${new Date(now).toISOString()}] ${update.logLine}`]
      : existingLogs;

    const updated: GalxTask = {
      ...task,
      updatedAtMs: now,
      progress: {
        percentage: Math.min(100, Math.max(0, update.percentage)),
        message: update.message ?? task.progress?.message,
        currentStep: update.currentStep ?? task.progress?.currentStep,
        stepIndex: update.stepIndex ?? task.progress?.stepIndex,
        totalSteps: update.totalSteps ?? task.progress?.totalSteps,
        updatedAtMs: now,
        logs: updatedLogs.slice(-100)
      }
    };

    this.persistence.taskTable.put(taskId, updated);
    this.eventBus.emitEvent('TASK_PROGRESS', task.queueId, taskId, updated.progress);
    return true;
  }

  // =========================================================================
  // DYNAMIC PRIORITY ANTI-STARVATION AGING CALCULUS
  // =========================================================================

  public getEffectivePriority(task: GalxTask, queue: GalxTaskQueueConfig, now = Date.now()): number {
    const waitTimeMs = now - task.createdAtMs;
    const intervalMs = queue.priorityAgingIntervalMs || 10000;
    const ageIncrements = Math.floor(waitTimeMs / intervalMs);
    const ageBoost = Math.min(50, ageIncrements * 5);
    return Math.min(100, task.priority + ageBoost);
  }

  // =========================================================================
  // DISTRIBUTED PULL WORKER LEASING API (With Atomic CAS, FIFO & Priority Aging)
  // =========================================================================

  public leaseTasks(queueId: string, req: TaskLeaseRequest): TaskLeaseResult {
    const queue = this.persistence.queueTable.get(queueId);
    if (!queue || (queue.state !== 'RUNNING' && queue.state !== 'DRAINING')) {
      return { tasks: [], leasedCount: 0, leaseExpiresAtMs: Date.now() };
    }

    const now = Date.now();
    const maxTasks = Math.min(100, Math.max(1, req.maxTasks || 10));
    const leaseDurationMs = Math.min(600000, Math.max(5000, req.leaseDurationMs || 60000));
    const leaseExpiresAtMs = now + leaseDurationMs;

    const eligible = (this.persistence.taskTable.query({
      where: {
        queueId: { $eq: queueId },
        status: { $in: ['QUEUED', 'SCHEDULED', 'RETRYING', 'RUNNING'] }
      }
    }) as GalxTask[])
      .filter(t => {
        if (t.target.type !== 'PULL_WORKER') return false;
        if (req.tagFilter && t.tag !== req.tagFilter) return false;
        if (req.groupIdFilter && t.groupId !== req.groupIdFilter) return false;

        // FIFO Partition Check
        if (t.groupId) {
          if (this.inFlightGroups.has(t.groupId) && this.inFlightGroups.get(t.groupId) !== t.id) {
            return false;
          }
          const priorTasks = this.persistence.taskTable.query({
            where: {
              queueId: { $eq: queueId },
              groupId: { $eq: t.groupId }
            }
          }) as GalxTask[];

          const hasPriorInGroup = priorTasks.some(other =>
            other.id !== t.id &&
            (other.createdAtMs < t.createdAtMs || (other.createdAtMs === t.createdAtMs && other.id < t.id)) &&
            ['QUEUED', 'SCHEDULED', 'RETRYING', 'DISPATCHING', 'RUNNING'].includes(other.status)
          );
          if (hasPriorInGroup) return false;
        }

        if (t.status === 'QUEUED') return true;
        if (t.status === 'SCHEDULED' && t.scheduleTimeMs <= now) return true;
        if (t.status === 'RETRYING' && t.scheduleTimeMs <= now) return true;
        if (t.status === 'RUNNING' && t.leaseExpiresAtMs && t.leaseExpiresAtMs <= now) return true;
        return false;
      })
      .sort((a, b) => {
        const effA = this.getEffectivePriority(a, queue, now);
        const effB = this.getEffectivePriority(b, queue, now);
        if (effB !== effA) return effB - effA;
        if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
        return a.scheduleTimeMs - b.scheduleTimeMs;
      })
      .slice(0, maxTasks);

    const leasedTasks: GalxTask[] = [];
    const seenGroupsInBatch = new Set<string>();

    for (const t of eligible) {
      if (t.groupId) {
        if (seenGroupsInBatch.has(t.groupId) || this.inFlightGroups.has(t.groupId)) {
          continue;
        }
        seenGroupsInBatch.add(t.groupId);
        this.inFlightGroups.set(t.groupId, t.id);
      }

      this.fencingTokenCounter++;
      const currentToken = this.fencingTokenCounter;

      // Atomic Compare-And-Swap to guarantee single lease
      const casRes = this.persistence.taskTable.compareAndSwap(
        t.id,
        (curr) => curr !== undefined && (['QUEUED', 'SCHEDULED', 'RETRYING'].includes(curr.status) || (curr.status === 'RUNNING' && !!curr.leaseExpiresAtMs && curr.leaseExpiresAtMs <= now)),
        (curr) => ({
          ...curr,
          status: 'RUNNING',
          activeWorkerId: req.workerId,
          activeFencingToken: currentToken,
          leaseExpiresAtMs,
          dispatchCount: curr.dispatchCount + 1,
          lastAttemptMs: now,
          firstAttemptMs: curr.firstAttemptMs || now,
          updatedAtMs: now,
          progress: {
            percentage: 10,
            message: `Leased by worker ${req.workerId}`,
            updatedAtMs: now,
            logs: [...(curr.progress?.logs || []), `[${new Date(now).toISOString()}] Worker lease acquired with fencingToken #${currentToken}`]
          }
        })
      );

      if (casRes.success && casRes.record) {
        this.eventBus.emitEvent('TASK_RUNNING', queueId, t.id, { workerId: req.workerId });
        leasedTasks.push(casRes.record);
      }
    }

    return {
      tasks: leasedTasks,
      leasedCount: leasedTasks.length,
      leaseExpiresAtMs
    };
  }

  public extendLease(taskId: string, workerId: string, extensionMs = 30000): { extended: boolean; newExpiresAtMs?: number } {
    const newExpiresAtMs = Date.now() + Math.min(600000, extensionMs);
    const casRes = this.persistence.taskTable.compareAndSwap(
      taskId,
      (curr) => curr !== undefined && curr.status === 'RUNNING' && curr.activeWorkerId === workerId,
      (curr) => ({
        ...curr,
        leaseExpiresAtMs: newExpiresAtMs,
        updatedAtMs: Date.now()
      })
    );
    return { extended: casRes.success, newExpiresAtMs: casRes.success ? newExpiresAtMs : undefined };
  }

  public acknowledgeTask(taskId: string, workerId: string, resultData?: any): boolean {
    const now = Date.now();
    const task = this.persistence.taskTable.get(taskId);
    if (!task || task.status !== 'RUNNING' || task.activeWorkerId !== workerId) {
      return false;
    }

    if (task.groupId) {
      this.inFlightGroups.delete(task.groupId);
    }

    const casRes = this.persistence.taskTable.compareAndSwap(
      taskId,
      (curr) => curr !== undefined && curr.status === 'RUNNING' && curr.activeWorkerId === workerId,
      (curr) => ({
        ...curr,
        status: 'COMPLETED',
        updatedAtMs: now,
        activeWorkerId: undefined,
        leaseExpiresAtMs: undefined,
        result: {
          statusCode: 200,
          data: resultData,
          completedAtMs: now
        },
        progress: {
          percentage: 100,
          message: 'Completed and acknowledged by worker',
          updatedAtMs: now,
          logs: [...(curr.progress?.logs || []), `[${new Date(now).toISOString()}] Task execution finalized.`]
        }
      })
    );

    if (casRes.success && casRes.record) {
      this.eventBus.emitEvent('TASK_COMPLETED', task.queueId, taskId, { result: casRes.record.result });
      this.resolveDagDependencies(taskId, casRes.record.result?.data);
      this.pulseDispatcher();
      return true;
    }

    return false;
  }

  public failTask(taskId: string, workerId: string, errorMessage: string, retryImmediately = false): boolean {
    const task = this.persistence.taskTable.get(taskId);
    if (!task || task.status !== 'RUNNING' || task.activeWorkerId !== workerId) {
      return false;
    }
    const queue = this.persistence.queueTable.get(task.queueId);
    const retryConfig = queue?.retryConfig || {
      maxAttempts: 5,
      minBackoffMs: 500,
      maxBackoffMs: 300000,
      maxDoublings: 8,
      jitterFactor: 0.25
    };

    if (task.groupId) {
      this.inFlightGroups.delete(task.groupId);
    }

    const attemptRecord: TaskAttemptRecord = {
      attemptNumber: task.dispatchCount,
      startedAtMs: task.lastAttemptMs || task.createdAtMs,
      completedAtMs: Date.now(),
      durationMs: Date.now() - (task.lastAttemptMs || task.createdAtMs),
      errorMessage,
      workerId
    };

    const updatedAttempts = [...task.attempts, attemptRecord];
    const lastError = {
      message: errorMessage,
      timestampMs: Date.now()
    };

    if (task.dispatchCount >= retryConfig.maxAttempts) {
      this.routeToDeadLetter(task, queue, errorMessage);
    } else {
      const backoffMs = retryImmediately ? 0 : this.calculateBackoff(retryConfig, task.dispatchCount);
      const updated: GalxTask = {
        ...task,
        status: 'RETRYING',
        scheduleTimeMs: Date.now() + backoffMs,
        updatedAtMs: Date.now(),
        attempts: updatedAttempts,
        lastError,
        activeWorkerId: undefined,
        leaseExpiresAtMs: undefined,
        progress: {
          percentage: 0,
          message: `Execution failed: ${errorMessage} (Retrying in ${backoffMs}ms)`,
          updatedAtMs: Date.now(),
          logs: [...(task.progress?.logs || []), `[${new Date().toISOString()}] Attempt #${task.dispatchCount} failed: ${errorMessage}`]
        }
      };
      this.persistence.taskTable.put(taskId, updated);
      this.eventBus.emitEvent('TASK_RETRYING', task.queueId, taskId, { backoffMs });
    }
    this.pulseDispatcher();
    return true;
  }

  // =========================================================================
  // SCHEDULER & DISPATCH ENGINE (Continuous Token Bucket, Reactive Fast-Path, DAGs & Deadlines)
  // =========================================================================

  private startDispatcher(): void {
    if (this.isDispatcherRunning) return;
    this.isDispatcherRunning = true;

    this.dispatcherTimer = setInterval(() => {
      this.dispatchTick().catch(() => {});
    }, 100);
    this.dispatcherTimer.unref();

    this.leaseWatchdogTimer = setInterval(() => {
      this.scavengeExpiredLeasesAndDeadlines();
    }, 2000);
    this.leaseWatchdogTimer.unref();
  }

  public stopDispatcher(): void {
    this.isDispatcherRunning = false;
    if (this.dispatcherTimer) {
      clearInterval(this.dispatcherTimer);
      this.dispatcherTimer = null;
    }
    if (this.leaseWatchdogTimer) {
      clearInterval(this.leaseWatchdogTimer);
      this.leaseWatchdogTimer = null;
    }
  }

  private pulseDispatcher(): void {
    setImmediate(() => {
      this.dispatchTick().catch(() => {});
    });
  }

  private refillDispatchTokens(queue: GalxTaskQueueConfig, now = Date.now()): number {
    const rateLimits = queue.rateLimits;
    let state = this.dispatchTokensPerQueue.get(queue.id);
    if (!state) {
      state = { tokens: rateLimits.maxBurstSize, lastRefillMs: now };
      this.dispatchTokensPerQueue.set(queue.id, state);
      return state.tokens;
    }

    const elapsedMs = now - state.lastRefillMs;
    if (elapsedMs <= 0) return state.tokens;

    const tokensToAdd = (elapsedMs / 1000.0) * rateLimits.maxDispatchesPerSecond;
    state.tokens = Math.min(rateLimits.maxBurstSize, state.tokens + tokensToAdd);
    state.lastRefillMs = now;
    return state.tokens;
  }

  private async dispatchTick(): Promise<void> {
    const now = Date.now();
    const activeQueues = this.persistence.queueTable.getAll() as GalxTaskQueueConfig[];

    for (const queue of activeQueues) {
      if (queue.state !== 'RUNNING' && queue.state !== 'DRAINING') continue;

      const availableTokens = this.refillDispatchTokens(queue, now);
      if (availableTokens < 1) continue;

      const activeInFlight = this.inFlightPerQueue.get(queue.id) || 0;
      const concurrencyHeadroom = queue.rateLimits.maxConcurrentDispatches - activeInFlight;
      if (concurrencyHeadroom <= 0) continue;

      const maxToDispatch = Math.min(Math.floor(availableTokens), concurrencyHeadroom, 20);
      if (maxToDispatch <= 0) continue;

      // Indexed query via BroccoliDB composite & status indices
      const runnableTasks = (this.persistence.taskTable.query({
        where: {
          queueId: { $eq: queue.id },
          status: { $in: ['QUEUED', 'SCHEDULED', 'RETRYING'] }
        }
      }) as GalxTask[])
        .filter(t => {
          if (t.target.type === 'PULL_WORKER') return false; // Leased via worker pull

          // FIFO Partition Group Check
          if (t.groupId) {
            if (this.inFlightGroups.has(t.groupId) && this.inFlightGroups.get(t.groupId) !== t.id) {
              return false;
            }
            const priorGroupTasks = this.persistence.taskTable.query({
              where: {
                queueId: { $eq: queue.id },
                groupId: { $eq: t.groupId }
              }
            }) as GalxTask[];

            const hasPrior = priorGroupTasks.some(other =>
              other.id !== t.id &&
              (other.createdAtMs < t.createdAtMs || (other.createdAtMs === t.createdAtMs && other.id < t.id)) &&
              ['QUEUED', 'SCHEDULED', 'RETRYING', 'DISPATCHING', 'RUNNING'].includes(other.status)
            );
            if (hasPrior) return false;
          }

          if (t.status === 'QUEUED') return true;
          if (t.status === 'SCHEDULED' && t.scheduleTimeMs <= now) return true;
          if (t.status === 'RETRYING' && t.scheduleTimeMs <= now) return true;
          return false;
        })
        .sort((a, b) => {
          const effA = this.getEffectivePriority(a, queue, now);
          const effB = this.getEffectivePriority(b, queue, now);
          if (effB !== effA) return effB - effA;
          if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
          return a.scheduleTimeMs - b.scheduleTimeMs;
        });

      // Fair-Share Multi-Tenant Interleaving: Prevent single tenant head-of-line blocking
      const tenantBuckets = new Map<string, GalxTask[]>();
      for (const t of runnableTasks) {
        const list = tenantBuckets.get(t.userId) || [];
        list.push(t);
        tenantBuckets.set(t.userId, list);
      }

      const fairShareCandidates: GalxTask[] = [];
      let roundRobinActive = true;
      while (roundRobinActive && fairShareCandidates.length < maxToDispatch) {
        roundRobinActive = false;
        for (const list of tenantBuckets.values()) {
          if (list.length > 0) {
            fairShareCandidates.push(list.shift()!);
            roundRobinActive = true;
            if (fairShareCandidates.length >= maxToDispatch) break;
          }
        }
      }

      const seenGroupsInDispatch = new Set<string>();

      for (const task of fairShareCandidates) {
        if (task.groupId) {
          if (seenGroupsInDispatch.has(task.groupId) || this.inFlightGroups.has(task.groupId)) {
            continue;
          }
          seenGroupsInDispatch.add(task.groupId);
          this.inFlightGroups.set(task.groupId, task.id);
        }

        const tenantCap = queue.defaultTenantMaxConcurrency || 25;
        const tenantInFlight = this.inFlightPerTenant.get(task.userId) || 0;
        if (tenantInFlight >= tenantCap) {
          if (task.groupId) {
            this.inFlightGroups.delete(task.groupId);
          }
          continue;
        }

        const tokenState = this.dispatchTokensPerQueue.get(queue.id);
        if (tokenState && tokenState.tokens >= 1) {
          tokenState.tokens -= 1;
        }
        this.inFlightPerQueue.set(queue.id, (this.inFlightPerQueue.get(queue.id) || 0) + 1);
        this.inFlightPerTenant.set(task.userId, tenantInFlight + 1);

        const updatedTask: GalxTask = {
          ...task,
          status: 'DISPATCHING',
          dispatchCount: task.dispatchCount + 1,
          lastAttemptMs: now,
          firstAttemptMs: task.firstAttemptMs || now,
          updatedAtMs: now
        };
        this.persistence.taskTable.put(task.id, updatedTask);
        this.eventBus.emitEvent('TASK_DISPATCHING', queue.id, task.id);

        this.executeTaskOrPipeline(updatedTask, queue).finally(() => {
          this.inFlightPerQueue.set(queue.id, Math.max(0, (this.inFlightPerQueue.get(queue.id) || 1) - 1));
          this.inFlightPerTenant.set(task.userId, Math.max(0, (this.inFlightPerTenant.get(task.userId) || 1) - 1));
          if (task.groupId) {
            this.inFlightGroups.delete(task.groupId);
          }
          this.pulseDispatcher();
        });
      }
    }
  }

  /**
   * Dispatches task or multi-step pipeline DAG.
   */
  private async executeTaskOrPipeline(task: GalxTask, queue: GalxTaskQueueConfig): Promise<void> {
    const startTime = Date.now();
    const runningTask: GalxTask = {
      ...task,
      status: 'RUNNING',
      updatedAtMs: startTime
    };
    this.persistence.taskTable.put(task.id, runningTask);
    this.eventBus.emitEvent('TASK_RUNNING', queue.id, task.id);

    try {
      if (runningTask.pipelineSteps && runningTask.pipelineSteps.length > 0) {
        await this.executePipelineSteps(runningTask, queue);
      } else {
        if (runningTask.target.type === 'INTERNAL_MODEL') {
          await this.executeInternalModelTask(runningTask, startTime, runningTask.target);
        } else if (runningTask.target.type === 'HTTP_PUSH') {
          await this.executeHttpPushTask(runningTask, startTime, runningTask.target);
        }
      }

      const completedTask: GalxTask = {
        ...runningTask,
        status: 'COMPLETED',
        updatedAtMs: Date.now()
      };
      this.persistence.taskTable.put(task.id, completedTask);
      this.updateTaskProgress(task.id, {
        percentage: 100,
        message: 'Task completed successfully',
        logLine: 'Task execution completed successfully.'
      });
      this.eventBus.emitEvent('TASK_COMPLETED', queue.id, task.id, { result: completedTask.result });

      // Resolve downstream DAG tasks
      this.resolveDagDependencies(task.id, completedTask.result?.data);

      // Handle Cron Schedule auto re-scheduling
      if (completedTask.cronConfig) {
        this.rescheduleCronTask(completedTask, queue);
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err.message || 'Execution error';
      const statusCode = err.statusCode || (err.name === 'AbortError' ? 504 : 500);
      const isPermanent = err.isPermanent ?? (statusCode >= 400 && statusCode < 429);

      const attemptRecord: TaskAttemptRecord = {
        attemptNumber: runningTask.dispatchCount,
        startedAtMs: startTime,
        completedAtMs: Date.now(),
        durationMs,
        responseStatusCode: statusCode,
        errorMessage,
        errorDetails: err.details
      };

      const updatedAttempts = [...runningTask.attempts, attemptRecord];
      const lastError = {
        message: errorMessage,
        statusCode,
        isPermanent,
        timestampMs: Date.now()
      };

      if (isPermanent || runningTask.dispatchCount >= queue.retryConfig.maxAttempts) {
        this.routeToDeadLetter(runningTask, queue, errorMessage);
      } else {
        const backoffMs = this.calculateBackoff(queue.retryConfig, runningTask.dispatchCount);
        const retryingTask: GalxTask = {
          ...runningTask,
          status: 'RETRYING',
          scheduleTimeMs: Date.now() + backoffMs,
          updatedAtMs: Date.now(),
          attempts: updatedAttempts,
          lastError
        };
        this.persistence.taskTable.put(task.id, retryingTask);
        this.updateTaskProgress(task.id, {
          percentage: 0,
          message: `Transient error: ${errorMessage}. Retrying in ${backoffMs}ms.`,
          logLine: `Attempt #${runningTask.dispatchCount} encountered error: ${errorMessage}`
        });
        this.eventBus.emitEvent('TASK_RETRYING', queue.id, task.id, { backoffMs });
      }
    }
  }

  /**
   * Resolves dependent DAG child tasks when a parent completes.
   */
  private resolveDagDependencies(parentTaskId: string, parentResultData: any): void {
    const waitingChildren = this.persistence.taskTable.query({
      where: { status: { $eq: 'WAITING_DEPENDENCIES' } }
    }) as GalxTask[];

    for (const child of waitingChildren) {
      if (child.dependsOn?.includes(parentTaskId)) {
        const parentResults = { ...(child.parentTaskResults || {}), [parentTaskId]: parentResultData };

        const allDone = child.dependsOn.every(pId => {
          const p = this.persistence.taskTable.get(pId);
          return p && p.status === 'COMPLETED';
        });

        if (allDone) {
          const readyChild: GalxTask = {
            ...child,
            status: 'QUEUED',
            scheduleTimeMs: Date.now(),
            updatedAtMs: Date.now(),
            parentTaskResults: parentResults
          };
          this.persistence.taskTable.put(child.id, readyChild);
          this.updateTaskProgress(child.id, {
            percentage: 5,
            message: 'All parent DAG dependencies resolved. Queued for execution.',
            logLine: `Dependencies resolved: [${child.dependsOn.join(', ')}]`
          });
          this.eventBus.emitEvent('TASK_QUEUED', child.queueId, child.id);
        } else {
          this.persistence.taskTable.put(child.id, {
            ...child,
            parentTaskResults: parentResults,
            updatedAtMs: Date.now()
          });
        }
      }
    }
  }

  /**
   * Executes multi-step pipeline sequentially, piping output between steps.
   */
  private async executePipelineSteps(task: GalxTask, queue: GalxTaskQueueConfig): Promise<void> {
    const steps = task.pipelineSteps!;
    task.pipelineStepResults = task.pipelineStepResults || [];
    let prevStepResult: any = null;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepStartTime = Date.now();
      task.activePipelineStepIndex = i;

      this.updateTaskProgress(task.id, {
        percentage: Math.floor((i / steps.length) * 100),
        message: `Executing pipeline step ${i + 1}/${steps.length}: ${step.name}`,
        currentStep: step.name,
        stepIndex: i + 1,
        totalSteps: steps.length,
        logLine: `Starting pipeline step '${step.name}'`
      });

      let target = step.target;
      if (prevStepResult && target.type === 'INTERNAL_MODEL') {
        if (target.taskKind === 'chat_completion' && target.chatPayload) {
          const contentPiped = typeof prevStepResult === 'string' ? prevStepResult : JSON.stringify(prevStepResult);
          target = {
            ...target,
            chatPayload: {
              ...target.chatPayload,
              messages: [...target.chatPayload.messages, { role: 'user', content: `[Piped Input]: ${contentPiped}` }]
            }
          };
        }
      } else if (prevStepResult && target.type === 'HTTP_PUSH') {
        target = {
          ...target,
          body: { ...(target.body || {}), pipedData: prevStepResult }
        };
      }

      if (target.type === 'INTERNAL_MODEL') {
        await this.executeInternalModelTask(task, stepStartTime, target);
      } else if (target.type === 'HTTP_PUSH') {
        await this.executeHttpPushTask(task, stepStartTime, target);
      }

      prevStepResult = task.result?.data;
      task.pipelineStepResults.push({
        stepName: step.name,
        result: prevStepResult,
        durationMs: Date.now() - stepStartTime
      });
    }
  }

  /**
   * Reschedules cron task for next interval.
   */
  private rescheduleCronTask(task: GalxTask, queue: GalxTaskQueueConfig): void {
    const cron = task.cronConfig;
    if (!cron) return;

    const newExecCount = (cron.currentExecutionCount || 0) + 1;
    if (cron.maxExecutions && newExecCount >= cron.maxExecutions) {
      return;
    }

    const nextScheduleMs = this.calculateNextCronTimestampMs(cron, Date.now());
    if (!nextScheduleMs) return;

    const nextTaskId = `cron_${task.id.split('_')[1] || Date.now()}_${newExecCount + 1}`;
    this.createTask({
      id: nextTaskId,
      queueId: queue.id,
      userId: task.userId,
      tag: task.tag,
      groupId: task.groupId,
      priority: task.priority,
      scheduleTimeMs: nextScheduleMs,
      target: task.target,
      pipelineSteps: task.pipelineSteps,
      cronConfig: {
        ...cron,
        currentExecutionCount: newExecCount
      }
    });
  }

  /**
   * Calculates next timestamp in ms for cron or repeat interval.
   */
  public calculateNextCronTimestampMs(config: CronScheduleConfig, fromTimeMs = Date.now()): number | undefined {
    if (config.repeatEveryMs && config.repeatEveryMs > 0) {
      return fromTimeMs + config.repeatEveryMs;
    }

    if (config.cronExpression) {
      const expr = config.cronExpression.trim();
      const stepMatch = expr.match(/^\*\/(\d+)/);
      if (stepMatch) {
        const intervalMinutes = parseInt(stepMatch[1], 10);
        return fromTimeMs + intervalMinutes * 60000;
      }
      return fromTimeMs + 60000;
    }

    return undefined;
  }

  /**
   * Dispatches direct AI model inference via GalxModelRouter.
   */
  private async executeInternalModelTask(
    task: GalxTask,
    startTime: number,
    target: import('../contracts/GalxContracts').InternalModelTarget
  ): Promise<void> {
    const router = GalxModelRouter.getInstance();

    if (target.taskKind === 'chat_completion' && target.chatPayload) {
      const requestId = `async_${task.id}`;
      const seatEngine = GalxSeatTierEngine.getInstance();
      const gate = await seatEngine.evaluateAndAcquireDistributedGate({
        userId: task.userId,
        requestId,
        requestedModel: target.chatPayload.model,
        isStream: false,
        leaseTtlSeconds: 900,
      });
      if (gate && !gate.allowed) {
        const code = gate.rejectionCode || 'seat_gate_rejected';
        const gateError = new Error(`ASYNC_SEAT_GATE_REJECTED:${code}`) as Error & { statusCode: number };
        gateError.statusCode = code.startsWith('request_') || code === 'tier_model_restricted' || code === 'seat_inactive'
          ? 409
          : 429;
        throw gateError;
      }

      let res: Awaited<ReturnType<typeof router.routeChatCompletion>>;
      try {
        res = await router.routeChatCompletion({
          request: target.chatPayload,
          userId: task.userId,
          requestId,
          isPriorityUser: target.isPriorityUser
        });
      } catch (error) {
        if (gate) {
          try {
            await seatEngine.releaseDistributedRequest(task.userId, requestId);
          } catch (releaseError) {
            console.error('[GalxTaskQueueEngine] Failed to release async seat lease:', releaseError);
          }
        }
        throw error;
      }

      let responseData: any = null;
      let responseSize = 0;
      try {
        if (typeof res.body === 'string') {
          responseSize = Buffer.byteLength(res.body);
          try {
            responseData = JSON.parse(res.body);
          } catch {
            responseData = res.body;
          }
        } else {
          const reader = (res.body as ReadableStream<Uint8Array>).getReader();
          const decoder = new TextDecoder();
          let streamAccumulator = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            responseSize += value.byteLength;
            streamAccumulator += decoder.decode(value, { stream: true });
          }
          streamAccumulator += decoder.decode();
          responseData = streamAccumulator;
        }

      } catch (completionError) {
        if (gate) {
          try {
            await seatEngine.releaseDistributedRequest(task.userId, requestId);
          } catch (releaseError) {
            console.error('[GalxTaskQueueEngine] Failed to release incomplete async seat lease:', releaseError);
          }
        }
        throw completionError;
      }

      if (gate) {
        try {
          await seatEngine.settleDistributedRequest({
            userId: task.userId,
            requestId,
            modelId: res.modelUsed,
            tokens: Math.ceil(responseSize / 4),
          });
        } catch (settlementError) {
          console.error('[GalxTaskQueueEngine] Async seat lease settlement failed:', settlementError);
          try {
            await seatEngine.releaseDistributedRequest(task.userId, requestId);
          } catch (releaseError) {
            console.error('[GalxTaskQueueEngine] Failed to release unsettled async seat lease:', releaseError);
          }
        }
      }

      task.result = {
        statusCode: res.statusCode,
        data: responseData,
        shardId: res.shardId,
        modelUsed: res.modelUsed,
        provider: res.provider,
        completedAtMs: Date.now()
      };

      task.attempts.push({
        attemptNumber: task.dispatchCount,
        startedAtMs: startTime,
        completedAtMs: Date.now(),
        durationMs: Date.now() - startTime,
        responseStatusCode: res.statusCode,
        shardIdUsed: res.shardId,
        modelUsed: res.modelUsed
      });

      if (target.webhookCompletionUrl) {
        this.dispatchWebhookCallback(target.webhookCompletionUrl, target.webhookHmacSecret, {
          taskId: task.id,
          status: 'COMPLETED',
          result: task.result
        }).catch(() => {});
      }
    } else if (target.taskKind === 'image_generation' && target.imagePayload) {
      const res = await router.routeImageGeneration({
        request: target.imagePayload,
        userId: task.userId,
        requestId: `async_${task.id}`,
        isPriorityUser: target.isPriorityUser
      });

      task.result = {
        statusCode: 200,
        data: res,
        shardId: res.shardId,
        modelUsed: res.modelUsed,
        completedAtMs: Date.now()
      };

      task.attempts.push({
        attemptNumber: task.dispatchCount,
        startedAtMs: startTime,
        completedAtMs: Date.now(),
        durationMs: Date.now() - startTime,
        responseStatusCode: 200,
        shardIdUsed: res.shardId,
        modelUsed: res.modelUsed
      });

      if (target.webhookCompletionUrl) {
        this.dispatchWebhookCallback(target.webhookCompletionUrl, target.webhookHmacSecret, {
          taskId: task.id,
          status: 'COMPLETED',
          result: task.result
        }).catch(() => {});
      }
    } else {
      throw new Error(`Invalid internal model target payload for task '${task.id}'`);
    }
  }

  /**
   * Dispatches signed HTTP push task with Destination Circuit Breaker protection.
   */
  private async executeHttpPushTask(
    task: GalxTask,
    startTime: number,
    target: import('../contracts/GalxContracts').HttpPushTarget
  ): Promise<void> {
    const urlObj = new URL(target.url);
    const hostKey = urlObj.host;

    // Check Destination Circuit Breaker
    const cb = this.destinationCircuitBreakers.get(hostKey);
    const now = Date.now();
    if (cb && cb.state === 'OPEN' && now < cb.openUntilMs) {
      const err: any = new Error(`Destination circuit breaker for host '${hostKey}' is OPEN (cooldown active until ${new Date(cb.openUntilMs).toISOString()})`);
      err.statusCode = 503;
      err.isPermanent = false;
      throw err;
    }

    const timeoutMs = target.timeoutMs || 60000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'GALXAI-Queue-Worker/1.0',
      'X-Galx-Task-Id': task.id,
      'X-Galx-Queue-Id': task.queueId,
      'X-Galx-Retry-Count': String(Math.max(0, task.dispatchCount - 1)),
      'X-Galx-Execution-Count': String(task.dispatchCount),
      'X-Galx-Schedule-Time': String(task.scheduleTimeMs),
      'X-Galx-Timestamp': String(startTime),
      ...(target.headers || {})
    };

    const payloadString = target.body ? JSON.stringify(target.body) : '';

    if (target.hmacSecret) {
      const signaturePayload = `${startTime}.${payloadString}`;
      const hmac = crypto.createHmac('sha256', target.hmacSecret).update(signaturePayload).digest('hex');
      headers['X-Galx-Signature'] = `t=${startTime},v1=${hmac}`;
    }

    try {
      const res = await fetch(target.url, {
        method: target.method || 'POST',
        headers,
        body: ['GET', 'HEAD'].includes(target.method || 'POST') ? undefined : payloadString,
        signal: controller.signal
      });

      clearTimeout(timer);

      let bodyData: any = null;
      try {
        bodyData = await res.json();
      } catch {
        bodyData = await res.text();
      }

      task.attempts.push({
        attemptNumber: task.dispatchCount,
        startedAtMs: startTime,
        completedAtMs: Date.now(),
        durationMs: Date.now() - startTime,
        responseStatusCode: res.status
      });

      if (!res.ok) {
        const currentFailures = (cb?.consecutiveFailures || 0) + 1;
        const shouldTrip = currentFailures >= 3;
        this.destinationCircuitBreakers.set(hostKey, {
          consecutiveFailures: currentFailures,
          state: shouldTrip ? 'OPEN' : 'CLOSED',
          openUntilMs: shouldTrip ? Date.now() + Math.min(300000, 10000 * Math.pow(2, currentFailures - 3)) : 0
        });

        const err: any = new Error(`HTTP push endpoint returned status ${res.status}`);
        err.statusCode = res.status;
        err.isPermanent = res.status >= 400 && res.status < 429;
        err.details = bodyData;
        throw err;
      }

      // Success: reset host circuit breaker
      this.destinationCircuitBreakers.set(hostKey, {
        consecutiveFailures: 0,
        state: 'CLOSED',
        openUntilMs: 0
      });

      task.result = {
        statusCode: res.status,
        data: bodyData,
        completedAtMs: Date.now()
      };
    } catch (err: any) {
      clearTimeout(timer);
      const currentFailures = (cb?.consecutiveFailures || 0) + 1;
      const shouldTrip = currentFailures >= 3;
      this.destinationCircuitBreakers.set(hostKey, {
        consecutiveFailures: currentFailures,
        state: shouldTrip ? 'OPEN' : 'CLOSED',
        openUntilMs: shouldTrip ? Date.now() + Math.min(300000, 10000 * Math.pow(2, currentFailures - 3)) : 0
      });
      throw err;
    }
  }

  public async dispatchWebhookCallback(url: string, hmacSecret: string | undefined, payload: any): Promise<void> {
    const timestamp = Date.now();
    const bodyStr = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Galx-Webhook-Timestamp': String(timestamp)
    };

    if (hmacSecret) {
      const signature = crypto.createHmac('sha256', hmacSecret).update(`${timestamp}.${bodyStr}`).digest('hex');
      headers['X-Galx-Signature'] = `t=${timestamp},v1=${signature}`;
    }

    await fetch(url, {
      method: 'POST',
      headers,
      body: bodyStr
    }).catch(() => {});
  }

  public calculateBackoff(retryConfig: QueueRetryConfig, attemptNumber: number): number {
    const doublings = Math.min(Math.max(0, attemptNumber - 1), retryConfig.maxDoublings ?? 8);
    const baseBackoff = Math.min(retryConfig.maxBackoffMs, retryConfig.minBackoffMs * Math.pow(2, doublings));
    const jitterFactor = retryConfig.jitterFactor ?? 0.25;
    const jitter = baseBackoff * jitterFactor * Math.random();
    return Math.floor(baseBackoff + jitter);
  }

  private routeToDeadLetter(task: GalxTask, queue: GalxTaskQueueConfig | undefined, reason: string): void {
    if (task.groupId) {
      this.inFlightGroups.delete(task.groupId);
    }
    const dlqTargetId = queue?.deadLetterConfig?.targetQueueId || 'dead-letter';
    const deadLetteredTask: GalxTask = {
      ...task,
      status: 'DEAD_LETTERED',
      updatedAtMs: Date.now(),
      lastError: {
        message: `Dead-Lettered: ${reason}`,
        isPermanent: true,
        timestampMs: Date.now()
      }
    };

    this.persistence.taskTable.put(task.id, deadLetteredTask);
    this.updateTaskProgress(task.id, {
      percentage: 0,
      message: `Dead-Lettered: ${reason}`,
      logLine: `Task moved to Dead-Letter Queue: ${reason}`
    });

    this.eventBus.emitEvent('TASK_DEAD_LETTERED', queue?.id || 'default', task.id, { reason });

    if (queue?.deadLetterConfig?.notificationWebhookUrl) {
      this.dispatchWebhookCallback(queue.deadLetterConfig.notificationWebhookUrl, undefined, {
        event: 'TASK_DEAD_LETTERED',
        queueId: queue.id,
        taskId: task.id,
        reason,
        attempts: task.attempts.length
      }).catch(() => {});
    }
  }

  private scavengeExpiredLeasesAndDeadlines(): void {
    const now = Date.now();
    const tasks = this.persistence.taskTable.getAll() as GalxTask[];

    for (const task of tasks) {
      // Lease scavenger for pull workers
      if (task.status === 'RUNNING' && task.leaseExpiresAtMs && task.leaseExpiresAtMs < now) {
        if (task.groupId) this.inFlightGroups.delete(task.groupId);
        const expiredLeaseTask: GalxTask = {
          ...task,
          status: 'RETRYING',
          scheduleTimeMs: now + 1000,
          activeWorkerId: undefined,
          leaseExpiresAtMs: undefined,
          updatedAtMs: now
        };
        this.persistence.taskTable.put(task.id, expiredLeaseTask);
        this.eventBus.emitEvent('TASK_RETRYING', task.queueId, task.id);
      }

      // Wall-Clock Deadline & TTL Expiration
      if (['QUEUED', 'SCHEDULED', 'WAITING_DEPENDENCIES', 'RETRYING'].includes(task.status)) {
        const isExpired =
          (task.deadlineMs && now > task.deadlineMs) ||
          (task.ttlMs && now > task.createdAtMs + task.ttlMs);

        if (isExpired) {
          if (task.groupId) this.inFlightGroups.delete(task.groupId);
          const expiredTask: GalxTask = {
            ...task,
            status: 'EXPIRED',
            updatedAtMs: now,
            lastError: {
              message: `Task SLA deadline expired after ${now - task.createdAtMs}ms`,
              isPermanent: true,
              timestampMs: now
            }
          };
          this.persistence.taskTable.put(task.id, expiredTask);
          this.updateTaskProgress(task.id, {
            percentage: 0,
            message: 'Task expired due to wall-clock SLA deadline',
            logLine: 'Task expired.'
          });
          this.eventBus.emitEvent('TASK_EXPIRED', task.queueId, task.id);
        }
      }
    }
  }

  // =========================================================================
  // TELEMETRY & OBSERVABILITY
  // =========================================================================

  public getQueueStats(queueId: string): QueueTelemetryStats | undefined {
    const q = this.persistence.queueTable.get(queueId);
    if (!q) return undefined;

    const queueTasks = this.persistence.taskTable.query({
      where: { queueId: { $eq: queueId } }
    }) as GalxTask[];

    let pending = 0;
    let scheduled = 0;
    let waitingDeps = 0;
    let running = 0;
    let completed = 0;
    let retrying = 0;
    let deadLettered = 0;
    let cancelled = 0;
    let expired = 0;
    let totalDurationMs = 0;
    let totalDurationsSampled = 0;

    for (const task of queueTasks) {
      if (task.status === 'QUEUED') pending++;
      else if (task.status === 'SCHEDULED') scheduled++;
      else if (task.status === 'WAITING_DEPENDENCIES') waitingDeps++;
      else if (task.status === 'DISPATCHING' || task.status === 'RUNNING') running++;
      else if (task.status === 'COMPLETED') completed++;
      else if (task.status === 'RETRYING') retrying++;
      else if (task.status === 'DEAD_LETTERED') deadLettered++;
      else if (task.status === 'CANCELLED') cancelled++;
      else if (task.status === 'EXPIRED') expired++;

      for (const att of task.attempts) {
        if (att.durationMs) {
          totalDurationMs += att.durationMs;
          totalDurationsSampled++;
        }
      }
    }

    const currentConcurrent = this.inFlightPerQueue.get(queueId) || 0;
    const avgDuration = totalDurationsSampled > 0 ? Math.round(totalDurationMs / totalDurationsSampled) : 0;

    return {
      queueId: q.id,
      queueName: q.name,
      state: q.state,
      pendingTasks: pending,
      scheduledTasks: scheduled,
      waitingDependenciesTasks: waitingDeps,
      runningTasks: running,
      completedTasks: completed,
      retryingTasks: retrying,
      deadLetteredTasks: deadLettered,
      cancelledTasks: cancelled,
      expiredTasks: expired,
      totalTasksProcessed: completed + deadLettered + cancelled + expired,
      currentDispatchesPerSecond: q.rateLimits.maxDispatchesPerSecond,
      maxDispatchesPerSecond: q.rateLimits.maxDispatchesPerSecond,
      currentConcurrentDispatches: currentConcurrent,
      maxConcurrentDispatches: q.rateLimits.maxConcurrentDispatches,
      activeFifoGroupsCount: this.inFlightGroups.size,
      averageExecutionDurationMs: avgDuration
    };
  }

  public getAllQueueStats(): QueueTelemetryStats[] {
    const queues = this.persistence.queueTable.getAll() as GalxTaskQueueConfig[];
    return queues
      .map(q => this.getQueueStats(q.id))
      .filter((s): s is QueueTelemetryStats => !!s);
  }
}
