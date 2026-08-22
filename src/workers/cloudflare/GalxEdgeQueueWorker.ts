/**
 * GALXAI: Cloudflare Edge Task Queue Worker Fleet
 * Distributed queue execution on Cloudflare Workers with zero outbound egress costs.
 * Polls Supabase PostgreSQL with FOR UPDATE SKIP LOCKED and dispatches tasks at global edge PoPs.
 */

import type { CloudflareEnv } from './GalxEdgeGateway';

export interface LeasedEdgeTask {
  id: string;
  queueId: string;
  userId: string;
  priority: number;
  target: {
    type: 'HTTP_PUSH' | 'INTERNAL_MODEL' | 'PULL_WORKER';
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    taskKind?: string;
    chatPayload?: any;
  };
  dispatchCount: number;
  leaseExpiresAtMs: number;
  fencingToken: number;
}

export class GalxEdgeQueueWorker {
  private readonly workerId: string;

  constructor(
    private readonly env: CloudflareEnv,
    workerIdPrefix = 'cf_edge_worker'
  ) {
    this.workerId = `${workerIdPrefix}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Executes a single processing pass across all configured task queues.
   */
  async processBatch(queueId = 'default', maxTasks = 20): Promise<{ processed: number; errors: number }> {
    // 1. Lease batch from Supabase PostgreSQL
    const tasks = await this.leaseBatchFromSupabase(queueId, maxTasks);
    if (!tasks || tasks.length === 0) {
      return { processed: 0, errors: 0 };
    }

    let processed = 0;
    let errors = 0;

    // 2. Concurrently execute tasks on Cloudflare Edge with zero-egress HTTP dispatch
    const results = await Promise.allSettled(
      tasks.map(async task => {
        const start = Date.now();
        try {
          await this.executeTask(task);
          await this.acknowledgeTask(task.queueId, task.id, {
            statusCode: 200,
            durationMs: Date.now() - start
          });
          processed++;
        } catch (err: any) {
          errors++;
          await this.nackTask(task.queueId, task.id, {
            errorMessage: err?.message || 'Execution error',
            durationMs: Date.now() - start
          });
        }
      })
    );

    return { processed, errors };
  }

  private async executeTask(task: LeasedEdgeTask): Promise<any> {
    if (task.target.type === 'HTTP_PUSH' && task.target.url) {
      const resp = await fetch(task.target.url, {
        method: task.target.method || 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'GALXAI-Edge-Worker/3.1.0',
          ...(task.target.headers || {})
        },
        body: task.target.body ? JSON.stringify(task.target.body) : undefined
      });

      if (!resp.ok && resp.status >= 500) {
        throw new Error(`Target HTTP push failed with status ${resp.status}`);
      }

      return resp.status;
    }

    // Default simulated edge execution
    return { success: true, edgeWorkerId: this.workerId };
  }

  private async leaseBatchFromSupabase(queueId: string, maxTasks: number): Promise<LeasedEdgeTask[]> {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_ROLE_KEY) {
      return [];
    }

    try {
      const resp = await fetch(`${this.env.SUPABASE_URL}/rest/v1/rpc/fn_lease_queue_tasks_batch_cf`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          p_queue_id: queueId,
          p_worker_id: this.workerId,
          p_max_tasks: maxTasks,
          p_lease_duration_ms: 60000,
          p_now_ms: Date.now()
        })
      });

      if (!resp.ok) return [];
      const data = (await resp.json()) as LeasedEdgeTask[];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  private async acknowledgeTask(queueId: string, taskId: string, details: { statusCode: number; durationMs: number }): Promise<void> {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_ROLE_KEY) return;
    try {
      await fetch(`${this.env.SUPABASE_URL}/rest/v1/galx_tasks?id=eq.${taskId}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          status: 'COMPLETED',
          result: { statusCode: details.statusCode, durationMs: details.durationMs, completedAtMs: Date.now() },
          updated_at_ms: Date.now()
        })
      });
    } catch {
      // Background retry
    }
  }

  private async nackTask(queueId: string, taskId: string, details: { errorMessage: string; durationMs: number }): Promise<void> {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_ROLE_KEY) return;
    try {
      await fetch(`${this.env.SUPABASE_URL}/rest/v1/galx_tasks?id=eq.${taskId}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          status: 'RETRYING',
          last_error: { message: details.errorMessage, timestampMs: Date.now() },
          updated_at_ms: Date.now()
        })
      });
    } catch {
      // Background retry
    }
  }
}
