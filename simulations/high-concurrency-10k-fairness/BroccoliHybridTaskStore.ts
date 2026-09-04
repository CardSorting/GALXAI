/**
 * @file BroccoliHybridTaskStore.ts
 * @description Hybrid L1 Memory + BroccoliDB Reactive Task & State Engine.
 * Combines sub-microsecond in-memory hot-path queuing with BroccoliDB secondary indexing,
 * reactive CDC subscriptions, native TTL expiration, and crash-recovery snapshots.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BroccoliDbTable } from '../../src/core/broccolidb/broccolidb-table';
import {
  ClientRequest,
  DeadLetterTaskRecord,
  HybridStoreStats,
  JobTokenRecord,
  PersistedTaskRecord,
  ShardCapacity
} from './types';

export class BroccoliHybridTaskStore {
  public readonly taskTable: BroccoliDbTable<PersistedTaskRecord>;
  public readonly idempotencyTable: BroccoliDbTable<{ id: string; result: any; createdAtMs: number }>;
  public readonly dlqTable: BroccoliDbTable<DeadLetterTaskRecord & { id: string }>;
  public readonly shardTable: BroccoliDbTable<ShardCapacity & { id: string }>;
  public readonly jobTokensTable: BroccoliDbTable<JobTokenRecord>;

  constructor(prefix = 'hybrid_') {
    // 1. Tasks Table with multi-modal secondary & sorted indexes
    this.taskTable = new BroccoliDbTable<PersistedTaskRecord>(`${prefix}tasks`);
    this.taskTable.createIndex('tenantId');
    this.taskTable.createIndex('status');
    this.taskTable.createIndex('groupId');
    this.taskTable.createIndex('taskName');
    this.taskTable.createSortedIndex('enqueuedAtMs');
    this.taskTable.createSortedIndex('deadlineMs');

    // 2. Idempotency Table with native TTL auto-expiration
    this.idempotencyTable = new BroccoliDbTable<{ id: string; result: any; createdAtMs: number }>(
      `${prefix}idempotency`
    );

    // 3. Dead Letter Queue Table
    this.dlqTable = new BroccoliDbTable<DeadLetterTaskRecord & { id: string }>(`${prefix}dlq`);
    this.dlqTable.createIndex('tenantId');
    this.dlqTable.createSortedIndex('routedToDlqAtMs');

    // 4. Shard Capacity Table
    this.shardTable = new BroccoliDbTable<ShardCapacity & { id: string }>(`${prefix}shards`);
    this.shardTable.createIndex('isHealthy');
    this.shardTable.createSortedIndex('inFlight');

    // 5. Job Tokens Table for Resumable Streaming (Last-Event-ID)
    this.jobTokensTable = new BroccoliDbTable<JobTokenRecord>(`${prefix}tokens`);
    this.jobTokensTable.createIndex('jobId');
    this.jobTokensTable.createSortedIndex('seqIndex');
  }

  /**
   * Index incoming admitted request into BroccoliDB hot table.
   */
  public recordEnqueue(req: ClientRequest): void {
    const record: PersistedTaskRecord = {
      id: req.id,
      tenantId: req.tenantId,
      taskName: req.taskName,
      groupId: req.groupId,
      promptHash: req.promptHash,
      status: 'enqueued',
      enqueuedAtMs: req.enqueuedAtMs,
      deadlineMs: req.deadlineMs,
      attemptCount: req.attemptCount ?? 0
    };

    this.taskTable.put(req.id, record);
  }

  /**
   * Update task state to dispatching when leased to an upstream shard.
   */
  public recordDispatch(taskId: string, shardId: string): void {
    const existing = this.taskTable.get(taskId);
    if (!existing) return;

    this.taskTable.put(taskId, {
      ...existing,
      status: 'dispatching',
      dispatchedAtMs: Date.now(),
      assignedShardId: shardId
    });
  }

  /**
   * Update task state on successful completion.
   */
  public recordCompletion(taskId: string, latencyMs: number): void {
    const existing = this.taskTable.get(taskId);
    if (!existing) return;

    this.taskTable.put(taskId, {
      ...existing,
      status: 'completed',
      completedAtMs: Date.now(),
      executionLatencyMs: latencyMs
    });
  }

  /**
   * Record aged sojourn drop in BroccoliDB audit store.
   */
  public recordDroppedAged(taskId: string, sojournMs: number): void {
    const existing = this.taskTable.get(taskId);
    if (!existing) return;

    this.taskTable.put(taskId, {
      ...existing,
      status: 'dropped_aged',
      completedAtMs: Date.now(),
      errorReason: `Sojourn deadline exceeded (${sojournMs}ms wait)`
    });
  }

  /**
   * Store completed result in BroccoliDB with native TTL auto-expiration.
   */
  public putIdempotentResult(key: string, result: any, ttlMs = 15000): void {
    this.idempotencyTable.put(
      key,
      {
        id: key,
        result,
        createdAtMs: Date.now()
      },
      { ttlMs }
    );
  }

  public getIdempotentResult(key: string): any | null {
    const entry = this.idempotencyTable.get(key);
    return entry ? entry.result : null;
  }

  /**
   * Store poison pill in Dead Letter Queue hot table.
   */
  public recordDlq(record: DeadLetterTaskRecord): void {
    this.dlqTable.put(record.taskId, { ...record, id: record.taskId });

    const existing = this.taskTable.get(record.taskId);
    if (existing) {
      this.taskTable.put(record.taskId, {
        ...existing,
        status: 'dlq',
        errorReason: record.lastError,
        completedAtMs: Date.now()
      });
    }
  }

  /**
   * Sub-microsecond indexed lookup: find all pending tasks for a tenant.
   */
  public queryPendingByTenant(tenantId: string): PersistedTaskRecord[] {
    return this.taskTable.query({
      where: {
        tenantId: { $eq: tenantId },
        status: { $eq: 'enqueued' }
      }
    }) as PersistedTaskRecord[];
  }

  /**
   * Sub-microsecond sorted range scan: find expired tasks.
   */
  public queryExpiredTasks(nowMs: number): PersistedTaskRecord[] {
    return this.taskTable.query({
      where: {
        status: { $eq: 'enqueued' },
        deadlineMs: { $lt: nowMs }
      }
    }) as PersistedTaskRecord[];
  }

  /**
   * Reactive Change Data Capture (CDC) subscription:
   * Triggers callback on task table mutations with zero polling.
   */
  public subscribeToTaskEvents(callback: (change: any) => void): () => void {
    const sub = this.taskTable.subscribe((change) => {
      callback(change);
    });

    return () => sub.unsubscribe();
  }

  /**
   * Crash Recovery: Save active hot table state to disk checkpoint.
   */
  public saveSnapshot(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const snapshot = {
      timestamp: Date.now(),
      tasks: this.taskTable.query({}) as PersistedTaskRecord[],
      dlq: this.dlqTable.query({}) as (DeadLetterTaskRecord & { id: string })[]
    };

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
  }

  /**
   * Crash Recovery: Restore hot table state from disk checkpoint.
   */
  public restoreSnapshot(filePath: string): number {
    if (!fs.existsSync(filePath)) return 0;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const snapshot = JSON.parse(raw);

    let restored = 0;
    if (Array.isArray(snapshot.tasks)) {
      for (const t of snapshot.tasks) {
        // Orphaned dispatching tasks marked for re-queue
        if (t.status === 'dispatching' || t.status === 'enqueued') {
          t.status = 'enqueued';
        }
        this.taskTable.put(t.id, t);
        restored++;
      }
    }

    if (Array.isArray(snapshot.dlq)) {
      for (const d of snapshot.dlq) {
        this.dlqTable.put(d.id, d);
      }
    }

    return restored;
  }

  /**
   * Buffer an emitted streaming chunk for resumable SSE (Last-Event-ID).
   */
  public bufferStreamChunk(
    jobId: string,
    seqIndex: number,
    chunkText: string,
    isFinal = false,
    nowMs = Date.now()
  ): void {
    const record: JobTokenRecord = {
      id: `${jobId}_${seqIndex}`,
      jobId,
      seqIndex,
      chunkText,
      isFinal,
      createdAtMs: nowMs
    };
    this.jobTokensTable.put(record.id, record);
  }

  /**
   * Replay buffered chunks from a given sequence number onward.
   */
  public getStreamChunksFrom(jobId: string, fromSeqIndex = 0): JobTokenRecord[] {
    const allJobChunks = this.jobTokensTable.query({
      where: {
        jobId: { $eq: jobId }
      }
    }) as JobTokenRecord[];

    return allJobChunks
      .filter((c) => c.seqIndex >= fromSeqIndex)
      .sort((a, b) => a.seqIndex - b.seqIndex);
  }

  public getStats(): HybridStoreStats {
    const allTasks = this.taskTable.query({}) as PersistedTaskRecord[];
    const activeEnqueued = allTasks.filter((t) => t.status === 'enqueued').length;
    const completedTasks = allTasks.filter((t) => t.status === 'completed').length;

    return {
      totalTasksIndexed: allTasks.length,
      activeEnqueued,
      completedTasks,
      idempotencyEntries: this.idempotencyTable.query({}).length,
      dlqEntries: this.dlqTable.query({}).length,
      shardRecords: this.shardTable.query({}).length,
      bufferedTokenChunks: this.jobTokensTable.query({}).length
    };
  }
}
