/**
 * GALXAI: Direct PostgreSQL Connection Pool Substrate + Autonomous Circuit Breaker
 * Authoritative superuser / connection-pooled gateway for enterprise operations.
 * Connects directly via DATABASE_URL to guarantee zero-loss persistence and bypass client-side RLS filtering.
 *
 * Resilience Protocols:
 * 1. Autonomous Circuit Breaker: Fails fast to BroccoliDB hot-cache upon 3 consecutive DB timeouts/errors, preventing gateway request stalling.
 * 2. Transaction Pooler Compatibility: Configured for PgBouncer transaction-mode port 6543.
 * 3. Idle Client Recovery: Automatic non-fatal error isolation and self-healing.
 * 4. Statement Timeouts: 6,000ms hard ceiling to prevent connection exhaustion.
 * 5. Keep-Alive: 10,000ms TCP heartbeat to eliminate silent dead-socket hangs on AWS RDS.
 */

import { Pool, PoolClient, PoolConfig, QueryResult, QueryResultRow } from 'pg';

export type PostgresSslMode = 'require' | 'verify-full';

/**
 * Builds the TLS policy shared by runtime pools and migration tooling.
 * `require` encrypts transport; `verify-full` also authenticates the Supabase
 * endpoint and requires the project CA certificate from Database Settings.
 */
export function getPostgresSslConfig(): PoolConfig['ssl'] {
  const mode = (process.env.SUPABASE_DB_SSL_MODE || 'require') as PostgresSslMode;
  if (mode !== 'require' && mode !== 'verify-full') {
    throw new Error('SUPABASE_DB_SSL_MODE must be either require or verify-full.');
  }

  const ca = process.env.SUPABASE_DB_CA_CERT?.replace(/\\n/g, '\n').trim();
  if (mode === 'verify-full' && !ca) {
    throw new Error(
      'SUPABASE_DB_CA_CERT is required when SUPABASE_DB_SSL_MODE=verify-full.'
    );
  }

  return {
    rejectUnauthorized: mode === 'verify-full',
    ...(ca ? { ca } : {})
  };
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failures: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  openUntil: number;
}

/** SQL/data errors are not evidence that the database transport is unavailable. */
export function isDatabaseAvailabilityError(error: any): boolean {
  const code = String(error?.code || '');
  if (/^08/.test(code) || ['57P01', '57P02', '57P03', '53300', '53400', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) return true;
  const message = String(error?.message || '');
  if (code === '57014') return false; // Statement/caller deadlines are query-scoped.
  if (/^[0-9A-Z]{5}$/.test(code)) return false;
  return /connection (?:terminated|closed|timeout)|timeout (?:expired|exceeded)|query read timeout/i.test(message);
}

export interface PostgresExecutionPermit {
  readonly epoch: number;
  readonly probe: boolean;
}

export class PostgresCircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private lastSuccessTime: number;
  private openUntil = 0;
  private epoch = 0;
  private readonly issued = new WeakSet<PostgresExecutionPermit>();

  constructor(private readonly now: () => number = Date.now) {
    this.lastSuccessTime = now();
  }

  /** Observation only; execution requires an atomic permit reservation. */
  canExecute(): boolean {
    return this.state === 'CLOSED' || (this.state === 'OPEN' && this.now() >= this.openUntil);
  }

  acquirePermit(): PostgresExecutionPermit | null {
    if (!this.canExecute()) return null;
    const probe = this.state === 'OPEN';
    if (probe) {
      this.state = 'HALF_OPEN';
      this.epoch++;
    }
    const permit = Object.freeze({ epoch: this.epoch, probe });
    this.issued.add(permit);
    return permit;
  }

  private consume(permit?: PostgresExecutionPermit): boolean {
    // Unscoped legacy observations must never close or extend an open circuit.
    if (!permit) return this.state === 'CLOSED';
    if (!this.issued.delete(permit)) return false;
    return permit.epoch === this.epoch;
  }

  recordSuccess(permit?: PostgresExecutionPermit): void {
    if (!this.consume(permit)) return;
    this.failures = 0;
    this.state = 'CLOSED';
    this.openUntil = 0;
    this.lastSuccessTime = this.now();
    this.epoch++;
  }

  recordFailure(error: any, permit?: PostgresExecutionPermit): void {
    if (!this.consume(permit)) return;
    if (!isDatabaseAvailabilityError(error)) {
      // A neutral outcome retires the probe without manufacturing health evidence.
      // The next real request may probe; no slot remains stuck after SQL rejection.
      if (permit?.probe) {
        this.state = 'OPEN';
        this.openUntil = this.now();
        this.epoch++;
      }
      return;
    }
    const now = this.now();
    this.failures = (now - this.lastFailureTime <= 60_000 ? this.failures : 0) + 1;
    this.lastFailureTime = now;
    if (this.failures >= 3 || permit?.probe) {
      this.state = 'OPEN';
      this.openUntil = now + 5000;
      this.epoch++;
      console.warn('[PostgresCircuitBreaker] Database transport unavailable; recovery probe allowed in 5000ms.');
    }
  }

  getStatus(): CircuitBreakerStatus {
    return { state: this.state, failures: this.failures, lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime, openUntil: this.openUntil };
  }
}

