-- ============================================================================
-- GALXAI: Ultra Pass Budget Governance & Edge Authentication
-- Migration: 20260822000004_galxai_schema_ultra.sql
-- Version: 3.3.0
-- ============================================================================

-- 1. BUDGET ALERTS & NOTIFICATION TRIGGERS
CREATE TABLE IF NOT EXISTS galx_budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES galx_workspaces(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES galx_environments(id) ON DELETE CASCADE,
    threshold_percentage INTEGER NOT NULL CHECK (threshold_percentage BETWEEN 1 AND 100),
    notification_webhook_url TEXT NOT NULL,
    is_triggered BOOLEAN NOT NULL DEFAULT false,
    triggered_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, threshold_percentage)
);

CREATE INDEX IF NOT EXISTS idx_galx_budget_ws ON galx_budget_alerts(workspace_id, is_triggered);

-- 2. ALL-IN-ONE ULTRA KEY VALIDATION & ACCESS CHECK
CREATE OR REPLACE FUNCTION fn_validate_api_key_access_ultra(
    p_key_hash VARCHAR(64),
    p_model VARCHAR(128) DEFAULT NULL,
    p_client_ip VARCHAR(45) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_key galx_developer_keys%ROWTYPE;
    v_ws galx_workspaces%ROWTYPE;
    v_wallet galx_wallets%ROWTYPE;
    v_scopes TEXT[];
BEGIN
    -- 1. Fetch Developer Key
    SELECT * INTO v_key
    FROM galx_developer_keys
    WHERE key_hash = p_key_hash;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'KEY_NOT_FOUND');
    END IF;

    IF v_key.is_revoked THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'KEY_REVOKED', 'revoked_reason', v_key.revoked_reason);
    END IF;

    -- 2. Validate IP Allowlist (if configured)
    IF v_key.allowed_ips IS NOT NULL AND array_length(v_key.allowed_ips, 1) > 0 AND p_client_ip IS NOT NULL THEN
        IF NOT (p_client_ip = ANY(v_key.allowed_ips)) THEN
            RETURN jsonb_build_object('valid', false, 'reason', 'IP_NOT_ALLOWED', 'client_ip', p_client_ip);
        END IF;
    END IF;

    -- 3. Validate Model Allowlist (if configured)
    IF v_key.allowed_models IS NOT NULL AND array_length(v_key.allowed_models, 1) > 0 AND p_model IS NOT NULL THEN
        IF NOT (p_model = ANY(v_key.allowed_models)) THEN
            RETURN jsonb_build_object('valid', false, 'reason', 'MODEL_NOT_ALLOWED', 'model', p_model);
        END IF;
    END IF;

    -- 4. Check Key Spend Cap
    IF v_key.spend_cap_usd IS NOT NULL AND v_key.current_spend_usd >= v_key.spend_cap_usd THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'KEY_SPEND_CAP_EXCEEDED');
    END IF;

    -- 5. Fetch Scopes
    SELECT array_agg(scope) INTO v_scopes
    FROM galx_api_key_scopes
    WHERE key_id = v_key.id;

    -- 6. Fetch Wallet Balance
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE user_id = v_key.user_id;

    RETURN jsonb_build_object(
        'valid', true,
        'keyId', v_key.id,
        'userId', v_key.user_id,
        'workspaceId', v_key.workspace_id,
        'rateLimitPerMinute', v_key.rate_limit_per_minute,
        'scopes', COALESCE(v_scopes, ARRAY[]::TEXT[]),
        'walletBalanceUsd', COALESCE(v_wallet.balance_usd, 0.0),
        'proofOfDepositVerified', COALESCE(v_wallet.proof_of_deposit_verified, false)
    );
END;
$$ LANGUAGE plpgsql;

-- 3. CHECK BUDGET THRESHOLDS PROCEDURE
CREATE OR REPLACE FUNCTION fn_check_budget_thresholds(
    p_workspace_id UUID,
    p_additional_spend_usd NUMERIC(12, 6) DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ws galx_workspaces%ROWTYPE;
    v_new_spend NUMERIC(12, 6);
    v_pct NUMERIC(6, 2);
    v_alert RECORD;
    v_triggered_alerts JSONB := '[]'::jsonb;
BEGIN
    SELECT * INTO v_ws
    FROM galx_workspaces
    WHERE id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'WORKSPACE_NOT_FOUND');
    END IF;

    v_new_spend := v_ws.current_month_spend_usd + p_additional_spend_usd;

    IF v_ws.monthly_spend_cap_usd > 0 THEN
        v_pct := (v_new_spend / v_ws.monthly_spend_cap_usd) * 100;
    ELSE
        v_pct := 0;
    END IF;

    UPDATE galx_workspaces
    SET current_month_spend_usd = v_new_spend,
        updated_at = NOW()
    WHERE id = p_workspace_id;

    FOR v_alert IN
        SELECT *
        FROM galx_budget_alerts
        WHERE workspace_id = p_workspace_id
          AND is_triggered = false
          AND threshold_percentage <= v_pct
    LOOP
        UPDATE galx_budget_alerts
        SET is_triggered = true,
            triggered_at = NOW(),
            updated_at = NOW()
        WHERE id = v_alert.id;

        v_triggered_alerts := v_triggered_alerts || jsonb_build_object(
            'alertId', v_alert.id,
            'thresholdPercentage', v_alert.threshold_percentage,
            'webhookUrl', v_alert.notification_webhook_url,
            'currentSpendUsd', v_new_spend,
            'spendCapUsd', v_ws.monthly_spend_cap_usd
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'currentSpendUsd', v_new_spend,
        'spendCapUsd', v_ws.monthly_spend_cap_usd,
        'percentageUsed', v_pct,
        'isCapped', (v_new_spend >= v_ws.monthly_spend_cap_usd),
        'triggeredAlerts', v_triggered_alerts
    );
END;
$$;

ALTER TABLE galx_budget_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_galx_budget_alerts" ON galx_budget_alerts;
CREATE POLICY "service_role_all_galx_budget_alerts" ON galx_budget_alerts FOR ALL USING (auth.role() = 'service_role');
