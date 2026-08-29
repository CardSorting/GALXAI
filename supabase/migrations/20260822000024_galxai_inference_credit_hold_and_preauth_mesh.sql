-- ============================================================================
-- GALXAI: Inference Credit Hold & Pre-Authorization Mesh
-- Version: 24.0.0
-- Standards: Two-phase commit inference micro-billing (Hold / Capture / Release),
-- zero-underflow guarantees on long-running LLM streams, and automatic hold scavenging.
-- ============================================================================

-- 1. INFERENCE CREDIT HOLDS TABLE
CREATE TABLE IF NOT EXISTS galx_wallet_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES galx_wallets(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    estimated_cost_usd NUMERIC(14, 6) NOT NULL CHECK (estimated_cost_usd > 0),
    actual_cost_usd NUMERIC(14, 6) DEFAULT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. HIGH-VELOCITY PARTIAL & COVERING INDEXES
CREATE INDEX IF NOT EXISTS idx_galx_holds_wallet_active 
    ON galx_wallet_holds(wallet_id, expires_at) 
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_galx_holds_user_active 
    ON galx_wallet_holds(user_id, status);

CREATE INDEX IF NOT EXISTS idx_galx_holds_expires 
    ON galx_wallet_holds(expires_at) 
    WHERE status = 'ACTIVE';

-- 3. ROW LEVEL SECURITY & PARANOID CONSTRAINTS
ALTER TABLE galx_wallet_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_wallet_holds FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_service_role_wallet_holds ON galx_wallet_holds;
CREATE POLICY p_service_role_wallet_holds ON galx_wallet_holds
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_user_read_own_holds ON galx_wallet_holds;
CREATE POLICY p_user_read_own_holds ON galx_wallet_holds
    FOR SELECT TO authenticated USING ((SELECT auth.uid()::text) = user_id);

-- 4. ATOMIC PRE-AUTHORIZATION HOLD PROCEDURE (PHASE 1: HOLD)
CREATE OR REPLACE FUNCTION fn_reserve_wallet_hold(
    p_user_id VARCHAR(255),
    p_estimated_cost_usd NUMERIC(14, 6),
    p_hold_ttl_ms BIGINT DEFAULT 120000,
    p_metadata JSONB DEFAULT '{}'::jsonb
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
    v_expires_at TIMESTAMPTZ;
    v_hold_id UUID;
    v_new_balance NUMERIC(14, 6);
BEGIN
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'WALLET_NOT_FOUND'
        );
    END IF;

    IF v_wallet.balance_usd < p_estimated_cost_usd THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'INSUFFICIENT_FUNDS',
            'available_balance', v_wallet.balance_usd,
            'required_usd', p_estimated_cost_usd
        );
    END IF;

    v_expires_at := NOW() + (p_hold_ttl_ms || ' milliseconds')::interval;
    v_new_balance := v_wallet.balance_usd - p_estimated_cost_usd;

    -- Decrement balance into hold state
    UPDATE galx_wallets
    SET balance_usd = v_new_balance,
        updated_at = NOW()
    WHERE id = v_wallet.id;

    -- Insert active hold record
    INSERT INTO galx_wallet_holds (
        wallet_id,
        user_id,
        estimated_cost_usd,
        status,
        expires_at,
        metadata
    ) VALUES (
        v_wallet.id,
        p_user_id,
        p_estimated_cost_usd,
        'ACTIVE',
        v_expires_at,
        p_metadata
    ) RETURNING id INTO v_hold_id;

    RETURN jsonb_build_object(
        'success', true,
        'hold_id', v_hold_id,
        'reserved_usd', p_estimated_cost_usd,
        'previous_balance', v_wallet.balance_usd,
        'new_balance', v_new_balance,
        'expires_at', v_expires_at
    );
END;
$$;

