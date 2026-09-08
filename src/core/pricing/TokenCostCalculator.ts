import { EXCLUSIVE_MODEL_CATALOG, ModelSpecItem } from '../router/PublicModelCatalog';

export type ServiceTier = 'standard' | 'batch' | 'flex';

export interface TokenUsageInput {
  promptTokens?: number;
  completionTokens?: number;
  cachedTokens?: number;
  cacheCreationTokens?: number;
  reasoningTokens?: number;
  imagesCount?: number;
  quality?: 'standard' | 'hd';
  
  // Audio Multimodal (Realtime Voice / Whisper)
  audioInputTokens?: number;
  audioOutputTokens?: number;
  audioInputSeconds?: number;
  audioOutputSeconds?: number;

  // Asynchronous Batch Mode (50% Discount)
  serviceTier?: ServiceTier;
}

export type VolumeDiscountTier = 'hobby' | 'startup' | 'scale' | 'enterprise';

export interface VolumeTierInfo {
  tier: VolumeDiscountTier;
  label: string;
  minMonthlySpendUsd: number;
  additionalRebatePct: number;
}

export const VOLUME_TIERS: Record<VolumeDiscountTier, VolumeTierInfo> = {
  hobby: { tier: 'hobby', label: 'Starter / Developer', minMonthlySpendUsd: 0, additionalRebatePct: 0 },
  // Contract discounts must come from the customer's signed rate card. Until
  // that source of truth is wired in, higher spend must not invent a rebate.
  startup: { tier: 'startup', label: 'Growth / Startup', minMonthlySpendUsd: 100, additionalRebatePct: 0 },
  scale: { tier: 'scale', label: 'Scale / Team', minMonthlySpendUsd: 500, additionalRebatePct: 0 },
  enterprise: { tier: 'enterprise', label: 'Frontier Enterprise', minMonthlySpendUsd: 2500, additionalRebatePct: 0 }
};

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'SGD';

export const CURRENCY_FX_RATES: Record<SupportedCurrency, { rate: number; symbol: string; decimals: number }> = {
  USD: { rate: 1.00, symbol: '$', decimals: 2 },
  EUR: { rate: 0.92, symbol: '€', decimals: 2 },
  GBP: { rate: 0.79, symbol: '£', decimals: 2 },
  JPY: { rate: 154.50, symbol: '¥', decimals: 0 },
  CAD: { rate: 1.38, symbol: 'CA$', decimals: 2 },
  AUD: { rate: 1.52, symbol: 'A$', decimals: 2 },
  CHF: { rate: 0.89, symbol: 'CHF ', decimals: 2 },
  SGD: { rate: 1.35, symbol: 'S$', decimals: 2 }
};

export interface OptimizationRecommendation {
  type: 'caching' | 'model_selection' | 'batch_mode' | 'prompt_reduction';
  title: string;
  description: string;
  estimatedMonthlySavingsUsd: number;
  impactLevel: 'high' | 'medium' | 'low';
}

export interface GranularCostBreakdown {
  modelId: string;
  modelName: string;
  category: 'llm' | 'image' | 'embedding';
  serviceTier: ServiceTier;
  
  // Token Counts
  promptTokens: number;
  cachedTokens: number;
  cacheCreationTokens: number;
  nonCachedPromptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  imagesCount?: number;
  audioInputTokens?: number;
  audioOutputTokens?: number;
  
  // Micro-costs calculated down to $0.000001 (6 decimals)
  promptCostUsd: number;
  cachedCostUsd: number;
  cacheCreationCostUsd: number;
  completionCostUsd: number;
  reasoningCostUsd: number;
  audioCostUsd?: number;
  imageCostUsd?: number;
  batchDiscountUsd: number;
  totalCostUsd: number;
  
  // Volume Tier & Additional Rebate
  volumeTier: VolumeDiscountTier;
  volumeTierRebateUsd: number;
  netCostUsd: number;
  
  // Direct Retail Comparison (OpenAI List Price)
  retailPromptCostUsd: number;
  retailCompletionCostUsd: number;
  retailTotalCostUsd: number;
  
  // Wholesale Arbitrage Savings
  wholesaleSavingsUsd: number;
  cachingSavingsUsd: number;
  totalSavingsUsd: number;
  savingsPercentage: number;
  
