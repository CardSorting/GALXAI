import type { ModelSpecItem, ProviderType } from '../contracts/GalxContracts';
export type { ModelSpecItem, ProviderType };
import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../broccolidb/broccolidb-natural-query';
import type { DbQueryOptions, DbAggregateQuery } from '../broccolidb/broccolidb.contracts';

/**
 * Exclusive Model Catalog for GALXAI.
 * Houses only the requested model of choice & visual synthesis engine:
 * 1. `gpt-5-6-luna-low` (default) - Fast and affordable agentic coding model with low reasoning overhead.
 * 2. `openai-gpt-image-latest` - OpenAI Image Generation.
 *
 * Text-model rates are verified OpenAI API rates.
 */
export const EXCLUSIVE_MODEL_CATALOG: ModelSpecItem[] = [
  // --- 1. GALX Nova Managed Intelligence Engine ---
  {
    id: 'galx-nova',
    upstreamId: 'gpt-5.6-luna',
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
    upstreamId: 'gpt-image-2',
    name: 'GALX Nova-image',
    // PublicModelCatalog keeps the GALX-facing brand. Internally the managed
    // image route is dispatched through the enrolled OpenAI OAuth relay
    // accounts; this field is a credential-pool routing key, not public copy.
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
    description: 'Visual synthesis engine for creative generation, diagrams, and illustrations.'
  },
];

/**
 * Models visible in frontend UI components, calculators, pricing tables, and selectors.
 */
