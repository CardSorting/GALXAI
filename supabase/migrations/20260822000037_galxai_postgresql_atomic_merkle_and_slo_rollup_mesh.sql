-- ============================================================================
-- GALXAI: PostgreSQL Atomic Merkle Leaf Append & SLO Rollup Mesh
-- Version: 37.0.0
-- Standards: Native C-Digest SHA-256 Merkle parent chaining & 1-Hop
-- Synthetic Canary SLO Error Budget Rollup.
-- ============================================================================

-- 1. ATOMIC MERKLE LEAF APPEND WITH C-NATIVE SHA-256 PARENT CHAINING
CREATE OR REPLACE FUNCTION fn_atomic_merkle_leaf_append(
    p_wallet_id UUID,
    p_user_id VARCHAR(255),
    p_tx_type VARCHAR(32),
    p_amount NUMERIC,
    p_desc TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_wallet RECORD;
    v_parent_hash VARCHAR(128);
    v_new_hash VARCHAR(128);
    v_new_balance NUMERIC;
    v_tx_id UUID;
    v_raw_content TEXT;
    v_seq BIGINT;
BEGIN
    -- Lock wallet row
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE id = p_wallet_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'WALLET_NOT_FOUND'
        );
    END IF;

    -- Fetch parent Merkle entry hash
    SELECT ledger_hash, sequence_number INTO v_parent_hash, v_seq
    FROM galx_wallet_transactions
    WHERE wallet_id = p_wallet_id
    ORDER BY sequence_number DESC, created_at DESC
    LIMIT 1;

    v_parent_hash := COALESCE(v_parent_hash, 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000');
    v_seq := COALESCE(v_seq, 0) + 1;
    v_new_balance := v_wallet.balance_usd + p_amount;

    -- Compute SHA-256 Merkle chain hash
    v_raw_content := v_parent_hash || ':' || p_wallet_id || ':' || p_user_id || ':' || p_tx_type || ':' || p_amount || ':' || v_new_balance || ':' || v_seq;
    v_new_hash := encode(digest(v_raw_content, 'sha256'), 'hex');

    -- Insert Merkle transaction leaf
    INSERT INTO galx_wallet_transactions (
        wallet_id,
        user_id,
        transaction_type,
        amount_usd,
        balance_after_usd,
        description,
        prev_ledger_hash,
        ledger_hash,
        sequence_number,
        metadata,
        created_at
    ) VALUES (
        p_wallet_id,
        p_user_id,
        p_tx_type::galx_wallet_transaction_type,
        p_amount,
        v_new_balance,
        p_desc,
        v_parent_hash,
        v_new_hash,
        v_seq,
        p_metadata,
        NOW()
    ) RETURNING id INTO v_tx_id;

    -- Update wallet balance
    UPDATE galx_wallets
    SET balance_usd = v_new_balance,
        updated_at = NOW()
    WHERE id = p_wallet_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'ledger_hash', v_new_hash,
        'prev_ledger_hash', v_parent_hash,
        'sequence_number', v_seq,
        'new_balance_usd', v_new_balance
    );
END;
$$;

-- 2. 1-HOP SYNTHETIC CANARY PROBE INGESTION & SLO ERROR BUDGET EVALUATION
CREATE OR REPLACE FUNCTION fn_ingest_canary_probe_and_eval_slo(
    p_probe_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_probe_id VARCHAR(64);
    v_probe_name VARCHAR(64);
    v_edge_pop VARCHAR(32);
    v_model_id VARCHAR(64);
    v_latency_ms NUMERIC(8, 2);
    v_status_code INTEGER;
    v_success BOOLEAN;
    v_outage_tripped BOOLEAN := false;
BEGIN
    v_probe_id := 'prb_' || CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT) || '_' || substr(md5(random()::text), 1, 6);
    v_probe_name := COALESCE(p_probe_data->>'probe_name', 'canary-us-west-1');
    v_edge_pop := COALESCE(p_probe_data->>'edge_pop', p_probe_data->>'region', 'SFO');
    v_model_id := COALESCE(p_probe_data->>'model_id', 'gpt-4o');
    v_latency_ms := COALESCE((p_probe_data->>'latency_ms')::NUMERIC, 45.50);
    v_status_code := COALESCE((p_probe_data->>'status_code')::INTEGER, 200);
    v_success := (v_status_code >= 200 AND v_status_code < 400);

    -- 1. Insert synthetic canary probe point
    INSERT INTO galx_synthetic_canary_probes (
        id,
        probe_name,
        edge_pop,
        model_id,
        status_code,
        ttft_latency_ms,
        total_duration_ms,
        tls_handshake_ms,
        is_healthy,
        error_message,
        probed_at_ms,
        created_at
    ) VALUES (
        v_probe_id,
        v_probe_name,
        v_edge_pop,
        v_model_id,
        v_status_code,
        v_latency_ms,
        v_latency_ms + 10.0,
        4.50,
        v_success,
        CASE WHEN NOT v_success THEN 'Probe status ' || v_status_code ELSE NULL END,
        CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
        NOW()
    );

    -- 2. If failure detected, record incident in outage ledger
    IF NOT v_success OR v_latency_ms > 2000 THEN
        INSERT INTO galx_incident_outage_ledger (
            id,
            incident_number,
            title,
            severity,
            affected_components,
            affected_providers,
            root_cause_summary,
            started_at,
            automatic_sla_credits_issued_usd,
            created_at
        ) VALUES (
            'inc_' || CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
            'INC-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 4),
            'Canary probe degraded for ' || v_model_id,
            CASE WHEN v_status_code >= 500 THEN 'critical' ELSE 'minor' END,
            ARRAY['edge_routing', v_model_id],
            ARRAY['openai'],
            'Canary probe detected failure: HTTP ' || v_status_code || ' with ' || v_latency_ms || 'ms latency',
            NOW(),
            0.0,
            NOW()
        );
        v_outage_tripped := true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'probe_id', v_probe_id,
        'latency_ms', v_latency_ms,
        'is_success', v_success,
        'outage_tripped', v_outage_tripped
    );
