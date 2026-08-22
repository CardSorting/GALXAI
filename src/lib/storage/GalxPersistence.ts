/**
 * GALXAI: Supabase PostgreSQL Unified Persistence Substrate + BroccoliDB Hot Cache
 * Pure PostgreSQL-backed persistence using Supabase Repositories with
 * L1 BroccoliDB Reactive In-Memory Tables, Multi-Modal Secondary Indexing,
 * Deterministic Natural Query Parsing, and Statistical Aggregation Pipelines.
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
  WorkspaceRepository,
  SessionRepository
} from '../supabase';

import { BroccoliDbTable } from '../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../core/broccolidb/broccolidb-natural-query';
import type {
  DbQueryOptions,
  DbAggregateQuery,
  DbAggregateResult
} from '../../core/broccolidb/broccolidb.contracts';

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
 * Coupled with BroccoliDB L1 reactive in-memory tables for sub-microsecond gateway routing loops.
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
  public readonly sessionRepo: SessionRepository;

  // BroccoliDB L1 Hot Tables
  public readonly shardTable: BroccoliDbTable<GalxShardAccount>;
  public readonly apiKeyTable: BroccoliDbTable<DeveloperGatewayKey>;
  public readonly queueTable: BroccoliDbTable<GalxTaskQueueConfig>;
  public readonly taskTable: BroccoliDbTable<GalxTask>;
  public readonly auditTable: BroccoliDbTable<any>;

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
    this.sessionRepo = SessionRepository.getInstance();

    // Initialize BroccoliDB L1 Tables with Secondary Indices
    this.shardTable = new BroccoliDbTable<GalxShardAccount>('shards');
    this.shardTable.createIndex('provider');
    this.shardTable.createIndex('status');
    this.shardTable.createIndex('userId');
    this.shardTable.createIndex('shardMode');
    this.shardTable.createSortedIndex('priority');

    this.apiKeyTable = new BroccoliDbTable<DeveloperGatewayKey>('gateway_keys');
    this.apiKeyTable.createIndex('keyHash');
    this.apiKeyTable.createIndex('prefix');
    this.apiKeyTable.createIndex('userId');
    this.apiKeyTable.createIndex('revoked');

    this.queueTable = new BroccoliDbTable<GalxTaskQueueConfig>('queues');
    this.queueTable.createIndex('state');

    this.taskTable = new BroccoliDbTable<GalxTask>('tasks');
    this.taskTable.createIndex('queueId');
    this.taskTable.createIndex('status');
    this.taskTable.createIndex('userId');
    this.taskTable.createIndex('groupId');
    this.taskTable.createIndex('tag');
    this.taskTable.createSortedIndex('priority');
    this.taskTable.createSortedIndex('createdAtMs');
    this.taskTable.createSortedIndex('scheduleTimeMs');
    this.taskTable.createSortedIndex('leaseExpiresAtMs');
    this.taskTable.createCompositeIndex(['queueId', 'status']);
    this.taskTable.createCompositeIndex(['queueId', 'groupId']);
    this.taskTable.createCompositeIndex(['queueId', 'userId']);

    this.auditTable = new BroccoliDbTable<any>('audit_logs');
    this.auditTable.createIndex('userId');
    this.auditTable.createIndex('shardId');
    this.auditTable.createIndex('action');
    this.auditTable.createSortedIndex('timestampMs');
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
    return this.shardTable.getAll() as GalxShardAccount[];
  }

  public async getShardsAsync(userId?: string): Promise<GalxShardAccount[]> {
    const shards = await this.shardRepo.getShards(userId);
    if (!userId) {
      for (const s of shards) {
        this.shardTable.put(s.id, s);
      }
    }
    return shards;
  }

  public saveShard(shard: GalxShardAccount): void {
    this.shardTable.put(shard.id, shard);
    this.shardRepo.saveShard(shard).catch(() => {});
  }

  public async saveShardAsync(shard: GalxShardAccount): Promise<void> {
    this.shardTable.put(shard.id, shard);
    await this.shardRepo.saveShard(shard);
  }

  public deleteShard(shardId: string): void {
    this.shardTable.delete(shardId);
    this.shardRepo.deleteShard(shardId).catch(() => {});
  }

  public async deleteShardAsync(shardId: string): Promise<void> {
    this.shardTable.delete(shardId);
    await this.shardRepo.deleteShard(shardId);
  }

  public queryShardsNatural(naturalQuery: string): GalxShardAccount[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'shards');
    return this.shardTable.query(parsed.queryOptions) as GalxShardAccount[];
  }

  public aggregateShards(query: DbAggregateQuery): DbAggregateResult {
    return this.shardTable.aggregate(query);
  }

  // ==========================================
  // Developer Gateway Keys
  // ==========================================

  public getGatewayKeys(): DeveloperGatewayKey[] {
    return this.apiKeyTable.getAll() as DeveloperGatewayKey[];
  }

  public async getGatewayKeysAsync(userId?: string): Promise<DeveloperGatewayKey[]> {
    const keys = await this.apiKeyRepo.getGatewayKeys(userId);
    if (!userId) {
      for (const k of keys) {
        this.apiKeyTable.put(k.id, k);
      }
    }
    return keys;
  }

  public saveGatewayKey(key: DeveloperGatewayKey): void {
    this.apiKeyTable.put(key.id, key);
    this.apiKeyRepo.saveGatewayKey(key).catch(() => {});
  }

  public async saveGatewayKeyAsync(key: DeveloperGatewayKey): Promise<void> {
    this.apiKeyTable.put(key.id, key);
    await this.apiKeyRepo.saveGatewayKey(key);
  }

  // ==========================================
  // Task Queues
  // ==========================================

  public getQueues(): GalxTaskQueueConfig[] {
    return this.queueTable.getAll() as GalxTaskQueueConfig[];
  }

  public async getQueuesAsync(): Promise<GalxTaskQueueConfig[]> {
    const queues = await this.queueRepo.getQueues();
    for (const q of queues) {
      this.queueTable.put(q.id, q);
    }
    return queues;
  }

  public saveQueue(queue: GalxTaskQueueConfig): void {
    this.queueTable.put(queue.id, queue);
    this.queueRepo.saveQueue(queue).catch(() => {});
  }

  public async saveQueueAsync(queue: GalxTaskQueueConfig): Promise<void> {
    this.queueTable.put(queue.id, queue);
    await this.queueRepo.saveQueue(queue);
  }

  public deleteQueue(queueId: string): void {
    this.queueTable.delete(queueId);
    const queueTasks = this.taskTable.query({ where: { queueId: { $eq: queueId } } });
    for (const t of queueTasks) {
      this.taskTable.delete(t.id);
    }
    this.queueRepo.deleteQueue(queueId).catch(() => {});
  }

  public async deleteQueueAsync(queueId: string): Promise<void> {
    this.queueTable.delete(queueId);
    const queueTasks = this.taskTable.query({ where: { queueId: { $eq: queueId } } });
    for (const t of queueTasks) {
      this.taskTable.delete(t.id);
    }
    await this.queueRepo.deleteQueue(queueId);
  }

  // ==========================================
  // Tasks
  // ==========================================

  public getTasks(): GalxTask[] {
    return this.taskTable.getAll() as GalxTask[];
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
    this.taskTable.put(task.id, task);
    this.taskRepo.saveTask(task).catch(() => {});
  }

  public async saveTaskAsync(task: GalxTask): Promise<void> {
    this.taskTable.put(task.id, task);
    await this.taskRepo.saveTask(task);
  }

  public deleteTask(taskId: string): void {
    this.taskTable.delete(taskId);
    this.taskRepo.deleteTask(taskId).catch(() => {});
  }

  public async deleteTaskAsync(taskId: string): Promise<void> {
    this.taskTable.delete(taskId);
    await this.taskRepo.deleteTask(taskId);
  }

  public purgeQueueTasks(queueId: string, statusFilter?: string): number {
    const whereClause: Record<string, any> = { queueId: { $eq: queueId } };
    if (statusFilter) {
      whereClause.status = { $eq: statusFilter };
    }
    const matching = this.taskTable.query({ where: whereClause });
    for (const task of matching) {
      this.taskTable.delete(task.id);
    }
    this.taskRepo.purgeTasks(queueId, statusFilter).catch(() => {});
    return matching.length;
  }

  public queryTasksNatural(naturalQuery: string): GalxTask[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'tasks');
    return this.taskTable.query(parsed.queryOptions) as GalxTask[];
  }

  // ==========================================
  // Audit Logs
  // ==========================================

  public getAuditLogs(): any[] {
    return this.auditTable.query({
      sortBy: 'timestampMs',
      sortOrder: 'desc',
      limit: 500
    }) as any[];
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
    this.auditTable.put(logItem.id, logItem);
    this.auditRepo.logAudit({
      action,
      metadata,
      shardId,
      userId
    }).catch(() => {});
  }

  public queryAuditsNatural(naturalQuery: string): any[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'audit_logs');
    return this.auditTable.query(parsed.queryOptions) as any[];
  }

  public aggregateAudits(query: DbAggregateQuery): DbAggregateResult {
    return this.auditTable.aggregate(query);
  }
}
