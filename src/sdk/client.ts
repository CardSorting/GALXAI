/**
 * GALXAI Developer SDK: Main Client Core
 */

import { GALX_API_BASE_URL } from './base-url';
import {
  GalxError,
  APIError,
  AuthenticationError,
  PaymentRequiredError,
  PermissionDeniedError,
  NotFoundError,
  RateLimitError,
  APIConnectionError,
  APITimeoutError,
  InternalServerError,
  UserAbortError,
  parseRetryAfter
} from './errors';
import type { ClientOptions, RequestOptions, APIResponse, ModelInfo } from './types';
import { ChatResource } from './resources/chat';
import { ImagesResource, type EnhancedImageResponse, type ImageGenerateParams, type ImageProgressEvent } from './resources/images';
import { ModelsResource, type ModelsListParams, type ModelComparisonResult, type ModelSearchCriteria, type ModelInfoPage } from './resources/models';
import { EmbeddingsResource } from './resources/embeddings';
import { QueuesResource } from './resources/queues';
import { WorkflowsResource } from './resources/workflows';
import { WebhooksResource } from './resources/webhooks';
import { ModerationsResource } from './resources/moderations';
import { BatchesResource } from './resources/batches';
import { TelemetryResource, createTelemetryPlugin } from './telemetry';
import { BudgetGovernor, type BudgetConfig } from './budget';
import { toFile, type Uploadable, UploadableFile } from './multimodal';
import { BroccoliPromptCache, createCachePlugin } from './cache';
import { VectorResource } from './vector';
import { CircuitBreaker, createCircuitBreakerPlugin } from './circuit-breaker';
import { CheckpointsResource } from './resources/checkpoints';
import { WalResource } from './resources/wal';
import { PromptsResource } from './resources/prompts';
import { ReplayHarness } from './replay';
import type { GalxQueueEvent, ChatMessage, ChatCompletionResponse } from '../core/contracts/GalxContracts';

import { MiddlewarePipeline, type GalxPlugin } from './middleware';
import { ConversationThread, type ThreadOptions } from './thread';
import { safeParseJSON, repairJSON } from './json-repair';
import { ChatCompletionStream } from './stream';

export { type RequestOptions, type APIResponse, type ClientOptions } from './types';

export class GalxAIClientCore {
  readonly apiKey: string;
  readonly baseURL: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly defaultHeaders: Record<string, string>;
  readonly customFetch?: typeof fetch;
  readonly middleware: MiddlewarePipeline;
  readonly telemetry: TelemetryResource;
  readonly cache: BroccoliPromptCache;
  readonly circuitBreaker: CircuitBreaker;
  readonly options: ClientOptions;

  readonly isDebug: boolean;
  readonly isMock: boolean;

