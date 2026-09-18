/**
 * GALXAI Developer SDK: Models Resource
 * Powered by BroccoliDB L1 Reactive In-Memory Tables (<0.05ms local querying & aggregation)
 */

import type { ModelInfo, CostEstimateRequest, CostEstimateResult, RequestOptions } from '../types';
import type { GalxAIClientCore } from '../client';
import { ModelCatalog, type ModelSpecItem } from '../../core/router/PublicModelCatalog';
import { TokenCostCalculator } from '../../core/pricing/TokenCostCalculator';
import type { DbQueryOptions, DbAggregateQuery } from '../../core/broccolidb/broccolidb.contracts';
import { Page } from '../pagination';

export interface ModelsListParams extends RequestOptions {
  /** Natural language filter query (e.g. 'reasoning models under $5') executed offline via BroccoliDB */
  naturalQuery?: string;
  /** Structured BroccoliDB query options */
  filter?: DbQueryOptions;
  /** Filter by provider ('openai', etc.) */
  provider?: string;
  /** Filter by category ('llm', 'image', 'embedding') */
  category?: 'llm' | 'image' | 'embedding' | string;
  /** Max items to return */
  limit?: number;
}

export class ModelInfoPage extends Page<ModelInfo> {
  /**
   * Returns the model with the lowest input token price in the dataset.
   */
  public cheapest(): ModelInfo | undefined {
    return [...this.data].sort((a, b) => a.costPer1kInputTokens - b.costPer1kInputTokens)[0];
  }

  /**
   * Returns models that support frontier reasoning / chain-of-thought.
   */
  public reasoning(): ModelInfo[] {
    return this.data.filter(m => m.capabilities.reasoning);
  }

  /**
   * Returns models that support multimodal visual analysis.
   */
  public vision(): ModelInfo[] {
    return this.data.filter(m => m.capabilities.vision);
  }

  /**
   * Returns models belonging to a specific provider.
   */
  public byProvider(provider: string): ModelInfo[] {
    return this.data.filter(m => m.provider.toLowerCase() === provider.toLowerCase());
  }
}

export type ModelsListResponse = ModelInfoPage;

export class ModelsResource {
  private readonly client: GalxAIClientCore;

  constructor(client: GalxAIClientCore) {
    this.client = client;
  }

  private mapSpecToModelInfo(spec: any): ModelInfo {
    return {
      id: spec.id,
      name: spec.name,
      provider: spec.provider,
      contextWindow: spec.contextWindowTokens,
      maxOutputTokens: spec.maxOutputTokens,
      costPer1kInputTokens: spec.inputPricePer1M / 1000,
      costPer1kOutputTokens: spec.outputPricePer1M / 1000,
      costPer1kCachedInputTokens: (spec.cachedInputPricePer1M ?? spec.inputPricePer1M) / 1000,
      capabilities: {
        streaming: spec.supportsStreaming,
        reasoning: spec.supportsReasoning,
        vision: spec.supportsVision,
        imageGeneration: spec.category === 'image'
      }
    };
  }

  /**
   * Lists all available AI models supported by the gateway.
   * Supercharged with BroccoliDB in-memory querying (<0.05ms) and natural language filtering.
   * Returns an auto-paging ModelInfoPage supporting array indexing, `.data`, and `for await` iteration.
   */
  public async list(options?: ModelsListParams): Promise<ModelInfoPage> {
    // If natural language or DSL query is specified, evaluate offline via BroccoliDB L1 table directly
    if (options?.naturalQuery) {
      const specs = ModelCatalog.queryNatural(options.naturalQuery);
      const mapped = specs.map(s => this.mapSpecToModelInfo(s));
      return new ModelInfoPage({ data: mapped, has_more: false, total: mapped.length });
    }

    if (options?.filter) {
      const specs = ModelCatalog.queryDSL(options.filter);
      const mapped = specs.map(s => this.mapSpecToModelInfo(s));
      return new ModelInfoPage({ data: mapped, has_more: false, total: mapped.length });
    }

    if (this.client.isMock) {
      let specs: ModelSpecItem[] = ModelCatalog.listAll();
      if (options?.provider) {
        specs = specs.filter((s: ModelSpecItem) => s.provider === options.provider);
      }
      if (options?.category) {
        specs = specs.filter((s: ModelSpecItem) => s.category === options.category);
      }
      const mapped = specs.map((s: ModelSpecItem) => this.mapSpecToModelInfo(s));
      return new ModelInfoPage({ data: mapped, has_more: false, total: mapped.length });
    }

    try {
      const res = await this.client.request<{ data: Array<{ id: string; object: string; created: number; owned_by: string }> }>('/v1/models', options);
      const mapped: ModelInfo[] = res.data.map(m => {
        const spec = ModelCatalog.resolveModel(m.id);
        return this.mapSpecToModelInfo(spec);
      });

      return new ModelInfoPage({
        data: mapped,
        has_more: false,
        total: mapped.length
      });
    } catch {
      // Offline fallback: resolve from local BroccoliDB catalog
      const specs: ModelSpecItem[] = ModelCatalog.listAll();
      const mapped = specs.map((s: ModelSpecItem) => this.mapSpecToModelInfo(s));
      return new ModelInfoPage({ data: mapped, has_more: false, total: mapped.length });
    }
  }

