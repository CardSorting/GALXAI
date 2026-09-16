import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../broccolidb/broccolidb-natural-query';
import type { DbQueryOptions } from '../broccolidb/broccolidb.contracts';
import type { ModelSpecItem as InternalModelSpecItem } from '../contracts/GalxContracts';
export type ModelSpecItem = Omit<InternalModelSpecItem, 'upstreamId'>;
export type { ProviderType } from '../contracts/GalxContracts';

// Browser-safe public model descriptors. No upstream routing configuration.
export const EXCLUSIVE_MODEL_CATALOG: ModelSpecItem[] = [
  // --- 1. OpenAI Flagship LLM & Agentic Coding Suite ---
  {
    id: 'gpt-6-astra',
    name: 'OpenAI GPT-6 Astra (Default Flagship)',
    provider: 'openai',
    category: 'llm',
    contextWindowTokens: 2_000_000,
    maxOutputTokens: 128_000,
    listPricePer1MInput: 5.0,
    listPricePer1MOutput: 25.0,
    inputPricePer1M: 5.0,
    outputPricePer1M: 25.0,
    cachedInputPricePer1M: 0.50,
    discountPercentage: 0,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    description: 'Our most capable model for complex, demanding work.'
  },
  {
    id: 'gpt-5.6-sol',
    name: 'OpenAI GPT-5.6 Sol (Workhorse)',
    provider: 'openai',
    category: 'llm',
    contextWindowTokens: 1_050_000,
    maxOutputTokens: 128_000,
    listPricePer1MInput: 4.0,
    listPricePer1MOutput: 20.0,
    inputPricePer1M: 4.0,
    outputPricePer1M: 20.0,
    cachedInputPricePer1M: 0.40,
    discountPercentage: 0,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    description: 'Reliable agentic workhorse for everyday tasks.'
  },
  {
    id: 'gpt-5.6-terra',
    name: 'OpenAI GPT-5.6 Terra (Balanced)',
    provider: 'openai',
    category: 'llm',
    contextWindowTokens: 1_050_000,
    maxOutputTokens: 128_000,
    listPricePer1MInput: 2.0,
    listPricePer1MOutput: 12.0,
    inputPricePer1M: 2.0,
    outputPricePer1M: 12.0,
    cachedInputPricePer1M: 0.20,
    discountPercentage: 0,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    description: 'Balanced agentic coding model for everyday work.'
  },
  {
    id: 'gpt-5.6-luna',
    name: 'OpenAI GPT-5.6 Luna (Current Fast)',
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
    description: 'Fast and affordable agentic coding model.'
  },
  {
    id: 'gpt-5.5',
    name: 'OpenAI GPT-5.5 (Proven Workhorse)',
    provider: 'openai',
    category: 'llm',
    contextWindowTokens: 500_000,
    maxOutputTokens: 64_000,
    listPricePer1MInput: 1.00,
    listPricePer1MOutput: 5.00,
    inputPricePer1M: 1.00,
    outputPricePer1M: 5.00,
    cachedInputPricePer1M: 0.10,
    discountPercentage: 0,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    description: 'Proven previous-generation model for coding and general work.'
  },

  // --- 2. OpenAI Visual Synthesis & Image Generation Suite ---
  {
    id: 'openai-gpt-image-latest',
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

  static resolveModel(value: string): ModelSpecItem {
    const query = value.trim().toLowerCase();
    return EXCLUSIVE_MODEL_CATALOG.find(m => m.id === query || m.name.toLowerCase() === query)
      || EXCLUSIVE_MODEL_CATALOG.find(m => query.includes('image') && m.category === 'image')
      || EXCLUSIVE_MODEL_CATALOG.find(m => ['astra', 'sol', 'terra', 'luna', '5.5'].some(name => query.includes(name) && m.id.includes(name)))
      || EXCLUSIVE_MODEL_CATALOG[0];
  }
}
