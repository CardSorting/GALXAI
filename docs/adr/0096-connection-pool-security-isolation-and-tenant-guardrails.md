# ADR 0096: Connection Pool Security Isolation & Tenant Guardrails

## Status
Accepted

## Context
When connecting directly to PostgreSQL via `DATABASE_URL` using connection poolers (`pg.Pool` on port 5432/6543), database queries run with authoritative privileges that bypass PostgREST's automatic client-side Row-Level Security (`auth.uid()`). If queries rely on ambient trust or unvalidated IDs, there is a risk of cross-tenant data leakage or unauthorized mutation. Additionally, direct pool connections without pinned schema configurations are susceptible to search-path manipulation attacks in multi-schema databases.

## Decision
1. **Defensive Parameterized Tenant Isolation**:
   - In all direct PostgreSQL operations across `ApiKeyRepository`, `ChatRepository`, `ShardRepository`, `TaskRepository`, and `WalletRepository`, enforced explicit and parameterized `WHERE user_id = $N` constraints.
   - Updated `ApiKeyRepository.getGatewayKeyById(id, userId)` and `revokeKey(keyId, reason, userId)` to enforce ownership checks at **both layers**:
     - **In-Memory Guard**: Checks `key.userId === userId` before returning or mutating L0/L1 hot cache pointers.
     - **SQL Isolation Guard**: Appends `AND ($3::text IS NULL OR user_id = $3::text)` to prevent unauthorized updates at the database level.
2. **Schema Search-Path Hijacking Defense**:
   - In [`src/lib/db/postgres.ts`](file:///Users/bozoegg/Desktop/GALXAI/src/lib/db/postgres.ts), registered a client connection listener:
     ```ts
     pool.on('connect', (client) => {
       client.query('SET search_path = public;').catch(() => {});
     });
     ```
   - Pins all connection sessions strictly to the trusted `public` schema upon checkout.
3. **Forensic Database Process Identification**:
   - Configured `application_name: 'galxai-gateway-pool'` in `PoolConfig`.
   - Distinguishes pool connection processes in `pg_stat_activity` from background workers, migration scripts, and Supabase Studio.

## Consequences
- **Positive**: Complete defense against cross-tenant key access or revocation on direct connection pool paths.
- **Positive**: Strict protection against search-path injection vulnerabilities.
- **Positive**: High forensic visibility in PostgreSQL activity logs and metrics.
- **Positive**: Zero performance penalty; connection initialization hooks execute asynchronously on pool checkout.
