/**
 * GALXAI: Supabase Shard & Execution Lease Repository
 * Manages upstream provider API credentials, AES-256-GCM encrypted payloads,
 * atomic 2-phase reservation leases, and circuit state.
 */

import { getSupabaseAdmin, isSupabaseAdminConfigured } from '../client';
import { executePostgresQuery } from '../../db/postgres';
import type { Database } from '../types';
import type { GalxShardAccount, CredentialStatus, ProviderType, AuthType, ShardIsolationMode } from '../../../core/contracts/GalxContracts';

import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';
import { GalxCryptoVault } from '../../../core/vault/GalxCryptoVault';
import { ShardProjectionReader, type ShardProjectionRow } from './ShardProjectionReader';
import { APPLY_LEASE_HEALTH_TRANSITIONS_SQL, coalesceHealthTransitions, persistedHealthStatus, type LeaseHealthTransition } from '../../../core/pool/LeaseHealthTransition';

export class ShardAuthorityUnavailableError extends Error {
  constructor(operation: string, causes: string[] = []) {
    const detail = causes.length > 0 ? ` (${causes.join('; ')})` : '';
    super(`PostgreSQL shard authority could not ${operation}${detail}`);
    this.name = 'ShardAuthorityUnavailableError';
  }
}

export interface ShardAuthorityOptions {
  /** Reject instead of using the process-local projection when PostgreSQL is unavailable. */
  requireRemote?: boolean;
}

export class ShardRepository {
  private static instance: ShardRepository;
  private readonly inMemoryShards = new Map<string, GalxShardAccount>();
  private readonly shardTable: BroccoliDbTable<GalxShardAccount>;
  private readonly inMemoryLeases = new Map<string, any>();
  private readonly projection = new ShardProjectionReader();
  private usedRemoteAuthority = false;

  constructor() {
    this.shardTable = new BroccoliDbTable<GalxShardAccount>('shards');
    this.shardTable.createIndex('provider');
    this.shardTable.createIndex('status');
    this.shardTable.createIndex('userId');
    this.shardTable.createIndex('shardMode');
    this.shardTable.createSortedIndex('priority');
  }

  static getInstance(): ShardRepository {
    if (!ShardRepository.instance) {
      ShardRepository.instance = new ShardRepository();
    }
    return ShardRepository.instance;
  }

  public isAuthorityConfigured(): boolean {
    return Boolean(process.env.DATABASE_URL) || isSupabaseAdminConfigured();
  }

  private cacheShards(shards: GalxShardAccount[], replaceAll: boolean): void {
    if (replaceAll) {
      this.inMemoryShards.clear();
      this.shardTable.clear();
    }
    for (const shard of shards) {
      this.inMemoryShards.set(shard.id, shard);
      this.shardTable.put(shard.id, shard);
    }
  }

  private cacheShardStatus(shardId: string, status: CredentialStatus, cooldownUntilMs?: number): void {
    const shard = this.inMemoryShards.get(shardId) || this.shardTable.get(shardId);
    if (!shard) return;
    this.cacheShards([{
      ...shard,
      status,
      cooldownUntilMs,
      cooldownUntilTimestampMs: cooldownUntilMs,
      updatedAtMs: Date.now()
    }], false);
  }

