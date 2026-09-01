-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: POOLS IETF BURST & CANARY WARMUP MESH
-- Migration: 20260901000059_galxai_pools_ietf_burst_and_warmup_mesh.sql
-- Description:
--   Implements:
--   1. IETF RFC RateLimit header generator directly inside PostgreSQL RPCs.
--   2. Opportunistic Bursting calculus (2.5x concurrency multiplier during off-peak utilization < 40%).
--   3. Shard Canary Warmup linear ramp curves (prevent cold-start latency spikes).
--   4. Tenant burst slice tracking with microsecond fencing.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: pool_canary_warmup_schedules (Cold-Start Jitter Prevention)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pool_canary_warmup_schedules (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('warmup_' || gen_random_uuid()::text),
  shard_id VARCHAR(64) NOT NULL REFERENCES public.galx_shard_accounts(id) ON DELETE CASCADE,
  pool_id VARCHAR(32) NOT NULL DEFAULT 'universal_global',
  initial_weight NUMERIC(4, 2) NOT NULL DEFAULT 0.10,
  target_weight NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
  ramp_duration_seconds INTEGER NOT NULL DEFAULT 300,
  started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  completed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_shard_active_warmup UNIQUE (shard_id, is_active)
);

CREATE INDEX IF NOT EXISTS idx_warmup_shard_active
  ON public.pool_canary_warmup_schedules (shard_id)
  WHERE is_active = true;

-- ------------------------------------------------------------------------------
-- 2. TABLE: pool_tenant_burst_quotas (Opportunistic Burst Multiplier State)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pool_tenant_burst_quotas (
  id VARCHAR(64) PRIMARY KEY, -- user_id || '_' || pool_id
  user_id VARCHAR(255) NOT NULL,
  pool_id VARCHAR(32) NOT NULL,
  base_concurrency INTEGER NOT NULL DEFAULT 12,
  opportunistic_max_concurrency INTEGER NOT NULL DEFAULT 30,
  current_burst_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
  is_burst_active BOOLEAN NOT NULL DEFAULT false,
  burst_started_at TIMESTAMPTZ,
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_tenant_burst_user
  ON public.pool_tenant_burst_quotas (user_id, pool_id);

-- ------------------------------------------------------------------------------
-- 3. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.pool_canary_warmup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_canary_warmup_schedules FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pool_tenant_burst_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_tenant_burst_quotas FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_warmup_schedules" ON public.pool_canary_warmup_schedules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_tenant_bursts" ON public.pool_tenant_burst_quotas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_read_own_tenant_bursts" ON public.pool_tenant_burst_quotas
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

-- ------------------------------------------------------------------------------
-- 4. ATOMIC FUNCTION: fn_calculate_canary_warmup_weight
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_calculate_canary_warmup_weight(
  p_shard_id VARCHAR(64)
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_warmup RECORD;
  v_elapsed_seconds NUMERIC;
  v_progress NUMERIC;
BEGIN
  SELECT * INTO v_warmup
  FROM public.pool_canary_warmup_schedules
  WHERE shard_id = p_shard_id AND is_active = true
  LIMIT 1;

  IF v_warmup IS NULL THEN
    RETURN 1.00;
  END IF;

  v_elapsed_seconds := EXTRACT(EPOCH FROM (v_now - v_warmup.started_at));

  IF v_elapsed_seconds >= v_warmup.ramp_duration_seconds THEN
    UPDATE public.pool_canary_warmup_schedules
    SET is_active = false, completed_at = v_now
    WHERE id = v_warmup.id;
    RETURN v_warmup.target_weight;
  END IF;

  v_progress := v_elapsed_seconds / v_warmup.ramp_duration_seconds;
  RETURN v_warmup.initial_weight + (v_progress * (v_warmup.target_weight - v_warmup.initial_weight));
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. ATOMIC STORED PROCEDURE: rpc_evaluate_pool_with_ietf_headers
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_evaluate_pool_with_ietf_headers(
  p_user_id VARCHAR(255),
  p_pool_id VARCHAR(32) DEFAULT 'qos_lumi_quota',
  p_model_id VARCHAR(64) DEFAULT 'gpt-5.6-luna',
  p_is_priority_user BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_cluster RECORD;
  v_utilization_pct NUMERIC(5, 2) := 0.00;
  v_burst_multiplier NUMERIC(4, 2) := 1.00;
  v_effective_burst_limit INTEGER := 12;
  v_base_quota INTEGER := 2050;
  v_rolling RECORD;
  v_ietf_limit VARCHAR(64);
  v_ietf_remaining INTEGER;
  v_ietf_reset_seconds INTEGER;
  v_lease_result JSONB;
BEGIN
  -- 1. Inspect cluster utilization
  SELECT * INTO v_cluster
  FROM public.lumi_cluster_pool_metrics
  WHERE id = 'global_lumi_cluster';

  IF v_cluster IS NOT NULL AND v_cluster.max_concurrency_capacity > 0 THEN
    v_utilization_pct := (v_cluster.active_streams_count::NUMERIC / v_cluster.max_concurrency_capacity) * 100.0;
  END IF;

  -- 2. Opportunistic Bursting Calculus: If cluster utilization < 40%, grant up to 2.5x concurrency multiplier
  IF v_utilization_pct < 40.00 THEN
    v_burst_multiplier := 2.50;
    v_effective_burst_limit := 30;
  ELSIF v_utilization_pct < 70.00 THEN
    v_burst_multiplier := 1.50;
    v_effective_burst_limit := 18;
  ELSE
    v_burst_multiplier := 1.00;
    v_effective_burst_limit := 12;
  END IF;

  -- 3. Acquire lease through V2 engine
  v_lease_result := public.rpc_acquire_lumi_stream_lease_v2(
    p_user_id,
    p_model_id,
    NULL,
    NULL,
    v_effective_burst_limit,
    v_base_quota,
    120
  );

  -- 4. Calculate IETF Standard RateLimit Headers
  SELECT * INTO v_rolling
  FROM public.lumi_user_rolling_quotas
  WHERE user_id = p_user_id;

  v_ietf_remaining := COALESCE(v_rolling.fractional_credits_available::INTEGER, v_base_quota);
  v_ietf_reset_seconds := GREATEST(1, CEIL(18000 - EXTRACT(EPOCH FROM (v_now - COALESCE(v_rolling.window_start_at, v_now)))));
  v_ietf_limit := format('"%s", %s;w=18000;burst=%s', p_model_id, v_base_quota, v_effective_burst_limit);

  RETURN jsonb_build_object(
    'admission', v_lease_result,
    'cluster_utilization_pct', v_utilization_pct,
    'opportunistic_burst_multiplier', v_burst_multiplier,
    'effective_concurrency_limit', v_effective_burst_limit,
    'ietf_headers', jsonb_build_object(
      'RateLimit-Limit', v_ietf_limit,
      'RateLimit-Remaining', v_ietf_remaining,
      'RateLimit-Reset', v_ietf_reset_seconds,
      'RateLimit-Policy', format('2050;w=18000;burst=%s;comment="GALXAI LUMI QoS"', v_effective_burst_limit)
    )
  );
END;
$$;
