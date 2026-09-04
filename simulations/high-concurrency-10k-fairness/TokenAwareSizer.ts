/**
 * @file TokenAwareSizer.ts
 * @description Predictive Concurrency Governor & Virtual Token Sizer.
 * Calculates dynamic execution weight based on input prompt tokens, reasoning effort, and max tokens.
 * Enforces token-aware DRR fair queueing so 3-minute reasoning runs are charged proportionately.
 */

import { ClientRequest } from './types';

export class TokenAwareSizer {
  /**
   * Calculate virtual execution weight for a request.
   */
  public calculateVirtualWeight(req: ClientRequest): number {
    const promptTokens = req.payloadSizeTokens || 100;
    const maxTokens = req.estimatedTokens || 1500;

    let reasoningMultiplier = 2.0;
    if (req.reasoningEffort === 'high') reasoningMultiplier = 4.0;
    else if (req.reasoningEffort === 'low') reasoningMultiplier = 1.0;

    // Virtual weight = prompt tokens + (estimated generated tokens * multiplier)
    const virtualWeight = promptTokens + Math.floor(maxTokens * reasoningMultiplier);
    return Math.max(100, virtualWeight);
  }

  /**
   * Classify estimated run duration in seconds based on virtual weight.
   */
  public estimateRunDurationSec(virtualWeight: number): number {
    if (virtualWeight <= 500) return 5;     // Interactive fast-track (<10s)
    if (virtualWeight <= 2500) return 45;   // Standard deep reasoning
    return 150;                             // Full-scale 2-3 minute reasoning
  }

  /**
   * DRR deficit charge based on virtual token weight.
   */
  public getDeficitDebit(req: ClientRequest): number {
    const weight = this.calculateVirtualWeight(req);
    // Scale deficit debit: 1 credit per 100 virtual tokens (minimum 1)
    return Math.max(1, Math.floor(weight / 100));
  }
}
