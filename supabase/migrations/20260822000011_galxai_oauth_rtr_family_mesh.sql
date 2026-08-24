-- ============================================================================
-- GALXAI: Enterprise OAuth 2.1 Refresh Token Rotation (RTR) & Security Mesh
-- Supabase PostgreSQL Core Schema Migration
-- Version: 11.0.0
-- ============================================================================

-- 1. EXTEND OAUTH IDENTITIES WITH TOKEN FAMILY & REFRESH TOKEN ROTATION (RFC 6819 § 5.2.2.3)
ALTER TABLE galx_oauth_identities ADD COLUMN IF NOT EXISTS session_family_id VARCHAR(64) DEFAULT NULL;
ALTER TABLE galx_oauth_identities ADD COLUMN IF NOT EXISTS sequence_number INT NOT NULL DEFAULT 1;
ALTER TABLE galx_oauth_identities ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(64) DEFAULT NULL;
ALTER TABLE galx_oauth_identities ADD COLUMN IF NOT EXISTS previous_refresh_token_hash VARCHAR(64) DEFAULT NULL;
ALTER TABLE galx_oauth_identities ADD COLUMN IF NOT EXISTS grace_period_until TIMESTAMPTZ DEFAULT NULL;

-- 2. EXTEND DEVICE AUTHORIZATION WITH ANTI-BRUTE-FORCE GOVERNANCE
ALTER TABLE galx_oauth_device_codes ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE galx_oauth_device_codes ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 5;

-- 3. HIGH-PERFORMANCE RTR & FAMILY INDEXES
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_family ON galx_oauth_identities(user_id, session_family_id) WHERE session_family_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_rf_hash ON galx_oauth_identities(refresh_token_hash) WHERE refresh_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_prev_rf_hash ON galx_oauth_identities(previous_refresh_token_hash) WHERE previous_refresh_token_hash IS NOT NULL;

-- ============================================================================
-- 4. ATOMIC REFRESH TOKEN ROTATION & THEFT CONTAINMENT (SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_rotate_oauth_identity_tokens(
    p_identity_id VARCHAR(64),
    p_old_refresh_hash VARCHAR(64),
    p_new_encrypted_access JSONB,
    p_new_encrypted_refresh JSONB,
    p_new_refresh_hash VARCHAR(64),
    p_expires_at TIMESTAMPTZ,
    p_grace_window_sec INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ident RECORD;
    v_new_seq INT;
    v_grace_until TIMESTAMPTZ;
    v_family_id VARCHAR(64);
    v_now TIMESTAMPTZ := NOW();
    v_now_ms BIGINT := CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT);
BEGIN
    SELECT * INTO v_ident
    FROM galx_oauth_identities
    WHERE id = p_identity_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'IDENTITY_NOT_FOUND');
    END IF;

    IF v_ident.status = 'revoked' THEN
        RETURN jsonb_build_object('success', false, 'error', 'IDENTITY_ALREADY_REVOKED');
    END IF;

    v_family_id := COALESCE(v_ident.session_family_id, 'fam_' || SUBSTRING(v_ident.id FROM 1 FOR 16));

    -- CASE 1: Standard Normal Rotation (Old refresh token matches current active hash)
    IF v_ident.refresh_token_hash IS NULL OR v_ident.refresh_token_hash = p_old_refresh_hash THEN
        v_new_seq := v_ident.sequence_number + 1;
        v_grace_until := v_now + (p_grace_window_sec || ' seconds')::INTERVAL;

        UPDATE galx_oauth_identities
        SET session_family_id = v_family_id,
            sequence_number = v_new_seq,
            previous_refresh_token_hash = v_ident.refresh_token_hash,
            refresh_token_hash = p_new_refresh_hash,
            encrypted_access_token = p_new_encrypted_access,
            encrypted_refresh_token = p_new_encrypted_refresh,
            expires_at = p_expires_at,
            last_refreshed_at = v_now,
            grace_period_until = v_grace_until,
            status = 'active',
            updated_at = v_now
        WHERE id = v_ident.id;

        -- Record audit event
        INSERT INTO galx_audit_logs (
            id,
            workspace_id,
            user_id,
            shard_id,
            action,
            resource_type,
            resource_id,
            metadata,
            timestamp_ms,
            created_at
        ) VALUES (
            'audit_' || v_now_ms || '_' || SUBSTRING(p_new_refresh_hash FROM 1 FOR 8),
            NULL,
            v_ident.user_id,
            v_ident.shard_id,
            'oauth.token_rotated',
            'oauth_identity',
            v_ident.id,
            jsonb_build_object('sequence_number', v_new_seq, 'session_family_id', v_family_id, 'provider', v_ident.provider),
            v_now_ms,
            v_now
        );

        RETURN jsonb_build_object(
            'success', true,
            'sequence_number', v_new_seq,
            'session_family_id', v_family_id,
            'expires_at', p_expires_at
        );
    END IF;

    -- CASE 2: Token Replay within Grace Period Window (Tolerates network retries)
    IF v_ident.previous_refresh_token_hash = p_old_refresh_hash THEN
        IF v_ident.grace_period_until IS NOT NULL AND v_now <= v_ident.grace_period_until THEN
            RETURN jsonb_build_object(
                'success', true,
                'grace_window', true,
                'sequence_number', v_ident.sequence_number,
                'session_family_id', v_family_id,
                'expires_at', v_ident.expires_at
            );
        END IF;
    END IF;

    -- CASE 3: TOKEN REUSE ATTACK DETECTED (RFC 6819 Token Theft Containment)
    -- Stale refresh token presented outside grace window: revoke all family identities and user sessions!
    UPDATE galx_oauth_identities
    SET status = 'revoked',
        updated_at = v_now
    WHERE session_family_id = v_family_id
       OR user_id = v_ident.user_id;

    -- Revoke user sessions
    UPDATE galx_user_sessions
    SET is_revoked = true,
        revoked_at = v_now,
        revoked_reason = 'OAuth Refresh Token Reuse Attack Detected',
        updated_at = v_now
    WHERE user_id = v_ident.user_id
      AND is_revoked = false;

    -- Log critical security threat
    INSERT INTO galx_audit_logs (
        id,
        workspace_id,
        user_id,
        shard_id,
        action,
        resource_type,
        resource_id,
        metadata,
        timestamp_ms,
        created_at
    ) VALUES (
        'threat_' || v_now_ms || '_' || SUBSTRING(p_old_refresh_hash FROM 1 FOR 8),
        NULL,
        v_ident.user_id,
        v_ident.shard_id,
        'oauth.threat.token_reuse_killswitch',
        'oauth_identity',
        v_ident.id,
        jsonb_build_object(
            'threat_level', 'CRITICAL',
            'session_family_id', v_family_id,
            'presented_hash', p_old_refresh_hash,
            'expected_hash', v_ident.refresh_token_hash
        ),
        v_now_ms,
        v_now
    );

    RETURN jsonb_build_object(
        'success', false,
        'error', 'TOKEN_REUSE_ATTACK_DETECTED',
        'family_revoked', true,
        'session_family_id', v_family_id
    );
END;
$$;
