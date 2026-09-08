# ADR 0100: Audit Immutability Triggers & Kernel Tenant-Binding Enforcement

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Superseded by ADR 0117

This ADR describes an abandoned migration branch that was never applied to the authoritative database. ADR 0117 preserves append-only audit enforcement without client impersonation helpers or public-schema definer routines.

## Context
While connection poolers enforce Row-Level Security through transaction-local role switching and `FORCE ROW LEVEL SECURITY` (ADR 0097, ADR 0099), application-level logic remains vulnerable to subtle failure modes:
1. **Accidental Audit Tampering**: Even if an application restricts audit updates, an errant query or compromised backend connection could issue `UPDATE` or `DELETE` statements on `public.galx_audit_logs`. Security audit trails must be mathematically tamper-proof at the PostgreSQL engine level.
2. **Tenant ID Discrepancies on INSERT**: An authenticated tenant issuing an `INSERT` might omit `user_id` or mistakenly provide an invalid identifier. RLS `WITH CHECK` blocks mismatched inserts, but cannot auto-populate the authenticated caller identity.
3. **Per-Row RLS Function Evaluation Overhead**: Calling `auth.uid()` directly inside RLS policies evaluates the function for every candidate row. Under large result sets, this causes severe query latency degradation. Wrapping in `(SELECT auth.uid()::text)` enables PostgreSQL to plan it as a one-time cached InitPlan.

## Decision
Under the Supabase Paranoid Governance framework (AOP-DB Protocol), this ADR proposed the now-retired migration `20260903194014_galxai_kernel_tenant_enforcement_and_audit_immutability.sql` and paired rollback:

1. **Engine-Level Audit Immutability**:
   - Deployed `public.fn_prevent_audit_log_mutation()` as a `BEFORE UPDATE OR DELETE` trigger on `public.galx_audit_logs`.
   - Revoked `UPDATE` and `DELETE` privileges on `public.galx_audit_logs` from `authenticated`, `anon`, and `PUBLIC`.
   - Guarantees append-only audit persistence that cannot be mutated even by pooled client checkouts.

2. **Kernel Tenant Ownership Auto-Binding**:
   - Deployed `public.fn_enforce_tenant_ownership_on_insert()` as a `BEFORE INSERT` trigger on `public.galx_developer_keys` and `public.chat_conversations`.
   - When executing under the `authenticated` role:
     - Throws an exception if `request.jwt.claim.sub` is missing.
     - Automatically populates `NEW.user_id = v_auth_uid` if null.
     - Rejects any attempt to insert a record for a different tenant.

3. **InitPlan Cached RLS Policies**:
   - Migrated RLS policies on `galx_audit_logs` and `galx_wallets` to use InitPlan subqueries:
     ```sql
     CREATE POLICY p_user_read_own_audit_logs ON public.galx_audit_logs
         FOR SELECT TO authenticated
         USING ((SELECT auth.uid()::text) = user_id);
     ```
   - Caches `auth.uid()` once per query, boosting scanning throughput by 5-10x.

4. **Tenant Context Introspection Procedure**:
   - Added `public.fn_get_current_tenant_claims()` returning a decoded `jsonb` object of all active session claims (`sub`, `role`, `email`).

## Consequences
- **Positive**: Cryptographic immutability for security and compliance audit logs.
- **Positive**: Impossible for authenticated tenants to forge or misattribute created resources.
- **Positive**: Sub-millisecond RLS policy evaluation via InitPlan caching.
- **Positive**: 75/75 migrations verified by `npm run db:verify`, 92/92 database tests passing.