declare global {
  var __galx_pg_pool: Pool | undefined;
  var __galx_pg_breaker: PostgresCircuitBreaker | undefined;
}

export function getCircuitBreaker(): PostgresCircuitBreaker {
  if (!globalThis.__galx_pg_breaker) {
    globalThis.__galx_pg_breaker = new PostgresCircuitBreaker();
  }
  return globalThis.__galx_pg_breaker;
}

export function getPostgresPool(): Pool | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;

  if (!globalThis.__galx_pg_pool) {
    const config: PoolConfig = {
      connectionString: dbUrl,
      ssl: getPostgresSslConfig(),
      max: Number(process.env.SUPABASE_POOL_SIZE || '15'),
      maxUses: Number(process.env.SUPABASE_POOL_MAX_USES || '7500'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 6000,
      query_timeout: 6000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      application_name: 'galxai-gateway-pool',
    };

    const pool = new Pool(config);

    pool.on('error', (err) => {
      console.warn('[PostgresPool] Handled idle client disconnect/error:', err.message);
    });

    globalThis.__galx_pg_pool = pool;
  }

  return globalThis.__galx_pg_pool;
}

/** Closes the process-global pool for short-lived CLI and verification tools. */
export async function closePostgresPool(): Promise<void> {
  const pool = globalThis.__galx_pg_pool;
  globalThis.__galx_pg_pool = undefined;
  if (pool) await pool.end();
}

const MAX_WAITING_POOL_CLIENTS = 25;

/**
 * Safely executes a query through the PostgreSQL connection pool protected by the circuit breaker.
 * If the pool is saturated or unreachable, immediately returns null without blocking the gateway.
 * Executes once: callers own any retry based on operation-specific idempotency.
 */
export async function executePostgresQuery<R extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<R> | null> {
  const pool = getPostgresPool();
  // Local backpressure is not evidence of an outage. Check before reserving a probe.
  if (!pool || pool.waitingCount >= MAX_WAITING_POOL_CLIENTS) return null;
  const breaker = getCircuitBreaker();
  const permit = breaker.acquirePermit();
  if (!permit) return null;
  try {
    const result = await pool.query<R>(text, params);
    breaker.recordSuccess(permit);
    return result;
  } catch (err: any) {
    // Do not replay arbitrary SQL: a transport timeout may follow a committed write.
    breaker.recordFailure(err, permit);
    console.warn('[PostgresPool] Query execution error:', err.message);
    return null;
  }
}

/**
 * Safely executes an atomic multi-statement transaction protected by the circuit breaker.
 */
export async function executePostgresTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T | null> {
  const pool = getPostgresPool();
  if (!pool || pool.waitingCount >= MAX_WAITING_POOL_CLIENTS) return null;
  const breaker = getCircuitBreaker();
  const permit = breaker.acquirePermit();
  if (!permit) return null;

  let client: PoolClient | null = null;
  let hasError = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN;');
    const result = await callback(client);
    await client.query('COMMIT;');
    breaker.recordSuccess(permit);
    return result;
  } catch (err: any) {
    hasError = isDatabaseAvailabilityError(err) || !/^[0-9A-Z]{5}$/.test(String(err?.code || ''));
    if (client) {
      try {
        await client.query('ROLLBACK;');
      } catch {
        hasError = true;
      }
    }
    breaker.recordFailure(err, permit);
    console.warn('[PostgresPool] Transaction error:', err.message);
    return null;
  } finally {
    if (client) {
      client.release(hasError);
    }
  }
}

