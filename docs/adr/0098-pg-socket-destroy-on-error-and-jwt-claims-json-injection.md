# ADR 0098: PostgreSQL Socket Destruction on Error & Complete JWT Claims JSON Injection

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted

## Context
When running transactions over pooled connections with session context impersonation (`executePostgresTransaction` and `executePostgresTransactionAsUser`):
1. **Dirty Connection Recirculation**: Standard `client.release()` returns the connection back into the idle pool even if a network timeout, aborted transaction, or unhandled SQL error occurred. If the connection was left in an aborted or corrupted state, subsequent checkouts fail or experience silent errors.
2. **Incomplete `auth.jwt()` Claims**: PostgREST sets both scalar variables (`request.jwt.claim.sub`) and the full JSON object (`request.jwt.claims`). PostgreSQL RLS policies inspecting `auth.jwt() ->> 'email'` or `auth.jwt() ->> 'role'` would evaluate to `NULL` if only scalar settings were populated.
3. **Abandoned Transaction Locks**: Without explicit transaction timeouts, a network freeze or client hang during an active transaction holds row and table locks indefinitely.

## Decision
1. **Forced Socket Destruction on Failure (`client.release(hasError)`)**:
   - In [`src/lib/db/postgres.ts`](../../src/lib/db/postgres.ts), modified both `executePostgresTransaction` and `executePostgresTransactionAsUser` to track `hasError`.
   - In the `finally` block, executes `client.release(hasError)`. In `pg` (`node-postgres`), passing a truthy error flag instructs the connection pool to **immediately destroy the TCP socket** rather than recycling it.
2. **Full JWT Claims JSON Injection**:
   - Injected both scalar and JSON claims into the transaction session:
     ```sql
     SET LOCAL statement_timeout = 4000;
     SET LOCAL idle_in_transaction_session_timeout = 5000;
     SELECT
       set_config('request.jwt.claim.sub', $1, true),
       set_config('request.jwt.claim.role', $2, true),
       set_config('request.jwt.claim.email', $3, true),
       set_config('request.jwt.claims', $4, true);
     ```
   - Guarantees 100% policy compatibility for both `auth.uid()` and `auth.jwt() ->> 'email'`.
3. **Idle-in-Transaction & Statement Timeouts**:
   - Set `idle_in_transaction_session_timeout = 5000` to automatically terminate stalled transactions on PostgreSQL, releasing held locks immediately.

## Consequences
- **Positive**: Zero possibility of recycled dirty connections or leaked transaction state in the pool.
- **Positive**: Complete compatibility with complex Supabase RLS policies using `auth.jwt()`.
- **Positive**: Immediate termination of hung transactions within 5 seconds, preventing connection pool starvation.
