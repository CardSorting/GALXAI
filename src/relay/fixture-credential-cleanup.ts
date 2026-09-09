import { executePostgresQuery } from '../lib/db/postgres.js';

/** Exact legacy fixture evidence, never a heuristic about a real credential's format. */
export function isLegacyIntegrationFixture(row: Record<string, any>, secret: Record<string, any> | null): boolean {
  return row.provider === 'openai' && row.user_id === 'usr_tenant_888'
    && /^shard_\d{13}_oai$/.test(row.id)
    && secret?.apiKey === 'sk-openai-live-secret-test-key-12345';
}

/** Retain the row and ciphertext; a concurrent credential replacement or active lease prevents revocation. */
export async function revokeIntegrationFixture(row: Record<string, any>, secret: Record<string, any> | null,
  query: typeof executePostgresQuery = executePostgresQuery): Promise<boolean> {
  if (!isLegacyIntegrationFixture(row, secret)) throw new Error('Refusing to revoke an unconfirmed fixture');
  const result = await query(`UPDATE public.galx_shard_accounts
    SET status = 'revoked', permission_retracted = true,
      updated_at_ms = (EXTRACT(EPOCH FROM statement_timestamp()) * 1000)::bigint, updated_at = statement_timestamp()
    WHERE id = $1 AND user_id = $2 AND provider = 'openai'
      AND encrypted_ciphertext = $3 AND encrypted_iv = $4 AND encrypted_tag = $5
      AND key_version IS NOT DISTINCT FROM $6 AND status = $7
      AND permission_retracted = false AND COALESCE(active_in_flight_count, 0) = 0
    RETURNING id`, [row.id, row.user_id, row.encrypted_ciphertext, row.encrypted_iv, row.encrypted_tag, row.key_version, row.status]);
  if (!result) throw new Error('Fixture cleanup authority unavailable');
  return result.rows.length === 1;
}
