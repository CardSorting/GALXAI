# ADR 0104: Least-Privilege DAC Table Grants for Authenticated Tenant Role

## Status
Accepted

## Context
When application connection pools execute queries under transaction-scoped tenant impersonation (`executePostgresTransactionAsUser`, `SET LOCAL ROLE authenticated;`), PostgreSQL evaluates authorization across two independent security boundaries:
1. **DAC (Discretionary Access Control)**: Checks whether the active database role has SQL privileges (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on the targeted table.
2. **MAC (Mandatory Access Control / RLS)**: Evaluates row-level policy filters (`USING`, `WITH CHECK`).

In prior migrations (e.g. migration V53), blanket `REVOKE ALL ON TABLE ... FROM anon, authenticated;` was executed on core chat and context tables. Consequently, when connection pools downgraded from superuser to the `authenticated` role to enforce RLS, PostgreSQL immediately aborted queries with `permission denied for table ...` before RLS policies could even be evaluated.

## Decision
Under the Supabase Paranoid Governance framework (AOP-DB Protocol) and the Principle of Least Privilege ([`security-privileges.md`](file:///Users/bozoegg/Desktop/GALXAI/.agents/skills/supabase-postgres-best-practices/references/security-privileges.md)), implemented migration [`20260903200000_galxai_least_privilege_dac_grants_for_authenticated_tenant_role.sql`](file:///Users/bozoegg/Desktop/GALXAI/supabase/migrations/20260903200000_galxai_least_privilege_dac_grants_for_authenticated_tenant_role.sql) and paired rollback:

1. **Schema & Sequence Access**:
   - `GRANT USAGE ON SCHEMA public TO authenticated, anon;`
   - `GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;`

2. **Full Self-Service CRUD Table Grants**:
   - Granted `SELECT, INSERT, UPDATE, DELETE` to `authenticated` exclusively on user-managed tenant assets:
     - `public.galx_developer_keys`
     - `public.chat_conversations`
     - `public.chat_messages`
     - `public.custom_personas`
     - `public.image_generations`
     - `public.galx_tasks`
     - `public.galx_chat_rolling_memory`
     - `public.galx_budget_alerts`

3. **Restricted Least-Privilege Grants for Financial & Audit Substrates**:
   - `public.galx_wallets`: Granted `SELECT, UPDATE` (`DELETE` strictly prohibited).
   - `public.galx_audit_logs`: Granted `SELECT, INSERT` (`UPDATE` and `DELETE` strictly prohibited).
   - `public.galx_stripe_customers`: Granted `SELECT, INSERT, UPDATE` (`DELETE` strictly prohibited).
   - `public.galx_stripe_invoices`: Granted `SELECT` only (read-only billing records).

4. **Explicit Revocation of Dangerous Mutations**:
   - Revoked `UPDATE, DELETE` on audit logs and `DELETE` on wallets/invoices from `authenticated`, `anon`, and `PUBLIC`.

5. **Procedure Execution Grants**:
   - Explicitly granted execution on all tenant context procedures (`fn_assert_tenant_context`, `fn_set_tenant_session_context`, `fn_get_current_tenant_claims`, `fn_is_tenant_resource_owner`, `fn_can_access_conversation`).

## Consequences
- **Positive**: Perfectly harmonizes PostgreSQL DAC permissions with C-kernel Row-Level Security (MAC).
- **Positive**: Zero `permission denied` errors when running `executePostgresTransactionAsUser`.
- **Positive**: 79/79 migrations verified by `npm run db:verify`, 92/92 database tests passing.
