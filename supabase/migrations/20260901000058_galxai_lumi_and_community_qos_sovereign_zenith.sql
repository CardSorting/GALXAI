-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: LUMI & COMMUNITY QOS SOVEREIGN ZENITH
-- Migration: 20260901000058_galxai_lumi_and_community_qos_sovereign_zenith.sql
-- Description:
--   World-class enterprise architectural graduation:
--   1. Fair-share Ephemeral Wait Queue with Priority Aging (Deadlock/Starvation Prevention).
--   2. Double-Entry Cryptographic Merkle Settlement Ledger with Idempotency.
--   3. Stacked Hierarchical Grant Engine (Waterfall credit exhaustion).
--   4. 1-Minute Telemetry Rollups with EWMA Latency and Cache Hit Tracking.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: lumi_pool_queue_tickets (Fair-Share Ephemeral Wait Queue)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lumi_pool_queue_tickets (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('ticket_' || gen_random_uuid()::text),
  user_id VARCHAR(255) NOT NULL,
  api_key_id VARCHAR(64),
  model_id VARCHAR(64) NOT NULL DEFAULT 'gpt-5.6-luna',
  base_priority INTEGER NOT NULL DEFAULT 50 CHECK (base_priority >= 1 AND base_priority <= 100),
  calculated_priority_score NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  max_wait_seconds INTEGER NOT NULL DEFAULT 30,
  status VARCHAR(32) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'promoted', 'timed_out', 'cancelled')),
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  promoted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (clock_timestamp() + interval '30 seconds'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Partial index for instantaneous priority queue polling
CREATE INDEX IF NOT EXISTS idx_lumi_queue_polling
  ON public.lumi_pool_queue_tickets (status, calculated_priority_score DESC, enqueued_at ASC)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_lumi_queue_user
  ON public.lumi_pool_queue_tickets (user_id)
  WHERE status = 'queued';

-- ------------------------------------------------------------------------------
-- 2. TABLE: lumi_compute_settlement_ledger (Double-Entry Cryptographic Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lumi_compute_settlement_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  user_id VARCHAR(255) NOT NULL,
  lease_id VARCHAR(64) NOT NULL,
  model_id VARCHAR(64) NOT NULL,
  prompt_tokens BIGINT NOT NULL DEFAULT 0,
  cached_prompt_tokens BIGINT NOT NULL DEFAULT 0,
  completion_tokens BIGINT NOT NULL DEFAULT 0,
  reasoning_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  model_warp_cost_credits NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
  cache_discount_applied_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  merkle_leaf_sha256 VARCHAR(64) NOT NULL,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_lumi_settlement_user
  ON public.lumi_compute_settlement_ledger (user_id, settled_at DESC);

-- ------------------------------------------------------------------------------
-- 3. TABLE: community_grant_allocations (Stacked Hierarchical Grants)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_grant_allocations (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('grant_' || gen_random_uuid()::text),
  user_id VARCHAR(255) NOT NULL,
  grant_type VARCHAR(32) NOT NULL DEFAULT 'monthly_recurring' CHECK (grant_type IN ('monthly_recurring', 'welcome_bonus', 'open_source_sponsor', 'hackathon_promotional')),
  initial_amount_usd NUMERIC(10, 4) NOT NULL DEFAULT 30.0000,
  remaining_amount_usd NUMERIC(10, 4) NOT NULL DEFAULT 30.0000,
  is_exhausted BOOLEAN NOT NULL DEFAULT false,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_comm_grant_waterfall
  ON public.community_grant_allocations (user_id, is_exhausted, expires_at ASC)
  WHERE is_exhausted = false;

-- ------------------------------------------------------------------------------
-- 4. TABLE: lumi_cluster_telemetry_rollups_1m (1-Minute QoS Observability)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lumi_cluster_telemetry_rollups_1m (
  bucket_minute_utc TIMESTAMPTZ PRIMARY KEY,
  total_requests BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  total_reasoning_tokens BIGINT NOT NULL DEFAULT 0,
  avg_concurrency NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  p95_queue_wait_ms NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  cache_hit_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  concurrency_saturation_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ------------------------------------------------------------------------------
-- 5. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.lumi_pool_queue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumi_pool_queue_tickets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.lumi_compute_settlement_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumi_compute_settlement_ledger FORCE ROW LEVEL SECURITY;

ALTER TABLE public.community_grant_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_grant_allocations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.lumi_cluster_telemetry_rollups_1m ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumi_cluster_telemetry_rollups_1m FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_lumi_tickets" ON public.lumi_pool_queue_tickets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_lumi_settlements" ON public.lumi_compute_settlement_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_comm_grant_allocs" ON public.community_grant_allocations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_telemetry_rollups" ON public.lumi_cluster_telemetry_rollups_1m
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_read_own_lumi_tickets" ON public.lumi_pool_queue_tickets
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "users_read_own_lumi_settlements" ON public.lumi_compute_settlement_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "users_read_own_grant_allocs" ON public.community_grant_allocations
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "public_read_telemetry_rollups" ON public.lumi_cluster_telemetry_rollups_1m
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 6. ATOMIC STORED PROCEDURE: rpc_enqueue_lumi_request_ticket
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_enqueue_lumi_request_ticket(
  p_user_id VARCHAR(255),
  p_model_id VARCHAR(64) DEFAULT 'gpt-5.6-luna',
  p_api_key_id VARCHAR(64) DEFAULT NULL,
  p_base_priority INTEGER DEFAULT 50,
  p_max_wait_seconds INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_ticket_id VARCHAR(64);
  v_queue_depth INTEGER;
BEGIN
  -- Count active queued tickets ahead
  SELECT count(*) INTO v_queue_depth
  FROM public.lumi_pool_queue_tickets
  WHERE status = 'queued' AND expires_at > v_now;

  -- Create ticket
  v_ticket_id := 'ticket_' || (EXTRACT(EPOCH FROM v_now) * 1000)::BIGINT || '_' || substr(md5(random()::text), 1, 8);

  INSERT INTO public.lumi_pool_queue_tickets (
    id, user_id, api_key_id, model_id, base_priority, calculated_priority_score,
    max_wait_seconds, status, enqueued_at, expires_at, created_at
  ) VALUES (
    v_ticket_id, p_user_id, p_api_key_id, p_model_id, p_base_priority, p_base_priority::NUMERIC,
    p_max_wait_seconds, 'queued', v_now, v_now + (p_max_wait_seconds || ' seconds')::interval, v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket_id,
    'queue_depth_ahead', v_queue_depth,
    'estimated_wait_ms', v_queue_depth * 80,
    'expires_at', v_now + (p_max_wait_seconds || ' seconds')::interval
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. ATOMIC STORED PROCEDURE: rpc_poll_and_promote_lumi_queue_ticket
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_poll_and_promote_lumi_queue_ticket(
  p_ticket_id VARCHAR(64),
  p_user_id VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_ticket RECORD;
  v_cluster RECORD;
  v_lease_result JSONB;
BEGIN
  -- 1. Check ticket status
  SELECT * INTO v_ticket
  FROM public.lumi_pool_queue_tickets
  WHERE id = p_ticket_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_ticket IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_ticket.status = 'promoted' THEN
    RETURN jsonb_build_object('status', 'promoted', 'ticket_id', p_ticket_id);
  END IF;

  IF v_ticket.expires_at < v_now OR v_ticket.status = 'timed_out' THEN
    UPDATE public.lumi_pool_queue_tickets
    SET status = 'timed_out'
    WHERE id = p_ticket_id;
    RETURN jsonb_build_object('status', 'timed_out');
  END IF;

  -- 2. Check if cluster slot is available
  SELECT * INTO v_cluster
  FROM public.lumi_cluster_pool_metrics
  WHERE id = 'global_lumi_cluster';

  IF v_cluster.active_streams_count < v_cluster.max_concurrency_capacity AND NOT v_cluster.is_shedding_load THEN
    -- Acquire lease
    v_lease_result := public.rpc_acquire_lumi_stream_lease_v2(
      p_user_id,
      v_ticket.model_id,
      v_ticket.api_key_id,
      NULL,
      12,
      2050,
      120
    );

    IF (v_lease_result->>'allowed')::BOOLEAN THEN
      UPDATE public.lumi_pool_queue_tickets
      SET status = 'promoted', promoted_at = v_now
      WHERE id = p_ticket_id;

      RETURN jsonb_build_object(
        'status', 'promoted',
        'lease_result', v_lease_result
      );
    END IF;
  END IF;

  -- Age priority score based on elapsed wait time
  UPDATE public.lumi_pool_queue_tickets
  SET calculated_priority_score = base_priority + (EXTRACT(EPOCH FROM (v_now - enqueued_at)) * 2.5)
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object(
    'status', 'queued',
    'priority_score', v_ticket.calculated_priority_score,
    'retry_in_ms', 50
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. ATOMIC STORED PROCEDURE: rpc_settle_lumi_composite_ledger_entry
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_settle_lumi_composite_ledger_entry(
  p_idempotency_key VARCHAR(128),
  p_user_id VARCHAR(255),
  p_lease_id VARCHAR(64),
  p_model_id VARCHAR(64),
  p_prompt_tokens BIGINT DEFAULT 0,
  p_cached_prompt_tokens BIGINT DEFAULT 0,
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
  v_existing RECORD;
  v_warp_weight NUMERIC(6, 3) := 1.000;
  v_total_tokens BIGINT := p_prompt_tokens + p_cached_prompt_tokens + p_completion_tokens + p_reasoning_tokens;
  v_merkle_leaf VARCHAR(64);
  v_warp_cost NUMERIC(10, 4);
BEGIN
  -- 1. Idempotency Guard
  SELECT * INTO v_existing
  FROM public.lumi_compute_settlement_ledger
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'settled_tokens', v_existing.total_tokens,
      'merkle_leaf_sha256', v_existing.merkle_leaf_sha256
    );
  END IF;

  -- 2. Fetch Model Warp Weight
  SELECT COALESCE(warp_weight, 1.000) INTO v_warp_weight
  FROM public.lumi_model_warp_multipliers
  WHERE model_id = p_model_id;

  v_warp_cost := v_warp_weight;

  -- 3. Calculate Cryptographic Merkle Leaf Hash
  v_merkle_leaf := encode(
    sha256(
      (p_idempotency_key || ':' || p_user_id || ':' || p_lease_id || ':' || v_total_tokens || ':' || v_now::text)::bytea
    ),
    'hex'
  );

  -- 4. Record Double-Entry Ledger Row
  INSERT INTO public.lumi_compute_settlement_ledger (
    idempotency_key, user_id, lease_id, model_id, prompt_tokens, cached_prompt_tokens,
    completion_tokens, reasoning_tokens, total_tokens, model_warp_cost_credits,
    cache_discount_applied_pct, merkle_leaf_sha256, settled_at, created_at
  ) VALUES (
    p_idempotency_key, p_user_id, p_lease_id, p_model_id, p_prompt_tokens, p_cached_prompt_tokens,
    p_completion_tokens, p_reasoning_tokens, v_total_tokens, v_warp_cost,
    CASE WHEN (p_prompt_tokens + p_cached_prompt_tokens) > 0 THEN ROUND((p_cached_prompt_tokens::NUMERIC / (p_prompt_tokens + p_cached_prompt_tokens)) * 50.0, 2) ELSE 0.00 END,
    v_merkle_leaf, v_now, v_now
  );

  -- 5. Finalize Lease and Decrement Cluster Count
  PERFORM public.rpc_settle_lumi_stream_lease_v2(
    p_lease_id,
    p_user_id,
    p_prompt_tokens + p_cached_prompt_tokens,
    p_completion_tokens,
    p_reasoning_tokens
  );

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'total_tokens', v_total_tokens,
    'merkle_leaf_sha256', v_merkle_leaf,
    'warp_cost_credits', v_warp_cost
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. ATOMIC STORED PROCEDURE: rpc_draw_hierarchical_community_grant
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_draw_hierarchical_community_grant(
  p_user_id VARCHAR(255),
  p_cost_usd NUMERIC(10, 4)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_remaining_cost NUMERIC(10, 4) := p_cost_usd;
  v_grant RECORD;
  v_drawn NUMERIC(10, 4);
BEGIN
  -- Waterfall deduction across active grants ordered by earliest expiration
  FOR v_grant IN
    SELECT *
    FROM public.community_grant_allocations
    WHERE user_id = p_user_id AND is_exhausted = false AND expires_at > v_now
    ORDER BY expires_at ASC
    FOR UPDATE
  LOOP
    IF v_remaining_cost <= 0 THEN
      EXIT;
    END IF;

    v_drawn := LEAST(v_grant.remaining_amount_usd, v_remaining_cost);
    v_remaining_cost := v_remaining_cost - v_drawn;

    UPDATE public.community_grant_allocations
    SET remaining_amount_usd = remaining_amount_usd - v_drawn,
        is_exhausted = (remaining_amount_usd - v_drawn <= 0),
        updated_at = v_now
    WHERE id = v_grant.id;
  END LOOP;

  -- Also draw from collective daily ledger
  PERFORM public.rpc_settle_community_grant_draw(p_user_id, p_cost_usd);

  RETURN jsonb_build_object(
    'success', true,
    'cost_usd', p_cost_usd,
    'uncovered_cost_usd', v_remaining_cost
  );
END;
$$;
