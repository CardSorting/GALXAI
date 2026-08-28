/**
 * GALXAI Developer SDK: Models Resource
 */

import type { ModelInfo, CostEstimateRequest, CostEstimateResult } from '../types';
import type { GalxAIClientCore } from '../client';
import { ModelCatalog } from '../../core/router/ModelCatalog';
import { TokenCostCalculator } from '../../core/pricing/TokenCostCalculator';
import type { DbQueryOptions, DbAggregateQuery } from '../../core/broccolidb/broccolidb.contracts';

export class ModelsResource {
  private readonly client: GalxAIClientCore;

  constructor(client: GalxAIClientCore) {
    this.client = client;
  }

  /**
   * Lists all available AI models supported by the gateway.
   */
  public async list(): Promise<ModelInfo[]> {
    const res = await this.client.request<{ data: Array<{ id: string; object: string; created: number; owned_by: string }> }>('/v1/models');
    return res.data.map(m => {
      const spec = ModelCatalog.resolveModel(m.id);
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
    });
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
  public aggregate(query: DbAggregateQuery) {
    return ModelCatalog.aggregate(query);
  }
}
