/**
 * GALXAI: BroccoliVectorAnnEngine (Zenith Tier)
 *
 * Exact dense-vector similarity search substrate for BroccoliDB.
 * The legacy class name contains “Ann”, but this implementation performs a full scan supporting
 * cosine similarity, Euclidean distance, and dot-product top-k extraction.
 */

import type {
  IBroccoliVectorAnnEngine,
  VectorAnnSearchResult,
  VectorDistanceMetric,
} from "./broccolidb.contracts";

interface VectorEntry {
  vectorId: string;
  embedding: Float64Array;
  norm: number;
  metadata?: Record<string, unknown>;
}

export class BroccoliVectorAnnEngine implements IBroccoliVectorAnnEngine {
  // namespace -> (vectorId -> VectorEntry)
  private readonly namespaces = new Map<string, Map<string, VectorEntry>>();
  private readonly dimensions = new Map<string, number>();

  public insertVector(
    namespace: string,
    vectorId: string,
    embedding: Float64Array | Float32Array | readonly number[],
    metadata?: Record<string, unknown>
  ): void {
    if (!namespace.trim() || !vectorId.trim()) throw new TypeError("namespace and vectorId must be non-empty");
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Map());
    }

    const floatArray = new Float64Array(embedding);
    if (floatArray.length === 0) throw new RangeError("embedding must contain at least one dimension");
    const expectedDimensions = this.dimensions.get(namespace);
    if (expectedDimensions !== undefined && expectedDimensions !== floatArray.length) {
      throw new RangeError(
        `Embedding dimension ${floatArray.length} does not match namespace dimension ${expectedDimensions}`
      );
    }
    for (const value of floatArray) {
      if (!Number.isFinite(value)) throw new TypeError("embedding values must be finite");
    }
    let normSq = 0;
    for (let i = 0; i < floatArray.length; i++) {
      normSq += floatArray[i] * floatArray[i];
    }
    const norm = Math.sqrt(normSq);

    const entry: VectorEntry = {
      vectorId,
      embedding: floatArray,
      norm: norm === 0 ? 1 : norm,
      metadata: metadata ? { ...metadata } : undefined,
    };

    this.namespaces.get(namespace)!.set(vectorId, entry);
    this.dimensions.set(namespace, floatArray.length);
  }

  public deleteVector(namespace: string, vectorId: string): boolean {
    const space = this.namespaces.get(namespace);
    if (!space) return false;
    const deleted = space.delete(vectorId);
    if (space.size === 0) {
      this.namespaces.delete(namespace);
      this.dimensions.delete(namespace);
    }
    return deleted;
  }

  public searchNearest(
    namespace: string,
    queryEmbedding: Float64Array | Float32Array | readonly number[],
    topK = 10,
    metric: VectorDistanceMetric = "COSINE"
  ): readonly VectorAnnSearchResult[] {
    const space = this.namespaces.get(namespace);
    if (!space || space.size === 0) return [];
    if (!Number.isSafeInteger(topK) || topK < 0) throw new RangeError("topK must be a non-negative integer");
    if (topK === 0) return [];

    const queryArray = new Float64Array(queryEmbedding);
    if (queryArray.length !== this.dimensions.get(namespace)) {
      throw new RangeError(`Query dimension ${queryArray.length} does not match namespace dimension ${this.dimensions.get(namespace)}`);
    }
    let queryNormSq = 0;
    for (let i = 0; i < queryArray.length; i++) {
      if (!Number.isFinite(queryArray[i])) throw new TypeError("query embedding values must be finite");
      queryNormSq += queryArray[i] * queryArray[i];
    }
    const queryNorm = Math.sqrt(queryNormSq) || 1;

    const scoredResults: { vectorId: string; score: number; distance: number; metadata?: Record<string, unknown> }[] = [];

    for (const entry of space.values()) {
      if (entry.embedding.length !== queryArray.length) continue;

      let score = 0;
      let distance = 0;

      if (metric === "COSINE") {
        let dot = 0;
        for (let i = 0; i < queryArray.length; i++) {
          dot += queryArray[i] * entry.embedding[i];
        }
        score = dot / (queryNorm * entry.norm);
        distance = 1 - score;
      } else if (metric === "EUCLIDEAN") {
        let sumSq = 0;
        for (let i = 0; i < queryArray.length; i++) {
          const diff = queryArray[i] - entry.embedding[i];
          sumSq += diff * diff;
        }
        distance = Math.sqrt(sumSq);
        score = 1 / (1 + distance); // Normalize to [0, 1]
      } else if (metric === "DOT_PRODUCT") {
        let dot = 0;
        for (let i = 0; i < queryArray.length; i++) {
          dot += queryArray[i] * entry.embedding[i];
        }
        score = dot;
        distance = -dot;
      }

      scoredResults.push({
        vectorId: entry.vectorId,
        score,
        distance,
        metadata: entry.metadata ? { ...entry.metadata } : undefined,
      });
    }

    // Sort descending by score
    scoredResults.sort((a, b) => b.score - a.score);
    return scoredResults.slice(0, topK);
  }

  public getVectorCount(namespace: string): number {
    return this.namespaces.get(namespace)?.size ?? 0;
  }
}
