/**
 * Official OpenAI Model Rate Cards & Billed Cost Calculator
 * 
 * Accurately models inference boundary expenditure per million tokens:
 * - Standard Uncached Input ($ / M tokens)
 * - Prompt-Cached Read Input ($ / M tokens)
 * - Output & Reasoning Generation Tokens ($ / M tokens)
 */

export interface OpenAiModelRateCard {
  modelId: string;
  displayName: string;
  contextWindowTokens: number;
  maxOutputTokens: number;
  inputCostPerMillionUSD: number;
  cachedInputCostPerMillionUSD: number;
  outputCostPerMillionUSD: number;
  supportsReasoningTokens?: boolean;
}

export interface InferenceTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  reasoningTokens?: number;
}

export interface BilledCostBreakdown {
  modelId: string;
  uncachedInputCostUSD: number;
  cachedInputCostUSD: number;
  outputCostUSD: number;
  totalBilledCostUSD: number;
  effectiveCostPerThousandTokensUSD: number;
}

export const OPENAI_MODEL_RATE_CARDS: Record<string, OpenAiModelRateCard> = {
  'gpt-4o': {
    modelId: 'gpt-4o',
    displayName: 'OpenAI GPT-4o (Omni)',
    contextWindowTokens: 128_000,
    maxOutputTokens: 16_384,
    inputCostPerMillionUSD: 2.50,
    cachedInputCostPerMillionUSD: 1.25, // 50% discount on cached prefixes
    outputCostPerMillionUSD: 10.00,
    supportsReasoningTokens: false,
  },
  'gpt-4o-mini': {
    modelId: 'gpt-4o-mini',
    displayName: 'OpenAI GPT-4o Mini',
    contextWindowTokens: 128_000,
    maxOutputTokens: 16_384,
    inputCostPerMillionUSD: 0.15,
    cachedInputCostPerMillionUSD: 0.075,
    outputCostPerMillionUSD: 0.60,
    supportsReasoningTokens: false,
  },
  'o1': {
    modelId: 'o1',
    displayName: 'OpenAI o1 (Reasoning)',
    contextWindowTokens: 200_000,
    maxOutputTokens: 100_000,
    inputCostPerMillionUSD: 15.00,
    cachedInputCostPerMillionUSD: 7.50,
    outputCostPerMillionUSD: 60.00,
    supportsReasoningTokens: true,
  },
  'o3-mini': {
    modelId: 'o3-mini',
    displayName: 'OpenAI o3-mini',
    contextWindowTokens: 200_000,
    maxOutputTokens: 100_000,
    inputCostPerMillionUSD: 1.10,
    cachedInputCostPerMillionUSD: 0.55,
    outputCostPerMillionUSD: 4.40,
    supportsReasoningTokens: true,
  },
  'gpt-4-turbo': {
    modelId: 'gpt-4-turbo',
    displayName: 'OpenAI GPT-4 Turbo',
    contextWindowTokens: 128_000,
    maxOutputTokens: 4_096,
    inputCostPerMillionUSD: 10.00,
    cachedInputCostPerMillionUSD: 10.00,
    outputCostPerMillionUSD: 30.00,
    supportsReasoningTokens: false,
  },
};

export class OpenAiRateCardRegistry {
  public static getRateCard(modelId: string): OpenAiModelRateCard {
    const card = OPENAI_MODEL_RATE_CARDS[modelId];
    if (!card) {
      const fallback = OPENAI_MODEL_RATE_CARDS['gpt-4o'];
      return {
        ...fallback,
        modelId,
        displayName: `OpenAI Custom (${modelId})`,
      };
    }
    return card;
  }

  /**
   * Calculates actual billed expenditure at the OpenAI inference boundary.
   */
  public static calculateBilledCost(
    modelId: string,
    usage: InferenceTokenUsage
  ): BilledCostBreakdown {
    const card = this.getRateCard(modelId);

    const totalInput = Math.max(0, usage.inputTokens || 0);
    const cachedInput = Math.min(totalInput, Math.max(0, usage.cachedTokens || 0));
    const uncachedInput = Math.max(0, totalInput - cachedInput);
    const totalOutput = Math.max(0, (usage.outputTokens || 0) + (usage.reasoningTokens || 0));

    const uncachedInputCostUSD = (uncachedInput / 1_000_000) * card.inputCostPerMillionUSD;
    const cachedInputCostUSD = (cachedInput / 1_000_000) * card.cachedInputCostPerMillionUSD;
    const outputCostUSD = (totalOutput / 1_000_000) * card.outputCostPerMillionUSD;

    const totalBilledCostUSD = uncachedInputCostUSD + cachedInputCostUSD + outputCostUSD;
    const totalTokens = totalInput + totalOutput;
    const effectiveCostPerThousandTokensUSD = totalTokens > 0
      ? (totalBilledCostUSD / totalTokens) * 1000
      : 0;

    return {
      modelId: card.modelId,
      uncachedInputCostUSD: Number(uncachedInputCostUSD.toFixed(6)),
      cachedInputCostUSD: Number(cachedInputCostUSD.toFixed(6)),
      outputCostUSD: Number(outputCostUSD.toFixed(6)),
      totalBilledCostUSD: Number(totalBilledCostUSD.toFixed(6)),
      effectiveCostPerThousandTokensUSD: Number(effectiveCostPerThousandTokensUSD.toFixed(6)),
    };
  }
}
