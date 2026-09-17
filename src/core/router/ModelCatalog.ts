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
  // --- 1. OpenAI Agentic Coding Engine ---
  {
    id: 'gpt-5-6-luna-low',
    upstreamId: 'gpt-5.6-luna',
    name: 'OpenAI GPT-5.6 Luna Low',
    provider: 'openai',
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
    description: 'Fast and affordable agentic coding model with low reasoning overhead.'
  },

  // --- 2. OpenAI Visual Synthesis & Image Generation Suite ---
  {
    id: 'openai-gpt-image-latest',
    upstreamId: 'gpt-image-2',
    name: 'OpenAI Image Generation',
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
    description: 'Generate images from text prompts for illustrations, product concepts, and marketing assets.'
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
    // 0. Zero-hesitation default fallback when model is omitted or blank (Default: gpt-5-6-luna-low)
    if (!requestedModel || typeof requestedModel !== 'string' || requestedModel.trim().length === 0) {
      return this.catalog.get('gpt-5-6-luna-low') || EXCLUSIVE_MODEL_CATALOG[0];
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
      return this.catalog.get('openai-gpt-image-latest') || EXCLUSIVE_MODEL_CATALOG.find(m => m.category === 'image')!;
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

    // 6. Developer aliases dictionary (maps all mental models to gpt-5-6-luna-low or image)
    const aliases: Record<string, string> = {
      // Primary Choice: gpt-5-6-luna-low
      'gpt-5-6-luna-low': 'gpt-5-6-luna-low',
      'gpt-5.6-luna-low': 'gpt-5-6-luna-low',
      'gpt5-6-luna-low': 'gpt-5-6-luna-low',
      'gpt5.6-luna-low': 'gpt-5-6-luna-low',
      'luna-low': 'gpt-5-6-luna-low',
      'luna': 'gpt-5-6-luna-low',
      'gpt-luna': 'gpt-5-6-luna-low',
      'gpt5-luna': 'gpt-5-6-luna-low',
      'gpt5.6-luna': 'gpt-5-6-luna-low',
      'gpt-5.6-luna': 'gpt-5-6-luna-low',
      'gpt-5-6-luna': 'gpt-5-6-luna-low',
      'codex-luna': 'gpt-5-6-luna-low',
      'fast': 'gpt-5-6-luna-low',
      'flash': 'gpt-5-6-luna-low',
      'speed': 'gpt-5-6-luna-low',
      'turbo': 'gpt-5-6-luna-low',
      'mini': 'gpt-5-6-luna-low',
      'small': 'gpt-5-6-luna-low',
      'cheap': 'gpt-5-6-luna-low',
      'velocity': 'gpt-5-6-luna-low',
      'instant': 'gpt-5-6-luna-low',
      'autocomplete': 'gpt-5-6-luna-low',
      'low-cost': 'gpt-5-6-luna-low',
      'default': 'gpt-5-6-luna-low',
      'primary': 'gpt-5-6-luna-low',

      // Backward compatibility aliases map to gpt-5-6-luna-low
      'astra': 'gpt-5-6-luna-low',
      'gpt-6-astra': 'gpt-5-6-luna-low',
      'gpt6-astra': 'gpt-5-6-luna-low',
      'gpt-6': 'gpt-5-6-luna-low',
      'gpt6': 'gpt-5-6-luna-low',
      'codex-astra': 'gpt-5-6-luna-low',
      'flagship': 'gpt-5-6-luna-low',
      'sota': 'gpt-5-6-luna-low',
      'best': 'gpt-5-6-luna-low',
      'smart': 'gpt-5-6-luna-low',
      'sol': 'gpt-5-6-luna-low',
      'gpt-sol': 'gpt-5-6-luna-low',
      'gpt5-sol': 'gpt-5-6-luna-low',
      'gpt5.6-sol': 'gpt-5-6-luna-low',
      'gpt-5.6-sol': 'gpt-5-6-luna-low',
      'gpt-5-6-sol': 'gpt-5-6-luna-low',
      'gpt5.6': 'gpt-5-6-luna-low',
      'gpt-5.6': 'gpt-5-6-luna-low',
      'gpt5': 'gpt-5-6-luna-low',
      'gpt-5': 'gpt-5.6-sol',
      'codex-sol': 'gpt-5-6-luna-low',
      'workhorse': 'gpt-5-6-luna-low',
      'terra': 'gpt-5-6-luna-low',
      'gpt-terra': 'gpt-5-6-luna-low',
      'gpt5-terra': 'gpt-5-6-luna-low',
      'gpt5.6-terra': 'gpt-5-6-luna-low',
      'gpt-5.6-terra': 'gpt-5-6-luna-low',
      'gpt-5-6-terra': 'gpt-5-6-luna-low',
      'codex-terra': 'gpt-5-6-luna-low',
      'balanced': 'gpt-5-6-luna-low',
      'reasoning': 'gpt-5-6-luna-low',
      'reasoner': 'gpt-5-6-luna-low',
      'thinking': 'gpt-5-6-luna-low',
      '5.5': 'gpt-5-6-luna-low',
      'gpt-5.5': 'gpt-5-6-luna-low',
      'gpt5.5': 'gpt-5-6-luna-low',
      'gpt-5-5': 'gpt-5-6-luna-low',
      'codex-5.5': 'gpt-5-6-luna-low',
      'previous': 'gpt-5-6-luna-low',
      'legacy': 'gpt-5-6-luna-low',
      'embedding': 'gpt-5-6-luna-low',

      // Visual / Image Synthesis variations
      'image': 'openai-gpt-image-latest',
      'images': 'openai-gpt-image-latest',
      'generate-image': 'openai-gpt-image-latest',
      'image-generation': 'openai-gpt-image-latest',
      'gpt-image': 'openai-gpt-image-latest',
      'openai-gpt-image-2': 'openai-gpt-image-latest',
      'gpt-image-latest': 'openai-gpt-image-latest',
      'gpt-image-2': 'openai-gpt-image-latest',
      'dalle': 'openai-gpt-image-latest',
      'dalle-3': 'openai-gpt-image-latest',
      'dall-e': 'openai-gpt-image-latest',
      'dall-e-3': 'openai-gpt-image-latest',
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

    // 8. Zero-hesitation ultimate fallback: default choice LLM (gpt-5-6-luna-low)
    return this.catalog.get('gpt-5-6-luna-low') || EXCLUSIVE_MODEL_CATALOG[0];
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
