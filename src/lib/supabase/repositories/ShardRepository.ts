/**
 * GALXAI: Supabase Shard & Execution Lease Repository
 * Manages upstream provider API credentials, AES-256-GCM encrypted payloads,
 * atomic 2-phase reservation leases, and circuit state.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';
import type { GalxShardAccount, CredentialStatus, ProviderType, AuthType, ShardIsolationMode } from '../../../core/contracts/GalxContracts';

import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';

export class ShardRepository {
  private static instance: ShardRepository;
  private readonly inMemoryShards = new Map<string, GalxShardAccount>();
  private readonly shardTable: BroccoliDbTable<GalxShardAccount>;
  private readonly inMemoryLeases = new Map<string, any>();

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

  async getShards(userId?: string): Promise<GalxShardAccount[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        let query = supabase.from('galx_shard_accounts').select('*').order('priority', { ascending: false });

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const mapped = data.map(this.mapRowToShard);
          for (const s of mapped) {
            this.inMemoryShards.set(s.id, s);
            this.shardTable.put(s.id, s);
          }
          return mapped;
        }
      } catch {
        // Fallback
      }
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
    if (isSupabaseConfigured()) {
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

  async saveShard(shard: GalxShardAccount): Promise<void> {
    this.inMemoryShards.set(shard.id, shard);
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const row = this.mapShardToRow(shard);
        await supabase.from('galx_shard_accounts').upsert(row, { onConflict: 'id' });
      } catch {
        // Fallback
      }
    }
  }

  async deleteShard(shardId: string): Promise<void> {
    this.inMemoryShards.delete(shardId);
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_shard_accounts').delete().eq('id', shardId);
      } catch {
        // Fallback
      }
    }
  }

  async updateShardStatus(
    shardId: string,
    status: CredentialStatus,
    cooldownUntilMs?: number
  ): Promise<void> {
    const shard = this.inMemoryShards.get(shardId);
    if (shard) {
      this.inMemoryShards.set(shardId, {
        ...shard,
        status,
        cooldownUntilMs,
        cooldownUntilTimestampMs: cooldownUntilMs,
        updatedAtMs: Date.now()
      });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('galx_shard_accounts')
          .update({
            status,
            cooldown_until_ms: cooldownUntilMs || null,
            updated_at_ms: Date.now()
          })
          .eq('id', shardId);
      } catch {
        // Fallback
      }
    }
  }

  async acquireLease(params: {
    shardId: string;
    userId: string;
    estimatedTokens?: number;
    leaseTtlMs?: number;
    jobId?: string;
  }): Promise<{ success: boolean; leaseId?: string; fencingToken?: number; reason?: string; expiresAtMs?: number }> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_acquire_shard_lease', {
          p_shard_id: params.shardId,
          p_user_id: params.userId,
          p_estimated_tokens: params.estimatedTokens || 2000,
          p_lease_ttl_ms: params.leaseTtlMs || 120000,
          p_job_id: params.jobId || undefined,
          p_now_ms: Date.now()
        });

        if (!error && data) {
          const res = data as any;
          if (res.success) {
            return {
              success: true,
              leaseId: res.lease_id,
              fencingToken: res.fencing_token,
              expiresAtMs: res.expires_at_ms
            };
          }
          return { success: false, reason: res.reason };
        }
      } catch {
        // Fallback
      }
    }

    return this.acquireLeaseFallback(params);
  }

  async releaseLease(params: {
    leaseId: string;
    actualTokens?: number;
    latencyMs?: number;
    success?: boolean;
  }): Promise<{ success: boolean; committedTokens?: number; reason?: string }> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_release_shard_lease', {
          p_lease_id: params.leaseId,
          p_actual_tokens: params.actualTokens || undefined,
          p_latency_ms: params.latencyMs || undefined,
          p_success: params.success !== false,
          p_now_ms: Date.now()
        });

        if (!error && data) {
          const res = data as any;
          return {
            success: res.success,
            committedTokens: res.committed_tokens,
            reason: res.reason
          };
        }
      } catch {
        // Fallback
      }
    }

    return this.releaseLeaseFallback(params);
  }

  async scavengeExpiredLeases(): Promise<number> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_cleanup_expired_leases', {
          p_now_ms: Date.now()
        });

        if (!error && typeof data === 'number') return data;
      } catch {
        // Fallback
      }
    }

    const now = Date.now();
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
    jobId?: string;
  }): Promise<{ success: boolean; leaseId?: string; fencingToken?: number; reason?: string; expiresAtMs?: number }> {
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
    success?: boolean;
  }): Promise<{ success: boolean; committedTokens?: number; reason?: string }> {
    const lease = this.inMemoryLeases.get(params.leaseId);
    if (lease) {
      lease.isCommitted = true;
      lease.committedTokens = params.actualTokens || lease.estimatedTokens;
    }
    return { success: true, committedTokens: params.actualTokens || lease?.estimatedTokens || 2000 };
  }

  private mapRowToShard(data: Database['public']['Tables']['galx_shard_accounts']['Row']): GalxShardAccount {
    const payload = {
      ciphertext: data.encrypted_ciphertext,
      iv: data.encrypted_iv,
      tag: data.encrypted_tag,
      keyVersion: data.key_version || 'v1'
    };

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
      max_tokens: shard.tokenBucket?.maxTokens || 10000000,
      remaining_tokens: shard.tokenBucket?.remainingTokens || 10000000,
      reserved_tokens: shard.tokenBucket?.reservedTokens || 0,
      refill_rate_per_minute: shard.tokenBucket?.refillRatePerMinute || 10000000,
      max_requests: shard.tokenBucket?.maxRequests || 10000,
      remaining_requests: shard.tokenBucket?.remainingRequests || 10000,
      last_refill_timestamp_ms: shard.tokenBucket?.lastRefillTimestampMs || 0,
      total_requests_served: shard.stats?.totalRequestsServed || 0,
      total_tokens_consumed: shard.stats?.totalTokensConsumed || 0,
      consecutive_failures: shard.stats?.consecutiveFailures || 0,
      consecutive_successes: shard.stats?.consecutiveSuccesses || 0,
      average_latency_ms: shard.stats?.averageLatencyMs || 250,
      last_latency_ms: shard.stats?.lastLatencyMs || null,
      fencing_token: shard.fencingToken || 1,
      permission_retracted: shard.permissionRetracted || false,
      cooldown_until_ms: shard.cooldownUntilMs || shard.cooldownUntilTimestampMs || null,
      created_at_ms: shard.createdAtMs,
      updated_at_ms: shard.updatedAtMs
    };
  }
}
