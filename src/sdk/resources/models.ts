/**
 * GALXAI Developer SDK: Models Resource
 */

import type { ModelInfo, CostEstimateRequest, CostEstimateResult } from '../types';
import type { GalxAIClientCore } from '../client';

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
    return res.data.map(m => ({
      id: m.id,
      name: m.id,
      provider: m.owned_by,
      contextWindow: 128000,
      maxOutputTokens: 16384,
      costPer1kInputTokens: 0.0025,
      costPer1kOutputTokens: 0.01,
      costPer1kCachedInputTokens: 0.000625,
      capabilities: {
        streaming: true,
        reasoning: m.id.includes('sol') || m.id.includes('reasoning'),
        vision: m.id.includes('terra') || m.id.includes('vision'),
        imageGeneration: m.id.includes('image')
      }
    }));
  }

  /**
   * Calculates estimated API compute costs and prompt-caching savings for a given workload.
   */
  public calculateCost(params: CostEstimateRequest): CostEstimateResult {
    const inputRate = 0.0025 / 1000;
    const outputRate = 0.01 / 1000;
    const cachedRate = 0.000625 / 1000;
    const standardInputRate = 0.005 / 1000; // Retail baseline

    const cachedTokens = params.cachedTokens || 0;
    const freshInputTokens = Math.max(0, params.inputTokens - cachedTokens);

    const inputCost = freshInputTokens * inputRate + cachedTokens * cachedRate;
    const outputCost = params.outputTokens * outputRate;
    const totalCost = inputCost + outputCost;

    const retailCost = params.inputTokens * standardInputRate + params.outputTokens * 0.015 / 1000;
    const cachedSavings = (params.inputTokens * inputRate) - inputCost;
    const estimatedSavingsPercentage = retailCost > 0 ? Math.round(((retailCost - totalCost) / retailCost) * 100) : 0;

    return {
      model: params.model,
      inputCost: Number(inputCost.toFixed(6)),
      outputCost: Number(outputCost.toFixed(6)),
      cachedSavings: Number(cachedSavings.toFixed(6)),
      totalCost: Number(totalCost.toFixed(6)),
      retailComparisonCost: Number(retailCost.toFixed(6)),
      estimatedSavingsPercentage
    };
  }
}
