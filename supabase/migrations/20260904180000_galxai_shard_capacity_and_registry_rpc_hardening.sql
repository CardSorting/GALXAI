-- ============================================================================
-- GALXAI Migration: shard capacity and registry RPC hardening
-- Purpose: Make PostgreSQL adjudicate capacity as well as lease ownership,
--          provide renewable fenced leases, and expose a counter-safe registry
--          upsert for service-role PostgREST failover.
-- Risk: HIGH (credential control plane and cross-worker quota ownership).
-- ============================================================================

-- 1. DEFENSIVE STATE CONSTRAINTS
ALTER TABLE public.galx_shard_accounts
  DROP CONSTRAINT IF EXISTS galx_shards_token_state_nonnegative,
  DROP CONSTRAINT IF EXISTS galx_shards_request_state_nonnegative,
  DROP CONSTRAINT IF EXISTS galx_shards_concurrency_state_valid;
ALTER TABLE public.galx_shard_accounts
  ADD CONSTRAINT galx_shards_token_state_nonnegative CHECK (
    max_tokens > 0 AND remaining_tokens >= 0 AND reserved_tokens >= 0
    AND refill_rate_per_minute >= 0
  ),
  ADD CONSTRAINT galx_shards_request_state_nonnegative CHECK (
    max_requests > 0 AND remaining_requests >= 0
  ),
  ADD CONSTRAINT galx_shards_concurrency_state_valid CHECK (
    max_concurrency_ceiling > 0 AND active_in_flight_count >= 0
  );

-- 2. COUNTER-SAFE REGISTRY UPSERT FOR ADMIN DATA-API FAILOVER
-- Hot counters and fencing state are insertable for bootstrap, but never
-- overwritten when a registry entry already exists.
CREATE OR REPLACE FUNCTION public.fn_upsert_shard_registry(p_row JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_row public.galx_shard_accounts%ROWTYPE;
BEGIN
  IF p_row IS NULL OR jsonb_typeof(p_row) <> 'object' THEN
    RAISE EXCEPTION 'p_row must be a JSON object' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(p_row->>'id', '') !~ '^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$' THEN
    RAISE EXCEPTION 'invalid shard id' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.galx_shard_accounts (
    id, user_id, provider, auth_type, account_label, api_key_masked,
    encrypted_ciphertext, encrypted_iv, encrypted_tag, key_version,
    shard_mode, priority, weight, status, max_tokens, remaining_tokens,
    reserved_tokens, refill_rate_per_minute, max_requests, remaining_requests,
    last_refill_timestamp_ms, total_requests_served, total_tokens_consumed,
    consecutive_failures, consecutive_successes, average_latency_ms,
    last_latency_ms, fencing_token, permission_retracted, cooldown_until_ms,
    created_at_ms, updated_at_ms, credential_expires_at_ms,
    privacy_capabilities, sliding_window_quota, supported_models,
    unsupported_models, registry_source
  ) VALUES (
    p_row->>'id',
    p_row->>'user_id',
    (p_row->>'provider')::public.galx_provider_type,
    COALESCE(p_row->>'auth_type', 'api_key')::public.galx_auth_type,
    p_row->>'account_label',
    p_row->>'api_key_masked',
    p_row->>'encrypted_ciphertext',
    p_row->>'encrypted_iv',
    p_row->>'encrypted_tag',
    COALESCE(p_row->>'key_version', 'v1'),
    COALESCE(p_row->>'shard_mode', 'pooled')::public.galx_shard_mode,
    COALESCE((p_row->>'priority')::INTEGER, 50),
    COALESCE((p_row->>'weight')::INTEGER, 5),
    COALESCE(p_row->>'status', 'healthy')::public.galx_credential_status,
    COALESCE((p_row->>'max_tokens')::BIGINT, 10000000),
    COALESCE((p_row->>'remaining_tokens')::BIGINT, 10000000),
    COALESCE((p_row->>'reserved_tokens')::BIGINT, 0),
    COALESCE((p_row->>'refill_rate_per_minute')::BIGINT, 10000000),
    COALESCE((p_row->>'max_requests')::INTEGER, 10000),
    COALESCE((p_row->>'remaining_requests')::INTEGER, 10000),
    COALESCE((p_row->>'last_refill_timestamp_ms')::BIGINT, 0),
    COALESCE((p_row->>'total_requests_served')::BIGINT, 0),
    COALESCE((p_row->>'total_tokens_consumed')::BIGINT, 0),
    COALESCE((p_row->>'consecutive_failures')::INTEGER, 0),
    COALESCE((p_row->>'consecutive_successes')::INTEGER, 0),
    COALESCE((p_row->>'average_latency_ms')::NUMERIC, 250),
    (p_row->>'last_latency_ms')::NUMERIC,
    COALESCE((p_row->>'fencing_token')::BIGINT, 1),
    COALESCE((p_row->>'permission_retracted')::BOOLEAN, false),
    (p_row->>'cooldown_until_ms')::BIGINT,
    COALESCE((p_row->>'created_at_ms')::BIGINT, v_now_ms),
    COALESCE((p_row->>'updated_at_ms')::BIGINT, v_now_ms),
    (p_row->>'credential_expires_at_ms')::BIGINT,
    CASE WHEN jsonb_typeof(p_row->'privacy_capabilities') = 'object'
      THEN p_row->'privacy_capabilities' ELSE '{}'::JSONB END,
    CASE WHEN jsonb_typeof(p_row->'sliding_window_quota') = 'object'
      THEN p_row->'sliding_window_quota' ELSE '{}'::JSONB END,
    CASE WHEN jsonb_typeof(p_row->'supported_models') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_row->'supported_models')) ELSE NULL END,
    CASE WHEN jsonb_typeof(p_row->'unsupported_models') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_row->'unsupported_models')) ELSE NULL END,
    COALESCE(p_row->>'registry_source', 'api')
  )
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    provider = EXCLUDED.provider,
    auth_type = EXCLUDED.auth_type,
    account_label = EXCLUDED.account_label,
    api_key_masked = EXCLUDED.api_key_masked,
    encrypted_ciphertext = EXCLUDED.encrypted_ciphertext,
    encrypted_iv = EXCLUDED.encrypted_iv,
    encrypted_tag = EXCLUDED.encrypted_tag,
    key_version = EXCLUDED.key_version,
    shard_mode = EXCLUDED.shard_mode,
    priority = EXCLUDED.priority,
    weight = EXCLUDED.weight,
    status = EXCLUDED.status,
    permission_retracted = EXCLUDED.permission_retracted,
    cooldown_until_ms = EXCLUDED.cooldown_until_ms,
    credential_expires_at_ms = EXCLUDED.credential_expires_at_ms,
    privacy_capabilities = EXCLUDED.privacy_capabilities,
    sliding_window_quota = EXCLUDED.sliding_window_quota,
    supported_models = EXCLUDED.supported_models,
    unsupported_models = EXCLUDED.unsupported_models,
    registry_source = EXCLUDED.registry_source,
    updated_at = clock_timestamp()
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