  constructor(options: string | ClientOptions = {}) {
    const opts = typeof options === 'string' ? { apiKey: options } : options || {};

    this.isDebug = Boolean(
      opts.debug ??
      (typeof process !== 'undefined' && (process.env?.GALXAI_DEBUG === 'true' || process.env?.GALX_DEBUG === 'true'))
    );
    this.isMock = Boolean(
      opts.mock ??
      (typeof process !== 'undefined' && (process.env?.GALXAI_MOCK === 'true' || process.env?.GALX_MOCK === 'true'))
    );

    this.apiKey =
      opts.apiKey ||
      opts.api_key ||
      opts.accessToken ||
      opts.access_token ||
      opts.token ||
      opts.authToken ||
      (typeof process !== 'undefined'
        ? process.env?.GALXAI_API_KEY ||
          process.env?.GALX_API_KEY ||
          process.env?.GALX_KEY ||
          process.env?.GALXAI_SECRET ||
          process.env?.NEXT_PUBLIC_GALXAI_API_KEY ||
          process.env?.NEXT_PUBLIC_GALX_API_KEY ||
          process.env?.OPENAI_API_KEY ||
          process.env?.ANTHROPIC_API_KEY
        : '') ||
      '';

    const rawBaseUrl =
      opts.baseURL ||
      opts.baseUrl ||
      opts.base_url ||
      opts.host ||
      opts.endpoint ||
      (typeof process !== 'undefined'
        ? process.env?.GALXAI_BASE_URL ||
          process.env?.GALX_BASE_URL ||
          process.env?.NEXT_PUBLIC_GALXAI_BASE_URL ||
          process.env?.NEXT_PUBLIC_GALX_BASE_URL ||
          process.env?.OPENAI_BASE_URL
        : '') ||
      GALX_API_BASE_URL;

    this.baseURL = rawBaseUrl.replace(/\/+$/, '');
    this.timeoutMs = opts.timeoutMs ?? opts.timeout ?? opts.timeout_ms ?? 60000;
    this.maxRetries = opts.maxRetries ?? opts.max_retries ?? opts.retries ?? 2;
    this.defaultHeaders = { ...(opts.defaultHeaders || opts.headers || {}) };

    const accountId = opts.accountId || opts.account_id;
    if (accountId) {
      this.defaultHeaders['ChatGPT-Account-Id'] = accountId;
      this.defaultHeaders['OpenAI-Account'] = accountId;
    }

    const org = opts.organization || (typeof process !== 'undefined' ? process.env?.GALXAI_ORG_ID || process.env?.OPENAI_ORG_ID : undefined);
    if (org) {
      this.defaultHeaders['X-Galx-Organization'] = org;
      this.defaultHeaders['OpenAI-Organization'] = org;
    }

    const project = opts.project || (typeof process !== 'undefined' ? process.env?.GALXAI_PROJECT_ID || process.env?.OPENAI_PROJECT_ID : undefined);
    if (project) {
      this.defaultHeaders['X-Galx-Project'] = project;
      this.defaultHeaders['OpenAI-Project'] = project;
    }

    const compactPrompts = opts.compactPrompts ?? opts.compact_prompts;
    if (typeof compactPrompts === 'boolean') {
      this.defaultHeaders['X-Galx-Compact-Prompts'] = String(compactPrompts);
      this.defaultHeaders['X-Galx-Compaction-Mode'] = compactPrompts ? 'auto' : 'raw';
    }

    this.customFetch = opts.fetch;
    this.options = opts;
    this.telemetry = new TelemetryResource(opts.telemetry !== false);
    this.cache = new BroccoliPromptCache(typeof opts.cache === 'object' ? opts.cache : undefined);
    this.circuitBreaker = new CircuitBreaker(typeof opts.circuitBreaker === 'object' ? opts.circuitBreaker : undefined);
    this.middleware = new MiddlewarePipeline();

    if (opts.circuitBreaker) {
      this.middleware.use(this.circuitBreaker.toPlugin());
    }

    if (opts.cache) {
      this.middleware.use(this.cache.toPlugin());
    }

    this.middleware.use(createTelemetryPlugin(this.telemetry));
  }

  public use(plugin: GalxPlugin): this {
    this.middleware.use(plugin);
    return this;
  }

