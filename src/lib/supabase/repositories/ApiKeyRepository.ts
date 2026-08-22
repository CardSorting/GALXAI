/**
 * GALXAI: Supabase Developer Gateway API Key Repository
 * High-performance key resolution, SHA-256 hash lookup, rate limit tracking, and instant revocation.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';
import type { DeveloperGatewayKey } from '../../../core/contracts/GalxContracts';

export class ApiKeyRepository {
  private static instance: ApiKeyRepository;
  private readonly inMemoryCache = new Map<string, DeveloperGatewayKey>();

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
          for (const k of mapped) this.inMemoryCache.set(k.id, k);
          return mapped;
        }
      } catch {
        // Fall back
      }
    }

    const all = Array.from(this.inMemoryCache.values());
    return userId ? all.filter(k => k.userId === userId) : all;
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
          this.inMemoryCache.set(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.inMemoryCache.get(id) || null;
  }

  async findKeyByHash(keyHash: string): Promise<DeveloperGatewayKey | null> {
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
          this.inMemoryCache.set(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    for (const key of this.inMemoryCache.values()) {
      if (key.keyHash === keyHash && !key.revoked) {
        return key;
      }
    }
    return null;
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
          this.inMemoryCache.set(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    for (const key of this.inMemoryCache.values()) {
      if (key.prefix === prefix && !key.revoked) {
        return key;
      }
    }
    return null;
  }

  async saveGatewayKey(key: DeveloperGatewayKey): Promise<void> {
    this.inMemoryCache.set(key.id, key);
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const row = this.mapKeyToRow(key);
        await supabase.from('galx_developer_keys').upsert(row, { onConflict: 'id' });
      } catch {
        // Fallback
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
    this.inMemoryCache.set(keyId, updated);

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
    const existing = this.inMemoryCache.get(keyId);
    if (existing) {
      this.inMemoryCache.set(keyId, { ...existing, revoked: true });
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
    this.inMemoryCache.delete(keyId);
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
