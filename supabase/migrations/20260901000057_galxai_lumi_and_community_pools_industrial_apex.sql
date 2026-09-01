-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: LUMI & COMMUNITY POOLS INDUSTRIAL APEX
-- Migration: 20260901000057_galxai_lumi_and_community_pools_industrial_apex.sql
-- Description:
--   Industrial-grade architectural graduation for LUMI and Free Community pools:
--   1. Model Warp Multiplier weights for OpenAI models (o3, GPT-5.6 Sol/Terra/Luna).
--   2. Continuous sliding fractional credit recovery (Leaky Bucket / Continuous Headroom).
--   3. Streaming lease heartbeats for long-running reasoning sessions (o3 deep thinking).
--   4. Anti-abuse Sybil quarantine ledger & device fingerprint verification for free grants.
--   5. Non-blocking zero-lock zombie lease sweeper (FOR UPDATE SKIP LOCKED).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: lumi_model_warp_multipliers (OpenAI Compute Weight Matrix)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lumi_model_warp_multipliers (
  model_id VARCHAR(64) PRIMARY KEY,
  model_name VARCHAR(128) NOT NULL,
  warp_weight NUMERIC(6, 3) NOT NULL DEFAULT 1.000,
  category VARCHAR(32) NOT NULL DEFAULT 'standard',
  max_reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Seed authoritative OpenAI model warp weights
INSERT INTO public.lumi_model_warp_multipliers (model_id, model_name, warp_weight, category, max_reasoning_tokens)
VALUES
  ('gpt-5.6-luna', 'GPT-5.6 Luna (Universal Fast)', 1.000, 'flagship', 16384),
  ('gpt-5.6-terra', 'GPT-5.6 Terra (Deep Coding)', 1.800, 'reasoning', 32768),
  ('gpt-5.6-sol', 'GPT-5.6 Sol (Frontier Synthesis)', 2.500, 'frontier', 65536),
  ('o3', 'OpenAI o3 (Deep Mathematics & Proof)', 3.000, 'deep_reasoning', 100000),
  ('o3-mini', 'OpenAI o3 Mini (STEM Reasoning)', 1.200, 'reasoning', 65536),
  ('gpt-4o', 'GPT-4o (Omni Multimodal)', 1.000, 'flagship', 0),
  ('gpt-4o-mini', 'GPT-4o Mini (High Velocity)', 0.250, 'small', 0),
  ('gpt-4.5-preview', 'GPT-4.5 Preview (Empirical Creative)', 4.000, 'frontier', 0),
  ('text-embedding-3-large', 'Text Embedding 3 Large (3072-dim)', 0.100, 'embedding', 0)
ON CONFLICT (model_id) DO UPDATE SET
  warp_weight = EXCLUDED.warp_weight,
  max_reasoning_tokens = EXCLUDED.max_reasoning_tokens,
  updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 2. EXTEND TABLE: lumi_user_rolling_quotas with Continuous Credit Interpolation
-- ------------------------------------------------------------------------------
ALTER TABLE public.lumi_user_rolling_quotas
  ADD COLUMN IF NOT EXISTS continuous_decay_rate_per_sec NUMERIC(10, 4) NOT NULL DEFAULT 0.1138,
  ADD COLUMN IF NOT EXISTS last_credit_refill_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  ADD COLUMN IF NOT EXISTS fractional_credits_available NUMERIC(12, 4) NOT NULL DEFAULT 2050.0000,
  ADD COLUMN IF NOT EXISTS model_warp_spent_5h NUMERIC(14, 4) NOT NULL DEFAULT 0.0000;

-- ------------------------------------------------------------------------------
-- 3. EXTEND TABLE: lumi_user_pool_leases with Heartbeat & Reasoning Extension
-- ------------------------------------------------------------------------------
ALTER TABLE public.lumi_user_pool_leases
  ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  ADD COLUMN IF NOT EXISTS heartbeat_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_reasoning_extended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_fingerprint_sha256 VARCHAR(64) DEFAULT NULL;

-- ------------------------------------------------------------------------------
-- 4. TABLE: community_anti_abuse_quarantine (Sybil & Abuse Defense)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_anti_abuse_quarantine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_type VARCHAR(32) NOT NULL CHECK (identifier_type IN ('device_fingerprint', 'ip_subnet', 'user_id', 'client_hash')),
  identifier_hash VARCHAR(64) NOT NULL,
  quarantine_reason VARCHAR(128) NOT NULL,
  violation_count INTEGER NOT NULL DEFAULT 1,
  quarantined_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_quarantine_ident UNIQUE (identifier_type, identifier_hash)
);

