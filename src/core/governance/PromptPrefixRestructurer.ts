/**
 * GALXAI Prompt Prefix Restructurer
 * 
 * Analyzes prompt structures, detects volatile tokens (timestamps, UUIDs, trace IDs)
 * prepended at prompt head that destroy prompt caching, and reorders the prompt:
 * [Static System & Schema Context (Cache Protected)] + [Dynamic Ephemeral Metadata].
 * 
 * Unlocks the 75% compound prompt caching rebate on OpenAI models (>1,024 tokens).
 */

export interface PrefixRestructureResult {
  wasRestructured: boolean;
  detectedVolatileHeaders: string[];
  originalPrefixTokenEstimate: number;
  cacheEligibleTokens: number;
  restructuredPrompt: string;
}

const VOLATILE_PATTERNS = [
  /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/g, // ISO Timestamps
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, // UUIDs
  /\b(?:req|trace|span|corr)_[a-zA-Z0-9_-]{16,}\b/g, // Request/Trace IDs
  /\b(?:Current Time|Timestamp|Epoch|Nonce):\s*[^\n]+/gi, // Time headers
];

export class PromptPrefixRestructurer {
  /**
   * Restructures a system or user prompt to maximize prompt cache hits (>1,024 tokens)
   */
  public static restructure(prompt: string): PrefixRestructureResult {
    if (!prompt || prompt.length < 100) {
      return {
        wasRestructured: false,
        detectedVolatileHeaders: [],
        originalPrefixTokenEstimate: Math.ceil(prompt.length / 4),
        cacheEligibleTokens: 0,
        restructuredPrompt: prompt,
      };
    }

    const lines = prompt.split('\n');
    const volatileLines: string[] = [];
    const staticLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let isVolatile = false;

      // Check if line contains volatile time/UUID stamps
      for (const pattern of VOLATILE_PATTERNS) {
        if (pattern.test(line)) {
          isVolatile = true;
          break;
        }
      }

      // If volatile and near the top of the prompt (first 10 lines), isolate it
      if (isVolatile && i < 10) {
        volatileLines.push(line);
      } else {
        staticLines.push(line);
      }
    }

    // Only restructure if volatile lines were found near the head
    if (volatileLines.length > 0) {
      const restructuredPrompt = `${staticLines.join('\n')}\n\n[Dynamic Execution Context]\n${volatileLines.join('\n')}`;
      const cacheEligibleTokens = Math.ceil(staticLines.join('\n').length / 4);

      return {
        wasRestructured: true,
        detectedVolatileHeaders: volatileLines,
        originalPrefixTokenEstimate: Math.ceil(prompt.length / 4),
        cacheEligibleTokens,
        restructuredPrompt,
      };
    }

    return {
      wasRestructured: false,
      detectedVolatileHeaders: [],
      originalPrefixTokenEstimate: Math.ceil(prompt.length / 4),
      cacheEligibleTokens: Math.ceil(prompt.length / 4),
      restructuredPrompt: prompt,
    };
  }
}
