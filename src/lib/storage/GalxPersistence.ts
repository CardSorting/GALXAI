/**
 * GALXAI: Supabase PostgreSQL Unified Persistence Substrate
 * Pure PostgreSQL-backed persistence using Supabase Repositories.
 * Zero local JSON files.
 */

import type {
  GalxShardAccount,
  DeveloperGatewayKey,
  GalxTaskQueueConfig,
  GalxTask
} from '../../core/contracts/GalxContracts';

import {
  ShardRepository,
  ApiKeyRepository,
  QueueRepository,
  TaskRepository,
  AuditRepository,
  WalletRepository,
  TelemetryRepository,
  EmbeddingsRepository,
  WorkspaceRepository
} from '../supabase';

export interface GalxPersistedState {
  shards: GalxShardAccount[];
  gatewayKeys: DeveloperGatewayKey[];
  queues: GalxTaskQueueConfig[];
  tasks: GalxTask[];
  auditLogs: Array<{
    id: string;
    shardId?: string;
    userId?: string;
    action: string;
    metadata: any;
    timestampMs: number;
  }>;
}

/**
 * Enterprise Supabase PostgreSQL Persistence Substrate for GALXAI.
 * Completely backed by Supabase PostgreSQL tables, stored procedures, and typed repositories.
 */
export class GalxPersistence {
  private static instance: GalxPersistence;

  // Supabase Repositories
  public readonly shardRepo: ShardRepository;
  public readonly apiKeyRepo: ApiKeyRepository;
  public readonly queueRepo: QueueRepository;
  public readonly taskRepo: TaskRepository;
  public readonly auditRepo: AuditRepository;
  public readonly walletRepo: WalletRepository;
  public readonly telemetryRepo: TelemetryRepository;
  public readonly embeddingsRepo: EmbeddingsRepository;
  public readonly workspaceRepo: WorkspaceRepository;

  // In-memory hot cache for sub-millisecond synchronous gateway routing loops
  private cache: GalxPersistedState = {
    shards: [],
    gatewayKeys: [],
    queues: [],
    tasks: [],
    auditLogs: []
  };

  private constructor() {
    this.shardRepo = ShardRepository.getInstance();
    this.apiKeyRepo = ApiKeyRepository.getInstance();
    this.queueRepo = QueueRepository.getInstance();
    this.taskRepo = TaskRepository.getInstance();
    this.auditRepo = AuditRepository.getInstance();
    this.walletRepo = WalletRepository.getInstance();
    this.telemetryRepo = TelemetryRepository.getInstance();
    this.embeddingsRepo = EmbeddingsRepository.getInstance();
    this.workspaceRepo = WorkspaceRepository.getInstance();
  }

  static getInstance(): GalxPersistence {
    if (!GalxPersistence.instance) {
      GalxPersistence.instance = new GalxPersistence();
    }
    return GalxPersistence.instance;
  }

  // ==========================================
  // Shard Accounts
  // ==========================================

  public getShards(): GalxShardAccount[] {
    return this.cache.shards;
  }

  public async getShardsAsync(userId?: string): Promise<GalxShardAccount[]> {
    const shards = await this.shardRepo.getShards(userId);
    if (!userId) {
      this.cache.shards = shards;
    }
    return shards;
  }

  public saveShard(shard: GalxShardAccount): void {
    const idx = this.cache.shards.findIndex(s => s.id === shard.id);
    if (idx >= 0) {
      this.cache.shards[idx] = shard;
    } else {
      this.cache.shards.push(shard);
    }
    // Asynchronously commit to Supabase PostgreSQL in background
    this.shardRepo.saveShard(shard).catch(() => {});
  }

  public async saveShardAsync(shard: GalxShardAccount): Promise<void> {
    const idx = this.cache.shards.findIndex(s => s.id === shard.id);
    if (idx >= 0) {
      this.cache.shards[idx] = shard;
    } else {
      this.cache.shards.push(shard);
    }
    await this.shardRepo.saveShard(shard);
  }

  public deleteShard(shardId: string): void {
    this.cache.shards = this.cache.shards.filter(s => s.id !== shardId);
    this.shardRepo.deleteShard(shardId).catch(() => {});
  }

  public async deleteShardAsync(shardId: string): Promise<void> {
    this.cache.shards = this.cache.shards.filter(s => s.id !== shardId);
    await this.shardRepo.deleteShard(shardId);
  }

  // ==========================================
  // Developer Gateway Keys
  // ==========================================

  public getGatewayKeys(): DeveloperGatewayKey[] {
    return this.cache.gatewayKeys;
  }

  public async getGatewayKeysAsync(userId?: string): Promise<DeveloperGatewayKey[]> {
    const keys = await this.apiKeyRepo.getGatewayKeys(userId);
    if (!userId) {
      this.cache.gatewayKeys = keys;
    }
    return keys;
  }

  public saveGatewayKey(key: DeveloperGatewayKey): void {
    const idx = this.cache.gatewayKeys.findIndex(k => k.id === key.id);
    if (idx >= 0) {
      this.cache.gatewayKeys[idx] = key;
    } else {
      this.cache.gatewayKeys.push(key);
    }
    this.apiKeyRepo.saveGatewayKey(key).catch(() => {});
  }

