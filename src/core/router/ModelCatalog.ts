import type { ModelSpecItem, ProviderType } from '../contracts/GalxContracts';
export type { ModelSpecItem, ProviderType };
import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../broccolidb/broccolidb-natural-query';
import type { DbQueryOptions, DbAggregateQuery } from '../broccolidb/broccolidb.contracts';

/**
 * Exclusive Model Catalog for GALXAI.
 * Houses only the requested flagship modern generation LLMs & visual synthesis engines:
 * - OpenAI Codex: `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `openai-gpt-image-2`, `openai-gpt-image-1.5`, `openai-gpt-image-1`, `openai-gpt4o-image`, `openai-dalle-3`, `openai-dalle-2`, `text-embedding-3-small`, `text-embedding-3-large`
 * - xAI Grok: `x-ai/grok-4.6`, `x-ai/grok-4.5`, `xai-grok-image`, `xai-grok-2-image`
 *
 * Features competitive pricing with 20-36% discount vs direct list price + 75% prompt caching discount.
 */
export const EXCLUSIVE_MODEL_CATALOG: ModelSpecItem[] = [
  // --- 1. OpenAI Codex Flagship LLM & Reasoning Suite ---
  {
    id: 'gpt-5.6-sol',
    upstreamId: 'gpt-5.6-sol',
    name: 'OpenAI Codex GPT-5.6 Sol (Flagship SOTA)',
    provider: 'openai',
    category: 'llm',
    contextWindowTokens: 900_000,
    maxOutputTokens: 128_000,
    listPricePer1MInput: 5.0,
    listPricePer1MOutput: 20.0,
    inputPricePer1M: 3.75, // 25% Discount
    outputPricePer1M: 15.00, // 25% Discount
    cachedInputPricePer1M: 1.25, // 75% Caching Discount
    discountPercentage: 25,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    description: 'Flagship coding, deep mathematics, algorithmic reasoning, and multi-file architecture.'
  },
  {
    id: 'gpt-5.6-terra',
    upstreamId: 'gpt-5.6-terra',
    name: 'OpenAI Codex GPT-5.6 Terra (Balanced Frontier)',
    provider: 'openai',
    category: 'llm',
    contextWindowTokens: 900_000,
    maxOutputTokens: 128_000,
    listPricePer1MInput: 3.0,
    listPricePer1MOutput: 12.0,
    inputPricePer1M: 2.25, // 25% Discount
    outputPricePer1M: 9.00, // 25% Discount
    cachedInputPricePer1M: 0.75, // 75% Caching Discount
    discountPercentage: 25,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    description: 'Balanced frontier agentic coding model for large-scale refactoring and daily development.'
  },
  {
    id: 'gpt-5.6-luna',
    upstreamId: 'gpt-5.6-luna',
    name: 'OpenAI Codex GPT-5.6 Luna (High-Velocity)',
    provider: 'openai',
    category: 'llm',
    contextWindowTokens: 900_000,
    maxOutputTokens: 128_000,
    listPricePer1MInput: 1.5,
    listPricePer1MOutput: 6.0,
    inputPricePer1M: 0.95, // 36% Discount
    outputPricePer1M: 3.80, // 36% Discount
    cachedInputPricePer1M: 0.30, // 80% Caching Discount
    discountPercentage: 36,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    description: 'High-velocity rapid iteration coding engine optimized for instant sub-second completions.'
  },

  // --- 2. xAI Grok Flagship SOTA Reasoning Suite ---
  {
    id: 'x-ai/grok-4.6',
    upstreamId: 'grok-4.6',
    name: 'xAI Grok 4.6 (1M Frontier Multimodal Reasoning)',
    provider: 'xai-grok',
    category: 'llm',
    contextWindowTokens: 1_000_000,
    maxOutputTokens: 128_000,
    listPricePer1MInput: 3.0,
    listPricePer1MOutput: 12.0,
    inputPricePer1M: 2.10, // 30% Discount
    outputPricePer1M: 8.40, // 30% Discount
    cachedInputPricePer1M: 0.70, // 76% Caching Discount
    discountPercentage: 30,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    description: 'xAI next-generation flagship model with massive 1M context window, frontier reasoning, extreme tool orchestration, and multimodal comprehension.'
  },
  {
    id: 'x-ai/grok-4.5',
    upstreamId: 'grok-4.5',
    name: 'xAI Grok 4.5 (500K Frontier Multimodal)',
    provider: 'xai-grok',
    category: 'llm',
    contextWindowTokens: 500_000,
    maxOutputTokens: 128_000,
    listPricePer1MInput: 2.5,
    listPricePer1MOutput: 10.0,
    inputPricePer1M: 1.80, // 28% Discount
    outputPricePer1M: 7.20, // 28% Discount
    cachedInputPricePer1M: 0.60, // 76% Caching Discount
    discountPercentage: 28,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    description: 'xAI flagship model with massive 500K context window, frontier reasoning, and multimodal comprehension.'
  },

  // --- 3. OpenAI Visual Synthesis & Image Generation Suite ---
  {
    id: 'openai-gpt-image-2',
    upstreamId: 'gpt-image-2',
    name: 'OpenAI Codex GPT-Image-2 (Ultra 4K SOTA)',
    provider: 'openai',
    category: 'image',
    contextWindowTokens: 128_000,
    maxOutputTokens: 4_096,
    listPricePer1MInput: 0.080,
    listPricePer1MOutput: 0.080,
    inputPricePer1M: 0.060, // 25% Discount
    outputPricePer1M: 0.060,
    discountPercentage: 25,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: false,
    description: 'Flagship 4K high-definition image generation, complex text layout rendering, and composition.'
  },
  {
    id: 'openai-gpt-image-1.5',
    upstreamId: 'gpt-image-1.5',
    name: 'OpenAI Codex GPT-Image-1.5 (Photoreal)',
    provider: 'openai',
    category: 'image',
    contextWindowTokens: 128_000,
    maxOutputTokens: 4_096,
    listPricePer1MInput: 0.060,
    listPricePer1MOutput: 0.060,
    inputPricePer1M: 0.045, // 25% Discount
    outputPricePer1M: 0.045,
    discountPercentage: 25,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: false,
    description: 'Photorealistic image synthesis engine with enhanced lighting accuracy and micro-textures.'
  },
  {
    id: 'openai-gpt-image-1',
    upstreamId: 'gpt-image-1',
    name: 'OpenAI Codex GPT-Image-1 (Fast Synthesis)',
    provider: 'openai',
    category: 'image',
    contextWindowTokens: 128_000,
    maxOutputTokens: 4_096,
    listPricePer1MInput: 0.040,
    listPricePer1MOutput: 0.040,
    inputPricePer1M: 0.028, // 30% Discount
    outputPricePer1M: 0.028,
    discountPercentage: 30,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: false,
    description: 'Rapid image generation engine optimized for low latency iterative visual prototyping.'
  },
  {
    id: 'openai-gpt4o-image',
    upstreamId: 'gpt-4o-image',
    name: 'OpenAI GPT-4o Image (Multimodal Synthesis)',
    provider: 'openai',
    category: 'image',
    contextWindowTokens: 128_000,
    maxOutputTokens: 4_096,
    listPricePer1MInput: 0.050,
    listPricePer1MOutput: 0.050,
    inputPricePer1M: 0.038, // 24% Discount
    outputPricePer1M: 0.038,
    discountPercentage: 24,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: false,
    description: 'Native conversational visual generation with multimodal prompt understanding.'
  },
  {
    id: 'openai-dalle-3',
    upstreamId: 'dall-e-3',
    name: 'OpenAI DALL·E 3 (Artistic & Conceptual)',
    provider: 'openai',
    category: 'image',
    contextWindowTokens: 128_000,
    maxOutputTokens: 4_096,
    listPricePer1MInput: 0.040,
    listPricePer1MOutput: 0.040,
    inputPricePer1M: 0.030, // 25% Discount
    outputPricePer1M: 0.030,
    discountPercentage: 25,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: false,
    description: 'High-detail artistic styling, intricate prompt comprehension, and high-fidelity rendering.'
  },
  {
    id: 'openai-dalle-2',
    upstreamId: 'dall-e-2',
    name: 'OpenAI DALL·E 2 (Legacy Fast Prototyping)',
    provider: 'openai',
    category: 'image',
    contextWindowTokens: 128_000,
    maxOutputTokens: 4_096,
    listPricePer1MInput: 0.020,
    listPricePer1MOutput: 0.020,
    inputPricePer1M: 0.014, // 30% Discount
    outputPricePer1M: 0.014,
    discountPercentage: 30,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: false,
    description: 'Fast and lightweight 512x512/1024x1024 visual diffusion for rapid layout drafts.'
  },

  // --- 4. xAI Grok Visual Synthesis Suite ---
  {
    id: 'xai-grok-image',
    upstreamId: 'grok-imagine-1.0',
    name: 'xAI Grok Imagine 1.0 (Flagship Visual)',
    provider: 'xai-grok',
    category: 'image',
    contextWindowTokens: 128_000,
    maxOutputTokens: 4_096,
    listPricePer1MInput: 0.050,
    listPricePer1MOutput: 0.050,
    inputPricePer1M: 0.036, // 28% Discount
    outputPricePer1M: 0.036,
    discountPercentage: 28,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: false,
    description: 'xAI flagship image synthesis model with HDR color grading and cinematic lighting.'
  },
  {
    id: 'xai-grok-2-image',
    upstreamId: 'grok-2-image',
    name: 'xAI Grok-2 Image (High-Diversity)',
    provider: 'xai-grok',
    category: 'image',
    contextWindowTokens: 128_000,
    maxOutputTokens: 4_096,
    listPricePer1MInput: 0.040,
    listPricePer1MOutput: 0.040,
    inputPricePer1M: 0.028, // 30% Discount
    outputPricePer1M: 0.028,
    discountPercentage: 30,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: false,
    description: 'Stylistic diversity, rapid rendering, and versatile creative generation.'
  },

  // --- 5. Universal Vector Embeddings Suite ---
  {
    id: 'text-embedding-3-small',
    upstreamId: 'text-embedding-3-small',
    name: 'OpenAI Text-Embedding-3 Small (1536d High-Efficiency)',
    provider: 'openai',
    category: 'embedding',
    contextWindowTokens: 8_191,
    maxOutputTokens: 1_536,
    listPricePer1MInput: 0.020,
    listPricePer1MOutput: 0.0,
    inputPricePer1M: 0.015, // 25% Discount
    outputPricePer1M: 0.0,
    discountPercentage: 25,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: false,
    description: 'High-efficiency 1536-dimensional vector embeddings for dense semantic retrieval and RAG.'
  },
  {
    id: 'text-embedding-3-large',
    upstreamId: 'text-embedding-3-large',
    name: 'OpenAI Text-Embedding-3 Large (3072d High-Precision)',
    provider: 'openai',
    category: 'embedding',
    contextWindowTokens: 8_191,
    maxOutputTokens: 3_072,
    listPricePer1MInput: 0.130,
    listPricePer1MOutput: 0.0,
    inputPricePer1M: 0.095, // 27% Discount
    outputPricePer1M: 0.0,
    discountPercentage: 27,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: false,
    description: 'SOTA 3072-dimensional vector embeddings with dense semantic precision and multi-language clustering.'
  }
];

