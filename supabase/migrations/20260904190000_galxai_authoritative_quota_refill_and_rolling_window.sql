-- ============================================================================
-- GALXAI Migration: authoritative quota refill and rolling-window admission
-- Purpose: Move refill math and provider rolling-window enforcement into the
--          same PostgreSQL critical section that grants work ownership.
-- Risk: HIGH (cross-worker admission and provider quota protection).
-- ============================================================================

-- Preserve fractional refill credit so frequent acquisitions cannot discard it.
ALTER TABLE public.galx_shard_accounts
  ADD COLUMN IF NOT EXISTS token_refill_remainder NUMERIC(20, 9) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS request_refill_remainder NUMERIC(20, 9) NOT NULL DEFAULT 0;

ALTER TABLE public.galx_shard_accounts
  DROP CONSTRAINT IF EXISTS galx_shards_refill_remainders_valid;
ALTER TABLE public.galx_shard_accounts
  ADD CONSTRAINT galx_shards_refill_remainders_valid CHECK (
    token_refill_remainder >= 0 AND token_refill_remainder < 1
    AND request_refill_remainder >= 0 AND request_refill_remainder < 1
  );

CREATE INDEX IF NOT EXISTS idx_galx_shard_leases_rolling_window
  ON public.galx_shard_leases (shard_id, acquired_at_ms DESC)
  WHERE is_reclaimed = false;

-- Repair derived counters from the lease ledger before enforcing them.
WITH live AS (
  SELECT
    shard_id,
    COUNT(*)::INTEGER AS active_count,
    COALESCE(SUM(estimated_tokens), 0)::BIGINT AS reserved_count
  FROM public.galx_shard_leases
  WHERE is_committed = false
    AND is_reclaimed = false
    AND expires_at_ms >= (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT
  GROUP BY shard_id
)
UPDATE public.galx_shard_accounts a
SET active_in_flight_count = COALESCE(live.active_count, 0),
    reserved_tokens = COALESCE(live.reserved_count, 0),
    updated_at = clock_timestamp()
FROM (SELECT a2.id FROM public.galx_shard_accounts a2) all_shards
LEFT JOIN live ON live.shard_id = all_shards.id
WHERE a.id = all_shards.id;

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
    'estimated_tokens', p_estimated_tokens,
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

COMMENT ON INDEX public.idx_galx_shard_leases_rolling_window IS
  'Supports authoritative rolling-window admission from durable lease history.';
