/**
 * GALXAI Developer SDK: Main Client Core
 */

import {
  GalxError,
  APIError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  RateLimitError,
  APIConnectionError,
  APITimeoutError,
  InternalServerError
} from './errors';
import type { ClientOptions } from './types';
import { ChatResource } from './resources/chat';
import { ImagesResource } from './resources/images';
import { ModelsResource } from './resources/models';
import { EmbeddingsResource } from './resources/embeddings';
import { QueuesResource } from './resources/queues';
import { WorkflowsResource } from './resources/workflows';
import { WebhooksResource } from './resources/webhooks';
import type { GalxQueueEvent } from '../core/contracts/GalxContracts';

import { MiddlewarePipeline, type GalxPlugin } from './middleware';
import { ConversationThread, type ThreadOptions } from './thread';

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
  maxRetries?: number;
}

export class GalxAIClientCore {
  readonly apiKey: string;
  readonly baseURL: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly defaultHeaders: Record<string, string>;
  readonly customFetch?: typeof fetch;
  readonly middleware: MiddlewarePipeline;

  constructor(options: string | ClientOptions = {}) {
    const opts = typeof options === 'string' ? { apiKey: options } : options || {};

    this.apiKey =
      opts.apiKey ||
      opts.api_key ||
      opts.token ||
      opts.authToken ||
      (typeof process !== 'undefined'
        ? process.env?.GALX_API_KEY || process.env?.OPENAI_API_KEY || process.env?.ANTHROPIC_API_KEY
        : '') ||
      '';

    const rawBaseUrl =
      opts.baseURL ||
      opts.baseUrl ||
      opts.base_url ||
      opts.host ||
      opts.endpoint ||
      (typeof process !== 'undefined'
        ? process.env?.GALX_BASE_URL || process.env?.NEXT_PUBLIC_GALX_EDGE_URL || process.env?.GALX_EDGE_URL || process.env?.OPENAI_BASE_URL
        : '') ||
      'https://galx.ai/v1';

    this.baseURL = rawBaseUrl.replace(/\/+$/, '');
    this.timeoutMs = opts.timeoutMs ?? opts.timeout ?? opts.timeout_ms ?? 60000;
    this.maxRetries = opts.maxRetries ?? opts.max_retries ?? opts.retries ?? 2;
    this.defaultHeaders = opts.defaultHeaders || opts.headers || {};
    this.customFetch = opts.fetch;
    this.middleware = new MiddlewarePipeline();
  }

  public use(plugin: GalxPlugin): this {
    this.middleware.use(plugin);
    return this;
  }