/**
 * Models visible in frontend UI components, calculators, pricing tables, and selectors.
 * xAI Grok models are hidden from the frontend due to operational complexity while remaining
 * resolvable in backend routing if requested via API.
 */
export const FRONTEND_VISIBLE_MODELS: ModelSpecItem[] = EXCLUSIVE_MODEL_CATALOG.filter(
  m => m.provider !== 'xai-grok'
);

export class ModelCatalog {
  private static catalog: Map<string, ModelSpecItem> = new Map(
    EXCLUSIVE_MODEL_CATALOG.map(m => [m.id, m])
  );

  private static fastPathCache: Map<string, ModelSpecItem> = new Map();

  /**
   * Hyper-Forgiving 0ms Model Alias Resolution.
   * Absorbs any developer mental model: prefixes, slashes, dashes, dots, spaces, shorthand aliases, intent tags, and fuzzy tokens.
   * Never throws or stalls on ambiguous inputs — always resolves to the optimal matching engine.
   */
  public static resolveModel(requestedModel?: string | null): ModelSpecItem {
    // 0. Zero-hesitation default fallback when model is omitted or blank
    if (!requestedModel || typeof requestedModel !== 'string' || requestedModel.trim().length === 0) {
      return this.catalog.get('gpt-5.6-sol') || EXCLUSIVE_MODEL_CATALOG[0];
    }

    if (this.fastPathCache.has(requestedModel)) {
      return this.fastPathCache.get(requestedModel)!;
    }

    const resolved = this.computeResolution(requestedModel);
    this.fastPathCache.set(requestedModel, resolved);
    return resolved;
  }

