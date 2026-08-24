-- ============================================================================
-- GALXAI: OIDC Back-Channel Logout & Automated Substrate Vacuum Mesh
-- Supabase PostgreSQL Core Schema Migration
-- Version: 12.0.0
-- ============================================================================

-- 1. OIDC BACK-CHANNEL LOGOUT TOKENS TABLE (OpenID Connect Back-Channel Logout 1.0)
CREATE TABLE IF NOT EXISTS galx_oauth_backchannel_logouts (
    id VARCHAR(64) PRIMARY KEY,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('openai', 'xai-grok', 'anthropic')),
    sub VARCHAR(255) NOT NULL,
    sid VARCHAR(255) DEFAULT NULL,
    jti VARCHAR(128) UNIQUE DEFAULT NULL,
    iss TEXT NOT NULL,
    events JSONB NOT NULL DEFAULT '{"http://schemas.openid.net/event/backchannel-logout": {}}'::jsonb,
    raw_logout_token TEXT NOT NULL,
    is_processed BOOLEAN NOT NULL DEFAULT false,
    identities_revoked INT NOT NULL DEFAULT 0,
    sessions_revoked INT NOT NULL DEFAULT 0,
    processed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. HIGH-VELOCITY INDEXES FOR REAL-TIME BACK-CHANNEL CHECK
CREATE INDEX IF NOT EXISTS idx_galx_bc_logout_provider_sub ON galx_oauth_backchannel_logouts(provider, sub);
CREATE INDEX IF NOT EXISTS idx_galx_bc_logout_sid ON galx_oauth_backchannel_logouts(sid) WHERE sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galx_bc_logout_jti ON galx_oauth_backchannel_logouts(jti) WHERE jti IS NOT NULL;

-- 3. ROW LEVEL SECURITY & ENFORCEMENT
ALTER TABLE galx_oauth_backchannel_logouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_oauth_backchannel_logouts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_service_role_oauth_backchannel ON galx_oauth_backchannel_logouts;
CREATE POLICY p_service_role_oauth_backchannel ON galx_oauth_backchannel_logouts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. ATOMIC STORED PROCEDURES (SECURITY DEFINER)

-- A. ATOMIC BACK-CHANNEL LOGOUT PROCESSOR & PROPAGATOR
CREATE OR REPLACE FUNCTION fn_process_backchannel_logout(
    p_id VARCHAR(64),
    p_provider VARCHAR(32),
    p_sub VARCHAR(255),
    p_iss TEXT,
    p_raw_token TEXT,
    p_sid VARCHAR(255) DEFAULT NULL,
    p_jti VARCHAR(128) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_identities_revoked INT := 0;
    v_sessions_revoked INT := 0;
    v_target_user_id VARCHAR(255);
    v_now TIMESTAMPTZ := NOW();
    v_now_ms BIGINT := CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT);
BEGIN
    -- 1. Locate User ID from provider account / sub
    SELECT user_id INTO v_target_user_id
    FROM galx_oauth_identities
    WHERE provider = p_provider
      AND (provider_account_id = p_sub OR email = p_sub)
    LIMIT 1;

    -- 2. Revoke associated OAuth identities
    UPDATE galx_oauth_identities
    SET status = 'revoked',
        updated_at = v_now
    WHERE provider = p_provider
      AND (provider_account_id = p_sub OR email = p_sub OR (v_target_user_id IS NOT NULL AND user_id = v_target_user_id));
    GET DIAGNOSTICS v_identities_revoked = ROW_COUNT;

    -- 3. Revoke active user sessions
    IF v_target_user_id IS NOT NULL THEN
        UPDATE galx_user_sessions
        SET is_revoked = true,
            revoked_at = v_now,
            revoked_reason = 'OIDC Back-Channel Logout (' || p_provider || ')',
            updated_at = v_now
        WHERE user_id = v_target_user_id
          AND is_revoked = false;
        GET DIAGNOSTICS v_sessions_revoked = ROW_COUNT;
    END IF;

    -- 4. Ingest record into backchannel ledger
    INSERT INTO galx_oauth_backchannel_logouts (
        id,
        provider,
        sub,
        sid,
        jti,
        iss,
        raw_logout_token,
        is_processed,
        identities_revoked,
        sessions_revoked,
        processed_at,
        created_at
    ) VALUES (
        p_id,
        p_provider,
        p_sub,
        p_sid,
        p_jti,
        p_iss,
        p_raw_token,
        true,
        v_identities_revoked,
        v_sessions_revoked,
        v_now,
        v_now
    );

    -- 5. Append immutable audit log
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
        'audit_bc_' || v_now_ms || '_' || SUBSTRING(p_id FROM 1 FOR 8),
        NULL,
        v_target_user_id,
        NULL,
        'oauth.oidc.backchannel_logout',
        'oauth_identity',
        p_sub,
        jsonb_build_object(
            'provider', p_provider,
            'sub', p_sub,
            'sid', p_sid,
            'identities_revoked', v_identities_revoked,
            'sessions_revoked', v_sessions_revoked
        ),
        v_now_ms,
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_target_user_id,
        'identities_revoked', v_identities_revoked,
        'sessions_revoked', v_sessions_revoked
    );
END;
$$;

