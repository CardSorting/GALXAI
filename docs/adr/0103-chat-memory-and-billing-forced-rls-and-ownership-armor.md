# ADR 0103: Chat Memory & Billing Forced RLS with Ownership Armor

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Superseded by ADR 0117

This ADR describes an abandoned migration branch that was never applied to the authoritative database. ADR 0117 retains forced RLS while making chat memory and billing state backend-only.

## Context
Following the hardening of developer keys, conversation sessions, messages, and background tasks (ADRs 0097–0102), the remaining multi-tenant operational data layer required structural parity:
1. **Unenforced Owner RLS on Chat Memory and Billing Substrates**: Long-term chat context tables (`galx_chat_rolling_memory`, `galx_chat_memory_graph_edges`, `galx_chat_context_episodes`), workspace financial guardrails (`galx_budget_alerts`), and customer billing records (`galx_stripe_customers`, `galx_stripe_invoices`) had only standard `ENABLE ROW LEVEL SECURITY`. Under direct pooled connections, the table owner role bypassed RLS policies.
2. **Missing Ownership Reassignment Armor**: A tenant updating budget threshold alerts or chat memory could theoretically change `user_id`, orphaning alerts or leaking memory blocks across tenants.
3. **Linear Per-Row Evaluation Overhead**: `galx_chat_rolling_memory` evaluated `auth.uid()::text = user_id` on every candidate row, rather than leveraging cached InitPlan subqueries.

## Decision
Under the Supabase Paranoid Governance framework (AOP-DB Protocol), this ADR proposed the now-retired migration `20260903195655_galxai_chat_memory_and_billing_forced_rls_armor.sql` and paired rollback:

1. **`FORCE ROW LEVEL SECURITY` on Memory & Billing**:
   - Enforced `ALTER TABLE ... FORCE ROW LEVEL SECURITY;` on:
     - `public.galx_chat_rolling_memory`
     - `public.galx_chat_memory_graph_edges`
     - `public.galx_chat_context_episodes`
     - `public.galx_budget_alerts`
     - `public.galx_stripe_customers`
     - `public.galx_stripe_invoices`

2. **Tenant Ownership Immutability**:
   - Attached `fn_prevent_tenant_ownership_reassignment()` as a `BEFORE UPDATE` trigger on:
     - `galx_chat_rolling_memory`
     - `galx_budget_alerts`
     - `galx_stripe_customers`
   - Blocks any attempt to mutate `user_id` on existing records.

3. **Auto-Binding Tenant Ownership on Insertion**:
   - Attached `fn_enforce_tenant_ownership_on_insert()` as a `BEFORE INSERT` trigger on `galx_chat_rolling_memory` and `galx_budget_alerts`.
   - Binds `NEW.user_id = v_auth_uid` automatically when executed under the authenticated tenant context.

4. **InitPlan Cached Subquery Policies**:
   - Upgraded `galx_chat_rolling_memory` RLS policies (`p_chat_rolling_mem_select`, `p_chat_rolling_mem_insert`, `p_chat_rolling_mem_update`, `p_chat_rolling_mem_delete`) to use `((SELECT auth.uid()::text) = user_id)`.

## Consequences
- **Positive**: 100% of multi-tenant tables in GALXAI now enforce `FORCE ROW LEVEL SECURITY`.
- **Positive**: Complete prevention of tenant reassignment on memory blocks and billing accounts.
- **Positive**: 78/78 migrations verified by `npm run db:verify`, 92/92 database tests passing.