-- 3. ACQUIRE: CONSISTENT LOCK ORDER + IDEMPOTENCY + ATOMIC CAPACITY CHECKS
CREATE OR REPLACE FUNCTION public.fn_acquire_shard_lease(
  p_shard_id VARCHAR(64),
  p_user_id VARCHAR(255),
  p_estimated_tokens BIGINT DEFAULT 2000,
  p_lease_ttl_ms BIGINT DEFAULT 120000,
  p_job_id VARCHAR(128) DEFAULT NULL,
  p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_shard public.galx_shard_accounts%ROWTYPE;
  v_existing public.galx_shard_leases%ROWTYPE;
  v_expired RECORD;
  v_lease_id VARCHAR(64);
  v_now_ms BIGINT;
  v_expires_at_ms BIGINT;
  v_new_fencing_token BIGINT;
BEGIN
  v_now_ms := COALESCE(p_now_ms, (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT);

  IF p_estimated_tokens <= 0 OR p_estimated_tokens > 10000000 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'INVALID_TOKEN_RESERVATION');
  END IF;
  IF p_lease_ttl_ms < 1000 OR p_lease_ttl_ms > 1800000 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'INVALID_LEASE_TTL');
  END IF;
  IF p_job_id IS NULL OR btrim(p_job_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'IDEMPOTENCY_KEY_REQUIRED');
  END IF;

  -- Every lease routine locks the shard before its leases to avoid deadlocks.
  SELECT * INTO v_shard
  FROM public.galx_shard_accounts
  WHERE id = p_shard_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_FOUND');
  END IF;

  SELECT * INTO v_existing
  FROM public.galx_shard_leases
  WHERE shard_id = p_shard_id
    AND user_id = p_user_id
    AND job_id = p_job_id
    AND is_reclaimed = false
  ORDER BY acquired_at_ms DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.is_committed THEN
      RETURN jsonb_build_object(
        'success', false,
        'reason', 'LEASE_ALREADY_COMMITTED',
        'lease_id', v_existing.id,
        'fencing_token', v_existing.fencing_token
      );
    ELSIF v_existing.expires_at_ms >= v_now_ms THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'lease_id', v_existing.id,
        'shard_id', v_existing.shard_id,
        'fencing_token', v_existing.fencing_token,
        'expires_at_ms', v_existing.expires_at_ms,
        'estimated_tokens', v_existing.estimated_tokens
      );
    END IF;
  END IF;

  -- Reclaim all expired leases on this locked shard before evaluating capacity.
  FOR v_expired IN
    UPDATE public.galx_shard_leases
    SET is_reclaimed = true, updated_at = clock_timestamp()
    WHERE shard_id = p_shard_id
      AND expires_at_ms < v_now_ms
      AND is_committed = false
      AND is_reclaimed = false
    RETURNING estimated_tokens
  LOOP
    v_shard.reserved_tokens := GREATEST(0, v_shard.reserved_tokens - v_expired.estimated_tokens);
    v_shard.active_in_flight_count := GREATEST(0, v_shard.active_in_flight_count - 1);
  END LOOP;

  UPDATE public.galx_shard_accounts
  SET reserved_tokens = v_shard.reserved_tokens,
      active_in_flight_count = v_shard.active_in_flight_count,
      updated_at_ms = v_now_ms,
      updated_at = clock_timestamp()
  WHERE id = p_shard_id;

  IF v_shard.status <> 'healthy' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_HEALTHY', 'status', v_shard.status);
  END IF;
  IF v_shard.permission_retracted THEN
    RETURN jsonb_build_object('success', false, 'reason', 'PERMISSION_RETRACTED');
  END IF;
  IF v_shard.cooldown_until_ms IS NOT NULL AND v_shard.cooldown_until_ms > v_now_ms THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_COOLDOWN');
  END IF;
  IF v_shard.credential_expires_at_ms IS NOT NULL AND v_shard.credential_expires_at_ms <= v_now_ms THEN
    RETURN jsonb_build_object('success', false, 'reason', 'CREDENTIAL_EXPIRED');
  END IF;
  IF v_shard.active_in_flight_count >= v_shard.max_concurrency_ceiling THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_CONCURRENCY_EXHAUSTED');
  END IF;
  IF v_shard.remaining_requests <= 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_REQUEST_QUOTA_EXHAUSTED');
  END IF;
  IF (v_shard.remaining_tokens - v_shard.reserved_tokens) < p_estimated_tokens THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_TOKEN_QUOTA_EXHAUSTED');
  END IF;

  v_expires_at_ms := v_now_ms + p_lease_ttl_ms;
  v_new_fencing_token := v_shard.fencing_token + 1;
  v_lease_id := 'lease_' || replace(gen_random_uuid()::text, '-', '');

  UPDATE public.galx_shard_accounts
  SET reserved_tokens = reserved_tokens + p_estimated_tokens,
      active_in_flight_count = active_in_flight_count + 1,
      fencing_token = v_new_fencing_token,
      updated_at_ms = v_now_ms,
      updated_at = clock_timestamp()
  WHERE id = p_shard_id;

  INSERT INTO public.galx_shard_leases (
    id, shard_id, user_id, job_id, fencing_token, estimated_tokens,
    acquired_at_ms, expires_at_ms
  ) VALUES (
    v_lease_id, p_shard_id, p_user_id, p_job_id, v_new_fencing_token,
    p_estimated_tokens, v_now_ms, v_expires_at_ms
  );

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'lease_id', v_lease_id,
    'shard_id', p_shard_id,
    'fencing_token', v_new_fencing_token,
    'expires_at_ms', v_expires_at_ms,
    'estimated_tokens', p_estimated_tokens
  );
