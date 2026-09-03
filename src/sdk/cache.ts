/**
 * GALXAI Developer SDK: In-Memory L1 Prompt & Semantic Response Cache
 * Backed by BroccoliDB L1 Reactive Tables and BroccoliVectorAnnEngine for:
 * - Sub-microsecond (<0.05ms) exact hash cache hits
 * - Multi-modal Cosine Similarity Vector Semantic Cache hits (matching GPTCache & Portkey)
 * - Zero network token burn and transparent cost savings analytics
 * - Stream simulation from cached completions for seamless UI typing animations
 */

import { createHash } from 'node:crypto';
import type { ChatCompletionResponse, ChatCompletionChunk } from '../core/contracts/GalxContracts';
import type { GalxPlugin, MiddlewareRequestContext, MiddlewareResponseContext } from './middleware';
import { BroccoliDbTable } from '../core/broccolidb/broccolidb-table';
import { BroccoliVectorAnnEngine } from '../core/broccolidb/broccolidb-vector-ann-engine';
import { BroccoliNaturalQueryParser } from '../core/broccolidb/broccolidb-natural-query';
import type { DbQueryOptions, DbAggregateQuery, DbAggregateResult } from '../core/broccolidb/broccolidb.contracts';
import { ChatCompletionStream } from './stream';

export interface CacheEntry {
  id: string; // SHA-256 hash of normalized request
  key: string;
  response: ChatCompletionResponse;
  model: string;
  promptTokens: number;
  completionTokens: number;
  tokensSaved: number;
  costSavedUsd: number;
  createdAt: number;
  expiresAt?: number;
  hitCount: number;
  hasEmbedding?: boolean;
}

export interface CacheStats {
  totalHits: number;
  totalExactHits: number;
  totalSemanticHits: number;
  totalMisses: number;
  hitRatePercentage: number;
  totalTokensSaved: number;
  totalCostSavedUsd: number;
  cachedEntriesCount: number;
}

export interface CacheConfig {
  /** Time-to-live in milliseconds for cached responses. Default: 1 hour (3,600,000ms) */
  ttlMs?: number;
  /** Maximum number of cached responses to store in memory. Default: 10,000 */
  maxEntries?: number;
  /** Cosine similarity threshold for semantic vector cache matches (0.0 to 1.0). Default: 0.92 */
  similarityThreshold?: number;
  /** Vector namespace for semantic embeddings */
  vectorNamespace?: string;
  /** Custom hash function or normalizer */
  computeKey?: (request: any) => string;
}

export class BroccoliPromptCache {
  private readonly table: BroccoliDbTable<CacheEntry>;
  private readonly vectorEngine: BroccoliVectorAnnEngine;
  private readonly vectorNamespace: string;
  private readonly config: Required<CacheConfig>;
  private totalExactHits = 0;
  private totalSemanticHits = 0;
  private totalMisses = 0;
  private totalTokensSaved = 0;
  private totalCostSavedUsd = 0;

  constructor(config: CacheConfig = {}) {
    this.vectorNamespace = config.vectorNamespace || 'prompt_cache_vectors';
    this.config = {
      ttlMs: config.ttlMs ?? 3_600_000,
      maxEntries: config.maxEntries ?? 10_000,
      similarityThreshold: config.similarityThreshold ?? 0.92,
      vectorNamespace: this.vectorNamespace,
      computeKey: config.computeKey ?? BroccoliPromptCache.defaultComputeKey
    };

    this.table = new BroccoliDbTable<CacheEntry>('prompt_cache');
    this.table.createIndex('model');
    this.table.createSortedIndex('createdAt');
    this.table.createSortedIndex('tokensSaved');
    this.table.createSortedIndex('hitCount');

    this.vectorEngine = new BroccoliVectorAnnEngine();
  }

  /**
   * Deterministically computes a canonical SHA-256 fingerprint for a completion request.
   */
  public static defaultComputeKey(req: any): string {
    if (!req) return 'empty_request';
    const canonical = {
      model: req.model || 'default',
      messages: req.messages || [],
      temperature: req.temperature ?? 0,
      tools: req.tools || [],
      response_format: req.response_format || null
    };
    return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  }

  /**
   * Computes cache key for a given request.
   */
  public computeKey(req: any): string {
    return this.config.computeKey(req);
  }