  // Environmental & Energy Impact
  estimatedEnergyWattHours: number;
  estimatedCarbonGramsCO2e: number;
  
  // Plain-English Non-Technical Executive Summary
  executiveSummary: string;
}

export interface ModelPricingSummary {
  modelId: string;
  name: string;
  provider: string;
  category: 'llm' | 'image' | 'embedding';
  inputPricePer1M: number;
  outputPricePer1M: number;
  cachedInputPricePer1M: number;
  listPricePer1MInput: number;
  listPricePer1MOutput: number;
  discountPercentage: number;
  promptPricePer1k: number;
  completionPricePer1k: number;
  cachedPricePer1k: number;
  batchPricePer1MInput: number;
  batchPricePer1MOutput: number;
  formattedRateDisplay: string;
}

export class TokenCostCalculator {
  /**
   * Resolves the user's active volume discount tier based on 30-day trailing spend.
   */
  public static resolveVolumeTier(monthlySpendUsd: number): VolumeTierInfo {
    if (monthlySpendUsd >= 2500) return VOLUME_TIERS.enterprise;
    if (monthlySpendUsd >= 500) return VOLUME_TIERS.scale;
    if (monthlySpendUsd >= 100) return VOLUME_TIERS.startup;
    return VOLUME_TIERS.hobby;
  }