END;
$$;

-- 4. RENEW: HEARTBEAT A LIVE LEASE USING ITS FENCING TOKEN
CREATE OR REPLACE FUNCTION public.fn_extend_shard_lease(
  p_lease_id VARCHAR(64),
  p_fencing_token BIGINT,
  p_extension_ms BIGINT DEFAULT 120000,
  p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_shard_id VARCHAR(64);
  v_lease public.galx_shard_leases%ROWTYPE;
  v_now_ms BIGINT;
  v_expires_at_ms BIGINT;
BEGIN
  v_now_ms := COALESCE(p_now_ms, (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT);
  IF p_extension_ms < 5000 OR p_extension_ms > 600000 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'INVALID_LEASE_EXTENSION');
  END IF;

  SELECT shard_id INTO v_shard_id
  FROM public.galx_shard_leases
  WHERE id = p_lease_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'LEASE_NOT_FOUND');
  END IF;

  PERFORM 1 FROM public.galx_shard_accounts WHERE id = v_shard_id FOR UPDATE;
  SELECT * INTO v_lease
  FROM public.galx_shard_leases
  WHERE id = p_lease_id
  FOR UPDATE;

  IF v_lease.is_committed OR v_lease.is_reclaimed THEN
    RETURN jsonb_build_object('success', false, 'reason', 'LEASE_INACTIVE');
  END IF;
  IF v_lease.fencing_token <> p_fencing_token THEN
    RETURN jsonb_build_object('success', false, 'reason', 'FENCING_TOKEN_MISMATCH');
  END IF;
  IF v_lease.expires_at_ms < v_now_ms THEN
    RETURN jsonb_build_object('success', false, 'reason', 'LEASE_EXPIRED');
  END IF;

  v_expires_at_ms := GREATEST(v_lease.expires_at_ms, v_now_ms + p_extension_ms);
  UPDATE public.galx_shard_leases
  SET expires_at_ms = v_expires_at_ms, updated_at = clock_timestamp()
  WHERE id = p_lease_id;

  RETURN jsonb_build_object(
    'success', true,
    'lease_id', p_lease_id,
    'fencing_token', p_fencing_token,
    'expires_at_ms', v_expires_at_ms
  );
