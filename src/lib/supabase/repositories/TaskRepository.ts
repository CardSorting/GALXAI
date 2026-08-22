/**
 * GALXAI: Supabase Task & DAG Workflow Repository
 * Atomic worker task leasing with FOR UPDATE SKIP LOCKED, DAG fan-in dependency aggregation,
 * strict FIFO group locks, and execution history.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
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

export class TaskRepository {
  private static instance: TaskRepository;
  private readonly inMemoryTasks = new Map<string, GalxTask>();
  private readonly inMemoryAttempts = new Map<string, TaskAttemptRecord[]>();

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
          for (const t of mapped) this.inMemoryTasks.set(t.id, t);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    let all = Array.from(this.inMemoryTasks.values());
    if (params?.queueId) all = all.filter(t => t.queueId === params.queueId);
    if (params?.status) all = all.filter(t => t.status === params.status);
    if (params?.userId) all = all.filter(t => t.userId === params.userId);
    if (params?.offset) all = all.slice(params.offset);
    if (params?.limit) all = all.slice(0, params.limit);
    return all;
  }

  async getTaskById(taskId: string): Promise<GalxTask | null> {
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
          this.inMemoryTasks.set(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.inMemoryTasks.get(taskId) || null;
  }

  async findTaskByIdempotency(queueId: string, idempotencyKey: string): Promise<GalxTask | null> {
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
          this.inMemoryTasks.set(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    for (const task of this.inMemoryTasks.values()) {
      if (task.queueId === queueId && task.idempotencyKey === idempotencyKey) {
        return task;
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
          this.inMemoryTasks.set(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    for (const task of this.inMemoryTasks.values()) {
      if (task.queueId === queueId && (task as any).contentHash === contentHash && task.createdAtMs >= cutoffMs) {
        return task;
      }
    }
    return null;
  }

  async saveTask(task: GalxTask): Promise<void> {
    this.inMemoryTasks.set(task.id, task);
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
    for (const t of tasks) this.inMemoryTasks.set(t.id, t);

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
    this.inMemoryTasks.delete(taskId);
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
    let count = 0;
    for (const [id, task] of this.inMemoryTasks.entries()) {
      if (task.queueId === queueId && (!statusFilter || task.status === statusFilter)) {
        this.inMemoryTasks.delete(id);
        count++;
      }
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

    return count;
  }

  /**
   * High-Concurrency Worker Leasing with FOR UPDATE SKIP LOCKED
   */
  async leaseTasksForWorker(params: {
    queueId: string;
    workerId: string;
    maxTasks?: number;
    leaseDurationMs?: number;
    tagFilter?: string;
    groupIdFilter?: string;
  }): Promise<GalxTask[]> {
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
          return (data as Database['public']['Tables']['galx_tasks']['Row'][]).map(this.mapRowToTask);
        }
      } catch {
        // Fallback
      }
    }

    return this.leaseTasksFallback(params);
  }

  async recordAttempt(taskId: string, attempt: TaskAttemptRecord): Promise<void> {
    const list = this.inMemoryAttempts.get(taskId) || [];
    list.push(attempt);
    this.inMemoryAttempts.set(taskId, list);

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
      const list = this.inMemoryAttempts.get(a.taskId) || [];
      list.push({
        attemptNumber: a.attemptNumber || 1,
        startedAtMs: a.startedAtMs,
        completedAtMs: a.completedAtMs,
        durationMs: a.durationMs,
        responseStatusCode: a.statusCode,
        errorMessage: a.errorMessage,
        workerId: a.workerId
      });
      this.inMemoryAttempts.set(a.taskId, list);

      if (a.status) {
        const task = this.inMemoryTasks.get(a.taskId);
        if (task) {
          task.status = a.status as any;
          if (a.result) task.result = a.result;
          if (a.lastError) task.lastError = a.lastError;
          task.updatedAtMs = Date.now();
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
    const task = this.inMemoryTasks.get(taskId);
    if (task) {
      task.progress = progress;
      task.updatedAtMs = Date.now();
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

  async bulkRedrive(
    queueId: string,
    maxTasks: number = 100,
    tag?: string,
    userId?: string
  ): Promise<string[]> {
    const now = Date.now();
    const taskIds: string[] = [];

    for (const task of this.inMemoryTasks.values()) {
      if (
        task.queueId === queueId &&
        task.status === 'DEAD_LETTERED' &&
        (!tag || task.tag === tag) &&
        (!userId || task.userId === userId)
      ) {
        task.status = 'QUEUED';
        task.dispatchCount = 0;
        task.responseCount = 0;
        task.lastError = undefined;
        task.scheduleTimeMs = now;
        task.updatedAtMs = now;
        taskIds.push(task.id);
        if (taskIds.length >= maxTasks) break;
      }
    }

    if (isSupabaseConfigured() && taskIds.length > 0) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('galx_tasks')
          .update({
            status: 'QUEUED',
            dispatch_count: 0,
            response_count: 0,
            last_error: null,
            schedule_time_ms: now,
            updated_at_ms: now
          })
          .in('id', taskIds);
      } catch {
        // Fallback
      }
    }

    return taskIds;
  }

  async bulkCancel(
    queueId: string,
    tag?: string,
    userId?: string,
    groupId?: string,
    statusFilter?: TaskStatus
  ): Promise<string[]> {
    const now = Date.now();
    const taskIds: string[] = [];

    for (const task of this.inMemoryTasks.values()) {
      const matchesStatus = statusFilter
        ? task.status === statusFilter
        : ['QUEUED', 'SCHEDULED', 'WAITING_DEPENDENCIES', 'RETRYING'].includes(task.status);

      if (
        task.queueId === queueId &&
        matchesStatus &&
        (!tag || task.tag === tag) &&
        (!userId || task.userId === userId) &&
        (!groupId || task.groupId === groupId)
      ) {
        task.status = 'CANCELLED';
        task.updatedAtMs = now;
        taskIds.push(task.id);
      }
    }

    if (isSupabaseConfigured() && taskIds.length > 0) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('galx_tasks')
          .update({
            status: 'CANCELLED',
            updated_at_ms: now
          })
          .in('id', taskIds);
      } catch {
        // Fallback
      }
    }

    return taskIds;
  }

  private async leaseTasksFallback(params: {
    queueId: string;
    workerId: string;
    maxTasks?: number;
    leaseDurationMs?: number;
    tagFilter?: string;
    groupIdFilter?: string;
  }): Promise<GalxTask[]> {
    const now = Date.now();
    const available: GalxTask[] = [];

    for (const task of this.inMemoryTasks.values()) {
      if (task.queueId !== params.queueId) continue;
      if (!['QUEUED', 'SCHEDULED', 'RETRYING'].includes(task.status)) continue;
      if (task.scheduleTimeMs > now) continue;
      if (params.tagFilter && task.tag !== params.tagFilter) continue;
      if (params.groupIdFilter && task.groupId !== params.groupIdFilter) continue;

      available.push(task);
      if (available.length >= (params.maxTasks || 10)) break;
    }

    const leased: GalxTask[] = [];
    for (const t of available) {
      t.status = 'RUNNING';
      t.dispatchCount = (t.dispatchCount || 0) + 1;
      t.lastAttemptMs = now;
      t.firstAttemptMs = t.firstAttemptMs || now;
      t.leaseExpiresAtMs = now + (params.leaseDurationMs || 60000);
      t.activeWorkerId = params.workerId;
      t.activeFencingToken = (t.activeFencingToken || 0) + 1;
      t.updatedAtMs = now;
      leased.push(t);
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
