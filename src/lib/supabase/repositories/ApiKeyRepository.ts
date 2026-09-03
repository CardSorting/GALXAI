/**
 * GALXAI: Supabase Developer Gateway API Key Repository + BroccoliDB L1 Hot Cache
 * High-performance key resolution, SHA-256 hash lookup, rate limit tracking, and instant revocation.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import { getPostgresPool } from '../../db/postgres';
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

      // 1. Authoritative direct PostgreSQL connection pool batch lookup
      const pool = getPostgresPool();
      if (pool) {
        try {
          const res = await pool.query(
            'SELECT * FROM galx_developer_keys WHERE key_hash = ANY($1::text[]) AND is_revoked = false;',
            [Array.from(hashes)]
          );
          if (res.rows && res.rows.length > 0) {
            for (const row of res.rows) {
              if (row && row.key_hash) {
                const mapped = this.mapRowToGatewayKey(row);
                keyMap.set(row.key_hash, mapped);
                this.keyTable.put(mapped.id, mapped);
              }
            }
          }
        } catch (err: any) {
          console.warn('[ApiKeyRepository] Direct PG hash lookup fallback:', err.message);
        }
      }

      // 2. Supabase RPC fallback
      if (keyMap.size < hashes.length && isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdmin();
          const missingHashes = Array.from(hashes).filter(h => !keyMap.has(h));
          const { data, error } = await supabase.rpc('fn_batch_get_developer_keys_by_hashes', {
            p_key_hashes: missingHashes
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
    // 1. Authoritative direct PostgreSQL connection pool (bypasses anon RLS filtering)
    const pool = getPostgresPool();
    if (pool) {
      try {
        const res = await pool.query(
          'SELECT * FROM galx_developer_keys WHERE ($1::text IS NULL OR user_id = $1::text) ORDER BY created_at DESC;',
          [userId || null]
        );
        if (res.rows && res.rows.length > 0) {
          const mapped = res.rows.map(r => this.mapRowToGatewayKey(r));
          for (const k of mapped) this.keyTable.put(k.id, k);
          return mapped;
        }
      } catch (err: any) {
        console.warn('[ApiKeyRepository] Direct PG query fallback:', err.message);
      }
    }

    // 2. Supabase SECURITY DEFINER RPC fallback (bypasses anon RLS filtering)
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_get_developer_keys' as any, {
          p_user_id: userId || null
        });

        if (!error && data && Array.isArray(data) && data.length > 0) {
          const mapped = data.map(this.mapRowToGatewayKey);
          for (const k of mapped) this.keyTable.put(k.id, k);
          return mapped;
        }
      } catch {
        // Fall back to memory
      }
    }

    // 3. In-memory hot cache fallback
    if (userId) {
      return this.keyTable.query({ where: { userId: { $eq: userId } } }) as DeveloperGatewayKey[];
    }
    return this.keyTable.getAll() as DeveloperGatewayKey[];
  }

  async getGatewayKeyById(id: string): Promise<DeveloperGatewayKey | null> {
    return this.keyCoalescer.getOrFetch(`id:${id}`, async () => {
      const pool = getPostgresPool();
      if (pool) {
        try {
          const res = await pool.query('SELECT * FROM galx_developer_keys WHERE id = $1 LIMIT 1;', [id]);
          if (res.rows && res.rows[0]) {
            const mapped = this.mapRowToGatewayKey(res.rows[0]);
            this.keyTable.put(mapped.id, mapped);
            return mapped;
          }
        } catch {}
      }

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdmin();
          const { data, error } = await supabase.rpc('fn_get_developer_key_by_id' as any, {
            p_id: id
          });

          if (!error && data && Array.isArray(data) && data.length > 0) {
            const mapped = this.mapRowToGatewayKey(data[0]);
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
    const pool = getPostgresPool();
    if (pool) {
      try {
        const res = await pool.query(
          'SELECT * FROM galx_developer_keys WHERE prefix = $1 AND is_revoked = false LIMIT 1;',
          [prefix]
        );
        if (res.rows && res.rows[0]) {
          const mapped = this.mapRowToGatewayKey(res.rows[0]);
          this.keyTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {}
    }

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
    // 1. Immediately guarantee in-memory hot cache presence
    this.keyTable.put(key.id, key);
    this.keyCoalescer.invalidate(`id:${key.id}`);
    this.keyCoalescer.invalidate(`hash:${key.keyHash}`);
    this.keyDataLoader.clear(key.keyHash);

    let saved = false;

    // 2. Direct PostgreSQL connection pool (highest authority and reliability)
    const pool = getPostgresPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO galx_developer_keys (
            id, user_id, name, prefix, key_hash, rate_limit_per_minute, total_requests, total_tokens, is_revoked, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10 / 1000.0), NOW()
          ) ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            prefix = EXCLUDED.prefix,
            key_hash = EXCLUDED.key_hash,
            rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
            is_revoked = EXCLUDED.is_revoked,
            updated_at = NOW();`,
          [
            key.id,
            key.userId,
            key.name,
            key.prefix || key.keyPrefix || '',
            key.keyHash,
            key.rateLimitPerMinute || 120,
            key.totalRequests || 0,
            key.totalTokens || 0,
            Boolean(key.revoked),
            key.createdAtMs || Date.now()
          ]
        );
        saved = true;
      } catch (err: any) {
        console.warn('[ApiKeyRepository] Direct PG insert error, falling back to RPC:', err.message);
      }
    }

    // 3. Supabase RPC fallback
    if (!saved && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { error: rpcError } = await supabase.rpc('fn_save_developer_key' as any, {
          p_id: key.id,
          p_user_id: key.userId,
          p_name: key.name,
          p_prefix: key.prefix || key.keyPrefix || '',
          p_key_hash: key.keyHash,
          p_rate_limit_per_minute: key.rateLimitPerMinute || 120
        });

        if (!rpcError) {
          saved = true;
        } else {
          const row = this.mapKeyToRow(key);
          const { error } = await supabase
            .from('galx_developer_keys')
            .upsert(row, { onConflict: 'id' });

          if (!error) saved = true;
        }
      } catch (err: any) {
        console.warn('[ApiKeyRepository] Supabase RPC save error:', err.message);
      }
    }

    if (!saved && options.requireRemote) {
      throw new Error('Authoritative API-key storage was unreachable. Key is retained in local cache.');
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

    const pool = getPostgresPool();
    if (pool) {
      try {
        await pool.query(
          'UPDATE galx_developer_keys SET total_requests = total_requests + $2, total_tokens = total_tokens + $3, last_used_at = NOW() WHERE id = $1;',
          [keyId, requests, tokens]
        );
        return;
      } catch {}
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

    const pool = getPostgresPool();
    if (pool) {
      try {
        await pool.query(
          'UPDATE galx_developer_keys SET is_revoked = true, revoked_at = NOW(), revoked_reason = $2 WHERE id = $1;',
          [keyId, reason]
        );
        return;
      } catch {}
    }

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

  async deleteKey(keyId: string, userId?: string): Promise<void> {
    const existing = this.keyTable.get(keyId);
    if (existing?.keyHash) {
      this.keyCoalescer.invalidate(`hash:${existing.keyHash}`);
      this.keyDataLoader.clear(existing.keyHash);
    }
    this.keyCoalescer.invalidate(`id:${keyId}`);
    this.keyTable.delete(keyId);
    this.keyDataLoader.clearAll();

    const pool = getPostgresPool();
    if (pool) {
      try {
        await pool.query(
          'DELETE FROM galx_developer_keys WHERE id = $1 AND ($2::text IS NULL OR user_id = $2::text);',
          [keyId, userId || null]
        );
        return;
      } catch {}
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { error: rpcErr } = await supabase.rpc('fn_delete_developer_key' as any, {
          p_id: keyId,
          p_user_id: userId || null
        });

        if (rpcErr) {
          await supabase.from('galx_developer_keys').delete().eq('id', keyId);
        }
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