  /**
   * Retrieves detailed specifications for a specific model.
   */
  public async retrieve(modelId: string, options?: RequestOptions): Promise<ModelInfo> {
    const list = await this.list(options);
    const found = list.find(m => m.id === modelId);
    if (found) return found;

    const spec = ModelCatalog.resolveModel(modelId);
    return this.mapSpecToModelInfo(spec);
  }

  /**
   * Retrieves detailed specifications for a specific model (convenience alias for .retrieve).
   *
   * @example
   * ```typescript
   * const model = await galx.models.get('galx-nova');
   * ```
   */
  public get(modelId: string, options?: RequestOptions): Promise<ModelInfo> {
    return this.retrieve(modelId, options);
  }

  /**
   * Checks whether a model ID exists and is active.
   *
   * @example
   * ```typescript
   * if (await galx.models.has('galx-nova')) {
   *   // Model is ready
   * }
   * ```
   */
  public async has(modelId: string, options?: RequestOptions): Promise<boolean> {
    try {
      const list = await this.list(options);
      return list.data.some(m => m.id === modelId);
    } catch {
      return false;
    }
  }

  /**
   * Returns the default flagship frontier reasoning model.
   *
   * @example
   * ```typescript
   * const defaultModel = await galx.models.default();
   * console.log(defaultModel.id); // 'galx-nova'
   * ```
   */
  public async default(options?: RequestOptions): Promise<ModelInfo> {
    return this.retrieve('galx-nova', options);
  }

  /**
   * Returns a flat array of all registered model identifiers.
   *
   * @example
   * ```typescript
   * const ids = await galx.models.names();
   * console.log(ids); // ['galx-nova', 'galx-nova-image']
   * ```
   */
  public async names(options?: RequestOptions): Promise<string[]> {
    const list = await this.list(options);
    return list.data.map(m => m.id);
  }

  /**
   * Searches models by keyword across identifier, human-readable name, and provider.
   *
   * @example
   * ```typescript
   * const visionModels = await galx.models.search('vision');
   * ```
   */
  public async search(query: string, options?: RequestOptions): Promise<ModelInfo[]> {
    const list = await this.list(options);
    const q = query.toLowerCase();
    return list.data.filter(m =>
      m.id.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      m.provider.toLowerCase().includes(q)
    );
  }

  /**
   * Calculates estimated API compute costs and prompt-caching savings for a given workload.
   */
  public calculateCost(params: CostEstimateRequest): CostEstimateResult {
    const breakdown = TokenCostCalculator.calculateCost(params.model, {
      promptTokens: params.inputTokens,
      completionTokens: params.outputTokens,
      cachedTokens: params.cachedTokens || 0
    });

    return {
      model: params.model,
      inputCost: Number((breakdown.promptCostUsd + breakdown.cachedCostUsd + breakdown.cacheCreationCostUsd).toFixed(6)),
      outputCost: Number((breakdown.completionCostUsd + breakdown.reasoningCostUsd).toFixed(6)),
      cachedSavings: breakdown.cachingSavingsUsd,
      totalCost: breakdown.netCostUsd,
      retailComparisonCost: breakdown.retailTotalCostUsd,
      estimatedSavingsPercentage: breakdown.savingsPercentage
    };
  }

  /**
   * Executes deterministic offline natural language queries over the model catalog (<0.1ms).
   */
  public queryNatural(naturalQuery: string) {
    return ModelCatalog.queryNatural(naturalQuery);
  }

  /**
   * Evaluates structured query filters over the model catalog.
   */
  public queryDSL(options: DbQueryOptions) {
    return ModelCatalog.queryDSL(options);
  }

