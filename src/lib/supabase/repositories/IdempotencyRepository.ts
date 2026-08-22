/**
 * GALXAI: Supabase Stripe-Grade Idempotency Engine Repository + BroccoliDB Hot Table
 * Manages request deduplication, in-flight status locks, response caching, and payload hashing.
 * Backed by BroccoliDB L1 reactive table with secondary indexing and automatic state transitions.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database, GalxIdempotencyState } from '../types';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../../core/broccolidb/broccolidb-natural-query';

export interface IdempotencyRecord {
  id: string;
  userId: string;
  endpoint: string;
  requestHash: string;
  state: GalxIdempotencyState;
  statusCode: number | null;
  responseHeaders: Record<string, any> | null;
  responseBody: any | null;
  errorMessage: string | null;
  expiresAtMs: number;
  createdAtMs: number;
}

export type IdempotencyBeginResult =
  | { status: 'STARTED' }
  | { status: 'CACHED'; statusCode: number; responseHeaders?: Record<string, any>; responseBody: any }
  | { status: 'IN_FLIGHT'; message: string }
  | { status: 'MISMATCH_ERROR'; message: string };

export class IdempotencyRepository {
  private static instance: IdempotencyRepository;
  public readonly storeTable: BroccoliDbTable<IdempotencyRecord>;

  private constructor() {
    this.storeTable = new BroccoliDbTable<IdempotencyRecord>('idempotency_records');
    this.storeTable.createIndex('userId');
    this.storeTable.createIndex('endpoint');
    this.storeTable.createIndex('requestHash');
    this.storeTable.createIndex('state');
    this.storeTable.createSortedIndex('expiresAtMs');
    this.storeTable.createSortedIndex('createdAtMs');
  }

  static getInstance(): IdempotencyRepository {
    if (!IdempotencyRepository.instance) {
      IdempotencyRepository.instance = new IdempotencyRepository();
    }
    return IdempotencyRepository.instance;
  }

  async begin(params: {
    idempotencyKey: string;
    userId: string;
    endpoint: string;
    requestHash: string;
    ttlMs?: number;
  }): Promise<IdempotencyBeginResult> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_idempotency_begin', {
          p_idempotency_key: params.idempotencyKey,
          p_user_id: params.userId,
          p_endpoint: params.endpoint,
          p_request_hash: params.requestHash,
          p_ttl_ms: params.ttlMs || 86400000
        });

        if (!error && data) {
          const res = data as any;
          if (res.status === 'STARTED') return { status: 'STARTED' };
          if (res.status === 'CACHED') {
            return {
              status: 'CACHED',
              statusCode: res.status_code || 200,
              responseHeaders: res.response_headers,
              responseBody: res.response_body
            };
          }
          if (res.status === 'IN_FLIGHT') return { status: 'IN_FLIGHT', message: res.message };
          if (res.status === 'MISMATCH_ERROR') return { status: 'MISMATCH_ERROR', message: res.message };
        }
      } catch {
        // Fallback
      }
    }

    return this.beginFallback(params);
  }

  async commit(params: {
    idempotencyKey: string;
    statusCode: number;
    responseHeaders?: Record<string, any>;
    responseBody: any;
  }): Promise<void> {
    const existing = this.storeTable.get(params.idempotencyKey);
    if (existing) {
      this.storeTable.put(params.idempotencyKey, {
        ...existing,
        state: 'COMMITTED',
        statusCode: params.statusCode,
        responseHeaders: params.responseHeaders || null,
        responseBody: params.responseBody
      });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.rpc('fn_idempotency_commit', {
          p_idempotency_key: params.idempotencyKey,
          p_status_code: params.statusCode,
          p_response_headers: params.responseHeaders || {},
          p_response_body: params.responseBody
        });
      } catch {
        // Fallback
      }
    }
  }

  public get(idempotencyKey: string): IdempotencyRecord | null {
    return this.storeTable.get(idempotencyKey) || null;
  }

  public queryNatural(naturalQuery: string): IdempotencyRecord[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'idempotency_records');
    return this.storeTable.query(parsed.queryOptions) as IdempotencyRecord[];
  }

  private beginFallback(params: {
    idempotencyKey: string;
    userId: string;
    endpoint: string;
    requestHash: string;
    ttlMs?: number;
  }): IdempotencyBeginResult {
    const now = Date.now();
    const existing = this.storeTable.get(params.idempotencyKey);

    if (existing) {
      if (existing.requestHash !== params.requestHash) {
        return {
          status: 'MISMATCH_ERROR',
          message: 'Idempotency key reused with different request payload.'
        };
      }

      if (existing.state === 'COMMITTED') {
        return {
          status: 'CACHED',
          statusCode: existing.statusCode || 200,
          responseHeaders: existing.responseHeaders || undefined,
          responseBody: existing.responseBody
        };
      }

      if (existing.state === 'IN_FLIGHT' && existing.expiresAtMs > now) {
        return {
          status: 'IN_FLIGHT',
          message: 'A request with this idempotency key is currently in flight.'
        };
      }
    }

    this.storeTable.put(params.idempotencyKey, {
      id: params.idempotencyKey,
      userId: params.userId,
      endpoint: params.endpoint,
      requestHash: params.requestHash,
      state: 'IN_FLIGHT',
      statusCode: null,
      responseHeaders: null,
      responseBody: null,
      errorMessage: null,
      expiresAtMs: now + (params.ttlMs || 86400000),
      createdAtMs: now
    });

    return { status: 'STARTED' };
  }
}
