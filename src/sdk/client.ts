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
import { QueuesResource } from './resources/queues';
import { WorkflowsResource } from './resources/workflows';
import { WebhooksResource } from './resources/webhooks';
import type { GalxQueueEvent } from '../core/contracts/GalxContracts';

import { MiddlewarePipeline, type GalxPlugin } from './middleware';

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

  constructor(options: ClientOptions = {}) {
    this.apiKey = options.apiKey || (typeof process !== 'undefined' ? process.env?.GALX_API_KEY : '') || '';
    this.baseURL = (options.baseURL || (typeof process !== 'undefined' ? process.env?.GALX_BASE_URL : '') || 'https://gateway.galx.ai').replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 60000;
    this.maxRetries = options.maxRetries ?? 2;
    this.defaultHeaders = options.defaultHeaders || {};
    this.customFetch = options.fetch;
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

/**
 * Official GALXAI Universal Developer SDK Client.
 */
import { PrivacyResource, PrivacyProfiles } from './resources/privacy';
import { ComplianceResource } from './resources/compliance';
import { DatabaseResource } from './resources/database';

export class GalxAI {
  readonly chat: ChatResource;
  readonly images: ImagesResource;
  readonly models: ModelsResource;
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

  constructor(options: ClientOptions = {}) {
    this.core = new GalxAIClientCore(options);
    this.chat = new ChatResource(this.core);
    this.images = new ImagesResource(this.core);
    this.models = new ModelsResource(this.core);
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
}


