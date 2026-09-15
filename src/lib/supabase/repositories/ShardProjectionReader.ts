import { createHash } from 'node:crypto';
import { executePostgresQuery } from '../../db/postgres';
import { getSupabaseConfig } from '../config';
import type { Database } from '../types';
import { RegistryEgressGuard, RegistryEgressLimitError } from '../../../relay/registry-egress-guard';
import { createRegistryApiPageReader, RegistryApiUnavailableError } from '../../../relay/registry-api-reader';
import { ShardRegistrySync, readRegistryApiDelta, type RegistryRow } from '../../../relay/shard-registry-sync';

// Static server-side projection: preserve every field used by mapRowToShard,
// including live lease counters that do NOT necessarily bump registry_revision.
export const SHARD_PROJECTION_COLUMNS = [
  'id', 'user_id', 'provider', 'auth_type', 'account_label', 'api_key_masked',
  'encrypted_ciphertext', 'encrypted_iv', 'encrypted_tag', 'key_version',
  'shard_mode', 'priority', 'weight', 'status', 'max_tokens', 'remaining_tokens',
  'reserved_tokens', 'refill_rate_per_minute', 'max_requests', 'remaining_requests',
  'last_refill_timestamp_ms', 'total_requests_served', 'total_tokens_consumed',
  'consecutive_failures', 'consecutive_successes', 'average_latency_ms', 'last_latency_ms',
  'fencing_token', 'permission_retracted', 'cooldown_until_ms', 'credential_expires_at_ms',
  'privacy_capabilities', 'sliding_window_quota', 'supported_models', 'unsupported_models',
  'managed_desktop_id', 'desktop_enrolled_at', 'registry_source', 'registry_revision', 'created_at_ms', 'updated_at_ms', 'created_at', 'updated_at',
] as const satisfies readonly (keyof Database['public']['Tables']['galx_shard_accounts']['Row'])[];
export type ShardProjectionRow = Pick<Database['public']['Tables']['galx_shard_accounts']['Row'], typeof SHARD_PROJECTION_COLUMNS[number]>;

const projection = SHARD_PROJECTION_COLUMNS.map(column => `s.${column}`).join(', ');
const credentialHash = "encode(sha256(convert_to(ROW(s.encrypted_ciphertext, s.encrypted_iv, s.encrypted_tag)::text, 'UTF8')), 'hex')";
export const SHARD_PROJECTION_DELTA_SQL = `
  WITH registry AS MATERIALIZED (
    SELECT ${projection},
      encode(sha256(convert_to(ROW(${projection})::text, 'UTF8')), 'hex') || ':' || ${credentialHash} AS fingerprint,
      ${credentialHash} AS credential_fingerprint
    FROM public.galx_shard_accounts AS s
    WHERE ($3::text IS NULL OR s.user_id = $3)
    ORDER BY s.id LIMIT 2049
  ), delta AS MATERIALIZED (
    SELECT COALESCE((SELECT jsonb_agg(jsonb_build_object('fingerprint', r.fingerprint,
      'row', CASE WHEN split_part($1::jsonb ->> r.id, ':', 2) = r.credential_fingerprint
        THEN to_jsonb(r) - ARRAY['fingerprint', 'credential_fingerprint', 'encrypted_ciphertext', 'encrypted_iv', 'encrypted_tag']
        ELSE to_jsonb(r) - ARRAY['fingerprint', 'credential_fingerprint'] END) ORDER BY r.id) FROM registry AS r
      WHERE r.fingerprint IS DISTINCT FROM ($1::jsonb ->> r.id)), '[]'::jsonb) AS changed,
      COALESCE((SELECT jsonb_agg(k.id ORDER BY k.id) FROM jsonb_object_keys($1::jsonb) AS k(id)
      WHERE NOT EXISTS (SELECT 1 FROM registry AS r WHERE r.id = k.id)), '[]'::jsonb) AS removed
  ), bounded AS (
    SELECT *, (octet_length(changed::text) + octet_length(removed::text) + 128 > $2::integer
      OR (SELECT count(*) FROM registry) > 2048) AS limit_exceeded FROM delta
  )
  SELECT CASE WHEN limit_exceeded THEN '[]'::jsonb ELSE changed END AS changed,
    CASE WHEN limit_exceeded THEN '[]'::jsonb ELSE removed END AS removed, limit_exceeded FROM bounded
`;

// One budget across scopes AND repository instances in this process. Serverless
// instances do not share it; this is not an organization-wide billing limit.
const processGuard = new RegistryEgressGuard({ policy: {
  maxResponseBytes: 512 * 1024, burstBytes: 1024 * 1024, requestBurst: 12,
} });
const metadataColumns = SHARD_PROJECTION_COLUMNS.filter(column => ![
  'encrypted_ciphertext', 'encrypted_iv', 'encrypted_tag',
].includes(column));
export const SHARD_API_DELTA_OPTIONS = {
  columns: SHARD_PROJECTION_COLUMNS,
  manifestColumns: metadataColumns.join(','),
  fingerprint: (row: RegistryRow) => {
    if (metadataColumns.some(column => !Object.hasOwn(row, column))) throw new Error('Invalid shard manifest');
    return `rest:${createHash('sha256').update(JSON.stringify(metadataColumns.map(column => row[column]))).digest('hex')}`;
  },
  reuseCachedPayload: (cached: RegistryRow, manifest: RegistryRow) =>
    cached.registry_revision != null && manifest.registry_revision != null
    && String(cached.registry_revision) === String(manifest.registry_revision)
    && cached.created_at === manifest.created_at,
};

