/** Administrator CLI only. Bounded, read-only diagnostics; never emits SQL literals or row data. */
import { Client } from 'pg';
import { getPostgresSslConfig } from '../src/lib/db/postgres';
import { REGISTRY_COLUMNS } from '../src/relay/shard-registry-sync';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: getPostgresSslConfig(),
  connectionTimeoutMillis: 10_000,
  application_name: 'galxai-egress-diagnostic',
});

try {
  await client.connect();
  await client.query('BEGIN TRANSACTION READ ONLY');
  await client.query("SET LOCAL statement_timeout = '15s'");
  const polling = await client.query(`
    SELECT sum(calls)::text AS calls, sum(rows)::text AS rows,
      CASE WHEN query LIKE '%credential_fingerprint%' THEN 'repository_delta'
        WHEN query LIKE '%WITH registry AS MATERIALIZED (%' THEN 'delta'
        WHEN query LIKE '%WHERE ($1::text IS NULL OR user_id = $1)%' THEN 'repository_full'
        ELSE 'full' END AS mode
    FROM extensions.pg_stat_statements
    WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      AND query NOT ILIKE '%pg_stat_statements%'
      AND (query LIKE '%FROM public.galx_shard_accounts ORDER BY id%'
        OR query LIKE '%SELECT * FROM public.galx_shard_accounts WHERE ($1::text IS NULL OR user_id = $1)%'
        OR query LIKE '%WITH registry AS MATERIALIZED (%')
    GROUP BY mode ORDER BY mode
  `);
  console.log(JSON.stringify({ capturedAt: new Date().toISOString(), registryPolling: polling.rows }, null, 2));
  if (process.argv.includes('--polling-only')) {
    await client.query('ROLLBACK');
    await client.end();
    process.exit(0);
  }
  const stats = await client.query(`
    SELECT calls, rows, round(total_exec_time::numeric, 1) AS total_ms,
      left(query, 4000) AS query
    FROM extensions.pg_stat_statements
    WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      AND query NOT ILIKE '%pg_stat_statements%'
      AND query ~ '(galx_|fn_|rpc_|chat_messages|chat_conversations)'
      AND query ~* '^[[:space:]]*(SELECT|WITH)'
    ORDER BY calls DESC LIMIT 20
  `);
  console.log(JSON.stringify({
    note: 'Cumulative query statistics, not billing bytes. SQL literals and application records are omitted.',
    statements: stats.rows.map(({ query, ...counters }) => ({
      ...counters,
      objects: [...new Set(String(query).match(/\b(?:galx_[a-z0-9_]+|fn_[a-z0-9_]+|rpc_[a-z0-9_]+|chat_messages|chat_conversations)\b/g))],
      operation: String(query).trim().split(/\s/)[0],
      hasLimit: /\bLIMIT\b/i.test(query),
      selectsAll: /SELECT\s+\*/i.test(query),
    })),
  }, null, 2));
  // Compute sizes IN PostgreSQL. Repeated diagnostics must not download the very
  // credential payloads being audited. Only two scalar counters leave the server.
  const payload = await client.query(`
    SELECT count(*)::integer AS rows,
      (COALESCE(sum(octet_length(to_jsonb(r)::text)), 0) + GREATEST(count(*) - 1, 0) * 2 + 2)::bigint AS full_json_bytes
    FROM (SELECT ${REGISTRY_COLUMNS.slice(0, -2).join(', ')}
      FROM public.galx_shard_accounts AS s ORDER BY s.id LIMIT 2049) AS r
  `);
  console.log(JSON.stringify({ registryPayload: payload.rows[0],
    note: 'Size estimate computed on the server; no credential rows downloaded. Excludes protocol/TLS overhead.' }, null, 2));
  const connections = await client.query(`SELECT count(*) AS total,
    count(*) FILTER (WHERE state = 'active') AS active,
    count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction
    FROM pg_stat_activity WHERE datname = current_database()`);
  const storage = await client.query(`SELECT count(*) AS objects,
    COALESCE(sum(CASE WHEN metadata->>'size' ~ '^[0-9]+$' THEN (metadata->>'size')::numeric ELSE 0 END), 0) AS stored_bytes
    FROM storage.objects`);
  console.log(JSON.stringify({ connections: connections.rows[0], storage: storage.rows[0] }, null, 2));
  const tables = await client.query(`
    SELECT relname, n_live_tup, seq_scan, seq_tup_read, idx_scan,
      pg_total_relation_size(relid) AS stored_bytes
    FROM pg_stat_user_tables WHERE schemaname IN ('public', 'storage')
    ORDER BY pg_total_relation_size(relid) DESC LIMIT 10
  `);
  console.log(JSON.stringify({ tables: tables.rows }, null, 2));
  await client.query('ROLLBACK');
} catch (error) {
  console.error('Egress diagnostic failed.', { code: (error as { code?: string }).code });
  process.exitCode = 1;
} finally {
  await client.end();
}
