import * as crypto from 'node:crypto';
import pg from 'pg';

const COLUMNS = 'id,user_id,provider,status,permission_retracted,encrypted_ciphertext,encrypted_iv,encrypted_tag,key_version,credential_expires_at_ms,cooldown_until_ms';
let pool: pg.Pool | undefined;

function getRegistryPool(): pg.Pool {
  const { databaseUrl } = registryConfig();
  if (!databaseUrl) throw new Error('Credential cleanup requires DATABASE_URL');
  pool ??= new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000,
    query_timeout: 5000, statement_timeout: 5000, idleTimeoutMillis: 1000, allowExitOnIdle: true });
  return pool;
}

export interface ClearExpiredCredentialsOptions {
  /** Preview eligible records without changing the registry. */
  dryRun?: boolean;
  /** Restrict cleanup to one registry owner, when supplied by a trusted caller. */
  userId?: string;
  /** In-flight relay shards that must remain untouched. */
  excludeShardIds?: string[];
}

/**
 * Clear expired credentials from the pool by revoking their registry records.
 * Retains ciphertext and audit history for recovery; never deletes credentials.
 * This is a backend administrative operation, not an end-user authorization gate.
 */
export async function clearExpiredCredentials(
  options: ClearExpiredCredentialsOptions = {},
  database?: Pick<pg.PoolClient, 'query'>,
): Promise<{ dryRun: boolean; matchedCount: number; clearedCount: number }> {
  if (options.dryRun !== undefined && typeof options.dryRun !== 'boolean') throw new TypeError('dryRun must be a boolean');
  if (options.userId !== undefined && (typeof options.userId !== 'string' || !options.userId.trim())) throw new TypeError('userId must be a nonempty string');
  if (options.excludeShardIds !== undefined && (!Array.isArray(options.excludeShardIds) || options.excludeShardIds.some(id => typeof id !== 'string' || !id))) throw new TypeError('excludeShardIds must contain nonempty strings');
  const eligible = `credential_expires_at_ms > 0
    AND credential_expires_at_ms <= (EXTRACT(EPOCH FROM statement_timestamp()) * 1000)::bigint
    AND permission_retracted = false AND status <> 'revoked'
    AND COALESCE(active_in_flight_count, 0) = 0
    AND ($1::text IS NULL OR user_id = $1)
    AND NOT (id = ANY($2::text[]))`;
  // A single conditional UPDATE checks current expiry under PostgreSQL row locking.
  // A concurrent refresh committed before this update cannot be cleared by a stale list.
  const sql = options.dryRun
    ? `SELECT id FROM public.galx_shard_accounts WHERE ${eligible}`
    : `UPDATE public.galx_shard_accounts SET status = 'revoked', permission_retracted = true,
        updated_at_ms = (EXTRACT(EPOCH FROM statement_timestamp()) * 1000)::bigint,
        updated_at = statement_timestamp()
       WHERE ${eligible} RETURNING id`;
  const result = await (database ?? getRegistryPool()).query(sql, [options.userId ?? null, options.excludeShardIds ?? []]);
  return { dryRun: options.dryRun === true, matchedCount: result.rows.length,
    clearedCount: options.dryRun ? 0 : result.rows.length };
}

export function registryConfig() {
  return {
    databaseUrl: process.env.DATABASE_URL,
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

/** A paginated, memory-only projection of the encrypted authoritative registry. */
export async function readShardRegistry(): Promise<Record<string, any>[]> {
  const { url, key, databaseUrl } = registryConfig();
  if (databaseUrl) {
    try {
      const result = await getRegistryPool().query(`SELECT ${COLUMNS} FROM public.galx_shard_accounts ORDER BY id`);
      return result.rows;
    } catch {
      // The admin Data API is the only fallback; never resurrect local credentials.
    }
  }
  let privileged = key?.startsWith('sb_secret_');
  if (key && !privileged) {
    try { privileged = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'service_role'; } catch {}
  }
  if (!url || !key || !privileged) throw new Error('Shard registry requires a Supabase URL and backend admin credential');
  const result: Record<string, any>[] = [];
  const deadline = AbortSignal.timeout(10_000);
  for (let offset = 0; ; ) {
    const endpoint = new URL('/rest/v1/galx_shard_accounts', url);
    endpoint.searchParams.set('select', COLUMNS);
    endpoint.searchParams.set('order', 'id.asc');
    endpoint.searchParams.set('offset', String(offset));
    endpoint.searchParams.set('limit', '500');
    const response = await fetch(endpoint, {
      headers: { apikey: key, ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }) },
      signal: deadline,
    });
    if (!response.ok) throw new Error(`Shard registry read failed (HTTP ${response.status})`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error('Invalid shard registry response');
    result.push(...page);
    if (page.length === 0) break;
    offset += page.length;
  }
  return result;
}

export function decryptRegistryShard(row: Record<string, any>): Record<string, any> | null {
  const version = row.key_version || 'v1';
  const seed = process.env[`GALX_VAULT_KEY_${version.toUpperCase()}`]
    || (version === 'v1' ? process.env.GALX_VAULT_MASTER_SECRET || process.env.GALX_VAULT_KEY : undefined);
  if (!seed) return null;
  try {
    const key = Buffer.from(crypto.hkdfSync('sha256', seed, 'galx-vault-salt-2026', `galx-shard-isolation-${version}`, 32));
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(row.encrypted_iv, 'hex'));
    decipher.setAAD(Buffer.from(`${row.user_id}:${row.id}:${row.provider}`));
    decipher.setAuthTag(Buffer.from(row.encrypted_tag, 'hex'));
    return JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(row.encrypted_ciphertext, 'hex')), decipher.final(),
    ]).toString('utf8'));
  } catch { return null; }
}
