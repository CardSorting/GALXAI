/**
 * GALXAI Developer SDK: Embeddings Resource
 * High-velocity vector embedding generation at Cloudflare Edge PoPs,
 * supercharged with BroccoliDB in-memory dense vector indexing and instant RAG search.
 */

import type { GalxAIClientCore } from '../client';
import type { RequestOptions } from '../types';
import { VectorResource, type VectorQueryResult } from '../vector';

export interface EmbeddingCreateRequest {
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | string;
  input: string | string[];
  dimensions?: number;
  user?: string;
}

export interface EmbeddingObject {
  object: 'embedding';
  index: number;
  embedding: number[];
}

export interface EmbeddingCreateResponse {
  object: 'list';
  data: EmbeddingObject[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface VectorSearchHandle<TMetadata extends Record<string, any> = Record<string, any>> {
  readonly namespace: string;
  readonly count: number;
  search(queryText: string, options?: { topK?: number }): Promise<VectorQueryResult<TMetadata>[]>;
  searchVector(queryEmbedding: number[], options?: { topK?: number }): VectorQueryResult<TMetadata>[];
}

export class EmbeddingsResource {
  private readonly client: GalxAIClientCore;
  public readonly vector: VectorResource;

  constructor(client: GalxAIClientCore, vector?: VectorResource) {
    this.client = client;
    this.vector = vector || new VectorResource();
  }

  /**
   * Creates 1536-dim or 3072-dim vector embeddings with $<15ms edge latency.
   *
   * @example
   * ```typescript
   * const response = await galx.embeddings.create({
   *   model: 'text-embedding-3-small',
   *   input: 'Autonomous agentic computing'
   * });
   * console.log(response.data[0].embedding);
   * ```
   */
  public async create(params: EmbeddingCreateRequest, options?: RequestOptions): Promise<EmbeddingCreateResponse> {
    if (this.client.isMock) {
      const inputs = Array.isArray(params.input) ? params.input : [params.input];
      const dims = params.dimensions || 1536;
      return {
        object: 'list',
        data: inputs.map((_, i) => {
          // Deterministic pseudo-random embedding based on index and length
          const arr = new Array(dims).fill(0).map((_, d) => Math.sin(i * 100 + d * 0.1));
          return { object: 'embedding', index: i, embedding: arr };
        }),
        model: params.model || 'text-embedding-3-small',
        usage: { prompt_tokens: inputs.length * 5, total_tokens: inputs.length * 5 }
      };
    }

    return this.client.request<EmbeddingCreateResponse>('/v1/embeddings', {
      method: 'POST',
      body: {
        model: params.model || 'text-embedding-3-small',
        input: params.input,
        dimensions: params.dimensions,
        user: params.user
      },
      ...options
    });
  }

  /**
   * High-Level RAG DX: Generates embeddings for an array of texts and automatically
   * indexes them into BroccoliDB's dense vector engine in 1 line.
   *
   * @example
   * ```typescript
   * const kb = await galx.embeddings.createAndIndex([
   *   'BroccoliDB is a sub-microsecond in-memory database',
   *   'GALXAI routes LLM requests with minimal latency',
   *   'React 19 Server Actions streamline fullstack data mutations'
   * ], { namespace: 'docs' });
   *
   * const results = await kb.search('How fast is BroccoliDB?');
   * console.log(results[0].metadata.text);
   * ```
   */
  public async createAndIndex<TMetadata extends Record<string, any> = { text: string }>(
    documents: string[] | Array<{ id?: string; text: string; metadata?: TMetadata }>,
    options: { model?: string; namespace?: string; dimensions?: number } = {}
  ): Promise<VectorSearchHandle<TMetadata>> {
    const namespace = options.namespace || `rag_${Date.now()}`;
    const normalized = documents.map((doc, i) => {
      if (typeof doc === 'string') {
        return { id: `doc_${i}`, text: doc, metadata: { text: doc } as unknown as TMetadata };
      }
      return {
        id: doc.id || `doc_${i}`,
        text: doc.text,
        metadata: { text: doc.text, ...(doc.metadata || {}) } as unknown as TMetadata
      };
    });

    const texts = normalized.map(d => d.text);
    const embResponse = await this.create({
      model: options.model || 'text-embedding-3-small',
      input: texts,
      dimensions: options.dimensions
    });

    const records = normalized.map((item, i) => ({
      id: item.id,
      values: embResponse.data[i].embedding,
      metadata: item.metadata
    }));

    this.vector.upsertMany(namespace, records);

    const self = this;
    return {
      namespace,
      count: records.length,

      async search(queryText: string, searchOpts = {}): Promise<VectorQueryResult<TMetadata>[]> {
        const queryRes = await self.create({
          model: options.model || 'text-embedding-3-small',
          input: queryText,
          dimensions: options.dimensions
        });
        const queryVector = queryRes.data[0].embedding;
        return self.vector.search<TMetadata>(namespace, queryVector, searchOpts);
      },

      searchVector(queryEmbedding: number[], searchOpts = {}): VectorQueryResult<TMetadata>[] {
        return self.vector.search<TMetadata>(namespace, queryEmbedding, searchOpts);
      }
    };
  }
}
