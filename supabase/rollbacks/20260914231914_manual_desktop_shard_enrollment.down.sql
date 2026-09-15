-- Restores the prior software contract. Does not delete shard credentials/history.
-- Roll back matching application/controller code together. Review the reopening of ingestion.
SET LOCAL lock_timeout = '5s';
DROP TRIGGER IF EXISTS trg_guard_desktop_shard_authority ON public.galx_shard_accounts;
DROP FUNCTION IF EXISTS private.guard_desktop_shard_authority();
DROP FUNCTION IF EXISTS private.enroll_desktop_shard(uuid,jsonb,jsonb);
DROP FUNCTION IF EXISTS private.refresh_desktop_shard(uuid,text,jsonb,jsonb);
DROP POLICY IF EXISTS desktop_writer_shards ON public.galx_shard_accounts;
DROP POLICY IF EXISTS desktop_writer_events ON public.galx_shard_registry_events;
REVOKE ALL ON public.galx_shard_accounts,public.galx_shard_registry_events FROM galx_desktop_writer;
REVOKE ALL ON SEQUENCE public.galx_shard_registry_events_journal_offset_seq FROM galx_desktop_writer;
REVOKE ALL ON SCHEMA public,private FROM galx_desktop_writer;
REVOKE galx_desktop_writer FROM postgres;
DROP ROLE IF EXISTS galx_desktop_writer;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.galx_shard_accounts TO service_role;
-- Preserve enrollment columns as historical evidence; the old release ignores them.
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
GRANT EXECUTE ON FUNCTION public.fn_upsert_shard_registry(jsonb) TO service_role;
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
  v_elapsed_ms BIGINT;
  v_token_credit NUMERIC;
  v_request_credit NUMERIC;
  v_tokens_to_add BIGINT;
  v_requests_to_add BIGINT;
  v_window_duration_ms BIGINT;
  v_window_cap INTEGER;
  v_window_used INTEGER;
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

  SELECT * INTO v_shard
  FROM public.galx_shard_accounts
  WHERE id = p_shard_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_FOUND');
  END IF;

  IF p_now_ms IS NULL THEN
    v_now_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
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
        'estimated_tokens', v_existing.estimated_tokens,
        'health_revision', v_existing.health_revision,
        'remaining_tokens', v_shard.remaining_tokens,
        'reserved_tokens', v_shard.reserved_tokens,
        'remaining_requests', v_shard.remaining_requests,
        'active_in_flight_count', v_shard.active_in_flight_count
      );
    END IF;
  END IF;

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

  -- Continuous refill with fractional carry, evaluated under the shard lock.
  v_elapsed_ms := CASE
    WHEN COALESCE(v_shard.last_refill_timestamp_ms, 0) <= 0 THEN 0
    ELSE GREATEST(0, v_now_ms - v_shard.last_refill_timestamp_ms)
  END;
  v_token_credit := v_shard.token_refill_remainder
    + (v_elapsed_ms::NUMERIC * v_shard.refill_rate_per_minute::NUMERIC / 60000);
  v_request_credit := v_shard.request_refill_remainder
    + (v_elapsed_ms::NUMERIC * v_shard.max_requests::NUMERIC / 60000);
  v_tokens_to_add := FLOOR(v_token_credit)::BIGINT;
  v_requests_to_add := FLOOR(v_request_credit)::BIGINT;

  v_shard.remaining_tokens := LEAST(v_shard.max_tokens, v_shard.remaining_tokens + v_tokens_to_add);
  v_shard.remaining_requests := LEAST(v_shard.max_requests, v_shard.remaining_requests + v_requests_to_add);
  v_shard.token_refill_remainder := CASE
    WHEN v_shard.remaining_tokens >= v_shard.max_tokens THEN 0
    ELSE v_token_credit - FLOOR(v_token_credit)
  END;
  v_shard.request_refill_remainder := CASE
    WHEN v_shard.remaining_requests >= v_shard.max_requests THEN 0
    ELSE v_request_credit - FLOOR(v_request_credit)
  END;

  UPDATE public.galx_shard_accounts
  SET remaining_tokens = v_shard.remaining_tokens,
      remaining_requests = v_shard.remaining_requests,
      reserved_tokens = v_shard.reserved_tokens,
      active_in_flight_count = v_shard.active_in_flight_count,
      token_refill_remainder = v_shard.token_refill_remainder,
      request_refill_remainder = v_shard.request_refill_remainder,
      last_refill_timestamp_ms = v_now_ms,
      updated_at_ms = v_now_ms,
      updated_at = clock_timestamp()
  WHERE id = p_shard_id;

  -- Recovery is admitted under the account row lock, so multiple gateway
  -- processes cannot each start a half-open probe. Untimed cooldowns stay closed.
  IF v_shard.status NOT IN ('healthy', 'cooldown', 'exhausted') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_HEALTHY', 'status', v_shard.status);
  END IF;
  IF v_shard.permission_retracted THEN
    RETURN jsonb_build_object('success', false, 'reason', 'PERMISSION_RETRACTED');
  END IF;
  IF v_shard.cooldown_until_ms IS NOT NULL AND v_shard.cooldown_until_ms > v_now_ms THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_COOLDOWN', 'retry_at_ms', v_shard.cooldown_until_ms);
  END IF;
  IF v_shard.credential_expires_at_ms IS NOT NULL AND v_shard.credential_expires_at_ms <= v_now_ms THEN
    RETURN jsonb_build_object('success', false, 'reason', 'CREDENTIAL_EXPIRED');
  END IF;
  IF v_shard.status IN ('cooldown', 'exhausted')
     AND (v_shard.cooldown_until_ms IS NULL OR v_shard.cooldown_until_ms <= 0) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_HEALTHY', 'status', v_shard.status);
  END IF;
  IF v_shard.status IN ('cooldown', 'exhausted')
     AND v_shard.active_in_flight_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_CONCURRENCY_EXHAUSTED',
      'retry_at_ms', (SELECT MIN(expires_at_ms) FROM public.galx_shard_leases
        WHERE shard_id = p_shard_id AND NOT is_committed AND NOT is_reclaimed));
  END IF;
  IF v_shard.active_in_flight_count >= v_shard.max_concurrency_ceiling THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_CONCURRENCY_EXHAUSTED',
      'retry_at_ms', (SELECT MIN(expires_at_ms) FROM public.galx_shard_leases
        WHERE shard_id = p_shard_id AND NOT is_committed AND NOT is_reclaimed));
  END IF;
  IF (v_shard.remaining_requests - v_shard.active_in_flight_count) < 1 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_REQUEST_QUOTA_EXHAUSTED');
  END IF;
  IF (v_shard.remaining_tokens - v_shard.reserved_tokens) < p_estimated_tokens THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_TOKEN_QUOTA_EXHAUSTED');
  END IF;

  v_window_duration_ms := CASE
    WHEN jsonb_typeof(v_shard.sliding_window_quota) = 'object'
      THEN NULLIF(v_shard.sliding_window_quota->>'windowDurationMs', '')::BIGINT
    ELSE NULL
  END;
  v_window_cap := CASE
    WHEN jsonb_typeof(v_shard.sliding_window_quota) = 'object'
      THEN COALESCE(
        NULLIF(v_shard.sliding_window_quota->>'dynamicDiscoveredCap', '')::INTEGER,
        NULLIF(v_shard.sliding_window_quota->>'maxRequestsPerWindow', '')::INTEGER
      )
    ELSE NULL
  END;
  IF v_window_duration_ms IS NOT NULL AND v_window_duration_ms > 0
     AND v_window_cap IS NOT NULL AND v_window_cap > 0 THEN
    SELECT COUNT(*)::INTEGER INTO v_window_used
    FROM public.galx_shard_leases
    WHERE shard_id = p_shard_id
      AND acquired_at_ms > v_now_ms - v_window_duration_ms
      AND is_reclaimed = false;
    IF v_window_used >= v_window_cap THEN
      RETURN jsonb_build_object(
        'success', false,
        'reason', 'SHARD_SLIDING_WINDOW_EXHAUSTED',
        'window_used', v_window_used,
        'window_cap', v_window_cap
      );
    END IF;
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
    acquired_at_ms, expires_at_ms, health_revision
  ) VALUES (
    v_lease_id, p_shard_id, p_user_id, p_job_id, v_new_fencing_token,
    p_estimated_tokens, v_now_ms, v_expires_at_ms, v_shard.registry_revision
  );

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'lease_id', v_lease_id,
    'shard_id', p_shard_id,
    'fencing_token', v_new_fencing_token,
    'expires_at_ms', v_expires_at_ms,
    'estimated_tokens', p_estimated_tokens,
    'health_revision', v_shard.registry_revision,
    'remaining_tokens', v_shard.remaining_tokens,
    'reserved_tokens', v_shard.reserved_tokens + p_estimated_tokens,
    'remaining_requests', v_shard.remaining_requests,
    'active_in_flight_count', v_shard.active_in_flight_count + 1
  );
END;
$$;