-- 5. ATOMIC COMMIT & REIMBURSEMENT PROCEDURE (PHASE 2: CAPTURE / SETTLE)
CREATE OR REPLACE FUNCTION fn_commit_wallet_hold(
    p_hold_id UUID,
    p_actual_cost_usd NUMERIC(14, 6),
    p_description TEXT DEFAULT 'Inference stream settlement',
    p_model VARCHAR(128) DEFAULT NULL,
    p_prompt_tokens BIGINT DEFAULT 0,
    p_completion_tokens BIGINT DEFAULT 0,
    p_cached_tokens BIGINT DEFAULT 0,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET lock_timeout = '2s'
SET statement_timeout = '5s'
AS $$
DECLARE
    v_hold galx_wallet_holds%ROWTYPE;
    v_wallet galx_wallets%ROWTYPE;
    v_delta NUMERIC(14, 6);
    v_final_balance NUMERIC(14, 6);
    v_tx_id UUID;
BEGIN
    SELECT * INTO v_hold
    FROM galx_wallet_holds
    WHERE id = p_hold_id
    FOR UPDATE;

    IF NOT FOUND OR v_hold.status <> 'ACTIVE' THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'HOLD_NOT_ACTIVE_OR_FOUND'
        );
    END IF;

    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE id = v_hold.wallet_id
    FOR UPDATE;

    -- Calculate remainder: estimated - actual
    -- If actual < estimated, refund the difference (delta > 0)
    -- If actual > estimated, deduct additional difference (delta < 0)
    v_delta := v_hold.estimated_cost_usd - p_actual_cost_usd;
    v_final_balance := GREATEST(0.000000, v_wallet.balance_usd + v_delta);

    -- Update wallet state
    UPDATE galx_wallets
    SET balance_usd = v_final_balance,
        lifetime_spent_usd = lifetime_spent_usd + p_actual_cost_usd,
        updated_at = NOW()
    WHERE id = v_wallet.id;

    -- Mark hold committed
    UPDATE galx_wallet_holds
    SET status = 'COMMITTED',
        actual_cost_usd = p_actual_cost_usd,
        updated_at = NOW()
    WHERE id = v_hold.id;

    -- Insert authoritative micro-billing transaction record
    INSERT INTO galx_wallet_transactions (
        wallet_id,
        user_id,
        transaction_type,
        amount_usd,
        balance_after_usd,
        description,
        model,
        prompt_tokens,
        completion_tokens,
        cached_tokens,
        metadata
    ) VALUES (
        v_wallet.id,
        v_hold.user_id,
        'usage_draw',
        -p_actual_cost_usd,
        v_final_balance,
        p_description,
        p_model,
        p_prompt_tokens,
        p_completion_tokens,
        p_cached_tokens,
        v_hold.metadata || p_metadata || jsonb_build_object(
            'hold_id', p_hold_id,
            'estimated_cost_usd', v_hold.estimated_cost_usd,
            'refunded_delta_usd', v_delta
        )
    ) RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'hold_id', p_hold_id,
        'actual_cost_usd', p_actual_cost_usd,
        'refunded_delta_usd', v_delta,
        'new_balance', v_final_balance
    );
END;
$$;

-- 6. ATOMIC EXPIRED HOLD RECLAIM PROCEDURE (AUTONOMOUS CLEANUP)
CREATE OR REPLACE FUNCTION fn_release_expired_wallet_holds()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_record RECORD;
    v_count INTEGER := 0;
    v_total_reclaimed NUMERIC(14, 6) := 0.000000;
BEGIN
    FOR v_record IN
        SELECT h.id AS hold_id, h.wallet_id, h.estimated_cost_usd
        FROM galx_wallet_holds h
        WHERE h.status = 'ACTIVE'
          AND h.expires_at < NOW()
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Refund held funds to wallet
        UPDATE galx_wallets
        SET balance_usd = balance_usd + v_record.estimated_cost_usd,
            updated_at = NOW()
        WHERE id = v_record.wallet_id;

        -- Mark hold expired
        UPDATE galx_wallet_holds
        SET status = 'EXPIRED',
            updated_at = NOW()
        WHERE id = v_record.hold_id;

        v_count := v_count + 1;
        v_total_reclaimed := v_total_reclaimed + v_record.estimated_cost_usd;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'expired_holds_released', v_count,
        'total_usd_reclaimed', v_total_reclaimed,
        'timestamp', NOW()
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fn_reserve_wallet_hold(VARCHAR, NUMERIC, BIGINT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_commit_wallet_hold(UUID, NUMERIC, TEXT, VARCHAR, BIGINT, BIGINT, BIGINT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_release_expired_wallet_holds() TO authenticated, service_role;
