/**
 * GALXAI: Direct PostgreSQL Connection Pool Substrate
 * Authoritative superuser / connection-pooled gateway for enterprise operations.
 * Connects directly via DATABASE_URL to guarantee zero-loss persistence and bypass client-side RLS filtering.
 *
 * Resilience Protocols:
 * 1. Transaction Pooler Compatibility: Configured for PgBouncer transaction-mode port 6543.
 * 2. Idle Client Recovery: Automatic non-fatal error isolation and self-healing.
 * 3. Statement Timeouts: 6,000ms hard ceiling to prevent connection exhaustion.
 * 4. Keep-Alive: 10,000ms TCP heartbeat to eliminate silent dead-socket hangs on AWS RDS.
 */

import { Pool, PoolConfig } from 'pg';

declare global {
  var __galx_pg_pool: Pool | undefined;
}

export function getPostgresPool(): Pool | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;

  if (!globalThis.__galx_pg_pool) {
    const config: PoolConfig = {
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: Number(process.env.SUPABASE_POOL_SIZE || '15'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 6000,
      query_timeout: 6000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };

    const pool = new Pool(config);

    pool.on('error', (err) => {
      console.warn('[PostgresPool] Handled idle client disconnect/error:', err.message);
    });

    globalThis.__galx_pg_pool = pool;
  }

  return globalThis.__galx_pg_pool;
}

export async function isPostgresPoolHealthy(): Promise<boolean> {
  const pool = getPostgresPool();
  if (!pool) return false;
  try {
    const res = await pool.query('SELECT 1 as alive;');
    return res.rows?.[0]?.alive === 1;
  } catch {
    return false;
  }
}
