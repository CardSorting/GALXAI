/**
 * GALXAI: Supabase PostgreSQL Distributed Advisory Lock Repository + BroccoliDB Hot Table
 * Worker mutexes, lease heartbeats, and monotonic fencing tokens for split-brain prevention.
 * Backed by BroccoliDB L1 reactive table with secondary indexing.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';

export interface DistributedLockRecord {
  id?: string;
  lockKey: string;
  ownerId: string;
  fencingToken: number;
  acquiredAtMs: number;
  expiresAtMs: number;
}

export class DistributedLockRepository {
  private static instance: DistributedLockRepository;
  public readonly lockTable: BroccoliDbTable<DistributedLockRecord>;

  private constructor() {
    this.lockTable = new BroccoliDbTable<DistributedLockRecord>('distributed_locks');
    this.lockTable.createIndex('lockKey');
    this.lockTable.createIndex('ownerId');
    this.lockTable.createSortedIndex('expiresAtMs');
    this.lockTable.createSortedIndex('fencingToken');
  }

  static getInstance(): DistributedLockRepository {
    if (!DistributedLockRepository.instance) {
      DistributedLockRepository.instance = new DistributedLockRepository();
    }
    return DistributedLockRepository.instance;
  }

  async acquireLock(params: {
    lockKey: string;
    ownerId: string;
    ttlMs?: number;
  }): Promise<{
    acquired: boolean;
    lockKey: string;
    ownerId?: string;
    fencingToken?: number;
    expiresAtMs?: number;
    reason?: string;
  }> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_acquire_distributed_lock', {
          p_lock_key: params.lockKey,
          p_owner_id: params.ownerId,
          p_ttl_ms: params.ttlMs || 30000,
          p_now_ms: Date.now()
        });

        if (!error && data) {
          const res = data as any;
          return {
            acquired: res.acquired,
            lockKey: params.lockKey,
            ownerId: res.owner_id,
            fencingToken: res.fencing_token,
            expiresAtMs: res.expires_at_ms,
            reason: res.reason
          };
        }
      } catch {
        // Fallback
      }
    }

    return this.acquireLockFallback(params);
  }

  async releaseLock(params: {
    lockKey: string;
    ownerId: string;
    fencingToken?: number;
  }): Promise<boolean> {
    const existing = this.lockTable.get(params.lockKey);
    if (existing && existing.ownerId === params.ownerId) {
      if (!params.fencingToken || existing.fencingToken === params.fencingToken) {
        this.lockTable.put(params.lockKey, {
          ...existing,
          expiresAtMs: 0
        });
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_release_distributed_lock', {
          p_lock_key: params.lockKey,
          p_owner_id: params.ownerId,
          p_fencing_token: params.fencingToken || undefined
        });

        if (!error && typeof data === 'boolean') {
          return data;
        }
      } catch {
        // Fallback
      }
    }

    return true;
  }

  private acquireLockFallback(params: {
    lockKey: string;
    ownerId: string;
    ttlMs?: number;
  }) {
    const now = Date.now();
    const existing = this.lockTable.get(params.lockKey);

    if (existing && existing.expiresAtMs > now && existing.ownerId !== params.ownerId) {
      return {
        acquired: false,
        lockKey: params.lockKey,
        reason: 'LOCK_HELD_BY_ANOTHER_OWNER',
        expiresAtMs: existing.expiresAtMs
      };
    }

    const newFencing = existing ? existing.fencingToken + 1 : 1;
    const expiresAtMs = now + (params.ttlMs || 30000);

    const record: DistributedLockRecord = {
      id: params.lockKey,
      lockKey: params.lockKey,
      ownerId: params.ownerId,
      fencingToken: newFencing,
      acquiredAtMs: now,
      expiresAtMs
    };
    this.lockTable.put(params.lockKey, record);

    return {
      acquired: true,
      lockKey: params.lockKey,
      ownerId: params.ownerId,
      fencingToken: newFencing,
      expiresAtMs
    };
  }
}
