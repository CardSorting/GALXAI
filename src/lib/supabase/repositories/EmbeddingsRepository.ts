/**
 * GALXAI: Supabase pgvector Embeddings & Semantic Search Repository + BroccoliDB Hot Table
 * High-dimensional vector cosine distance search, document chunking, and semantic cache lookups.
 * Backed by BroccoliDB L1 reactive table with secondary indexing and metadata filtering.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../../core/broccolidb/broccolidb-natural-query';

export interface EmbeddingItem {
  workspaceId?: string;
  collectionName?: string;
  documentId: string;
  chunkIndex?: number;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface VectorSearchResult {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export class EmbeddingsRepository {
  private static instance: EmbeddingsRepository;
  public readonly embeddingsTable: BroccoliDbTable<EmbeddingItem & { id: string }>;

  private constructor() {
    this.embeddingsTable = new BroccoliDbTable<EmbeddingItem & { id: string }>('embeddings_store');
    this.embeddingsTable.createIndex('workspaceId');
    this.embeddingsTable.createIndex('collectionName');
    this.embeddingsTable.createIndex('documentId');
  }

  static getInstance(): EmbeddingsRepository {
    if (!EmbeddingsRepository.instance) {
      EmbeddingsRepository.instance = new EmbeddingsRepository();
    }
    return EmbeddingsRepository.instance;
  }

  async saveEmbedding(item: EmbeddingItem): Promise<string> {
    const id = `emb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullItem = { ...item, id };
    this.embeddingsTable.put(id, fullItem);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_embeddings_store')
          .insert({
            workspace_id: item.workspaceId || null,
            collection_name: item.collectionName || 'default',
            document_id: item.documentId,
            chunk_index: item.chunkIndex || 0,
            content: item.content,
            embedding: item.embedding,
            metadata: item.metadata || {}
          })
          .select('id')
          .single();

        if (!error && data) {
          return data.id;
        }
      } catch {
        // Fallback
      }
    }

    return id;
  }

  async saveEmbeddingsBatch(items: EmbeddingItem[]): Promise<void> {
    if (items.length === 0) return;
    for (const item of items) {
      const id = `emb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      this.embeddingsTable.put(id, { ...item, id });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const rows = items.map(item => ({
          workspace_id: item.workspaceId || null,
          collection_name: item.collectionName || 'default',
          document_id: item.documentId,
          chunk_index: item.chunkIndex || 0,
          content: item.content,
          embedding: item.embedding,
          metadata: item.metadata || {}
        }));

        await supabase.from('galx_embeddings_store').insert(rows);
      } catch {
        // Fallback
      }
    }
  }

  async searchSimilar(params: {
    queryEmbedding: number[];
    workspaceId?: string;
    collectionName?: string;
    matchThreshold?: number;
    matchCount?: number;
  }): Promise<VectorSearchResult[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_vector_search', {
          p_query_embedding: params.queryEmbedding,
          p_workspace_id: params.workspaceId || undefined,
          p_collection_name: params.collectionName || 'default',
          p_match_threshold: params.matchThreshold ?? 0.7,
          p_match_count: params.matchCount ?? 10
        });

        if (!error && data && Array.isArray(data) && data.length > 0) {
          return (data as any[]).map(d => ({
            id: d.id,
            documentId: d.document_id,
            chunkIndex: d.chunk_index,
            content: d.content,
            metadata: (d.metadata as Record<string, any>) || {},
            similarity: Number(d.similarity)
          }));
        }
      } catch {
        // Fallback
      }
    }

    const target = params.queryEmbedding;
    const collection = params.collectionName || 'default';
    const threshold = params.matchThreshold ?? 0.7;

    const whereClause: Record<string, any> = {
      collectionName: { $eq: collection }
    };
    if (params.workspaceId) whereClause.workspaceId = { $eq: params.workspaceId };

    const candidates = this.embeddingsTable.query({
      where: whereClause
    }) as (EmbeddingItem & { id: string })[];

    const scored = candidates
      .map(e => {
        const sim = this.cosineSimilarity(target, e.embedding);
        return {
          id: e.id,
          documentId: e.documentId,
          chunkIndex: e.chunkIndex || 0,
          content: e.content,
          metadata: e.metadata || {},
          similarity: sim
        };
      })
      .filter(e => e.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, params.matchCount || 10);

    return scored;
  }

  async deleteDocument(documentId: string, collectionName?: string): Promise<void> {
    const whereClause: Record<string, any> = { documentId: { $eq: documentId } };
    if (collectionName) whereClause.collectionName = { $eq: collectionName };

    const matches = this.embeddingsTable.query({ where: whereClause }) as (EmbeddingItem & { id: string })[];
    for (const m of matches) {
      this.embeddingsTable.delete(m.id);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        let query = supabase.from('galx_embeddings_store').delete().eq('document_id', documentId);
        if (collectionName) query = query.eq('collection_name', collectionName);
        await query;
      } catch {
        // Fallback
      }
    }
  }

  async deleteCollection(collectionName: string, workspaceId?: string): Promise<void> {
    const whereClause: Record<string, any> = { collectionName: { $eq: collectionName } };
    if (workspaceId) whereClause.workspaceId = { $eq: workspaceId };

    const matches = this.embeddingsTable.query({ where: whereClause }) as (EmbeddingItem & { id: string })[];
    for (const m of matches) {
      this.embeddingsTable.delete(m.id);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        let query = supabase.from('galx_embeddings_store').delete().eq('collection_name', collectionName);
        if (workspaceId) query = query.eq('workspace_id', workspaceId);
        await query;
      } catch {
        // Fallback
      }
    }
  }

  public queryNatural(naturalQuery: string): (EmbeddingItem & { id: string })[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'embeddings_store');
    return this.embeddingsTable.query(parsed.queryOptions) as (EmbeddingItem & { id: string })[];
  }

  public generateDeterministicVector(text: string, dimensions = 1536): number[] {
    const vector = new Array(dimensions).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
      const idx = Math.abs(hash) % dimensions;
      vector[idx] += ((i % 7) + 1) * 0.1;
    }
    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < dimensions; i++) {
      norm += vector[i] * vector[i];
    }
    const mag = Math.sqrt(norm) || 1;
    for (let i = 0; i < dimensions; i++) {
      vector[i] = Number((vector[i] / mag).toFixed(6));
    }
    return vector;
  }

  public cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
