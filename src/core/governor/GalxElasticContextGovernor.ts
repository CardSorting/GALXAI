/**
 * GALXAI: Elastic Context & High-Velocity Multi-Page Document Governor
 * Dynamically shapes context windows up to 1,050,000 tokens (thousands of pages)
 * based on model capacity and seat quota headroom with zero arbitrary token clamping.
 */

import { ModelCatalog, ModelSpecItem } from '../router/ModelCatalog';
import type { SeatTierEntitlement } from '../subscription/GalxSeatTierEngine';

export interface ElasticContextPlan {
  modelId: string;
  modelName: string;
  contextWindowTokens: number;
  maxOutputTokens: number;
  allocatedMaxTokens: number;
  estimatedPromptTokens: number;
  estimatedPages: number;
  fitsInContext: boolean;
  promptCacheOptimized: boolean;
  tier: string;
  safetyMarginTokens: number;
  availableOutputTokens: number;
  totalAllocatedTokens: number;
  outputWasClamped: boolean;
}

const TIER_CONTEXT_LIMITS: Record<SeatTierEntitlement['tier'], number> = {
  developer: 128_000,
  'small-business': 512_000,
  enterprise: 1_050_000,
  apex: 1_050_000,
};

const TIER_OUTPUT_LIMITS: Record<SeatTierEntitlement['tier'], number> = {
  developer: 16_384,
  'small-business': 32_768,
  enterprise: 65_536,
  apex: 128_000,
};

const MIN_OUTPUT_TOKENS = 1;
const MAX_SAFETY_MARGIN_TOKENS = 2_048;

export class GalxElasticContextGovernor {
  private static instance: GalxElasticContextGovernor;

  private constructor() {}

  public static getInstance(): GalxElasticContextGovernor {
    if (!GalxElasticContextGovernor.instance) {
      GalxElasticContextGovernor.instance = new GalxElasticContextGovernor();
    }
    return GalxElasticContextGovernor.instance;
  }

  /**
   * Estimates token consumption from messages including large multi-page attachments, codebases, and images.
   */
  public estimateMessageTokens(messages: Array<{ role: string; content: any }>): number {
    let totalChars = 0;
    let imageCount = 0;

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        totalChars += msg.content.length;
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text' && part.text) {
            totalChars += String(part.text).length;
          } else if (part.type === 'image_url') {
            imageCount++;
          }
        }
      } else if (msg.content) {
        try {
          totalChars += JSON.stringify(msg.content).length;
        } catch {
          totalChars += String(msg.content).length;
        }
      }

      const toolCalls = (msg as { tool_calls?: unknown }).tool_calls;
      if (toolCalls) {
        try {
          totalChars += JSON.stringify(toolCalls).length;
        } catch {
          totalChars += String(toolCalls).length;
        }
      }
    }

    // ~3.8 characters per token average + 85 tokens per image tile + 4 tokens per message envelope
    const textTokens = Math.ceil(totalChars / 3.8);
    const imageTokens = imageCount * 85;
    const envelopeTokens = messages.length * 4;

    return Math.max(1, textTokens + imageTokens + envelopeTokens);
  }

  /**
   * Estimates physical page count for large multi-page document attachments.
   * Standard density: ~2,200 characters per single-spaced page.
   */
  public estimatePages(textCharCount: number): number {
    if (!Number.isFinite(textCharCount) || textCharCount <= 0) return 0;
    return Math.ceil(textCharCount / 2200);
  }

  public resolveTierContextLimit(modelId: string, entitlement: SeatTierEntitlement): number {
    const modelSpec = ModelCatalog.resolveModel(modelId) || ModelCatalog.resolveModel('gpt-5.6-sol')!;
    const modelLimit = Math.max(1, modelSpec.contextWindowTokens || 1_050_000);
    return Math.min(modelLimit, TIER_CONTEXT_LIMITS[entitlement.tier] || TIER_CONTEXT_LIMITS.developer);
  }

  /**
   * Dynamically resolves elastic context window and max output tokens.
   * Eliminates static clamps and allows enterprise users to ingest hundreds/thousands of pages seamlessly.
   */
  public resolveElasticContext(params: {
    modelId: string;
    requestedMaxTokens?: number;
    messages: Array<{ role: string; content: any }>;
    entitlement: SeatTierEntitlement;
  }): ElasticContextPlan {
    const { modelId, requestedMaxTokens, messages, entitlement } = params;
    const modelSpec = ModelCatalog.resolveModel(modelId) || ModelCatalog.resolveModel('gpt-5.6-sol')!;

    const estimatedPromptTokens = this.estimateMessageTokens(messages);
    const totalChars = messages.reduce((acc, m) => {
      if (typeof m.content === 'string') return acc + m.content.length;
      if (Array.isArray(m.content)) {
        return acc + m.content.reduce((partAcc, part) => partAcc + (typeof part?.text === 'string' ? part.text.length : 0), 0);
      }
      return acc;
    }, 0);
    const estimatedPages = this.estimatePages(totalChars);

    const contextLimit = this.resolveTierContextLimit(modelSpec.id, entitlement);
    const modelMaxOutput = modelSpec.maxOutputTokens || 128_000;

    // Reserve a small model-envelope margin for hidden formatting and tokenizer variance.
    const safetyMarginTokens = Math.min(
      MAX_SAFETY_MARGIN_TOKENS,
      Math.max(64, Math.ceil(estimatedPromptTokens * 0.002))
    );
    const availableOutputTokens = Math.max(
      0,
      contextLimit - estimatedPromptTokens - safetyMarginTokens
    );
    const fitsInContext = availableOutputTokens >= MIN_OUTPUT_TOKENS;

    // Determine Dynamic Allocated Output Tokens
    let allocatedMaxTokens: number;

    const requestedOutput = requestedMaxTokens !== undefined && Number.isFinite(requestedMaxTokens)
      ? Math.floor(requestedMaxTokens)
      : undefined;
    const tierOutputLimit = Math.min(
      modelMaxOutput,
      TIER_OUTPUT_LIMITS[entitlement.tier] || TIER_OUTPUT_LIMITS.developer,
      Math.max(1, Math.floor(entitlement.maxTokensAllowed || Number.MAX_SAFE_INTEGER))
    );

    if (requestedOutput !== undefined && requestedOutput > 0) {
      allocatedMaxTokens = Math.min(requestedOutput, tierOutputLimit, availableOutputTokens);
    } else {
      allocatedMaxTokens = Math.min(tierOutputLimit, availableOutputTokens);
    }

    allocatedMaxTokens = fitsInContext
      ? Math.max(MIN_OUTPUT_TOKENS, Math.floor(allocatedMaxTokens))
      : 0;

    const outputWasClamped = requestedOutput !== undefined && allocatedMaxTokens < requestedOutput;

    // Prompt cache optimization applies on large document prompts (> 1,024 tokens)
    const promptCacheOptimized = estimatedPromptTokens >= 1024;

    return {
      modelId: modelSpec.id,
      modelName: modelSpec.name,
      contextWindowTokens: contextLimit,
      maxOutputTokens: modelMaxOutput,
      allocatedMaxTokens,
      estimatedPromptTokens,
      estimatedPages,
      fitsInContext,
      promptCacheOptimized,
      tier: entitlement.tier,
      safetyMarginTokens,
      availableOutputTokens,
      totalAllocatedTokens: estimatedPromptTokens + allocatedMaxTokens + safetyMarginTokens,
      outputWasClamped,
    };
  }
}

export const galxElasticContextGovernor = GalxElasticContextGovernor.getInstance();
