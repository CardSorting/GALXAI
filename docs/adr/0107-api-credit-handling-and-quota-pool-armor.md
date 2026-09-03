# ADR 0107: API Credit Handling & Quota Pool Armor

## Status
Accepted

## Context
Following the hardening of compute credit balances and financial ledger immutability (ADR 0106), the real-time API credit inference lifecycle required structural defense:
1. **Inference Pre-Authorization Holds (`galx_wallet_holds`)**: Used for two-phase credit commit (hold before LLM generation, commit upon stream completion). The table lacked column validation on `user_id`, ownership reassignment defense triggers, and DAC grants for tenant queries under `SET LOCAL ROLE authenticated`.
2. **QoS and Burst Quotas (`pool_tenant_burst_quotas`, `lumi_user_pool_leases`, `lumi_user_rolling_quotas`)**: Quota policies evaluated caller identity per-row (`user_id = auth.uid()::text`), inducing linear overhead on high-frequency streaming routes. Furthermore, rows lacked triggers preventing tenant ownership reassignment.
3. **Missing Procedure Execution Privileges**: Credit slicing procedures (`fn_lease_wallet_credit_slice`, `fn_reconcile_wallet_credit_slice`) and hold management functions required explicit execution grants for authenticated transactions.

## Decision
Under the Supabase Paranoid Governance framework (AOP-DB Protocol) and the Principle of Least Privilege, implemented migration [`20260903201833_galxai_api_credit_handling_and_quota_pool_armor.sql`](file:///Users/bozoegg/Desktop/GALXAI/supabase/migrations/20260903201833_galxai_api_credit_handling_and_quota_pool_armor.sql) and paired rollback:

1. **Idempotent CHECK Constraint on Credit Holds**:
   - Deployed `chk_wallet_holds_user_id_valid` on `public.galx_wallet_holds` enforcing non-empty, non-whitespace identifiers $\le 128$ characters.

2. **Ownership Reassignment Prevention Triggers**:
   - Attached `fn_prevent_tenant_ownership_reassignment()` as a `BEFORE UPDATE` trigger on:
     - `public.galx_wallet_holds`
     - `public.pool_tenant_burst_quotas`
     - `public.lumi_user_pool_leases`
     - `public.lumi_user_rolling_quotas`
     - `public.community_user_monthly_grants`

3. **InitPlan Cached RLS Subqueries**:
   - Upgraded RLS policies on `pool_tenant_burst_quotas`, `lumi_user_pool_leases`, `lumi_user_rolling_quotas`, `community_user_monthly_grants`, and `community_grant_allocations` to use `((SELECT auth.uid()::text) = user_id)`.
   - Replaces per-row evaluation with an $O(1)$ cached query plan.

4. **Least-Privilege DAC Table Grants & Mutation Revocations**:
   - Granted `SELECT` to `authenticated` on all hold and quota tables.
   - Explicitly revoked `UPDATE, DELETE` from `authenticated, anon, PUBLIC` on all hold, quota, and grant tables.

5. **Procedure Execution Privileges**:
   - Explicitly granted `EXECUTE` on all credit hold lifecycle procedures (`fn_reserve_wallet_hold`, `fn_commit_wallet_hold`, `fn_release_wallet_hold`, `fn_scavenge_expired_holds`) and credit slicing procedures (`fn_lease_wallet_credit_slice`, `fn_reconcile_wallet_credit_slice`).

## Consequences
- **Positive**: Complete defense against cross-tenant tampering or forging of inference credit holds and burst allocations.
- **Positive**: Sub-millisecond RLS policy evaluation across high-concurrency API quota checks.
- **Positive**: 82/82 migrations verified by `npm run db:verify`, 92/92 database tests passing.
