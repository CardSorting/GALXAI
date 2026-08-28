export type CompactionFidelityStatus = 'verified' | 'fallback';

export interface CompactionFidelityResult {
  status: CompactionFidelityStatus;
  unsupportedFacts: string[];
}

interface Evidence {
  display: string;
  candidates: string[];
}

/**
 * Conservative provenance checks for generated compactors.
 *
 * Domain compactors are allowed to add labels and structural prose, but high-risk
 * values in a digest must be grounded in the source. This guard intentionally
 * fails closed for unsupported amounts, dates, percentages, identifiers, BICs,
 * and measured values.
 */
export class BroccoliCompactionSafety {
  private static readonly MONTHS: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08',
    sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
  };

  public static verify(source: string, compacted: string): CompactionFidelityResult {
    if (source === compacted) {
      return { status: 'verified', unsupportedFacts: [] };
    }

    const normalizedSource = source.toLowerCase();
    const sourceNumbers = this.extractSourceNumbers(source);
    const evidence = this.extractHighRiskEvidence(compacted);
    const unsupportedFacts = evidence
      .filter(item => !item.candidates.some(candidate =>
        normalizedSource.includes(candidate.toLowerCase()) || sourceNumbers.has(candidate)
      ))
      .map(item => item.display)
      .filter((value, index, values) => values.indexOf(value) === index)
      .slice(0, 20);

    return unsupportedFacts.length === 0
      ? { status: 'verified', unsupportedFacts: [] }
      : { status: 'fallback', unsupportedFacts };
  }

  private static extractHighRiskEvidence(value: string): Evidence[] {
    const evidence: Evidence[] = [];

    this.collect(value, /\b[0-9]+(?:\.[0-9]+)?\s*%/g, evidence, match =>
      this.numericEvidence(match[0], match[0])
    );
    this.collect(value, /(?:\$|\b(?:USD|EUR|GBP|CAD|AUD|JPY|CHF)\s*)[0-9][0-9,.]*/gi, evidence, match =>
      this.numericEvidence(match[0], match[0])
    );
    this.collect(
      value,
      /\b[0-9]+(?:\.[0-9]+)?\s*(?:ms|µs|ns|gb|mb|kb|gbps|mbps|req\/s|rps|ops\/s|mg\/dl|mmhg|ml\/min|kg|kw|mw|mwh|gwh|psi|bar|sq\s*ft|shares|units)\b/gi,
      evidence,
      match => this.numericEvidence(match[0], match[0])
    );
    this.collect(value, /\b\d{4}-\d{2}-\d{2}\b/g, evidence, match => {
      const [year, month, day] = match[0].split('-');
      return {
        display: match[0],
        candidates: [match[0], `${year}${month}${day}`, `${year.slice(2)}${month}${day}`, `${month}${day}${year}`],
      };
    });
    this.collect(
      value,
      /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),\s+(\d{4})\b/gi,
      evidence,
      match => {
        const month = this.MONTHS[match[1].toLowerCase()];
        const day = match[2].padStart(2, '0');
        const year = match[3];
        return {
          display: match[0],
          candidates: [match[0], `${year}${month}${day}`, `${year.slice(2)}${month}${day}`, `${month}${day}${year}`],
        };
      }
    );
    this.collect(value, /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, evidence, match => ({
      display: match[0],
      candidates: [match[0].toLowerCase()],
    }));
    this.collect(value, /(?:BIC|Bank|Sender|Intermediary|Beneficiary)[^\n]{0,40}?\b([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/g, evidence, match => ({
      display: match[1],
      candidates: [match[1].toLowerCase()],
    }));
    this.collect(value, /\b\d{6,}\b/g, evidence, match => this.numericEvidence(match[0], match[0]));

    return evidence;
  }

  private static collect(
    value: string,
    regex: RegExp,
    target: Evidence[],
    mapper: (match: RegExpMatchArray) => Evidence | null
  ): void {
    for (const match of value.matchAll(regex)) {
      const mapped = mapper(match);
      if (mapped) target.push(mapped);
    }
  }

  private static numericEvidence(display: string, rawValue: string): Evidence {
    const numericMatch = rawValue.match(/[0-9][0-9,.]*/);
    const normalized = numericMatch ? this.normalizeNumber(numericMatch[0]) : '';
    return {
      display,
      candidates: normalized ? [normalized] : [display.toLowerCase()],
    };
  }

  private static extractSourceNumbers(value: string): Set<string> {
    const numbers = new Set<string>();
    for (const match of value.matchAll(/[0-9][0-9,.]*/g)) {
      const normalized = this.normalizeNumber(match[0]);
      if (normalized) numbers.add(normalized);
    }
    return numbers;
  }

  private static normalizeNumber(value: string): string {
    const trimmed = value.replace(/,$/, '').replace(/,/g, '');
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return '';
    return String(parsed);
  }
}
