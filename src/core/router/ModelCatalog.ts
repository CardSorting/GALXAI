import type { ModelSpecItem, ProviderType } from '../contracts/GalxContracts';
import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../broccolidb/broccolidb-natural-query';
import type { DbQueryOptions, DbAggregateQuery } from '../broccolidb/broccolidb.contracts';

/**
 * Exclusive Model Catalog for GALXAI.
 * Houses only the requested flagship modern generation LLMs & visual synthesis engines:
 * - OpenAI Codex: `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `openai-gpt-image-2`, `openai-gpt-image-1.5`, `openai-gpt-image-1`, `openai-gpt4o-image`, `openai-dalle-3`, `openai-dalle-2`, `text-embedding-3-small`, `text-embedding-3-large`
 * - xAI Grok: `x-ai/grok-4.5`, `xai-grok-image`, `xai-grok-2-image`
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
    contextWindowTokens: 372_000,
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
    contextWindowTokens: 372_000,
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
    contextWindowTokens: 372_000,
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
  }
];

export class ModelCatalog {
  private static catalog: Map<string, ModelSpecItem> = new Map(
    EXCLUSIVE_MODEL_CATALOG.map(m => [m.id, m])
  );

  /**
   * Fast 0ms Model Alias Resolution
   */
  public static resolveModel(requestedModel: string): ModelSpecItem | null {
    if (!requestedModel) return null;
    const normalized = requestedModel.trim().toLowerCase();

    // 1. Direct match on canonical id
    if (this.catalog.has(normalized)) {
      return this.catalog.get(normalized)!;
    }

    // 2. Direct match with exact uppercase/case
    const directFound = EXCLUSIVE_MODEL_CATALOG.find(m => m.id.toLowerCase() === normalized);
    if (directFound) return directFound;

    // 3. Match on upstreamId
    const upstreamMatch = EXCLUSIVE_MODEL_CATALOG.find(
      m => m.upstreamId.toLowerCase() === normalized
    );
    if (upstreamMatch) return upstreamMatch;

    // 4. Intuitive developer aliases
    const aliases: Record<string, string> = {
      'sol': 'gpt-5.6-sol',
      'gpt-5.6': 'gpt-5.6-sol',
      'gpt5-sol': 'gpt-5.6-sol',
      'terra': 'gpt-5.6-terra',
      'gpt-terra': 'gpt-5.6-terra',
      'luna': 'gpt-5.6-luna',
      'gpt-luna': 'gpt-5.6-luna',
      'grok': 'x-ai/grok-4.5',
      'grok-4.5': 'x-ai/grok-4.5',
      'grok4.5': 'x-ai/grok-4.5',
      'grok-image': 'xai-grok-image',
      'grok-imagine': 'xai-grok-image',
      'imagine': 'xai-grok-image',
      'gpt-image': 'openai-gpt-image-2',
      'dalle': 'openai-dalle-3',
      'dalle-3': 'openai-dalle-3',
      'dall-e': 'openai-dalle-3'
    };

    if (aliases[normalized] && this.catalog.has(aliases[normalized])) {
      return this.catalog.get(aliases[normalized])!;
    }

    return null;
  }

  public static listAll(): ModelSpecItem[] {
    return EXCLUSIVE_MODEL_CATALOG;
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
}
