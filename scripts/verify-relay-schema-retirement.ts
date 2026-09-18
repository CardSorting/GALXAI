import pg from 'pg';
import { getPostgresSslConfig } from '../src/lib/db/postgres';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: getPostgresSslConfig(),
  connectionTimeoutMillis: 10_000,
});

const relayTables = [
  'galx_relay_installations',
  'galx_relay_principals',
  'galx_relay_registrations',
  'galx_relay_account_assignments',
  'galx_relay_registration_operations',
  'galx_relay_control_operations',
  'galx_relay_management_operations',
  'galx_relay_lease_bindings',
] as const;

async function run() {
  await client.connect();
  try {
    const pool = await client.query<{ id: string }>(
      `SELECT id FROM private.galx_relay_pools WHERE id = 'standard'`,
    );
    if (pool.rowCount !== 0) throw new Error('Standard relay pool still exists');

    for (const table of relayTables) {
      const result = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM private.${table} WHERE pool_id = 'standard'`,
      );
      if (result.rows[0]?.count !== '0') {
        throw new Error(`Standard relay rows remain in private.${table}`);
      }
    }

    const runtime = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM private.galx_relay_installation_runtime r
         JOIN private.galx_relay_installations i ON i.id = r.installation_id
        WHERE i.pool_id = 'standard'`,
    );
    if (runtime.rows[0]?.count !== '0') throw new Error('Standard relay runtime rows remain');

    const accounts = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.galx_shard_accounts WHERE relay_pool_id = 'standard'`,
    );
    if (accounts.rows[0]?.count !== '0') {
      throw new Error('Public shard accounts still reference the Standard relay pool');
    }

    const constraints = await client.query<{ name: string; definition: string }>(
      `SELECT conname AS name, pg_get_constraintdef(oid) AS definition
         FROM pg_constraint
        WHERE conrelid = 'private.galx_relay_pools'::regclass
          AND pg_get_constraintdef(oid) ILIKE '%standard%'`,
    );
    if (constraints.rowCount !== 0) throw new Error('Relay pool constraints still mention Standard');

    const functions = await client.query<{ name: string }>(
      `SELECT n.nspname || '.' || p.proname AS name
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'private'
          AND pg_get_functiondef(p.oid) ILIKE '%standard%'
          AND p.proname IN ('relay_configure_installation_before_automatic', 'relay_control_before_connections')`,
    );
    if (functions.rowCount !== 0) throw new Error('Active relay authorization functions still mention Standard');

    console.log('Relay schema retirement verification passed: no live Standard relay references remain.');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
