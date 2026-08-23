/**
 * GALXAI Developer SDK: Embeddings Resource
 * High-velocity vector embedding generation at Cloudflare Edge PoPs.
 */

import type { GalxAIClientCore } from '../client';

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

export class EmbeddingsResource {
  constructor(private readonly client: GalxAIClientCore) {}

  /**
   * Creates 1536-dim or 3072-dim vector embeddings with $<15\text{ms}$ edge latency.
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
  public async create(params: EmbeddingCreateRequest): Promise<EmbeddingCreateResponse> {
    return this.client.request<EmbeddingCreateResponse>('/v1/embeddings', {
      method: 'POST',
      body: {
        model: params.model || 'text-embedding-3-small',
        input: params.input,
        dimensions: params.dimensions,
        user: params.user
      }
    });
  }
}
