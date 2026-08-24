-- ============================================================================
-- GALXAI: Enterprise FAPI & RFC 9449 DPoP Proof Anti-Replay Substrate
-- Supabase PostgreSQL Core Schema Migration
-- Version: 10.0.0
-- ============================================================================

-- 1. RFC 9449 DPOP PROOF ANTI-REPLAY AUDIT TABLE
CREATE TABLE IF NOT EXISTS galx_oauth_dpop_proofs (
    jti VARCHAR(128) PRIMARY KEY,
    access_token_hash VARCHAR(128) DEFAULT NULL,
    http_method VARCHAR(16) NOT NULL,
    http_uri TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. INDEXES FOR HIGH-THROUGHPUT EXPIRATION & JTI VERIFICATION
CREATE INDEX IF NOT EXISTS idx_galx_dpop_expires_at ON galx_oauth_dpop_proofs(expires_at);
CREATE INDEX IF NOT EXISTS idx_galx_dpop_ath ON galx_oauth_dpop_proofs(access_token_hash) WHERE access_token_hash IS NOT NULL;

-- 3. ROW LEVEL SECURITY & ENFORCEMENT
ALTER TABLE galx_oauth_dpop_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_oauth_dpop_proofs FORCE ROW LEVEL SECURITY;

CREATE POLICY p_service_role_oauth_dpop ON galx_oauth_dpop_proofs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. ATOMIC STORED PROCEDURES (SECURITY DEFINER)

-- A. ATOMIC DPOP PROOF RECORDING & ANTI-REPLAY VERIFICATION
CREATE OR REPLACE FUNCTION fn_record_dpop_proof(
    p_jti VARCHAR(128),
    p_ath VARCHAR(128) DEFAULT NULL,
    p_htm VARCHAR(16) DEFAULT 'POST',
    p_htu TEXT DEFAULT '',
    p_iat_ms BIGINT DEFAULT NULL,
    p_exp_ms BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now_ms BIGINT;
    v_iat TIMESTAMPTZ;
    v_exp TIMESTAMPTZ;
    v_exists RECORD;
BEGIN
    v_now_ms := CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT);
    v_iat := TO_TIMESTAMP(COALESCE(p_iat_ms, v_now_ms) / 1000.0);
    v_exp := TO_TIMESTAMP(COALESCE(p_exp_ms, v_now_ms + 300000) / 1000.0); -- 5 minute default

    -- 1. Check for existing JTI (Replay Attack detection)
    SELECT * INTO v_exists
    FROM galx_oauth_dpop_proofs
    WHERE jti = p_jti;

    IF FOUND THEN
        RETURN jsonb_build_object('valid', false, 'error', 'DPOP_JTI_REPLAY_DETECTED');
    END IF;

    -- 2. Insert new proof record
    INSERT INTO galx_oauth_dpop_proofs (
        jti,
        access_token_hash,
        http_method,
        http_uri,
        issued_at,
        expires_at,
        created_at
    ) VALUES (
        p_jti,
        p_ath,
        UPPER(p_htm),
        p_htu,
        v_iat,
        v_exp,
        NOW()
    );

    RETURN jsonb_build_object('valid', true);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('valid', false, 'error', 'DPOP_JTI_REPLAY_DETECTED');
END;
$$;

-- B. ATOMIC RFC 8628 DEVICE CODE POLLING WITH SLOW-DOWN ENFORCEMENT
CREATE OR REPLACE FUNCTION fn_poll_device_code(
    p_device_code VARCHAR(128),
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now_ms BIGINT;
    v_dev RECORD;
    v_slow_interval INT;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    SELECT * INTO v_dev
    FROM galx_oauth_device_codes
    WHERE device_code = p_device_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_grant', 'error_description', 'Device code not found or invalid');
    END IF;

    -- Expiration Check
    IF v_dev.expires_at <= NOW() THEN
        DELETE FROM galx_oauth_device_codes WHERE id = v_dev.id;
        RETURN jsonb_build_object('success', false, 'error', 'expired_token', 'error_description', 'The device authorization code has expired.');
    END IF;

    -- Rate Limit / Polling Interval Protection (RFC 8628 § 3.5 slow_down)
    IF v_dev.last_polled_at_ms IS NOT NULL AND (v_now_ms - v_dev.last_polled_at_ms) < (v_dev.polling_interval_sec * 1000 - 500) THEN
        v_slow_interval := v_dev.polling_interval_sec + 5;
        UPDATE galx_oauth_device_codes
        SET polling_interval_sec = v_slow_interval,
            last_polled_at_ms = v_now_ms
        WHERE id = v_dev.id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'slow_down',
            'error_description', 'Polling too rapidly. Increase interval.',
            'interval', v_slow_interval
        );
    END IF;

    -- Update last polled timestamp
    UPDATE galx_oauth_device_codes
    SET last_polled_at_ms = v_now_ms
    WHERE id = v_dev.id;

    IF v_dev.status = 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'authorization_pending',
            'error_description', 'The user has not yet authorized the request.',
            'interval', v_dev.polling_interval_sec
        );
    END IF;

    IF v_dev.status = 'denied' THEN
        DELETE FROM galx_oauth_device_codes WHERE id = v_dev.id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'access_denied',
            'error_description', 'The user denied the authorization request.'
        );
    END IF;

    IF v_dev.status = 'approved' THEN
        -- Single-use token delivery: delete code on retrieval
        DELETE FROM galx_oauth_device_codes WHERE id = v_dev.id;

        RETURN jsonb_build_object(
            'success', true,
            'access_token', v_dev.session_token,
            'token_type', 'Bearer',
            'expires_in', 2592000,
            'token_record', v_dev.token_record
        );
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'invalid_grant', 'error_description', 'Unexpected status');
END;
$$;

-- C. ATOMIC RFC 9126 PAR CONSUMPTION
CREATE OR REPLACE FUNCTION fn_consume_pushed_request(
    p_request_uri VARCHAR(128)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_par RECORD;
BEGIN
    SELECT * INTO v_par
    FROM galx_oauth_pushed_requests
    WHERE request_uri = p_request_uri
      AND is_consumed = false
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_OR_EXPIRED_REQUEST_URI');
    END IF;

    UPDATE galx_oauth_pushed_requests
    SET is_consumed = true,
        consumed_at = NOW()
    WHERE id = v_par.id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_par.id,
        'request_uri', v_par.request_uri,
        'provider', v_par.provider,
        'client_id', v_par.client_id,
        'redirect_uri', v_par.redirect_uri,
        'scope', v_par.scope,
        'code_challenge', v_par.code_challenge,
        'code_challenge_method', v_par.code_challenge_method,
        'state', v_par.state,
        'response_type', v_par.response_type,
        'workspace_id', v_par.workspace_id
    );
END;
$$;
