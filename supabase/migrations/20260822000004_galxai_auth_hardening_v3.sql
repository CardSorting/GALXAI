-- ============================================================================
-- GALXAI: Advanced Provider-as-Auth Hardening V3 Migration
-- Step-Up SUDO Mode, Token Scopes, Risk Scoring Telemetry, & KMS Re-Wrapping
-- Version: 3.3.0
-- ============================================================================

-- 1. EXTEND USER SESSIONS TABLE WITH SUDO, RISK, & SCOPES
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS sudo_elevated_until_ms BIGINT DEFAULT NULL;
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS scopes TEXT[] NOT NULL DEFAULT ARRAY['*']::text[];

CREATE INDEX IF NOT EXISTS idx_galx_sessions_sudo ON galx_user_sessions(sudo_elevated_until_ms);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_risk ON galx_user_sessions(risk_score);

-- 2. SESSION BEHAVIORAL RISK & ANOMALY EVENTS TABLE
CREATE TABLE IF NOT EXISTS galx_session_risk_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    risk_score INTEGER NOT NULL,
    risk_factors JSONB DEFAULT '[]'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_risk_user_id ON galx_session_risk_events(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_risk_score ON galx_session_risk_events(risk_score);

-- ============================================================================
-- 3. STORED PROCEDURES (SECURITY DEFINER)
-- ============================================================================

-- A. ATOMIC SUDO MODE SESSION ELEVATION (GITHUB/AWS PATTERN)
CREATE OR REPLACE FUNCTION fn_elevate_session_sudo(
    p_session_id VARCHAR(64),
    p_user_id VARCHAR(255),
    p_duration_ms BIGINT DEFAULT 900000, -- 15 minutes default
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now_ms BIGINT;
    v_elevated_until BIGINT;
    v_session RECORD;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));
    v_elevated_until := v_now_ms + p_duration_ms;

    SELECT * INTO v_session
    FROM galx_user_sessions
    WHERE id = p_session_id
      AND user_id = p_user_id
      AND is_revoked = false;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND_OR_REVOKED');
    END IF;

    UPDATE galx_user_sessions
    SET sudo_elevated_until_ms = v_elevated_until,
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'sudo_active', true,
        'sudo_elevated_until_ms', v_elevated_until,
        'expires_in_ms', p_duration_ms
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. ZERO-DOWNTIME VAULT SHARD KMS RE-WRAPPING
CREATE OR REPLACE FUNCTION fn_reencrypt_vault_shard_record(
    p_shard_id VARCHAR(128),
    p_new_encrypted_payload JSONB,
    p_new_version VARCHAR(32) DEFAULT 'v2',
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now_ms BIGINT;
    v_shard RECORD;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    SELECT * INTO v_shard
    FROM galx_shard_accounts
    WHERE id = p_shard_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SHARD_NOT_FOUND');
    END IF;

    UPDATE galx_shard_accounts
    SET encrypted_secrets = p_new_encrypted_payload,
        encrypted_payload = p_new_encrypted_payload,
        updated_at_ms = v_now_ms
    WHERE id = p_shard_id;

    RETURN jsonb_build_object(
        'success', true,
        'shard_id', p_shard_id,
        'key_version', p_new_version,
        'reencrypted_at_ms', v_now_ms
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. ROW-LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE galx_session_risk_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_galx_session_risk_events" ON galx_session_risk_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "user_view_own_risk_events" ON galx_session_risk_events FOR SELECT USING (auth.uid()::text = user_id);
