/**
 * GALXAI Developer SDK: Core Type Definitions
 */

import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  GalxTask,
  TaskStatus,
  QueueTelemetryStats,
  GalxTaskQueueConfig,
  TaskPipelineStep,
  CronScheduleConfig,
  TaskProgressInfo,
  GalxQueueEvent
} from '../core/contracts/GalxContracts';

export interface ClientOptions {
  /**
   * GALXAI Gateway API Key or OAuth Bearer Access Token
   * Defaults to process.env.GALX_API_KEY if not provided.
   */
  apiKey?: string;
  api_key?: string;
  token?: string;
  authToken?: string;
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  accountId?: string;
  account_id?: string;

  /**
   * Custom Gateway Base URL (e.g. 'https://galx.ai/v1' or 'http://localhost:3000')
   */
  baseURL?: string;
  baseUrl?: string;
  base_url?: string;
  host?: string;
  endpoint?: string;

  /**
   * Request timeout in milliseconds (default: 60,000ms)
   */
  timeoutMs?: number;
  timeout?: number;
  timeout_ms?: number;

  /**
   * Maximum automatic retry attempts for transient errors (429, 500, 502, 503, 504). Default: 2
   */
  maxRetries?: number;
  max_retries?: number;
  retries?: number;

  /**
   * Custom HTTP headers injected into all requests
   */
  defaultHeaders?: Record<string, string>;
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation (optional, for custom proxying or mocking)
   */
  fetch?: typeof fetch;

  /**
   * Enable verbose colored logging of request latency, shard routing, and token metrics.
   * Can also be enabled via process.env.GALXAI_DEBUG=true.
   */
  debug?: boolean;

  /**
   * Enable offline simulation mode for local testing and CI/CD without network requests.
   * Can also be enabled via process.env.GALXAI_MOCK=true.
   */
  mock?: boolean;
}

export interface ChatCompletionCreateParams extends ChatCompletionRequest {
  /** If true, returns an AsyncIterable stream of SSE tokens */
  stream?: boolean;
}

export interface ChatCompletionAsyncParams extends ChatCompletionRequest {
  /** Named queue to target (default: 'llm-batch') */
  queue?: string;
  /** Strict FIFO partition key for conversational memory ordering */
  groupId?: string;
  /** Tag for batch filtering */
  tag?: string;
  /** Priority 1 - 100 (higher = priority, default: 50) */
  priority?: number;
  /** Delay in milliseconds before dispatch */
  delayMs?: number;
  /** Idempotency key for 24h deduplication */
  idempotencyKey?: string;
  /** Optional webhook completion URL where results will be POSTed */
  webhookCompletionUrl?: string;
  /** HMAC secret for completion webhook signing */
  webhookHmacSecret?: string;
  /** Progress callback */
  onProgress?: (progress: TaskProgressInfo) => void;
}

export interface ImageGenerationAsyncParams extends ImageGenerationRequest {
  queue?: string;
  groupId?: string;
  tag?: string;
  priority?: number;
  delayMs?: number;
  idempotencyKey?: string;
  webhookCompletionUrl?: string;
  webhookHmacSecret?: string;
}

export interface AsyncTaskHandle<T = any> {
  readonly taskId: string;
  readonly queueId: string;
  readonly status: TaskStatus;
  readonly taskUrl: string;

  /**
   * Polls or waits for the background task to complete.
   */
  result(options?: { timeoutMs?: number; intervalMs?: number }): Promise<T>;

  /**
   * Streams real-time progress percentages and log lines via Server-Sent Events (SSE).
   */
  streamProgress(): AsyncIterable<TaskProgressInfo>;

  /**
   * Cancels the active background task.
   */
  cancel(): Promise<boolean>;

  /**
   * Fetches latest task snapshot from the gateway.
   */
  getSnapshot(): Promise<GalxTask>;
}

export interface WorkflowCreateParams {
  queueId?: string;
  userId?: string;
  groupId?: string;
  tag?: string;
  priority?: number;
  delayMs?: number;
  idempotencyKey?: string;
  steps: Array<{
    name: string;
    model?: string;
    messages?: ChatCompletionRequest['messages'];
    prompt?: string;
    tool?: 'chat_completion' | 'image_generation' | 'webhook';
    url?: string;
    headers?: Record<string, string>;
    body?: any;
    required?: boolean;
  }>;
}

export interface ModelInfo {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly contextWindow: number;
  readonly maxOutputTokens: number;
  readonly costPer1kInputTokens: number;
  readonly costPer1kOutputTokens: number;
  readonly costPer1kCachedInputTokens: number;
  readonly capabilities: {
    readonly streaming: boolean;
    readonly reasoning: boolean;
    readonly vision: boolean;
    readonly imageGeneration: boolean;
  };
}

export interface CostEstimateRequest {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
}

export interface CostEstimateResult {
  model: string;
  inputCost: number;
  outputCost: number;
  cachedSavings: number;
  totalCost: number;
  retailComparisonCost: number;
  estimatedSavingsPercentage: number;
}
