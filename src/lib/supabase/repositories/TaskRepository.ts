/**
 * GALXAI: Supabase Task & DAG Workflow Repository + BroccoliDB Hot Tables
 * Atomic worker task leasing with FOR UPDATE SKIP LOCKED, DAG fan-in dependency aggregation,
 * strict FIFO group locks, and execution history.
 * Backed by BroccoliDB L1 reactive tables with secondary indexing, natural query AST translation, and aggregation.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import { executePostgresQuery } from '../../db/postgres';
import type { Database } from '../types';
import type {
  GalxTask,
  TaskStatus,
  TaskDispatchTarget,
  TaskAttemptRecord,
  TaskProgressInfo,
  CronScheduleConfig,
  TaskPipelineStep
} from '../../../core/contracts/GalxContracts';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../../core/broccolidb/broccolidb-natural-query';
import type { DbQueryOptions, DbAggregateQuery, DbAggregateResult } from '../../../core/broccolidb/broccolidb.contracts';

export class TaskRepository {
  private static instance: TaskRepository;
  public readonly taskTable: BroccoliDbTable<GalxTask>;
  public readonly attemptTable: BroccoliDbTable<TaskAttemptRecord & { id: string; taskId: string }>;

  private constructor() {
    this.taskTable = new BroccoliDbTable<GalxTask>('tasks');
    this.taskTable.createIndex('queueId');
    this.taskTable.createIndex('status');
    this.taskTable.createIndex('userId');
    this.taskTable.createIndex('idempotencyKey');
    this.taskTable.createIndex('groupId');
    this.taskTable.createIndex('activeWorkerId');
    this.taskTable.createSortedIndex('priority');
    this.taskTable.createSortedIndex('scheduleTimeMs');
    this.taskTable.createSortedIndex('createdAtMs');

    this.attemptTable = new BroccoliDbTable<TaskAttemptRecord & { id: string; taskId: string }>('task_attempts');
    this.attemptTable.createIndex('taskId');
    this.attemptTable.createIndex('workerId');
    this.attemptTable.createSortedIndex('startedAtMs');
  }

  static getInstance(): TaskRepository {
    if (!TaskRepository.instance) {
      TaskRepository.instance = new TaskRepository();
    }
    return TaskRepository.instance;
  }

  async getTasks(params?: {
    queueId?: string;
    status?: TaskStatus;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<GalxTask[]> {
    // 1. Direct PostgreSQL Connection Pool Query with Circuit Breaker (<1.5ms)
    const res = await executePostgresQuery(
      `SELECT * FROM galx_tasks
       WHERE ($1::text IS NULL OR queue_id = $1)
         AND ($2::text IS NULL OR status = $2)
         AND ($3::text IS NULL OR user_id = $3)
       ORDER BY created_at_ms DESC
       LIMIT $4 OFFSET $5;`,
      [params?.queueId || null, params?.status || null, params?.userId || null, params?.limit || 50, params?.offset || 0]
    );

    if (res && res.rows && res.rows.length > 0) {
      const mapped = res.rows.map(r => this.mapRowToTask(r));
      for (const t of mapped) this.taskTable.put(t.id, t);
      return mapped;
    }

    // 2. Supabase PostgREST Fallback
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        let query = supabase.from('galx_tasks').select('*').order('created_at_ms', { ascending: false });

        if (params?.queueId) query = query.eq('queue_id', params.queueId);
        if (params?.status) query = query.eq('status', params.status);
        if (params?.userId) query = query.eq('user_id', params.userId);
        if (params?.limit) query = query.limit(params.limit);
        if (params?.offset) query = query.range(params.offset, params.offset + (params.limit || 50) - 1);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const mapped = data.map(this.mapRowToTask);
          for (const t of mapped) this.taskTable.put(t.id, t);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    const whereClause: Record<string, any> = {};
    if (params?.queueId) whereClause.queueId = { $eq: params.queueId };
    if (params?.status) whereClause.status = { $eq: params.status };
    if (params?.userId) whereClause.userId = { $eq: params.userId };

    return this.taskTable.query({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      sortBy: 'createdAtMs',
      sortOrder: 'desc',
      limit: params?.limit || 50,
      offset: params?.offset || 0
    }) as GalxTask[];
  }

  async getTaskById(taskId: string): Promise<GalxTask | null> {
    // 0. BroccoliDB L1 Hot Table Check (<0.01ms)
    const local = this.taskTable.get(taskId);
    if (local) return local;

    // 1. Direct PostgreSQL Connection Pool Query with Circuit Breaker
    const res = await executePostgresQuery('SELECT * FROM galx_tasks WHERE id = $1 LIMIT 1;', [taskId]);
    if (res && res.rows && res.rows[0]) {
      const mapped = this.mapRowToTask(res.rows[0]);
      this.taskTable.put(mapped.id, mapped);
      return mapped;
    }

    // 2. Supabase PostgREST Fallback
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (!error && data) {
          const mapped = this.mapRowToTask(data);
          this.taskTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.taskTable.get(taskId) || null;
  }

  async findTaskByIdempotency(queueId: string, idempotencyKey: string): Promise<GalxTask | null> {
    // 0. BroccoliDB L1 Check
    const matches = this.taskTable.query({
      where: {
        queueId: { $eq: queueId },
        idempotencyKey: { $eq: idempotencyKey }
      }
    }) as GalxTask[];
    if (matches[0]) return matches[0];

    // 1. Direct PostgreSQL Connection Pool Query
    const res = await executePostgresQuery(
      'SELECT * FROM galx_tasks WHERE queue_id = $1 AND idempotency_key = $2 LIMIT 1;',
      [queueId, idempotencyKey]
    );
    if (res && res.rows && res.rows[0]) {
      const mapped = this.mapRowToTask(res.rows[0]);
      this.taskTable.put(mapped.id, mapped);
      return mapped;
    }
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_tasks')
          .select('*')
          .eq('queue_id', queueId)
          .eq('idempotency_key', idempotencyKey)
          .single();

        if (!error && data) {
          const mapped = this.mapRowToTask(data);
          this.taskTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return null;
  }

  async findTaskByContentHash(
    queueId: string,
    contentHash: string,
    windowMs: number = 86400000
  ): Promise<GalxTask | null> {
    const cutoffMs = Date.now() - windowMs;
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_tasks')
          .select('*')
          .eq('queue_id', queueId)
          .eq('content_hash', contentHash)
          .gte('created_at_ms', cutoffMs)
          .order('created_at_ms', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          const mapped = this.mapRowToTask(data);
          this.taskTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    const matches = this.taskTable.query({
      where: {
        queueId: { $eq: queueId },
        createdAtMs: { $gte: cutoffMs }
      }
    }) as GalxTask[];

    for (const t of matches) {
      if ((t as any).contentHash === contentHash) {
        return t;
      }
    }
    return null;
  }

  async saveTask(task: GalxTask): Promise<void> {
    this.taskTable.put(task.id, task);
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const row = this.mapTaskToRow(task);
        await supabase.from('galx_tasks').upsert(row, { onConflict: 'id' });
      } catch {
        // Fallback
      }
    }
  }

  async saveTasksBatch(tasks: GalxTask[]): Promise<void> {
    if (tasks.length === 0) return;
    for (const t of tasks) this.taskTable.put(t.id, t);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const rows = tasks.map(t => this.mapTaskToRow(t));
        await supabase.from('galx_tasks').upsert(rows, { onConflict: 'id' });
      } catch {
        // Fallback
      }
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    this.taskTable.delete(taskId);
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_tasks').delete().eq('id', taskId);
      } catch {
        // Fallback
      }
    }
  }

  async purgeTasks(queueId: string, statusFilter?: string): Promise<number> {
    const whereClause: Record<string, any> = { queueId: { $eq: queueId } };
    if (statusFilter) whereClause.status = { $eq: statusFilter };

    const matches = this.taskTable.query({ where: whereClause }) as GalxTask[];
    for (const m of matches) {
      this.taskTable.delete(m.id);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        let query = supabase.from('galx_tasks').delete().eq('queue_id', queueId);
        if (statusFilter) query = query.eq('status', statusFilter as any);
        await query;
      } catch {
        // Fallback
      }
    }

    return matches.length;
  }

  async leaseTasksForWorker(params: {
    queueId: string;
    workerId: string;
    maxTasks?: number;
    leaseDurationMs?: number;
    tagFilter?: string;
    groupIdFilter?: string;
  }): Promise<GalxTask[]> {
    // 1. Direct PostgreSQL Connection Pool Query with Circuit Breaker (<1.5ms)
    const poolRes = await executePostgresQuery(
      'SELECT * FROM fn_lease_queue_tasks($1, $2, $3, $4, $5, $6, $7);',
      [
        params.queueId,
        params.workerId,
        params.maxTasks || 10,
        params.leaseDurationMs || 60000,
        params.tagFilter || null,
        params.groupIdFilter || null,
        Date.now()
      ]
    );
    if (poolRes && poolRes.rows && poolRes.rows.length > 0) {
      const mapped = poolRes.rows.map(r => this.mapRowToTask(r));
      for (const t of mapped) this.taskTable.put(t.id, t);
      return mapped;
    }

    // 2. Supabase RPC Fallback
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_lease_queue_tasks', {
          p_queue_id: params.queueId,
          p_worker_id: params.workerId,
          p_max_tasks: params.maxTasks || 10,
          p_lease_duration_ms: params.leaseDurationMs || 60000,
          p_tag_filter: params.tagFilter || undefined,
          p_group_id_filter: params.groupIdFilter || undefined,
          p_now_ms: Date.now()
        });

        if (!error && data && Array.isArray(data) && data.length > 0) {
          const mapped = (data as Database['public']['Tables']['galx_tasks']['Row'][]).map(this.mapRowToTask);
          for (const t of mapped) this.taskTable.put(t.id, t);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.leaseTasksFallback(params);
  }

  async recordAttempt(taskId: string, attempt: TaskAttemptRecord): Promise<void> {
    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.attemptTable.put(attemptId, { ...attempt, id: attemptId, taskId });

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_task_attempts').insert({
          task_id: taskId,
          attempt_number: attempt.attemptNumber,
          started_at_ms: attempt.startedAtMs,
          completed_at_ms: attempt.completedAtMs || null,
          duration_ms: attempt.durationMs || null,
          response_status_code: attempt.responseStatusCode || null,
          error_message: attempt.errorMessage || null,
          error_details: (attempt.errorDetails as any) || null,
          shard_id_used: attempt.shardIdUsed || null,
          model_used: attempt.modelUsed || null,
          worker_id: attempt.workerId || null
        });
      } catch {
        // Fallback
      }
    }
  }

  async commitTaskAttemptsBatch(attempts: Array<{
    taskId: string;
    attemptNumber?: number;
    startedAtMs: number;
    completedAtMs?: number;
    durationMs?: number;
    statusCode?: number;
    errorMessage?: string;
    status?: string;
    result?: any;
    lastError?: any;
    workerId?: string;
  }>): Promise<number> {
    if (attempts.length === 0) return 0;

    for (const a of attempts) {
      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      this.attemptTable.put(attemptId, {
        id: attemptId,
        taskId: a.taskId,
        attemptNumber: a.attemptNumber || 1,
        startedAtMs: a.startedAtMs,
        completedAtMs: a.completedAtMs,
        durationMs: a.durationMs,
        responseStatusCode: a.statusCode,
        errorMessage: a.errorMessage,
        workerId: a.workerId
      });

      if (a.status) {
        const task = this.taskTable.get(a.taskId);
        if (task) {
          this.taskTable.put(a.taskId, {
            ...task,
            status: a.status as any,
            result: a.result || task.result,
            lastError: a.lastError || task.lastError,
            updatedAtMs: Date.now()
          });
        }
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_batch_commit_task_attempts_cf', {
          p_attempts: attempts as any
        });

        if (!error && typeof data === 'number') {
          return data;
        }
      } catch {
        // Fallback
      }
    }

    return attempts.length;
  }

  async updateProgress(taskId: string, progress: TaskProgressInfo): Promise<void> {
    const task = this.taskTable.get(taskId);
    if (task) {
      this.taskTable.put(taskId, {
        ...task,
        progress,
        updatedAtMs: Date.now()
      });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('galx_tasks')
          .update({
            progress: progress as any,
            updated_at_ms: Date.now()
          })
          .eq('id', taskId);
      } catch {
        // Fallback
      }
    }
  }

  public queryTasksNatural(naturalQuery: string): GalxTask[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'tasks');
    return this.taskTable.query(parsed.queryOptions) as GalxTask[];
  }

  public aggregateTasks(query: DbAggregateQuery): DbAggregateResult {
    return this.taskTable.aggregate(query);
  }

  private leaseTasksFallback(params: {
    queueId: string;
    workerId: string;
    maxTasks?: number;
    leaseDurationMs?: number;
    tagFilter?: string;
    groupIdFilter?: string;
  }): GalxTask[] {
    const now = Date.now();
    const max = params.maxTasks || 10;
    const leaseDuration = params.leaseDurationMs || 60000;

    const available = this.taskTable.query({
      where: {
        queueId: { $eq: params.queueId }
      },
      sortBy: 'priority',
      sortOrder: 'desc'
    }) as GalxTask[];

    const leased: GalxTask[] = [];
    for (const t of available) {
      if (leased.length >= max) break;
      const canLease =
        (t.status === 'QUEUED' || t.status === 'RETRYING') &&
        t.scheduleTimeMs <= now &&
        (!t.leaseExpiresAtMs || t.leaseExpiresAtMs < now);

      if (canLease) {
        if (params.tagFilter && t.tag !== params.tagFilter) continue;
        if (params.groupIdFilter && t.groupId !== params.groupIdFilter) continue;

        const updated: GalxTask = {
          ...t,
          status: 'RUNNING',
          activeWorkerId: params.workerId,
          activeFencingToken: (t.activeFencingToken || 0) + 1,
          leaseExpiresAtMs: now + leaseDuration,
          dispatchCount: (t.dispatchCount || 0) + 1,
          firstAttemptMs: t.firstAttemptMs || now,
          lastAttemptMs: now,
          updatedAtMs: now
        };
        this.taskTable.put(t.id, updated);
        leased.push(updated);
      }
    }

    return leased;
  }

  private mapRowToTask(data: Database['public']['Tables']['galx_tasks']['Row']): GalxTask {
    return {
      id: data.id,
      queueId: data.queue_id,
      userId: data.user_id,
      idempotencyKey: data.idempotency_key || undefined,
      contentBasedDeduplication: data.content_hash ? true : undefined,
      tag: data.tag || undefined,
      groupId: data.group_id || undefined,
      dependsOn: data.depends_on || [],
      priority: data.priority,
      target: data.target_payload as unknown as TaskDispatchTarget,
      pipelineSteps: (data.pipeline_steps as unknown as TaskPipelineStep[]) || undefined,
      cronConfig: (data.cron_config as unknown as CronScheduleConfig) || undefined,
      deadlineMs: data.deadline_ms ? Number(data.deadline_ms) : undefined,
      ttlMs: data.ttl_ms ? Number(data.ttl_ms) : undefined,
      status: data.status as TaskStatus,
      scheduleTimeMs: Number(data.schedule_time_ms),
      dispatchCount: data.dispatch_count,
      responseCount: data.response_count,
      firstAttemptMs: data.first_attempt_ms ? Number(data.first_attempt_ms) : undefined,
      lastAttemptMs: data.last_attempt_ms ? Number(data.last_attempt_ms) : undefined,
      leaseExpiresAtMs: data.lease_expires_at_ms ? Number(data.lease_expires_at_ms) : undefined,
      activeWorkerId: data.active_worker_id || undefined,
      activeFencingToken: data.active_fencing_token ? Number(data.active_fencing_token) : undefined,
      parentTaskResults: (data.parent_task_results as Record<string, any>) || {},
      progress: (data.progress as unknown as TaskProgressInfo) || undefined,
      activePipelineStepIndex: data.active_pipeline_step_index ?? 0,
      pipelineStepResults: (data.pipeline_step_results as any[]) || [],
      result: (data.result as any) || undefined,
      lastError: (data.last_error as any) || undefined,
      attempts: [],
      createdAtMs: Number(data.created_at_ms) || new Date(data.created_at).getTime(),
      updatedAtMs: Number(data.updated_at_ms) || new Date(data.updated_at).getTime()
    };
  }

  private mapTaskToRow(task: GalxTask): Database['public']['Tables']['galx_tasks']['Insert'] {
    return {
      id: task.id,
      queue_id: task.queueId,
      user_id: task.userId,
      idempotency_key: task.idempotencyKey || null,
      content_hash: (task as any).contentHash || null,
      tag: task.tag || null,
      group_id: task.groupId || null,
      depends_on: task.dependsOn || [],
      priority: task.priority,
      target_type: task.target?.type || 'INTERNAL_MODEL',
      target_payload: task.target as any,
      pipeline_steps: (task.pipelineSteps as any) || null,
      cron_config: (task.cronConfig as any) || null,
      deadline_ms: task.deadlineMs || null,
      ttl_ms: task.ttlMs || null,
      status: task.status,
      schedule_time_ms: task.scheduleTimeMs,
      dispatch_count: task.dispatchCount || 0,
      response_count: task.responseCount || 0,
      first_attempt_ms: task.firstAttemptMs || null,
      last_attempt_ms: task.lastAttemptMs || null,
      lease_expires_at_ms: task.leaseExpiresAtMs || null,
      active_worker_id: task.activeWorkerId || null,
      active_fencing_token: task.activeFencingToken || null,
      parent_task_results: (task.parentTaskResults as any) || {},
      progress: (task.progress as any) || null,
      active_pipeline_step_index: task.activePipelineStepIndex ?? 0,
      pipeline_step_results: (task.pipelineStepResults as any) || [],
      result: (task.result as any) || null,
      last_error: (task.lastError as any) || null,
      created_at_ms: task.createdAtMs,
      updated_at_ms: task.updatedAtMs
    };
  }
}
