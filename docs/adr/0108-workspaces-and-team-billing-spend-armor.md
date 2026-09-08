# ADR 0108: Workspaces & Team Billing Spend Armor

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Superseded by ADR 0117

This ADR describes an abandoned migration branch that was never applied to the authoritative database. ADR 0117 replaces recursive membership policies and client grants with server-mediated workspace authority.

## Context
Following the hardening of compute balances, financial transaction ledgers, and API inference credit holds (ADRs 0106–0107), the enterprise organizational spending hierarchy required structural defense:
1. **Workspace Spend Mutation Vulnerability**: `public.galx_workspaces` tracks `monthly_spend_cap_usd` and `current_month_spend_usd`. Without an engine-level trigger, a tenant running an UPDATE query could reset or manipulate `current_month_spend_usd` to bypass billing limits. Furthermore, `galx_workspaces` and `galx_workspace_members` lacked `FORCE ROW LEVEL SECURITY` and policies allowing members to view their own workspaces.
2. **Team Cost Center Spend Armor**: In `public.galx_team_cost_centers`, departments have monthly budget caps and `current_spend_usd`. Unrestricted client updates could alter spend attribution.
3. **Governance Audit Log Immutability**: `public.galx_governance_audit_events` records SOC 2 compliance events (membership changes, role alterations, spend limit updates) and required append-only immutability.
4. **Missing DAC Table Grants**: `authenticated` role lacked `SELECT` permissions on organization, workspace, cost center, and invitation tables under `SET LOCAL ROLE authenticated`.

## Decision
Under the Supabase Paranoid Governance framework (AOP-DB Protocol) and the Principle of Least Privilege, this ADR proposed the now-retired migration `20260903202157_galxai_workspaces_and_team_billing_spend_armor.sql` and paired rollback:

1. **`FORCE ROW LEVEL SECURITY` on Workspaces & Members**:
   - Enforced on `public.galx_workspaces` and `public.galx_workspace_members`.
   - Deployed InitPlan cached subquery policies (`p_workspaces_member_select`, `p_workspace_members_select`) allowing members to view only workspaces they belong to.

2. **Workspace & Cost Center Spend Tamper-Proofing Triggers**:
   - Implemented `fn_prevent_workspace_spend_tampering()` as a `BEFORE UPDATE` trigger on `galx_workspaces`. Rejects any change to `current_month_spend_usd` unless executed by `service_role` or `postgres`.
   - Implemented `fn_prevent_cost_center_spend_tampering()` as a `BEFORE UPDATE` trigger on `galx_team_cost_centers`. Rejects any change to `current_spend_usd` unless executed by `service_role` or `postgres`.

3. **Governance Audit Log Immutability**:
   - Attached `fn_prevent_audit_log_mutation()` as a `BEFORE UPDATE OR DELETE` trigger on `public.galx_governance_audit_events`.
   - Revoked `UPDATE, DELETE` from `authenticated, anon, PUBLIC`.

4. **Least-Privilege DAC Table Grants**:
   - Granted `SELECT` to `authenticated` on `galx_workspaces`, `galx_workspace_members`, `galx_organizations`, `galx_organization_members`, `galx_team_cost_centers`, `galx_team_invitations`, and `galx_governance_audit_events`.

## Consequences
- **Positive**: Enterprise spend metrics and cost center caps cannot be altered by tenants via direct pooled connections.
- **Positive**: Complete SOC 2 governance audit log immutability.
- **Positive**: 83/83 migrations verified by `npm run db:verify`, 92/92 database tests passing.
