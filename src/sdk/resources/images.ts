/**
 * GALXAI Developer SDK: Visual Synthesis Resource
 */

import type {
  ImageGenerationResponse,
  GalxTask,
  TaskProgressInfo
} from '../../core/contracts/GalxContracts';
import type {
  ImageGenerationAsyncParams,
  AsyncTaskHandle
} from '../types';
import type { GalxAIClientCore } from '../client';

export class ImagesResource {
  private readonly client: GalxAIClientCore;

  constructor(client: GalxAIClientCore) {
    this.client = client;
  }

  /**
   * Generates images synchronously.
   */
  public async generate(params: {
    prompt: string;
    model?: string;
    size?: string;
    quality?: 'standard' | 'hd';
    n?: number;
  }): Promise<ImageGenerationResponse> {
    return this.client.request<ImageGenerationResponse>('/v1/images/generations', {
      method: 'POST',
      body: params
    });
  }

  /**
   * Enqueues an asynchronous visual synthesis task into the dedicated GPU rate-managed queue.
   */
  public async generateAsync(params: ImageGenerationAsyncParams): Promise<AsyncTaskHandle<ImageGenerationResponse>> {
    const queue = params.queue || 'image-gen';
    const headers: Record<string, string> = {
      'X-Galx-Async': 'true',
      'X-Galx-Queue': queue
    };

    if (params.groupId) headers['X-Galx-Group-Id'] = params.groupId;
    if (params.tag) headers['X-Galx-Tag'] = params.tag;
    if (params.priority) headers['X-Galx-Priority'] = String(params.priority);
    if (params.delayMs) headers['X-Galx-Delay-Ms'] = String(params.delayMs);
    if (params.idempotencyKey) headers['Idempotency-Key'] = params.idempotencyKey;
    if (params.webhookCompletionUrl) headers['X-Galx-Webhook-Url'] = params.webhookCompletionUrl;
    if (params.webhookHmacSecret) headers['X-Galx-Webhook-Secret'] = params.webhookHmacSecret;

    const response = await this.client.request<{
      id: string;
      queue: string;
      status: string;
      task_url: string;
    }>('/v1/images/generations', {
      method: 'POST',
      headers,
      body: {
        prompt: params.prompt,
        model: params.model,
        size: params.size,
        quality: params.quality,
        n: params.n
      }
    });

    const client = this.client;
    const taskId = response.id;
    const taskUrl = response.task_url;

    return {
      taskId,
      queueId: queue,
      status: 'QUEUED',
      taskUrl,

      async result(options = {}) {
        const timeoutMs = options.timeoutMs ?? 180000;
        const intervalMs = options.intervalMs ?? 1000;
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
          const snapshot = await client.request<{ task: GalxTask }>(`/api/queues/${queue}/tasks/${taskId}`);
          const task = snapshot.task;

          if (task.status === 'COMPLETED') {
            return task.result?.data as ImageGenerationResponse;
          }

          if (task.status === 'DEAD_LETTERED' || task.status === 'CANCELLED' || task.status === 'EXPIRED') {
            throw new Error(`Visual task '${taskId}' failed: ${task.status} (${task.lastError?.message || ''})`);
          }

          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        throw new Error(`Polling for visual task '${taskId}' timed out after ${timeoutMs}ms`);
      },

      async *streamProgress(): AsyncIterable<TaskProgressInfo> {
        const stream = client.requestEventStream(`/api/queues/${queue}/tasks/${taskId}/stream`);
        for await (const evt of stream) {
          if (evt.type === 'TASK_PROGRESS' && evt.data) {
            yield evt.data as TaskProgressInfo;
          }
        }
      },

      async cancel(): Promise<boolean> {
        const res = await client.request<{ cancelled: boolean }>(`/api/queues/${queue}/tasks/${taskId}`, {
          method: 'DELETE'
        });
        return res.cancelled;
      },

      async getSnapshot(): Promise<GalxTask> {
        const res = await client.request<{ task: GalxTask }>(`/api/queues/${queue}/tasks/${taskId}`);
        return res.task;
      }
    };
  }
}
