/**
 * GALXAI Developer SDK: Token Counter & Context Window Optimizer
 */

import type { ChatMessage } from '../core/contracts/GalxContracts';

export class TokenOptimizer {
  /**
   * Fast BPE token count estimation heuristic for raw text.
   * Average ~4 chars per token for English text and code.
   */
  public static estimateTokens(text: string): number {
    if (!text) return 0;
    // Word-based heuristic accounting for punctuation and whitespace
    const words = text.trim().split(/\s+/).length;
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