  /**
   * Calculates pricing and statistical aggregations across the catalog.
   */
  /**
   * Compares two models side-by-side across pricing, context windows, and frontier capabilities.
   *
   * @example
   * ```typescript
   * const comparison = await galx.models.compare('galx-nova', 'galx-nova-image');
   * console.log(comparison.cheaperInputModel, comparison.inputSavingsPercentage);
   * ```
   */
  public async compare(modelIdA: string, modelIdB: string): Promise<ModelComparisonResult> {
    const [modelA, modelB] = await Promise.all([
      this.retrieve(modelIdA),
      this.retrieve(modelIdB)
    ]);

    const inputDiff = modelA.costPer1kInputTokens - modelB.costPer1kInputTokens;
    const outputDiff = modelA.costPer1kOutputTokens - modelB.costPer1kOutputTokens;

    const cheaperInputModel = inputDiff <= 0 ? modelA.id : modelB.id;
    const cheaperOutputModel = outputDiff <= 0 ? modelA.id : modelB.id;

    const maxInput = Math.max(modelA.costPer1kInputTokens, modelB.costPer1kInputTokens);
    const minInput = Math.min(modelA.costPer1kInputTokens, modelB.costPer1kInputTokens);
    const inputSavingsPct = maxInput > 0 ? Number((((maxInput - minInput) / maxInput) * 100).toFixed(1)) : 0;

    const maxOutput = Math.max(modelA.costPer1kOutputTokens, modelB.costPer1kOutputTokens);
    const minOutput = Math.min(modelA.costPer1kOutputTokens, modelB.costPer1kOutputTokens);
    const outputSavingsPct = maxOutput > 0 ? Number((((maxOutput - minOutput) / maxOutput) * 100).toFixed(1)) : 0;

    return {
      modelA,
      modelB,
      contextWindowDiff: modelA.contextWindow - modelB.contextWindow,
      cheaperInputModel,
      cheaperOutputModel,
      inputSavingsPercentage: inputSavingsPct,
      outputSavingsPercentage: outputSavingsPct,
      reasoningComparison: {
        modelA: modelA.capabilities.reasoning,
        modelB: modelB.capabilities.reasoning
      },
      visionComparison: {
        modelA: modelA.capabilities.vision,
        modelB: modelB.capabilities.vision
      }
    };
  }

  /**
   * Finds the optimal models satisfying specific context window, pricing, or reasoning constraints.
   *
   * @example
   * ```typescript
   * const models = await galx.models.optimal({
   *   minContextWindow: 128000,
   *   reasoningRequired: true,
   *   maxCostPer1kInputTokens: 0.005
   * });
   * ```
   */
  public async optimal(criteria: ModelSearchCriteria = {}): Promise<ModelInfo[]> {
    const list = await this.list();
    let candidates = [...list.data];

    if (criteria.minContextWindow) {
      candidates = candidates.filter(m => m.contextWindow >= criteria.minContextWindow!);
    }
    if (criteria.maxCostPer1kInputTokens !== undefined) {
      candidates = candidates.filter(m => m.costPer1kInputTokens <= criteria.maxCostPer1kInputTokens!);
    }
    if (criteria.reasoningRequired) {
      candidates = candidates.filter(m => m.capabilities.reasoning);
    }
    if (criteria.visionRequired) {
      candidates = candidates.filter(m => m.capabilities.vision);
    }
    if (criteria.streamingRequired) {
      candidates = candidates.filter(m => m.capabilities.streaming);
    }
    if (criteria.provider) {
      candidates = candidates.filter(m => m.provider.toLowerCase() === criteria.provider!.toLowerCase());
    }

    candidates.sort((a, b) => a.costPer1kInputTokens - b.costPer1kInputTokens);

    if (criteria.limit) {
      candidates = candidates.slice(0, criteria.limit);
    }

    return candidates;
  }
}

export interface ModelComparisonResult {
  modelA: ModelInfo;
  modelB: ModelInfo;
  contextWindowDiff: number;
  cheaperInputModel: string;
  cheaperOutputModel: string;
  inputSavingsPercentage: number;
  outputSavingsPercentage: number;
  reasoningComparison: {
    modelA: boolean;
    modelB: boolean;
  };
  visionComparison: {
    modelA: boolean;
    modelB: boolean;
  };
}

export interface ModelSearchCriteria {
  minContextWindow?: number;
  maxCostPer1kInputTokens?: number;
  reasoningRequired?: boolean;
  visionRequired?: boolean;
  streamingRequired?: boolean;
  provider?: string;
  limit?: number;
}
