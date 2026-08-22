-- ============================================================================
-- GALXAI: High-Throughput Edge Batch Procedures Migration
-- Migration: 20260822000003_galxai_schema_edge_mesh.sql
-- Version: 3.2.0
-- ============================================================================

-- 1. High-Throughput Batch Token Micro-Metering for Cloudflare Edge Workers
-- Ingests up to 100 draw items in a single atomic SQL transaction.
CREATE OR REPLACE FUNCTION fn_batch_draw_wallet_tokens_cf(
    p_draws JSONB -- Array of { userId, costUsd, description, model, promptTokens, completionTokens, cachedTokens, apiKeyId, shardId }
)
RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_user_id VARCHAR(255);
    v_cost_usd NUMERIC(12, 6);
    v_desc TEXT;
    v_model VARCHAR(128);
    v_prompt_tokens BIGINT;
    v_comp_tokens BIGINT;
    v_cached_tokens BIGINT;
    v_api_key_id VARCHAR(64);
    v_shard_id VARCHAR(64);
    v_wallet galx_wallets%ROWTYPE;
    v_new_balance NUMERIC(12, 6);
    v_tx_id VARCHAR(64);
    v_now_ms BIGINT;
    v_results JSONB := '[]'::jsonb;
BEGIN
    v_now_ms := CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT);

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_draws)
    LOOP
        v_user_id := v_item->>'userId';
        v_cost_usd := CAST(v_item->>'costUsd' AS NUMERIC(12, 6));
        v_desc := COALESCE(v_item->>'description', 'Batch token draw');
        v_model := v_item->>'model';
        v_prompt_tokens := COALESCE(CAST(v_item->>'promptTokens' AS BIGINT), 0);
        v_comp_tokens := COALESCE(CAST(v_item->>'completionTokens' AS BIGINT), 0);
        v_cached_tokens := COALESCE(CAST(v_item->>'cachedTokens' AS BIGINT), 0);
        v_api_key_id := v_item->>'apiKeyId';
        v_shard_id := v_item->>'shardId';

        SELECT * INTO v_wallet
        FROM galx_wallets
        WHERE user_id = v_user_id
        FOR UPDATE;

        IF NOT FOUND OR v_wallet.balance_usd < v_cost_usd THEN
            v_results := v_results || jsonb_build_object(
                'userId', v_user_id,
                'success', false,
                'reason', CASE WHEN NOT FOUND THEN 'WALLET_NOT_FOUND' ELSE 'INSUFFICIENT_FUNDS' END
            );
        ELSE
            v_new_balance := v_wallet.balance_usd - v_cost_usd;
            v_tx_id := 'tx_' || v_now_ms || '_' || substr(md5(random()::text), 1, 6);

            UPDATE galx_wallets
            SET balance_usd = v_new_balance,
                lifetime_spent_usd = v_wallet.lifetime_spent_usd + v_cost_usd,
                updated_at = NOW()
            WHERE id = v_wallet.id;

            INSERT INTO galx_wallet_transactions (
                id, wallet_id, user_id, transaction_type, amount_usd, balance_after_usd,
                description, api_key_id, shard_id, model, prompt_tokens, completion_tokens, cached_tokens, metadata
            ) VALUES (
                v_tx_id, v_wallet.id, v_user_id, 'usage_draw', -v_cost_usd, v_new_balance,
                v_desc, v_api_key_id, v_shard_id, v_model, v_prompt_tokens, v_comp_tokens, v_cached_tokens,
                COALESCE(v_item->'metadata', '{}'::jsonb)
            );

            v_results := v_results || jsonb_build_object(
                'userId', v_user_id,
                'success', true,
                'transactionId', v_tx_id,
                'newBalance', v_new_balance,
                'costUsd', v_cost_usd
            );
        END IF;
    END LOOP;

    RETURN v_results;
END;
$$ LANGUAGE plpgsql;

-- 2. Bulk Task Attempts & Status Flush for Cloudflare Edge Workers
CREATE OR REPLACE FUNCTION fn_batch_commit_task_attempts_cf(
    p_attempts JSONB -- Array of { taskId, attemptNumber, startedAtMs, completedAtMs, durationMs, statusCode, errorMessage, status, result, workerId }
)
RETURNS INTEGER AS $$
DECLARE
    v_item JSONB;
    v_task_id VARCHAR(64);
    v_count INTEGER := 0;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_attempts)
    LOOP
        v_task_id := v_item->>'taskId';

        -- Insert attempt record
        INSERT INTO galx_task_attempts (
            task_id, attempt_number, started_at_ms, completed_at_ms, duration_ms,
            response_status_code, error_message, worker_id, created_at
        ) VALUES (
            v_task_id,
            COALESCE(CAST(v_item->>'attemptNumber' AS INTEGER), 1),
            CAST(v_item->>'startedAtMs' AS BIGINT),
            CAST(v_item->>'completedAtMs' AS BIGINT),
            CAST(v_item->>'durationMs' AS INTEGER),
            CAST(v_item->>'statusCode' AS INTEGER),
            v_item->>'errorMessage',
            v_item->>'workerId',
            v_now
        );

        -- Update task status and result if provided
        IF v_item ? 'status' THEN
            UPDATE galx_tasks
            SET status = CAST(v_item->>'status' AS galx_task_status),
                result = COALESCE(v_item->'result', result),
                last_error = COALESCE(v_item->'lastError', last_error),
                updated_at_ms = CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
                updated_at = v_now
            WHERE id = v_task_id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Bulk Telemetry Sample Ingestion
CREATE OR REPLACE FUNCTION fn_batch_record_telemetry_cf(
    p_samples JSONB -- Array of { provider, modelId, shardId, latencyMs, promptTokens, completionTokens, totalTokens, isError, statusCode, timestampMs }
)
RETURNS INTEGER AS $$
DECLARE
    v_item JSONB;
    v_count INTEGER := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_samples)
    LOOP
        INSERT INTO galx_metrics_telemetry (
            provider, model_id, shard_id, latency_ms,
            prompt_tokens, completion_tokens, total_tokens,
            is_error, status_code, timestamp_ms
        ) VALUES (
            CAST(v_item->>'provider' AS galx_provider_type),
            v_item->>'modelId',
            v_item->>'shardId',
            CAST(v_item->>'latencyMs' AS NUMERIC(10, 2)),
            COALESCE(CAST(v_item->>'promptTokens' AS INTEGER), 0),
            COALESCE(CAST(v_item->>'completionTokens' AS INTEGER), 0),
            COALESCE(CAST(v_item->>'totalTokens' AS INTEGER), 0),
            COALESCE(CAST(v_item->>'isError' AS BOOLEAN), false),
            COALESCE(CAST(v_item->>'statusCode' AS INTEGER), 200),
            COALESCE(CAST(v_item->>'timestampMs' AS BIGINT), CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT))
        );
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
