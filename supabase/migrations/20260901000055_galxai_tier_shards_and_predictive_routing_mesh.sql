-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: TIER SHARDING & PREDICTIVE ROUTING MESH
-- Migration: 20260901000055_galxai_tier_shards_and_predictive_routing_mesh.sql
-- Description:
--   Extends galx_shard_accounts with tier pool isolation (Sovereign VPC, Fleet, Growth, LUMI, Community),
--   hydraulic headroom scoring, EWMA latency tracking, circuit breaker state, and atomic 2-phase shard leases.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTEND TABLE: galx_shard_accounts with Tier Pool & Hydraulic Telemetry
-- ------------------------------------------------------------------------------
ALTER TABLE public.galx_shard_accounts
  ADD COLUMN IF NOT EXISTS tier_pool VARCHAR(32) NOT NULL DEFAULT 'universal_global',
  ADD COLUMN IF NOT EXISTS max_concurrency_ceiling INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS active_in_flight_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ewma_latency_p95_ms NUMERIC(10, 2) NOT NULL DEFAULT 250.00,
  ADD COLUMN IF NOT EXISTS hydraulic_headroom_score NUMERIC(6, 4) NOT NULL DEFAULT 1.0000,
  ADD COLUMN IF NOT EXISTS circuit_state VARCHAR(32) NOT NULL DEFAULT 'closed';

-- Partial index for active healthy shards filtered by tier pool
CREATE INDEX IF NOT EXISTS idx_galx_shards_tier_pool_healthy
  ON public.galx_shard_accounts (tier_pool, provider, status)
  WHERE status = 'healthy' AND permission_retracted = false;

-- ------------------------------------------------------------------------------
-- 2. TABLE: galx_shard_concurrency_leases (2-Phase Shard Token Reservation Leases)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_shard_concurrency_leases (
  id VARCHAR(64) PRIMARY KEY,
  shard_id VARCHAR(64) NOT NULL REFERENCES public.galx_shard_accounts(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  tier_pool VARCHAR(32) NOT NULL DEFAULT 'universal_global',
  estimated_tokens BIGINT NOT NULL DEFAULT 1000,
  actual_tokens BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'committed', 'released', 'expired', 'evicted')),
  fencing_token BIGINT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Partial index for instantaneous in-flight counting per shard
CREATE INDEX IF NOT EXISTS idx_shard_leases_active_shard
  ON public.galx_shard_concurrency_leases (shard_id)
  WHERE status = 'active';

-- Partial index for instantaneous tenant in-flight checking
CREATE INDEX IF NOT EXISTS idx_shard_leases_active_user
  ON public.galx_shard_concurrency_leases (user_id)
  WHERE status = 'active';

-- Partial index for TTL lease vacuuming
CREATE INDEX IF NOT EXISTS idx_shard_leases_expires_at
  ON public.galx_shard_concurrency_leases (expires_at)
  WHERE status = 'active';

-- ------------------------------------------------------------------------------
-- 3. TABLE: galx_shard_health_telemetry_ledger (Predictive EWMA Performance Telemetry)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_shard_health_telemetry_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shard_id VARCHAR(64) NOT NULL REFERENCES public.galx_shard_accounts(id) ON DELETE CASCADE,
  tier_pool VARCHAR(32) NOT NULL DEFAULT 'universal_global',
  measured_latency_ms NUMERIC(10, 2) NOT NULL,
  ttft_ms NUMERIC(10, 2),
  tokens_per_second NUMERIC(10, 2),
  success BOOLEAN NOT NULL DEFAULT true,
  error_code VARCHAR(64),
  fencing_token BIGINT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_shard_telemetry_shard_time
  ON public.galx_shard_health_telemetry_ledger (shard_id, measured_at DESC);

-- ------------------------------------------------------------------------------
-- 4. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.galx_shard_concurrency_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_shard_concurrency_leases FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_shard_health_telemetry_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_shard_health_telemetry_ledger FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_shard_leases" ON public.galx_shard_concurrency_leases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_shard_telemetry" ON public.galx_shard_health_telemetry_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_read_own_shard_leases" ON public.galx_shard_concurrency_leases
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

