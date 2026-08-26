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

export interface ImageGenerateParams {
  prompt: string;
  model?: string;
  size?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:2' | '4:5' | '21:9' | string;
  aspect_ratio?: string;
  quality?: 'standard' | 'hd';
  n?: number;
  negativePrompt?: string;
  negative_prompt?: string;
  responseFormat?: 'url' | 'b64_json';
  response_format?: 'url' | 'b64_json';
  style?: string;
  seed?: number;
}

export class ImagesResource {
  private readonly client: GalxAIClientCore;

  constructor(client: GalxAIClientCore) {
    this.client = client;
  }

  /**
   * Helper to normalize aspect ratio into standard pixel resolutions
   */
  private normalizeParams(params: ImageGenerateParams): Record<string, any> {
    const ratio = params.aspectRatio || params.aspect_ratio;
    let size = params.size;

    if (!size && ratio) {
      switch (ratio) {
        case '16:9':
          size = '1792x1024';
          break;
        case '9:16':
          size = '1024x1792';
          break;
        case '4:3':
          size = '1024x768';
          break;
        case '3:2':
          size = '1536x1024';
          break;
        case '4:5':
          size = '896x1120';
          break;
        case '21:9':
          size = '1792x768';
          break;
        case '1:1':
        default:
          size = '1024x1024';
          break;
      }
    }

    return {
      prompt: params.prompt,
      model: params.model || 'openai-gpt-image-2',
      size: size || '1024x1024',
      aspectRatio: ratio || '1:1',
      quality: params.quality || 'standard',
      n: params.n || 1,
      negative_prompt: params.negativePrompt || params.negative_prompt,
      response_format: params.responseFormat || params.response_format || 'url',
      style: params.style,
      seed: params.seed
    };
  }

  /**
   * Generates images synchronously.
   */
  public async generate(params: ImageGenerateParams): Promise<ImageGenerationResponse> {
    const payload = this.normalizeParams(params);
    return this.client.request<ImageGenerationResponse>('/v1/images/generations', {
      method: 'POST',
      body: payload
    });
  }

  /**
   * Enqueues an asynchronous visual synthesis task into the dedicated GPU rate-managed queue.
   */
  public async generateAsync(params: ImageGenerationAsyncParams & ImageGenerateParams): Promise<AsyncTaskHandle<ImageGenerationResponse>> {
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

    const payload = this.normalizeParams(params);

    const response = await this.client.request<{
      id: string;
      queue: string;
      status: string;
      task_url: string;
    }>('/v1/images/generations', {
      method: 'POST',
      headers,
      body: payload
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