export interface TenantContextOptions {
  role?: 'authenticated' | 'anon' | 'service_role';
  email?: string;
  metadata?: Record<string, any>;
  statementTimeoutMs?: number;
}

/**
 * Safely executes a transaction impersonating an authenticated tenant context.
 * Sets transaction-local `request.jwt.claim.sub` and switches role to `authenticated`,
 * guaranteeing that PostgreSQL's native Row-Level Security (RLS) policies are actively
 * enforced even when connecting via the superuser connection pool.
 *
 * Scoped strictly to the transaction (`is_local = true`), ensuring zero connection-state leakage
 * across pooled client checkouts. Discards failed client connections on error.
 */
export async function executePostgresTransactionAsUser<T>(
  userId: string,
  callback: (client: PoolClient) => Promise<T>,
  options?: TenantContextOptions
): Promise<T | null> {
  if (!userId) {
    throw new Error('[PostgresPool] Cannot execute tenant transaction without an authenticated userId');
  }

  const role = options?.role || 'authenticated';
  const timeoutMs = Math.min(Math.max(Number(options?.statementTimeoutMs || 4000), 500), 10000);
  const jwtClaims = JSON.stringify({
    ...(options?.metadata || {}),
    ...(options?.email ? { email: options.email } : {}),
    sub: userId,
    role
  });

  const pool = getPostgresPool();
  if (!pool || pool.waitingCount >= MAX_WAITING_POOL_CLIENTS) return null;
  const breaker = getCircuitBreaker();
  const permit = breaker.acquirePermit();
  if (!permit) return null;

  let client: PoolClient | null = null;
  let hasError = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN;');
    await client.query(`SET LOCAL statement_timeout = ${timeoutMs}; SET LOCAL idle_in_transaction_session_timeout = 5000;`);
    await client.query(
      `SELECT
         set_config('request.jwt.claim.sub', $1, true),
         set_config('request.jwt.claim.role', $2, true),
         set_config('request.jwt.claim.email', $3, true),
         set_config('request.jwt.claims', $4, true);`,
      [userId, role, options?.email || '', jwtClaims]
    );

    if (role === 'authenticated') {
      await client.query('SET LOCAL ROLE authenticated;');
    } else if (role === 'anon') {
      await client.query('SET LOCAL ROLE anon;');
    }

    const result = await callback(client);
    await client.query('COMMIT;');
    breaker.recordSuccess(permit);
    return result;
  } catch (err: any) {
    hasError = isDatabaseAvailabilityError(err) || !/^[0-9A-Z]{5}$/.test(String(err?.code || ''));
    if (client) {
      try {
        await client.query('ROLLBACK;');
      } catch {
        hasError = true;
      }
    }
    breaker.recordFailure(err, permit);
    console.warn('[PostgresPool] Tenant transaction error:', err.message);
    return null;
  } finally {
    if (client) {
      client.release(hasError);
    }
  }
}

/**
 * Safely executes a query with active PostgreSQL Row-Level Security (RLS) enforcement
 * by running inside a transaction-local tenant context.
 */
export async function executePostgresQueryAsUser<R extends QueryResultRow = any>(
  userId: string,
  text: string,
  params?: any[],
  options?: TenantContextOptions
): Promise<QueryResult<R> | null> {
  return executePostgresTransactionAsUser(
    userId,
    async (client) => {
      return client.query<R>(text, params);
    },
    options
  );
}

export function getPostgresPoolStats() {
  const pool = getPostgresPool();
  const breaker = getCircuitBreaker();
  return {
    isConfigured: Boolean(pool),
    totalCount: pool?.totalCount || 0,
    idleCount: pool?.idleCount || 0,
    waitingCount: pool?.waitingCount || 0,
    circuitBreaker: breaker.getStatus(),
  };
}

export async function isPostgresPoolHealthy(): Promise<boolean> {
  const res = await executePostgresQuery<{ alive: number }>('SELECT 1 as alive;');
  return res?.rows?.[0]?.alive === 1;
}