  private parseProcedureResult(value: unknown): any {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async getShards(userId?: string, options: ShardAuthorityOptions = {}): Promise<GalxShardAccount[]> {
    const failures: string[] = [];
    if (userId !== undefined && !userId.trim()) throw new ShardAuthorityUnavailableError('load owner registry');
    if (this.isAuthorityConfigured()) {
      this.usedRemoteAuthority = true;
      try {
        const mapped = (await this.projection.read(userId)).map(row => this.mapRowToShard(row));
        if (userId !== undefined) {
          for (const shard of this.shardTable.query({ where: { userId } })) {
            this.inMemoryShards.delete(shard.id);
            this.shardTable.delete(shard.id);
          }
        }
        this.cacheShards(mapped, userId === undefined);
        return mapped;
      } catch {
        // A configured authority never falls back to potentially revoked local rows.
        throw new ShardAuthorityUnavailableError('load registry');
      }
    }

    if (options.requireRemote || this.usedRemoteAuthority) {
      if (!this.isAuthorityConfigured()) failures.push('DATABASE_URL/admin credential not configured');
      throw new ShardAuthorityUnavailableError('load registry', failures);
    }

    if (userId) {
      return this.shardTable.query({
        where: { userId: { $eq: userId } },
        sortBy: 'priority',
        sortOrder: 'desc'
      }) as GalxShardAccount[];
    }
    return this.shardTable.query({
      sortBy: 'priority',
      sortOrder: 'desc'
    }) as GalxShardAccount[];
  }

  async getShardById(id: string): Promise<GalxShardAccount | null> {
    // 0. In-Memory / BroccoliDB Hot Hit (<0.01ms)
    const local = this.inMemoryShards.get(id) || this.shardTable.get(id);
    if (local) return local;

    // 1. Direct PostgreSQL Connection Pool Query with Circuit Breaker (<1.5ms)
    const res = await executePostgresQuery('SELECT * FROM public.galx_shard_accounts WHERE id = $1 LIMIT 1;', [id]);
    if (res && res.rows && res.rows[0]) {
      const mapped = this.mapRowToShard(res.rows[0]);
      this.inMemoryShards.set(mapped.id, mapped);
      this.shardTable.put(mapped.id, mapped);
      return mapped;
    }

    // 2. Supabase PostgREST Fallback
    if (isSupabaseAdminConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_shard_accounts')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          const mapped = this.mapRowToShard(data);
          this.inMemoryShards.set(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.inMemoryShards.get(id) || null;
  }

  async saveShard(shard: GalxShardAccount, options: ShardAuthorityOptions = {}): Promise<GalxShardAccount> {
    const requireRemote = options.requireRemote ?? this.isAuthorityConfigured();
    const failures: string[] = [];
    const row = this.mapShardToRow(shard);

    if (!row.encrypted_ciphertext || !row.encrypted_iv || !row.encrypted_tag) {
      throw new Error('Shard credentials must be envelope-encrypted before registration');
    }

    const insertColumns = [
      'id', 'user_id', 'provider', 'auth_type', 'account_label', 'api_key_masked',
      'encrypted_ciphertext', 'encrypted_iv', 'encrypted_tag', 'key_version',
      'shard_mode', 'priority', 'weight', 'status', 'max_tokens', 'remaining_tokens',
      'reserved_tokens', 'refill_rate_per_minute', 'max_requests', 'remaining_requests',
      'last_refill_timestamp_ms', 'total_requests_served', 'total_tokens_consumed',
      'consecutive_failures', 'consecutive_successes', 'average_latency_ms',
      'last_latency_ms', 'fencing_token', 'permission_retracted', 'cooldown_until_ms',
      'created_at_ms', 'updated_at_ms', 'credential_expires_at_ms',
      'privacy_capabilities', 'sliding_window_quota', 'supported_models',
      'unsupported_models', 'registry_source'
    ] as const;
    const updateColumns = [
      'user_id', 'provider', 'auth_type', 'account_label', 'api_key_masked',
      'encrypted_ciphertext', 'encrypted_iv', 'encrypted_tag', 'key_version',
      'shard_mode', 'priority', 'weight', 'status', 'permission_retracted',
      'cooldown_until_ms', 'updated_at_ms', 'credential_expires_at_ms',
      'privacy_capabilities', 'sliding_window_quota', 'supported_models',
      'unsupported_models', 'registry_source'
    ] as const;
    const values = insertColumns.map(column => (row as any)[column] ?? null);
    const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
    const assignments = updateColumns.map(column => `${column} = EXCLUDED.${column}`).join(', ');

    // 1. Atomic PostgreSQL upsert. Dynamic SQL is assembled only from static column constants.
    const res = await executePostgresQuery(
      `INSERT INTO public.galx_shard_accounts (${insertColumns.join(', ')})
       VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${assignments}, updated_at = NOW()
       RETURNING *;`,
      values
    );

    if (res?.rows[0]) {
      const durableShard = this.mapRowToShard(res.rows[0]);
      this.cacheShards([durableShard], false);
      return durableShard;
    }
    if (process.env.DATABASE_URL) failures.push('pooled SQL upsert failed');

    // 2. Privileged PostgREST fallback through a server-side, counter-safe RPC.
    // A generic full-row PostgREST upsert could overwrite live lease counters
    // using a stale projection, so the database owns the conflict update list.
    if (isSupabaseAdminConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_upsert_shard_registry', {
          p_row: row
        });
        if (error) throw error;
        if (!data) throw new Error('upsert returned no durable row');
        const durableShard = this.mapRowToShard(data as any);
        this.cacheShards([durableShard], false);
        return durableShard;
      } catch (error: any) {
        failures.push(`admin API upsert failed: ${error?.code || error?.name || 'unknown'}`);
      }
    }

    if (requireRemote) {
      if (!this.isAuthorityConfigured()) failures.push('DATABASE_URL/admin credential not configured');
      throw new ShardAuthorityUnavailableError('persist registry mutation', failures);
    }

    // Explicitly ephemeral mode is reserved for isolated tests and local simulations.
    this.cacheShards([shard], false);
    return shard;
  }

