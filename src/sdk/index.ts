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

// Default export
import { GalxAI } from './client';
export default GalxAI;
