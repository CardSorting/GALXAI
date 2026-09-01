-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: LUMI QOS POOL & COMMUNITY FREE POOL MESH
-- Migration: 20260901000054_galxai_lumi_and_community_qos_pools_mesh.sql
-- Description:
--   Implements high-concurrency admission control, stream lease management,
--   sliding 5-hour rolling quotas, and guaranteed 70% VIP floor protection for LUMI ($10/mo),
--   plus collective daily budget caps ($500/day) and individual $30/mo free grants.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: lumi_user_pool_leases (In-Flight Stream Concurrency Leases)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lumi_user_pool_leases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  api_key_id TEXT,
  model_id TEXT NOT NULL DEFAULT 'gpt-5.6-luna',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'expired', 'evicted')),
  worker_id TEXT,
  request_id TEXT,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (clock_timestamp() + interval '120 seconds'),
  released_at TIMESTAMPTZ,
  tokens_used BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Partial index for instantaneous in-flight stream counting per user
CREATE INDEX IF NOT EXISTS idx_lumi_leases_active_user 
  ON public.lumi_user_pool_leases (user_id) 
  WHERE status = 'active';

-- Partial index for zero-cost vacuuming of expired leases
CREATE INDEX IF NOT EXISTS idx_lumi_leases_expires_at 
  ON public.lumi_user_pool_leases (expires_at) 
  WHERE status = 'active';