CREATE INDEX IF NOT EXISTS idx_quarantine_lookup 
  ON public.community_anti_abuse_quarantine (identifier_type, identifier_hash);

-- ------------------------------------------------------------------------------
-- 5. EXTEND TABLE: community_user_monthly_grants with Sybil Binding
-- ------------------------------------------------------------------------------
ALTER TABLE public.community_user_monthly_grants
  ADD COLUMN IF NOT EXISTS primary_device_fingerprint VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ip_subnet_prefix VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trust_score NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS is_quarantined BOOLEAN NOT NULL DEFAULT false;

-- ------------------------------------------------------------------------------
-- 6. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.lumi_model_warp_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumi_model_warp_multipliers FORCE ROW LEVEL SECURITY;

ALTER TABLE public.community_anti_abuse_quarantine ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_anti_abuse_quarantine FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_lumi_multipliers" ON public.lumi_model_warp_multipliers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_comm_quarantine" ON public.community_anti_abuse_quarantine
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "public_read_lumi_multipliers" ON public.lumi_model_warp_multipliers
  FOR SELECT TO public USING (true);

-- ------------------------------------------------------------------------------
-- 7. ATOMIC STORED PROCEDURE: rpc_acquire_lumi_stream_lease_v2
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_acquire_lumi_stream_lease_v2(
  p_user_id TEXT,
  p_model_id TEXT DEFAULT 'gpt-5.6-luna',
  p_api_key_id TEXT DEFAULT NULL,
  p_client_fingerprint TEXT DEFAULT NULL,
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
  v_warp_record RECORD;
  v_model_weight NUMERIC(6, 3) := 1.000;
  v_active_user_streams INTEGER;
  v_rolling_record RECORD;
  v_cluster_record RECORD;
  v_lease_id TEXT;
  v_elapsed_seconds NUMERIC;
  v_recovered_credits NUMERIC;
  v_new_credits NUMERIC;
  v_effective_ttl INTEGER := p_ttl_seconds;
BEGIN
  -- 1. Fetch Model Warp Weight
  SELECT * INTO v_warp_record 
  FROM public.lumi_model_warp_multipliers 
  WHERE model_id = p_model_id AND is_active = true;

  IF v_warp_record IS NOT NULL THEN
    v_model_weight := v_warp_record.warp_weight;
    -- Long reasoning models (o3, gpt-5.6-sol) get extended initial TTL
    IF v_warp_record.max_reasoning_tokens > 16384 THEN
      v_effective_ttl := GREATEST(p_ttl_seconds, 240);
    END IF;
  END IF;

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
  WHERE user_id = p_user_id AND status = 'active' AND expires_at > v_now;

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

  -- 4. Check & Advance Continuous Sliding Quota
  SELECT * INTO v_rolling_record
  FROM public.lumi_user_rolling_quotas
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_rolling_record IS NULL THEN
    INSERT INTO public.lumi_user_rolling_quotas (
      id, user_id, window_start_at, requests_in_window, max_request_limit, max_burst_concurrency,
      fractional_credits_available, last_credit_refill_at, last_request_at
    ) VALUES (
      p_user_id, p_user_id, v_now, 1, p_5h_quota, p_max_burst,
      (p_5h_quota - v_model_weight), v_now, v_now
    );
    v_new_credits := p_5h_quota - v_model_weight;
  ELSE
    -- Calculate continuous credit recovery:
    v_elapsed_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_rolling_record.last_credit_refill_at)));
    v_recovered_credits := v_elapsed_seconds * v_rolling_record.continuous_decay_rate_per_sec;
    v_new_credits := LEAST(p_5h_quota::NUMERIC, v_rolling_record.fractional_credits_available + v_recovered_credits);

    -- Check if sufficient quota exists for this model's warp weight
    IF v_new_credits < v_model_weight THEN
      UPDATE public.lumi_user_rolling_quotas
      SET total_throttled_count = total_throttled_count + 1,
          last_credit_refill_at = v_now,
          fractional_credits_available = v_new_credits,
          last_request_at = v_now,
          updated_at = v_now
      WHERE user_id = p_user_id;

      RETURN jsonb_build_object(
        'allowed', false,
        'rejection_code', 'LUMI_5HOUR_QUOTA_EXCEEDED',
        'rejection_message', format('LUMI 5-hour rolling compute limit reached for model %s (weight: %sx). Credits recover continuously.', p_model_id, v_model_weight),
        'quota_remaining_pct', ROUND((v_new_credits / p_5h_quota) * 100, 2),
        'retry_after', CEIL((v_model_weight - v_new_credits) / v_rolling_record.continuous_decay_rate_per_sec),
        'pool', 'qos_lumi_quota'
      );
    END IF;

    -- Deduct model warp weight from fractional credits
    v_new_credits := v_new_credits - v_model_weight;

    UPDATE public.lumi_user_rolling_quotas
    SET requests_in_window = requests_in_window + 1,
        fractional_credits_available = v_new_credits,
        last_credit_refill_at = v_now,
        model_warp_spent_5h = model_warp_spent_5h + v_model_weight,
        last_request_at = v_now,
        updated_at = v_now
    WHERE user_id = p_user_id;
  END IF;

  -- 5. Issue Active Stream Lease
  v_lease_id := gen_random_uuid()::text;
  INSERT INTO public.lumi_user_pool_leases (
    id, user_id, api_key_id, model_id, status, expires_at, heartbeat_at, client_fingerprint_sha256, created_at, updated_at
  ) VALUES (
    v_lease_id, p_user_id, p_api_key_id, p_model_id, 'active',
    v_now + (v_effective_ttl || ' seconds')::interval,
    v_now, p_client_fingerprint, v_now, v_now
  );

  -- 6. Increment Cluster Stream Counter
  UPDATE public.lumi_cluster_pool_metrics
  SET active_streams_count = active_streams_count + 1,
      total_served_5h = total_served_5h + 1,
      updated_at = v_now
  WHERE id = 'global_lumi_cluster';

  RETURN jsonb_build_object(
    'allowed', true,
    'lease_id', v_lease_id,
    'active_streams', v_active_user_streams + 1,
    'model_warp_weight', v_model_weight,
    'quota_remaining_credits', ROUND(v_new_credits, 2),
    'quota_remaining_pct', ROUND((v_new_credits / p_5h_quota) * 100, 2),
    'pool', 'qos_lumi_quota',
    'expires_at', (v_now + (v_effective_ttl || ' seconds')::interval)
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. ATOMIC STORED PROCEDURE: rpc_heartbeat_lumi_stream_lease
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_heartbeat_lumi_stream_lease(
  p_lease_id TEXT,
  p_user_id TEXT,
  p_extend_seconds INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_updated BOOLEAN := false;
BEGIN
  UPDATE public.lumi_user_pool_leases
  SET heartbeat_at = v_now,
      heartbeat_count = heartbeat_count + 1,
      expires_at = v_now + (p_extend_seconds || ' seconds')::interval,
      updated_at = v_now
  WHERE id = p_lease_id AND user_id = p_user_id AND status = 'active';

  v_updated := FOUND;

  RETURN jsonb_build_object(
    'success', v_updated,
    'lease_id', p_lease_id,
    'heartbeat_at', v_now,
    'new_expires_at', (v_now + (p_extend_seconds || ' seconds')::interval)
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. ATOMIC STORED PROCEDURE: rpc_settle_lumi_stream_lease_v2
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_settle_lumi_stream_lease_v2(
  p_lease_id TEXT,
  p_user_id TEXT,
  p_prompt_tokens BIGINT DEFAULT 0,
  p_completion_tokens BIGINT DEFAULT 0,
  p_reasoning_tokens BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_total_tokens BIGINT := p_prompt_tokens + p_completion_tokens + p_reasoning_tokens;
  v_lease_found BOOLEAN := false;
BEGIN
  UPDATE public.lumi_user_pool_leases
  SET status = 'released',
      released_at = v_now,
      tokens_used = v_total_tokens,
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
    IF v_total_tokens > 0 THEN
      UPDATE public.lumi_user_rolling_quotas
      SET tokens_in_window = tokens_in_window + v_total_tokens,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'lease_id', p_lease_id,
    'released', v_lease_found,
    'total_tokens', v_total_tokens,
    'reasoning_tokens', p_reasoning_tokens
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. ATOMIC STORED PROCEDURE: rpc_sweep_expired_lumi_leases
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_sweep_expired_lumi_leases()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_expired_count INTEGER := 0;
BEGIN
  WITH expired_leases AS (
    SELECT id
    FROM public.lumi_user_pool_leases
    WHERE status = 'active' AND expires_at < v_now
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE public.lumi_user_pool_leases
    SET status = 'expired', updated_at = v_now
    WHERE id IN (SELECT id FROM expired_leases)
    RETURNING id
  )
  SELECT count(*) INTO v_expired_count FROM updated;

  IF v_expired_count > 0 THEN
    UPDATE public.lumi_cluster_pool_metrics
    SET active_streams_count = GREATEST(0, active_streams_count - v_expired_count),
        updated_at = v_now
    WHERE id = 'global_lumi_cluster';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'expired_leases_swept', v_expired_count,
    'swept_at', v_now
  );
END;
$$;
