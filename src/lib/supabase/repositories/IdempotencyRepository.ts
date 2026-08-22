/**
 * GALXAI: Supabase Stripe-Grade Idempotency Engine Repository
 * Manages request deduplication, in-flight status locks, response caching, and payload hashing.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database, GalxIdempotencyState } from '../types';

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
  private readonly inMemoryStore = new Map<string, IdempotencyRecord>();

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
    const existing = this.inMemoryStore.get(params.idempotencyKey);
    if (existing) {
      existing.state = 'COMMITTED';
      existing.statusCode = params.statusCode;
      existing.responseHeaders = params.responseHeaders || null;
      existing.responseBody = params.responseBody;
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

  private beginFallback(params: {
    idempotencyKey: string;
    userId: string;
    endpoint: string;
    requestHash: string;
    ttlMs?: number;
  }): IdempotencyBeginResult {
    const now = Date.now();
    const existing = this.inMemoryStore.get(params.idempotencyKey);

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

    this.inMemoryStore.set(params.idempotencyKey, {
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
