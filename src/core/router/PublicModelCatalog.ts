import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../broccolidb/broccolidb-natural-query';
import type { DbQueryOptions } from '../broccolidb/broccolidb.contracts';
import type { ModelSpecItem as InternalModelSpecItem } from '../contracts/GalxContracts';
export type ModelSpecItem = Omit<InternalModelSpecItem, 'upstreamId'>;
export type { ProviderType } from '../contracts/GalxContracts';

// Browser-safe public model descriptors. No upstream routing configuration.
export const EXCLUSIVE_MODEL_CATALOG: ModelSpecItem[] = [
  // --- 1. OpenAI Agentic Coding Engine ---
  {
    id: 'gpt-5-6-luna-low',
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

  static resolveModel(value?: string | null): ModelSpecItem {
    if (!value || typeof value !== 'string') return EXCLUSIVE_MODEL_CATALOG[0];
    const query = value.trim().toLowerCase();
    return EXCLUSIVE_MODEL_CATALOG.find(m => m.id === query || m.name.toLowerCase() === query)
      || EXCLUSIVE_MODEL_CATALOG.find(m => (query.includes('image') || query.includes('draw') || query.includes('dall')) && m.category === 'image')
      || EXCLUSIVE_MODEL_CATALOG.find(m => m.category === 'llm')
      || EXCLUSIVE_MODEL_CATALOG[0];
  }
}
