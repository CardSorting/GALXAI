/**
 * GALXAI Developer SDK: Agentic Long-Term Associative Memory
 * Combines BroccoliDB L1 reactive structured storage with BroccoliVectorAnnEngine dense vector retrieval.
 * Enables autonomous agents to recall episodic facts, user preferences, and intermediate results across multi-turn sessions.
 * Pattern inspired by MemGPT, LangChain Memory, and AutoGen.
 */

import { BroccoliDbTable } from '../core/broccolidb/broccolidb-table';
import { BroccoliVectorAnnEngine } from '../core/broccolidb/broccolidb-vector-ann-engine';
import { BroccoliNaturalQueryParser } from '../core/broccolidb/broccolidb-natural-query';

export interface MemoryFact<T = any> {
  id: string;
  key: string;
  content: T;
  importance: number; // 1 to 5 scale
  tags: string[];
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  expiresAt?: number;
}

export interface RememberOptions {
  tags?: string[];
  importance?: number;
  ttlMs?: number;
  embedding?: Float64Array | Float32Array | readonly number[];
}

export interface RecallResult<T = any> {
  key: string;
  content: T;
  importance: number;
  tags: string[];
  similarityScore?: number;
}

export class AgentMemoryStore {
  private readonly factsTable: BroccoliDbTable<MemoryFact>;
  private readonly vectorEngine: BroccoliVectorAnnEngine;
  private readonly namespace = 'agent_memory_vectors';

  constructor() {
    this.factsTable = new BroccoliDbTable<MemoryFact>('agent_facts');
    this.factsTable.createIndex('key');
    this.factsTable.createSortedIndex('importance');
    this.factsTable.createSortedIndex('createdAt');
    this.factsTable.createSortedIndex('lastAccessedAt');
    this.vectorEngine = new BroccoliVectorAnnEngine();
  }

  /**
   * Stores a fact, observation, or user preference into long-term memory.
   *
   * @example
   * ```ts
   * agent.memory.remember('user_pref_language', 'Python', { tags: ['pref'], importance: 5 });
   * ```
   */
  public remember<T = any>(
    key: string,
    content: T,
    options: RememberOptions = {}
  ): void {
    const now = Date.now();
    const fact: MemoryFact<T> = {
      id: key,
      key,
      content,
      importance: options.importance ?? 3,
      tags: options.tags ?? [],
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      expiresAt: options.ttlMs ? now + options.ttlMs : undefined
    };

    this.factsTable.put(key, fact);

    if (options.embedding) {
      this.vectorEngine.insertVector(this.namespace, key, options.embedding, { key });
    }
  }

  /**
   * Recalls a specific stored fact by its key. Returns null if expired or missing.
   */
  public recallKey<T = any>(key: string): T | null {
    const fact = this.factsTable.get(key);
    if (!fact) return null;

    if (fact.expiresAt && fact.expiresAt < Date.now()) {
      this.forget(key);
      return null;
    }

    fact.lastAccessedAt = Date.now();
    fact.accessCount++;
    this.factsTable.put(key, fact);

    return fact.content as T;
  }

  /**
   * Recalls relevant memories by natural language query or vector similarity.
   */
  public recall<T = any>(
    queryText: string,
    options: { topK?: number; queryEmbedding?: number[]; tags?: string[]; minImportance?: number } = {}
  ): RecallResult<T>[] {
    const topK = options.topK ?? 5;
    const now = Date.now();

    // 1. If dense query embedding provided, retrieve via vector similarity
    if (options.queryEmbedding) {
      const vectorMatches = this.vectorEngine.searchNearest(this.namespace, options.queryEmbedding, topK, 'COSINE');
      const results: RecallResult<T>[] = [];

      for (const m of vectorMatches) {
        const fact = this.factsTable.get(m.vectorId);
        if (fact && (!fact.expiresAt || fact.expiresAt > now)) {
          results.push({
            key: fact.key,
            content: fact.content,
            importance: fact.importance,
            tags: fact.tags,
            similarityScore: m.score
          });
        }
      }
      return results;
    }

    // 2. Structured & natural search over L1 facts table
    const parsed = BroccoliNaturalQueryParser.parse(queryText, 'agent_facts');
    let candidateFacts = this.factsTable.query(parsed.queryOptions) as MemoryFact<T>[];

    // Filter out expired items
    candidateFacts = candidateFacts.filter(f => !f.expiresAt || f.expiresAt > now);

    if (options.minImportance) {
      candidateFacts = candidateFacts.filter(f => f.importance >= options.minImportance!);
    }

    if (options.tags && options.tags.length > 0) {
      candidateFacts = candidateFacts.filter(f => options.tags!.some(t => f.tags.includes(t)));
    }

    return candidateFacts.slice(0, topK).map(f => ({
      key: f.key,
      content: f.content,
      importance: f.importance,
      tags: f.tags
    }));
  }

  /**
   * Deletes a memory fact from both structured and vector stores.
   */
  public forget(key: string): boolean {
    this.vectorEngine.deleteVector(this.namespace, key);
    return this.factsTable.delete(key);
  }

  /**
   * Returns all active stored memory items.
   */
  public inspect(): MemoryFact[] {
    const now = Date.now();
    const all = this.factsTable.query() as MemoryFact[];
    return all.filter(f => !f.expiresAt || f.expiresAt > now);
  }

  /**
   * Clears all memory facts.
   */
  public clear(): void {
    for (const f of this.factsTable.query()) {
      this.vectorEngine.deleteVector(this.namespace, f.id);
    }
    this.factsTable.clear();
  }
}
