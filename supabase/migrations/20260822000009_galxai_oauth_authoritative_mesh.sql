-- ============================================================================
-- GALXAI: Hardened Enterprise OAuth 2.0 / 2.1, PKCE & Token Lifecycle Substrate
-- Supabase PostgreSQL Core Schema Migration
-- Version: 9.0.0
-- ============================================================================

-- 1. OAUTH IDENTITIES (Linked Multi-Provider Accounts with AES-256-GCM Vault Payloads)
CREATE TABLE IF NOT EXISTS galx_oauth_identities (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('openai', 'xai-grok', 'anthropic')),
    provider_account_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    shard_id VARCHAR(64) REFERENCES galx_shard_accounts(id) ON DELETE SET NULL,
    encrypted_access_token JSONB NOT NULL,
    encrypted_refresh_token JSONB,
    id_token_claims JSONB,
    scopes TEXT[],
    expires_at TIMESTAMPTZ,
    last_refreshed_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'needs_reauth')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_galx_oauth_identity_user_provider UNIQUE(user_id, provider, provider_account_id)
);

-- 2. OAUTH PKCE AUTHORIZATION REQUESTS (Anti-CSRF & Anti-Replay Single-Use Nonces)
CREATE TABLE IF NOT EXISTS galx_oauth_requests (
    id VARCHAR(64) PRIMARY KEY,
    state VARCHAR(255) NOT NULL UNIQUE,
    code_verifier VARCHAR(255) NOT NULL,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('openai', 'xai-grok', 'anthropic')),
    redirect_uri TEXT NOT NULL,
    mode VARCHAR(32) NOT NULL DEFAULT 'pooled',
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(255),
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    is_consumed BOOLEAN NOT NULL DEFAULT false,
    consumed_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. OAUTH DEVICE AUTHORIZATION CODES (RFC 8628 Headless CLI Grant)
CREATE TABLE IF NOT EXISTS galx_oauth_device_codes (
    id VARCHAR(64) PRIMARY KEY,
    device_code VARCHAR(128) NOT NULL UNIQUE,
    user_code VARCHAR(16) NOT NULL UNIQUE,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('openai', 'xai-grok', 'anthropic')),
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
    session_token TEXT DEFAULT NULL,
    token_record JSONB DEFAULT NULL,
    user_id VARCHAR(255) DEFAULT NULL,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    polling_interval_sec INT NOT NULL DEFAULT 5,
    last_polled_at_ms BIGINT DEFAULT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PUSHED AUTHORIZATION REQUESTS (RFC 9126 PAR Ephemeral Nonces)
CREATE TABLE IF NOT EXISTS galx_oauth_pushed_requests (
    id VARCHAR(64) PRIMARY KEY,
    request_uri VARCHAR(128) NOT NULL UNIQUE,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('openai', 'xai-grok', 'anthropic')),
    client_id VARCHAR(255) NOT NULL,
    redirect_uri TEXT NOT NULL,
    scope TEXT DEFAULT NULL,
    code_challenge VARCHAR(255) DEFAULT NULL,
    code_challenge_method VARCHAR(32) DEFAULT 'S256',
    state VARCHAR(255) DEFAULT NULL,
    response_type VARCHAR(32) DEFAULT 'code',
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    is_consumed BOOLEAN NOT NULL DEFAULT false,
    consumed_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. HIGH-VELOCITY INDEXES (Including Foreign Keys & Filtered Partial Indexes)
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_user ON galx_oauth_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_provider ON galx_oauth_identities(provider);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_shard ON galx_oauth_identities(shard_id);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_active ON galx_oauth_identities(user_id, provider) WHERE status != 'revoked';
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_expiring ON galx_oauth_identities(expires_at) WHERE status = 'active' AND expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_galx_oauth_req_state ON galx_oauth_requests(state);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_req_ws ON galx_oauth_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_req_unconsumed ON galx_oauth_requests(state, provider) WHERE is_consumed = false;
CREATE INDEX IF NOT EXISTS idx_galx_oauth_req_expires ON galx_oauth_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_galx_oauth_dev_code ON galx_oauth_device_codes(device_code);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_dev_user ON galx_oauth_device_codes(user_code);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_dev_ws ON galx_oauth_device_codes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_dev_pending ON galx_oauth_device_codes(user_code) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_galx_oauth_par_uri ON galx_oauth_pushed_requests(request_uri);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_par_ws ON galx_oauth_pushed_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_par_unconsumed ON galx_oauth_pushed_requests(request_uri) WHERE is_consumed = false;

-- 6. ROW LEVEL SECURITY & STRICT ENFORCEMENT
ALTER TABLE galx_oauth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_oauth_identities FORCE ROW LEVEL SECURITY;

ALTER TABLE galx_oauth_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_oauth_requests FORCE ROW LEVEL SECURITY;

ALTER TABLE galx_oauth_device_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_oauth_device_codes FORCE ROW LEVEL SECURITY;

ALTER TABLE galx_oauth_pushed_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_oauth_pushed_requests FORCE ROW LEVEL SECURITY;

-- 7. RLS POLICIES (Service Role Full Access & Tenant Isolation)
CREATE POLICY p_service_role_oauth_identities ON galx_oauth_identities
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY p_service_role_oauth_requests ON galx_oauth_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY p_service_role_oauth_device ON galx_oauth_device_codes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY p_service_role_oauth_par ON galx_oauth_pushed_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. ATOMIC STORED PROCEDURES (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION fn_consume_oauth_request(
    p_state VARCHAR(255),
    p_provider VARCHAR(32) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_req RECORD;
BEGIN
    SELECT * INTO v_req
    FROM galx_oauth_requests
    WHERE state = p_state
      AND (p_provider IS NULL OR provider = p_provider)
      AND is_consumed = false
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_OR_EXPIRED_STATE');
    END IF;

    UPDATE galx_oauth_requests
    SET is_consumed = true,
        consumed_at = NOW()
    WHERE id = v_req.id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_req.id,
        'state', v_req.state,
        'code_verifier', v_req.code_verifier,
        'provider', v_req.provider,
        'redirect_uri', v_req.redirect_uri,
        'mode', v_req.mode,
        'workspace_id', v_req.workspace_id,
        'user_id', v_req.user_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_approve_device_code(
    p_user_code VARCHAR(16),
    p_session_token TEXT,
    p_token_record JSONB DEFAULT NULL,
    p_user_id VARCHAR(255) DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_dev RECORD;
BEGIN
    SELECT * INTO v_dev
    FROM galx_oauth_device_codes
    WHERE user_code = UPPER(TRIM(p_user_code))
      AND status = 'pending'
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    UPDATE galx_oauth_device_codes
    SET status = 'approved',
        session_token = p_session_token,
        token_record = p_token_record,
        user_id = COALESCE(p_user_id, v_dev.user_id)
    WHERE id = v_dev.id;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION fn_purge_expired_oauth_states()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted INT := 0;
    v_cnt INT;
BEGIN
    DELETE FROM galx_oauth_requests WHERE expires_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    v_deleted := v_deleted + v_cnt;

    DELETE FROM galx_oauth_device_codes WHERE expires_at < NOW() - INTERVAL '1 hour' AND status != 'approved';
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    v_deleted := v_deleted + v_cnt;

    DELETE FROM galx_oauth_pushed_requests WHERE expires_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    v_deleted := v_deleted + v_cnt;

    RETURN v_deleted;
END;
$$;
