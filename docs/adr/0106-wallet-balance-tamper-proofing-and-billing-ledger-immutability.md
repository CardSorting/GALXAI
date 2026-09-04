# ADR 0106: Wallet Balance Tamper-Proofing & Financial Ledger Immutability

## Status
Superseded by ADR 0117

This ADR describes an abandoned migration branch that was never applied to the authoritative database. ADR 0117 keeps the useful append-only wallet ledger invariant and removes direct client financial authority.

## Context
Under direct connection pooling and transaction-level tenant impersonation (`executePostgresTransactionAsUser`, `SET LOCAL ROLE authenticated`), tenants execute SQL with the privileges of their authenticated database role.
While DAC grants allowed `SELECT, UPDATE ON public.galx_wallets`, two critical financial security gaps existed:
1. **Direct Balance Modification Risk**: An authenticated user running `UPDATE galx_wallets SET balance_usd = 99999` could forge their compute credit balance if the database engine did not enforce balance immutability for the `authenticated` role.
2. **Mutable Financial Ledger Rows**: `public.galx_wallet_transactions` only configured standard `ENABLE ROW LEVEL SECURITY` (not `FORCE ROW LEVEL SECURITY`) and lacked triggers prohibiting `UPDATE` or `DELETE`, risking historical tampering or deletion of billing deductions.
3. **Stripe Webhook Event Mutability**: `public.galx_stripe_events` and `public.galx_stripe_invoices` lacked engine triggers guaranteeing append-only immutability.

## Decision
Under the Supabase Paranoid Governance framework (AOP-DB Protocol) and the Principle of Least Privilege, this ADR proposed the now-retired migration `20260903200831_galxai_wallets_and_billing_ledger_tamper_proofing.sql` and paired rollback:

1. **Wallet Balance Tamper-Proofing Trigger**:
   - Implemented `public.fn_prevent_wallet_balance_tampering()` as a `BEFORE UPDATE` trigger on `public.galx_wallets`.
   - When the active role is not `service_role` and not `postgres`, it asserts that `balance_usd`, `deposited_total_usd`, `promotional_match_usd`, `lifetime_spent_usd`, `introductory_grant_usd`, and `proof_of_deposit_verified` remain identical (`IS NOT DISTINCT FROM OLD.*`).
   - Any attempt by an authenticated tenant to modify balance fields aborts with PostgreSQL error `42501`.
   - Authenticated tenants can safely configure `auto_reload_enabled`, `auto_reload_threshold_usd`, `auto_reload_amount_usd`, and `auto_reload_payment_method_id` via `p_user_update_own_wallet_settings`.

2. **`FORCE ROW LEVEL SECURITY` on Financial Ledger**:
   - Enforced `ALTER TABLE public.galx_wallet_transactions FORCE ROW LEVEL SECURITY;`.
   - Added InitPlan cached RLS policy `p_wallet_tx_select` tied to `(SELECT auth.uid()::text) = user_id`.

3. **Engine-Level Financial Immutability**:
   - Attached `fn_prevent_audit_log_mutation()` as a `BEFORE UPDATE OR DELETE` trigger on `galx_wallet_transactions`, `galx_stripe_events`, and `galx_stripe_invoices`.
   - Explicitly revoked `UPDATE, DELETE` from `authenticated, anon, PUBLIC`.

4. **Stripe Checkout Session Ownership Reassignment Armor**:
   - Attached `fn_prevent_tenant_ownership_reassignment()` as a `BEFORE UPDATE` trigger on `public.galx_stripe_checkout_sessions`.

## Consequences
- **Positive**: Direct client connections cannot forge compute credit balances or bypass deposit verification.
- **Positive**: 100% append-only immutability guaranteed across financial transactions, invoices, and Stripe webhook events.
- **Positive**: 81/81 migrations verified by `npm run db:verify`, 92/92 database tests passing.
