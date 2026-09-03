/**
 * GALXAI Developer SDK: Chat Completions Resource
 */

import type {
  ChatCompletionResponse,
  ChatCompletionChunk,
  GalxTask,
  TaskProgressInfo,
  ChatCompletionRequest
} from '../../core/contracts/GalxContracts';
import type {
  ChatCompletionCreateParams,
  ChatCompletionAsyncParams,
  AsyncTaskHandle,
  RequestOptions
} from '../types';
import type { GalxAIClientCore } from '../client';

import { ModelResilience } from '../resilience';
import { ChatCompletionBuilder } from '../builder';
import { StructuredOutputExtractor, type StructuredChatParams } from '../structured';
import { ChatCompletionStream } from '../stream';

export class ChatResource {
  readonly completions: CompletionsResource;
  private readonly resilience: ModelResilience;

  constructor(client: GalxAIClientCore) {
    this.completions = new CompletionsResource(client);
    this.resilience = new ModelResilience(this.completions);
  }

  /**
   * Returns a fluent method-chaining prompt builder.
   *
   * @example
   * ```typescript
   * const res = await galx.chat.builder('gpt-5.6-sol')
   *   .system('You are an expert.')
   *   .user('Explain raft')
   *   .execute();
   * ```
   */
  public builder(model = 'gpt-5.6-sol'): ChatCompletionBuilder {
    return new ChatCompletionBuilder(this.completions, model);
  }

  /**
   * First-class streaming runner with event emitter (`.on('content')`), snapshot accumulation, and Web adapters.
   *
   * @example
   * ```typescript
   * const stream = galx.chat.stream({
   *   model: 'gpt-5.6-sol',
   *   messages: [{ role: 'user', content: 'Explain raft consensus' }]
   * });
   * stream.on('content', (delta) => process.stdout.write(delta));
   * const finalMsg = await stream.finalChatCompletion();
   * ```
   */
  public stream(
    params: Omit<ChatCompletionCreateParams, 'stream'>,
    options?: RequestOptions
  ): ChatCompletionStream {
    return this.completions.stream(params, options);
  }

  /**
   * Extracts strongly-typed structured JSON output validated against a JSON Schema or Zod Schema.
   */
  public structured<T = any>(params: StructuredChatParams<T>, options?: RequestOptions): Promise<T> {
    const extractor = new StructuredOutputExtractor(this.completions);
    return extractor.extract<T>(params, options);
  }

  /**
   * Cascades through a prioritized list of models until one succeeds.
   */
  public fallbackCascade(
    models: string[],
    params: Omit<ChatCompletionRequest, 'model'>
  ): Promise<ChatCompletionResponse & { successfulModel: string; attemptsMade: number }> {
    return this.resilience.fallbackCascade(models, params);
  }

  /**
   * Races multiple models concurrently and returns the stream from the model with lowest TTFB.
   */
  public race(
    models: string[],
    params: Omit<ChatCompletionRequest, 'model'>
  ): Promise<AsyncIterable<ChatCompletionChunk> & { winningModel: string }> {
    return this.resilience.race(models, params);
  }
}

export class CompletionsResource {
  private readonly client: GalxAIClientCore;

  constructor(client: GalxAIClientCore) {
    this.client = client;
  }

  /**
   * First-class streaming runner with event listeners and accumulation helpers.
   *
   * @example
   * ```typescript
   * const stream = galx.chat.completions.stream({
   *   model: 'gpt-5.6-sol',
   *   messages: [{ role: 'user', content: 'Explain quantum gravity' }]
   * });
   * stream.on('content', (delta, snapshot) => console.log(delta));
   * const fullText = await stream.finalText();
   * ```
   */
  public stream(
    params: Omit<ChatCompletionCreateParams, 'stream'>,
    options?: RequestOptions
  ): ChatCompletionStream {
    const controller = new AbortController();
    const rawStream = this.client.requestStream<ChatCompletionChunk>('/v1/chat/completions', {
      method: 'POST',
      body: { ...params, stream: true },
      ...options,
      signal: options?.signal || controller.signal
    });

    return new ChatCompletionStream(rawStream, controller);
  }

  /**
   * Creates a chat completion. Supports synchronous JSON responses and streaming SSE iterators.
   *
   * @example
   * ```typescript
   * const response = await galx.chat.completions.create({
   *   model: 'gpt-5.6-sol',
   *   messages: [{ role: 'user', content: 'Explain quantum computing' }]
   * });
   * ```
   */
  public async create(
    params: ChatCompletionCreateParams & { stream: true },
    options?: RequestOptions
  ): Promise<AsyncIterable<ChatCompletionChunk>>;
  public async create(
    params: ChatCompletionCreateParams & { stream?: false },
    options?: RequestOptions
  ): Promise<ChatCompletionResponse>;
  public async create(
    params: ChatCompletionCreateParams,
    options?: RequestOptions
  ): Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionChunk>> {
    if (params.stream) {
      return this.client.requestStream<ChatCompletionChunk>('/v1/chat/completions', {
        method: 'POST',
        body: params,
        ...options
      });
    }

    return this.client.request<ChatCompletionResponse>('/v1/chat/completions', {
      method: 'POST',
      body: params,
      ...options
    });
  }

