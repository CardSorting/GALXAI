-- ============================================================================
-- MIGRATION: 20260903200831_galxai_wallets_and_billing_ledger_tamper_proofing.sql
-- DESCRIPTION: Financial ledger immutability, wallet balance tamper-proofing, and Stripe checkout armor
-- GOVERNANCE: Paranoid Database Governance (AOP-DB Phase 3)
-- ============================================================================

-- 1. FORCE ROW LEVEL SECURITY ON WALLET TRANSACTIONS
ALTER TABLE IF EXISTS public.galx_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_wallet_transactions FORCE ROW LEVEL SECURITY;

-- 2. WALLET BALANCE TAMPER-PROOFING TRIGGER FUNCTION
-- Prevents authenticated tenants from forging balance, deposits, match, or verification status
CREATE OR REPLACE FUNCTION public.fn_prevent_wallet_balance_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role text := COALESCE(
        current_setting('request.jwt.claim.role', true),
        (SELECT auth.role())
    );
BEGIN
    -- Superuser and service role manage balances via security definer ledger procedures
    IF v_role = 'service_role' OR current_user = 'postgres' THEN
        RETURN NEW;
    END IF;

    -- Authenticated tenant connections can only modify auto_reload_* configuration
    IF (
        NEW.balance_usd IS DISTINCT FROM OLD.balance_usd OR
        NEW.deposited_total_usd IS DISTINCT FROM OLD.deposited_total_usd OR
        NEW.promotional_match_usd IS DISTINCT FROM OLD.promotional_match_usd OR
        NEW.lifetime_spent_usd IS DISTINCT FROM OLD.lifetime_spent_usd OR
        NEW.introductory_grant_usd IS DISTINCT FROM OLD.introductory_grant_usd OR
        NEW.proof_of_deposit_verified IS DISTINCT FROM OLD.proof_of_deposit_verified
    ) THEN
        RAISE EXCEPTION 'Engine Violation: direct balance or deposit status modification forbidden for authenticated role. Financial modifications must be routed through security definer ledger procedures.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_prevent_wallet_balance_tampering() TO authenticated, service_role;

-- 3. ATTACH BALANCE TAMPER PROTECTION TRIGGER
DROP TRIGGER IF EXISTS trg_prevent_wallet_balance_tampering ON public.galx_wallets;
CREATE TRIGGER trg_prevent_wallet_balance_tampering
    BEFORE UPDATE ON public.galx_wallets
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_wallet_balance_tampering();

-- 4. PERMIT TENANT SETTINGS UPDATE ON WALLETS
DROP POLICY IF EXISTS p_user_update_own_wallet_settings ON public.galx_wallets;
CREATE POLICY p_user_update_own_wallet_settings ON public.galx_wallets
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()::text) = user_id)
    WITH CHECK ((SELECT auth.uid()::text) = user_id);

-- 5. IMMUTABILITY TRIGGERS FOR FINANCIAL TRANSACTIONS AND BILLING EVENTS
DROP TRIGGER IF EXISTS trg_prevent_wallet_tx_mutation ON public.galx_wallet_transactions;
CREATE TRIGGER trg_prevent_wallet_tx_mutation
    BEFORE UPDATE OR DELETE ON public.galx_wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_prevent_stripe_events_mutation ON public.galx_stripe_events;
CREATE TRIGGER trg_prevent_stripe_events_mutation
    BEFORE UPDATE OR DELETE ON public.galx_stripe_events
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_prevent_stripe_invoices_mutation ON public.galx_stripe_invoices;
CREATE TRIGGER trg_prevent_stripe_invoices_mutation
    BEFORE UPDATE OR DELETE ON public.galx_stripe_invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_audit_log_mutation();

-- 6. CHECKOUT SESSION OWNERSHIP REASSIGNMENT ARMOR
DROP TRIGGER IF EXISTS trg_prevent_stripe_cs_ownership_reassignment ON public.galx_stripe_checkout_sessions;
CREATE TRIGGER trg_prevent_stripe_cs_ownership_reassignment
    BEFORE UPDATE ON public.galx_stripe_checkout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

-- 7. OPTIMIZED INITPLAN CACHED RLS ON WALLET TRANSACTIONS
DROP POLICY IF EXISTS "user_view_own_wallet_tx" ON public.galx_wallet_transactions;
DROP POLICY IF EXISTS p_user_read_own_wallet_tx ON public.galx_wallet_transactions;
DROP POLICY IF EXISTS p_wallet_tx_select ON public.galx_wallet_transactions;

CREATE POLICY p_wallet_tx_select ON public.galx_wallet_transactions
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);

-- 8. GRANULAR DAC PERMISSIONS AND RESTRICTIONS
GRANT SELECT ON public.galx_wallet_transactions TO authenticated;
GRANT SELECT, INSERT ON public.galx_stripe_checkout_sessions TO authenticated;

REVOKE UPDATE, DELETE ON public.galx_wallet_transactions FROM authenticated, anon, PUBLIC;
REVOKE UPDATE, DELETE ON public.galx_stripe_events FROM authenticated, anon, PUBLIC;
REVOKE UPDATE, DELETE ON public.galx_stripe_invoices FROM authenticated, anon, PUBLIC;
REVOKE DELETE ON public.galx_stripe_checkout_sessions FROM authenticated, anon, PUBLIC;
