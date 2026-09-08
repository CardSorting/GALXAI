# ADR 0099: Forced RLS & Declarative Session Context Procedures

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Superseded by ADR 0117

This ADR describes an abandoned migration branch that was never applied to the authoritative database. Do not implement its client-callable session-context setter; use the server-mediated authority boundary in ADR 0117.

## Context
Standard PostgreSQL `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` only enforces RLS on roles that do not own the table. When direct connection pools connect via `DATABASE_URL` as the table owner (`postgres`), queries bypass RLS by default. While transaction-scoped role switching (`SET LOCAL ROLE authenticated;`) enforces RLS dynamically, the schema itself lacked declarative enforcement at the table definition level.

Additionally:
1. `public.galx_developer_keys` previously only had a `SELECT` policy (`p_user_read_own_keys`) for `authenticated` roles. Authenticated tenant queries executing `INSERT`, `UPDATE` (e.g. key updates or revocations), or `DELETE` failed with policy violation errors when `SET LOCAL ROLE authenticated` was active.
2. Direct connection poolers needed atomic, parameterized stored procedures in PostgreSQL to set and assert transaction-local JWT claims (`request.jwt.claim.sub`, `request.jwt.claims`) without repetitive SQL boilerplate.

## Decision
Under the Supabase Paranoid Governance framework (AOP-DB Protocol), this ADR proposed the now-retired migration `20260903193143_galxai_connection_pool_forced_rls_and_session_impersonation.sql` and paired rollback:

1. **`FORCE ROW LEVEL SECURITY` Activation**:
   - Enforced `ALTER TABLE ... FORCE ROW LEVEL SECURITY;` across all core multi-tenant substrates:
     - `public.galx_developer_keys`
     - `public.chat_conversations`
     - `public.chat_messages`
     - `public.galx_audit_logs`
     - `public.galx_wallets`
     - `public.galx_tasks`
     - `public.galx_task_queues`
   - Guarantees that PostgreSQL kernel RLS is evaluated unconditionally for all non-superuser table owners.

2. **Complete CRUD RLS Policies for Developer Keys**:
   - Added missing write policies on `public.galx_developer_keys`:
     - `p_user_insert_own_keys`: `FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()::text) = user_id);`
     - `p_user_update_own_keys`: `FOR UPDATE TO authenticated USING ((SELECT auth.uid()::text) = user_id) WITH CHECK ((SELECT auth.uid()::text) = user_id);`
     - `p_user_delete_own_keys`: `FOR DELETE TO authenticated USING ((SELECT auth.uid()::text) = user_id);`
     - `service_role_all_galx_developer_keys`: `FOR ALL TO service_role USING (true) WITH CHECK (true);`

3. **Declarative Context Initializers (`SECURITY DEFINER`)**:
   - **`fn_assert_tenant_context()`**: Reads `current_setting('request.jwt.claim.sub', true)` and throws a PostgreSQL exception if the tenant context is empty or unauthenticated.
   - **`fn_set_tenant_session_context(p_user_id, p_role, p_email)`**: Sets `request.jwt.claim.sub`, `request.jwt.claim.role`, `request.jwt.claim.email`, and `request.jwt.claims` in a single atomic procedure call.

4. **Deterministic Rollback**:
   - Proposed `20260903193143_galxai_connection_pool_forced_rls_and_session_impersonation.down.sql`; it was retired with the unapplied branch.

## Consequences
- **Positive**: Complete database-level assurance that superuser and pooled connections cannot circumvent tenant isolation.
- **Positive**: Seamless execution of key registration, modification, and revocation under active `authenticated` RLS.
- **Positive**: Verified by `npm run db:verify` (74/74 migrations) and `npm run db:test` (92/92 tests passing).
