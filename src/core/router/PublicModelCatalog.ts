import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../broccolidb/broccolidb-natural-query';
import type { DbQueryOptions } from '../broccolidb/broccolidb.contracts';
import type { ModelSpecItem as InternalModelSpecItem } from '../contracts/GalxContracts';
export type ModelSpecItem = Omit<InternalModelSpecItem, 'upstreamId'>;
export type { ProviderType } from '../contracts/GalxContracts';

// Browser-safe public model descriptors. No upstream routing configuration.
export const EXCLUSIVE_MODEL_CATALOG: ModelSpecItem[] = [
  // --- 1. GALX Nova Managed Intelligence Engine ---
  {
    id: 'galx-nova',
    name: 'GALX Nova',
    provider: 'galx',
    category: 'llm',
    contextWindowTokens: 1_050_000,
    maxOutputTokens: 128_000,
    listPricePer1MInput: 0.20,
    listPricePer1MOutput: 1.20,
    inputPricePer1M: 0.20,
    outputPricePer1M: 1.20,
    cachedInputPricePer1M: 0.02,
    discountPercentage: 0,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    description: 'Sustainable Intelligence Engine for high-velocity reasoning, coding, and generation.'
  },

  // --- 2. GALX Nova Image Synthesis Suite ---
  {
    id: 'galx-nova-image',
    name: 'GALX Nova-image',
    provider: 'galx',
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
    description: 'Visual synthesis engine for creative generation, diagrams, and illustrations.'
  },
];

/**
 * Models visible in frontend UI components, calculators, pricing tables, and selectors.
 */
export const FRONTEND_VISIBLE_MODELS: ModelSpecItem[] = EXCLUSIVE_MODEL_CATALOG;

export class ModelCatalog {
  static listAll() { return EXCLUSIVE_MODEL_CATALOG; }
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
   * Resolves any user-provided model query, alias, fuzzy identifier, or natural language intent
   * to a valid canonical public model (e.g. 'galx-nova' or 'galx-nova-image').
   * Matches familiar ergonomics used by OpenRouter, Vercel AI SDK, and Cloudflare AI Gateway.
   */
  static resolveModel(value?: string | null): ModelSpecItem {
    if (!value || typeof value !== 'string') return EXCLUSIVE_MODEL_CATALOG[0];
    const normalized = value.trim().toLowerCase();

    // 1. Direct ID & exact Display Name match
    const exact = EXCLUSIVE_MODEL_CATALOG.find(m => m.id === normalized || m.name.toLowerCase() === normalized);
    if (exact) return exact;

    // 2. Visual / Image Synthesis Intent Detection
    const isImageQuery =
      normalized.includes('image') ||
      normalized.includes('draw') ||
      normalized.includes('photo') ||
      normalized.includes('dall') ||
      normalized.includes('art') ||
      normalized.includes('visual') ||
      normalized.includes('diffusion') ||
      normalized.includes('render') ||
      normalized.includes('flux') ||
      normalized.includes('midjourney') ||
      normalized.includes('painting') ||
      normalized.includes('canvas') ||
      normalized.includes('generate-image');

    if (isImageQuery) {
      return EXCLUSIVE_MODEL_CATALOG.find(m => m.category === 'image') || EXCLUSIVE_MODEL_CATALOG[1] || EXCLUSIVE_MODEL_CATALOG[0];
    }

    // 3. Provider & ecosystem prefix stripping (e.g. 'openai/galx-nova', '@galxai/nova:latest', 'models:galx-nova')
    const cleanId = normalized
      .replace(/^(openai|anthropic|google|meta|deepseek|mistral|galx|galxai|models|router|gateway)[/:_]/, '')
      .replace(/^@(openai|anthropic|google|deepseek|galx|galxai)\//, '')
      .replace(/[:@](latest|preview|\d{4}-\d{2}-\d{2}|\d{8})$/, '')
      .replace(/-(latest|preview|\d{4}-\d{2}-\d{2}|\d{8})$/, '')
      .trim();

    // 4. Well-known canonical aliases dictionary (OpenRouter / LiteLLM pattern)
    const aliases: Record<string, string> = {
      // Primary Nova aliases
      'nova': 'galx-nova',
      'galx-nova': 'galx-nova',
      'galx_nova': 'galx-nova',
      'galxnova': 'galx-nova',
      'nova-text': 'galx-nova',
      'nova-llm': 'galx-nova',
      'nova-image': 'galx-nova-image',
      'galx-nova-image': 'galx-nova-image',
      'galx_nova_image': 'galx-nova-image',
      'galxnovaimage': 'galx-nova-image',

      // Semantic / Capability aliases
      'text': 'galx-nova',
      'chat': 'galx-nova',
      'code': 'galx-nova',
      'coding': 'galx-nova',
      'reasoning': 'galx-nova',
      'fast': 'galx-nova',
      'flash': 'galx-nova',
      'velocity': 'galx-nova',
      'flagship': 'galx-nova',
      'sota': 'galx-nova',
      'best': 'galx-nova',
      'smart': 'galx-nova',
      'auto': 'galx-nova',
      'default': 'galx-nova',
      'primary': 'galx-nova',

      // Legacy caller compatibility aliases (graceful seamless continuity)
      'luna': 'galx-nova',
      'gpt-5.6-luna': 'galx-nova',
      'gpt-5-6-luna': 'galx-nova',
      'gpt5.6-luna': 'galx-nova',
      'sol': 'galx-nova',
      'gpt-5.6-sol': 'galx-nova',
      'terra': 'galx-nova',
      'gpt-5.6-terra': 'galx-nova',
      'gpt-4o': 'galx-nova',
      'gpt-4': 'galx-nova',
      'claude-3-5-sonnet': 'galx-nova',
      'claude': 'galx-nova',
      'o1': 'galx-nova',
      'o3': 'galx-nova',
      'dall-e-3': 'galx-nova-image',
      'dall-e': 'galx-nova-image',
      'openai-gpt-image-latest': 'galx-nova-image',
      'gpt-image-2': 'galx-nova-image',
    };

    if (aliases[cleanId]) {
      const match = EXCLUSIVE_MODEL_CATALOG.find(m => m.id === aliases[cleanId]);
      if (match) return match;
    }

    if (aliases[normalized]) {
      const match = EXCLUSIVE_MODEL_CATALOG.find(m => m.id === aliases[normalized]);
      if (match) return match;
    }

    // 5. Zero-hesitation ultimate fallback: default choice LLM (galx-nova)
    return EXCLUSIVE_MODEL_CATALOG.find(m => m.category === 'llm') || EXCLUSIVE_MODEL_CATALOG[0];
  }

  /**
   * Helper check if a model ID or query is recognized in the public catalog.
   */
  static hasModel(modelId: string): boolean {
    if (!modelId) return false;
    const normalized = modelId.trim().toLowerCase();
    return EXCLUSIVE_MODEL_CATALOG.some(m => m.id === normalized || m.name.toLowerCase() === normalized);
  }

  /**
   * Returns supported model ids list.
   */
  static listIds(): string[] {
    return EXCLUSIVE_MODEL_CATALOG.map(m => m.id);
  }
}
