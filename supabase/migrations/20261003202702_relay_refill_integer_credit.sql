-- Exact operational refill only. No change to grants, prices, health or outcomes.
-- Two nullable internal numerators lazily preserve existing stored fractions.
-- New/legacy rows initialize once under the existing account lock; no backfill.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';
ALTER TABLE public.galx_shard_accounts
  ADD COLUMN IF NOT EXISTS token_refill_numerator BIGINT,
  ADD COLUMN IF NOT EXISTS request_refill_numerator BIGINT;
ALTER TABLE public.galx_shard_accounts
  DROP CONSTRAINT IF EXISTS galx_shards_refill_numerators_valid;
ALTER TABLE public.galx_shard_accounts
  ADD CONSTRAINT galx_shards_refill_numerators_valid CHECK (
    (token_refill_numerator IS NULL OR token_refill_numerator BETWEEN 0 AND 2999999999)
    AND (request_refill_numerator IS NULL OR request_refill_numerator BETWEEN 0 AND 2999999999)
  );
COMMENT ON COLUMN public.galx_shard_accounts.token_refill_numerator IS
  'Private exact fractional token credit numerator, denominator 3000000000. NULL initializes from the retained legacy fraction once under the admission lock.';
COMMENT ON COLUMN public.galx_shard_accounts.request_refill_numerator IS
  'Private exact fractional request credit numerator, denominator 3000000000. Rates are integer units/minute and elapsed time is integer milliseconds.';

CREATE OR REPLACE FUNCTION private.relay_base_acquire(
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
  v_elapsed_ms NUMERIC;
  v_token_units NUMERIC;
  v_request_units NUMERIC;
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

  IF v_shard.managed_desktop_id IS NULL OR v_shard.desktop_enrolled_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_AVAILABLE');
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

  -- Exact credit: one token/request = 3,000,000,000 numerator units.
  -- This common denominator represents both legacy 1e-9 fractions and every
  -- integer-unit/minute rate at millisecond resolution without rounding.
  -- Only this account row lock advances the persisted timestamp and credit.
  v_elapsed_ms := CASE
    WHEN COALESCE(v_shard.last_refill_timestamp_ms, 0) <= 0 THEN 0
    ELSE GREATEST(0, v_now_ms::NUMERIC - v_shard.last_refill_timestamp_ms::NUMERIC)
  END;
  v_token_units := COALESCE(v_shard.token_refill_numerator::NUMERIC,
      v_shard.token_refill_remainder * 3000000000)
    + v_elapsed_ms * v_shard.refill_rate_per_minute::NUMERIC * 50000;
  v_request_units := COALESCE(v_shard.request_refill_numerator::NUMERIC,
      v_shard.request_refill_remainder * 3000000000)
    + v_elapsed_ms * v_shard.max_requests::NUMERIC * 50000;

  -- div/mod operate on integer-valued NUMERIC intermediates. Cap before the
  -- bounded column cast, including long idle periods and maximum BIGINT rates.
  v_shard.remaining_tokens := LEAST(v_shard.max_tokens::NUMERIC,
    v_shard.remaining_tokens::NUMERIC + div(v_token_units, 3000000000))::BIGINT;
  v_shard.remaining_requests := LEAST(v_shard.max_requests::NUMERIC,
    v_shard.remaining_requests::NUMERIC + div(v_request_units, 3000000000))::INTEGER;
  v_shard.token_refill_numerator := CASE
    WHEN v_shard.remaining_tokens >= v_shard.max_tokens THEN 0
    ELSE mod(v_token_units, 3000000000)::BIGINT END;
  v_shard.request_refill_numerator := CASE
    WHEN v_shard.remaining_requests >= v_shard.max_requests THEN 0
    ELSE mod(v_request_units, 3000000000)::BIGINT END;

  UPDATE public.galx_shard_accounts
  SET remaining_tokens = v_shard.remaining_tokens,
      remaining_requests = v_shard.remaining_requests,
      reserved_tokens = v_shard.reserved_tokens,
      active_in_flight_count = v_shard.active_in_flight_count,
      token_refill_numerator = v_shard.token_refill_numerator,
      request_refill_numerator = v_shard.request_refill_numerator,
      -- Compatibility projections only; never feed these rounded values back
      -- into an initialized exact numerator. Truncation keeps them below one.
      token_refill_remainder = trunc(v_shard.token_refill_numerator::NUMERIC / 3000000000, 9),
      request_refill_remainder = trunc(v_shard.request_refill_numerator::NUMERIC / 3000000000, 9),
      -- A backward clock cannot make the next observation count time twice.
      last_refill_timestamp_ms = GREATEST(v_shard.last_refill_timestamp_ms, v_now_ms),
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
REVOKE ALL ON FUNCTION private.relay_base_acquire(varchar,varchar,bigint,bigint,varchar,bigint)
  FROM PUBLIC,anon,authenticated,service_role,galx_relay_control,galx_desktop_writer;
