/**
 * GALXAI: BroccoliDB Authoritative Governor & Circuit Breaker Mesh
 * 
 * Features:
 * 1. Circuit Breaker: Prevents infinite retry loops & fallover cascades by failing fast to BroccoliDB L1.
 * 2. Leaky Bucket Outbound Governor: Limits outbound Supabase queries to prevent runaway billing overages.
 * 3. Cemented Postgres Authority: Maintains cryptographic Merkle epochs where Postgres is the ultimate ruler.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { BroccoliDbTable } from './broccolidb-table';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface AuthoritativeEpochRecord {
  id: string; // `${entityType}:${entityId}`
  entityType: string;
  entityId: string;
  versionEpoch: number;
  merkleRootHash: string;
  lastAuthoritativeWriteAt: number;
}

export class BroccoliAuthoritativeGovernor {
  private static instance: BroccoliAuthoritativeGovernor;

  // Circuit Breaker State
  private circuitState: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private readonly failureThreshold = 5;
  private readonly circuitCooldownMs = 10000; // 10s cooldown
  private lastOpenedAt = 0;

  // Leaky Bucket Rate Governor
  private readonly maxTokens = 50; // max 50 queries/sec
  private tokens = 50;
  private lastRefillTimestamp = Date.now();
  private readonly refillRatePerMs = 50 / 1000; // 50 tokens / 1000ms

  // Local Authoritative Merkle Epoch Table
  private readonly epochTable: BroccoliDbTable<AuthoritativeEpochRecord>;

  private constructor() {
    this.epochTable = new BroccoliDbTable<AuthoritativeEpochRecord>('galx_authoritative_epochs');
    this.epochTable.createIndex('entityType');
  }

  public static getInstance(): BroccoliAuthoritativeGovernor {
    if (!BroccoliAuthoritativeGovernor.instance) {
      BroccoliAuthoritativeGovernor.instance = new BroccoliAuthoritativeGovernor();
    }
    return BroccoliAuthoritativeGovernor.instance;
  }

  /**
   * Refills leaky bucket tokens
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTimestamp;
    this.tokens = Math.min(this.maxTokens, this.tokens + (elapsed * this.refillRatePerMs));
    this.lastRefillTimestamp = now;
  }

  /**
   * Checks whether an outbound query to Supabase is permitted by Circuit Breaker and Token Governor
   */
  public canExecuteOutboundQuery(): boolean {
    const now = Date.now();

    // Check circuit breaker
    if (this.circuitState === 'OPEN') {
      if (now - this.lastOpenedAt >= this.circuitCooldownMs) {
        this.circuitState = 'HALF_OPEN';
      } else {
        return false; // Trip: Fail-fast to local BroccoliDB
      }
    }

    // Check leaky bucket
    this.refillTokens();
    if (this.tokens < 1.0) {
      return false; // Rate-limited: Prevents runaway server overages
    }

    this.tokens -= 1.0;
    return true;
  }

  /**
   * Records a successful Supabase operation
   */
  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.circuitState === 'HALF_OPEN') {
      this.circuitState = 'CLOSED';
    }
  }

  /**
   * Records a Supabase query error/timeout, tripping the circuit breaker if threshold exceeded
   */
  public recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.circuitState = 'OPEN';
      this.lastOpenedAt = Date.now();
    }
  }

  /**
   * Validates if local BroccoliDB cached epoch matches the cemented Postgres authoritative epoch
   */
  public async isLocalEpochAuthoritative(entityType: string, entityId: string): Promise<boolean> {
    const key = `${entityType}:${entityId}`;
    const local = this.epochTable.get(key);
    const localEpoch = local ? local.versionEpoch : 0;

    if (!this.canExecuteOutboundQuery() || !isSupabaseConfigured()) {
      return true; // Fallback: Treat BroccoliDB local state as valid while origin is governed/tripped
    }

    try {
      const supabase = getSupabaseAdmin() as any;
      const { data, error } = await supabase.rpc('rpc_validate_authoritative_data_epoch', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_client_epoch: localEpoch
      });

      if (!error && data) {
        this.recordSuccess();
        if (data.is_authoritative_current) {
          return true;
        }

        // Advance local epoch if server has newer authoritative version
        this.epochTable.put(key, {
          id: key,
          entityType,
          entityId,
          versionEpoch: data.server_epoch,
          merkleRootHash: data.merkle_hash,
          lastAuthoritativeWriteAt: Date.now()
        });
        return false;
      }
    } catch (err) {
      this.recordFailure();
    }

    return true;
  }

  /**
   * Advances the cemented Postgres authoritative epoch and writes through to BroccoliDB L1
   */
  public async advanceAuthoritativeEpoch(entityType: string, entityId: string, merkleHash: string): Promise<AuthoritativeEpochRecord> {
    const key = `${entityType}:${entityId}`;
    let serverEpoch = 1;

    if (isSupabaseConfigured() && this.canExecuteOutboundQuery()) {
      try {
        const supabase = getSupabaseAdmin() as any;
        const { data, error } = await supabase.rpc('rpc_advance_authoritative_epoch', {
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_new_merkle_hash: merkleHash
        });

        if (!error && data && data.success) {
          this.recordSuccess();
          serverEpoch = Number(data.version_epoch);
        }
      } catch (err) {
        this.recordFailure();
      }
    }

    const record: AuthoritativeEpochRecord = {
      id: key,
      entityType,
      entityId,
      versionEpoch: serverEpoch,
      merkleRootHash: merkleHash,
      lastAuthoritativeWriteAt: Date.now()
    };

    this.epochTable.put(key, record);
    return record;
  }

  /**
   * Returns current governor health and circuit state
   */
  public getGovernorState() {
    this.refillTokens();
    return {
      circuitState: this.circuitState,
      consecutiveFailures: this.consecutiveFailures,
      availableTokens: Number(this.tokens.toFixed(2)),
      maxTokens: this.maxTokens
    };
  }
}

export const authoritativeGovernor = BroccoliAuthoritativeGovernor.getInstance();