export const FRONTEND_VISIBLE_MODELS: ModelSpecItem[] = EXCLUSIVE_MODEL_CATALOG;

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
    // 0. Zero-hesitation default fallback when model is omitted or blank (Default: galx-nova)
    if (!requestedModel || typeof requestedModel !== 'string' || requestedModel.trim().length === 0) {
      return this.catalog.get('galx-nova') || EXCLUSIVE_MODEL_CATALOG[0];
    }

    if (this.fastPathCache.has(requestedModel)) {
      return this.fastPathCache.get(requestedModel)!;
    }

    const resolved = this.computeResolution(requestedModel);
    this.fastPathCache.set(requestedModel, resolved);
    return resolved;
  }

  private static computeResolution(requestedModel: string): ModelSpecItem {
    const normalized = requestedModel.trim().toLowerCase();

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

    // 4. Visual / Image Synthesis Intent Detection
    if (
      normalized.includes('image') ||
      normalized.includes('draw') ||
      normalized.includes('photo') ||
      normalized.includes('art') ||
      normalized.includes('dall') ||
      normalized.includes('visual')
    ) {
      return this.catalog.get('galx-nova-image') || EXCLUSIVE_MODEL_CATALOG.find(m => m.category === 'image')!;
    }

    // 5. Strip common provider / framework / routing prefixes and version suffixes
    const cleanId = normalized
      .replace(/^(openai|x-ai|xai|anthropic|google|meta|deepseek|mistral|galx|galxai|models|router|gateway)[/:_]/, '')
      .replace(/^@(openai|anthropic|google|deepseek)\//, '')
      .replace(/[:@](latest|preview|\d{4}-\d{2}-\d{2}|\d{8})$/, '')
      .replace(/-(latest|preview|\d{4}-\d{2}-\d{2}|\d{8})$/, '')
      .trim();

    if (this.catalog.has(cleanId)) {
      return this.catalog.get(cleanId)!;
    }

    // 6. Developer aliases dictionary (maps all mental models to galx-nova or galx-nova-image)
    const aliases: Record<string, string> = {
      // Primary Public Models
      'galx-nova': 'galx-nova',
      'galx_nova': 'galx-nova',
      'nova': 'galx-nova',
      'galx-nova-image': 'galx-nova-image',
      'galx_nova_image': 'galx-nova-image',
      'nova-image': 'galx-nova-image',
      'nova_image': 'galx-nova-image',

      // Text and reasoning execution aliases
      'gpt-5-6-luna-low': 'galx-nova',
      'gpt-5.6-luna-low': 'galx-nova',
      'gpt5-6-luna-low': 'galx-nova',
      'gpt5.6-luna-low': 'galx-nova',
      'luna-low': 'galx-nova',
      'luna': 'galx-nova',
      'gpt-luna': 'galx-nova',
      'gpt5-luna': 'galx-nova',
      'gpt5.6-luna': 'galx-nova',
      'gpt-5.6-luna': 'galx-nova',
      'gpt-5-6-luna': 'galx-nova',
      'codex-luna': 'galx-nova',
      'fast': 'galx-nova',
      'flash': 'galx-nova',
      'speed': 'galx-nova',
      'turbo': 'galx-nova',
      'mini': 'galx-nova',
      'small': 'galx-nova',
      'cheap': 'galx-nova',
      'velocity': 'galx-nova',
      'instant': 'galx-nova',
      'autocomplete': 'galx-nova',
      'low-cost': 'galx-nova',
      'default': 'galx-nova',
      'primary': 'galx-nova',

      // Backward compatibility aliases map to galx-nova
      'astra': 'galx-nova',
      'gpt-6-astra': 'galx-nova',
      'gpt6-astra': 'galx-nova',
      'gpt-6': 'galx-nova',
      'gpt6': 'galx-nova',
      'codex-astra': 'galx-nova',
      'flagship': 'galx-nova',
      'sota': 'galx-nova',
      'best': 'galx-nova',
      'smart': 'galx-nova',
      'sol': 'galx-nova',
      'gpt-sol': 'galx-nova',
      'gpt5-sol': 'galx-nova',
      'gpt5.6-sol': 'galx-nova',
      'gpt-5.6-sol': 'galx-nova',
      'gpt-5-6-sol': 'galx-nova',
      'gpt5.6': 'galx-nova',
      'gpt-5.6': 'galx-nova',
      'gpt5': 'galx-nova',
      'gpt-5': 'galx-nova',
      'codex-sol': 'galx-nova',
      'workhorse': 'galx-nova',
      'terra': 'galx-nova',
      'gpt-terra': 'galx-nova',
      'gpt5-terra': 'galx-nova',
      'gpt5.6-terra': 'galx-nova',
      'gpt-5.6-terra': 'galx-nova',
      'gpt-5-6-terra': 'galx-nova',
      'codex-terra': 'galx-nova',
      'balanced': 'galx-nova',
      'reasoning': 'galx-nova',
      'reasoner': 'galx-nova',
      'thinking': 'galx-nova',
      '5.5': 'galx-nova',
      'gpt-5.5': 'galx-nova',
      'gpt5.5': 'galx-nova',
      'gpt-5-5': 'galx-nova',
      'codex-5.5': 'galx-nova',
      'previous': 'galx-nova',
      'legacy': 'galx-nova',
      'embedding': 'galx-nova',

      // Visual / Image Synthesis variations
      'image': 'galx-nova-image',
      'images': 'galx-nova-image',
      'generate-image': 'galx-nova-image',
      'image-generation': 'galx-nova-image',
      'gpt-image': 'galx-nova-image',
      'openai-gpt-image-latest': 'galx-nova-image',
      'openai-gpt-image-2': 'galx-nova-image',
      'gpt-image-latest': 'galx-nova-image',
      'gpt-image-2': 'galx-nova-image',
      'dalle': 'galx-nova-image',
      'dalle-3': 'galx-nova-image',
      'dall-e': 'galx-nova-image',
      'dall-e-3': 'galx-nova-image',
    };

    if (aliases[normalized] && this.catalog.has(aliases[normalized])) {
      return this.catalog.get(aliases[normalized])!;
    }

    if (aliases[cleanId] && this.catalog.has(aliases[cleanId])) {
      return this.catalog.get(aliases[cleanId])!;
    }

    // 7. Dot / dash version normalization: replace gpt-5-6 with gpt-5.6
    const dotNormalized = normalized.replace(/(\d+)-(\d+)/g, '$1.$2');
    if (this.catalog.has(dotNormalized)) {
      return this.catalog.get(dotNormalized)!;
    }
    if (aliases[dotNormalized] && this.catalog.has(aliases[dotNormalized])) {
      return this.catalog.get(aliases[dotNormalized])!;
    }

    // 8. Zero-hesitation ultimate fallback: default choice LLM (galx-nova)
    return this.catalog.get('galx-nova') || EXCLUSIVE_MODEL_CATALOG[0];
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
      const unitWholesale = spec.inputPricePer1M ?? 0.060;
      const unitRetail = spec.listPricePer1MInput ?? (unitWholesale * 1.33);
      const totalCost = Number((imagesCount * unitWholesale).toFixed(6));
      const retailTotal = Number((imagesCount * unitRetail).toFixed(6));
      const savings = Number(Math.max(0, retailTotal - totalCost).toFixed(6));
      const discountPct = spec.discountPercentage ?? 0;

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
    const cachedRate = spec.cachedInputPricePer1M ?? (inputRate * 0.1);
    const listInput = spec.listPricePer1MInput ?? inputRate;
    const listOutput = spec.listPricePer1MOutput ?? outputRate;
    const discountPct = spec.discountPercentage ?? 0;

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
