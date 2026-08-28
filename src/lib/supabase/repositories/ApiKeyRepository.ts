/**
 * GALXAI: Supabase Developer Gateway API Key Repository + BroccoliDB L1 Hot Cache
 * High-performance key resolution, SHA-256 hash lookup, rate limit tracking, and instant revocation.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';
import type { DeveloperGatewayKey } from '../../../core/contracts/GalxContracts';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';

export class ApiKeyRepository {
  private static instance: ApiKeyRepository;
  private readonly keyTable: BroccoliDbTable<DeveloperGatewayKey>;

  private constructor() {
    this.keyTable = new BroccoliDbTable<DeveloperGatewayKey>('gateway_keys');
    this.keyTable.createIndex('keyHash');
    this.keyTable.createIndex('prefix');
    this.keyTable.createIndex('userId');
    this.keyTable.createIndex('revoked');
  }

  static getInstance(): ApiKeyRepository {
    if (!ApiKeyRepository.instance) {
      ApiKeyRepository.instance = new ApiKeyRepository();
    }
    return ApiKeyRepository.instance;
  }

  async getGatewayKeys(userId?: string): Promise<DeveloperGatewayKey[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        let query = supabase.from('galx_developer_keys').select('*').order('created_at', { ascending: false });

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const mapped = data.map(this.mapRowToGatewayKey);
          for (const k of mapped) this.keyTable.put(k.id, k);
          return mapped;
        }
      } catch {
        // Fall back
      }
    }

    if (userId) {
      return this.keyTable.query({ where: { userId: { $eq: userId } } }) as DeveloperGatewayKey[];
    }
    return this.keyTable.getAll() as DeveloperGatewayKey[];
  }

  async getGatewayKeyById(id: string): Promise<DeveloperGatewayKey | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_developer_keys')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          const mapped = this.mapRowToGatewayKey(data);
          this.keyTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.keyTable.get(id) || null;
  }

  async findGatewayKeyByHash(keyHash: string): Promise<DeveloperGatewayKey | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_developer_keys')
          .select('*')
          .eq('key_hash', keyHash)
          .eq('is_revoked', false)
          .single();

        if (!error && data) {
          const mapped = this.mapRowToGatewayKey(data);
          this.keyTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    const matches = this.keyTable.query({
      where: {
        keyHash: { $eq: keyHash },
        revoked: { $eq: false }
      }
    }) as DeveloperGatewayKey[];

    return matches[0] || null;
  }

  async findKeyByHash(keyHash: string): Promise<DeveloperGatewayKey | null> {
    return this.findGatewayKeyByHash(keyHash);
  }

  async findKeyByPrefix(prefix: string): Promise<DeveloperGatewayKey | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_developer_keys')
          .select('*')
          .eq('prefix', prefix)
          .eq('is_revoked', false)
          .single();

        if (!error && data) {
          const mapped = this.mapRowToGatewayKey(data);
          this.keyTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    const matches = this.keyTable.query({
      where: {
        prefix: { $eq: prefix },
        revoked: { $eq: false }
      }
    }) as DeveloperGatewayKey[];

    return matches[0] || null;
  }

  async saveGatewayKey(
    key: DeveloperGatewayKey,
    options: { requireRemote?: boolean } = {}
  ): Promise<void> {
    this.keyTable.put(key.id, key);

    if (!isSupabaseConfigured()) {
      if (options.requireRemote) {
        this.keyTable.delete(key.id);
        throw new Error('Authoritative API-key storage is not configured.');
      }
      return;
    }

    try {
      const supabase = getSupabaseAdmin();
      const row = this.mapKeyToRow(key);
      const { error } = await supabase
        .from('galx_developer_keys')
        .upsert(row, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      if (options.requireRemote) {
        this.keyTable.delete(key.id);
        const message = error instanceof Error ? error.message : 'Unknown persistence error';
        throw new Error(`Failed to persist the API key authoritatively: ${message}`);
      }
    }
  }

  async incrementUsage(
    keyId: string,
    requests: number = 1,
    tokens: number = 0,
    costUsd: number = 0
  ): Promise<void> {
    const existing = await this.getGatewayKeyById(keyId);
    if (!existing) return;

    const updated: DeveloperGatewayKey = {
      ...existing,
      totalRequests: (existing.totalRequests || 0) + requests,
      totalTokens: (existing.totalTokens || 0) + tokens,
      lastUsedAtMs: Date.now()
    };
    this.keyTable.put(keyId, updated);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('galx_developer_keys')
          .update({
            total_requests: updated.totalRequests,
            total_tokens: updated.totalTokens,
            last_used_at: new Date().toISOString()
          })
          .eq('id', keyId);
      } catch {
        // Fallback
      }
    }
  }

  async revokeKey(keyId: string, reason: string = 'User requested revocation'): Promise<void> {
    const existing = this.keyTable.get(keyId);
    if (existing) {
      this.keyTable.put(keyId, { ...existing, revoked: true });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('galx_developer_keys')
          .update({
            is_revoked: true,
            revoked_at: new Date().toISOString(),
            revoked_reason: reason
          })
          .eq('id', keyId);
      } catch {
        // Fallback
      }
    }
  }

  async deleteKey(keyId: string): Promise<void> {
    this.keyTable.delete(keyId);
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_developer_keys').delete().eq('id', keyId);
      } catch {
        // Fallback
      }
    }
  }

  private mapRowToGatewayKey(data: Database['public']['Tables']['galx_developer_keys']['Row']): DeveloperGatewayKey {
    return {
      id: data.id,
      name: data.name,
      userId: data.user_id,
      prefix: data.prefix,
      keyPrefix: data.prefix,
      keyHash: data.key_hash,
      rateLimitPerMinute: data.rate_limit_per_minute,
      totalRequests: Number(data.total_requests),
      totalTokens: Number(data.total_tokens),
      createdAtMs: new Date(data.created_at).getTime(),
      lastUsedAtMs: data.last_used_at ? new Date(data.last_used_at).getTime() : undefined,
      revoked: data.is_revoked
    };
  }

  private mapKeyToRow(key: DeveloperGatewayKey): Database['public']['Tables']['galx_developer_keys']['Insert'] {
    return {
      id: key.id,
      user_id: key.userId,
      name: key.name,
      prefix: key.prefix || key.keyPrefix || '',
      key_hash: key.keyHash,
      rate_limit_per_minute: key.rateLimitPerMinute,
      total_requests: key.totalRequests,
      total_tokens: key.totalTokens,
      is_revoked: key.revoked || false,
      last_used_at: key.lastUsedAtMs ? new Date(key.lastUsedAtMs).toISOString() : null,
      created_at: new Date(key.createdAtMs).toISOString()
    };
  }
}
