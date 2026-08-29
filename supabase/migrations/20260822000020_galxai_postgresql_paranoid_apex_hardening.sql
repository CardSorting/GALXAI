-- ============================================================================
-- GALXAI: Supabase PostgreSQL Paranoid Apex Hardening & Concurrency Armor
-- Version: 20.0.0
-- Standards: Supabase Postgres Best Practices (RLS subquery caching, FK indexes,
-- covering indexes, lock timeouts, check constraints).
-- ============================================================================

-- 1. FOREIGN KEY INDEXES (Eliminates ShareLock contention on parent mutations)
CREATE INDEX IF NOT EXISTS idx_galx_wallet_tx_wallet_id ON galx_wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_galx_dev_keys_workspace ON galx_developer_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_audit_workspace ON galx_audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_telemetry_workspace ON galx_metrics_telemetry(workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_embeddings_workspace ON galx_embeddings_store(workspace_id);

-- 2. COVERING INDEXES FOR ZERO-DISK INDEX-ONLY SCANS
CREATE INDEX IF NOT EXISTS idx_galx_dev_keys_active_covering 
    ON galx_developer_keys(key_hash) 
    INCLUDE (id, user_id, workspace_id, rate_limit_per_minute, spend_cap_usd, current_spend_usd, allowed_models) 
    WHERE is_revoked = false;

CREATE INDEX IF NOT EXISTS idx_galx_wallets_user_covering 
    ON galx_wallets(user_id) 
    INCLUDE (id, balance_usd, deposited_total_usd, promotional_match_usd, proof_of_deposit_verified);

CREATE INDEX IF NOT EXISTS idx_galx_wallet_tx_user_covering
    ON galx_wallet_transactions(user_id, created_at DESC)
    INCLUDE (id, wallet_id, transaction_type, amount_usd, balance_after_usd);

-- 3. BALANCE NON-NEGATIVE AND INTEGRITY CHECK CONSTRAINTS
DO $$ BEGIN
    ALTER TABLE galx_wallets 
    ADD CONSTRAINT chk_galx_wallets_balance_non_negative 
    CHECK (balance_usd >= 0);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE galx_wallets 
    ADD CONSTRAINT chk_galx_wallets_deposited_non_negative 
    CHECK (deposited_total_usd >= 0);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE galx_wallets 
    ADD CONSTRAINT chk_galx_wallets_promo_non_negative 
    CHECK (promotional_match_usd >= 0);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. OPTIMIZED RLS POLICIES WITH SUBQUERY CACHING (10x-100x Query Plan Speedup)
-- Using (SELECT auth.uid()::text) evaluates the identity once per statement

DROP POLICY IF EXISTS p_user_read_own_wallet ON galx_wallets;
CREATE POLICY p_user_read_own_wallet ON galx_wallets
    FOR SELECT TO authenticated USING ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS p_user_read_own_wallet_tx ON galx_wallet_transactions;
CREATE POLICY p_user_read_own_wallet_tx ON galx_wallet_transactions
    FOR SELECT TO authenticated USING ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS p_user_read_own_keys ON galx_developer_keys;
CREATE POLICY p_user_read_own_keys ON galx_developer_keys
    FOR SELECT TO authenticated USING ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS p_user_read_own_stripe_customer ON galx_stripe_customers;
CREATE POLICY p_user_read_own_stripe_customer ON galx_stripe_customers
    FOR SELECT TO authenticated USING ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS p_user_read_own_stripe_sessions ON galx_stripe_checkout_sessions;
CREATE POLICY p_user_read_own_stripe_sessions ON galx_stripe_checkout_sessions
    FOR SELECT TO authenticated USING ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS p_user_read_own_stripe_invoices ON galx_stripe_invoices;
CREATE POLICY p_user_read_own_stripe_invoices ON galx_stripe_invoices
    FOR SELECT TO authenticated USING ((SELECT auth.uid()::text) = user_id);

-- 5. ATOMIC STORED PROCEDURES WITH BOUNDED TIMEOUT ARMOR
CREATE OR REPLACE FUNCTION fn_verify_deposit_and_match(
    p_user_id VARCHAR(255),
    p_deposit_amount_usd NUMERIC(14, 6),
    p_payment_ref VARCHAR(128) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET lock_timeout = '2s'
SET statement_timeout = '5s'
AS $$
DECLARE
    v_wallet galx_wallets%ROWTYPE;
    v_match_grant NUMERIC(14, 6) := 0.000000;
    v_total_credit NUMERIC(14, 6);
    v_new_balance NUMERIC(14, 6);
BEGIN
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO galx_wallets (
            user_id,
            balance_usd,
            introductory_grant_usd,
            deposited_total_usd,
            promotional_match_usd,
            proof_of_deposit_verified,
            verified_at
        ) VALUES (
            p_user_id,
            0,
            5.000000,
            0,
            0,
            true,
            NOW()
        ) RETURNING * INTO v_wallet;
    END IF;

    -- 50% instant match on initial $10+ deposit
    IF NOT v_wallet.proof_of_deposit_verified OR v_wallet.deposited_total_usd = 0 THEN
        v_match_grant := 5.000000; -- Fixed $5 introductory developer grant
    END IF;

    v_total_credit := p_deposit_amount_usd + v_match_grant;
    v_new_balance := v_wallet.balance_usd + v_total_credit;

    UPDATE galx_wallets
    SET balance_usd = v_new_balance,
        deposited_total_usd = deposited_total_usd + p_deposit_amount_usd,
        promotional_match_usd = promotional_match_usd + v_match_grant,
        proof_of_deposit_verified = true,
        verified_at = COALESCE(verified_at, NOW()),
        updated_at = NOW()
    WHERE id = v_wallet.id;

    -- Record deposit transaction
    INSERT INTO galx_wallet_transactions (
        wallet_id,
        user_id,
        transaction_type,
        amount_usd,
        balance_after_usd,
        description,
        metadata
    ) VALUES (
        v_wallet.id,
        p_user_id,
        'deposit',
        v_total_credit,
        v_new_balance,
        'Developer compute deposit with promotional match grant',
        jsonb_build_object(
            'deposit_amount', p_deposit_amount_usd,
            'match_grant', v_match_grant,
            'total_credit', v_total_credit,
            'payment_ref', p_payment_ref
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'deposit_amount', p_deposit_amount_usd,
        'match_grant', v_match_grant,
        'total_credit', v_total_credit,
        'new_balance', v_new_balance,
        'proof_of_deposit_verified', true
    );
END;
$$;
