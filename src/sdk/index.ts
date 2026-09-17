/**
 * Official GALXAI Universal Developer SDK
 * Zero-dependency AI Gateway & Background Queue Client
 */

export { GalxAI, GalxAIClient, Client, Galx } from './client';
export * from './errors';
export * from './types';
import type { RequestOptions } from './types';

// Core Resources
export { AuthResource } from './resources/auth';
export { OAuthExchangeError } from '../core/auth/GalxOAuthManager';
export { ChatResource, CompletionsResource } from './resources/chat';
export {
  ImagesResource,
  ImageHistoryResource,
  wrapImageResponse,
  type EnhancedImageResponse,
  type ImageGenerateParams,
  type ImageEditParams,
  type ImageVariationParams,
  type ImageProgressEvent,
  type GeneratedImageRecord
} from './resources/images';
export {
  ModelsResource,
  type ModelsListParams,
  type ModelComparisonResult,
  type ModelSearchCriteria
} from './resources/models';
export { EmbeddingsResource, type EmbeddingCreateRequest, type EmbeddingCreateResponse } from './resources/embeddings';
export { JobsResource, type SubmitJobParams } from './resources/jobs';
export { QueuesResource } from './resources/queues';
export { WorkflowsResource } from './resources/workflows';
export { WebhooksResource, SignatureVerificationError, type GalxWebhookEvent, type WebhookHandlerOptions } from './resources/webhooks';
export { PrivacyResource, PrivacyProfiles } from './resources/privacy';
export { ComplianceResource } from './resources/compliance';
export { DatabaseResource } from './resources/database';
export { CompactionResource } from './resources/compaction';
export { ModerationsResource, type ModerationCreateParams, type ModerationCreateResponse, type ModerationResult } from './resources/moderations';
export { BatchesResource, type Batch, type BatchCreateParams, type BatchHandle, type BatchItemInput } from './resources/batches';
export { CheckpointsResource, type CheckpointDiffResult } from './resources/checkpoints';
export { WalResource, type WalVerificationReport } from './resources/wal';
export { PromptsResource, type PromptTemplateRecord, type PromptCreateParams } from './resources/prompts';
export { ReplayHarness, type ReplayRecord } from './replay';

// Auto-Paging & Telemetry
export { Page, CursorPage, createCursorPage, type PageParams, type PageResponseData } from './pagination';
export { TelemetryResource, createTelemetryPlugin, type GenAISpanRecord } from './telemetry';
export { BudgetGovernor, BudgetExceededError, type BudgetConfig, type BudgetStats } from './budget';

// In-Memory Caching, Vectors, Resilience & Agent Memory
export { BroccoliPromptCache, createCachePlugin, type CacheConfig, type CacheStats, type CacheEntry } from './cache';
export { VectorResource, type ScopedVectorIndex, type VectorRecord, type VectorQueryResult, type VectorQueryOptions, type VectorInput } from './vector';
export { CircuitBreaker, createCircuitBreakerPlugin, CircuitBreakerOpenError, type CircuitState, type CircuitBreakerConfig, type CircuitAttemptRecord } from './circuit-breaker';
export { AgentMemoryStore, type MemoryFact, type RememberOptions, type RecallResult } from './memory';
export {
  BroccoliExecutionLedger,
  ExecutionSupervisor,
  ExecutionJournalProjector,
  ExecutionWorkProjector,
  ExecutionObservationProjector,
  ExecutionQueueProjector,
  ExecutionEventProjector,
  ExecutionLedgerConflictError,
  DEFAULT_EXECUTION_POLICY,
  isTerminalExecutionStatus,
  type ExecutionStatus,
  type ExecutionActorType,
  type ExecutionActor,
  type ExecutionLeaseContext,
  type ActiveExecutionLease,
  type ExecutionPolicy,
  type ExecutionBudgetState,
  type ExecutionBudgetReservation,
  type ExecutionState,
  type ExecutionDecisionKind,
  type ExecutionDecision,
  type ExecutionJournalChannel,
  type ExecutionJournalEntry,
  type ExecutionLedgerRecord,
  type ExecutionProposal,
  type CreateExecutionInput,
  type ProjectionCursorRecord,
  type AuthorizedExecutionIntent,
  type AuthorizedIntentQueue,
  type ExecutionLiveEvent,
  type ExecutionEventSink,
} from './execution';

