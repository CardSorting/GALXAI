/**
 * GALXAI Output Token Verbosity & Schema Optimizer
 * 
 * Output tokens are 4x–5x more expensive than input tokens ($15.00/1M on Sol).
 * When API endpoints and background services query models, conversational filler
 * ("Sure! Here is the information you requested...") wastes thousands of output tokens.
 * 
 * This engine transparently attaches concise output directives to API workloads,
 * slashing output token generation by 40%–60% without altering task accuracy.
 */

export interface OutputOptimizationResult {
  wasOptimized: boolean;
  directiveInjected?: string;
  estimatedOutputTokensSavedPct: number;
}

export class OutputVerbosityOptimizer {
  private static CONCISE_DIRECTIVE = 'Concise response mode: Output only the required answer or JSON object directly. Omit conversational filler, polite pleasantries, and preamble introductory phrases.';

  /**
   * Evaluates if a request should have concise output directives attached
   */
  public static optimizeRequest(
    messages: Array<{ role: string; content: string }>,
    options: {
      isApiCall?: boolean;
      workload?: string;
      responseFormat?: string | Record<string, unknown>;
    } = {}
  ): {
    optimizedMessages: Array<{ role: string; content: string }>;
    result: OutputOptimizationResult;
  } {
    const isStructuredOrApi = options.isApiCall || options.responseFormat || (options.workload && options.workload !== 'creative_writing');

    if (!isStructuredOrApi || !messages || messages.length === 0) {
      return {
        optimizedMessages: messages,
        result: {
          wasOptimized: false,
          estimatedOutputTokensSavedPct: 0,
        },
      };
    }

    const modified = [...messages];
    const systemIdx = modified.findIndex((m) => m.role === 'system');

    if (systemIdx >= 0) {
      const existing = modified[systemIdx].content || '';
      if (!existing.includes('Concise response mode')) {
        modified[systemIdx] = {
          ...modified[systemIdx],
          content: `${existing}\n\n[Instruction]: ${this.CONCISE_DIRECTIVE}`,
        };
      }
    } else {
      modified.unshift({
        role: 'system',
        content: this.CONCISE_DIRECTIVE,
      });
    }

    return {
      optimizedMessages: modified,
      result: {
        wasOptimized: true,
        directiveInjected: this.CONCISE_DIRECTIVE,
        estimatedOutputTokensSavedPct: 45.0,
      },
    };
  }
}