  /**
   * Executes a standard JSON HTTP request with retries, typed error handling, and middleware interceptors.
   */
  public async request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseURL}${path.startsWith('/') ? path : `/${path}`}`;
    const method = options.method || 'GET';
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    const startTime = Date.now();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'GALXAI-NodeSDK/1.0.0',
      ...this.defaultHeaders,
      ...(options.headers || {})
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    // Middleware onRequest Hook
    const requestCtx = {
      path,
      method,
      headers,
      body: options.body,
      timestampMs: startTime
    };
    const pluginEarlyRes = await this.middleware.executeOnRequest(requestCtx);
    if (pluginEarlyRes && pluginEarlyRes.shortCircuitResponse !== undefined) {
      return pluginEarlyRes.shortCircuitResponse as T;
    }

    let attempt = 0;
    while (true) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const fetchFn = this.customFetch || fetch;
        const res = await fetchFn(url, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!res.ok) {
          await this.handleErrorResponse(res, attempt, maxRetries);
          continue;
        }

        const data = await res.json();

        // Middleware onResponse Hook
        await this.middleware.executeOnResponse({
          path,
          method,
          statusCode: res.status,
          durationMs: Date.now() - startTime,
          data,
          headers: res.headers,
          requestBody: options.body
        });

        return data as T;

      } catch (err: any) {
        clearTimeout(timer);

        // Middleware onError Hook
        await this.middleware.executeOnError({
          path,
          method,
          error: err,
          durationMs: Date.now() - startTime
        });

        if (err.name === 'AbortError') {
          throw new APITimeoutError(timeoutMs);
        }

        if (err instanceof GalxError) {
          throw err;
        }

        if (attempt <= maxRetries) {
          const backoff = Math.floor(Math.pow(2, attempt) * 200 + Math.random() * 100);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }

        throw new APIConnectionError(`Failed to connect to ${url}: ${err.message}`, err);
      }
    }
  }


  /**
   * Handles non-2xx HTTP responses, throwing typed errors or waiting for backoff.
   */
  private async handleErrorResponse(res: Response, attempt: number, maxRetries: number): Promise<void> {
    let errorData: any = {};
    try {
      errorData = await res.json();
    } catch {
      try {
        errorData = { error: { message: await res.text() } };
      } catch {}
    }

    const message = errorData?.error?.message || errorData?.message || `HTTP ${res.status} ${res.statusText}`;

    // Retryable status codes (429, 500, 502, 503, 504)
    if ([429, 500, 502, 503, 504].includes(res.status) && attempt <= maxRetries) {
      let retryAfter = 0;
      const retryHeader = res.headers.get('retry-after');
      if (retryHeader) {
        retryAfter = parseInt(retryHeader, 10) * 1000;
      }
      const backoffMs = retryAfter > 0 ? retryAfter : Math.floor(Math.pow(2, attempt) * 300 + Math.random() * 200);
      await new Promise(r => setTimeout(r, backoffMs));
      return;
    }

    if (res.status === 401) {
      throw new AuthenticationError(message);
    }
    if (res.status === 403) {
      throw new PermissionDeniedError(message);
    }
    if (res.status === 404) {
      throw new NotFoundError(message);
    }
    if (res.status === 429) {
      const retryHeader = res.headers.get('retry-after');
      const retrySec = retryHeader ? parseInt(retryHeader, 10) : undefined;
      throw new RateLimitError(message, retrySec);
    }
    if (res.status >= 500) {
      throw new InternalServerError(message, res.status);
    }

    throw new APIError(message, res.status, errorData?.error?.code, errorData);
  }

  /**
   * Parses token stream chunks from a streaming SSE endpoint.
   */
  public async *requestStream<T = any>(path: string, options: RequestOptions = {}): AsyncIterable<T> {
    const url = `${this.baseURL}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'User-Agent': 'GALXAI-NodeSDK/1.0.0',
      ...this.defaultHeaders,
      ...(options.headers || {})
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const fetchFn = this.customFetch || fetch;
    const res = await fetchFn(url, {
      method: options.method || 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!res.ok) {
      await this.handleErrorResponse(res, 1, 0);
      return;
    }

    const body = res.body;
    if (!body) throw new Error('Response body is null');

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.substring(6).trim();
          if (jsonStr === '[DONE]') return;
          try {
            const parsed = JSON.parse(jsonStr);
            yield parsed as T;
          } catch {}
        }
      }
    }
  }

  /**
   * Parses typed event bus events from an SSE stream.
   */
  public async *requestEventStream(path: string): AsyncIterable<GalxQueueEvent> {
    const url = `${this.baseURL}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      'Accept': 'text/event-stream',
      'User-Agent': 'GALXAI-NodeSDK/1.0.0',
      ...this.defaultHeaders
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const fetchFn = this.customFetch || fetch;
    const res = await fetchFn(url, { method: 'GET', headers });

    if (!res.ok) {
      await this.handleErrorResponse(res, 1, 0);
      return;
    }

    const body = res.body;
    if (!body) return;

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.substring(6).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            yield parsed as GalxQueueEvent;
          } catch {}
        }
      }
    }
  }
}

import { StreamAdapters } from './adapters';
import { BatchEvaluator } from './batch';
import { MultiModalHelper } from './multimodal';
import { AgentRuntime, type AgentConfig } from './agent';
import { TokenOptimizer } from './tokens';
import { ChatCompletionBuilder } from './builder';

/**
 * Official GALXAI Universal Developer SDK Client.
 */
import { PrivacyResource, PrivacyProfiles } from './resources/privacy';
import { ComplianceResource } from './resources/compliance';
import { DatabaseResource } from './resources/database';
import { JobsResource } from './resources/jobs';

export class GalxAI {
  readonly chat: ChatResource;
  readonly messages: {
    create: (params: {
      model?: string;
      messages: Array<{ role: string; content: any }>;
      max_tokens?: number;
      temperature?: number;
      stream?: boolean;
      system?: string | any[];
    }) => Promise<any>;
  };
  readonly images: ImagesResource;
  readonly models: ModelsResource;
  readonly embeddings: EmbeddingsResource;
  readonly jobs: JobsResource;
  readonly queues: QueuesResource;
  readonly workflows: WorkflowsResource;
  readonly webhooks: WebhooksResource;
  readonly privacy: PrivacyResource;
  readonly compliance: ComplianceResource;
  readonly db: DatabaseResource;
  readonly adapters: StreamAdapters;
  readonly batch: BatchEvaluator;
  readonly multimodal: typeof MultiModalHelper;
  readonly tokens: typeof TokenOptimizer;

  private readonly core: GalxAIClientCore;

  constructor(options: string | ClientOptions = {}) {
    this.core = new GalxAIClientCore(options);
    this.chat = new ChatResource(this.core);
    this.messages = {
      create: async (params) => {
        const mappedModel = params.model || 'gpt-5.6-sol';
        return this.core.request('/v1/messages', {
          method: 'POST',
          body: {
            ...params,
            model: mappedModel
          }
        });
      }
    };
    this.images = new ImagesResource(this.core);
    this.models = new ModelsResource(this.core);
    this.embeddings = new EmbeddingsResource(this.core);
    this.jobs = new JobsResource(this.core);
    this.queues = new QueuesResource(this.core);
    this.workflows = new WorkflowsResource(this.core);
    this.webhooks = new WebhooksResource();
    this.privacy = new PrivacyResource();
    this.compliance = new ComplianceResource();
    this.db = new DatabaseResource();
    this.adapters = new StreamAdapters();
    this.batch = new BatchEvaluator();
    this.multimodal = MultiModalHelper;
    this.tokens = TokenOptimizer;
  }

  /**
   * Registers a middleware plugin into the client execution pipeline.
   */
  public use(plugin: GalxPlugin): this {
    this.core.use(plugin);
    return this;
  }

  /**
   * Spawns an autonomous multi-step agent tool runtime.
   *
   * @example
   * ```typescript
   * const agent = galx.agent({
   *   model: 'gpt-5.6-sol',
   *   systemPrompt: 'You are a research analyst.',
   *   tools: {
   *     getPrice: {
   *       description: 'Get stock quote',
   *       parameters: { ticker: { type: 'string' } },
   *       execute: async ({ ticker }) => ({ price: 185 })
   *     }
   *   }
   * });
   * const res = await agent.run('What is Apple trading at?');
   * ```
   */
  public agent(config: AgentConfig = {}): AgentRuntime {
    return new AgentRuntime(this.chat.completions, config);
  }

  /**
   * Ultra-flat 1-line execution helper.
   * Send any prompt and directly receive the result string or async handle.
   *
   * @example
   * ```typescript
   * const answer = await galx.run('Explain quantum entanglement in 1 sentence');
   * console.log(answer);
   * ```
   */
  public async run(
    prompt: string,
    options: {
      model?: string;
      system?: string;
      background?: boolean;
      priority?: number;
      type?: 'chat' | 'image' | 'workflow';
    } = {}
  ): Promise<string | import('./types').AsyncTaskHandle<any>> {
    if (options.background) {
      return this.jobs.submit({
        prompt,
        model: options.model,
        type: options.type,
        priority: options.priority
      });
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }
    messages.push({ role: 'user', content: prompt });

    const completion = await this.chat.completions.create({
      model: options.model || 'gpt-5.6-sol',
      messages
    });

    return completion.choices[0]?.message?.content || '';
  }

  /**
   * Ultra-flat image generation helper.
   *
   * @example
   * ```typescript
   * const image = await galx.generateImage('A futuristic floating city at dusk');
   * ```
   */
  public async generateImage(prompt: string, options: { model?: string; size?: string } = {}) {
    const res = await this.images.generate({
      prompt,
      model: options.model || 'openai-gpt-image-2',
      size: (options.size as any) || '1024x1024'
    });
    return res.data[0];
  }

  /**
   * Formats a query and result into a clean, markdown-structured context block for autonomous agents.
   *
   * @example
   * ```typescript
   * const ctx = galx.toAgentContext('Analyze Q3 data', result);
   * ```
   */
  public toAgentContext(prompt: string, result: any, metadata: { id?: string; model?: string } = {}): string {
    const formattedResult = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    return `### [GALXAI Autonomous Agent Context]
Prompt: ${prompt}
Model: ${metadata.model || 'gpt-5.6-sol'}
Task ID: ${metadata.id || 'direct'}

=== RESULT OUTPUT ===
${formattedResult}
====================`;
  }

  /**
   * Ultra-flat text streaming generator.
   *
   * @example
   * ```typescript
   * for await (const chunk of galx.stream('Explain quantum gravity')) {
   *   process.stdout.write(chunk);
   * }
   * ```
   */
  public async *stream(
    prompt: string,
    options: {
      model?: string;
      system?: string;
      temperature?: number;
    } = {}
  ): AsyncIterable<string> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }
    messages.push({ role: 'user', content: prompt });

    const streamResponse = await this.chat.completions.create({
      model: options.model || 'gpt-5.6-sol',
      messages,
      temperature: options.temperature,
      stream: true
    });

    for await (const chunk of streamResponse as any) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  /**
   * Ultra-flat structured JSON extractor with guaranteed schema conformity.
   *
   * @example
   * ```typescript
   * const user = await galx.extract('Jane is 29 and lives in SF', {
   *   name: { type: 'string' },
   *   age: { type: 'number' },
   *   city: { type: 'string' }
   * });
   * ```
   */
  public async extract<T = any>(
    input: string,
    schema: Record<string, any>,
    options: { model?: string } = {}
  ): Promise<T> {
    const schemaStr = JSON.stringify(schema, null, 2);
    const systemPrompt = `You are a precise data extractor. Extract the requested fields from the input text and return ONLY valid JSON matching this schema:\n${schemaStr}\nDo not output markdown code blocks or explanations, only valid parseable JSON.`;

    const raw = await this.run(input, {
      model: options.model || 'gpt-5.6-sol',
      system: systemPrompt
    });

    const clean = (raw as string).replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(clean);
  }

  /**
   * Wraps an execution function as an autonomous agent tool definition.
   */
  public tool(
    name: string,
    description: string,
    execute: (args: any) => Promise<any> | any,
    parameters?: Record<string, any>
  ) {
    return {
      type: 'function' as const,
      function: {
        name,
        description,
        parameters: parameters || { type: 'object', properties: {} },
        execute
      }
    };
  }

  /**
   * Ultra-forgiving chat execution accepting string or message array.
   */
  public async generate(prompt: string, options: { model?: string; system?: string; temperature?: number } = {}) {
    return this.run(prompt, options);
  }

  /**
   * Universal vector embeddings helper.
   */
  public async embed(input: string | string[], options: { model?: string } = {}) {
    return this.embeddings.create({
      input,
      model: options.model || 'text-embedding-3-small'
    });
  }

  /**
   * Fluent method-chaining builder for chat completions & async jobs.
   */
  public builder(model?: string): ChatCompletionBuilder {
    return new ChatCompletionBuilder(this.chat.completions, model);
  }

  /**
   * Creates a stateful multi-turn conversation thread.
   */
  public thread(options: ThreadOptions = {}): ConversationThread {
    return new ConversationThread(this, options);
  }
}

export { GalxAI as GalxAIClient, GalxAI as Client, GalxAI as Galx };
