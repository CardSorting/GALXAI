/**
 * GALXAI Developer SDK: In-Memory Vector Search & RAG Substrate
 * Powered by BroccoliVectorAnnEngine for dense-vector similarity search,
 * cosine similarity, Euclidean distance, and dot-product top-k extraction.
 * Pattern inspired by Pinecone, Qdrant, and ChromaDB.
 */

import { BroccoliVectorAnnEngine } from '../core/broccolidb/broccolidb-vector-ann-engine';
import type { VectorAnnSearchResult, VectorDistanceMetric } from '../core/broccolidb/broccolidb.contracts';

export type VectorInput = Float64Array | Float32Array | readonly number[];

export interface VectorRecord<TMetadata extends Record<string, any> = Record<string, any>> {
  id: string;
  values: VectorInput;
  metadata?: TMetadata;
}

export interface VectorQueryOptions {
  topK?: number;
  metric?: 'cosine' | 'euclidean' | 'dot' | 'COSINE' | 'EUCLIDEAN' | 'DOT_PRODUCT';
}

export interface VectorQueryResult<TMetadata extends Record<string, any> = Record<string, any>> {
  id: string;
  score: number;
  metadata?: TMetadata;
}

export interface ScopedVectorIndex<TMetadata extends Record<string, any> = Record<string, any>> {
  readonly namespace: string;
  upsert(id: string, values: VectorInput, metadata?: TMetadata): void;
  upsertMany(records: Array<VectorRecord<TMetadata>>): void;
  search(queryValues: VectorInput, options?: VectorQueryOptions): VectorQueryResult<TMetadata>[];
  has(id: string): boolean;
  delete(id: string): boolean;
  count(): number;
  clear(): void;
}

export class VectorResource {
  private readonly engine: BroccoliVectorAnnEngine;
  private readonly indexedIds = new Map<string, Set<string>>();

  constructor(engine: BroccoliVectorAnnEngine = new BroccoliVectorAnnEngine()) {
    this.engine = engine;
  }

  /**
   * Inserts or updates a dense vector in a namespace.
   *
   * @example
   * ```ts
   * galx.vector.upsert('documents', 'doc_1', [0.12, 0.45, -0.23], { title: 'Report A' });
   * ```
   */
  public upsert<TMetadata extends Record<string, any> = Record<string, any>>(
    namespace: string,
    id: string,
    values: VectorInput,
    metadata?: TMetadata
  ): void {
    this.engine.insertVector(namespace, id, values, metadata);
    if (!this.indexedIds.has(namespace)) {
      this.indexedIds.set(namespace, new Set());
    }
    this.indexedIds.get(namespace)!.add(id);
  }

  /**
   * Inserts multiple vector records in a batch.
   */
  public upsertMany<TMetadata extends Record<string, any> = Record<string, any>>(
    namespace: string,
    records: Array<VectorRecord<TMetadata>>
  ): void {
    for (const rec of records) {
      this.upsert(namespace, rec.id, rec.values, rec.metadata);
    }
  }

  /**
   * Queries the top-K nearest vectors by cosine similarity, Euclidean distance, or dot product.
   *
   * @example
   * ```ts
   * const matches = galx.vector.search('documents', queryEmbedding, { topK: 5, metric: 'cosine' });
   * for (const match of matches) {
   *   console.log(match.id, match.score, match.metadata);
   * }
   * ```
   */
  public search<TMetadata extends Record<string, any> = Record<string, any>>(
    namespace: string,
    queryValues: VectorInput,
    options: VectorQueryOptions = {}
  ): VectorQueryResult<TMetadata>[] {
    const topK = options.topK ?? 10;
    const metricStr = (options.metric || 'cosine').toUpperCase();
    const metric: VectorDistanceMetric = metricStr === 'EUCLIDEAN'
      ? 'EUCLIDEAN'
      : metricStr === 'DOT_PRODUCT' || metricStr === 'DOT'
      ? 'DOT_PRODUCT'
      : 'COSINE';

    const rawResults = this.engine.searchNearest(namespace, queryValues, topK, metric);

    return rawResults.map((r: VectorAnnSearchResult) => ({
      id: r.vectorId,
      score: r.score,
      metadata: r.metadata as TMetadata | undefined
    }));
  }

  /**
   * Checks if a vector ID exists in a namespace.
   */
  public has(namespace: string, id: string): boolean {
    return this.indexedIds.get(namespace)?.has(id) ?? false;
  }

  /**
   * Deletes a vector from a namespace.
   */
  public delete(namespace: string, id: string): boolean {
    this.indexedIds.get(namespace)?.delete(id);
    return this.engine.deleteVector(namespace, id);
  }

  /**
   * Returns the count of indexed vectors in a namespace.
   */
  public count(namespace: string): number {
    return this.engine.getVectorCount(namespace);
  }

  /**
   * Clears all vectors in a namespace, or all namespaces if omitted.
   */
  public clear(namespace?: string): void {
    if (namespace) {
      const ids = this.indexedIds.get(namespace);
      if (ids) {
        for (const id of ids) {
          this.engine.deleteVector(namespace, id);
        }
        ids.clear();
      }
    } else {
      for (const [ns, ids] of this.indexedIds) {
        for (const id of ids) {
          this.engine.deleteVector(ns, id);
        }
        ids.clear();
      }
      this.indexedIds.clear();
    }
  }

  /**
   * Returns a scoped index object bound to a specific namespace for cleaner code.
   *
   * @example
   * ```ts
   * const docIndex = galx.vector.index('documents');
   * docIndex.upsert('doc_1', [0.1, 0.2], { title: 'Hello' });
   * const results = docIndex.search([0.1, 0.2]);
   * ```
   */
  public index<TMetadata extends Record<string, any> = Record<string, any>>(
    namespace: string
  ): ScopedVectorIndex<TMetadata> {
    const self = this;
    return {
      namespace,
      upsert: (id, values, metadata) => self.upsert(namespace, id, values, metadata),
      upsertMany: (records) => self.upsertMany(namespace, records),
      search: (queryValues, options) => self.search(namespace, queryValues, options),
      has: (id) => self.has(namespace, id),
      delete: (id) => self.delete(namespace, id),
      count: () => self.count(namespace),
      clear: () => self.clear(namespace)
    };
  }
}
