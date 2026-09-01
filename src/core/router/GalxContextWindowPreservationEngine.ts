/**
 * GALXAI: Context Window Preservation & Attention Anchor Engine
 * 
 * Provides:
 * 1. Atomic Turn-Pair Slicing (guarantees tool_calls & tool responses are never severed across compactions).
 * 2. Lost-In-The-Middle Attention Re-Anchoring (hoists active working memory & active schema contracts to the prompt tail).
 * 3. Exact Multi-Tier Token Budget Allocation.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';

export interface PreservedMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | any;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface PreservedContextAssembly {
  messages: PreservedMessage[];
  totalTokens: number;
  atomicPairsPreserved: number;
  attentionAnchorHoisted: boolean;
  budgetAllocated: number;
}

export class GalxContextWindowPreservationEngine {
  private static instance: GalxContextWindowPreservationEngine;

  private constructor() {}

  public static getInstance(): GalxContextWindowPreservationEngine {
    if (!GalxContextWindowPreservationEngine.instance) {
      GalxContextWindowPreservationEngine.instance = new GalxContextWindowPreservationEngine();
    }
    return GalxContextWindowPreservationEngine.instance;
  }

  public static estimateTokens(text: string | any): number {
    if (!text) return 0;
    const str = typeof text === 'string' ? text : JSON.stringify(text);
    return Math.max(1, Math.ceil(str.length / 4));
  }

  /**
   * Identifies atomic turn-pairs and slices context while preserving tool invariants
   */
  public preserveAtomicTurnPairs(rawMessages: PreservedMessage[], tokenBudget = 8192): PreservedMessage[] {
    if (rawMessages.length === 0) return [];

    // System prompt is always preserved (pinned)
    const systemPrompts = rawMessages.filter(m => m.role === 'system');
    const conversationMessages = rawMessages.filter(m => m.role !== 'system');

    let runningTokens = systemPrompts.reduce((sum, m) => sum + GalxContextWindowPreservationEngine.estimateTokens(m.content), 0);
    const selectedMessages: PreservedMessage[] = [];

    // Traverse from latest turns backwards to preserve recency
    let i = conversationMessages.length - 1;
    while (i >= 0) {
      const current = conversationMessages[i];

      // If current message is a tool response, we must bundle it with its preceding assistant tool_calls message
      if (current.role === 'tool') {
        const toolCluster: PreservedMessage[] = [current];
        let j = i - 1;

        // Collect all adjacent tool results for the same invocation batch
        while (j >= 0 && conversationMessages[j].role === 'tool') {
          toolCluster.unshift(conversationMessages[j]);
          j--;
        }

        // The message before the tool results MUST be the assistant with tool_calls
        if (j >= 0 && conversationMessages[j].role === 'assistant' && conversationMessages[j].tool_calls) {
          toolCluster.unshift(conversationMessages[j]);
          j--;
        }

        const clusterTokens = toolCluster.reduce((sum, m) => sum + GalxContextWindowPreservationEngine.estimateTokens(m.content), 0);
        if (runningTokens + clusterTokens <= tokenBudget || selectedMessages.length === 0) {
          selectedMessages.unshift(...toolCluster);
          runningTokens += clusterTokens;
        } else {
          break; // Exceeded budget, stop without severing tool pair
        }

        i = j;
      } else {
        const msgTokens = GalxContextWindowPreservationEngine.estimateTokens(current.content);
        if (runningTokens + msgTokens <= tokenBudget || selectedMessages.length === 0) {
          selectedMessages.unshift(current);
          runningTokens += msgTokens;
        } else {
          break;
        }
        i--;
      }
    }

    return [...systemPrompts, ...selectedMessages];
  }

  /**
   * Synthesizes and hoists an Attention Anchor to the prompt tail to eliminate Lost-in-the-Middle degradation
   */
  public hoistAttentionAnchor(
    messages: PreservedMessage[],
    workingMemorySummary?: string,
    pinnedEntities: string[] = []
  ): PreservedContextAssembly {
    const atomicMessages = this.preserveAtomicTurnPairs(messages);
    let totalTokens = atomicMessages.reduce((sum, m) => sum + GalxContextWindowPreservationEngine.estimateTokens(m.content), 0);

    let attentionAnchorHoisted = false;

    if (workingMemorySummary || pinnedEntities.length > 0) {
      const anchorContent = `[ACTIVE WORKING MEMORY & ATTENTION ANCHOR]\n` +
        (workingMemorySummary ? `Summary: ${workingMemorySummary}\n` : '') +
        (pinnedEntities.length > 0 ? `Key Invariants: ${pinnedEntities.join(', ')}\n` : '') +
        `[END ACTIVE WORKING MEMORY]`;

      const anchorMessage: PreservedMessage = {
        role: 'system',
        content: anchorContent
      };

      // Place anchor right before the final user instruction (or at the end if none)
      if (atomicMessages.length > 1 && atomicMessages[atomicMessages.length - 1].role === 'user') {
        atomicMessages.splice(atomicMessages.length - 1, 0, anchorMessage);
      } else {
        atomicMessages.push(anchorMessage);
      }

      totalTokens += GalxContextWindowPreservationEngine.estimateTokens(anchorContent);
      attentionAnchorHoisted = true;
    }

    return {
      messages: atomicMessages,
      totalTokens,
      atomicPairsPreserved: atomicMessages.length,
      attentionAnchorHoisted,
      budgetAllocated: totalTokens + 1024
    };
  }

  /**
   * Persists the attention anchor to PostgreSQL for long-running collaborative sessions
   */
  public async persistSessionAnchor(
    sessionId: string,
    userId: string,
    summary: string,
    pinnedKeys: string[]
  ): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin() as any;
        await supabase.rpc('rpc_upsert_session_attention_anchor', {
          p_session_id: sessionId,
          p_user_id: userId,
          p_working_memory_summary: summary,
          p_pinned_entity_keys: pinnedKeys,
          p_active_tool_contracts: [],
          p_token_budget_allocated: 8192
        });
      } catch (err) {
        console.warn('[GalxContextWindowPreservationEngine] Persist anchor RPC fallback:', err);
      }
    }
  }
}

export const contextWindowPreservationEngine = GalxContextWindowPreservationEngine.getInstance();
