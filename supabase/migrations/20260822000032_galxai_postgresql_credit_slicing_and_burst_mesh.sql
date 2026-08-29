-- ============================================================================
-- GALXAI: PostgreSQL Edge Credit Slicing & Burst Storm Suppression Mesh
-- Version: 32.0.0
-- Standards: Edge-local token leasing, peak streaming credit slicing,
-- and distributed probabilistic recomputation locks.
-- ============================================================================

-- 1. ATOMIC WALLET CREDIT SLICE LEASE PROCEDURE
CREATE OR REPLACE FUNCTION fn_lease_wallet_credit_slice(
    p_user_id VARCHAR,
    p_slice_amount_usd NUMERIC,
    p_slice_ttl_ms INTEGER DEFAULT 60000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet RECORD;
    v_leased_amount NUMERIC;
    v_lease_id VARCHAR(64);
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Row-level lock on user wallet
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'WALLET_NOT_FOUND',
            'message', 'No compute wallet registered for user'
        );
    END IF;

    IF v_wallet.balance_usd <= 0.0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_BALANCE',
            'current_balance', v_wallet.balance_usd
        );
    END IF;

    v_leased_amount := LEAST(v_wallet.balance_usd, p_slice_amount_usd);
    v_lease_id := 'lease_' || CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT) || '_' || substr(md5(random()::text), 1, 6);
    v_expires_at := NOW() + (p_slice_ttl_ms || ' milliseconds')::interval;

    -- Temporarily deduct leased amount from available balance
    UPDATE galx_wallets
    SET balance_usd = v_wallet.balance_usd - v_leased_amount,
        updated_at = NOW()
    WHERE id = v_wallet.id;

    RETURN jsonb_build_object(
        'success', true,
        'lease_id', v_lease_id,
        'user_id', p_user_id,
        'leased_amount_usd', v_leased_amount,
        'remaining_balance_usd', v_wallet.balance_usd - v_leased_amount,
        'expires_at', v_expires_at
    );
END;
$$;

-- 2. ATOMIC WALLET CREDIT SLICE RECONCILIATION PROCEDURE
CREATE OR REPLACE FUNCTION fn_reconcile_wallet_credit_slice(
    p_user_id VARCHAR,
    p_lease_id VARCHAR,
    p_actual_spent_usd NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet RECORD;
    v_new_balance NUMERIC;
BEGIN
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'WALLET_NOT_FOUND'
        );
    END IF;

    -- Record transaction for actual spent inference
    IF p_actual_spent_usd > 0 THEN
        UPDATE galx_wallets
        SET lifetime_spent_usd = v_wallet.lifetime_spent_usd + p_actual_spent_usd,
            updated_at = NOW()
        WHERE id = v_wallet.id;

        INSERT INTO galx_wallet_transactions (
            wallet_id,
            user_id,
            transaction_type,
            amount_usd,
            balance_after_usd,
            description,
            metadata,
            created_at
        ) VALUES (
            v_wallet.id,
            p_user_id,
            'usage_draw',
            -p_actual_spent_usd,
            v_wallet.balance_usd,
            'Edge credit slice reconciliation: ' || p_lease_id,
            jsonb_build_object(
                'engine', 'edge_credit_slicer',
                'lease_id', p_lease_id
            ),
            NOW()
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'lease_id', p_lease_id,
        'actual_spent_usd', p_actual_spent_usd,
        'final_balance_usd', v_wallet.balance_usd
    );
END;
$$;

-- 3. DISTRIBUTED PROBABILISTIC RECOMPUTE LOCK COORDINATOR
CREATE OR REPLACE FUNCTION fn_batch_probabilistic_recompute_lock(
    p_keys VARCHAR[],
    p_worker_id VARCHAR,
    p_ttl_ms INTEGER DEFAULT 5000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_acquired_keys VARCHAR[] := ARRAY[]::VARCHAR[];
    v_k VARCHAR;
    v_lock_id VARCHAR(64);
BEGIN
    FOREACH v_k IN ARRAY p_keys LOOP
        v_lock_id := 'recompute:' || v_k;
        
        -- Try to acquire distributed advisory lease
        INSERT INTO galx_distributed_locks (
            lock_key,
            owner_id,
            fencing_token,
            acquired_at_ms,
            expires_at_ms,
            created_at,
            updated_at
        ) VALUES (
            v_lock_id,
            p_worker_id,
            1,
            CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
            CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT) + p_ttl_ms,
            NOW(),
            NOW()
        )
        ON CONFLICT (lock_key) DO UPDATE
        SET owner_id = EXCLUDED.owner_id,
            fencing_token = galx_distributed_locks.fencing_token + 1,
            acquired_at_ms = EXCLUDED.acquired_at_ms,
            expires_at_ms = EXCLUDED.expires_at_ms,
            updated_at = NOW()
        WHERE galx_distributed_locks.expires_at_ms < CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT);

        IF FOUND THEN
            v_acquired_keys := array_append(v_acquired_keys, v_k);
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'acquired_keys', v_acquired_keys,
        'worker_id', p_worker_id
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fn_lease_wallet_credit_slice(VARCHAR, NUMERIC, INTEGER) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_reconcile_wallet_credit_slice(VARCHAR, VARCHAR, NUMERIC) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_batch_probabilistic_recompute_lock(VARCHAR[], VARCHAR, INTEGER) TO authenticated, service_role, anon;
