-- ============================================================================
-- GALXAI: High-Throughput Batch Coalescing & Deadlock-Free Mesh
-- Version: 29.0.0
-- Standards: Deadlock-free sorted user lock acquisition, bulk jsonb_to_recordset
-- telemetry ingestion, and multi-request write coalescing.
-- ============================================================================

-- 1. ATOMIC COALESCED WALLET BATCH DRAW (DEADLOCK-FREE SORTED ORDER)
CREATE OR REPLACE FUNCTION fn_coalesced_wallet_batch_draw(
    p_coalesced_draws JSONB
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
    v_prompt_tokens BIGINT;
    v_completion_tokens BIGINT;
    v_cached_tokens BIGINT;
    v_desc TEXT;
    v_model VARCHAR(128);
    v_wallet galx_wallets%ROWTYPE;
    v_new_balance NUMERIC(14, 6);
    v_tx_id UUID;
    v_results JSONB := '[]'::jsonb;
    v_total_processed INTEGER := 0;
    v_total_debit NUMERIC(14, 6) := 0.000000;
BEGIN
    -- Process sorted array to completely eliminate cross-worker deadlocks
    FOR v_draw IN 
        SELECT value FROM jsonb_array_elements(p_coalesced_draws) 
        ORDER BY (value->>'userId') ASC
    LOOP
        v_user_id := v_draw->>'userId';
        v_cost_usd := (v_draw->>'totalCostUsd')::numeric;
        v_prompt_tokens := COALESCE((v_draw->>'totalPromptTokens')::bigint, 0);
        v_completion_tokens := COALESCE((v_draw->>'totalCompletionTokens')::bigint, 0);
        v_cached_tokens := COALESCE((v_draw->>'totalCachedTokens')::bigint, 0);
        v_desc := COALESCE(v_draw->>'description', 'Coalesced token usage batch');
        v_model := v_draw->>'model';

        -- Lock wallet row in deterministic sorted order
        SELECT * INTO v_wallet
        FROM galx_wallets
        WHERE user_id = v_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            v_results := v_results || jsonb_build_array(
                jsonb_build_object(
                    'userId', v_user_id,
                    'success', false,
                    'reason', 'WALLET_NOT_FOUND'
                )
            );
            CONTINUE;
        END IF;

        IF v_wallet.balance_usd < v_cost_usd THEN
            v_results := v_results || jsonb_build_array(
                jsonb_build_object(
                    'userId', v_user_id,
                    'success', false,
                    'reason', 'INSUFFICIENT_FUNDS',
                    'available_balance', v_wallet.balance_usd,
                    'required_usd', v_cost_usd
                )
            );
            CONTINUE;
        END IF;

        v_new_balance := v_wallet.balance_usd - v_cost_usd;

        -- Update wallet state
        UPDATE galx_wallets
        SET balance_usd = v_new_balance,
            lifetime_spent_usd = lifetime_spent_usd + v_cost_usd,
            updated_at = NOW()
        WHERE id = v_wallet.id;

        -- Record transaction
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
            v_user_id,
            'usage_draw',
            -v_cost_usd,
            v_new_balance,
            v_desc,
            v_model,
            v_prompt_tokens,
            v_completion_tokens,
            v_cached_tokens,
            COALESCE(v_draw->'metadata', '{}'::jsonb) || jsonb_build_object(
                'coalesced_requests_count', COALESCE((v_draw->>'requestCount')::integer, 1),
                'batch_processed_at', NOW()
            )
        ) RETURNING id INTO v_tx_id;

        v_total_processed := v_total_processed + 1;
        v_total_debit := v_total_debit + v_cost_usd;

        v_results := v_results || jsonb_build_array(
            jsonb_build_object(
                'userId', v_user_id,
                'success', true,
                'transactionId', v_tx_id,
                'costUsd', v_cost_usd,
                'newBalance', v_new_balance
            )
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed_users_count', v_total_processed,
        'total_debit_usd', v_total_debit,
        'results', v_results
    );
END;
$$;

-- 2. BULK TELEMETRY INGESTION PROCEDURE (HIGH VELOCITY JSONB_TO_RECORDSET)
CREATE OR REPLACE FUNCTION fn_batch_record_telemetry(
    p_samples JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inserted_count INTEGER;
BEGIN
    WITH inserted_rows AS (
        INSERT INTO galx_metrics_telemetry (
            workspace_id,
            user_id,
            provider,
            model_id,
            shard_id,
            latency_ms,
            prompt_tokens,
            completion_tokens,
            total_tokens,
            cached_tokens,
            is_error,
            status_code,
            timestamp_ms
        )
        SELECT 
            (s.workspace_id)::uuid,
            s.user_id,
            (s.provider)::galx_provider_type,
            s.model_id,
            s.shard_id,
            s.latency_ms,
            COALESCE(s.prompt_tokens, 0),
            COALESCE(s.completion_tokens, 0),
            COALESCE(s.total_tokens, 0),
            COALESCE(s.cached_tokens, 0),
            COALESCE(s.is_error, false),
            COALESCE(s.status_code, 200),
            COALESCE(s.timestamp_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT))
        FROM jsonb_to_recordset(p_samples) AS s (
            workspace_id text,
            user_id text,
            provider text,
            model_id text,
            shard_id text,
            latency_ms integer,
            prompt_tokens bigint,
            completion_tokens bigint,
            total_tokens bigint,
            cached_tokens bigint,
            is_error boolean,
            status_code integer,
            timestamp_ms bigint
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_inserted_count FROM inserted_rows;

    RETURN jsonb_build_object(
        'success', true,
        'inserted_samples_count', v_inserted_count,
        'timestamp', NOW()
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fn_coalesced_wallet_batch_draw(JSONB) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_batch_record_telemetry(JSONB) TO authenticated, service_role, anon;