END;
$$;

-- 5. RELEASE: SAME LOCK ORDER, IDEMPOTENT SETTLEMENT, COUNTER RECONCILIATION
CREATE OR REPLACE FUNCTION public.fn_release_shard_lease(
  p_lease_id VARCHAR(64),
  p_actual_tokens BIGINT DEFAULT NULL,
  p_latency_ms NUMERIC(10, 2) DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_shard_id VARCHAR(64);
  v_lease public.galx_shard_leases%ROWTYPE;
  v_shard public.galx_shard_accounts%ROWTYPE;
  v_tokens_to_deduct BIGINT;
  v_now_ms BIGINT;
  v_new_avg_latency NUMERIC(10, 2);
BEGIN
  v_now_ms := COALESCE(p_now_ms, (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT);
  IF p_actual_tokens IS NOT NULL AND (p_actual_tokens < 0 OR p_actual_tokens > 10000000) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'INVALID_ACTUAL_TOKEN_COUNT');
  END IF;
  IF p_latency_ms IS NOT NULL AND (p_latency_ms < 0 OR p_latency_ms > 3600000) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'INVALID_LATENCY');
  END IF;

  SELECT shard_id INTO v_shard_id
  FROM public.galx_shard_leases
  WHERE id = p_lease_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'LEASE_NOT_FOUND');
  END IF;

  SELECT * INTO v_shard
  FROM public.galx_shard_accounts
  WHERE id = v_shard_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_FOUND');
  END IF;

  SELECT * INTO v_lease
  FROM public.galx_shard_leases
  WHERE id = p_lease_id
  FOR UPDATE;
  IF v_lease.is_committed THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'lease_id', v_lease.id,
      'committed_tokens', v_lease.committed_tokens,
      'reason', 'LEASE_ALREADY_COMMITTED'
    );
  END IF;
  IF v_lease.is_reclaimed THEN
    RETURN jsonb_build_object('success', false, 'reason', 'LEASE_RECLAIMED');
  END IF;

  v_tokens_to_deduct := COALESCE(p_actual_tokens, v_lease.estimated_tokens);
  v_new_avg_latency := CASE
    WHEN p_latency_ms IS NULL THEN v_shard.average_latency_ms
    ELSE (0.2 * p_latency_ms) + (0.8 * v_shard.average_latency_ms)
  END;

  UPDATE public.galx_shard_accounts
  SET reserved_tokens = GREATEST(0, reserved_tokens - v_lease.estimated_tokens),
      remaining_tokens = GREATEST(0, remaining_tokens - v_tokens_to_deduct),
      remaining_requests = GREATEST(0, remaining_requests - 1),
      active_in_flight_count = GREATEST(0, active_in_flight_count - 1),
      total_tokens_consumed = total_tokens_consumed + v_tokens_to_deduct,
      total_requests_served = total_requests_served + 1,
      consecutive_failures = CASE WHEN p_success THEN 0 ELSE consecutive_failures + 1 END,
      consecutive_successes = CASE WHEN p_success THEN consecutive_successes + 1 ELSE 0 END,
      average_latency_ms = v_new_avg_latency,
      last_latency_ms = COALESCE(p_latency_ms, last_latency_ms),
      updated_at_ms = v_now_ms,
      updated_at = clock_timestamp()
  WHERE id = v_shard.id;

  UPDATE public.galx_shard_leases
  SET is_committed = true,
      committed_tokens = v_tokens_to_deduct,
      updated_at = clock_timestamp()
  WHERE id = v_lease.id;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'lease_id', p_lease_id,
    'committed_tokens', v_tokens_to_deduct,
    'remaining_tokens', GREATEST(0, v_shard.remaining_tokens - v_tokens_to_deduct)
  );