  /**
   * Resilient multi-model fallback cascade.
   * Attempts primary model; if rate-limited (429) or failing (500/503), automatically
   * routes to the next model in `fallbackModels`.
   *
   * @example
   * ```typescript
   * const response = await galx.chat.completions.createWithFallback({
   *   model: 'gpt-5.6-terra',
   *   fallbackModels: ['gpt-5.6-sol', 'gpt-5.6-nova'],
   *   messages: [{ role: 'user', content: 'Generate quarterly analysis' }]
   * });
   * console.log(response._executedModel, response._fallbacksTriggered);
   * ```
   */
  public async createWithFallback(
    params: ChatCompletionCreateParams & { fallbackModels: string[]; stream?: false },
    options?: RequestOptions
  ): Promise<ChatCompletionResponse & { _executedModel: string; _fallbacksTriggered: number }> {
    const models = [params.model, ...(params.fallbackModels || [])];
    let lastError: any;
    let fallbacksTriggered = 0;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        const res = (await this.create(
          { ...params, model, stream: false },
          options
        )) as ChatCompletionResponse;

        return {
          ...res,
          _executedModel: model,
          _fallbacksTriggered: fallbacksTriggered
        };
      } catch (err: any) {
        lastError = err;
        fallbacksTriggered++;
        if (i === models.length - 1) {
          throw err;
        }
      }
    }
    throw lastError;
  }

  /**
   * Enqueues an asynchronous chat completion workload into the background task queue substrate.
   * Returns an `AsyncTaskHandle` for real-time progress streaming, result polling, or cancellation.
   *
   * @example
   * ```typescript
   * const task = await galx.chat.completions.createAsync({
   *   model: 'gpt-5.6-sol',
   *   messages: [{ role: 'user', content: 'Mass dataset evaluation' }],
   *   queue: 'llm-batch',
   *   groupId: 'conv_session_123'
   * });
   *
   * const result = await task.result();
   * ```
   */
  public async createAsync(
    params: ChatCompletionAsyncParams,
    options?: RequestOptions
  ): Promise<AsyncTaskHandle<ChatCompletionResponse>> {
    const queue = params.queue || 'llm-batch';
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

    const response = await this.client.request<{
      id: string;
      queue: string;
      status: string;
      task_url: string;
    }>('/v1/chat/completions', {
      method: 'POST',
      headers,
      body: {
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        response_format: params.response_format,
        tools: params.tools,
        tool_choice: params.tool_choice
      },
      ...options
    });

    return this.createTaskHandle<ChatCompletionResponse>(response.id, queue, response.task_url);
  }

  private createTaskHandle<T>(taskId: string, queueId: string, taskUrl: string): AsyncTaskHandle<T> {
    const client = this.client;

    return {
      taskId,
      queueId,
      status: 'QUEUED',
      taskUrl,

      async result(options = {}) {
        const timeoutMs = options.timeoutMs ?? 120000;
        const intervalMs = options.intervalMs ?? 500;
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
          const snapshot = await client.request<{ task: GalxTask }>(`/api/queues/${queueId}/tasks/${taskId}`);
          const task = snapshot.task;

          if (task.status === 'COMPLETED') {
            return task.result?.data as T;
          }

          if (task.status === 'DEAD_LETTERED' || task.status === 'CANCELLED' || task.status === 'EXPIRED') {
            throw new Error(`Task '${taskId}' finished in terminal failure state: ${task.status} (${task.lastError?.message || 'No error message'})`);
          }

          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        throw new Error(`Polling for task '${taskId}' timed out after ${timeoutMs}ms`);
      },

      async *streamProgress(): AsyncIterable<TaskProgressInfo> {
        const stream = client.requestEventStream(`/api/queues/${queueId}/tasks/${taskId}/stream`);
        for await (const evt of stream) {
          if (evt.type === 'TASK_PROGRESS' && evt.data) {
            yield evt.data as TaskProgressInfo;
          }
        }
      },

      async cancel(): Promise<boolean> {
        const res = await client.request<{ cancelled: boolean }>(`/api/queues/${queueId}/tasks/${taskId}`, {
          method: 'DELETE'
        });
        return res.cancelled;
      },

      async getSnapshot(): Promise<GalxTask> {
        const res = await client.request<{ task: GalxTask }>(`/api/queues/${queueId}/tasks/${taskId}`);
        return res.task;
      }
    };
  }
}
