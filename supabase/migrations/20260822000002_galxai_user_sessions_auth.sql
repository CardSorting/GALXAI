-- ============================================================================
-- GALXAI: Hardened Provider-as-Auth & User Session Substrate Migration
-- Supabase PostgreSQL Core Schema Migration
-- Version: 3.1.0
-- ============================================================================

-- 1. USER SESSIONS & CRYPTOGRAPHIC AUTH TOKENS TABLE
CREATE TABLE IF NOT EXISTS galx_user_sessions (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(255) NOT NULL,
    provider VARCHAR(32) NOT NULL, -- 'openai', 'xai-grok', 'guest'
    shard_id VARCHAR(64) REFERENCES galx_shard_accounts(id) ON DELETE SET NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of signed session bearer token
    refresh_token_hash VARCHAR(64) UNIQUE,  -- SHA-256 hash of refresh token
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_at TIMESTAMPTZ DEFAULT NULL,
    revoked_reason TEXT DEFAULT NULL,
    issued_at_ms BIGINT NOT NULL,
    expires_at_ms BIGINT NOT NULL,
    last_active_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. HIGH-VELOCITY AUTH INDEXES
CREATE INDEX IF NOT EXISTS idx_galx_sessions_token_hash ON galx_user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_user_id ON galx_user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_shard_id ON galx_user_sessions(shard_id);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_expires_at ON galx_user_sessions(expires_at_ms);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_active ON galx_user_sessions(user_id, is_revoked, expires_at_ms);

-- ============================================================================
-- 3. ATOMIC STORED PROCEDURES (SECURITY DEFINER)
-- ============================================================================

-- A. ATOMIC CREATE USER SESSION
CREATE OR REPLACE FUNCTION fn_create_user_session(
    p_id VARCHAR(64),
    p_user_id VARCHAR(255),
    p_provider VARCHAR(32),
    p_shard_id VARCHAR(64),
    p_token_hash VARCHAR(64),
    p_refresh_token_hash VARCHAR(64) DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_issued_at_ms BIGINT DEFAULT NULL,
    p_expires_at_ms BIGINT DEFAULT NULL,
    p_workspace_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now_ms BIGINT;
    v_issued_ms BIGINT;
    v_expires_ms BIGINT;
    v_session RECORD;
BEGIN
    v_now_ms := CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT);
    v_issued_ms := COALESCE(p_issued_at_ms, v_now_ms);
    v_expires_ms := COALESCE(p_expires_at_ms, v_now_ms + 2592000000); -- 30 days default

    INSERT INTO galx_user_sessions (
        id,
        workspace_id,
        user_id,
        provider,
        shard_id,
        token_hash,
        refresh_token_hash,
        ip_address,
        user_agent,
        is_revoked,
        issued_at_ms,
        expires_at_ms,
        last_active_at_ms,
        created_at,
        updated_at
    ) VALUES (
        p_id,
        p_workspace_id,
        p_user_id,
        p_provider,
        p_shard_id,
        p_token_hash,
        p_refresh_token_hash,
        p_ip_address,
        p_user_agent,
        false,
        v_issued_ms,
        v_expires_ms,
        v_now_ms,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        token_hash = EXCLUDED.token_hash,
        refresh_token_hash = COALESCE(EXCLUDED.refresh_token_hash, galx_user_sessions.refresh_token_hash),
        shard_id = COALESCE(EXCLUDED.shard_id, galx_user_sessions.shard_id),
        last_active_at_ms = v_now_ms,
        is_revoked = false,
        revoked_at = NULL,
        revoked_reason = NULL,
        updated_at = NOW()
    RETURNING * INTO v_session;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session.id,
        'user_id', v_session.user_id,
        'provider', v_session.provider,
        'shard_id', v_session.shard_id,
        'expires_at_ms', v_session.expires_at_ms
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- B. ATOMIC VERIFY USER SESSION
CREATE OR REPLACE FUNCTION fn_verify_user_session(
    p_token_hash VARCHAR(64),
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now_ms BIGINT;
    v_session RECORD;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    SELECT * INTO v_session
    FROM galx_user_sessions
    WHERE token_hash = p_token_hash;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'SESSION_NOT_FOUND');
    END IF;

    IF v_session.is_revoked THEN
        RETURN jsonb_build_object('success', false, 'reason', 'SESSION_REVOKED', 'revoked_reason', v_session.revoked_reason);
    END IF;

    IF v_session.expires_at_ms <= v_now_ms THEN
        RETURN jsonb_build_object('success', false, 'reason', 'SESSION_EXPIRED');
    END IF;

    -- Update last active heartbeat
    UPDATE galx_user_sessions
    SET last_active_at_ms = v_now_ms,
        updated_at = NOW()
    WHERE id = v_session.id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session.id,
        'user_id', v_session.user_id,
        'provider', v_session.provider,
        'shard_id', v_session.shard_id,
        'workspace_id', v_session.workspace_id,
        'expires_at_ms', v_session.expires_at_ms,
        'issued_at_ms', v_session.issued_at_ms,
        'last_active_at_ms', v_now_ms
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- C. ATOMIC REVOKE USER SESSION
CREATE OR REPLACE FUNCTION fn_revoke_user_session(
    p_session_id VARCHAR(64),
    p_reason TEXT DEFAULT 'User requested logout',
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now_ms BIGINT;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    UPDATE galx_user_sessions
    SET is_revoked = true,
        revoked_at = NOW(),
        revoked_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'session_id', p_session_id, 'revoked_at_ms', v_now_ms);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- D. ATOMIC GLOBAL REVOKE ALL SESSIONS FOR USER
CREATE OR REPLACE FUNCTION fn_revoke_all_user_sessions(
    p_user_id VARCHAR(255),
    p_reason TEXT DEFAULT 'Global logout from all devices',
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
      AND is_revoked = false;

    GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'revoked_count', v_revoked_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- E. SCAVENGE EXPIRED SESSIONS
CREATE OR REPLACE FUNCTION fn_cleanup_expired_sessions(
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_now_ms BIGINT;
    v_deleted_count INTEGER := 0;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    DELETE FROM galx_user_sessions
    WHERE expires_at_ms < v_now_ms
       OR (is_revoked = true AND updated_at < NOW() - INTERVAL '7 days');

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE galx_user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_galx_user_sessions" ON galx_user_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "user_view_own_sessions" ON galx_user_sessions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "user_delete_own_sessions" ON galx_user_sessions FOR DELETE USING (auth.uid()::text = user_id);