// DX & Ergonomic Extensions
export { ChatCompletionBuilder, promptTemplate, PromptTemplate } from './builder';
export { ChatCompletionStream, type StreamMetrics } from './stream';
export { repairJSON, safeParseJSON } from './json-repair';
export {
  StructuredOutputExtractor,
  zodResponseFormat,
  zodToJsonSchema,
  type JSONSchemaDefinition,
  type StructuredChatParams
} from './structured';
export {
  StreamAdapters,
  toTextStream,
  toTextStreamResponse,
  toDataStreamResponse,
  toSSEResponse,
  type StreamInput
} from './adapters';
export { MultiModalHelper, toFile, UploadableFile, type MultiModalImageInput, type ForgivingImageSource, type Uploadable } from './multimodal';
export { BatchEvaluator, batch, type BatchMapOptions, type BatchResultItem } from './batch';

// Agent Runtime & Plugins
export {
  AgentRuntime,
  AgentSession,
  AgentContinuationError,
  type AgentCheckpoint,
  type AgentConfig,
  type AgentRunOptions,
  type AgentSessionOptions,
  type AgentSessionState,
  type AgentToolDefinition,
  type AgentExecutionResult,
  type AgentStreamEvent,
  type ForgivingToolInput
} from './agent';
export {
  MiddlewarePipeline,
  type GalxPlugin,
  type MiddlewareRequestContext,
  type MiddlewareResponseContext,
  type MiddlewareErrorContext,
  createCostTrackerPlugin,
  createLRUCachePlugin,
  createPrivacyShieldPlugin,
  createFallbackModelPlugin,
  createLoggingPlugin
} from './middleware';
export { ModelResilience, type ForgivingResilienceParams } from './resilience';
export { TokenOptimizer, estimateTokens, truncateToFit } from './tokens';
export { OpenAI } from './openai';
export { Anthropic } from './anthropic';
export { createGalxAI, galxai, GalxAIModelWrapper } from './ai';
export { ChatGalxAI } from './langchain';
export { ConversationThread, type ThreadOptions, type ThreadExportState } from './thread';
export {
  GALX_AGENT_PROTOCOL_VERSION,
  GalxBrowserAgentClient,
  GalxBrowserAgentSession,
  GalxBrowserAgentError,
  parseGalxSseStream,
  type GalxAgentBootstrap,
  type GalxBrowserAgentClientOptions,
  type GalxBrowserAgentEvent,
  type GalxBrowserAgentMessage,
  type GalxBrowserAgentSessionOptions,
  type GalxBrowserAgentTurnInput,
} from './browser-agent';

// Next.js 1-Line Route Adapters
export {
  handleGalxAI,
  createUniversalRoute,
  createImageRoute,
  createChatRoute,
  createModelsRoute,
  createGalxAIRouteHandler,
  type RouteHandlerOptions
} from './next';

// React 19 / Next.js Direct Server Actions (Zero-Route)
export {
  generateImageAction,
  chatAction,
  listModelsAction
} from './actions';

// Natural Language Intent Engine (NL2API)
export {
  executeIntent,
  inferIntent,
  type IntentExecutionOptions,
  type InferredIntent
} from './intent';

// Zero-File Edge Middleware Interceptor
export {
  galxaiMiddleware,
  createEdgeInterceptor,
  type MiddlewareConfig
} from './edge-interceptor';

// React Integration Hooks & Provider
export {
  GalxAIProvider,
  useGalxAI,
  useImageGeneration,
  useChat,
  useModels,
  useCompletion,
  useObject,
  type GalxAIProviderProps,
  type GalxAIContextValue,
  type ChatMessage,
  type UseChatHelpers,
  type UseChatOptions
} from './react';

// Default export & Top-Level Zero-Config Helpers
import { GalxAI } from './client';

let defaultClient: GalxAI | null = null;
function getClient(): GalxAI {
  if (!defaultClient) {
    defaultClient = new GalxAI();
  }
  return defaultClient;
}

/**
 * Ultra-effortless 1-line execution without initializing a class.
 *
 * @example
 * ```ts
 * import { run } from 'galxai';
 * const answer = await run('Explain quantum entanglement in 10 words');
 * ```
 */
export async function run(
  prompt: string,
  options?: {
    model?: string;
    system?: string;
    background?: boolean;
    priority?: number;
    type?: 'chat' | 'image' | 'workflow';
  }
) {
  return getClient().run(prompt, options);
}

/**
 * Ultra-effortless direct text generation alias.
 */
export async function generate(
  prompt: string,
  options?: {
    model?: string;
    system?: string;
    background?: boolean;
    priority?: number;
    type?: 'chat' | 'image' | 'workflow';
  }
) {
  return getClient().run(prompt, options);
}

/**
 * Ultra-effortless chat completion helper.
 */
export async function chat(
  promptOrMessages: string | Array<{ role: string; content: string }>,
  options?: { model?: string; temperature?: number }
) {
  if (typeof promptOrMessages === 'string') {
    return getClient().run(promptOrMessages, options);
  }
  return getClient().chat.completions.create({
    model: options?.model || 'gpt-5-6-luna-low',
    messages: promptOrMessages as any,
    temperature: options?.temperature
  });
}