-- ------------------------------------------------------------------------------
-- 2. TABLE: lumi_user_rolling_quotas (Sliding 5-Hour Dynamic Window Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lumi_user_rolling_quotas (
  id TEXT PRIMARY KEY, -- user_id
  user_id TEXT NOT NULL UNIQUE,
  tier_id TEXT NOT NULL DEFAULT 'lumi_10',
  window_start_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  requests_in_window INTEGER NOT NULL DEFAULT 0,
  tokens_in_window BIGINT NOT NULL DEFAULT 0,
  max_request_limit INTEGER NOT NULL DEFAULT 2050,
  max_burst_concurrency INTEGER NOT NULL DEFAULT 12,
  total_throttled_count INTEGER NOT NULL DEFAULT 0,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_lumi_rolling_user 
  ON public.lumi_user_rolling_quotas (user_id);

-- ------------------------------------------------------------------------------
-- 3. TABLE: lumi_cluster_pool_metrics (Global Substrate Health & Concurrency)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lumi_cluster_pool_metrics (
  id TEXT PRIMARY KEY DEFAULT 'global_lumi_cluster',
  active_streams_count INTEGER NOT NULL DEFAULT 0,
  max_concurrency_capacity INTEGER NOT NULL DEFAULT 150,
  reserved_vip_floor_pct NUMERIC(5, 2) NOT NULL DEFAULT 70.00,
  congestion_state TEXT NOT NULL DEFAULT 'nominal' CHECK (congestion_state IN ('nominal', 'elevated', 'high_congestion', 'critical')),
  is_shedding_load BOOLEAN NOT NULL DEFAULT false,
  total_served_5h BIGINT NOT NULL DEFAULT 0,
  total_throttled_5h BIGINT NOT NULL DEFAULT 0,
  window_start_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Seed global metrics singleton row
INSERT INTO public.lumi_cluster_pool_metrics (id, active_streams_count, max_concurrency_capacity, reserved_vip_floor_pct, congestion_state)
VALUES ('global_lumi_cluster', 0, 150, 70.00, 'nominal')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. TABLE: community_free_pool_daily_ledger (Daily Collective $500 Budget Cap)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_free_pool_daily_ledger (
  date_utc DATE PRIMARY KEY,
  total_spend_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
  total_requests_count BIGINT NOT NULL DEFAULT 0,
  daily_budget_cap_usd NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
  is_exhausted BOOLEAN NOT NULL DEFAULT false,
  exhausted_at TIMESTAMPTZ,
  resets_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ------------------------------------------------------------------------------
-- 5. TABLE: community_user_monthly_grants ($30 Monthly Free Compute Allowance)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_user_monthly_grants (
  id TEXT PRIMARY KEY, -- user_id || '_' || month_utc
  user_id TEXT NOT NULL,
  month_utc TEXT NOT NULL, -- YYYY-MM
  monthly_allowance_usd NUMERIC(10, 2) NOT NULL DEFAULT 30.00,
  monthly_used_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
  remaining_grant_usd NUMERIC(12, 6) NOT NULL DEFAULT 30.000000,
  total_requests_count INTEGER NOT NULL DEFAULT 0,
  is_exhausted BOOLEAN NOT NULL DEFAULT false,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_comm_grants_user_month 
  ON public.community_user_monthly_grants (user_id, month_utc);

-- ------------------------------------------------------------------------------
-- 6. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.lumi_user_pool_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumi_user_pool_leases FORCE ROW LEVEL SECURITY;

ALTER TABLE public.lumi_user_rolling_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumi_user_rolling_quotas FORCE ROW LEVEL SECURITY;

ALTER TABLE public.lumi_cluster_pool_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumi_cluster_pool_metrics FORCE ROW LEVEL SECURITY;

ALTER TABLE public.community_free_pool_daily_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_free_pool_daily_ledger FORCE ROW LEVEL SECURITY;

ALTER TABLE public.community_user_monthly_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_user_monthly_grants FORCE ROW LEVEL SECURITY;

-- Service Role Full Privileges
CREATE POLICY "service_role_all_lumi_leases" ON public.lumi_user_pool_leases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_lumi_quotas" ON public.lumi_user_rolling_quotas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_lumi_cluster" ON public.lumi_cluster_pool_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_comm_ledger" ON public.community_free_pool_daily_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_comm_grants" ON public.community_user_monthly_grants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated Users Read Own Records
CREATE POLICY "users_read_own_lumi_leases" ON public.lumi_user_pool_leases
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "users_read_own_lumi_quotas" ON public.lumi_user_rolling_quotas
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "users_read_lumi_cluster_metrics" ON public.lumi_cluster_pool_metrics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "users_read_comm_daily_ledger" ON public.community_free_pool_daily_ledger
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "users_read_own_comm_grants" ON public.community_user_monthly_grants
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

-- ------------------------------------------------------------------------------
-- 7. ATOMIC STORED PROCEDURE: rpc_acquire_lumi_stream_lease
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_acquire_lumi_stream_lease(
  p_user_id TEXT,
  p_api_key_id TEXT DEFAULT NULL,
  p_model_id TEXT DEFAULT 'gpt-5.6-luna',
  p_max_burst INTEGER DEFAULT 12,
  p_5h_quota INTEGER DEFAULT 2050,
  p_ttl_seconds INTEGER DEFAULT 120
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_active_user_streams INTEGER;
  v_rolling_record RECORD;
  v_cluster_record RECORD;
  v_lease_id TEXT;
  v_window_elapsed_seconds NUMERIC;
  v_requests_in_window INTEGER;
BEGIN
  -- 1. Vacuum stale expired leases for accurate stream counts
  UPDATE public.lumi_user_pool_leases
  SET status = 'expired', updated_at = v_now
  WHERE status = 'active' AND expires_at < v_now;

  -- 2. Inspect Cluster Congestion State
  SELECT * INTO v_cluster_record 
  FROM public.lumi_cluster_pool_metrics 
  WHERE id = 'global_lumi_cluster' 
  FOR UPDATE;

  IF v_cluster_record.is_shedding_load OR v_cluster_record.active_streams_count >= v_cluster_record.max_concurrency_capacity THEN
    UPDATE public.lumi_cluster_pool_metrics
    SET total_throttled_5h = total_throttled_5h + 1, updated_at = v_now
    WHERE id = 'global_lumi_cluster';

    RETURN jsonb_build_object(
      'allowed', false,
      'rejection_code', 'LUMI_POOL_CONGESTION_SHED',
      'rejection_message', 'LUMI compute pool is under extreme load. VIP headroom protected. Request shed gracefully.',
      'retry_after', 15,
      'pool', 'qos_lumi_quota'
    );
  END IF;

  -- 3. Check Per-User Active Concurrency
  SELECT count(*) INTO v_active_user_streams
  FROM public.lumi_user_pool_leases
  WHERE user_id = p_user_id AND status = 'active';

  IF v_active_user_streams >= p_max_burst THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'rejection_code', 'LUMI_USER_CONCURRENCY_LIMIT',
      'rejection_message', format('LUMI concurrency limit of %s simultaneous streams reached. Wait for in-flight requests to settle.', p_max_burst),
      'active_streams', v_active_user_streams,
      'retry_after', 5,
      'pool', 'qos_lumi_quota'
    );
  END IF;

  -- 4. Check & Advance Sliding 5-Hour Window
  SELECT * INTO v_rolling_record
  FROM public.lumi_user_rolling_quotas
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_rolling_record IS NULL THEN
    INSERT INTO public.lumi_user_rolling_quotas (
      id, user_id, window_start_at, requests_in_window, max_request_limit, max_burst_concurrency, last_request_at
    ) VALUES (
      p_user_id, p_user_id, v_now, 1, p_5h_quota, p_max_burst, v_now
    );
    v_requests_in_window := 1;
  ELSE
    v_window_elapsed_seconds := EXTRACT(EPOCH FROM (v_now - v_rolling_record.window_start_at));
    
    -- If 5 hours (18,000 seconds) have elapsed, reset the rolling window
    IF v_window_elapsed_seconds >= 18000 THEN
      UPDATE public.lumi_user_rolling_quotas
      SET window_start_at = v_now,
          requests_in_window = 1,
          tokens_in_window = 0,
          last_request_at = v_now,
          updated_at = v_now
      WHERE user_id = p_user_id;
      v_requests_in_window := 1;
    ELSE
      -- Check if limit exceeded in current window
      IF v_rolling_record.requests_in_window >= p_5h_quota THEN
        UPDATE public.lumi_user_rolling_quotas
        SET total_throttled_count = total_throttled_count + 1,
            last_request_at = v_now,
            updated_at = v_now
        WHERE user_id = p_user_id;

        RETURN jsonb_build_object(
          'allowed', false,
          'rejection_code', 'LUMI_5HOUR_QUOTA_EXCEEDED',
          'rejection_message', format('LUMI 5-hour rolling quota (%s requests) reached.', p_5h_quota),
          'quota_remaining', 0,
          'retry_after', CEIL(18000 - v_window_elapsed_seconds),
          'pool', 'qos_lumi_quota'
        );
      END IF;

      UPDATE public.lumi_user_rolling_quotas
      SET requests_in_window = requests_in_window + 1,
          last_request_at = v_now,
          updated_at = v_now
      WHERE user_id = p_user_id;
      v_requests_in_window := v_rolling_record.requests_in_window + 1;
    END IF;
  END IF;

  -- 5. Issue Active Concurrency Lease
  v_lease_id := gen_random_uuid()::text;
  INSERT INTO public.lumi_user_pool_leases (
    id, user_id, api_key_id, model_id, status, expires_at, created_at, updated_at
  ) VALUES (
    v_lease_id, p_user_id, p_api_key_id, p_model_id, 'active',
    v_now + (p_ttl_seconds || ' seconds')::interval,
    v_now, v_now
  );

  -- 6. Update Cluster Counter
  UPDATE public.lumi_cluster_pool_metrics
  SET active_streams_count = active_streams_count + 1,
      total_served_5h = total_served_5h + 1,
      updated_at = v_now
  WHERE id = 'global_lumi_cluster';

  RETURN jsonb_build_object(
    'allowed', true,
    'lease_id', v_lease_id,
    'active_streams', v_active_user_streams + 1,
    'quota_remaining', GREATEST(0, p_5h_quota - v_requests_in_window),
    'pool', 'qos_lumi_quota',
    'expires_at', (v_now + (p_ttl_seconds || ' seconds')::interval)
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. ATOMIC STORED PROCEDURE: rpc_release_lumi_stream_lease
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_release_lumi_stream_lease(
  p_lease_id TEXT,
  p_user_id TEXT,
  p_tokens_used BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_lease_found BOOLEAN := false;
BEGIN
  -- Mark lease released
  UPDATE public.lumi_user_pool_leases
  SET status = 'released',
      released_at = v_now,
      tokens_used = p_tokens_used,
      updated_at = v_now
  WHERE id = p_lease_id AND user_id = p_user_id AND status = 'active';

  IF FOUND THEN
    v_lease_found := true;
    -- Decrement cluster stream count
    UPDATE public.lumi_cluster_pool_metrics
    SET active_streams_count = GREATEST(0, active_streams_count - 1),
        updated_at = v_now
    WHERE id = 'global_lumi_cluster';

    -- Accumulate token usage in rolling quota ledger
    IF p_tokens_used > 0 THEN
      UPDATE public.lumi_user_rolling_quotas
      SET tokens_in_window = tokens_in_window + p_tokens_used,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'lease_id', p_lease_id,
    'released', v_lease_found
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. ATOMIC STORED PROCEDURE: rpc_evaluate_and_acquire_community_grant
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_evaluate_and_acquire_community_grant(
  p_user_id TEXT,
  p_month_utc TEXT DEFAULT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM'),
  p_date_utc DATE DEFAULT (clock_timestamp() AT TIME ZONE 'UTC')::date,
  p_cost_estimate_usd NUMERIC DEFAULT 0.005000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_next_midnight TIMESTAMPTZ := ((p_date_utc + 1)::text || ' 00:00:00+00')::timestamptz;
  v_daily_ledger RECORD;
  v_grant_record RECORD;
  v_grant_id TEXT := p_user_id || '_' || p_month_utc;
BEGIN
  -- 1. Check or initialize daily collective pool ledger
  SELECT * INTO v_daily_ledger
  FROM public.community_free_pool_daily_ledger
  WHERE date_utc = p_date_utc
  FOR UPDATE;

  IF v_daily_ledger IS NULL THEN
    INSERT INTO public.community_free_pool_daily_ledger (
      date_utc, total_spend_usd, total_requests_count, daily_budget_cap_usd, is_exhausted, resets_at
    ) VALUES (
      p_date_utc, 0.000000, 0, 500.00, false, v_next_midnight
    ) RETURNING * INTO v_daily_ledger;
  END IF;

  IF v_daily_ledger.is_exhausted OR (v_daily_ledger.total_spend_usd + p_cost_estimate_usd > v_daily_ledger.daily_budget_cap_usd) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'pool', 'shared_community',
      'rejection_code', 'FREE_COMPUTE_POOL_DAILY_LIMIT',
      'rejection_message', 'Today collective community free compute pool ($500.00) has been fully utilized. Resets at 00:00 UTC.',
      'reset_at', v_next_midnight,
      'reset_in_seconds', GREATEST(0, EXTRACT(EPOCH FROM (v_next_midnight - v_now))::INTEGER),
      'upgrade_url', 'https://galx.ai/pricing'
    );
  END IF;

  -- 2. Check or initialize user monthly $30.00 grant
  SELECT * INTO v_grant_record
  FROM public.community_user_monthly_grants
  WHERE id = v_grant_id
  FOR UPDATE;

  IF v_grant_record IS NULL THEN
    INSERT INTO public.community_user_monthly_grants (
      id, user_id, month_utc, monthly_allowance_usd, monthly_used_usd, remaining_grant_usd, total_requests_count, is_exhausted, last_active_at
    ) VALUES (
      v_grant_id, p_user_id, p_month_utc, 30.00, 0.000000, 30.000000, 1, false, v_now
    ) RETURNING * INTO v_grant_record;
  ELSE
    IF v_grant_record.remaining_grant_usd <= 0 OR v_grant_record.is_exhausted THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'pool', 'shared_community',
        'rejection_code', 'MONTHLY_FREE_GRANT_EXHAUSTED',
        'rejection_message', 'Your $30.00 monthly free compute grant has been utilized. Top up compute for uninterrupted access.',
        'user_remaining_usd', 0.00,
        'upgrade_url', 'https://galx.ai/pricing'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'pool', 'shared_community',
    'user_remaining_usd', v_grant_record.remaining_grant_usd,
    'daily_pool_remaining_usd', (v_daily_ledger.daily_budget_cap_usd - v_daily_ledger.total_spend_usd)
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. ATOMIC STORED PROCEDURE: rpc_settle_community_grant_draw
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_settle_community_grant_draw(
  p_user_id TEXT,
  p_cost_usd NUMERIC,
  p_month_utc TEXT DEFAULT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM'),
  p_date_utc DATE DEFAULT (clock_timestamp() AT TIME ZONE 'UTC')::date
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_grant_id TEXT := p_user_id || '_' || p_month_utc;
BEGIN
  -- Settle User Grant
  UPDATE public.community_user_monthly_grants
  SET monthly_used_usd = monthly_used_usd + p_cost_usd,
      remaining_grant_usd = GREATEST(0.000000, remaining_grant_usd - p_cost_usd),
      total_requests_count = total_requests_count + 1,
      is_exhausted = (remaining_grant_usd - p_cost_usd <= 0),
      last_active_at = v_now,
      updated_at = v_now
  WHERE id = v_grant_id;

  -- Settle Daily Collective Pool
  UPDATE public.community_free_pool_daily_ledger
  SET total_spend_usd = total_spend_usd + p_cost_usd,
      total_requests_count = total_requests_count + 1,
      is_exhausted = (total_spend_usd + p_cost_usd >= daily_budget_cap_usd),
      exhausted_at = CASE WHEN (total_spend_usd + p_cost_usd >= daily_budget_cap_usd) THEN v_now ELSE exhausted_at END,
      updated_at = v_now
  WHERE date_utc = p_date_utc;

  RETURN jsonb_build_object(
    'settled', true,
    'cost_usd', p_cost_usd
  );
END;
$$;