-- B. COMPREHENSIVE PERIODIC SUBSTRATE VACUUM & HEALTH RECONCILIATION
CREATE OR REPLACE FUNCTION fn_scavenge_oauth_substrate_cron()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_purged_dpop INT := 0;
    v_purged_requests INT := 0;
    v_purged_devices INT := 0;
    v_purged_par INT := 0;
    v_expired_identities INT := 0;
    v_cnt INT;
BEGIN
    -- 1. Purge expired DPoP proofs
    DELETE FROM galx_oauth_dpop_proofs WHERE expires_at < NOW();
    GET DIAGNOSTICS v_purged_dpop = ROW_COUNT;

    -- 2. Purge expired PKCE state requests (> 1 hour old)
    DELETE FROM galx_oauth_requests WHERE expires_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_purged_requests = ROW_COUNT;

    -- 3. Purge expired non-approved device codes (> 1 hour old)
    DELETE FROM galx_oauth_device_codes WHERE expires_at < NOW() - INTERVAL '1 hour' AND status != 'approved';
    GET DIAGNOSTICS v_purged_devices = ROW_COUNT;

    -- 4. Purge expired PAR requests (> 1 hour old)
    DELETE FROM galx_oauth_pushed_requests WHERE expires_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_purged_par = ROW_COUNT;

    -- 5. Mark expired active OAuth identities
    UPDATE galx_oauth_identities
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
    GET DIAGNOSTICS v_expired_identities = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'purged_dpop_proofs', v_purged_dpop,
        'purged_oauth_requests', v_purged_requests,
        'purged_device_codes', v_purged_devices,
        'purged_par_requests', v_purged_par,
        'expired_identities_marked', v_expired_identities
    );
END;
$$;

-- 4. ATOMIC IDENTITY UPSERT & RETRIEVAL FUNCTIONS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION fn_save_oauth_identity(
    p_id VARCHAR(64),
    p_user_id VARCHAR(255),
    p_provider VARCHAR(32),
    p_provider_account_id VARCHAR(255),
    p_email VARCHAR(255),
    p_encrypted_access_token JSONB,
    p_display_name VARCHAR(255) DEFAULT NULL,
    p_shard_id VARCHAR(64) DEFAULT NULL,
    p_session_family_id VARCHAR(64) DEFAULT NULL,
    p_sequence_number INT DEFAULT 1,
    p_refresh_token_hash VARCHAR(64) DEFAULT NULL,
    p_previous_refresh_token_hash VARCHAR(64) DEFAULT NULL,
    p_grace_period_until TIMESTAMPTZ DEFAULT NULL,
    p_encrypted_refresh_token JSONB DEFAULT NULL,
    p_id_token_claims JSONB DEFAULT NULL,
    p_scopes TEXT[] DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_last_refreshed_at TIMESTAMPTZ DEFAULT NULL,
    p_status VARCHAR(32) DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
BEGIN
    INSERT INTO galx_oauth_identities (
        id, user_id, provider, provider_account_id, email, display_name,
        shard_id, session_family_id, sequence_number, refresh_token_hash,
        previous_refresh_token_hash, grace_period_until, encrypted_access_token,
        encrypted_refresh_token, id_token_claims, scopes, expires_at,
        last_refreshed_at, status, created_at, updated_at
    ) VALUES (
        p_id, p_user_id, p_provider, p_provider_account_id, p_email, p_display_name,
        p_shard_id, p_session_family_id, p_sequence_number, p_refresh_token_hash,
        p_previous_refresh_token_hash, p_grace_period_until, p_encrypted_access_token,
        p_encrypted_refresh_token, p_id_token_claims, p_scopes, p_expires_at,
        p_last_refreshed_at, p_status, v_now, v_now
    )
    ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        provider = EXCLUDED.provider,
        provider_account_id = EXCLUDED.provider_account_id,
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        shard_id = EXCLUDED.shard_id,
        session_family_id = EXCLUDED.session_family_id,
        sequence_number = EXCLUDED.sequence_number,
        refresh_token_hash = EXCLUDED.refresh_token_hash,
        previous_refresh_token_hash = EXCLUDED.previous_refresh_token_hash,
        grace_period_until = EXCLUDED.grace_period_until,
        encrypted_access_token = EXCLUDED.encrypted_access_token,
        encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
        id_token_claims = EXCLUDED.id_token_claims,
        scopes = EXCLUDED.scopes,
        expires_at = EXCLUDED.expires_at,
        last_refreshed_at = EXCLUDED.last_refreshed_at,
        status = EXCLUDED.status,
        updated_at = v_now;

    RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_oauth_identity_by_id(
    p_id VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ident RECORD;
BEGIN
    SELECT * INTO v_ident
    FROM galx_oauth_identities
    WHERE id = p_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', false);
    END IF;

    RETURN jsonb_build_object(
        'found', true,
        'identity', row_to_json(v_ident)
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_oauth_identities_by_user(
    p_user_id VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_list JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(i)), '[]'::jsonb)
    INTO v_list
    FROM (
        SELECT * FROM galx_oauth_identities
        WHERE user_id = p_user_id
          AND status IN ('active', 'needs_reauth')
        ORDER BY created_at DESC
    ) i;

    RETURN jsonb_build_object(
        'success', true,
        'identities', v_list
    );
END;
$$;