  private static computeResolution(requestedModel: string): ModelSpecItem {
    let normalized = requestedModel.trim().toLowerCase();

    // 1. Direct match on canonical ID
    if (this.catalog.has(normalized)) {
      return this.catalog.get(normalized)!;
    }

    // 2. Direct match ignoring case in catalog
    const directFound = EXCLUSIVE_MODEL_CATALOG.find(m => m.id.toLowerCase() === normalized);
    if (directFound) return directFound;

    // 3. Match on upstreamId
    const upstreamMatch = EXCLUSIVE_MODEL_CATALOG.find(
      m => m.upstreamId.toLowerCase() === normalized
    );
    if (upstreamMatch) return upstreamMatch;

    // 4. Strip common provider / framework / routing prefixes and version suffixes
    const cleanId = normalized
      .replace(/^(openai|x-ai|xai|anthropic|google|meta|deepseek|mistral|galx|galxai|models|router|gateway)[\/:_]/, '')
      .replace(/^@(openai|anthropic|google|deepseek)\//, '')
      .replace(/[:@](latest|preview|\d{4}-\d{2}-\d{2}|\d{8})$/, '')
      .replace(/-(latest|preview|\d{4}-\d{2}-\d{2}|\d{8})$/, '')
      .trim();

    if (this.catalog.has(cleanId)) {
      return this.catalog.get(cleanId)!;
    }

    // 5. Rich developer aliases dictionary (covering every mental model & intent)
    const aliases: Record<string, string> = {
      // Flagship SOTA & Coding Suite (Sol)
      'sol': 'gpt-5.6-sol',
      'gpt-sol': 'gpt-5.6-sol',
      'gpt5-sol': 'gpt-5.6-sol',
      'gpt5.6-sol': 'gpt-5.6-sol',
      'gpt-5.6-sol': 'gpt-5.6-sol',
      'gpt-5-6-sol': 'gpt-5.6-sol',
      'gpt5.6': 'gpt-5.6-sol',
      'gpt-5.6': 'gpt-5.6-sol',
      'gpt5': 'gpt-5.6-sol',
      'gpt-5': 'gpt-5.6-sol',
      'codex-sol': 'gpt-5.6-sol',
      'codex': 'gpt-5.6-sol',
      'openai-codex': 'gpt-5.6-sol',
      'flagship': 'gpt-5.6-sol',
      'sota': 'gpt-5.6-sol',
      'best': 'gpt-5.6-sol',
      'smart': 'gpt-5.6-sol',
      'code': 'gpt-5.6-sol',
      'coding': 'gpt-5.6-sol',
      'coder': 'gpt-5.6-sol',
      'agent': 'gpt-5.6-sol',
      'auto': 'gpt-5.6-sol',
      'default': 'gpt-5.6-sol',
      'latest': 'gpt-5.6-sol',
      'primary': 'gpt-5.6-sol',

      // Legacy OpenAI & External Model Drop-in Aliases (zero-friction migration)
      'gpt-4o': 'gpt-5.6-sol',
      'gpt-4o-mini': 'gpt-5.6-luna',
      'gpt4o': 'gpt-5.6-sol',
      'gpt4o-mini': 'gpt-5.6-luna',
      'gpt-4': 'gpt-5.6-sol',
      'gpt4': 'gpt-5.6-sol',
      'gpt-4-turbo': 'gpt-5.6-sol',
      'gpt-4-turbo-preview': 'gpt-5.6-sol',
      'gpt-3.5-turbo': 'gpt-5.6-luna',
      'gpt-3.5': 'gpt-5.6-luna',
      'chatgpt': 'gpt-5.6-sol',
      'chatgpt-4o': 'gpt-5.6-sol',
      'chatgpt-4': 'gpt-5.6-sol',

      // Anthropic Claude Family Aliases
      'claude': 'gpt-5.6-sol',
      'claude-3-7-sonnet': 'gpt-5.6-sol',
      'claude-3-7-sonnet-latest': 'gpt-5.6-sol',
      'claude-3-5-sonnet': 'gpt-5.6-sol',
      'claude-3-5-sonnet-latest': 'gpt-5.6-sol',
      'claude-3-5-sonnet-20241022': 'gpt-5.6-sol',
      'claude-3-sonnet': 'gpt-5.6-sol',
      'claude-3-opus': 'gpt-5.6-sol',
      'claude-3-opus-latest': 'gpt-5.6-sol',
      'claude-3-5-haiku': 'gpt-5.6-luna',
      'claude-3-5-haiku-latest': 'gpt-5.6-luna',
      'claude-3-haiku': 'gpt-5.6-luna',
      'claude-haiku': 'gpt-5.6-luna',
      'claude-sonnet': 'gpt-5.6-sol',
      'claude-opus': 'gpt-5.6-sol',
      'sonnet': 'gpt-5.6-sol',
      'opus': 'gpt-5.6-sol',
      'haiku': 'gpt-5.6-luna',

      // DeepSeek & Open Weights Aliases
      'deepseek': 'gpt-5.6-sol',
      'deepseek-r1': 'gpt-5.6-terra',
      'deepseek-reasoner': 'gpt-5.6-terra',
      'deepseek-v3': 'gpt-5.6-sol',
      'deepseek-chat': 'gpt-5.6-sol',
      'deepseek-coder': 'gpt-5.6-sol',
      'qwen': 'gpt-5.6-sol',
      'qwen-2.5-coder': 'gpt-5.6-sol',
      'qwen-2.5-72b': 'gpt-5.6-sol',
      'llama': 'gpt-5.6-sol',
      'llama-3.3-70b': 'gpt-5.6-sol',
      'llama-3.1-405b': 'gpt-5.6-sol',
      'mistral-large': 'gpt-5.6-sol',
      'mistral': 'gpt-5.6-sol',

      // Google Gemini Aliases
      'gemini': 'gpt-5.6-sol',
      'gemini-2.5-pro': 'gpt-5.6-sol',
      'gemini-2.0-pro': 'gpt-5.6-sol',
      'gemini-1.5-pro': 'gpt-5.6-sol',
      'gemini-pro': 'gpt-5.6-sol',
      'gemini-2.0-flash': 'gpt-5.6-luna',
      'gemini-1.5-flash': 'gpt-5.6-luna',
      'gemini-flash': 'gpt-5.6-luna',

      // Terra variations (Reasoning & Large Refactors)
      'terra': 'gpt-5.6-terra',
      'gpt-terra': 'gpt-5.6-terra',
      'gpt5-terra': 'gpt-5.6-terra',
      'gpt5.6-terra': 'gpt-5.6-terra',
      'gpt-5.6-terra': 'gpt-5.6-terra',
      'gpt-5-6-terra': 'gpt-5.6-terra',
      'codex-terra': 'gpt-5.6-terra',
      'balanced': 'gpt-5.6-terra',
      'reasoning': 'gpt-5.6-terra',
      'reasoner': 'gpt-5.6-terra',
      'thinking': 'gpt-5.6-terra',
      'o1': 'gpt-5.6-terra',
      'o1-preview': 'gpt-5.6-terra',
      'o1-mini': 'gpt-5.6-terra',
      'o3': 'gpt-5.6-terra',
      'o3-mini': 'gpt-5.6-terra',
      'o3-high': 'gpt-5.6-terra',
      'o4-mini': 'gpt-5.6-terra',

      // Luna variations (Fast, Autocomplete, High Velocity)
      'luna': 'gpt-5.6-luna',
      'gpt-luna': 'gpt-5.6-luna',
      'gpt5-luna': 'gpt-5.6-luna',
      'gpt5.6-luna': 'gpt-5.6-luna',
      'gpt-5.6-luna': 'gpt-5.6-luna',
      'gpt-5-6-luna': 'gpt-5.6-luna',
      'codex-luna': 'gpt-5.6-luna',
      'fast': 'gpt-5.6-luna',
      'flash': 'gpt-5.6-luna',
      'speed': 'gpt-5.6-luna',
      'turbo': 'gpt-5.6-luna',
      'mini': 'gpt-5.6-luna',
      'small': 'gpt-5.6-luna',
      'cheap': 'gpt-5.6-luna',
      'velocity': 'gpt-5.6-luna',
      'instant': 'gpt-5.6-luna',
      'autocomplete': 'gpt-5.6-luna',
      'low-cost': 'gpt-5.6-luna',

      // Grok 4.6 variations (Massive 1M Context & Real-time Reasoning)
      'grok': 'x-ai/grok-4.6',
      'grok-4.6': 'x-ai/grok-4.6',
      'grok-4-6': 'x-ai/grok-4.6',
      'grok4.6': 'x-ai/grok-4.6',
      'grok4-6': 'x-ai/grok-4.6',
      'grok46': 'x-ai/grok-4.6',
      'xai-grok': 'x-ai/grok-4.6',
      'xai-grok-4.6': 'x-ai/grok-4.6',
      'xai-grok-4-6': 'x-ai/grok-4.6',
      'xai/grok-4.6': 'x-ai/grok-4.6',
      'xai/grok': 'x-ai/grok-4.6',
      'grok-reasoning': 'x-ai/grok-4.6',
      'grok-1m': 'x-ai/grok-4.6',
      '1m': 'x-ai/grok-4.6',
      'realtime': 'x-ai/grok-4.6',
      'live': 'x-ai/grok-4.6',
      'grok-3': 'x-ai/grok-4.6',
      'grok-2': 'x-ai/grok-4.6',
      'grok-beta': 'x-ai/grok-4.6',

      // Grok 4.5 variations
      'grok-4.5': 'x-ai/grok-4.5',
      'grok-4-5': 'x-ai/grok-4.5',
      'grok4.5': 'x-ai/grok-4.5',
      'grok4-5': 'x-ai/grok-4.5',
      'grok45': 'x-ai/grok-4.5',
      'xai-grok-4.5': 'x-ai/grok-4.5',
      'xai-grok-4-5': 'x-ai/grok-4.5',
      'xai/grok-4.5': 'x-ai/grok-4.5',

      // Visual / Image Synthesis variations
      'image': 'openai-gpt-image-2',
      'images': 'openai-gpt-image-2',
      'generate-image': 'openai-gpt-image-2',
      'image-generation': 'openai-gpt-image-2',
      'gpt-image': 'openai-gpt-image-2',
      'gpt-image-2': 'openai-gpt-image-2',
      'gpt-image-2.0': 'openai-gpt-image-2',
      'gptimage2': 'openai-gpt-image-2',
      '4k-image': 'openai-gpt-image-2',
      'gpt-image-1.5': 'openai-gpt-image-1.5',
      'gpt-image-1-5': 'openai-gpt-image-1.5',
      'photoreal': 'openai-gpt-image-1.5',
      'gpt-image-1': 'openai-gpt-image-1',
      'gpt4o-image': 'openai-gpt4o-image',
      'gpt-4o-image': 'openai-gpt4o-image',
      'dalle': 'openai-dalle-3',
      'dalle-3': 'openai-dalle-3',
      'dalle3': 'openai-dalle-3',
      'dall-e': 'openai-dalle-3',
      'dall-e-3': 'openai-dalle-3',
      'dalle-2': 'openai-dalle-2',
      'dall-e-2': 'openai-dalle-2',
      'grok-image': 'xai-grok-image',
      'grok-imagine': 'xai-grok-image',
      'imagine': 'xai-grok-image',
      'imagine-1': 'xai-grok-image',
      'grok-2-image': 'xai-grok-2-image',
      'grok-image-2': 'xai-grok-2-image',
      'midjourney': 'openai-gpt-image-2',
      'flux': 'openai-gpt-image-2',
      'flux-pro': 'openai-gpt-image-2',
      'flux-schnell': 'openai-gpt-image-2',
      'stable-diffusion': 'openai-gpt-image-2',

      // Embeddings
      'embedding': 'text-embedding-3-small',
      'embeddings': 'text-embedding-3-small',
      'embed': 'text-embedding-3-small',
      'vector': 'text-embedding-3-small',
      'text-embedding': 'text-embedding-3-small',
      'text-embedding-3': 'text-embedding-3-small',
      'text-embedding-3-small': 'text-embedding-3-small',
      'text-embedding-3-large': 'text-embedding-3-large'
    };

    if (aliases[normalized] && this.catalog.has(aliases[normalized])) {
      return this.catalog.get(aliases[normalized])!;
    }

    if (aliases[cleanId] && this.catalog.has(aliases[cleanId])) {
      return this.catalog.get(aliases[cleanId])!;
    }

    // 6. Dot / dash version normalization: replace gpt-5-6 with gpt-5.6
    const dotNormalized = normalized.replace(/(\d+)-(\d+)/g, '$1.$2');
    if (this.catalog.has(dotNormalized)) {
      return this.catalog.get(dotNormalized)!;
    }
    if (aliases[dotNormalized] && this.catalog.has(aliases[dotNormalized])) {
      return this.catalog.get(aliases[dotNormalized])!;
    }

    // 7. Fuzzy search fallback: keyword containment in ID or Name
    const sanitizedQuery = normalized.replace(/[^a-z0-9]/g, '');
    if (sanitizedQuery.length >= 2) {
      const fuzzyFound = EXCLUSIVE_MODEL_CATALOG.find(m => {
        const cleanModelId = m.id.replace(/[^a-z0-9]/g, '').toLowerCase();
        const cleanName = m.name.replace(/[^a-z0-9]/g, '').toLowerCase();
        return cleanModelId.includes(sanitizedQuery) || sanitizedQuery.includes(cleanModelId) || cleanName.includes(sanitizedQuery);
      });
      if (fuzzyFound) return fuzzyFound;
    }

    // 8. Intent Category Detection: If developer requested an image or embedding term, route to that category
    if (normalized.includes('image') || normalized.includes('draw') || normalized.includes('photo') || normalized.includes('art') || normalized.includes('dall')) {
      return this.catalog.get('openai-gpt-image-2') || EXCLUSIVE_MODEL_CATALOG.find(m => m.category === 'image')!;
    }
    if (normalized.includes('embed') || normalized.includes('vector')) {
      return this.catalog.get('text-embedding-3-small') || EXCLUSIVE_MODEL_CATALOG.find(m => m.category === 'embedding')!;
    }

    // 9. Zero-hesitation ultimate fallback: default flagship LLM
    return this.catalog.get('gpt-5.6-sol') || EXCLUSIVE_MODEL_CATALOG[0];
  }

  public static listAll(): ModelSpecItem[] {
    return EXCLUSIVE_MODEL_CATALOG;
  }

  public static listModels(): ModelSpecItem[] {
    return EXCLUSIVE_MODEL_CATALOG;
  }

  public static listFrontendModels(): ModelSpecItem[] {
    return FRONTEND_VISIBLE_MODELS;
  }

  public static getSupportedModels(): ModelSpecItem[] {
    return EXCLUSIVE_MODEL_CATALOG;
  }

  public static listByProvider(provider: ProviderType): ModelSpecItem[] {
    return this.getTable().query({ where: { provider: { $eq: provider } } }) as ModelSpecItem[];
  }

  public static listByCategory(category: 'llm' | 'image' | 'embedding'): ModelSpecItem[] {
    return this.getTable().query({ where: { category: { $eq: category } } }) as ModelSpecItem[];
  }

  public static getSpec(id: string): ModelSpecItem | null {
    return this.resolveModel(id);
  }

  // --- BroccoliDB Zenith Integration ---
  private static dbTableInstance: BroccoliDbTable<ModelSpecItem> | null = null;

  public static getTable(): BroccoliDbTable<ModelSpecItem> {
    if (!this.dbTableInstance) {
      const table = new BroccoliDbTable<ModelSpecItem>('models');
      table.createIndex('provider');
      table.createIndex('category');
      table.createIndex('supportsVision');
      table.createIndex('supportsReasoning');
      table.createSortedIndex('inputPricePer1M');
      table.createSortedIndex('contextWindowTokens');

      for (const model of EXCLUSIVE_MODEL_CATALOG) {
        table.put(model.id, model);
      }
      this.dbTableInstance = table;
    }
    return this.dbTableInstance;
  }

  /**
   * Executes deterministic offline natural language queries over the model catalog (<0.1ms).
   */
  public static queryNatural(naturalQuery: string): ModelSpecItem[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'models');
    return this.getTable().query(parsed.queryOptions) as ModelSpecItem[];
  }

