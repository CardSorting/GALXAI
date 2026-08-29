-- ============================================================================
-- GALXAI: PostgreSQL Security Definer & Core Procedure Hardening
-- Version: 26.0.0
-- Standards: Sets SECURITY DEFINER, search_path = public, pg_temp, and
-- bounded lock timeouts on all core execution and billing procedures.
-- ============================================================================

-- 1. ATOMIC MICRO-METERED TOKEN DEBIT WITH SECURITY DEFINER
CREATE OR REPLACE FUNCTION fn_draw_wallet_tokens(
    p_user_id VARCHAR(255),
    p_cost_usd NUMERIC(14, 6),
    p_description TEXT,
    p_api_key_id VARCHAR(64) DEFAULT NULL,
    p_shard_id VARCHAR(64) DEFAULT NULL,
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
    v_wallet galx_wallets%ROWTYPE;
    v_new_balance NUMERIC(14, 6);
    v_tx_id UUID;
    v_trigger_auto_reload BOOLEAN := false;
BEGIN
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'WALLET_NOT_FOUND',
            'balance', 0
        );
    END IF;

    IF v_wallet.balance_usd < p_cost_usd THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'INSUFFICIENT_FUNDS',
            'current_balance', v_wallet.balance_usd,
            'required_cost', p_cost_usd
        );
    END IF;

    v_new_balance := v_wallet.balance_usd - p_cost_usd;

    -- Update wallet state
    UPDATE galx_wallets
    SET balance_usd = v_new_balance,
        lifetime_spent_usd = lifetime_spent_usd + p_cost_usd,
        updated_at = NOW()
    WHERE id = v_wallet.id;

    -- Record immutable transaction
    INSERT INTO galx_wallet_transactions (
        wallet_id,
        user_id,
        transaction_type,
        amount_usd,
        balance_after_usd,
        description,
        api_key_id,
        shard_id,
        model,
        prompt_tokens,
        completion_tokens,
        cached_tokens,
        metadata
    ) VALUES (
        v_wallet.id,
        p_user_id,
        'usage_draw',
        -p_cost_usd,
        v_new_balance,
        p_description,
        p_api_key_id,
        p_shard_id,
        p_model,
        p_prompt_tokens,
        p_completion_tokens,
        p_cached_tokens,
        p_metadata
    ) RETURNING id INTO v_tx_id;

    -- Check auto-reload safeguard trigger
    IF v_wallet.auto_reload_enabled AND v_new_balance <= v_wallet.auto_reload_threshold_usd THEN
        v_trigger_auto_reload := true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'previous_balance', v_wallet.balance_usd,
        'cost_usd', p_cost_usd,
        'new_balance', v_new_balance,
        'trigger_auto_reload', v_trigger_auto_reload
    );
END;
$$;

-- 2. BATCH MICRO-METERED TOKEN DEBIT WITH SECURITY DEFINER
CREATE OR REPLACE FUNCTION fn_draw_wallet_tokens_batch(
    p_draws JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET lock_timeout = '2s'
SET statement_timeout = '5s'
AS $$
DECLARE
    v_draw JSONB;
    v_user_id VARCHAR(255);
    v_cost_usd NUMERIC(14, 6);
    v_desc TEXT;
    v_single_res JSONB;
    v_results JSONB := '[]'::jsonb;
BEGIN
    FOR v_draw IN SELECT * FROM jsonb_array_elements(p_draws)
    LOOP
        v_user_id := v_draw->>'userId';
        v_cost_usd := (v_draw->>'costUsd')::numeric;
        v_desc := COALESCE(v_draw->>'description', 'Batch token debit');

        v_single_res := fn_draw_wallet_tokens(
            v_user_id,
            v_cost_usd,
            v_desc,
            v_draw->>'apiKeyId',
            v_draw->>'shardId',
            v_draw->>'model',
            COALESCE((v_draw->>'promptTokens')::bigint, 0),
            COALESCE((v_draw->>'completionTokens')::bigint, 0),
            COALESCE((v_draw->>'cachedTokens')::bigint, 0),
            COALESCE(v_draw->'metadata', '{}'::jsonb)
        );

        v_results := v_results || jsonb_build_array(
            jsonb_build_object(
                'userId', v_user_id,
                'success', v_single_res->'success',
                'reason', v_single_res->'reason',
                'transactionId', v_single_res->'transaction_id',
                'newBalance', v_single_res->'new_balance'
            )
        );
    END LOOP;

    RETURN v_results;
END;
$$;

-- 3. QUEUE WORKER TASK LEASE PROCEDURE WITH SECURITY DEFINER
CREATE OR REPLACE FUNCTION fn_lease_queue_tasks(
    p_queue_id VARCHAR(64),
    p_worker_id VARCHAR(128),
    p_max_tasks INTEGER DEFAULT 10,
    p_lease_duration_ms BIGINT DEFAULT 60000,
    p_tag_filter VARCHAR(64) DEFAULT NULL,
    p_group_id_filter VARCHAR(128) DEFAULT NULL,
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS SETOF galx_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now_ms BIGINT;
    v_lease_expiry BIGINT;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));
    v_lease_expiry := v_now_ms + p_lease_duration_ms;

    RETURN QUERY
    WITH candidate_tasks AS (
        SELECT t.id
        FROM galx_tasks t
        WHERE t.queue_id = p_queue_id
          AND t.status IN ('QUEUED', 'SCHEDULED', 'RETRYING')
          AND t.schedule_time_ms <= v_now_ms
          AND (p_tag_filter IS NULL OR t.tag = p_tag_filter)
          AND (p_group_id_filter IS NULL OR t.group_id = p_group_id_filter)
          AND (
              t.group_id IS NULL OR NOT EXISTS (
                  SELECT 1 FROM galx_tasks g
                  WHERE g.queue_id = p_queue_id
                    AND g.group_id = t.group_id
                    AND g.status IN ('DISPATCHING', 'RUNNING')
                    AND g.id <> t.id
              )
          )
        ORDER BY
            (t.priority + LEAST(50, ((v_now_ms - t.created_at_ms) / 30000) * 5)) DESC,
            t.created_at_ms ASC
        LIMIT p_max_tasks
        FOR UPDATE SKIP LOCKED
    )
    UPDATE galx_tasks t
    SET status = 'RUNNING',
        worker_id = p_worker_id,
        lease_expires_at_ms = v_lease_expiry,
        lease_token = gen_random_uuid(),
        fencing_token = t.fencing_token + 1,
        attempts = t.attempts + 1,
        last_attempt_at_ms = v_now_ms,
        updated_at = NOW()
    FROM candidate_tasks c
    WHERE t.id = c.id
    RETURNING t.*;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fn_draw_wallet_tokens(VARCHAR, NUMERIC, TEXT, VARCHAR, VARCHAR, VARCHAR, BIGINT, BIGINT, BIGINT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_draw_wallet_tokens_batch(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_lease_queue_tasks(VARCHAR, VARCHAR, INTEGER, BIGINT, VARCHAR, VARCHAR, BIGINT) TO authenticated, service_role;