  /**
   * Retrieves a cached response by exact key or semantic vector similarity.
   *
   * @param key Exact SHA-256 hash or identifier
   * @param queryEmbedding Optional vector embedding for semantic similarity matching
   * @param similarityThreshold Optional threshold override (default: 0.92)
   */
  public get(
    key: string,
    queryEmbedding?: Float64Array | Float32Array | readonly number[],
    similarityThreshold?: number
  ): (ChatCompletionResponse & { _cacheHitType?: 'exact' | 'semantic'; _similarityScore?: number }) | null {
    // 1. Fast Path: Exact hash match (<0.01ms)
    const exactEntry = this.table.get(key);
    if (exactEntry) {
      if (exactEntry.expiresAt && exactEntry.expiresAt < Date.now()) {
        this.table.delete(key);
        this.vectorEngine.deleteVector(this.vectorNamespace, key);
        this.totalMisses++;
        return null;
      }

      this.totalExactHits++;
      this.totalTokensSaved += exactEntry.tokensSaved;
      this.totalCostSavedUsd += exactEntry.costSavedUsd;

      exactEntry.hitCount++;
      this.table.put(key, exactEntry);

      return {
        ...exactEntry.response,
        id: `cached_exact_${exactEntry.response.id || Date.now()}`,
        created: Math.floor(Date.now() / 1000),
        _cacheHitType: 'exact'
      };
    }

    // 2. Semantic Path: Vector Similarity Search via BroccoliVectorAnnEngine
    if (queryEmbedding && this.vectorEngine.getVectorCount(this.vectorNamespace) > 0) {
      const threshold = similarityThreshold ?? this.config.similarityThreshold;
      const matches = this.vectorEngine.searchNearest(this.vectorNamespace, queryEmbedding, 1, 'COSINE');

      if (matches.length > 0 && matches[0].score >= threshold) {
        const matchedEntry = this.table.get(matches[0].vectorId);
        if (matchedEntry) {
          if (matchedEntry.expiresAt && matchedEntry.expiresAt < Date.now()) {
            this.table.delete(matches[0].vectorId);
            this.vectorEngine.deleteVector(this.vectorNamespace, matches[0].vectorId);
            this.totalMisses++;
            return null;
          }

          this.totalSemanticHits++;
          this.totalTokensSaved += matchedEntry.tokensSaved;
          this.totalCostSavedUsd += matchedEntry.costSavedUsd;

          matchedEntry.hitCount++;
          this.table.put(matches[0].vectorId, matchedEntry);

          return {
            ...matchedEntry.response,
            id: `cached_semantic_${matchedEntry.response.id || Date.now()}`,
            created: Math.floor(Date.now() / 1000),
            _cacheHitType: 'semantic',
            _similarityScore: Number(matches[0].score.toFixed(4))
          };
        }
      }
    }

    this.totalMisses++;
    return null;
  }

  /**
   * Stores a response in the in-memory cache, optionally indexing its semantic embedding.
   */
  public set(
    key: string,
    response: ChatCompletionResponse,
    request?: any,
    ttlMs?: number,
    embedding?: Float64Array | Float32Array | readonly number[]
  ): void {
    if (this.table.count() >= this.config.maxEntries) {
      const oldest = this.table.query({ sortBy: 'createdAt', sortOrder: 'asc', limit: 1 })[0];
      if (oldest) {
        this.table.delete(oldest.id);
        this.vectorEngine.deleteVector(this.vectorNamespace, oldest.id);
      }
    }

    const pTokens = response.usage?.prompt_tokens ?? 0;
    const cTokens = response.usage?.completion_tokens ?? 0;
    const totalTokens = pTokens + cTokens;
    const estimatedCost = (totalTokens / 1000) * 0.002;
    const ttl = ttlMs ?? this.config.ttlMs;

    this.table.put(key, {
      id: key,
      key,
      response,
      model: response.model || request?.model || 'unknown',
      promptTokens: pTokens,
      completionTokens: cTokens,
      tokensSaved: totalTokens,
      costSavedUsd: Number(estimatedCost.toFixed(6)),
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
      hitCount: 0,
      hasEmbedding: Boolean(embedding)
    });

    if (embedding) {
      this.vectorEngine.insertVector(this.vectorNamespace, key, embedding, {
        key,
        model: response.model
      });
    }
  }

