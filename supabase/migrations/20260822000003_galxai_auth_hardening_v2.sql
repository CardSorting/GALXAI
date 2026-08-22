-- ============================================================================
-- GALXAI: Advanced Provider-as-Auth Hardening V2 Migration
-- OAuth 2.0 Token Rotation, Reuse Attack Detection, & Multi-Device Governance
-- Version: 3.2.0
-- ============================================================================

-- 1. EXTEND USER SESSIONS TABLE WITH ROTATION & FINGERPRINTING FIELDS
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS session_family_id VARCHAR(64);
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS sequence_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS fingerprint_hash VARCHAR(64) DEFAULT NULL;
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS previous_token_hash VARCHAR(64) DEFAULT NULL;
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS grace_period_until_ms BIGINT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_galx_sessions_family_id ON galx_user_sessions(session_family_id);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_prev_hash ON galx_user_sessions(previous_token_hash);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_fpt ON galx_user_sessions(fingerprint_hash);

-- 2. TOKEN REVOCATION & THREAT TELEMETRY LOG
CREATE TABLE IF NOT EXISTS galx_token_revocation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    revocation_reason VARCHAR(128) NOT NULL,
    is_threat_event BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_revocation_user_id ON galx_token_revocation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_revocation_threat ON galx_token_revocation_log(is_threat_event);

-- ============================================================================
-- 3. STORED PROCEDURES (SECURITY DEFINER)
-- ============================================================================

-- A. ATOMIC TOKEN ROTATION WITH ATTACK REUSE DETECTION (RFC 6819)
CREATE OR REPLACE FUNCTION fn_rotate_session_token_atomic(
    p_old_token_hash VARCHAR(64),
    p_new_token_hash VARCHAR(64),
    p_new_expires_at_ms BIGINT,
    p_new_fingerprint VARCHAR(64) DEFAULT NULL,
    p_grace_window_ms BIGINT DEFAULT 30000,
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now_ms BIGINT;
    v_session RECORD;
    v_grace_session RECORD;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    -- 1. Lookup active session matching current token hash
    SELECT * INTO v_session
    FROM galx_user_sessions
    WHERE token_hash = p_old_token_hash;

    IF FOUND THEN
        IF v_session.is_revoked THEN
            RETURN jsonb_build_object('success', false, 'reason', 'SESSION_REVOKED', 'reuse_detected', false);
        END IF;

        IF v_session.expires_at_ms <= v_now_ms THEN
            RETURN jsonb_build_object('success', false, 'reason', 'SESSION_EXPIRED', 'reuse_detected', false);
        END IF;

        -- Atomically rotate token and record previous hash with grace period
        UPDATE galx_user_sessions
        SET previous_token_hash = p_old_token_hash,
            token_hash = p_new_token_hash,
            sequence_number = sequence_number + 1,
            fingerprint_hash = COALESCE(p_new_fingerprint, fingerprint_hash),
            expires_at_ms = p_new_expires_at_ms,
            grace_period_until_ms = v_now_ms + p_grace_window_ms,
            last_active_at_ms = v_now_ms,
            updated_at = NOW()
        WHERE id = v_session.id;

        RETURN jsonb_build_object(
            'success', true,
            'session_id', v_session.id,
            'sequence_number', v_session.sequence_number + 1,
            'expires_at_ms', p_new_expires_at_ms,
            'reuse_detected', false
        );
    END IF;

    -- 2. Check if this is a rotated token inside or outside grace period
    SELECT * INTO v_grace_session
    FROM galx_user_sessions
    WHERE previous_token_hash = p_old_token_hash;

    IF FOUND THEN
        -- If within grace period (concurrent in-flight race condition tolerance)
        IF v_now_ms <= COALESCE(v_grace_session.grace_period_until_ms, 0) THEN
            RETURN jsonb_build_object(
                'success', true,
                'session_id', v_grace_session.id,
                'sequence_number', v_grace_session.sequence_number,
                'expires_at_ms', v_grace_session.expires_at_ms,
                'is_grace_replay', true,
                'reuse_detected', false
            );
        END IF;

        -- Outside grace period: TOKEN REUSE ATTACK DETECTED!
        -- Immediately kill the entire session lineage family to protect account
        UPDATE galx_user_sessions
        SET is_revoked = true,
            revoked_at = NOW(),
            revoked_reason = 'TOKEN_REUSE_ATTACK_DETECTED: Automatic session family termination',
            updated_at = NOW()
        WHERE session_family_id = v_grace_session.session_family_id
           OR id = v_grace_session.id;

        -- Record security threat event
        INSERT INTO galx_token_revocation_log (
            session_id, user_id, token_hash, revocation_reason, is_threat_event, metadata
        ) VALUES (
            v_grace_session.id,
            v_grace_session.user_id,
            p_old_token_hash,
            'TOKEN_REUSE_ATTACK_DETECTED',
            true,
            jsonb_build_object('timestamp_ms', v_now_ms, 'family_id', v_grace_session.session_family_id)
        );

        RETURN jsonb_build_object(
            'success', false,
            'reason', 'TOKEN_REUSE_ATTACK_DETECTED',
            'reuse_detected', true,
            'session_id', v_grace_session.id,
            'family_id', v_grace_session.session_family_id
        );
    END IF;

    RETURN jsonb_build_object('success', false, 'reason', 'SESSION_NOT_FOUND', 'reuse_detected', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. ATOMIC REVOKE ALL SESSIONS EXCEPT CURRENT (REMOTE DEVICE LOGOUT)
CREATE OR REPLACE FUNCTION fn_revoke_other_user_sessions(
    p_user_id VARCHAR(255),
    p_current_session_id VARCHAR(64),
    p_reason TEXT DEFAULT 'User requested remote device logout',
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_revoked_count INTEGER;
BEGIN
    UPDATE galx_user_sessions
    SET is_revoked = true,
        revoked_at = NOW(),
        revoked_reason = p_reason,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND id != p_current_session_id
      AND is_revoked = false;

    GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'revoked_count', v_revoked_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. ATOMIC REVOKE ENTIRE SESSION FAMILY
CREATE OR REPLACE FUNCTION fn_revoke_session_family(
    p_family_id VARCHAR(64),
    p_reason TEXT DEFAULT 'Session lineage family revocation',
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_revoked_count INTEGER;
BEGIN
    UPDATE galx_user_sessions
    SET is_revoked = true,
        revoked_at = NOW(),
        revoked_reason = p_reason,
        updated_at = NOW()
    WHERE session_family_id = p_family_id
      AND is_revoked = false;

    GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'family_id', p_family_id, 'revoked_count', v_revoked_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. ROW-LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE galx_token_revocation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_galx_token_revocation" ON galx_token_revocation_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "user_view_own_revocation_logs" ON galx_token_revocation_log FOR SELECT USING (auth.uid()::text = user_id);
