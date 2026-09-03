/**
 * GALXAI: Supabase Developer Gateway API Key Repository + BroccoliDB L1 Hot Cache
 * High-performance key resolution, SHA-256 hash lookup, rate limit tracking, and instant revocation.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';
import type { DeveloperGatewayKey } from '../../../core/contracts/GalxContracts';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';
import { GalxRequestCoalescer } from '../../cache/GalxRequestCoalescer';
import { GalxBatchDataLoader } from '../../cache/GalxBatchDataLoader';

export class ApiKeyRepository {
  private static instance: ApiKeyRepository;
  private readonly keyTable: BroccoliDbTable<DeveloperGatewayKey>;
  private readonly keyCoalescer = new GalxRequestCoalescer<DeveloperGatewayKey | null>({ ttlMs: 15000 });

  public readonly keyDataLoader = new GalxBatchDataLoader<string, DeveloperGatewayKey | null>(
    async (hashes) => {
      const results: Array<DeveloperGatewayKey | null> = [];
      const keyMap = new Map<string, DeveloperGatewayKey>();

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdmin();
          const { data, error } = await supabase.rpc('fn_batch_get_developer_keys_by_hashes', {
            p_key_hashes: Array.from(hashes)
          });

          if (!error && data && Array.isArray(data)) {
            for (const row of data as any[]) {
              if (row && row.key_hash) {
                const mapped = this.mapRowToGatewayKey(row);
                keyMap.set(row.key_hash, mapped);
                this.keyTable.put(mapped.id, mapped);
              }
            }
          }
        } catch {
          // Fallback
        }
      }

      for (const hash of hashes) {
        if (keyMap.has(hash)) {
          results.push(keyMap.get(hash)!);
        } else {
          const matches = this.keyTable.query({
            where: { keyHash: { $eq: hash }, revoked: { $eq: false } }
          }) as DeveloperGatewayKey[];
          results.push(matches[0] || null);
        }
      }

      return results;
    },
    { maxBatchSize: 100, batchWindowMs: 5, cacheTtlMs: 15000 }
  );

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
    return this.keyCoalescer.getOrFetch(`id:${id}`, async () => {
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
    });
  }

  async findGatewayKeyByHash(keyHash: string): Promise<DeveloperGatewayKey | null> {
    return this.keyCoalescer.getOrFetch(`hash:${keyHash}`, async () => {
      return this.keyDataLoader.load(keyHash);
    });
  }

  async findKeysByHashesBatch(keyHashes: string[]): Promise<Array<DeveloperGatewayKey | null>> {
    return this.keyDataLoader.loadMany(keyHashes);
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
    this.keyCoalescer.invalidate(`id:${key.id}`);
    this.keyCoalescer.invalidate(`hash:${key.keyHash}`);
    this.keyDataLoader.clear(key.keyHash);

    if (!isSupabaseConfigured()) {
      if (options.requireRemote) {
        this.keyTable.delete(key.id);
        throw new Error('Authoritative API-key storage is not configured.');
      }
      return;
    }

    try {
      const supabase = getSupabaseAdmin();
      const { error: rpcError } = await supabase.rpc('fn_save_developer_key' as any, {
        p_id: key.id,
        p_user_id: key.userId,
        p_name: key.name,
        p_prefix: key.prefix || key.keyPrefix || '',
        p_key_hash: key.keyHash,
        p_rate_limit_per_minute: key.rateLimitPerMinute || 600
      });

      if (rpcError) {
        const row = this.mapKeyToRow(key);
        const { error } = await supabase
          .from('galx_developer_keys')
          .upsert(row, { onConflict: 'id' });

        if (error) throw error;
      }
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
    this.keyCoalescer.set(`id:${keyId}`, updated);
    if (updated.keyHash) {
      this.keyCoalescer.set(`hash:${updated.keyHash}`, updated);
      this.keyDataLoader.clear(updated.keyHash);
    }

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
      if (existing.keyHash) {
        this.keyCoalescer.invalidate(`hash:${existing.keyHash}`);
        this.keyDataLoader.clear(existing.keyHash);
      }
    }
    this.keyCoalescer.invalidate(`id:${keyId}`);
    this.keyDataLoader.clearAll();

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { error: rpcErr } = await supabase.rpc('fn_revoke_developer_key' as any, {
          p_id: keyId,
          p_reason: reason
        });

        if (rpcErr) {
          await supabase
            .from('galx_developer_keys')
            .update({
              is_revoked: true,
              revoked_at: new Date().toISOString(),
              revoked_reason: reason
            })
            .eq('id', keyId);
        }
      } catch {
        // Fallback
      }
    }
  }

  async deleteKey(keyId: string): Promise<void> {
    const existing = this.keyTable.get(keyId);
    if (existing?.keyHash) {
      this.keyCoalescer.invalidate(`hash:${existing.keyHash}`);
      this.keyDataLoader.clear(existing.keyHash);
    }
    this.keyCoalescer.invalidate(`id:${keyId}`);
    this.keyTable.delete(keyId);
    this.keyDataLoader.clearAll();

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_developer_keys').delete().eq('id', keyId);
      } catch {
        // Fallback
      }
    }
  }

  private mapRowToGatewayKey(data: Database['public']['Tables']['galx_developer_keys']['Row'] | any): DeveloperGatewayKey {
    return {
      id: data.id,
      name: data.name,
      userId: data.user_id,
      prefix: data.prefix,
      keyPrefix: data.prefix,
      keyHash: data.key_hash,
      rateLimitPerMinute: data.rate_limit_per_minute,
      totalRequests: Number(data.total_requests || 0),
      totalTokens: Number(data.total_tokens || 0),
      createdAtMs: new Date(data.created_at).getTime(),
      lastUsedAtMs: data.last_used_at ? new Date(data.last_used_at).getTime() : undefined,
      revoked: Boolean(data.is_revoked),
      environment: data.environment || (data.prefix?.includes('test') ? 'test' : 'live'),
      scopes: Array.isArray(data.scopes) ? data.scopes : ['*'],
      ipWhitelist: Array.isArray(data.ip_whitelist) ? data.ip_whitelist : undefined,
      expiresAtMs: data.expires_at ? new Date(data.expires_at).getTime() : undefined,
      description: data.description || undefined,
      checksum: data.checksum || undefined,
      defaultCompactionMode: data.default_compaction_mode || data.defaultCompactionMode || 'auto',
    };
  }

  private mapKeyToRow(key: DeveloperGatewayKey): Database['public']['Tables']['galx_developer_keys']['Insert'] | any {
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
      created_at: new Date(key.createdAtMs).toISOString(),
      ...(key.environment ? { environment: key.environment } : {}),
      ...(key.scopes ? { scopes: key.scopes } : {}),
      ...(key.expiresAtMs ? { expires_at: new Date(key.expiresAtMs).toISOString() } : {}),
      ...(key.defaultCompactionMode ? { default_compaction_mode: key.defaultCompactionMode } : {}),
    };
  }
}
