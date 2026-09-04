-- ============================================================================
-- GALXAI Migration: authoritative shard leases
-- Purpose: Force least privilege on work-ownership leases and make lease RPCs
--          bounded, fenced, and idempotent under network retries.
-- Risk: HIGH (cross-worker work ownership and quota reservations).
-- ============================================================================

-- 1. LEASE TABLE IS A BACKEND-ONLY AUTHORITY TABLE
ALTER TABLE public.galx_shard_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_shard_leases FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.galx_shard_leases FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.galx_shard_leases TO service_role;

DROP POLICY IF EXISTS "service_role_all_galx_shard_leases"
  ON public.galx_shard_leases;
DROP POLICY IF EXISTS service_role_all_galx_shard_leases
  ON public.galx_shard_leases;
CREATE POLICY service_role_all_galx_shard_leases
  ON public.galx_shard_leases FOR ALL TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE public.galx_shard_leases
  DROP CONSTRAINT IF EXISTS galx_shard_leases_estimated_tokens_positive,
  DROP CONSTRAINT IF EXISTS galx_shard_leases_expiry_after_acquisition;
ALTER TABLE public.galx_shard_leases
  ADD CONSTRAINT galx_shard_leases_estimated_tokens_positive
    CHECK (estimated_tokens > 0),
  ADD CONSTRAINT galx_shard_leases_expiry_after_acquisition
    CHECK (expires_at_ms > acquired_at_ms);

CREATE UNIQUE INDEX IF NOT EXISTS idx_galx_shard_leases_attempt_idempotency
  ON public.galx_shard_leases (shard_id, user_id, job_id)
  WHERE job_id IS NOT NULL AND is_reclaimed = false;

-- 2. ACQUISITION IS IDEMPOTENT PER (SHARD, USER, ATTEMPT/JOB)
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

  SELECT * INTO v_shard
  FROM public.galx_shard_accounts
  WHERE id = p_shard_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_FOUND');
  END IF;

  IF p_job_id IS NOT NULL THEN
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
      ELSE
        UPDATE public.galx_shard_leases
        SET is_reclaimed = true, updated_at = clock_timestamp()
        WHERE id = v_existing.id;
        UPDATE public.galx_shard_accounts
        SET reserved_tokens = GREATEST(0, reserved_tokens - v_existing.estimated_tokens),
            updated_at_ms = v_now_ms,
            updated_at = clock_timestamp()
        WHERE id = p_shard_id;
      END IF;
    END IF;
  END IF;

  IF v_shard.status <> 'healthy' THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'SHARD_NOT_HEALTHY',
      'status', v_shard.status
    );
  END IF;
  IF v_shard.permission_retracted THEN
    RETURN jsonb_build_object('success', false, 'reason', 'PERMISSION_RETRACTED');
  END IF;

  v_expires_at_ms := v_now_ms + p_lease_ttl_ms;
  v_new_fencing_token := v_shard.fencing_token + 1;
  v_lease_id := 'lease_' || replace(gen_random_uuid()::text, '-', '');

  UPDATE public.galx_shard_accounts
  SET reserved_tokens = reserved_tokens + p_estimated_tokens,
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

-- 3. RELEASE IS IDEMPOTENT AFTER AN AMBIGUOUS NETWORK RESPONSE
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
  v_lease public.galx_shard_leases%ROWTYPE;
  v_shard public.galx_shard_accounts%ROWTYPE;
  v_tokens_to_deduct BIGINT;
  v_now_ms BIGINT;
  v_new_avg_latency NUMERIC(10, 2);
BEGIN
  v_now_ms := COALESCE(p_now_ms, (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT);

  SELECT * INTO v_lease
  FROM public.galx_shard_leases
  WHERE id = p_lease_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'LEASE_NOT_FOUND');
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
  IF p_actual_tokens IS NOT NULL AND (p_actual_tokens < 0 OR p_actual_tokens > 10000000) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'INVALID_ACTUAL_TOKEN_COUNT');
  END IF;

  SELECT * INTO v_shard
  FROM public.galx_shard_accounts
  WHERE id = v_lease.shard_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_FOUND');
  END IF;

  v_tokens_to_deduct := COALESCE(p_actual_tokens, v_lease.estimated_tokens);
  v_new_avg_latency := CASE
    WHEN p_latency_ms IS NULL THEN v_shard.average_latency_ms
    ELSE (0.2 * p_latency_ms) + (0.8 * v_shard.average_latency_ms)
  END;

  UPDATE public.galx_shard_accounts
  SET reserved_tokens = GREATEST(0, reserved_tokens - v_lease.estimated_tokens),
      remaining_tokens = GREATEST(0, remaining_tokens - v_tokens_to_deduct),
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

-- Creating/replacing functions must be followed by explicit privilege repair.
REVOKE ALL ON FUNCTION public.fn_acquire_shard_lease(
  VARCHAR, VARCHAR, BIGINT, BIGINT, VARCHAR, BIGINT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_release_shard_lease(
  VARCHAR, BIGINT, NUMERIC, BOOLEAN, BIGINT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_acquire_shard_lease(
  VARCHAR, VARCHAR, BIGINT, BIGINT, VARCHAR, BIGINT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_release_shard_lease(
  VARCHAR, BIGINT, NUMERIC, BOOLEAN, BIGINT
) TO service_role;

COMMENT ON TABLE public.galx_shard_leases IS
  'Backend-only authoritative shard work leases with monotonic fencing and idempotent retry keys.';
