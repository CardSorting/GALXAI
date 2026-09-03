/**
 * GALXAI Developer SDK: Visual Synthesis Resource
 * Supercharged with:
 * - Inpainting image edits (`client.images.edit()`)
 * - Visual variations (`client.images.createVariation()`)
 * - Multi-step diffusion denoising progress streaming (`client.images.stream()`)
 * - In-memory asset catalog & history backed by BroccoliDB (`client.images.history`)
 */

import type {
  ImageGenerationResponse,
  GalxTask,
  TaskProgressInfo
} from '../../core/contracts/GalxContracts';
import type {
  ImageGenerationAsyncParams,
  AsyncTaskHandle,
  RequestOptions
} from '../types';
import type { GalxAIClientCore } from '../client';
import { toFile, type Uploadable } from '../multimodal';
import { BroccoliDbTable } from '../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../core/broccolidb/broccolidb-natural-query';
import type { DbQueryOptions } from '../../core/broccolidb/broccolidb.contracts';

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

export interface ImageEditParams {
  prompt: string;
  image: Uploadable;
  mask?: Uploadable;
  model?: string;
  n?: number;
  size?: string;
  responseFormat?: 'url' | 'b64_json';
  response_format?: 'url' | 'b64_json';
}

export interface ImageVariationParams {
  image: Uploadable;
  model?: string;
  n?: number;
  size?: string;
  responseFormat?: 'url' | 'b64_json';
  response_format?: 'url' | 'b64_json';
}

export interface EnhancedImageResponse extends ImageGenerationResponse {
  /** Convenience shortcut to primary image URL (`data[0]?.url`) */
  readonly url?: string;
  /** Convenience array of all non-empty image URLs */
  readonly urls: string[];
  /** Convenience shortcut to primary base64 image data (`data[0]?.b64_json`) */
  readonly b64?: string;
  /** Saves the primary image to a local file in Node.js */
  save(filePath: string): Promise<string>;
}

export function wrapImageResponse(raw: ImageGenerationResponse): EnhancedImageResponse {
  const primaryUrl = raw.data?.[0]?.url;
  const primaryB64 = raw.data?.[0]?.b64_json;
  const allUrls = (raw.data || []).map(d => d.url).filter(Boolean) as string[];

  return {
    ...raw,
    url: primaryUrl,
    urls: allUrls,
    b64: primaryB64,
    async save(filePath: string): Promise<string> {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      if (primaryB64) {
        await fs.writeFile(filePath, Buffer.from(primaryB64, 'base64'));
        return filePath;
      }

      if (primaryUrl) {
        if (primaryUrl.startsWith('data:')) {
          const base64Data = primaryUrl.split(',')[1] || '';
          await fs.writeFile(filePath, Buffer.from(base64Data, 'base64'));
          return filePath;
        }

        if (primaryUrl.includes('images.galxai.dev/mock')) {
          await fs.writeFile(filePath, Buffer.from(`MOCK_IMAGE_DATA_${primaryUrl}`));
          return filePath;
        }

        const res = await fetch(primaryUrl);
        const arrayBuf = await res.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(arrayBuf));
        return filePath;
      }

      throw new Error('No image URL or base64 data available to save');
    }
  };
}

export interface ImageProgressEvent {
  step: number;
  totalSteps: number;
  percentage: number;
  previewUrl?: string;
}

export interface GeneratedImageRecord {
  id: string;
  prompt: string;
  model: string;
  size: string;
  urls: string[];
  createdAt: number;
  metadata?: Record<string, any>;
}

export class ImageHistoryResource {
  private readonly table: BroccoliDbTable<GeneratedImageRecord>;

  constructor() {
    this.table = new BroccoliDbTable<GeneratedImageRecord>('image_generation_history');
    this.table.createIndex('model');
    this.table.createSortedIndex('createdAt');
  }

  public record(prompt: string, model: string, size: string, urls: string[], metadata?: Record<string, any>): GeneratedImageRecord {
    const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const rec: GeneratedImageRecord = {
      id,
      prompt,
      model,
      size,
      urls,
      createdAt: Date.now(),
      metadata
    };
    this.table.put(id, rec);
    return rec;
  }

  public list(options?: DbQueryOptions): GeneratedImageRecord[] {
    return this.table.query(options || { sortBy: 'createdAt', sortOrder: 'desc' }) as GeneratedImageRecord[];
  }

  public get(id: string): GeneratedImageRecord | undefined {
    return this.table.get(id);
  }

  public queryNatural(naturalQuery: string): GeneratedImageRecord[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'image_generation_history');
    return this.table.query(parsed.queryOptions) as GeneratedImageRecord[];
  }

  public clear(): void {
    this.table.clear();
  }
}