-- ------------------------------------------------------------------------------
-- 5. ATOMIC STORED PROCEDURE: rpc_acquire_tier_shard_lease
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_acquire_tier_shard_lease(
  p_user_id VARCHAR(255),
  p_tier_pool VARCHAR(32) DEFAULT 'universal_global',
  p_provider VARCHAR(32) DEFAULT 'openai',
  p_estimated_tokens BIGINT DEFAULT 1000,
  p_ttl_seconds INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_shard RECORD;
  v_lease_id VARCHAR(64);
  v_fencing_token BIGINT;
BEGIN
  -- 1. Scavenge expired leases for accurate headroom
  UPDATE public.galx_shard_concurrency_leases
  SET status = 'expired', updated_at = v_now
  WHERE status = 'active' AND expires_at < v_now;

  -- 2. Select optimal candidate shard with hydraulic headroom weighting
  SELECT * INTO v_shard
  FROM public.galx_shard_accounts
  WHERE (tier_pool = p_tier_pool OR tier_pool = 'universal_global')
    AND provider::text = p_provider
    AND status = 'healthy'
    AND permission_retracted = false
    AND active_in_flight_count < max_concurrency_ceiling
    AND remaining_tokens >= p_estimated_tokens
  ORDER BY 
    CASE WHEN tier_pool = p_tier_pool THEN 0 ELSE 1 END ASC,
    priority DESC,
    hydraulic_headroom_score DESC,
    average_latency_ms ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_shard IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'rejection_code', 'ALL_TIER_SHARDS_SATURATED',
      'rejection_message', format('All compute shards for pool %s and provider %s are saturated or in cooldown.', p_tier_pool, p_provider),
      'tier_pool', p_tier_pool
    );
  END IF;

  -- 3. Atomic Token Soft-Reservation & Fencing Token Advance
  v_fencing_token := v_shard.fencing_token + 1;
  v_lease_id := 'lease_' || v_now_ms || '_' || substr(md5(random()::text), 1, 8);

  UPDATE public.galx_shard_accounts
  SET remaining_tokens = GREATEST(0, remaining_tokens - p_estimated_tokens),
      reserved_tokens = reserved_tokens + p_estimated_tokens,
      active_in_flight_count = active_in_flight_count + 1,
      fencing_token = v_fencing_token,
      hydraulic_headroom_score = GREATEST(0.0500, (remaining_tokens::NUMERIC / GREATEST(1, max_tokens))),
      updated_at = v_now,
      updated_at_ms = v_now_ms
  WHERE id = v_shard.id;

  -- 4. Record Active Concurrency Lease
  INSERT INTO public.galx_shard_concurrency_leases (
    id, shard_id, user_id, tier_pool, estimated_tokens, status, fencing_token, acquired_at, expires_at, created_at, updated_at
  ) VALUES (
    v_lease_id, v_shard.id, p_user_id, p_tier_pool, p_estimated_tokens, 'active', v_fencing_token,
    v_now, v_now + (p_ttl_seconds || ' seconds')::interval, v_now, v_now
  );

  RETURN jsonb_build_object(
    'allowed', true,
    'lease_id', v_lease_id,
    'shard_id', v_shard.id,
    'tier_pool', v_shard.tier_pool,
    'fencing_token', v_fencing_token,
    'expires_at', v_now + (p_ttl_seconds || ' seconds')::interval
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. ATOMIC STORED PROCEDURE: rpc_settle_and_release_shard_lease
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_settle_and_release_shard_lease(
  p_lease_id VARCHAR(64),
  p_actual_tokens BIGINT DEFAULT 0,
  p_latency_ms NUMERIC DEFAULT 250.00,
  p_success BOOLEAN DEFAULT true,
  p_error_code VARCHAR(64) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_lease RECORD;
  v_shard RECORD;
  v_new_avg_latency NUMERIC;
BEGIN
  -- 1. Find and close active lease
  SELECT * INTO v_lease
  FROM public.galx_shard_concurrency_leases
  WHERE id = p_lease_id AND status = 'active'
  FOR UPDATE;

  IF v_lease IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Lease not active or already finalized');
  END IF;

  UPDATE public.galx_shard_concurrency_leases
  SET status = 'committed',
      actual_tokens = p_actual_tokens,
      released_at = v_now,
      updated_at = v_now
  WHERE id = p_lease_id;

  -- 2. Update Shard Token Reservoir & EWMA Latency Telemetry
  SELECT * INTO v_shard
  FROM public.galx_shard_accounts
  WHERE id = v_lease.shard_id
  FOR UPDATE;

  IF v_shard IS NOT NULL THEN
    -- Exponentially Weighted Moving Average (EWMA) Latency (alpha = 0.15)
    v_new_avg_latency := (v_shard.average_latency_ms * 0.85) + (p_latency_ms * 0.15);

    UPDATE public.galx_shard_accounts
    SET reserved_tokens = GREATEST(0, reserved_tokens - v_lease.estimated_tokens),
        total_tokens_consumed = total_tokens_consumed + p_actual_tokens,
        total_requests_served = total_requests_served + 1,
        active_in_flight_count = GREATEST(0, active_in_flight_count - 1),
        average_latency_ms = v_new_avg_latency,
        last_latency_ms = p_latency_ms,
        consecutive_successes = CASE WHEN p_success THEN consecutive_successes + 1 ELSE 0 END,
        consecutive_failures = CASE WHEN NOT p_success THEN consecutive_failures + 1 ELSE 0 END,
        status = CASE WHEN (NOT p_success AND consecutive_failures >= 4) THEN 'degraded'::galx_credential_status ELSE status END,
        updated_at = v_now,
        updated_at_ms = v_now_ms
    WHERE id = v_shard.id;

    -- 3. Log into Shard Telemetry Ledger
    INSERT INTO public.galx_shard_health_telemetry_ledger (
      shard_id, tier_pool, measured_latency_ms, success, error_code, fencing_token, measured_at
    ) VALUES (
      v_shard.id, v_shard.tier_pool, p_latency_ms, p_success, p_error_code, v_shard.fencing_token, v_now
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'lease_id', p_lease_id,
    'shard_id', v_lease.shard_id,
    'actual_tokens', p_actual_tokens,
    'latency_ms', p_latency_ms
  );
END;
$$;