  /**
   * Evaluates rich operator filters ($gt, $between, $in, $regex) over the catalog.
   */
  public static queryDSL(options: DbQueryOptions): ModelSpecItem[] {
    return this.getTable().query(options) as ModelSpecItem[];
  }

  /**
   * Performs statistical calculus over the model catalog (e.g. min/max/avg pricing by provider).
   */
  public static aggregate(query: DbAggregateQuery) {
    return this.getTable().aggregate(query);
  }

  /**
   * Calculates sub-cent token cost and retail savings with micro-precision.
   */
  public static calculateCost(
    modelId: string,
    usage: { promptTokens?: number; completionTokens?: number; cachedTokens?: number; imagesCount?: number }
  ) {
    const spec = this.resolveModel(modelId);
    const category = spec.category;

    if (category === 'image') {
      const imagesCount = Math.max(1, usage.imagesCount || 1);
      const unitWholesale = spec.inputPricePer1M ?? 0.040;
      const unitRetail = spec.listPricePer1MInput ?? (unitWholesale * 1.33);
      const totalCost = Number((imagesCount * unitWholesale).toFixed(6));
      const retailTotal = Number((imagesCount * unitRetail).toFixed(6));
      const savings = Number(Math.max(0, retailTotal - totalCost).toFixed(6));
      const discountPct = spec.discountPercentage ?? 25;

      return {
        modelId: spec.id,
        modelName: spec.name,
        category: 'image' as const,
        promptTokens: usage.promptTokens || 1000,
        cachedTokens: 0,
        completionTokens: 0,
        totalTokens: usage.promptTokens || 1000,
        imagesCount,
        promptCostUsd: totalCost,
        cachedCostUsd: 0,
        completionCostUsd: 0,
        totalCostUsd: totalCost,
        retailTotalCostUsd: retailTotal,
        savingsUsd: savings,
        savingsPercentage: retailTotal > 0 ? Number(((savings / retailTotal) * 100).toFixed(1)) : discountPct
      };
    }

    const totalPrompt = Math.max(0, usage.promptTokens || 0);
    const cached = Math.min(totalPrompt, Math.max(0, usage.cachedTokens || 0));
    const nonCached = Math.max(0, totalPrompt - cached);
    const completion = Math.max(0, usage.completionTokens || 0);

    const inputRate = spec.inputPricePer1M ?? 1.0;
    const outputRate = spec.outputPricePer1M ?? 2.0;
    const cachedRate = spec.cachedInputPricePer1M ?? (inputRate * 0.25);
    const listInput = spec.listPricePer1MInput ?? (inputRate * 1.33);
    const listOutput = spec.listPricePer1MOutput ?? (outputRate * 1.33);
    const discountPct = spec.discountPercentage ?? 25;

    const promptCost = Number(((nonCached * inputRate) / 1_000_000).toFixed(6));
    const cachedCost = Number(((cached * cachedRate) / 1_000_000).toFixed(6));
    const completionCost = Number(((completion * outputRate) / 1_000_000).toFixed(6));
    const totalCost = Number((promptCost + cachedCost + completionCost).toFixed(6));

    const retailPrompt = Number(((totalPrompt * listInput) / 1_000_000).toFixed(6));
    const retailCompletion = Number(((completion * listOutput) / 1_000_000).toFixed(6));
    const retailTotal = Number((retailPrompt + retailCompletion).toFixed(6));
    const savings = Number(Math.max(0, retailTotal - totalCost).toFixed(6));

    return {
      modelId: spec.id,
      modelName: spec.name,
      category: category as 'llm' | 'embedding',
      promptTokens: totalPrompt,
      cachedTokens: cached,
      completionTokens: completion,
      totalTokens: totalPrompt + completion,
      promptCostUsd: promptCost,
      cachedCostUsd: cachedCost,
      completionCostUsd: completionCost,
      totalCostUsd: totalCost,
      retailTotalCostUsd: retailTotal,
      savingsUsd: savings,
      savingsPercentage: retailTotal > 0 ? Number(((savings / retailTotal) * 100).toFixed(1)) : discountPct
    };
  }
}

