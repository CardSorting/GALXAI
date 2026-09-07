-- Provider health evidence, bounded failed-probe backoff, and admission retry hints.
-- Function signatures and grants are unchanged. NULL p_success is health-neutral.
-- Nullable snapshot avoids backfilling active leases or rewriting the table.
ALTER TABLE public.galx_shard_leases ADD COLUMN IF NOT EXISTS health_revision BIGINT;
COMMENT ON COLUMN public.galx_shard_leases.health_revision IS
  'Registry revision observed at admission; null/changed revisions cannot alter account health.';
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

REVOKE ALL ON FUNCTION public.fn_acquire_shard_lease(
  VARCHAR, VARCHAR, BIGINT, BIGINT, VARCHAR, BIGINT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_acquire_shard_lease(
  VARCHAR, VARCHAR, BIGINT, BIGINT, VARCHAR, BIGINT
) TO service_role;


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
  v_recovered BOOLEAN;
  v_health_current BOOLEAN;
  v_failed_probe BOOLEAN;
  v_probe_delay_ms BIGINT;
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
  IF p_now_ms IS NULL THEN
    v_now_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  END IF;

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

  -- A successful probe can close only the cooldown that preceded its lease.
  -- Preserve revocations and any newer provider cooldown observed in flight.
  -- NULL means the request produced no evidence about provider health (for
  -- example caller cancellation, validation, or a separate relay outage).
  v_health_current := v_lease.expires_at_ms >= v_now_ms
    AND v_lease.fencing_token = v_shard.fencing_token
    AND v_lease.health_revision IS NOT NULL
    AND v_lease.health_revision = v_shard.registry_revision
    AND NOT v_shard.permission_retracted
    AND v_shard.status NOT IN ('paused', 'revoked', 'dead');
  v_failed_probe := p_success IS FALSE AND v_health_current
    AND v_shard.status IN ('cooldown', 'exhausted')
    AND v_shard.cooldown_until_ms > 0
    AND v_shard.cooldown_until_ms <= v_lease.acquired_at_ms;
  v_probe_delay_ms := CEIL(LEAST(300000::numeric,
    15000::numeric * POWER(2::numeric, LEAST(5, GREATEST(0, v_shard.consecutive_failures))))
    * (1 + random() * 0.1))::bigint;
  v_recovered := p_success IS TRUE AND v_health_current
    AND v_shard.status IN ('cooldown', 'exhausted')
    AND v_shard.cooldown_until_ms > 0
    AND v_shard.cooldown_until_ms <= v_lease.acquired_at_ms;

  UPDATE public.galx_shard_accounts
  SET status = CASE WHEN v_recovered THEN 'healthy'::public.galx_credential_status ELSE status END,
      cooldown_until_ms = CASE WHEN v_recovered THEN NULL
        WHEN v_failed_probe THEN GREATEST(cooldown_until_ms, v_now_ms + v_probe_delay_ms)
        ELSE cooldown_until_ms END,
      reserved_tokens = GREATEST(0, reserved_tokens - v_lease.estimated_tokens),
      remaining_tokens = GREATEST(0, remaining_tokens - v_tokens_to_deduct),
      remaining_requests = GREATEST(0, remaining_requests - 1),
      active_in_flight_count = GREATEST(0, active_in_flight_count - 1),
      total_tokens_consumed = total_tokens_consumed + v_tokens_to_deduct,
      total_requests_served = total_requests_served + 1,
      consecutive_failures = CASE WHEN p_success IS NULL OR NOT v_health_current THEN consecutive_failures
        WHEN p_success THEN 0 ELSE consecutive_failures + 1 END,
      consecutive_successes = CASE WHEN p_success IS NULL OR NOT v_health_current THEN consecutive_successes
        WHEN p_success THEN consecutive_successes + 1 ELSE 0 END,
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

