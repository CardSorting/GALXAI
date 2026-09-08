# ADR 0104: Least-Privilege DAC Table Grants for Authenticated Tenant Role

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Superseded by ADR 0117

This ADR describes an abandoned migration branch that was never applied to the authoritative database. Its broad client DML grants conflict with the current server-side repository boundary and must not be applied.

## Context
When application connection pools execute queries under transaction-scoped tenant impersonation (`executePostgresTransactionAsUser`, `SET LOCAL ROLE authenticated;`), PostgreSQL evaluates authorization across two independent security boundaries:
1. **DAC (Discretionary Access Control)**: Checks whether the active database role has SQL privileges (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on the targeted table.
2. **MAC (Mandatory Access Control / RLS)**: Evaluates row-level policy filters (`USING`, `WITH CHECK`).

In prior migrations (e.g. migration V53), blanket `REVOKE ALL ON TABLE ... FROM anon, authenticated;` was executed on core chat and context tables. Consequently, when connection pools downgraded from superuser to the `authenticated` role to enforce RLS, PostgreSQL immediately aborted queries with `permission denied for table ...` before RLS policies could even be evaluated.

## Decision
Under the Supabase Paranoid Governance framework (AOP-DB Protocol) and the Principle of Least Privilege, this ADR proposed the now-retired migration `20260903200000_galxai_least_privilege_dac_grants_for_authenticated_tenant_role.sql` and paired rollback:

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
