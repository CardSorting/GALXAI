-- ============================================================================
-- ROLLBACK: 20260903200831_galxai_wallets_and_billing_ledger_tamper_proofing.down.sql
-- DESCRIPTION: Revert wallet and billing ledger tamper-proofing
-- ============================================================================

-- 1. REVOKE GRANTED PERMISSIONS
REVOKE SELECT, INSERT ON public.galx_stripe_checkout_sessions FROM authenticated;
REVOKE SELECT ON public.galx_wallet_transactions FROM authenticated;

-- 2. REVERT WALLET TRANSACTIONS POLICIES
DROP POLICY IF EXISTS p_wallet_tx_select ON public.galx_wallet_transactions;

CREATE POLICY p_user_read_own_wallet_tx 
    ON public.galx_wallet_transactions
    FOR SELECT 
    USING ((SELECT auth.uid()::text) = user_id);

-- 3. DROP IMMUTABILITY AND REASSIGNMENT TRIGGERS
DROP TRIGGER IF EXISTS trg_prevent_stripe_cs_ownership_reassignment ON public.galx_stripe_checkout_sessions;
DROP TRIGGER IF EXISTS trg_prevent_stripe_invoices_mutation ON public.galx_stripe_invoices;
DROP TRIGGER IF EXISTS trg_prevent_stripe_events_mutation ON public.galx_stripe_events;
DROP TRIGGER IF EXISTS trg_prevent_wallet_tx_mutation ON public.galx_wallet_transactions;

-- 4. DROP WALLET SETTINGS UPDATE POLICY AND BALANCE TAMPER TRIGGER
DROP POLICY IF EXISTS p_user_update_own_wallet_settings ON public.galx_wallets;
DROP TRIGGER IF EXISTS trg_prevent_wallet_balance_tampering ON public.galx_wallets;
DROP FUNCTION IF EXISTS public.fn_prevent_wallet_balance_tampering();

-- 5. REVERT FORCED ROW LEVEL SECURITY
ALTER TABLE IF EXISTS public.galx_wallet_transactions NO FORCE ROW LEVEL SECURITY;
