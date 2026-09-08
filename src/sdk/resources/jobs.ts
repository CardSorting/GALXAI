/**
 * GALXAI Developer SDK: Jobs & Async Requests Ergonomic Resource
 * Frictionless background task execution without needing queue knowledge.
 */

import type { GalxTask, GalxQueueEvent } from '../../core/contracts/GalxContracts';
import type { AsyncTaskHandle } from '../types';
import type { GalxAIClientCore } from '../client';

export interface SubmitJobParams {
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  model?: string;
  type?: 'chat' | 'image' | 'workflow' | 'webhook';
  imageUrl?: string;
  webhookUrl?: string;
  priority?: number;
  idempotencyKey?: string;
  tag?: string;
}

export class JobsResource {
  private readonly client: GalxAIClientCore;

  constructor(client: GalxAIClientCore) {
    this.client = client;
  }

  /**
   * Submits any background AI request and immediately returns an ergonomic Async Job Handle.
   *
   * @example
   * ```ts
   * const job = await galx.jobs.submit({
   *   prompt: 'Generate an executive summary of market trends',
   *   model: 'gpt-5.6-sol'
   * });
   * const result = await job.result();
   * ```
   */
  public async submit(params: SubmitJobParams, options?: import('../types').RequestOptions): Promise<AsyncTaskHandle<any>> {
    const jobType = params.type || (params.imageUrl || (params.prompt && params.model?.includes('image')) ? 'image' : 'chat');
    let targetQueue = 'default';
    let targetPayload: any = null;

    if (jobType === 'image') {
      targetQueue = 'image-gen';
      targetPayload = {
        type: 'INTERNAL_MODEL',
        taskKind: 'image_generation',
        imagePayload: {
          prompt: params.prompt || '',
          model: params.model || 'openai-gpt-image-latest'
        }
      };
    } else if (jobType === 'webhook' && params.webhookUrl) {
      targetQueue = 'webhooks';
      targetPayload = {
        type: 'HTTP_PUSH',
        url: params.webhookUrl,
        method: 'POST',
        body: { prompt: params.prompt, messages: params.messages }
      };
    } else {
      targetQueue = 'default';
      targetPayload = {
        type: 'INTERNAL_MODEL',
        taskKind: 'chat_completion',
        chatPayload: {
          model: params.model || 'gpt-5.6-sol',
          messages: params.messages || [{ role: 'user', content: params.prompt || '' }]
        }
      };
    }

    const res = await this.client.request<{
      task: GalxTask;
      deduplicated: boolean;
    }>(`/api/queues/${targetQueue}/tasks`, {
      method: 'POST',
      body: {
        queueId: targetQueue,
        priority: params.priority ?? 50,
        tag: params.tag,
        idempotencyKey: params.idempotencyKey,
        target: targetPayload
      },
      ...options
    });

    const client = this.client;
    const taskId = res.task.id;

    return {
      taskId,
      queueId: targetQueue,
      status: res.task.status,
      taskUrl: `/api/queues/${targetQueue}/tasks/${taskId}`,

      async result(options = {}) {
        const timeoutMs = options.timeoutMs ?? 120000;
        const pollIntervalMs = options.intervalMs ?? 500;
        const startTime = Date.now();

        while (true) {
          if (Date.now() - startTime > timeoutMs) {
            throw new Error(`Job ${taskId} timed out waiting for result after ${timeoutMs}ms`);
          }

          const current = await client.request<GalxTask>(`/api/queues/${targetQueue}/tasks/${taskId}`);
          if (current.status === 'COMPLETED') {
            return current.result?.data;
          }
          if (current.status === 'DEAD_LETTERED' || current.status === 'CANCELLED' || current.status === 'EXPIRED') {
            throw new Error(`Job ${taskId} ended with status ${current.status}: ${current.lastError?.message || 'Unknown error'}`);
          }

          await new Promise(r => setTimeout(r, pollIntervalMs));
        }
      },

      async *streamProgress() {
        for await (const evt of client.requestEventStream(`/api/queues/${targetQueue}/tasks/${taskId}/stream`)) {
          if (evt.type === 'TASK_PROGRESS') {
            yield evt.data;
          }
        }
      },

      async cancel() {
        const delRes = await client.request<{ success: boolean }>(`/api/queues/${targetQueue}/tasks/${taskId}`, {
          method: 'DELETE'
        });
        return delRes.success;
      },

      async getSnapshot() {
        return client.request<GalxTask>(`/api/queues/${targetQueue}/tasks/${taskId}`);
      }
    };
  }

  /**
   * Retrieves an existing job by ID.
   */
  public async get(taskId: string, queueId: string = 'default'): Promise<GalxTask> {
    return this.client.request<GalxTask>(`/api/queues/${queueId}/tasks/${taskId}`);
  }

  /**
   * Lists recent jobs.
   */
  public async list(queueId: string = 'default', limit: number = 50): Promise<readonly GalxTask[]> {
    const res = await this.client.request<{ tasks: GalxTask[] }>(`/api/queues/${queueId}/tasks?limit=${limit}`);
    return res.tasks || [];
  }
}
