/**
 * GALXAI Agent Recursion Circuit Breaker
 * 
 * Tracks conversational turns and detects cyclic error loops across autonomous
 * agent swarms (Devin, Claude Code, Cursor Composer, auto-test loops).
 * Halts runaway loops exceeding turn limits or repeating identical tool failures.
 */

import { createHash } from 'node:crypto';

export interface CircuitBreakerState {
  sessionId: string;
  turnCount: number;
  maxTurnsAllowed: number;
  isTripped: boolean;
  tripReason?: string;
  lastTurnHashes: string[];
}

export interface CircuitBreakerEvaluation {
  shouldHalt: boolean;
  currentTurn: number;
  maxTurns: number;
  reason?: 'MAX_TURNS_EXCEEDED' | 'CYCLIC_ERROR_LOOP_DETECTED' | 'TOKEN_EXPLOSION_CLAMP';
  remediationMessage?: string;
}

export class AgentCircuitBreaker {
  private static sessionCache = new Map<string, CircuitBreakerState>();

  /**
   * Evaluates an incoming agent session turn against circuit breaker thresholds
   */
  public static evaluateSession(
    sessionId: string,
    messages: Array<{ role: string; content: string }>,
    maxTurnsAllowed = 12
  ): CircuitBreakerEvaluation {
    if (!sessionId) {
      return { shouldHalt: false, currentTurn: messages.length, maxTurns: maxTurnsAllowed };
    }

    let state = this.sessionCache.get(sessionId);
    if (!state) {
      state = {
        sessionId,
        turnCount: 0,
        maxTurnsAllowed,
        isTripped: false,
        lastTurnHashes: [],
      };
      this.sessionCache.set(sessionId, state);
    }

    state.turnCount++;

    // 1. Check absolute turn limit
    if (state.turnCount > maxTurnsAllowed) {
      state.isTripped = true;
      state.tripReason = `Turn limit exceeded (${state.turnCount}/${maxTurnsAllowed})`;
      return {
        shouldHalt: true,
        currentTurn: state.turnCount,
        maxTurns: maxTurnsAllowed,
        reason: 'MAX_TURNS_EXCEEDED',
        remediationMessage: `Agent recursion circuit breaker tripped: Exceeded max allowed turns (${maxTurnsAllowed}). Halting loop to prevent unmanaged spend.`,
      };
    }

    // 2. Check for cyclic repetitive turns (e.g. agent repeating exact same tool call error)
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1].content || '';
      const turnHash = createHash('md5').update(lastMsg.slice(0, 500)).digest('hex');
      
      const duplicateCount = state.lastTurnHashes.filter((h) => h === turnHash).length;
      state.lastTurnHashes.push(turnHash);
      if (state.lastTurnHashes.length > 6) state.lastTurnHashes.shift();

      if (duplicateCount >= 3) {
        state.isTripped = true;
        state.tripReason = 'Cyclic repetitive tool error pattern detected';
        return {
          shouldHalt: true,
          currentTurn: state.turnCount,
          maxTurns: maxTurnsAllowed,
          reason: 'CYCLIC_ERROR_LOOP_DETECTED',
          remediationMessage: 'Agent recursion circuit breaker tripped: Cyclic repetitive error detected across 3 turns. Halting agent loop.',
        };
      }
    }

    return {
      shouldHalt: false,
      currentTurn: state.turnCount,
      maxTurns: maxTurnsAllowed,
    };
  }

  /**
   * Resets session state upon successful completion or explicit user override
   */
  public static resetSession(sessionId: string): void {
    this.sessionCache.delete(sessionId);
  }
}
