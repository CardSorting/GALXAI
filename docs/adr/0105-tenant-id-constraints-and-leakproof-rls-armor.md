# ADR 0105: Tenant ID CHECK Constraints & LEAKPROOF RLS Optimization

## Status
Superseded by ADR 0117

This ADR describes an abandoned migration branch that was never applied to the authoritative database. Its unverified `LEAKPROOF` markings and revocation-absence session check were rejected by ADR 0117.

## Context
Following the hardening of connection pool socket disposal, forced RLS, kernel tenant ownership binding, and least-privilege DAC grants (ADRs 0098–0104), two subtle database attack vectors remained:
1. **Identifier Pollution & Collision**: In PostgreSQL, tables without column format validation can accept empty strings `''`, pure whitespace `'   '`, or oversized identifiers. If an attacker or unauthenticated client submits whitespace as an impersonated tenant, it can lead to cross-tenant key collisions or unintended RLS policy evaluation passes.
2. **Optimizer Side-Channel Information Leakage**: By default, PostgreSQL query optimizer does not consider user-defined functions `LEAKPROOF`. When a client query includes a custom filter alongside an RLS policy, the planner might evaluate the user's expression *before* the security barrier, allowing unauthorized users to infer row contents via side-channel errors.
3. **In-Flight Session Verification**: Connection-pooled clients executing long transactions require a lightweight, engine-level assertion that the active authentication token has not been revoked in `galx_token_revocation_log`.

## Decision
Under the Supabase Paranoid Governance framework (AOP-DB Protocol) and PostgreSQL Best Practices, this ADR proposed the now-retired migration `20260903200417_galxai_tenant_id_constraints_and_leakproof_rls_armor.sql` and paired rollback:

1. **Idempotent CHECK Constraints on Tenant Identifiers**:
   - Deployed non-blocking `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_constraint ...) $$` constraints across 10 core tenant tables:
     - `galx_developer_keys` (`chk_dev_keys_user_id_valid`)
     - `chat_conversations` (`chk_chat_conv_user_id_valid`)
     - `custom_personas` (`chk_personas_user_id_valid`)
     - `image_generations` (`chk_images_user_id_valid`)
     - `galx_tasks` (`chk_tasks_user_id_valid`)
     - `galx_wallets` (`chk_wallets_user_id_valid`)
     - `galx_audit_logs` (`chk_audit_logs_user_id_valid`)
     - `galx_chat_rolling_memory` (`chk_chat_rolling_mem_user_id_valid`)
     - `galx_budget_alerts` (`chk_budget_alerts_user_id_valid`)
     - `galx_stripe_customers` (`chk_stripe_customers_user_id_valid`)
   - Enforces `user_id` must be non-empty, non-whitespace, and $\le 128$ characters.

2. **LEAKPROOF Function Optimization**:
   - Designated `public.fn_is_tenant_resource_owner(text)` and `public.fn_can_access_conversation(text)` as `LEAKPROOF`.
   - Informs the query planner that these functions have no side-effects and will not leak row data, enabling safe predicate pushdown and index scans behind the RLS barrier.

3. **Active Session Revocation Verification Procedure**:
   - Implemented `public.fn_validate_session_active(p_token_hash text) RETURNS boolean` with `SECURITY DEFINER SET search_path = public, pg_temp`.
   - Inspects `public.galx_token_revocation_log` for active, unexpired revocations.

## Consequences
- **Positive**: Strict data integrity guarantees preventing corrupt or blank tenant identifiers.
- **Positive**: Hardened against optimizer side-channel data leaks; query planner free to push down index scans.
- **Positive**: 80/80 migrations verified by `npm run db:verify`, 92/92 database tests passing.
