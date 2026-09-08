/**
 * GALXAI Developer SDK: Token Counter & Context Window Optimizer
 * Handles token estimation, prompt cache prefix optimization (Anthropic/OpenAI), and intelligent truncation.
 */

import type { ChatMessage } from '../core/contracts/GalxContracts';
import { ModelCatalog } from '../core/router/PublicModelCatalog';

export class TokenOptimizer {
  /**
   * Fast BPE token count estimation heuristic for raw text.
   * Average ~3.8 chars per token for English text and code.
   */
  public static estimateTokens(text: string): number {
    if (!text) return 0;
    const chars = text.length;
    return Math.max(1, Math.ceil(chars / 3.8));
  }

  /**
   * Estimates token consumption for an array of chat messages.
   */
  public static estimateMessagesTokens(messages: ChatMessage[]): number {
    let count = 3; // Baseline conversation framing tokens
    for (const m of messages) {
      count += 4; // Per-message metadata overhead
      if (typeof m.content === 'string') {
        count += TokenOptimizer.estimateTokens(m.content);
      } else if (Array.isArray(m.content)) {
        for (const part of m.content) {
          if (part.type === 'text' && part.text) {
            count += TokenOptimizer.estimateTokens(part.text);
          } else if (part.type === 'image_url') {
            count += 765; // Standard high-res vision tile cost
          }
        }
      }
    }
    return count;
  }

  /**
   * Automatically injects Anthropic / OpenAI prompt caching metadata into large context blocks.
   */
  public static applyPromptCaching(messages: ChatMessage[], minTokensThreshold = 1024): ChatMessage[] {
    return messages.map((msg, idx) => {
      if (msg.role === 'system' || (idx === 0 && typeof msg.content === 'string' && TokenOptimizer.estimateTokens(msg.content) >= minTokensThreshold)) {
        if (typeof msg.content === 'string') {
          return {
            ...msg,
            content: [
              {
                type: 'text',
                text: msg.content,
                cache_control: { type: 'ephemeral' }
              }
            ] as any
          };
        }
      }
      return msg;
    });
  }

  /**
   * Calculates exact dollar savings from pooled wholesale rates and prompt caching.
   */
  public static calculateSavings(
    promptTokens: number,
    completionTokens: number,
    modelId = 'gpt-5.6-sol'
  ): { retailCostUsd: number; galxCostUsd: number; savingsUsd: number; discountPercentage: number } {
    const spec = ModelCatalog.resolveModel(modelId);
    const inputListPrice = spec.listPricePer1MInput ?? 5.0;
    const outputListPrice = spec.listPricePer1MOutput ?? 15.0;
    const inputPrice = spec.inputPricePer1M ?? 3.75;
    const outputPrice = spec.outputPricePer1M ?? 11.25;
    const discountPercentage = spec.discountPercentage ?? 25;

    const retailCostUsd = (promptTokens * inputListPrice + completionTokens * outputListPrice) / 1_000_000;
    const galxCostUsd = (promptTokens * inputPrice + completionTokens * outputPrice) / 1_000_000;
    const savingsUsd = Math.max(0, retailCostUsd - galxCostUsd);

    return {
      retailCostUsd: Number(retailCostUsd.toFixed(6)),
      galxCostUsd: Number(galxCostUsd.toFixed(6)),
      savingsUsd: Number(savingsUsd.toFixed(6)),
      discountPercentage
    };
  }

  /**
   * Intelligently truncates conversation history to fit within a token limit.
   * Preserves system instructions and the most recent user/assistant turns while pruning older intermediate turns.
   */
  public static truncateToFit(
    messages: ChatMessage[],
    maxTokens: number,
    strategy: 'preserve_system_and_recent' | 'fifo_prune' = 'preserve_system_and_recent'
  ): ChatMessage[] {
    if (TokenOptimizer.estimateMessagesTokens(messages) <= maxTokens) {
      return [...messages];
    }

    if (strategy === 'preserve_system_and_recent') {
      const systemMessages = messages.filter(m => m.role === 'system');
      const nonSystem = messages.filter(m => m.role !== 'system');

      let currentTokens = TokenOptimizer.estimateMessagesTokens(systemMessages);
      const keptNonSystem: ChatMessage[] = [];

      // Iterate backwards from most recent message
      for (let i = nonSystem.length - 1; i >= 0; i--) {
        const msg = nonSystem[i];
        const msgTokens = TokenOptimizer.estimateMessagesTokens([msg]);
        if (currentTokens + msgTokens <= maxTokens) {
          keptNonSystem.unshift(msg);
          currentTokens += msgTokens;
        } else {
          break;
        }
      }

      return [...systemMessages, ...keptNonSystem];
    }

    // Default FIFO prune
    const copy = [...messages];
    while (copy.length > 1 && TokenOptimizer.estimateMessagesTokens(copy) > maxTokens) {
      copy.shift();
    }
    return copy;
  }
}

export function estimateTokens(text: string): number {
  return TokenOptimizer.estimateTokens(text);
}

export function truncateToFit(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
  return TokenOptimizer.truncateToFit(messages, maxTokens);
}
