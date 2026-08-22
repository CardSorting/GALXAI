/**
 * GALXAI Developer SDK: Queues & Worker Stream Resource
 */

import type {
  GalxTaskQueueConfig,
  QueueTelemetryStats,
  GalxTask,
  TaskLeaseRequest,
  TaskLeaseResult,
  BulkRedriveResponse,
  BulkCancelResponse,
  GalxQueueEvent
} from '../../core/contracts/GalxContracts';
import type { GalxAIClientCore } from '../client';

export class QueuesResource {
  private readonly client: GalxAIClientCore;

  constructor(client: GalxAIClientCore) {
    this.client = client;
  }

  /**
   * Lists all task queues with live telemetry stats.
   */
  public async list(): Promise<GalxTaskQueueConfig[]> {
    const res = await this.client.request<{ queues: GalxTaskQueueConfig[] }>('/api/queues');
    return res.queues;
  }

  /**
   * Fetches real-time telemetry and health statistics for a named queue.
   */
  public async getStats(queueId: string): Promise<QueueTelemetryStats> {
    const res = await this.client.request<{ stats: QueueTelemetryStats }>(`/api/queues/${queueId}`);
    return res.stats;
  }

  /**
   * Pauses dispatching for a queue.
   */
  public async pause(queueId: string): Promise<boolean> {
    const res = await this.client.request<{ queue: GalxTaskQueueConfig }>(`/api/queues/${queueId}`, {
      method: 'PATCH',
      body: { state: 'PAUSED' }
    });
    return res.queue.state === 'PAUSED';
  }

  /**
   * Resumes dispatching for a paused or draining queue.
   */
  public async resume(queueId: string): Promise<boolean> {
    const res = await this.client.request<{ queue: GalxTaskQueueConfig }>(`/api/queues/${queueId}`, {
      method: 'PATCH',
      body: { state: 'RUNNING' }
    });
    return res.queue.state === 'RUNNING';
  }

  /**
   * Puts queue into DRAINING maintenance mode.
   */
  public async drain(queueId: string): Promise<boolean> {
    const res = await this.client.request<{ queue: GalxTaskQueueConfig }>(`/api/queues/${queueId}`, {
      method: 'PATCH',
      body: { state: 'DRAINING' }
    });
    return res.queue.state === 'DRAINING';
  }

  /**
   * Purges tasks from a queue.
   */
  public async purge(queueId: string, statusFilter?: string): Promise<{ purgedCount: number }> {
    return this.client.request<{ purgedCount: number }>(`/api/queues/${queueId}/purge`, {
      method: 'POST',
      body: statusFilter ? { statusFilter } : undefined
    });
  }

  /**
   * Single-click bulk redrive for dead-lettered tasks in a queue.
   */
  public async bulkRedrive(queueId: string, maxTasks = 100): Promise<BulkRedriveResponse> {
    return this.client.request<BulkRedriveResponse>(`/api/queues/${queueId}/redrive`, {
      method: 'POST',
      body: { maxTasks }
    });
  }

  /**
   * Bulk cancels tasks matching filter criteria.
   */
  public async bulkCancel(queueId: string, params: { tag?: string; groupId?: string }): Promise<BulkCancelResponse> {
    return this.client.request<BulkCancelResponse>(`/api/queues/${queueId}/tasks/bulk-cancel`, {
      method: 'POST',
      body: params
    });
  }

  /**
   * Leases tasks atomically for pull worker fleets.
   */
  public async leaseTasks(queueId: string, req: TaskLeaseRequest): Promise<TaskLeaseResult> {
    return this.client.request<TaskLeaseResult>(`/api/queues/${queueId}/lease`, {
      method: 'POST',
      body: req
    });
  }

  /**
   * Acknowledges task completion.
   */
  public async acknowledgeTask(queueId: string, taskId: string, workerId: string, resultData?: any): Promise<boolean> {
    const res = await this.client.request<{ acknowledged: boolean }>(`/api/queues/${queueId}/tasks/${taskId}/acknowledge`, {
      method: 'POST',
      body: { workerId, resultData }
    });
    return res.acknowledged;
  }

  /**
   * Reports task failure (NACK) to trigger exponential backoff or DLQ.
   */
  public async failTask(queueId: string, taskId: string, workerId: string, errorMessage: string): Promise<boolean> {
    const res = await this.client.request<{ failed: boolean }>(`/api/queues/${queueId}/tasks/${taskId}/fail`, {
      method: 'POST',
      body: { workerId, errorMessage }
    });
    return res.failed;
  }

  /**
   * Streams real-time lifecycle and telemetry events across a queue via SSE.
   */
  public async *streamEvents(queueId: string): AsyncIterable<GalxQueueEvent> {
    const stream = this.client.requestEventStream(`/api/queues/${queueId}/stream`);
    for await (const evt of stream) {
      yield evt;
    }
  }
}