/**
 * Ultra-effortless 1-line image generation.
 *
 * @example
 * ```ts
 * import { generateImage, image } from 'galxai';
 * const img = await image('Futuristic skyline', { aspectRatio: '16:9' });
 * ```
 */
export async function generateImage(
  promptOrParams: string | import('./resources/images').ImageGenerateParams,
  options?: RequestOptions
) {
  return getClient().generateImage(promptOrParams, options);
}

export const image = generateImage;

/**
 * Ultra-effortless text completion.
 */
export async function complete(
  promptOrMessages: string | import('../core/contracts/GalxContracts').ChatMessage[],
  options?: RequestOptions & { model?: string; temperature?: number; max_tokens?: number }
) {
  return getClient().complete(promptOrMessages, options);
}

/**
 * Ultra-effortless models listing.
 */
export async function listModels() {
  return getClient().models.list();
}

/**
 * Ultra-effortless token streaming.
 *
 * @example
 * ```ts
 * import { stream } from 'galxai';
 * for await (const chunk of stream('Write a haiku')) {
 *   process.stdout.write(chunk);
 * }
 * ```
 */
export async function* stream(prompt: string, options?: { model?: string; system?: string; temperature?: number }) {
  yield* getClient().streamText(prompt, options);
}

/**
 * Ultra-effortless vector embeddings.
 *
 * @example
 * ```ts
 * import { embed } from 'galxai';
 * const res = await embed('Autonomous edge agent computing');
 * console.log(res.data[0].embedding);
 * ```
 */
export async function embed(input: string | string[], options?: { model?: string }) {
  return getClient().embeddings.create({
    input,
    model: options?.model || 'text-embedding-3-small'
  });
}

/**
 * Ultra-effortless structured schema extraction.
 *
 * @example
 * ```ts
 * import { extract } from 'galxai';
 * const user = await extract('John Doe, age 32', { name: 'string', age: 'number' });
 * ```
 */
export async function extract<T = any>(input: string, schema: Record<string, any>, options?: { model?: string }): Promise<T> {
  return getClient().extract<T>(input, schema, options);
}

/**
 * Ultra-effortless BroccoliDB data compaction and deduplication.
 *
 * @example
 * ```ts
 * import { compact } from 'galxai';
 * const res = compact('PROPOUNDING PARTY: Plaintiff...', 'Interrogatory');
 * console.log(res.compactedPrompt, res.tokensSaved);
 * ```
 */
export function compact(text: string, domainHint?: string) {
  return getClient().compaction.domain(text, domainHint);
}

/**
 * Converts a TypeScript/JavaScript function into an autonomous agent tool.
 */
export function tool(
  name: string,
  description: string,
  execute: (args: any) => Promise<any> | any,
  parameters?: Record<string, any>
) {
  return getClient().tool(name, description, execute, parameters);
}

/**
 * Fluent method-chaining builder for chat completions & streaming.
 */
export function builder(model?: string) {
  return getClient().builder(model);
}

/**
 * Creates a stateful multi-turn conversation thread.
 */
export function thread(options?: import('./thread').ThreadOptions) {
  return getClient().thread(options);
}

/**
 * Executes a fallback cascade through prioritized models until one succeeds.
 */
export async function fallback(models: string[], promptOrParams: import('./resilience').ForgivingResilienceParams) {
  const resilience = new (await import('./resilience')).ModelResilience(getClient().chat.completions);
  return resilience.fallbackCascade(models, promptOrParams);
}

/**
 * Races multiple models concurrently and streams from the fastest engine.
 */
export async function race(models: string[], promptOrParams: import('./resilience').ForgivingResilienceParams) {
  const resilience = new (await import('./resilience')).ModelResilience(getClient().chat.completions);
  return resilience.race(models, promptOrParams);
}

/**
 * Callable Galx instance supporting tagged template literals & direct invocation:
 * ```ts
 * import galx from 'galxai';
 * const answer = await galx`Explain ${topic}`;
 * ```
 */
export interface CallableGalx extends GalxAI {
  (promptOrStrings: string | TemplateStringsArray, ...values: any[]): Promise<string>;
}

function createCallableGalx(): CallableGalx {
  const instance = getClient();
  const fn = function(promptOrStrings: string | TemplateStringsArray, ...values: any[]): Promise<string> {
    let resolvedPrompt = '';
    if (typeof promptOrStrings === 'string') {
      resolvedPrompt = promptOrStrings;
    } else if (Array.isArray(promptOrStrings)) {
      resolvedPrompt = promptOrStrings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? String(values[i]) : ''), '');
    }
    return instance.run(resolvedPrompt) as Promise<string>;
  };

  return Object.assign(fn, instance) as any;
}

export const galx = createCallableGalx();
export default galx;
