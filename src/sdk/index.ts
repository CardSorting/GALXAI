/**
 * Official GALXAI Universal Developer SDK
 * Zero-dependency AI Gateway & Background Queue Client
 */

export { GalxAI } from './client';
export * from './errors';
export * from './types';

// Core Resources
export { ChatResource, CompletionsResource } from './resources/chat';
export { ImagesResource } from './resources/images';
export { ModelsResource } from './resources/models';
export { EmbeddingsResource, type EmbeddingCreateRequest, type EmbeddingCreateResponse } from './resources/embeddings';
export { JobsResource, type SubmitJobParams } from './resources/jobs';
export { QueuesResource } from './resources/queues';
export { WorkflowsResource } from './resources/workflows';
export { WebhooksResource } from './resources/webhooks';
export { PrivacyResource, PrivacyProfiles } from './resources/privacy';
export { ComplianceResource } from './resources/compliance';
export { DatabaseResource } from './resources/database';

// DX & Ergonomic Extensions
export { ChatCompletionBuilder } from './builder';
export { StructuredOutputExtractor, type JSONSchemaDefinition, type StructuredChatParams } from './structured';
export { StreamAdapters } from './adapters';
export { MultiModalHelper, type MultiModalImageInput } from './multimodal';
export { BatchEvaluator, type BatchMapOptions, type BatchResultItem } from './batch';

// Agent Runtime & Plugins
export { AgentRuntime, type AgentConfig, type AgentToolDefinition, type AgentExecutionResult } from './agent';
export {
  MiddlewarePipeline,
  type GalxPlugin,
  type MiddlewareRequestContext,
  type MiddlewareResponseContext,
  type MiddlewareErrorContext,
  createCostTrackerPlugin,
  createLRUCachePlugin,
  createPrivacyShieldPlugin
} from './middleware';
export { ModelResilience } from './resilience';
export { TokenOptimizer } from './tokens';

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
 * Ultra-effortless 1-line image generation.
 *
 * @example
 * ```ts
 * import { generateImage } from 'galxai';
 * const img = await generateImage('Futuristic skyline');
 * ```
 */
export async function generateImage(prompt: string, options?: { model?: string; size?: string }) {
  return getClient().generateImage(prompt, options);
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
  yield* getClient().stream(prompt, options);
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