  public async saveGatewayKeyAsync(key: DeveloperGatewayKey): Promise<void> {
    const idx = this.cache.gatewayKeys.findIndex(k => k.id === key.id);
    if (idx >= 0) {
      this.cache.gatewayKeys[idx] = key;
    } else {
      this.cache.gatewayKeys.push(key);
    }
    await this.apiKeyRepo.saveGatewayKey(key);
  }

  // ==========================================
  // Task Queues
  // ==========================================

  public getQueues(): GalxTaskQueueConfig[] {
    return this.cache.queues;
  }

  public async getQueuesAsync(): Promise<GalxTaskQueueConfig[]> {
    const queues = await this.queueRepo.getQueues();
    this.cache.queues = queues;
    return queues;
  }

  public saveQueue(queue: GalxTaskQueueConfig): void {
    const idx = this.cache.queues.findIndex(q => q.id === queue.id);
    if (idx >= 0) {
      this.cache.queues[idx] = queue;
    } else {
      this.cache.queues.push(queue);
    }
    this.queueRepo.saveQueue(queue).catch(() => {});
  }

  public async saveQueueAsync(queue: GalxTaskQueueConfig): Promise<void> {
    const idx = this.cache.queues.findIndex(q => q.id === queue.id);
    if (idx >= 0) {
      this.cache.queues[idx] = queue;
    } else {
      this.cache.queues.push(queue);
    }
    await this.queueRepo.saveQueue(queue);
  }

  public deleteQueue(queueId: string): void {
    this.cache.queues = this.cache.queues.filter(q => q.id !== queueId);
    this.cache.tasks = this.cache.tasks.filter(t => t.queueId !== queueId);
    this.queueRepo.deleteQueue(queueId).catch(() => {});
  }

  public async deleteQueueAsync(queueId: string): Promise<void> {
    this.cache.queues = this.cache.queues.filter(q => q.id !== queueId);
    this.cache.tasks = this.cache.tasks.filter(t => t.queueId !== queueId);
    await this.queueRepo.deleteQueue(queueId);
  }

  // ==========================================
  // Tasks
  // ==========================================

  public getTasks(): GalxTask[] {
    return this.cache.tasks;
  }

  public async getTasksAsync(params?: {
    queueId?: string;
    status?: any;
    userId?: string;
    limit?: number;
  }): Promise<GalxTask[]> {
    return this.taskRepo.getTasks(params);
  }

  public saveTask(task: GalxTask): void {
    const idx = this.cache.tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) {
      this.cache.tasks[idx] = task;
    } else {
      this.cache.tasks.push(task);
    }
    if (this.cache.tasks.length > 5000) {
      this.cache.tasks = this.cache.tasks.slice(-5000);
    }
    this.taskRepo.saveTask(task).catch(() => {});
  }

  public async saveTaskAsync(task: GalxTask): Promise<void> {
    const idx = this.cache.tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) {
      this.cache.tasks[idx] = task;
    } else {
      this.cache.tasks.push(task);
    }
    if (this.cache.tasks.length > 5000) {
      this.cache.tasks = this.cache.tasks.slice(-5000);
    }
    await this.taskRepo.saveTask(task);
  }

  public deleteTask(taskId: string): void {
    this.cache.tasks = this.cache.tasks.filter(t => t.id !== taskId);
    this.taskRepo.deleteTask(taskId).catch(() => {});
  }

  public async deleteTaskAsync(taskId: string): Promise<void> {
    this.cache.tasks = this.cache.tasks.filter(t => t.id !== taskId);
    await this.taskRepo.deleteTask(taskId);
  }

  public purgeQueueTasks(queueId: string, statusFilter?: string): number {
    const prevCount = this.cache.tasks.length;
    if (statusFilter) {
      this.cache.tasks = this.cache.tasks.filter(t => !(t.queueId === queueId && t.status === statusFilter));
    } else {
      this.cache.tasks = this.cache.tasks.filter(t => t.queueId !== queueId);
    }
    const purged = prevCount - this.cache.tasks.length;
    this.taskRepo.purgeTasks(queueId, statusFilter).catch(() => {});
    return purged;
  }

  // ==========================================
  // Audit Logs
  // ==========================================

  public getAuditLogs(): GalxPersistedState['auditLogs'] {
    return this.cache.auditLogs;
  }

  public async getAuditLogsAsync(params?: {
    userId?: string;
    shardId?: string;
    limit?: number;
  }) {
    return this.auditRepo.getAuditLogs(params);
  }

  public logAudit(action: string, metadata: any, shardId?: string, userId?: string): void {
    const logItem = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      shardId,
      userId,
      action,
      metadata,
      timestampMs: Date.now()
    };
    this.cache.auditLogs.unshift(logItem);
    if (this.cache.auditLogs.length > 500) {
      this.cache.auditLogs = this.cache.auditLogs.slice(0, 500);
    }
    this.auditRepo.logAudit({
      action,
      metadata,
      shardId,
      userId
    }).catch(() => {});
  }
}
