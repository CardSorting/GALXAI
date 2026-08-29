-- ============================================================================
-- GALXAI: PostgreSQL Native Array Unnest & Session Heartbeat Mesh
-- Version: 31.0.0
-- Standards: Zero-JSON overhead multi-column UNNEST batch processing for
-- token debits and high-throughput session heartbeat touches.
-- ============================================================================

-- 1. NATIVE MULTI-COLUMN UNNEST BATCH TOKEN DRAW PROCEDURE
CREATE OR REPLACE FUNCTION fn_bulk_unnest_draw_wallet_tokens(
    p_user_ids VARCHAR[],
    p_costs NUMERIC[],
    p_descriptions TEXT[],
    p_models VARCHAR[],
    p_prompt_tokens BIGINT[],
    p_completion_tokens BIGINT[],
    p_cached_tokens BIGINT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_processed INTEGER := 0;
    v_total_debit_usd NUMERIC := 0.0;
    v_user_record RECORD;
    v_wallet RECORD;
    v_new_balance NUMERIC;
    v_agg_draws JSONB := '[]'::jsonb;
BEGIN
    -- Validate array lengths are homogeneous
    IF array_length(p_user_ids, 1) != array_length(p_costs, 1) OR
       array_length(p_user_ids, 1) != array_length(p_descriptions, 1) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ARRAY_LENGTH_MISMATCH',
            'message', 'Input parallel arrays must have identical lengths'
        );
    END IF;

    -- Aggregate micro-draws per user from native C-array unnest and sort lexicographically by user_id
    FOR v_user_record IN
        WITH raw_draws AS (
            SELECT 
                u AS user_id,
                c AS cost_usd,
                d AS description,
                COALESCE(m, 'unknown') AS model,
                COALESCE(pt, 0) AS prompt_tokens,
                COALESCE(ct, 0) AS completion_tokens,
                COALESCE(kt, 0) AS cached_tokens
            FROM unnest(p_user_ids, p_costs, p_descriptions, p_models, p_prompt_tokens, p_completion_tokens, p_cached_tokens) 
                 AS t(u, c, d, m, pt, ct, kt)
        )
        SELECT 
            user_id,
            SUM(cost_usd) AS agg_cost_usd,
            COUNT(*) AS draw_count,
            SUM(prompt_tokens) AS total_prompt_tokens,
            SUM(completion_tokens) AS total_completion_tokens,
            SUM(cached_tokens) AS total_cached_tokens,
            string_agg(description, '; ' ORDER BY description) AS combined_description
        FROM raw_draws
        GROUP BY user_id
        ORDER BY user_id ASC -- Deadlock-free sorted row locking
    LOOP
        -- Lock specific user wallet row
        SELECT * INTO v_wallet
        FROM galx_wallets
        WHERE user_id = v_user_record.user_id
        FOR UPDATE;

        IF FOUND THEN
            v_new_balance := GREATEST(0.0, v_wallet.balance_usd - v_user_record.agg_cost_usd);

            UPDATE galx_wallets
            SET balance_usd = v_new_balance,
                lifetime_spent_usd = v_wallet.lifetime_spent_usd + v_user_record.agg_cost_usd,
                updated_at = NOW()
            WHERE id = v_wallet.id;

            -- Ingest consolidated batch ledger transaction
            INSERT INTO galx_wallet_transactions (
                wallet_id,
                user_id,
                transaction_type,
                amount_usd,
                balance_after_usd,
                description,
                prompt_tokens,
                completion_tokens,
                cached_tokens,
                metadata,
                created_at
            ) VALUES (
                v_wallet.id,
                v_user_record.user_id,
                'usage_draw',
                -v_user_record.agg_cost_usd,
                v_new_balance,
                v_user_record.combined_description,
                v_user_record.total_prompt_tokens,
                v_user_record.total_completion_tokens,
                v_user_record.total_cached_tokens,
                jsonb_build_object(
                    'engine', 'native_c_array_unnest',
                    'coalesced_count', v_user_record.draw_count
                ),
                NOW()
            );

            v_total_processed := v_total_processed + 1;
            v_total_debit_usd := v_total_debit_usd + v_user_record.agg_cost_usd;

            v_agg_draws := v_agg_draws || jsonb_build_object(
                'userId', v_user_record.user_id,
                'previousBalance', v_wallet.balance_usd,
                'debitUsd', v_user_record.agg_cost_usd,
                'newBalance', v_new_balance,
                'coalescedCount', v_user_record.draw_count
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed_users_count', v_total_processed,
        'total_debit_usd', v_total_debit_usd,
        'results', v_agg_draws,
        'timestamp', NOW()
    );
END;
$$;

-- 2. HIGH-VELOCITY BULK SESSION HEARTBEAT TOUCH PROCEDURE
CREATE OR REPLACE FUNCTION fn_bulk_touch_sessions(
    p_token_hashes VARCHAR[],
    p_now_ms BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    WITH touched_sessions AS (
        UPDATE galx_user_sessions
        SET last_active_at_ms = p_now_ms,
            updated_at = NOW()
        WHERE token_hash = ANY(p_token_hashes)
          AND is_revoked = false
        RETURNING id
    )
    SELECT COUNT(*) INTO v_updated_count FROM touched_sessions;

    RETURN jsonb_build_object(
        'success', true,
        'touched_sessions_count', v_updated_count,
        'timestamp_ms', p_now_ms
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fn_bulk_unnest_draw_wallet_tokens(VARCHAR[], NUMERIC[], TEXT[], VARCHAR[], BIGINT[], BIGINT[], BIGINT[]) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_bulk_touch_sessions(VARCHAR[], BIGINT) TO authenticated, service_role, anon;
