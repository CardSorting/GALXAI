/**
 * GALXAI: Supabase Task Queue Repository + BroccoliDB Hot Table
 * Governs asynchronous queue configurations, rate limit governors, retry backoff policies, and DLQ.
 * Backed by BroccoliDB L1 reactive table with secondary indexing and natural query parsing.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import { executePostgresQuery } from '../../db/postgres';
import type { Database } from '../types';
import type { GalxTaskQueueConfig, QueueState } from '../../../core/contracts/GalxContracts';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../../core/broccolidb/broccolidb-natural-query';

export class QueueRepository {
  private static instance: QueueRepository;
  public readonly queueTable: BroccoliDbTable<GalxTaskQueueConfig>;

  private constructor() {
    this.queueTable = new BroccoliDbTable<GalxTaskQueueConfig>('task_queues');
    this.queueTable.createIndex('name');
    this.queueTable.createIndex('state');
    this.queueTable.createSortedIndex('createdAtMs');
  }

  static getInstance(): QueueRepository {
    if (!QueueRepository.instance) {
      QueueRepository.instance = new QueueRepository();
    }
    return QueueRepository.instance;
  }

  async getQueues(): Promise<GalxTaskQueueConfig[]> {
    // 1. Direct PostgreSQL Connection Pool Query with Circuit Breaker (<1.5ms)
    const res = await executePostgresQuery('SELECT * FROM galx_task_queues ORDER BY created_at ASC;');
    if (res && res.rows && res.rows.length > 0) {
      const mapped = res.rows.map(r => this.mapRowToQueue(r));
      for (const q of mapped) this.queueTable.put(q.id, q);
      return mapped;
    }

    // 2. Supabase PostgREST Fallback
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_task_queues')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped = data.map(this.mapRowToQueue);
          for (const q of mapped) this.queueTable.put(q.id, q);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.queueTable.query({
      sortBy: 'createdAtMs',
      sortOrder: 'asc'
    }) as GalxTaskQueueConfig[];
  }

  async getQueueById(id: string): Promise<GalxTaskQueueConfig | null> {
    // 0. BroccoliDB L1 Hot Table Check (<0.01ms)
    const local = this.queueTable.get(id);
    if (local) return local;

    // 1. Direct PostgreSQL Connection Pool Query
    const res = await executePostgresQuery('SELECT * FROM galx_task_queues WHERE id = $1 LIMIT 1;', [id]);
    if (res && res.rows && res.rows[0]) {
      const mapped = this.mapRowToQueue(res.rows[0]);
      this.queueTable.put(mapped.id, mapped);
      return mapped;
    }

    // 2. Supabase PostgREST Fallback
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_task_queues')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          const mapped = this.mapRowToQueue(data);
          this.queueTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.queueTable.get(id) || null;
  }

  async saveQueue(queue: GalxTaskQueueConfig): Promise<void> {
    this.queueTable.put(queue.id, queue);
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const row = this.mapQueueToRow(queue);
        await supabase.from('galx_task_queues').upsert(row, { onConflict: 'id' });
      } catch {
        // Fallback
      }
    }
  }

  async deleteQueue(queueId: string): Promise<void> {
    this.queueTable.delete(queueId);
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_task_queues').delete().eq('id', queueId);
      } catch {
        // Fallback
      }
    }
  }

  async updateQueueState(queueId: string, state: QueueState): Promise<void> {
    const queue = this.queueTable.get(queueId);
    if (queue) {
      this.queueTable.put(queueId, { ...queue, state, updatedAtMs: Date.now() });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('galx_task_queues')
          .update({
            state,
            updated_at_ms: Date.now()
          })
          .eq('id', queueId);
      } catch {
        // Fallback
      }
    }
  }

  public queryNatural(naturalQuery: string): GalxTaskQueueConfig[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'task_queues');
    return this.queueTable.query(parsed.queryOptions) as GalxTaskQueueConfig[];
  }

  private mapRowToQueue(data: Database['public']['Tables']['galx_task_queues']['Row']): GalxTaskQueueConfig {
    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      state: data.state as QueueState,
      rateLimits: {
        maxDispatchesPerSecond: Number(data.max_dispatches_per_second),
        maxConcurrentDispatches: data.max_concurrent_dispatches,
        maxBurstSize: data.max_burst_size
      },
      retryConfig: {
        maxAttempts: data.max_attempts,
        maxRetryDurationMs: data.max_retry_duration_ms ? Number(data.max_retry_duration_ms) : undefined,
        minBackoffMs: data.min_backoff_ms,
        maxBackoffMs: data.max_backoff_ms,
        maxDoublings: data.max_doublings,
        jitterFactor: Number(data.jitter_factor)
      },
      deadLetterConfig: {
        targetQueueId: data.dlq_target_queue_id || undefined,
        retentionMs: data.dlq_retention_ms ? Number(data.dlq_retention_ms) : undefined,
        notificationWebhookUrl: data.dlq_webhook_url || undefined
      },
      defaultTenantMaxConcurrency: data.default_tenant_max_concurrency,
      contentBasedDeduplication: data.content_based_deduplication,
      defaultDeduplicationWindowMs: Number(data.default_deduplication_window_ms),
      priorityAgingIntervalMs: Number(data.priority_aging_interval_ms),
      createdAtMs: Number(data.created_at_ms) || new Date(data.created_at).getTime(),
      updatedAtMs: Number(data.updated_at_ms) || new Date(data.updated_at).getTime()
    };
  }

  private mapQueueToRow(queue: GalxTaskQueueConfig): Database['public']['Tables']['galx_task_queues']['Insert'] {
    return {
      id: queue.id,
      name: queue.name,
      description: queue.description || null,
      state: queue.state,
      max_dispatches_per_second: queue.rateLimits.maxDispatchesPerSecond,
      max_concurrent_dispatches: queue.rateLimits.maxConcurrentDispatches,
      max_burst_size: queue.rateLimits.maxBurstSize,
      max_attempts: queue.retryConfig.maxAttempts,
      max_retry_duration_ms: queue.retryConfig.maxRetryDurationMs || null,
      min_backoff_ms: queue.retryConfig.minBackoffMs,
      max_backoff_ms: queue.retryConfig.maxBackoffMs,
      max_doublings: queue.retryConfig.maxDoublings || 5,
      jitter_factor: queue.retryConfig.jitterFactor ?? 0.2,
      dlq_target_queue_id: queue.deadLetterConfig?.targetQueueId || null,
      dlq_retention_ms: queue.deadLetterConfig?.retentionMs || null,
      dlq_webhook_url: queue.deadLetterConfig?.notificationWebhookUrl || null,
      default_tenant_max_concurrency: queue.defaultTenantMaxConcurrency ?? 10,
      content_based_deduplication: queue.contentBasedDeduplication ?? false,
      default_deduplication_window_ms: queue.defaultDeduplicationWindowMs ?? 86400000,
      priority_aging_interval_ms: queue.priorityAgingIntervalMs ?? 30000,
      created_at_ms: queue.createdAtMs,
      updated_at_ms: queue.updatedAtMs
    };
  }
}