END;
$$;

-- 6. SCAVENGE: PROCESS SHARDS IN A STABLE ORDER, THEN LOCK THEIR LEASES
CREATE OR REPLACE FUNCTION public.fn_cleanup_expired_leases(p_now_ms BIGINT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now_ms BIGINT;
  v_reclaimed_count INTEGER := 0;
  v_shard RECORD;
  v_lease RECORD;
BEGIN
  v_now_ms := COALESCE(p_now_ms, (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT);

  FOR v_shard IN
    SELECT a.id
    FROM public.galx_shard_accounts a
    WHERE EXISTS (
      SELECT 1 FROM public.galx_shard_leases l
      WHERE l.shard_id = a.id
        AND l.expires_at_ms < v_now_ms
        AND l.is_committed = false
        AND l.is_reclaimed = false
    )
    ORDER BY a.id
    FOR UPDATE OF a SKIP LOCKED
  LOOP
    FOR v_lease IN
      UPDATE public.galx_shard_leases
      SET is_reclaimed = true, updated_at = clock_timestamp()
      WHERE shard_id = v_shard.id
        AND expires_at_ms < v_now_ms
        AND is_committed = false
        AND is_reclaimed = false
      RETURNING estimated_tokens
    LOOP
      UPDATE public.galx_shard_accounts
      SET reserved_tokens = GREATEST(0, reserved_tokens - v_lease.estimated_tokens),
          active_in_flight_count = GREATEST(0, active_in_flight_count - 1),
          updated_at_ms = v_now_ms,
          updated_at = clock_timestamp()
      WHERE id = v_shard.id;
      v_reclaimed_count := v_reclaimed_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_reclaimed_count;
END;
$$;

-- 7. LEAST PRIVILEGE MUST BE REPAIRED AFTER EVERY CREATE OR REPLACE
REVOKE ALL ON FUNCTION public.fn_upsert_shard_registry(JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_acquire_shard_lease(
  VARCHAR, VARCHAR, BIGINT, BIGINT, VARCHAR, BIGINT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_extend_shard_lease(VARCHAR, BIGINT, BIGINT, BIGINT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_release_shard_lease(
  VARCHAR, BIGINT, NUMERIC, BOOLEAN, BIGINT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_cleanup_expired_leases(BIGINT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_upsert_shard_registry(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_acquire_shard_lease(
  VARCHAR, VARCHAR, BIGINT, BIGINT, VARCHAR, BIGINT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_extend_shard_lease(VARCHAR, BIGINT, BIGINT, BIGINT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_release_shard_lease(
  VARCHAR, BIGINT, NUMERIC, BOOLEAN, BIGINT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_cleanup_expired_leases(BIGINT) TO service_role;

COMMENT ON FUNCTION public.fn_upsert_shard_registry(JSONB) IS
  'Service-only control-plane upsert that never overwrites lease/counter state on conflict.';
COMMENT ON FUNCTION public.fn_extend_shard_lease(VARCHAR, BIGINT, BIGINT, BIGINT) IS
  'Renews a live shard lease only when its monotonic fencing token matches.';
