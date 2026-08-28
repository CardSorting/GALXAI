/**
 * GALXAI BroccoliDB Architecture & Governance Invariant Compactor
 * 
 * Epistemic Representation Selection:
 * Specifically engineered to preserve active system invariants, cryptographic
 * requirements, and binding runtime constraints while stripping away
 * archival minutes, superseded ADRs, stale RFCs, and governance ceremony.
 */

export interface ArchitectureInvariantDigest {
  activeInvariants: string[];
  prunedHistoricalSections: number;
  compactedText: string;
  originalTokens: number;
  compactedTokens: number;
  savingsPercentage: number;
}

export class BroccoliArchitectureInvariantCompactor {
  public static readonly DOMAIN = 'ArchitectureGovernance';

  /**
   * Transforms institutionally noisy repo context into action-safe code invariants.
   */
  public static compact(rawText: string): ArchitectureInvariantDigest {
    if (!rawText || typeof rawText !== 'string') {
      return {
        activeInvariants: [],
        prunedHistoricalSections: 0,
        compactedText: '',
        originalTokens: 0,
        compactedTokens: 0,
        savingsPercentage: 0
      };
    }

    const originalTokens = Math.round(rawText.length / 4);
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    
    const activeInvariants: string[] = [];
    let prunedSections = 0;
    let inActiveSection = true;

    for (const line of lines) {
      // Detect institutional noise headers
      if (
        /INSTITUTIONAL GOVERNANCE|ARCHIVAL RECORDS|MINUTES OF THE|HISTORICAL MEMORANDUM|ONBOARDING CHARTER/i.test(line) ||
        /ADR \d+ \((?:SUPERSEDED|DEPRECATED)\)/i.test(line)
      ) {
        inActiveSection = false;
        prunedSections++;
        continue;
      }

      // If we re-enter active code invariants
      if (/ACTIVE CODE BASE INVARIANTS|BINDING RUNTIME CONSTRAINTS/i.test(line)) {
        inActiveSection = true;
        continue;
      }

      if (inActiveSection) {
        if (
          /Invariant \d+:/i.test(line) ||
          /\b(?:RS256|zeroizeBuffer|runtime\s*=\s*['"]edge['"]|BroccoliCompactionSafety|AES-256-GCM|AAD)\b/i.test(line)
        ) {
          activeInvariants.push(line);
        }
      } else {
        // Discard institutional noise line
        prunedSections++;
      }
    }

    const compactedText = `## ACTIVE ACTION-SAFE CODE INVARIANTS (2026):\n` +
      activeInvariants.join('\n') +
      `\n\n[PRUNED ${prunedSections} DEPRECATED ADRS, MINUTES & GOVERNANCE CEREMONIES]`;

    const compactedTokens = Math.round(compactedText.length / 4);
    const tokensSaved = Math.max(0, originalTokens - compactedTokens);
    const savingsPercentage = originalTokens > 0 ? (tokensSaved / originalTokens) * 100 : 0;

    return {
      activeInvariants,
      prunedHistoricalSections: prunedSections,
      compactedText,
      originalTokens,
      compactedTokens,
      savingsPercentage
    };
  }
}
