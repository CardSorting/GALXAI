/**
 * GALXAI: BroccoliInvertedIndexEngine (Zenith Tier)
 *
 * Adaptive BM25 Inverted Full-Text Search Engine for BroccoliDB.
 * Provides probabilistic BM25 ranking, positional phrase queries, and inverted posting lists.
 */

import type {
  Bm25SearchResult,
  IBroccoliInvertedIndexEngine,
} from "./broccolidb.contracts";

interface PostingEntry {
  termFrequency: number;
  positions: number[];
}

interface TableIndexState {
  docs: Map<string, { length: number; text: string; metadata?: Record<string, unknown> }>;
  postings: Map<string, Map<string, PostingEntry>>;
  totalDocLength: number;
}

export class BroccoliInvertedIndexEngine implements IBroccoliInvertedIndexEngine {
  private readonly tables = new Map<string, TableIndexState>();

  public indexDocument(table: string, docId: string, text: string, metadata?: Record<string, unknown>): void {
    if (!table.trim() || !docId.trim()) throw new TypeError("table and docId must be non-empty");
    const state = this.getOrCreateTableState(table);

    if (state.docs.has(docId)) {
      this.removeDocument(table, docId);
    }

    const tokens = this.tokenize(text);
    const docLength = tokens.length;
    state.docs.set(docId, { length: docLength, text, metadata: metadata ? { ...metadata } : undefined });
    state.totalDocLength += docLength;

    for (let pos = 0; pos < tokens.length; pos++) {
      const term = tokens[pos];
      if (!state.postings.has(term)) {
        state.postings.set(term, new Map());
      }
      const termMap = state.postings.get(term)!;
      if (!termMap.has(docId)) {
        termMap.set(docId, { termFrequency: 0, positions: [] });
      }
      const entry = termMap.get(docId)!;
      entry.termFrequency++;
      entry.positions.push(pos);
    }
  }

  public removeDocument(table: string, docId: string): boolean {
    const state = this.tables.get(table);
    if (!state || !state.docs.has(docId)) return false;

    const doc = state.docs.get(docId)!;
    state.totalDocLength -= doc.length;
    state.docs.delete(docId);

    for (const [term, docMap] of Array.from(state.postings.entries())) {
      docMap.delete(docId);
      if (docMap.size === 0) {
        state.postings.delete(term);
      }
    }

    return true;
  }

  public search(
    table: string,
    query: string,
    limit = 10,
    options: { readonly k1?: number; readonly b?: number; readonly phrase?: boolean } = {}
  ): readonly Bm25SearchResult[] {
    if (!Number.isSafeInteger(limit) || limit < 0) throw new RangeError("limit must be a non-negative integer");
    if (limit === 0) return [];
    const k1 = options.k1 ?? 1.2;
    const b = options.b ?? 0.75;
    if (!Number.isFinite(k1) || k1 < 0) throw new RangeError("k1 must be non-negative");
    if (!Number.isFinite(b) || b < 0 || b > 1) throw new RangeError("b must be between 0 and 1");
    const state = this.tables.get(table);
    if (!state || state.docs.size === 0) return [];

    const isPhrase = options.phrase ?? false;

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    const N = state.docs.size;
    const avgdl = state.totalDocLength / N;

    const docScores = new Map<string, { score: number; matchedTerms: Set<string> }>();

    for (const term of queryTokens) {
      const docMap = state.postings.get(term);
      if (!docMap) continue;

      const n = docMap.size;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));

      for (const [docId, posting] of docMap.entries()) {
        const doc = state.docs.get(docId);
        if (!doc) continue;

        const tf = posting.termFrequency;
        const numerator = tf * (k1 + 1);
        const denominator = tf + k1 * (1 - b + b * (doc.length / (avgdl || 1)));
        const termScore = idf * (numerator / denominator);

        if (!docScores.has(docId)) {
          docScores.set(docId, { score: 0, matchedTerms: new Set() });
        }
        const acc = docScores.get(docId)!;
        acc.score += termScore;
        acc.matchedTerms.add(term);
      }
    }

    let results: Bm25SearchResult[] = Array.from(docScores.entries()).map(([docId, val]) => ({
      docId,
      score: val.score,
      matchedTerms: Array.from(val.matchedTerms),
    }));

    if (isPhrase && queryTokens.length > 1) {
      results = results.filter((res) => {
        return this.matchesPhrasePositions(state, res.docId, queryTokens);
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  public getDocumentCount(table: string): number {
    return this.tables.get(table)?.docs.size ?? 0;
  }

  private matchesPhrasePositions(state: TableIndexState, docId: string, tokens: string[]): boolean {
    const firstTermPostings = state.postings.get(tokens[0])?.get(docId);
    if (!firstTermPostings) return false;

    for (const startPos of firstTermPostings.positions) {
      let isMatch = true;
      for (let i = 1; i < tokens.length; i++) {
        const nextPostings = state.postings.get(tokens[i])?.get(docId);
        if (!nextPostings || !nextPostings.positions.includes(startPos + i)) {
          isMatch = false;
          break;
        }
      }
      if (isMatch) return true;
    }

    return false;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_\-\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }

  private getOrCreateTableState(table: string): TableIndexState {
    if (!this.tables.has(table)) {
      this.tables.set(table, {
        docs: new Map(),
        postings: new Map(),
        totalDocLength: 0,
      });
    }
    return this.tables.get(table)!;
  }
}