  /**
   * Calculates exact sub-cent token or image cost with micro-precision ($0.000001)
   * for LLMs, prompt caching rebates, reasoning chains, embedding models, and image diffusion engines.
   */
  public static calculateCost(
    modelSpecOrId: ModelSpecItem | string,
    usage: TokenUsageInput,
    options?: { monthlySpendUsd?: number; customVolumeTier?: VolumeDiscountTier }
  ): GranularCostBreakdown {
    const spec = typeof modelSpecOrId === 'string'
      ? (EXCLUSIVE_MODEL_CATALOG.find(m => m.id === modelSpecOrId) || EXCLUSIVE_MODEL_CATALOG[0])
      : modelSpecOrId;

    const category = spec.category;
    const serviceTier = usage.serviceTier || 'standard';
    const isBatch = serviceTier === 'batch';
    const batchMultiplier = isBatch ? 0.5 : 1.0;

    const tierInfo = options?.customVolumeTier
      ? VOLUME_TIERS[options.customVolumeTier]
      : this.resolveVolumeTier(options?.monthlySpendUsd || 0);

    // 1. Image Generation Models (Per-Image Flat Rate Micro-Pricing)
    if (category === 'image') {
      const imagesCount = Math.max(1, usage.imagesCount || (usage.completionTokens ? Math.ceil(usage.completionTokens / 1000) : 1));
      const unitWholesale = spec.inputPricePer1M ?? 0.040;
      const unitRetail = spec.listPricePer1MInput ?? (unitWholesale * 1.33);
      
      const qualityMultiplier = usage.quality === 'hd' ? 1.5 : 1.0;
      const baseCostUsd = Number((imagesCount * unitWholesale * qualityMultiplier).toFixed(6));
      const rawCostUsd = Number((baseCostUsd * batchMultiplier).toFixed(6));
      const batchDiscountUsd = Number((baseCostUsd - rawCostUsd).toFixed(6));
      const volumeRebateUsd = Number((rawCostUsd * (tierInfo.additionalRebatePct / 100)).toFixed(6));
      const netCostUsd = Number((rawCostUsd - volumeRebateUsd).toFixed(6));

      const retailTotalCostUsd = Number((imagesCount * unitRetail * qualityMultiplier).toFixed(6));
      const totalSavingsUsd = Number(Math.max(0, retailTotalCostUsd - netCostUsd).toFixed(6));
      const savingsPercentage = retailTotalCostUsd > 0
        ? Number(((totalSavingsUsd / retailTotalCostUsd) * 100).toFixed(1))
        : (spec.discountPercentage ?? 0);

      const summary = `Generated ${imagesCount} image${imagesCount > 1 ? 's' : ''} on ${spec.name} for $${netCostUsd.toFixed(4)} USD (Saved $${totalSavingsUsd.toFixed(4)} vs direct retail list price).`;

      return {
        modelId: spec.id,
        modelName: spec.name,
        category: 'image',
        serviceTier,
        promptTokens: usage.promptTokens || 1000,
        cachedTokens: 0,
        cacheCreationTokens: 0,
        nonCachedPromptTokens: usage.promptTokens || 1000,
        completionTokens: 0,
        reasoningTokens: 0,
        totalTokens: usage.promptTokens || 1000,
        imagesCount,
        promptCostUsd: netCostUsd,
        cachedCostUsd: 0,
        cacheCreationCostUsd: 0,
        completionCostUsd: 0,
        reasoningCostUsd: 0,
        imageCostUsd: netCostUsd,
        batchDiscountUsd,
        totalCostUsd: rawCostUsd,
        volumeTier: tierInfo.tier,
        volumeTierRebateUsd: volumeRebateUsd,
        netCostUsd,
        retailPromptCostUsd: retailTotalCostUsd,
        retailCompletionCostUsd: 0,
        retailTotalCostUsd,
        wholesaleSavingsUsd: totalSavingsUsd,
        cachingSavingsUsd: 0,
        totalSavingsUsd,
        savingsPercentage,
        estimatedEnergyWattHours: Number((imagesCount * 2.4).toFixed(3)),
        estimatedCarbonGramsCO2e: Number((imagesCount * 0.95).toFixed(3)),
        executiveSummary: summary
      };
    }

    // 2. Embedding Models (Pure Input Ingestion per 1M tokens)
    if (category === 'embedding') {
      const totalPrompt = Math.max(0, usage.promptTokens || 0);
      const inputRate = spec.inputPricePer1M ?? 0.020;
      const listInputRate = spec.listPricePer1MInput ?? (inputRate * 1.33);

      const baseCostUsd = Number(((totalPrompt * inputRate) / 1_000_000).toFixed(6));
      const rawCostUsd = Number((baseCostUsd * batchMultiplier).toFixed(6));
      const batchDiscountUsd = Number((baseCostUsd - rawCostUsd).toFixed(6));
      const volumeRebateUsd = Number((rawCostUsd * (tierInfo.additionalRebatePct / 100)).toFixed(6));
      const netCostUsd = Number((rawCostUsd - volumeRebateUsd).toFixed(6));

      const retailTotalCostUsd = Number(((totalPrompt * listInputRate) / 1_000_000).toFixed(6));
      const totalSavingsUsd = Number(Math.max(0, retailTotalCostUsd - netCostUsd).toFixed(6));
      const savingsPercentage = retailTotalCostUsd > 0
        ? Number(((totalSavingsUsd / retailTotalCostUsd) * 100).toFixed(1))
        : (spec.discountPercentage ?? 0);

      const summary = `Embedded ${totalPrompt.toLocaleString()} tokens with ${spec.name} for $${netCostUsd.toFixed(6)} USD.`;

      return {
        modelId: spec.id,
        modelName: spec.name,
        category: 'embedding',
        serviceTier,
        promptTokens: totalPrompt,
        cachedTokens: 0,
        cacheCreationTokens: 0,
        nonCachedPromptTokens: totalPrompt,
        completionTokens: 0,
        reasoningTokens: 0,
        totalTokens: totalPrompt,
        promptCostUsd: netCostUsd,
        cachedCostUsd: 0,
        cacheCreationCostUsd: 0,
        completionCostUsd: 0,
        reasoningCostUsd: 0,
        batchDiscountUsd,
        totalCostUsd: rawCostUsd,
        volumeTier: tierInfo.tier,
        volumeTierRebateUsd: volumeRebateUsd,
        netCostUsd,
        retailPromptCostUsd: retailTotalCostUsd,
        retailCompletionCostUsd: 0,
        retailTotalCostUsd,
        wholesaleSavingsUsd: totalSavingsUsd,
        cachingSavingsUsd: 0,
        totalSavingsUsd,
        savingsPercentage,
        estimatedEnergyWattHours: Number(((totalPrompt * 0.00004)).toFixed(4)),
        estimatedCarbonGramsCO2e: Number(((totalPrompt * 0.000015)).toFixed(4)),
        executiveSummary: summary
      };
    }

    // 3. LLM & Frontier Reasoning Models
    const totalPrompt = Math.max(0, usage.promptTokens || 0);
    const cachedTokens = Math.min(totalPrompt, Math.max(0, usage.cachedTokens || 0));
    const cacheCreationTokens = Math.min(totalPrompt - cachedTokens, Math.max(0, usage.cacheCreationTokens || 0));
    const nonCachedPromptTokens = Math.max(0, totalPrompt - cachedTokens - cacheCreationTokens);
    
    const completionTokens = Math.max(0, usage.completionTokens || 0);
    const reasoningTokens = Math.min(completionTokens, Math.max(0, usage.reasoningTokens || 0));
    const standardCompletionTokens = Math.max(0, completionTokens - reasoningTokens);
    const totalTokens = totalPrompt + completionTokens;

    // Audio Modality Calculations
    const audioInTokens = usage.audioInputTokens || (usage.audioInputSeconds ? Math.ceil(usage.audioInputSeconds * 25) : 0);
    const audioOutTokens = usage.audioOutputTokens || (usage.audioOutputSeconds ? Math.ceil(usage.audioOutputSeconds * 50) : 0);

    // Active customer rates (per 1M tokens) with safe fallbacks.
    const galxInputRate = spec.inputPricePer1M ?? 1.0;
    const galxCachedRate = spec.cachedInputPricePer1M ?? (galxInputRate * 0.25);
    const galxOutputRate = spec.outputPricePer1M ?? 2.0;

    // GPT-5.6 pricing rules verified against the OpenAI model documentation on
    // 2026-08-27: cache writes cost 1.25x input; requests above 272K input
    // tokens cost 2x input/cached input and 1.5x output for the full request.
    const usesGpt56Pricing = spec.id.startsWith('gpt-5.6-');
    const longContext = usesGpt56Pricing && totalPrompt > 272_000;
    const inputMultiplier = longContext ? 2.0 : 1.0;
    const outputMultiplier = longContext ? 1.5 : 1.0;
    const cacheWriteMultiplier = usesGpt56Pricing ? 1.25 : 1.0;
    const effectiveGalxInputRate = galxInputRate * inputMultiplier;
    const effectiveGalxCachedRate = galxCachedRate * inputMultiplier;
    const effectiveGalxCacheWriteRate = galxInputRate * cacheWriteMultiplier * inputMultiplier;
    const effectiveGalxOutputRate = galxOutputRate * outputMultiplier;

    // Audio rates ($40/1M in, $80/1M out standard)
    const audioInRate = 40.0;
    const audioOutRate = 80.0;

    // Retail List Rates (per 1M tokens)
    const listInputRate = spec.listPricePer1MInput ?? (galxInputRate * 1.33);
    const listOutputRate = spec.listPricePer1MOutput ?? (galxOutputRate * 1.33);

    // Micro-Costs down to 6 decimals (with batch multiplier)
    const promptCostUsd = Number((((nonCachedPromptTokens * effectiveGalxInputRate) / 1_000_000) * batchMultiplier).toFixed(6));
    const cachedCostUsd = Number((((cachedTokens * effectiveGalxCachedRate) / 1_000_000) * batchMultiplier).toFixed(6));
    const cacheCreationCostUsd = Number((((cacheCreationTokens * effectiveGalxCacheWriteRate) / 1_000_000) * batchMultiplier).toFixed(6));
    const completionCostUsd = Number((((standardCompletionTokens * effectiveGalxOutputRate) / 1_000_000) * batchMultiplier).toFixed(6));
    const reasoningCostUsd = Number((((reasoningTokens * effectiveGalxOutputRate) / 1_000_000) * batchMultiplier).toFixed(6));
    const audioCostUsd = Number(((((audioInTokens * audioInRate) + (audioOutTokens * audioOutRate)) / 1_000_000) * batchMultiplier).toFixed(6));

    const standardTotalCostUsd = Number((
      ((nonCachedPromptTokens * effectiveGalxInputRate) +
       (cachedTokens * effectiveGalxCachedRate) +
       (cacheCreationTokens * effectiveGalxCacheWriteRate) +
       (standardCompletionTokens * effectiveGalxOutputRate) +
       (reasoningTokens * effectiveGalxOutputRate) +
       (audioInTokens * audioInRate) +
       (audioOutTokens * audioOutRate)) / 1_000_000
    ).toFixed(6));

    const rawTotalCostUsd = Number((promptCostUsd + cachedCostUsd + cacheCreationCostUsd + completionCostUsd + reasoningCostUsd + audioCostUsd).toFixed(6));
    const batchDiscountUsd = Number(Math.max(0, standardTotalCostUsd - rawTotalCostUsd).toFixed(6));

    // Apply Volume Tier Rebate
    const volumeRebateUsd = Number((rawTotalCostUsd * (tierInfo.additionalRebatePct / 100)).toFixed(6));
    const netCostUsd = Number((rawTotalCostUsd - volumeRebateUsd).toFixed(6));

    // Direct Retail Equivalent Cost
    const effectiveListInputRate = listInputRate * inputMultiplier;
    const effectiveListOutputRate = listOutputRate * outputMultiplier;
    const retailPromptCostUsd = Number(((totalPrompt * effectiveListInputRate) / 1_000_000).toFixed(6));
    const retailCompletionCostUsd = Number(((completionTokens * effectiveListOutputRate) / 1_000_000).toFixed(6));
    const retailTotalCostUsd = Number((retailPromptCostUsd + retailCompletionCostUsd).toFixed(6));

    // Savings Calculation
    const wholesaleSavingsUsd = Number(
      Math.max(0, (retailPromptCostUsd - (promptCostUsd + cacheCreationCostUsd + ((cachedTokens * effectiveGalxInputRate) / 1_000_000))) +
      (retailCompletionCostUsd - (completionCostUsd + reasoningCostUsd))).toFixed(6)
    );
    const cachingSavingsUsd = Number(
      Math.max(0, (cachedTokens * (effectiveGalxInputRate - effectiveGalxCachedRate)) / 1_000_000).toFixed(6)
    );
    const totalSavingsUsd = Number(Math.max(0, retailTotalCostUsd - netCostUsd).toFixed(6));
    const savingsPercentage = retailTotalCostUsd > 0
      ? Number(((totalSavingsUsd / retailTotalCostUsd) * 100).toFixed(1))
      : (spec.discountPercentage ?? 0);

    // Energy & Carbon Calculations (avg ~0.3Wh per 1K reasoning tokens)
    const estimatedEnergyWattHours = Number(((totalTokens / 1000) * 0.35).toFixed(4));
    const estimatedCarbonGramsCO2e = Number(((estimatedEnergyWattHours * 0.40)).toFixed(4));

    // Friendly executive summary
    let summary = cachedTokens > 0
      ? `Processed ${totalTokens.toLocaleString()} tokens (${cachedTokens.toLocaleString()} cached) on ${spec.name} for $${netCostUsd.toFixed(6)} USD. Saved $${totalSavingsUsd.toFixed(6)} USD (${savingsPercentage}% lower than direct list price).`
      : `Processed ${totalTokens.toLocaleString()} tokens on ${spec.name} for $${netCostUsd.toFixed(6)} USD (Saved $${totalSavingsUsd.toFixed(6)} USD vs direct retail).`;

    if (isBatch) {
      summary += ` [Batch API 50% discount active: saved an additional $${batchDiscountUsd.toFixed(6)} USD]`;
    }

    return {
      modelId: spec.id,
      modelName: spec.name,
      category: 'llm',
      serviceTier,
      promptTokens: totalPrompt,
      cachedTokens,
      cacheCreationTokens,
      nonCachedPromptTokens,
      completionTokens,
      reasoningTokens,
      totalTokens,
      audioInputTokens: audioInTokens,
      audioOutputTokens: audioOutTokens,
      promptCostUsd,
      cachedCostUsd,
      cacheCreationCostUsd,
      completionCostUsd,
      reasoningCostUsd,
      audioCostUsd,
      batchDiscountUsd,
      totalCostUsd: rawTotalCostUsd,
      volumeTier: tierInfo.tier,
      volumeTierRebateUsd: volumeRebateUsd,
      netCostUsd,
      retailPromptCostUsd,
      retailCompletionCostUsd,
      retailTotalCostUsd,
      wholesaleSavingsUsd,
      cachingSavingsUsd,
      totalSavingsUsd,
      savingsPercentage,
      estimatedEnergyWattHours,
      estimatedCarbonGramsCO2e,
      executiveSummary: summary
    };
  }