END;
$$;

-- 3. SECURITY DEFINER SAVE DEVELOPER KEY PROCEDURE
CREATE OR REPLACE FUNCTION fn_save_developer_key(
    p_id VARCHAR(64),
    p_user_id VARCHAR(255),
    p_name VARCHAR(128),
    p_prefix VARCHAR(32),
    p_key_hash VARCHAR(64),
    p_rate_limit_per_minute INTEGER DEFAULT 600,
    p_workspace_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO galx_developer_keys (
        id,
        user_id,
        name,
        prefix,
        key_hash,
        rate_limit_per_minute,
        workspace_id,
        is_revoked,
        created_at,
        updated_at
    ) VALUES (
        p_id,
        p_user_id,
        p_name,
        p_prefix,
        p_key_hash,
        p_rate_limit_per_minute,
        p_workspace_id,
        false,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        prefix = EXCLUDED.prefix,
        key_hash = EXCLUDED.key_hash,
        rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
        is_revoked = false,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'id', p_id, 'key_hash', p_key_hash);
END;
$$;

-- 4. SECURITY DEFINER REVOKE DEVELOPER KEY PROCEDURE
CREATE OR REPLACE FUNCTION fn_revoke_developer_key(
    p_id VARCHAR(64),
    p_reason TEXT DEFAULT 'Revoked by user'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE galx_developer_keys
    SET is_revoked = true,
        revoked_at = NOW(),
        revoked_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_id;

    RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

-- 5. SECURITY DEFINER CREATE WORKSPACE PROCEDURE
CREATE OR REPLACE FUNCTION fn_create_workspace(
    p_slug VARCHAR(64),
    p_name VARCHAR(255),
    p_owner_user_id VARCHAR(255),
    p_tier VARCHAR(32) DEFAULT 'standard',
    p_monthly_spend_cap_usd NUMERIC(12, 4) DEFAULT 1000.0000,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ws galx_workspaces%ROWTYPE;
BEGIN
    INSERT INTO galx_workspaces (
        slug,
        name,
        tier,
        is_active,
        monthly_spend_cap_usd,
        current_month_spend_usd,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        p_slug,
        p_name,
        p_tier,
        true,
        p_monthly_spend_cap_usd,
        0.0000,
        p_metadata,
        NOW(),
        NOW()
    ) RETURNING * INTO v_ws;

    INSERT INTO galx_workspace_members (
        workspace_id,
        user_id,
        role,
        created_at,
        updated_at
    ) VALUES (
        v_ws.id,
        p_owner_user_id,
        'owner',
        NOW(),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'workspace', to_jsonb(v_ws)
    );
END;
$$;

-- 6. SECURITY DEFINER CREATE BUDGET ALERT PROCEDURE
CREATE OR REPLACE FUNCTION fn_create_budget_alert(
    p_workspace_id UUID,
    p_threshold_percentage INTEGER,
    p_notification_webhook_url TEXT,
    p_environment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_alert galx_budget_alerts%ROWTYPE;
BEGIN
    INSERT INTO galx_budget_alerts (
        workspace_id,
        environment_id,
        threshold_percentage,
        notification_webhook_url,
        is_triggered,
        created_at,
        updated_at
    ) VALUES (
        p_workspace_id,
        p_environment_id,
        p_threshold_percentage,
        p_notification_webhook_url,
        false,
        NOW(),
        NOW()
    ) RETURNING * INTO v_alert;

    RETURN jsonb_build_object(
        'success', true,
        'alert', to_jsonb(v_alert)
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fn_atomic_merkle_leaf_append(UUID, VARCHAR, VARCHAR, NUMERIC, TEXT, JSONB) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_ingest_canary_probe_and_eval_slo(JSONB) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_save_developer_key(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER, UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_revoke_developer_key(VARCHAR, TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_create_workspace(VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, JSONB) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_create_budget_alert(UUID, INTEGER, TEXT, UUID) TO authenticated, service_role, anon;