  /**
   * Executes a standard JSON HTTP request with retries, typed error handling, caller AbortSignal linking, and middleware interceptors.
   */
  public async request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseURL}${path.startsWith('/') ? path : `/${path}`}`;
    const method = options.method || 'GET';
    const timeoutMs = options.timeoutMs ?? options.timeout ?? this.timeoutMs;
    const requestedMaxRetries = options.maxRetries ?? options.max_retries ?? this.maxRetries;
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

    const idempotencyKey = options.idempotencyKey || options.idempotency_key;
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const explicitIdempotencyKey = idempotencyKey || Object.entries(headers)
      .find(([name, value]) => name.toLowerCase() === 'idempotency-key' && typeof value === 'string' && value.length > 0)?.[1];
    // A transport error after a mutation may mean that the provider already
    // executed it. Automatic mutation retries require caller-supplied stable
    // identity; reads retain the normal retry budget.
    const maxRetries = ['GET', 'HEAD'].includes(method.toUpperCase()) || !!explicitIdempotencyKey
      ? requestedMaxRetries : 0;

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

    if (this.isMock) {
      if (this.isDebug) {
        console.log(`\x1b[35m[GALXAI MOCK]\x1b[0m ${method} ${path}`);
      }
      return this.handleMockResponse<T>(path, options);
    }

    let attempt = 0;
    while (true) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const onCallerAbort = () => {
        controller.abort();
      };

      if (options.signal) {
        if (options.signal.aborted) {
          clearTimeout(timer);
          throw new UserAbortError();
        }
        options.signal.addEventListener('abort', onCallerAbort, { once: true });
      }

      try {
        const fetchFn = this.customFetch || fetch;
        const res = await fetchFn(url, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timer);
        if (options.signal) {
          options.signal.removeEventListener('abort', onCallerAbort);
        }

        if (!res.ok) {
          await this.handleErrorResponse(res, attempt, maxRetries);
          continue;
        }

        const data = await res.json();

        if (this.isDebug) {
          console.log(`\x1b[32m[GALXAI DEBUG]\x1b[0m ${method} ${path} -> ${res.status} (${Date.now() - startTime}ms)`);
        }

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
        if (options.signal) {
          options.signal.removeEventListener('abort', onCallerAbort);
        }

        // Middleware onError Hook
        await this.middleware.executeOnError({
          path,
          method,
          error: err,
          durationMs: Date.now() - startTime
        });

        if (options.signal?.aborted) {
          throw new UserAbortError();
        }

        if (err.name === 'AbortError') {
          throw new APITimeoutError(timeoutMs);
        }

        if (err instanceof GalxError) {
          throw err;
        }

        if (attempt <= maxRetries) {
          const baseBackoff = Math.min(10000, Math.pow(2, attempt) * 200);
          const backoff = Math.floor(Math.random() * baseBackoff + 100);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }

        throw new APIConnectionError(`Failed to connect to ${url}: ${err.message}`, err);
      }
    }
  }

  /**
   * Executes a request and returns the parsed data along with raw HTTP Response, status, and headers.
   */
  public async requestWithResponse<T = any>(path: string, options: RequestOptions = {}): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${path.startsWith('/') ? path : `/${path}`}`;
    const method = options.method || 'GET';
    const timeoutMs = options.timeoutMs ?? options.timeout ?? this.timeoutMs;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'GALXAI-NodeSDK/1.0.0',
      ...this.defaultHeaders,
      ...(options.headers || {})
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const idempotencyKey = options.idempotencyKey || options.idempotency_key;
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const onCallerAbort = () => controller.abort();
    if (options.signal) {
      if (options.signal.aborted) {
        clearTimeout(timer);
        throw new UserAbortError();
      }
      options.signal.addEventListener('abort', onCallerAbort, { once: true });
    }

    try {
      const fetchFn = this.customFetch || fetch;
      const res = await fetchFn(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timer);
      if (options.signal) {
        options.signal.removeEventListener('abort', onCallerAbort);
      }

      if (!res.ok) {
        let errorData: any = {};
        try {
          errorData = await res.json();
        } catch {
          try {
            errorData = { error: { message: await res.text() } };
          } catch {}
        }
        throw APIError.fromResponse(res.status, errorData, res.headers);
      }

      const data = await res.json();
      return {
        data: data as T,
        response: res,
        status: res.status,
        headers: res.headers
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (options.signal) {
        options.signal.removeEventListener('abort', onCallerAbort);
      }
      if (options.signal?.aborted) throw new UserAbortError();
      if (err.name === 'AbortError') throw new APITimeoutError(timeoutMs);
      if (err instanceof GalxError) throw err;
      throw new APIConnectionError(`Failed to connect to ${url}: ${err.message}`, err);
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

    const executionState = errorData?.error?.execution_state;
    const noReplay = res.headers.get('x-should-retry') === 'false'
      || executionState === 'unknown' || executionState === 'accepted' || executionState === 'failed';
    if (noReplay) {
      // Preserve the relay's safety classification on the typed error so
      // model fallback helpers cannot turn it into a fresh request.
      throw APIError.fromResponse(res.status, errorData, res.headers);
    }

    // Retryable status codes (408, 429, 500, 502, 503, 504)
    if ([408, 429, 500, 502, 503, 504].includes(res.status) && attempt <= maxRetries) {
      const retryHeader = res.headers.get('retry-after') || res.headers.get('retry-after-ms');
      const parsedSeconds = parseRetryAfter(retryHeader);
      const retryAfterMs = parsedSeconds !== undefined ? parsedSeconds * 1000 : 0;
      const baseBackoff = Math.min(10000, Math.pow(2, attempt) * 200);
      const backoffMs = retryAfterMs > 0 ? retryAfterMs : Math.floor(Math.random() * baseBackoff + 100);
      await new Promise(r => setTimeout(r, backoffMs));
      return;
    }

    throw APIError.fromResponse(res.status, errorData, res.headers);
  }

  private handleMockResponse<T>(path: string, options: RequestOptions): T {
    if (path.includes('/images/generations')) {
      const prompt = options.body?.prompt || 'artwork';
      const seed = Math.abs(prompt.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)) % 1000;
      return {
        created: Math.floor(Date.now() / 1000),
        data: [{ url: `https://picsum.photos/seed/galx-mock-${seed}/1024/1024`, revised_prompt: prompt }],
        modelUsed: options.body?.model || 'galx-nova-image'
      } as T;
    }
    if (path.includes('/models')) {
      return {
        data: [
          { id: 'galx-nova', name: 'GALX Nova', description: 'Sustainable Intelligence Engine for reasoning and coding' },
          { id: 'galx-nova-image', name: 'GALX Nova-image', description: 'Visual synthesis engine for creative generation and diagrams' }
        ]
      } as T;
    }
    if (path.includes('/chat/completions') || path.includes('/completions')) {
      return {
        id: `mock_chat_${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: options.body?.model || 'galx-nova',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'GALXAI Mock Engine: Autonomous generation simulation completed successfully.'
            },
            finish_reason: 'stop'
          }
        ],
        usage: { prompt_tokens: 12, completion_tokens: 14, total_tokens: 26 }
      } as T;
    }
    return {} as T;
  }

  /**
   * Parses token stream chunks from a streaming SSE endpoint.
   */
  public async *requestStream<T = any>(path: string, options: RequestOptions = {}): AsyncIterable<T> {
    if (this.isMock) {
      const mockTokens = ['GALXAI', ' Mock', ' Stream', ' Engine', ' Active'];
      for (let i = 0; i < mockTokens.length; i++) {
        yield {
          id: `chatcmpl_mock_${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: (options.body as any)?.model || 'galx-nova',
          choices: [
            {
              index: 0,
              delta: { content: mockTokens[i] },
              finish_reason: i === mockTokens.length - 1 ? 'stop' : null
            }
          ]
        } as T;
      }
      return;
    }

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
    const idempotencyKey = options.idempotencyKey || options.idempotency_key
      || Object.entries(options.headers ?? {}).find(([name, value]) => name.toLowerCase() === 'idempotency-key' && value)?.[1];
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

    if (options.signal?.aborted) {
      throw new UserAbortError();
    }

    const fetchFn = this.customFetch || fetch;
    const res = await fetchFn(url, {
      method: options.method || 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal ?? undefined
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

    try {
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
            let parsed: any;
            try { parsed = JSON.parse(jsonStr); }
            catch { throw new APIError('The response stream was interrupted. Check its status before continuing.',502,'invalid_stream'); }
            if (parsed.error) throw APIError.fromResponse(503, parsed);
            yield parsed as T;
            if (path === '/v1/messages' && parsed.type === 'message_stop') return;
          }
        }
      }
      throw new APIError('The response stream ended before completion. Check its status before continuing.',502,'incomplete_stream');
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }

  /**
   * Parses typed event bus events from an SSE stream.
   */
  public async *requestEventStream(path: string, options: RequestOptions = {}): AsyncIterable<GalxQueueEvent> {
    const url = `${this.baseURL}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
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
      method: 'GET',
      headers,
      signal: options.signal ?? undefined
    });

    if (!res.ok) {
      await this.handleErrorResponse(res, 1, 0);
      return;
    }

    const body = res.body;
    if (!body) return;

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
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
    } finally {
      reader.releaseLock();
      await reader.cancel().catch(() => {});
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
import { AuthResource } from './resources/auth';
import { CompactionResource } from './resources/compaction';

export class GalxAI {
  readonly auth: AuthResource;
  readonly chat: ChatResource;
  readonly messages: {
    create: (params: {
      model?: string;
      messages: Array<{ role: string; content: any }>;
      max_tokens?: number;
      temperature?: number;
      stream?: boolean;
      system?: string | any[];
    }, options?: RequestOptions) => Promise<any>;
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
  readonly compaction: CompactionResource;
  readonly moderations: ModerationsResource;
  readonly batches: BatchesResource;
  readonly telemetry: TelemetryResource;
  readonly cache: BroccoliPromptCache;
  readonly vector: VectorResource;
  readonly circuitBreaker: CircuitBreaker;
  readonly checkpoints: CheckpointsResource;
  readonly wal: WalResource;
  readonly prompts: PromptsResource;
  readonly replay: ReplayHarness;
  readonly adapters: StreamAdapters;
  readonly batch: BatchEvaluator;
  readonly multimodal: typeof MultiModalHelper;
  readonly tokens: typeof TokenOptimizer;

  readonly core: GalxAIClientCore;

  public request<T = any>(path: string, options?: RequestOptions): Promise<T> {
    return this.core.request<T>(path, options);
  }

  public requestWithResponse<T = any>(path: string, options?: RequestOptions): Promise<APIResponse<T>> {
    return this.core.requestWithResponse<T>(path, options);
  }

  constructor(options: string | ClientOptions = {}) {
    this.core = new GalxAIClientCore(options);
    this.auth = new AuthResource(this.core);
    this.chat = new ChatResource(this.core);
    this.messages = {
      create: async (params, reqOptions) => {
        const mappedModel = params.model || 'galx-nova';
        if (params.stream) {
          return this.core.requestStream('/v1/messages', {
            method: 'POST',
            body: { ...params, model: mappedModel },
            ...reqOptions
          });
        }
        return this.core.request('/v1/messages', {
          method: 'POST',
          body: {
            ...params,
            model: mappedModel
          },
          ...reqOptions
        });
      }
    };
    this.images = new ImagesResource(this.core);
    this.models = new ModelsResource(this.core);
    this.vector = new VectorResource();
    this.embeddings = new EmbeddingsResource(this.core, this.vector);
    this.jobs = new JobsResource(this.core);
    this.queues = new QueuesResource(this.core);
    this.workflows = new WorkflowsResource(this.core);
    this.webhooks = new WebhooksResource();
    this.privacy = new PrivacyResource();
    this.compliance = new ComplianceResource();
    this.db = new DatabaseResource();
    this.checkpoints = new CheckpointsResource();
    this.wal = new WalResource();
    this.prompts = new PromptsResource();
    this.replay = new ReplayHarness();
    this.core.use(this.replay.toPlugin());
    this.compaction = new CompactionResource(this.core);
    this.moderations = new ModerationsResource(this.core);
    this.batches = new BatchesResource(this.core);
    this.telemetry = this.core.telemetry;
    this.cache = this.core.cache;
    this.circuitBreaker = this.core.circuitBreaker;
    this.adapters = new StreamAdapters();
    this.batch = new BatchEvaluator();
    this.multimodal = MultiModalHelper;
    this.tokens = TokenOptimizer;
  }

  /**
   * Executes a comprehensive system diagnostics probe across BroccoliDB storage, prompt caching,
   * circuit breaker state, and telemetry.
   */
  public async health(): Promise<{
    timestamp: number;
    healthy: boolean;
    database: any;
    cache: any;
    circuitBreaker: { globalState: string };
    telemetry: { totalSpansRecorded: number };
  }> {
    const dbHealth = await this.db.health();
    const cacheStats = this.cache.stats();
    const cbState = this.circuitBreaker.getState();
    const spans = this.telemetry.getRecentSpans();

    return {
      timestamp: Date.now(),
      healthy: dbHealth.status === 'HEALTHY',
      database: dbHealth,
      cache: cacheStats,
      circuitBreaker: {
        globalState: cbState
      },
      telemetry: {
        totalSpansRecorded: spans.length
      }
    };
  }

  /**
   * Returns a scoped client instance with an active financial and token safety budget governor.
   */
  public withBudget(config: BudgetConfig): GalxAI & { budget: BudgetGovernor } {
    const governor = new BudgetGovernor(config);
    const scoped = new GalxAI(this.core.options);
    scoped.use(governor.toPlugin());
    return Object.assign(scoped, { budget: governor });
  }

  /**
   * Normalizes Buffers, Blobs, Streams, data URLs, or file paths for multimodal uploads.
   */
  public toFile(input: Uploadable, filename?: string, options?: { type?: string }): Promise<UploadableFile> {
    return toFile(input, filename, options);
  }

  /**
   * Captures an atomic double-buffered state checkpoint across all in-memory BroccoliDB tables.
   */
  public async checkpoint(label?: string) {
    return this.db.checkpoint(label);
  }

  /**
   * Atomically rolls back database state to a prior checkpoint.
   */
  public async rollback(checkpointId: string): Promise<boolean> {
    return this.db.rollback(checkpointId);
  }

  /**
   * Touchless 1-line visual synthesis shortcut.
   * Accepts a natural language prompt string or a full configuration object.
   *
   * @example
   * ```typescript
   * const img = await galx.image('A cinematic landscape of the Himalayas in 4k');
   * console.log(img.url);
   * await img.save('./himalayas.png');
   * ```
   */
  public get image(): {
    (promptOrParams: string | ImageGenerateParams, options?: RequestOptions): Promise<EnhancedImageResponse>;
    stream(promptOrParams: string | ImageGenerateParams, options?: RequestOptions): AsyncIterable<ImageProgressEvent> & { result(): Promise<EnhancedImageResponse> };
    edit(image: Uploadable, prompt: string, options?: RequestOptions): Promise<EnhancedImageResponse>;
    variation(image: Uploadable, options?: RequestOptions): Promise<EnhancedImageResponse>;
    history: ImagesResource['history'];
  } {
    const self = this;
    const fn = (promptOrParams: string | ImageGenerateParams, options?: RequestOptions) => {
      return self.images.generate(promptOrParams, options);
    };

    fn.stream = (promptOrParams: string | ImageGenerateParams, options?: RequestOptions) => {
      return self.images.stream(promptOrParams, options);
    };

    fn.edit = (image: Uploadable, prompt: string, options?: RequestOptions) => {
      return self.images.edit({ image, prompt }, options);
    };

    fn.variation = (image: Uploadable, options?: RequestOptions) => {
      return self.images.createVariation({ image }, options);
    };

    fn.history = self.images.history;

    return fn;
  }

  /**
   * Touchless 1-line model resolution and inspection shortcut.
   *
   * @example
   * ```typescript
   * const defaultModel = await galx.model();
   * const gptModel = await galx.model('galx-nova');
   * const allIds = await galx.model.names();
   * ```
   */
  public get model(): {
    (modelId?: string, options?: RequestOptions): Promise<ModelInfo>;
    list(options?: ModelsListParams): Promise<ModelInfoPage>;
    names(options?: RequestOptions): Promise<string[]>;
    search(query: string, options?: RequestOptions): Promise<ModelInfo[]>;
    compare(modelA: string, modelB: string): Promise<ModelComparisonResult>;
    optimal(criteria?: ModelSearchCriteria): Promise<ModelInfo[]>;
  } {
    const self = this;
    const fn = (modelId?: string, options?: RequestOptions) => {
      return modelId ? self.models.retrieve(modelId, options) : self.models.default(options);
    };

    fn.list = (opts?: ModelsListParams) => self.models.list(opts);
    fn.names = (opts?: RequestOptions) => self.models.names(opts);
    fn.search = (q: string, opts?: RequestOptions) => self.models.search(q, opts);
    fn.compare = (a: string, b: string) => self.models.compare(a, b);
    fn.optimal = (c?: ModelSearchCriteria) => self.models.optimal(c);

    return fn;
  }

  /**
   * Touchless 1-line text completion.
   * Automatically wraps string prompt, applies the flagship frontier reasoning model,
   * and returns a string-coercible response with `.text`.
   *
   * @example
   * ```typescript
   * const res = await galx.complete('Explain quantum computing in 1 sentence');
   * console.log(res.text);
   * console.log(`${res}`);
   * ```
   */
  public async complete(
    promptOrMessages: string | ChatMessage[],
    options?: RequestOptions & { model?: string; temperature?: number; max_tokens?: number }
  ): Promise<ChatCompletionResponse & { text: string; toString(): string }> {
    const messages: ChatMessage[] = typeof promptOrMessages === 'string'
      ? [{ role: 'user', content: promptOrMessages }]
      : promptOrMessages;

    const model = options?.model || 'galx-nova';

    const response = await this.chat.completions.create({
      model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.max_tokens
    }, options);

    const primaryText = response.choices?.[0]?.message?.content || '';

    return Object.assign(response, {
      text: primaryText,
      toString() {
        return primaryText;
      }
    });
  }

  /**
   * Touchless 1-line chat completion stream.
   * Automatically converts prompt strings into messages and starts streaming.
   *
   * @example
   * ```typescript
   * for await (const chunk of galx.stream('Write a haiku about code')) {
   *   process.stdout.write(chunk.choices[0]?.delta?.content || '');
   * }
   * ```
   */
  public stream(
    promptOrMessages: string | ChatMessage[],
    options?: RequestOptions & { model?: string; temperature?: number }
  ): ChatCompletionStream {
    const messages: ChatMessage[] = typeof promptOrMessages === 'string'
      ? [{ role: 'user', content: promptOrMessages }]
      : promptOrMessages;

    const model = options?.model || 'galx-nova';

    return this.chat.completions.stream({
      model,
      messages,
      temperature: options?.temperature
    }, options);
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
   *   model: 'galx-nova',
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
    } & RequestOptions = {}
  ): Promise<string | import('./types').AsyncTaskHandle<any>> {
    if (options.background) {
      return this.jobs.submit({
        prompt,
        model: options.model,
        type: options.type,
        priority: options.priority
      }, options);
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }
    messages.push({ role: 'user', content: prompt });

    const completion = await this.chat.completions.create({
      model: options.model || 'galx-nova',
      messages
    }, options);

    return completion.choices[0]?.message?.content || '';
  }

  /**
   * Ultra-flat image generation helper.
   *
   * @example
   * ```typescript
   * const image = await galx.image('A futuristic floating city at dusk', { aspectRatio: '16:9' });
   * ```
   */
  public generateImage(
    promptOrParams: string | import('./resources/images').ImageGenerateParams,
    options?: RequestOptions
  ): Promise<EnhancedImageResponse> {
    return this.images.generate(promptOrParams, options);
  }

  /**
   * Formats a query and result into a clean, markdown-structured context block for autonomous agents.
   */
  public toAgentContext(prompt: string, result: any, metadata: { id?: string; model?: string } = {}): string {
    const formattedResult = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    return `### [GALXAI Autonomous Agent Context]
Prompt: ${prompt}
Model: ${metadata.model || 'galx-nova'}
Task ID: ${metadata.id || 'direct'}

=== RESULT OUTPUT ===
${formattedResult}
====================`;
  }

  /**
   * Ultra-flat text streaming generator yielding plain string deltas.
   *
   * @example
   * ```typescript
   * for await (const textDelta of galx.streamText('Explain quantum gravity')) {
   *   process.stdout.write(textDelta);
   * }
   * ```
   */
  public async *streamText(
    prompt: string,
    options: {
      model?: string;
      system?: string;
      temperature?: number;
    } & RequestOptions = {}
  ): AsyncIterable<string> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }
    messages.push({ role: 'user', content: prompt });

    const streamResponse = await this.chat.completions.create({
      model: options.model || 'galx-nova',
      messages,
      temperature: options.temperature,
      stream: true
    }, options);

    for await (const chunk of streamResponse as any) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  /**
   * Ultra-flat structured JSON extractor with guaranteed schema conformity and automatic JSON repair.
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
    options: { model?: string } & RequestOptions = {}
  ): Promise<T> {
    const schemaStr = JSON.stringify(schema, null, 2);
    const systemPrompt = `You are a precise data extractor. Extract the requested fields from the input text and return ONLY valid JSON matching this schema:\n${schemaStr}\nDo not output markdown code blocks or explanations, only valid parseable JSON.`;

    const raw = await this.run(input, {
      model: options.model || 'galx-nova',
      system: systemPrompt,
      ...options
    });

    return safeParseJSON<T>(raw as string);
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
  public async generate(prompt: string, options: { model?: string; system?: string; temperature?: number } & RequestOptions = {}) {
    return this.run(prompt, options);
  }

  /**
   * Universal vector embeddings helper.
   */
  public async embed(input: string | string[], options: { model?: string } & RequestOptions = {}) {
    return this.embeddings.create({
      input,
      model: options.model || 'text-embedding-3-small'
    }, options);
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