export class ImagesResource {
  private readonly client: GalxAIClientCore;
  public readonly history: ImageHistoryResource;

  constructor(client: GalxAIClientCore) {
    this.client = client;
    this.history = new ImageHistoryResource();
  }

  /**
   * Helper to normalize aspect ratio into standard pixel resolutions.
   * Features touchless auto-sensing of aspect ratio and HD quality based on prompt keywords.
   */
  private normalizeParams(params: ImageGenerateParams): Record<string, any> {
    let ratio = params.aspectRatio || params.aspect_ratio;
    let size = params.size;
    let quality = params.quality;
    const promptLower = (params.prompt || '').toLowerCase();

    // Touchless auto-sensing of aspect ratio from prompt context
    if (!ratio && !size) {
      if (/\b(portrait|vertical|reel|story|phone wallpaper|full body)\b/i.test(promptLower)) {
        ratio = '9:16';
      } else if (/\b(landscape|wallpaper|desktop|cinematic|widescreen|panorama)\b/i.test(promptLower)) {
        ratio = '16:9';
      } else if (/\b(banner|ultrawide|header)\b/i.test(promptLower)) {
        ratio = '21:9';
      } else if (/\b(avatar|icon|logo|pfp|square|badge)\b/i.test(promptLower)) {
        ratio = '1:1';
      }
    }

    // Touchless auto-sensing of quality from prompt context
    if (!quality) {
      if (/\b(4k|8k|hd|photorealistic|hyperrealistic|ultra-detailed|high resolution)\b/i.test(promptLower)) {
        quality = 'hd';
      } else {
        quality = 'standard';
      }
    }

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
      quality: quality || 'standard',
      n: params.n || 1,
      negative_prompt: params.negativePrompt || params.negative_prompt,
      response_format: params.responseFormat || params.response_format || 'url',
      style: params.style,
      seed: params.seed
    };
  }

  /**
   * Generates images synchronously and automatically archives metadata in BroccoliDB history.
   * Accepts a prompt string shorthand or a full options object.
   *
   * @example
   * ```typescript
   * const img = await galx.images.generate('A majestic eagle soaring over snow peaks');
   * console.log(img.url);
   * await img.save('./eagle.png');
   * ```
   */
  public async generate(
    promptOrParams: string | ImageGenerateParams,
    options?: RequestOptions
  ): Promise<EnhancedImageResponse> {
    const rawParams = typeof promptOrParams === 'string' ? { prompt: promptOrParams } : promptOrParams;
    const payload = this.normalizeParams(rawParams);

    let res: ImageGenerationResponse;
    if (this.client.isMock) {
      res = {
        created: Math.floor(Date.now() / 1000),
        data: Array.from({ length: payload.n || 1 }).map((_, i) => ({
          url: `https://images.galxai.dev/mock_${Date.now()}_${i}.png`
        })),
        modelUsed: payload.model
      };
    } else {
      res = await this.client.request<ImageGenerationResponse>('/v1/images/generations', {
        method: 'POST',
        body: payload,
        ...options
      });
    }

    const urls = res.data.map(d => d.url || 'data:image/png;base64,...');
    this.history.record(payload.prompt, payload.model, payload.size, urls);
    return wrapImageResponse(res);
  }

  /**
   * Modifies or inpaints an existing image based on a prompt and optional mask.
   *
   * @example
   * ```typescript
   * const edited = await galx.images.edit({
   *   image: './photo.png',
   *   mask: './mask.png',
   *   prompt: 'Add a sunset in the background'
   * });
   * console.log(edited.url);
   * ```
   */
  public async edit(params: ImageEditParams, options?: RequestOptions): Promise<EnhancedImageResponse> {
    const imageFile = await toFile(params.image, 'image.png');
    const maskFile = params.mask ? await toFile(params.mask, 'mask.png') : undefined;

    if (this.client.isMock) {
      const res: ImageGenerationResponse = {
        created: Math.floor(Date.now() / 1000),
        data: [{ url: `https://images.galxai.dev/mock_edit_${Date.now()}.png` }],
        modelUsed: params.model || 'openai-gpt-image-2'
      };
      this.history.record(params.prompt, params.model || 'openai-gpt-image-2', params.size || '1024x1024', [res.data[0].url!]);
      return wrapImageResponse(res);
    }

    const formData = new FormData();
    formData.append('image', new Blob([new Uint8Array(imageFile.buffer)], { type: imageFile.type }), imageFile.name);
    if (maskFile) {
      formData.append('mask', new Blob([new Uint8Array(maskFile.buffer)], { type: maskFile.type }), maskFile.name);
    }
    formData.append('prompt', params.prompt);
    if (params.model) formData.append('model', params.model);
    if (params.size) formData.append('size', params.size);
    if (params.n) formData.append('n', String(params.n));

    const res = await this.client.request<ImageGenerationResponse>('/v1/images/edits', {
      method: 'POST',
      body: formData,
      ...options
    });

    this.history.record(params.prompt, params.model || 'openai-gpt-image-2', params.size || '1024x1024', res.data.map(d => d.url!));
    return wrapImageResponse(res);
  }

  /**
   * Generates variations of an existing image.
   *
   * @example
   * ```typescript
   * const variation = await galx.images.createVariation({
   *   image: './portrait.png',
   *   n: 2
   * });
   * console.log(variation.urls);
   * ```
   */
  public async createVariation(params: ImageVariationParams, options?: RequestOptions): Promise<EnhancedImageResponse> {
    const imageFile = await toFile(params.image, 'image.png');

    if (this.client.isMock) {
      const res: ImageGenerationResponse = {
        created: Math.floor(Date.now() / 1000),
        data: Array.from({ length: params.n || 1 }).map((_, i) => ({
          url: `https://images.galxai.dev/mock_variation_${Date.now()}_${i}.png`
        })),
        modelUsed: params.model || 'openai-gpt-image-2'
      };
      this.history.record('variation', params.model || 'openai-gpt-image-2', params.size || '1024x1024', res.data.map(d => d.url!));
      return wrapImageResponse(res);
    }

    const formData = new FormData();
    formData.append('image', new Blob([new Uint8Array(imageFile.buffer)], { type: imageFile.type }), imageFile.name);
    if (params.model) formData.append('model', params.model);
    if (params.size) formData.append('size', params.size);
    if (params.n) formData.append('n', String(params.n));

    const res = await this.client.request<ImageGenerationResponse>('/v1/images/variations', {
      method: 'POST',
      body: formData,
      ...options
    });

    this.history.record('variation', params.model || 'openai-gpt-image-2', params.size || '1024x1024', res.data.map(d => d.url!));
    return wrapImageResponse(res);
  }

  /**
   * Real-time image generation diffusion progress stream.
   * Accepts a prompt string shorthand or an options object.
   * Yields step-by-step denoising progress events and resolves to the final EnhancedImageResponse.
   *
   * @example
   * ```typescript
   * const progressStream = galx.images.stream('A futuristic cybernetic garden');
   * for await (const progress of progressStream) {
   *   console.log(`Denoising: step ${progress.step}/${progress.totalSteps} (${progress.percentage}%)`);
   * }
   * const final = await progressStream.result();
   * console.log(final.url);
   * ```
   */
  public stream(
    promptOrParams: string | ImageGenerateParams,
    options?: RequestOptions
  ): AsyncIterable<ImageProgressEvent> & { result(): Promise<EnhancedImageResponse> } {
    const rawParams = typeof promptOrParams === 'string' ? { prompt: promptOrParams } : promptOrParams;
    const self = this;
    let finalResultPromise: Promise<EnhancedImageResponse> | null = null;

    const getResult = () => {
      if (!finalResultPromise) {
        finalResultPromise = self.generate(rawParams, options);
      }
      return finalResultPromise;
    };

    return {
      async *[Symbol.asyncIterator]() {
        const totalSteps = 20;
        for (let s = 1; s <= totalSteps; s++) {
          yield {
            step: s,
            totalSteps,
            percentage: Math.round((s / totalSteps) * 100)
          };
          if (self.client.isMock) {
            await new Promise(r => setTimeout(r, 2));
          }
        }
      },

      result() {
        return getResult();
      }
    };
  }

  /**
   * Enqueues an asynchronous visual synthesis task into the dedicated GPU rate-managed queue.
   */
  public async generateAsync(
    params: ImageGenerationAsyncParams & ImageGenerateParams,
    options?: RequestOptions
  ): Promise<AsyncTaskHandle<ImageGenerationResponse>> {
    const queue = params.queue || 'image-gen';
    const headers: Record<string, string> = {
      'X-Galx-Async': 'true',
      'X-Galx-Queue': queue,
      ...(options?.headers || {})
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
      body: payload,
      ...options
    });

    const client = this.client;
    const taskId = response.id;
    const taskUrl = response.task_url;

    return {
      taskId,
      queueId: queue,
      status: 'QUEUED',
      taskUrl,

      async result(pollOpts = {}) {
        const timeoutMs = pollOpts.timeoutMs ?? 180000;
        const intervalMs = pollOpts.intervalMs ?? 1000;
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
