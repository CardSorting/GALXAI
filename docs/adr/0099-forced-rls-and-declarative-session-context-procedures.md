# ADR 0099: Forced RLS & Declarative Session Context Procedures

## Status
Accepted

## Context
Standard PostgreSQL `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` only enforces RLS on roles that do not own the table. When direct connection pools connect via `DATABASE_URL` as the table owner (`postgres`), queries bypass RLS by default. While transaction-scoped role switching (`SET LOCAL ROLE authenticated;`) enforces RLS dynamically, the schema itself lacked declarative enforcement at the table definition level.

Additionally:
1. `public.galx_developer_keys` previously only had a `SELECT` policy (`p_user_read_own_keys`) for `authenticated` roles. Authenticated tenant queries executing `INSERT`, `UPDATE` (e.g. key updates or revocations), or `DELETE` failed with policy violation errors when `SET LOCAL ROLE authenticated` was active.
2. Direct connection poolers needed atomic, parameterized stored procedures in PostgreSQL to set and assert transaction-local JWT claims (`request.jwt.claim.sub`, `request.jwt.claims`) without repetitive SQL boilerplate.

## Decision
Under the Supabase Paranoid Governance framework (AOP-DB Protocol), implemented migration [`20260903193143_galxai_connection_pool_forced_rls_and_session_impersonation.sql`](file:///Users/bozoegg/Desktop/GALXAI/supabase/migrations/20260903193143_galxai_connection_pool_forced_rls_and_session_impersonation.sql) and paired rollback:

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
   - Authored [`supabase/rollbacks/20260903193143_galxai_connection_pool_forced_rls_and_session_impersonation.down.sql`](file:///Users/bozoegg/Desktop/GALXAI/supabase/rollbacks/20260903193143_galxai_connection_pool_forced_rls_and_session_impersonation.down.sql) enabling 1-click schema reversion.

## Consequences
- **Positive**: Complete database-level assurance that superuser and pooled connections cannot circumvent tenant isolation.
- **Positive**: Seamless execution of key registration, modification, and revocation under active `authenticated` RLS.
- **Positive**: Verified by `npm run db:verify` (74/74 migrations) and `npm run db:test` (92/92 tests passing).