  /**
   * Generates actionable optimization recommendations for a given workload.
   */
  public static recommendOptimizations(
    breakdown: GranularCostBreakdown,
    monthlyQueries: number = 3000
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // 1. Prompt Caching Recommendation
    if (breakdown.promptTokens >= 1024 && breakdown.cachedTokens === 0) {
      const spec = EXCLUSIVE_MODEL_CATALOG.find(model => model.id === breakdown.modelId);
      const inputRate = spec?.inputPricePer1M ?? 0;
      const cachedRate = spec?.cachedInputPricePer1M ?? inputRate;
      const potentialMonthlySavings = Number((((breakdown.promptTokens * Math.max(0, inputRate - cachedRate)) / 1_000_000) * monthlyQueries).toFixed(2));
      if (potentialMonthlySavings > 5) {
        recommendations.push({
          type: 'caching',
          title: 'Preserve a Reusable Prompt Prefix',
          description: `You are sending ~${breakdown.promptTokens} input tokens with 0% cache hits. Keep reusable instructions and tool schemas stable, use the provider's cache controls, and track both cache reads and cache-write tokens before rollout.`,
          estimatedMonthlySavingsUsd: potentialMonthlySavings,
          impactLevel: 'high'
        });
      }
    }

    // 2. Model Right-Sizing
    if (breakdown.modelId === 'gpt-5.6-sol' && breakdown.totalTokens < 1000) {
      const lunaCost = this.calculateCost('gpt-5.6-luna', {
        promptTokens: breakdown.promptTokens,
        completionTokens: breakdown.completionTokens
      });
      const savingsPerQuery = breakdown.netCostUsd - lunaCost.netCostUsd;
      const monthlySavings = Number((savingsPerQuery * monthlyQueries).toFixed(2));
      if (monthlySavings > 10) {
        recommendations.push({
          type: 'model_selection',
          title: 'Route Lightweight Tasks to GPT-5.6 Luna',
          description: `This workload has a lower-cost Luna candidate. Validate it on a representative regression set and production shadow sample before changing the route.`,
          estimatedMonthlySavingsUsd: monthlySavings,
          impactLevel: 'medium'
        });
      }
    }

    // 3. Batch API for Background Jobs
    if (breakdown.serviceTier === 'standard' && monthlyQueries > 1000) {
      const batchMonthlySavings = Number(((breakdown.netCostUsd * 0.5) * monthlyQueries).toFixed(2));
      recommendations.push({
        type: 'batch_mode',
        title: 'Use Batch API for Non-Interactive Workloads',
        description: `Run background evaluations, synthetic data generation, and offline processing with 50% discount via serviceTier='batch'.`,
        estimatedMonthlySavingsUsd: batchMonthlySavings,
        impactLevel: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Converts a USD amount into target international currency.
   */
  public static convertCurrency(
    amountUsd: number,
    targetCurrency: SupportedCurrency = 'USD'
  ): { amount: number; formatted: string; currency: SupportedCurrency; fxRate: number } {
    const fx = CURRENCY_FX_RATES[targetCurrency] || CURRENCY_FX_RATES.USD;
    const converted = Number((amountUsd * fx.rate).toFixed(fx.decimals));
    const formatted = `${fx.symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: fx.decimals,
      maximumFractionDigits: fx.decimals
    })}`;

    return {
      amount: converted,
      formatted,
      currency: targetCurrency,
      fxRate: fx.rate
    };
  }

  /**
   * Returns human-readable pricing summary with per-1K and per-1M token rates
   * suitable for friendly UI tables and non-technical cards.
   */
  public static getPricingSummary(modelSpecOrId: ModelSpecItem | string): ModelPricingSummary {
    const spec = typeof modelSpecOrId === 'string'
      ? (EXCLUSIVE_MODEL_CATALOG.find(m => m.id === modelSpecOrId) || EXCLUSIVE_MODEL_CATALOG[0])
      : modelSpecOrId;

    const inputRate = spec.inputPricePer1M ?? 1.0;
    const outputRate = spec.outputPricePer1M ?? 2.0;
    const cachedRate = spec.cachedInputPricePer1M ?? (inputRate * 0.25);
    const listInput = spec.listPricePer1MInput ?? (inputRate * 1.33);
    const listOutput = spec.listPricePer1MOutput ?? (outputRate * 1.33);
    const discountPct = spec.discountPercentage ?? 0;

    let formattedRateDisplay = `$${inputRate.toFixed(2)} in / $${outputRate.toFixed(2)} out per 1M`;
    if (spec.category === 'image') {
      formattedRateDisplay = `$${inputRate.toFixed(3)} / image`;
    } else if (spec.category === 'embedding') {
      formattedRateDisplay = `$${inputRate.toFixed(3)} / 1M tokens`;
    }

    return {
      modelId: spec.id,
      name: spec.name,
      provider: spec.provider,
      category: spec.category,
      inputPricePer1M: inputRate,
      outputPricePer1M: outputRate,
      cachedInputPricePer1M: cachedRate,
      listPricePer1MInput: listInput,
      listPricePer1MOutput: listOutput,
      discountPercentage: discountPct,
      promptPricePer1k: Number((inputRate / 1000).toFixed(6)),
      completionPricePer1k: Number((outputRate / 1000).toFixed(6)),
      cachedPricePer1k: Number((cachedRate / 1000).toFixed(6)),
      batchPricePer1MInput: Number((inputRate * 0.5).toFixed(4)),
      batchPricePer1MOutput: Number((outputRate * 0.5).toFixed(4)),
      formattedRateDisplay
    };
  }

  /**
   * Compares multiple models side-by-side for a specific token workload.
   */
  public static compareModels(
    modelIds: string[],
    usage: TokenUsageInput
  ): GranularCostBreakdown[] {
    return modelIds.map(id => this.calculateCost(id, usage));
  }

  /**
   * Formats a micro-cost amount for display with adaptive decimal places.
   * e.g. $0.007750, $0.15, $14.20
   */
  public static formatCost(amountUsd: number): string {
    const abs = Math.abs(amountUsd);
    if (abs === 0) return '$0.00';
    if (abs < 0.01) return `$${abs.toFixed(6)}`;
    if (abs < 1.0) return `$${abs.toFixed(4)}`;
    return `$${abs.toFixed(2)}`;
  }

  /**
   * Formats token counts compactly (e.g. 1.2K, 4.8M, 120.5M).
   */
  public static formatTokensCompact(tokens: number): string {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`;
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(1)}K`;
    }
    return tokens.toLocaleString();
  }

  /**
   * Estimates token count from raw text based on content modality.
   */
  public static estimateTokensFromText(
    text: string,
    modality: 'prose' | 'code' | 'json' = 'prose'
  ): number {
    if (!text || text.length === 0) return 0;
    const divisor = modality === 'code' ? 3.5 : modality === 'json' ? 3.0 : 4.0;
    return Math.max(1, Math.ceil(text.length / divisor));
  }

  /**
   * Projects remaining wallet runway (in days and request capacity)
   * given a balance and daily query volume.
   */
  public static projectRunway(params: {
    balanceUsd: number;
    dailyRequests: number;
    avgPromptTokens?: number;
    avgCompletionTokens?: number;
    avgCachedPct?: number;
    modelId?: string;
  }): {
    estimatedDays: number;
    dailyCostUsd: number;
    monthlyCostUsd: number;
    totalRequestCapacity: number;
    costPer1kRequestsUsd: number;
    monthlySavingsUsd: number;
  } {
    const {
      balanceUsd,
      dailyRequests = 100,
      avgPromptTokens = 1500,
      avgCompletionTokens = 400,
      avgCachedPct = 40,
      modelId = 'gpt-5.6-sol'
    } = params;

    const cachedTokens = Math.round((avgPromptTokens * avgCachedPct) / 100);
    const costPerReq = this.calculateCost(modelId, {
      promptTokens: avgPromptTokens,
      completionTokens: avgCompletionTokens,
      cachedTokens
    });

    const dailyCostUsd = Number((costPerReq.netCostUsd * Math.max(1, dailyRequests)).toFixed(4));
    const monthlyCostUsd = Number((dailyCostUsd * 30).toFixed(2));
    const costPer1kRequestsUsd = Number((costPerReq.netCostUsd * 1000).toFixed(4));
    const estimatedDays = dailyCostUsd > 0 ? Math.floor(balanceUsd / dailyCostUsd) : 999;
    const totalRequestCapacity = costPerReq.netCostUsd > 0
      ? Math.floor(balanceUsd / costPerReq.netCostUsd)
      : 999999;
    const monthlySavingsUsd = Number((costPerReq.totalSavingsUsd * Math.max(1, dailyRequests) * 30).toFixed(2));

    return {
      estimatedDays,
      dailyCostUsd,
      monthlyCostUsd,
      totalRequestCapacity,
      costPer1kRequestsUsd,
      monthlySavingsUsd
    };
  }
}
