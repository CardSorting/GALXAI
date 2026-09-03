/**
 * GALXAI: Direct PostgreSQL Connection Pool Substrate
 * Authoritative superuser / connection-pooled gateway for enterprise operations.
 * Connects directly via DATABASE_URL to guarantee zero-loss persistence and bypass client-side RLS filtering.
 */

import { Pool } from 'pg';

declare global {
  var __galx_pg_pool: Pool | undefined;
}

export function getPostgresPool(): Pool | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;

  if (!globalThis.__galx_pg_pool) {
    globalThis.__galx_pg_pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: Number(process.env.SUPABASE_POOL_SIZE || '10'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    globalThis.__galx_pg_pool.on('error', (err) => {
      console.warn('[PostgresPool] Unexpected idle client error:', err.message);
    });
  }

  return globalThis.__galx_pg_pool;
}