export class ShardProjectionReader {
  private authorityScope?: string;
  private sqlRetryAtMs = 0;
  private retryAtMs = 0;
  private failures = 0;
  private failureEpoch = 0;
  private readonly scopes = new Map<string, { sync: ShardRegistrySync; active: number }>();

  constructor(private readonly dependencies: {
    query?: typeof executePostgresQuery;
    config?: typeof getSupabaseConfig;
    fetch?: typeof fetch;
    guard?: RegistryEgressGuard;
  } = {}) {}

  async read(userId?: string): Promise<ShardProjectionRow[]> {
    if (userId !== undefined && (typeof userId !== 'string' || !userId.trim() || userId.length > 256)) {
      throw new Error('Invalid shard owner scope');
    }
    const config = (this.dependencies.config ?? getSupabaseConfig)();
    if (!config.databaseUrl && !config.hasAdminCredential) throw new Error('No shard read authority');
    const authorityScope = createHash('sha256').update(JSON.stringify([
      config.databaseUrl, config.supabaseUrl, config.supabaseServiceRoleKey,
    ])).digest('hex');
    // Runtime pools/SDK clients are process-bound. Hot credential/project changes
    // must restart the process, never relabel an old pool or reuse its projection.
    this.authorityScope ??= authorityScope;
    if (this.authorityScope !== authorityScope) throw new Error('Shard authority changed; restart required');
    if (Date.now() < this.retryAtMs) throw new Error('Shard synchronization is backing off');
    const scope = JSON.stringify(userId ?? null);
    let entry = this.scopes.get(scope);
    if (!entry) {
      if (this.scopes.size >= 32) {
        const idle = [...this.scopes].find(([, value]) => value.active === 0);
        if (!idle) throw new Error('Shard projection concurrency limit reached');
        this.scopes.delete(idle[0]);
      }
      const guard = this.dependencies.guard ?? processGuard;
      const sync = new ShardRegistrySync(async known => {
        if (config.databaseUrl && Date.now() >= this.sqlRetryAtMs) {
          const result = await guard.run(async (allowance, charge) => {
            const result = await (this.dependencies.query ?? executePostgresQuery)(SHARD_PROJECTION_DELTA_SQL, [
              JSON.stringify(Object.fromEntries([...known].map(([id, item]) => [id, item.fingerprint]))),
              allowance, userId ?? null,
            ]);
            if (result) charge(Buffer.byteLength(JSON.stringify(result.rows)));
            // No refund for a failed/unmeasured SQL read.
            if (!result) throw new Error('Shard SQL unavailable');
            if (result.rows[0]?.limit_exceeded) throw new RegistryEgressLimitError();
            return result;
          }).catch(error => {
            if (error instanceof RegistryEgressLimitError) throw error;
            this.sqlRetryAtMs = Date.now() + 30_000;
            return null;
          });
          if (result) {
            this.sqlRetryAtMs = 0;
            const delta = result.rows[0];
            if (!delta || !Array.isArray(delta.changed)) throw new Error('Invalid shard delta');
            return { ...delta, changed: delta.changed.map((item: { fingerprint: string; row: RegistryRow }) => {
              // SQL may omit only an unchanged encrypted envelope. Rehydrate it
              // from this exact owner's cache; all counters must arrive freshly.
              const cached = known.get(item.row.id)?.row;
              const row = { ...item.row };
              for (const column of ['encrypted_ciphertext', 'encrypted_iv', 'encrypted_tag']) {
                if (!Object.hasOwn(row, column) && cached) row[column] = cached[column];
              }
              return { fingerprint: item.fingerprint, row };
            }) };
          }
        }
        if (!config.hasAdminCredential) throw new Error('Shard authority unavailable');
        return readRegistryApiDelta(known, createRegistryApiPageReader(guard, {
          url: config.supabaseUrl, key: config.supabaseServiceRoleKey, userId, fetch: this.dependencies.fetch,
          beforeRequest: () => {
            if (Date.now() < this.retryAtMs) throw new Error('Shard synchronization is backing off');
          },
        }), SHARD_API_DELTA_OPTIONS);
      }, SHARD_PROJECTION_COLUMNS);
      entry = { sync, active: 0 };
    }
    this.scopes.delete(scope);
    this.scopes.set(scope, entry);
    entry.active++;
    const failureEpoch = this.failureEpoch;
    try {
      const rows = await entry.sync.read();
      if (userId !== undefined && rows.some(row => row.user_id !== userId)) throw new Error('Shard owner scope mismatch');
      if (failureEpoch === this.failureEpoch) {
        this.failures = 0;
        this.retryAtMs = 0;
      }
      return (rows as ShardProjectionRow[]).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
    } catch (error) {
      // Coalesced callers must not multiply a single failed I/O's backoff.
      if (Date.now() >= this.retryAtMs) {
        this.failureEpoch++;
        this.retryAtMs = Date.now() + Math.min(30_000, 1000 * 2 ** Math.min(5, this.failures++));
      }
      this.retryAtMs = Math.max(this.retryAtMs, error instanceof RegistryApiUnavailableError ? error.retryAtMs : 0);
      throw error;
    } finally { entry.active--; }
  }
}