  /**
   * Converts any cached completion response into a real-time `ChatCompletionStream` runner,
   * simulating smooth token streaming without making network calls.
   */
  public toStream(
    response: ChatCompletionResponse,
    options: { chunkSize?: number; delayMs?: number } = {}
  ): ChatCompletionStream {
    const text = response.choices[0]?.message?.content || '';
    const chunkSize = options.chunkSize ?? 4; // ~4 chars per token chunk
    const delayMs = options.delayMs ?? 5; // 5ms typing speed simulation

    async function* generateChunks(): AsyncIterable<ChatCompletionChunk> {
      for (let i = 0; i < text.length; i += chunkSize) {
        const delta = text.slice(i, i + chunkSize);
        if (delayMs > 0) {
          await new Promise(r => setTimeout(r, delayMs));
        }
        yield {
          id: response.id || `chunk_${Date.now()}`,
          object: 'chat.completion.chunk',
          created: response.created || Math.floor(Date.now() / 1000),
          model: response.model,
          choices: [
            {
              index: 0,
              delta: { content: delta },
              finish_reason: i + chunkSize >= text.length ? 'stop' : null
            }
          ]
        };
      }
    }

    return new ChatCompletionStream(generateChunks());
  }

  /**
   * Checks if an unexpired response exists in cache by exact key.
   */
  public has(key: string): boolean {
    const entry = this.table.get(key);
    if (!entry) return false;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.table.delete(key);
      this.vectorEngine.deleteVector(this.vectorNamespace, key);
      return false;
    }
    return true;
  }

  /**
   * Invalidates a specific cached response.
   */
  public invalidate(key: string): boolean {
    this.vectorEngine.deleteVector(this.vectorNamespace, key);
    return this.table.delete(key);
  }

  /**
   * Clears the entire prompt cache and vector index.
   */
  public clear(): void {
    for (const entry of this.table.query()) {
      this.vectorEngine.deleteVector(this.vectorNamespace, entry.id);
    }
    this.table.clear();
    this.totalExactHits = 0;
    this.totalSemanticHits = 0;
    this.totalMisses = 0;
    this.totalTokensSaved = 0;
    this.totalCostSavedUsd = 0;
  }

  /**
   * Returns analytical statistics on cache effectiveness and financial token savings.
   */
  public stats(): CacheStats {
    const totalHits = this.totalExactHits + this.totalSemanticHits;
    const totalLookups = totalHits + this.totalMisses;
    const hitRate = totalLookups > 0 ? (totalHits / totalLookups) * 100 : 0;

    return {
      totalHits,
      totalExactHits: this.totalExactHits,
      totalSemanticHits: this.totalSemanticHits,
      totalMisses: this.totalMisses,
      hitRatePercentage: Number(hitRate.toFixed(1)),
      totalTokensSaved: this.totalTokensSaved,
      totalCostSavedUsd: Number(this.totalCostSavedUsd.toFixed(6)),
      cachedEntriesCount: this.table.count()
    };
  }

  /**
   * Executes deterministic offline natural language queries over cached responses (<0.1ms).
   */
  public queryNatural(naturalQuery: string): CacheEntry[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'prompt_cache');
    return this.table.query(parsed.queryOptions) as CacheEntry[];
  }

  /**
   * Evaluates structured query filters over the cache.
   */
  public queryDSL(options: DbQueryOptions): CacheEntry[] {
    return this.table.query(options) as CacheEntry[];
  }

  /**
   * Runs single-pass statistical aggregations over cache metrics.
   */
  public aggregate(query: DbAggregateQuery): DbAggregateResult {
    return this.table.aggregate(query);
  }

  /**
   * Converts the cache into a plug-and-play middleware plugin for the client pipeline.
   */
  public toPlugin(): GalxPlugin {
    const self = this;
    return {
      name: 'BroccoliPromptCachePlugin',

      onRequest: (ctx: MiddlewareRequestContext) => {
        if (ctx.path.includes('/chat/completions') && ctx.method === 'POST' && ctx.body && !ctx.body.stream) {
          const cacheKey = self.computeKey(ctx.body);
          const cached = self.get(cacheKey);
          if (cached) {
            return { shortCircuitResponse: cached };
          }
        }
      },

      onResponse: (ctx: MiddlewareResponseContext) => {
        if (ctx.path.includes('/chat/completions') && ctx.method === 'POST' && ctx.requestBody && !ctx.requestBody.stream) {
          if (ctx.statusCode === 200 && ctx.data && !ctx.data.id?.startsWith('cached_')) {
            const cacheKey = self.computeKey(ctx.requestBody);
            self.set(cacheKey, ctx.data, ctx.requestBody);
          }
        }
      }
    };
  }
}

export function createCachePlugin(config: CacheConfig = {}): GalxPlugin {
  const cache = new BroccoliPromptCache(config);
  return cache.toPlugin();
}