  async deleteShard(shardId: string, options: ShardAuthorityOptions = {}): Promise<void> {
    const requireRemote = options.requireRemote ?? this.isAuthorityConfigured();
    const failures: string[] = [];
    const direct = await executePostgresQuery(
      'DELETE FROM public.galx_shard_accounts WHERE id = $1 RETURNING id;',
      [shardId]
    );
    if (direct) {
      this.inMemoryShards.delete(shardId);
      this.shardTable.delete(shardId);
      return;
    }
    if (process.env.DATABASE_URL) failures.push('pooled SQL delete failed');

    if (isSupabaseAdminConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from('galx_shard_accounts').delete().eq('id', shardId);
        if (error) throw error;
        this.inMemoryShards.delete(shardId);
        this.shardTable.delete(shardId);
        return;
      } catch (error: any) {
        failures.push(`admin API delete failed: ${error?.code || error?.name || 'unknown'}`);
      }
    }

    if (requireRemote) throw new ShardAuthorityUnavailableError('delete registry entry', failures);
    this.inMemoryShards.delete(shardId);
    this.shardTable.delete(shardId);
  }

  async updateShardStatus(
    shardId: string,
    status: CredentialStatus,
    cooldownUntilMs?: number
  ): Promise<void> {
    const failures: string[] = [];
    const now = Date.now();
    const res = await executePostgresQuery(
      `UPDATE public.galx_shard_accounts
       SET status = $2::galx_credential_status, cooldown_until_ms = $3, updated_at_ms = $4, updated_at = NOW()
       WHERE id = $1
       RETURNING id;`,
      [shardId, status, cooldownUntilMs || null, now]
    );

    if (res) {
      this.cacheShardStatus(shardId, status, cooldownUntilMs);
      return;
    }
    if (process.env.DATABASE_URL) failures.push('pooled SQL status update failed');

    if (isSupabaseAdminConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase
          .from('galx_shard_accounts')
          .update({
            status,
            cooldown_until_ms: cooldownUntilMs || null,
            updated_at_ms: now
          })
          .eq('id', shardId);
        if (error) throw error;
        this.cacheShardStatus(shardId, status, cooldownUntilMs);
        return;
      } catch (error: any) {
        failures.push(`admin API status update failed: ${error?.code || error?.name || 'unknown'}`);
      }
    }

    if (this.isAuthorityConfigured()) {
      throw new ShardAuthorityUnavailableError('update shard status', failures);
    }
    this.cacheShardStatus(shardId, status, cooldownUntilMs);
  }

  async updateShardStatusBatch(
    transitions: Array<{ shardId: string; status: CredentialStatus; cooldownUntilMs?: number }>
  ): Promise<void> {
    if (transitions.length === 0) return;
    const now = Date.now();
    const ids = transitions.map(t => t.shardId);
    const statuses = transitions.map(t => t.status);
    const cooldowns = transitions.map(t => t.cooldownUntilMs || 0);

    const res = await executePostgresQuery(
      `UPDATE public.galx_shard_accounts AS s
       SET
         status = c.status::galx_credential_status,
         cooldown_until_ms = NULLIF(c.cooldown_ms, 0),
         updated_at_ms = $4,
         updated_at = NOW()
       FROM UNNEST($1::text[], $2::text[], $3::bigint[]) AS c(id, status, cooldown_ms)
       WHERE s.id = c.id;`,
      [ids, statuses, cooldowns, now]
    );

    if (res) {
      for (const t of transitions) this.cacheShardStatus(t.shardId, t.status, t.cooldownUntilMs);
      return;
    }

    if (isSupabaseAdminConfigured()) {
      for (const t of transitions) {
        await this.updateShardStatus(t.shardId, t.status, t.cooldownUntilMs);
      }
      return;
    }

    if (this.isAuthorityConfigured()) {
      throw new ShardAuthorityUnavailableError('update shard status batch', ['pooled SQL batch update failed']);
    }
    for (const t of transitions) this.cacheShardStatus(t.shardId, t.status, t.cooldownUntilMs);
  }

  /** Automatic observations must not use the unconditional operator status API. */
  async applyLeaseHealthTransitions(items: LeaseHealthTransition[]): Promise<void> {
    const transitions = coalesceHealthTransitions(items);
    if (!transitions.length) return;
    const direct = await executePostgresQuery(APPLY_LEASE_HEALTH_TRANSITIONS_SQL, [
      transitions.map(t => t.shardId), transitions.map(t => persistedHealthStatus(t.status)),
      transitions.map(t => t.cooldownUntilMs || 0), transitions.map(t => t.fencingToken),
      transitions.map(t => t.expectedRegistryRevision)
    ]);
    if (direct) return; // A stale observation is a successful no-op, not a retry.
    if (isSupabaseAdminConfigured()) {
      for (const t of transitions) {
        const { error } = await getSupabaseAdmin().from('galx_shard_accounts').update({
          status: persistedHealthStatus(t.status) as CredentialStatus,
          cooldown_until_ms: t.cooldownUntilMs || null,
          updated_at_ms: Date.now()
        }).eq('id', t.shardId).eq('registry_revision', t.expectedRegistryRevision!)
          .eq('fencing_token', t.fencingToken!).eq('permission_retracted', false)
          .not('status', 'in', '(paused,revoked,dead)');
        if (error) throw new ShardAuthorityUnavailableError('apply fenced health observation', [error.code]);
      }
      return;
    }
    if (this.isAuthorityConfigured()) throw new ShardAuthorityUnavailableError('apply fenced health observations');
  }

  async acquireLease(params: {
    shardId: string;
    userId: string;
    estimatedTokens?: number;
    leaseTtlMs?: number;
    jobId: string;
  }): Promise<{
    success: boolean;
    leaseId?: string;
    fencingToken?: number;
    reason?: string;
    retryAtMs?: number;
    healthRevision?: number;
    expiresAtMs?: number;
    remainingTokens?: number;
    reservedTokens?: number;
    remainingRequests?: number;
  }> {
    const now = Date.now();
    const estimatedTokens = params.estimatedTokens || 2000;
    const leaseTtlMs = params.leaseTtlMs || 120000;
    const failures: string[] = [];

    if (process.env.DATABASE_URL) {
      const direct = await executePostgresQuery(
        `SELECT public.fn_acquire_shard_lease(
          $1::varchar, $2::varchar, $3::bigint, $4::bigint, $5::varchar, $6::bigint
        ) AS result;`,
        [params.shardId, params.userId, estimatedTokens, leaseTtlMs, params.jobId, null]
      );
      const result = this.parseProcedureResult(direct?.rows[0]?.result);
      if (result) {
        return result.success
          ? {
              success: true,
              leaseId: result.lease_id,
              fencingToken: Number(result.fencing_token),
              healthRevision: Number(result.health_revision) || undefined,
              expiresAtMs: Number(result.expires_at_ms),
              remainingTokens: Number(result.remaining_tokens),
              reservedTokens: Number(result.reserved_tokens),
              remainingRequests: Number(result.remaining_requests)
            }
          : { success: false, reason: result.reason || 'LEASE_REJECTED', retryAtMs: Number(result.retry_at_ms) || undefined };
      }
      failures.push('pooled SQL lease acquisition failed');
    }

    if (isSupabaseAdminConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_acquire_shard_lease', {
          p_shard_id: params.shardId,
          p_user_id: params.userId,
          p_estimated_tokens: estimatedTokens,
          p_lease_ttl_ms: leaseTtlMs,
          p_job_id: params.jobId
        });
        if (error) throw error;
        const result = this.parseProcedureResult(data);
        if (!result) throw new Error('lease procedure returned no decision');
        return result.success
          ? {
              success: true,
              leaseId: result.lease_id,
              fencingToken: Number(result.fencing_token),
              healthRevision: Number(result.health_revision) || undefined,
              expiresAtMs: Number(result.expires_at_ms),
              remainingTokens: Number(result.remaining_tokens),
              reservedTokens: Number(result.reserved_tokens),
              remainingRequests: Number(result.remaining_requests)
            }
          : { success: false, reason: result.reason || 'LEASE_REJECTED', retryAtMs: Number(result.retry_at_ms) || undefined };
      } catch (error: any) {
        failures.push(`admin API lease acquisition failed: ${error?.code || error?.name || 'unknown'}`);
      }
    }

    if (this.isAuthorityConfigured()) {
      return { success: false, reason: `AUTHORITY_UNAVAILABLE: ${failures.join('; ')}` };
    }
    return this.acquireLeaseFallback(params);
  }

  async extendLease(params: {
    leaseId: string;
    fencingToken: number;
    extensionMs?: number;
  }): Promise<{ success: boolean; expiresAtMs?: number; reason?: string }> {
    const now = Date.now();
    const extensionMs = params.extensionMs || 120_000;
    const failures: string[] = [];

    if (process.env.DATABASE_URL) {
      const direct = await executePostgresQuery(
        `SELECT public.fn_extend_shard_lease(
          $1::varchar, $2::bigint, $3::bigint, $4::bigint
        ) AS result;`,
        [params.leaseId, params.fencingToken, extensionMs, now]
      );
      const result = this.parseProcedureResult(direct?.rows[0]?.result);
      if (result) {
        return result.success
          ? { success: true, expiresAtMs: Number(result.expires_at_ms) }
          : { success: false, reason: result.reason || 'LEASE_EXTENSION_REJECTED' };
      }
      failures.push('pooled SQL lease extension failed');
    }

    if (isSupabaseAdminConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_extend_shard_lease', {
          p_lease_id: params.leaseId,
          p_fencing_token: params.fencingToken,
          p_extension_ms: extensionMs,
          p_now_ms: now
        });
        if (error) throw error;
        const result = this.parseProcedureResult(data);
        if (!result) throw new Error('lease extension procedure returned no decision');
        return result.success
          ? { success: true, expiresAtMs: Number(result.expires_at_ms) }
          : { success: false, reason: result.reason || 'LEASE_EXTENSION_REJECTED' };
      } catch (error: any) {
        failures.push(`admin API lease extension failed: ${error?.code || error?.name || 'unknown'}`);
      }
    }

    if (this.isAuthorityConfigured()) {
      return { success: false, reason: `AUTHORITY_UNAVAILABLE: ${failures.join('; ')}` };
    }
    const lease = this.inMemoryLeases.get(params.leaseId);
    if (!lease || lease.isCommitted || lease.isReclaimed) {
      return { success: false, reason: 'LEASE_INACTIVE' };
    }
    if (lease.fencingToken !== params.fencingToken) {
      return { success: false, reason: 'FENCING_TOKEN_MISMATCH' };
    }
    lease.expiresAtMs = Math.max(lease.expiresAtMs, now + extensionMs);
    return { success: true, expiresAtMs: lease.expiresAtMs };
  }

  async releaseLease(params: {
    leaseId: string;
    actualTokens?: number;
    latencyMs?: number;
    success?: boolean | null;
  }): Promise<{ success: boolean; committedTokens?: number; reason?: string }> {
    const now = Date.now();
    const failures: string[] = [];

    if (process.env.DATABASE_URL) {
      const direct = await executePostgresQuery(
        `SELECT public.fn_release_shard_lease(
          $1::varchar, $2::bigint, $3::numeric, $4::boolean, $5::bigint
        ) AS result;`,
        [
          params.leaseId,
          params.actualTokens ?? null,
          params.latencyMs ?? null,
          params.success === undefined ? true : params.success,
          null
        ]
      );
      const result = this.parseProcedureResult(direct?.rows[0]?.result);
      if (result) {
        return result.success
          ? { success: true, committedTokens: Number(result.committed_tokens), reason: result.reason }
          : { success: false, reason: result.reason || 'LEASE_RELEASE_REJECTED' };
      }
      failures.push('pooled SQL lease release failed');
    }

    if (isSupabaseAdminConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_release_shard_lease', {
          p_lease_id: params.leaseId,
          p_actual_tokens: params.actualTokens ?? undefined,
          p_latency_ms: params.latencyMs ?? undefined,
          p_success: params.success === undefined ? true : params.success
        });
        if (error) throw error;
        const result = this.parseProcedureResult(data);
        if (!result) throw new Error('lease release procedure returned no decision');
        return result.success
          ? { success: true, committedTokens: Number(result.committed_tokens), reason: result.reason }
          : { success: false, reason: result.reason || 'LEASE_RELEASE_REJECTED' };
      } catch (error: any) {
        failures.push(`admin API lease release failed: ${error?.code || error?.name || 'unknown'}`);
      }
    }

    if (this.isAuthorityConfigured()) {
      return { success: false, reason: `AUTHORITY_UNAVAILABLE: ${failures.join('; ')}` };
    }
    return this.releaseLeaseFallback(params);
  }

  async scavengeExpiredLeases(): Promise<number> {
    const now = Date.now();
    const failures: string[] = [];

    if (process.env.DATABASE_URL) {
      const direct = await executePostgresQuery(
        'SELECT public.fn_cleanup_expired_leases($1::bigint) AS reclaimed;',
        [now]
      );
      if (direct?.rows[0] && direct.rows[0].reclaimed !== undefined) {
        return Number(direct.rows[0].reclaimed);
      }
      failures.push('pooled SQL lease scavenger failed');
    }

    if (isSupabaseAdminConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_cleanup_expired_leases', {
          p_now_ms: now
        });
        if (error) throw error;
        if (typeof data !== 'number') throw new Error('lease scavenger returned no count');
        return data;
      } catch (error: any) {
        failures.push(`admin API lease scavenger failed: ${error?.code || error?.name || 'unknown'}`);
      }
    }

    if (this.isAuthorityConfigured()) {
      throw new ShardAuthorityUnavailableError('scavenge expired leases', failures);
    }
    let reclaimed = 0;
    for (const [id, lease] of this.inMemoryLeases.entries()) {
      if (lease.expiresAtMs < now && !lease.isCommitted && !lease.isReclaimed) {
        lease.isReclaimed = true;
        reclaimed++;
      }
    }
    return reclaimed;
  }

  private async acquireLeaseFallback(params: {
    shardId: string;
    userId: string;
    estimatedTokens?: number;
    leaseTtlMs?: number;
    jobId: string;
  }): Promise<{
    success: boolean;
    leaseId?: string;
    fencingToken?: number;
    reason?: string;
    expiresAtMs?: number;
    remainingTokens?: number;
    reservedTokens?: number;
    remainingRequests?: number;
  }> {
    const shard = await this.getShardById(params.shardId);
    if (!shard) return { success: false, reason: 'SHARD_NOT_FOUND' };
    if (shard.status !== 'healthy') return { success: false, reason: 'SHARD_NOT_HEALTHY' };

    const now = Date.now();
    const expiresAtMs = now + (params.leaseTtlMs || 120000);
    const fencingToken = (shard.fencingToken || 1) + 1;
    const leaseId = `lease_${now}_${Math.random().toString(36).substring(2, 9)}`;

    const updatedShard: GalxShardAccount = {
      ...shard,
      fencingToken,
      tokenBucket: {
        ...shard.tokenBucket,
        reservedTokens: (shard.tokenBucket.reservedTokens || 0) + (params.estimatedTokens || 2000)
      },
      updatedAtMs: now
    };

    this.inMemoryShards.set(params.shardId, updatedShard);
    this.inMemoryLeases.set(leaseId, {
      id: leaseId,
      shardId: params.shardId,
      userId: params.userId,
      fencingToken,
      estimatedTokens: params.estimatedTokens || 2000,
      expiresAtMs,
      isCommitted: false,
      isReclaimed: false
    });

    return {
      success: true,
      leaseId,
      fencingToken,
      expiresAtMs
    };
  }

  private async releaseLeaseFallback(params: {
    leaseId: string;
    actualTokens?: number;
    latencyMs?: number;
    success?: boolean | null;
  }): Promise<{ success: boolean; committedTokens?: number; reason?: string }> {
    const lease = this.inMemoryLeases.get(params.leaseId);
    if (lease) {
      lease.isCommitted = true;
      lease.committedTokens = params.actualTokens || lease.estimatedTokens;
    }
    return { success: true, committedTokens: params.actualTokens || lease?.estimatedTokens || 2000 };
  }

  private mapRowToShard(data: ShardProjectionRow): GalxShardAccount {
    const payload = {
      ciphertext: data.encrypted_ciphertext,
      iv: data.encrypted_iv,
      tag: data.encrypted_tag,
      keyVersion: data.key_version || 'v1'
    };
    let protectedMetadata: { accountId?: string; expiresAtMs?: number } = {};
    try {
      const decrypted = GalxCryptoVault.decryptSecret(
        payload,
        data.user_id,
        data.id,
        data.provider as ProviderType
      );
      protectedMetadata = {
        accountId: decrypted.accountId,
        expiresAtMs: decrypted.expiresAtMs
      };
    } catch {
      // Decryption remains a dispatch-time hard failure. Registry metadata can
      // still be projected for revocation and remediation workflows.
    }

    return {
      id: data.id,
      userId: data.user_id,
      provider: data.provider as ProviderType,
      authType: data.auth_type as AuthType,
      accountLabel: data.account_label,
      apiKeyMasked: data.api_key_masked,
      encryptedPayload: payload,
      encryptedSecrets: payload,
      shardMode: data.shard_mode as ShardIsolationMode,
      priority: data.priority,
      weight: data.weight,
      status: data.status as CredentialStatus,
      tokenBucket: {
        maxTokens: Number(data.max_tokens),
        remainingTokens: Number(data.remaining_tokens),
        reservedTokens: Number(data.reserved_tokens),
        refillRatePerMinute: Number(data.refill_rate_per_minute),
        maxRequests: data.max_requests,
        remainingRequests: data.remaining_requests,
        lastRefillTimestampMs: Number(data.last_refill_timestamp_ms)
      },
      stats: {
        totalRequestsServed: Number(data.total_requests_served),
        totalTokensConsumed: Number(data.total_tokens_consumed),
        consecutiveFailures: data.consecutive_failures,
        consecutiveSuccesses: data.consecutive_successes,
        averageLatencyMs: Number(data.average_latency_ms),
        lastLatencyMs: data.last_latency_ms ? Number(data.last_latency_ms) : undefined
      },
      fencingToken: Number(data.fencing_token),
      permissionRetracted: data.permission_retracted,
      accountId: protectedMetadata.accountId,
      expiresAtMs: data.credential_expires_at_ms
        ? Number(data.credential_expires_at_ms)
        : protectedMetadata.expiresAtMs,
      privacyCapabilities: (data.privacy_capabilities || undefined) as any,
      slidingWindowQuota: (data.sliding_window_quota || undefined) as any,
      supportedModels: data.supported_models || undefined,
      unsupportedModels: data.unsupported_models || undefined,
      registryRevision: Number(data.registry_revision || 1),
      registrySource: data.registry_source as GalxShardAccount['registrySource'],
      cooldownUntilMs: data.cooldown_until_ms ? Number(data.cooldown_until_ms) : undefined,
      cooldownUntilTimestampMs: data.cooldown_until_ms ? Number(data.cooldown_until_ms) : undefined,
      createdAtMs: Number(data.created_at_ms) || new Date(data.created_at).getTime(),
      updatedAtMs: Number(data.updated_at_ms) || new Date(data.updated_at).getTime()
    };
  }

  private mapShardToRow(shard: GalxShardAccount): Database['public']['Tables']['galx_shard_accounts']['Insert'] {
    const enc = shard.encryptedPayload || shard.encryptedSecrets || {
      ciphertext: '',
      iv: '',
      tag: '',
      keyVersion: 'v1'
    };

    return {
      id: shard.id,
      user_id: shard.userId,
      provider: shard.provider,
      auth_type: shard.authType || 'api_key',
      account_label: shard.accountLabel,
      api_key_masked: shard.apiKeyMasked,
      encrypted_ciphertext: enc.ciphertext,
      encrypted_iv: enc.iv,
      encrypted_tag: enc.tag,
      key_version: enc.keyVersion || 'v1',
      shard_mode: shard.shardMode || 'pooled',
      priority: shard.priority,
      weight: shard.weight,
      status: shard.status,
      max_tokens: shard.tokenBucket?.maxTokens ?? 10000000,
      remaining_tokens: shard.tokenBucket?.remainingTokens ?? 10000000,
      reserved_tokens: shard.tokenBucket?.reservedTokens ?? 0,
      refill_rate_per_minute: shard.tokenBucket?.refillRatePerMinute ?? 10000000,
      max_requests: shard.tokenBucket?.maxRequests ?? 10000,
      remaining_requests: shard.tokenBucket?.remainingRequests ?? 10000,
      last_refill_timestamp_ms: shard.tokenBucket?.lastRefillTimestampMs ?? 0,
      total_requests_served: shard.stats?.totalRequestsServed ?? 0,
      total_tokens_consumed: shard.stats?.totalTokensConsumed ?? 0,
      consecutive_failures: shard.stats?.consecutiveFailures ?? 0,
      consecutive_successes: shard.stats?.consecutiveSuccesses ?? 0,
      average_latency_ms: shard.stats?.averageLatencyMs ?? 250,
      last_latency_ms: shard.stats?.lastLatencyMs ?? null,
      fencing_token: shard.fencingToken ?? 1,
      permission_retracted: shard.permissionRetracted ?? false,
      cooldown_until_ms: shard.cooldownUntilMs ?? shard.cooldownUntilTimestampMs ?? null,
      credential_expires_at_ms: shard.expiresAtMs ?? null,
      privacy_capabilities: (shard.privacyCapabilities || {}) as any,
      sliding_window_quota: (shard.slidingWindowQuota || {}) as any,
      supported_models: shard.supportedModels || null,
      unsupported_models: shard.unsupportedModels || null,
      registry_source: shard.registrySource || 'api',
      created_at_ms: shard.createdAtMs,
      updated_at_ms: shard.updatedAtMs
    };
  }
}
