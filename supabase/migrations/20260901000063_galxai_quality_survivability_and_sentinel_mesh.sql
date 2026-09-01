-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: QUALITY SURVIVABILITY & SENTINEL MESH
-- Migration: 20260901000063_galxai_quality_survivability_and_sentinel_mesh.sql
-- Description:
--   Implements automated model quality survivability and circuit breaker mitigation:
--   1. Model Quality Sentinel Ledger (galx_model_quality_sentinel_ledger).
--   2. Quality Remediation Fallback Rules (galx_quality_remediation_rules).
--   3. Atomic Quality Scoring & Quarantine RPCs (rpc_evaluate_model_quality_survivability).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: galx_model_quality_sentinel_ledger
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_model_quality_sentinel_ledger (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('sentinel_' || gen_random_uuid()::text),
  model_id VARCHAR(64) NOT NULL,
  shard_id VARCHAR(64) NOT NULL DEFAULT 'shard_cf_edge_direct',
  sample_window_minutes INTEGER NOT NULL DEFAULT 5,
  evaluated_requests_count INTEGER NOT NULL DEFAULT 0,
  json_schema_valid_count INTEGER NOT NULL DEFAULT 0,
  code_syntax_valid_count INTEGER NOT NULL DEFAULT 0,
  token_loop_anomalies_count INTEGER NOT NULL DEFAULT 0,
  quality_assurance_score NUMERIC(5, 4) NOT NULL DEFAULT 1.0000 CHECK (quality_assurance_score >= 0.0000 AND quality_assurance_score <= 1.0000),
  circuit_status VARCHAR(32) NOT NULL DEFAULT 'healthy' CHECK (circuit_status IN ('healthy', 'quality_degraded', 'quarantined')),
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_sentinel_model_shard UNIQUE (model_id, shard_id)
);

CREATE INDEX IF NOT EXISTS idx_sentinel_model_circuit
  ON public.galx_model_quality_sentinel_ledger (model_id, circuit_status);

-- ------------------------------------------------------------------------------
-- 2. TABLE: galx_quality_remediation_rules
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_quality_remediation_rules (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('rule_' || gen_random_uuid()::text),
  trigger_model_id VARCHAR(64) NOT NULL UNIQUE,
  quality_floor_score NUMERIC(4, 2) NOT NULL DEFAULT 0.85,
  failover_model_id VARCHAR(64) NOT NULL,
  temperature_damping_override NUMERIC(3, 2) NOT NULL DEFAULT 0.20,
  max_auto_retries INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Seed authoritative quality failover rules
INSERT INTO public.galx_quality_remediation_rules (trigger_model_id, quality_floor_score, failover_model_id, temperature_damping_override, max_auto_retries)
VALUES
  ('gpt-5.6-luna', 0.85, 'gpt-5.6-terra', 0.20, 2),
  ('gpt-5.6-terra', 0.88, 'gpt-5.6-sol', 0.15, 2),
  ('gpt-5.6-sol', 0.90, 'o3', 0.10, 2),
  ('o3-mini', 0.85, 'o3', 0.10, 2),
  ('gpt-4o-mini', 0.80, 'gpt-4o', 0.25, 1)
ON CONFLICT (trigger_model_id) DO UPDATE SET
  quality_floor_score = EXCLUDED.quality_floor_score,
  failover_model_id = EXCLUDED.failover_model_id,
  temperature_damping_override = EXCLUDED.temperature_damping_override,
  updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 3. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.galx_model_quality_sentinel_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_model_quality_sentinel_ledger FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_quality_remediation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_quality_remediation_rules FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_sentinel" ON public.galx_model_quality_sentinel_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_remediation_rules" ON public.galx_quality_remediation_rules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "public_read_remediation_rules" ON public.galx_quality_remediation_rules
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 4. ATOMIC STORED PROCEDURE: rpc_evaluate_model_quality_survivability
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_evaluate_model_quality_survivability(
  p_requested_model_id VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sentinel RECORD;
  v_rule RECORD;
  v_effective_model VARCHAR(64) := p_requested_model_id;
  v_is_degraded BOOLEAN := false;
  v_temp_override NUMERIC(3, 2) := NULL;
BEGIN
  -- 1. Inspect Sentinel Quality Score
  SELECT * INTO v_sentinel
  FROM public.galx_model_quality_sentinel_ledger
  WHERE model_id = p_requested_model_id
  ORDER BY quality_assurance_score ASC
  LIMIT 1;

  -- 2. Fetch Remediation Rule
  SELECT * INTO v_rule
  FROM public.galx_quality_remediation_rules
  WHERE trigger_model_id = p_requested_model_id AND is_active = true;

  IF v_sentinel IS NOT NULL AND v_rule IS NOT NULL THEN
    IF v_sentinel.circuit_status = 'quarantined' OR v_sentinel.quality_assurance_score < v_rule.quality_floor_score THEN
      v_is_degraded := true;
      v_effective_model := v_rule.failover_model_id;
      v_temp_override := v_rule.temperature_damping_override;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'requested_model', p_requested_model_id,
    'effective_model', v_effective_model,
    'is_quality_degraded', v_is_degraded,
    'quality_score', COALESCE(v_sentinel.quality_assurance_score, 1.0000),
    'temperature_damping_override', v_temp_override,
    'remediation_applied', v_is_degraded
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. ATOMIC STORED PROCEDURE: rpc_record_quality_telemetry
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_record_quality_telemetry(
  p_model_id VARCHAR(64),
  p_shard_id VARCHAR(64),
  p_is_json_valid BOOLEAN DEFAULT true,
  p_is_syntax_valid BOOLEAN DEFAULT true,
  p_has_token_loop BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_existing RECORD;
  v_new_evals INTEGER;
  v_new_json INTEGER;
  v_new_syntax INTEGER;
  v_new_loops INTEGER;
  v_new_score NUMERIC(5, 4);
  v_new_status VARCHAR(32) := 'healthy';
BEGIN
  SELECT * INTO v_existing
  FROM public.galx_model_quality_sentinel_ledger
  WHERE model_id = p_model_id AND shard_id = p_shard_id
  FOR UPDATE;

  IF v_existing IS NULL THEN
    v_new_evals := 1;
    v_new_json := CASE WHEN p_is_json_valid THEN 1 ELSE 0 END;
    v_new_syntax := CASE WHEN p_is_syntax_valid THEN 1 ELSE 0 END;
    v_new_loops := CASE WHEN p_has_token_loop THEN 1 ELSE 0 END;
    v_new_score := CASE WHEN p_has_token_loop THEN 0.5000 ELSE 1.0000 END;

    INSERT INTO public.galx_model_quality_sentinel_ledger (
      model_id, shard_id, evaluated_requests_count, json_schema_valid_count,
      code_syntax_valid_count, token_loop_anomalies_count, quality_assurance_score,
      circuit_status, last_evaluated_at, created_at, updated_at
    ) VALUES (
      p_model_id, p_shard_id, v_new_evals, v_new_json,
      v_new_syntax, v_new_loops, v_new_score,
      'healthy', v_now, v_now, v_now
    );
  ELSE
    v_new_evals := v_existing.evaluated_requests_count + 1;
    v_new_json := v_existing.json_schema_valid_count + (CASE WHEN p_is_json_valid THEN 1 ELSE 0 END);
    v_new_syntax := v_existing.code_syntax_valid_count + (CASE WHEN p_is_syntax_valid THEN 1 ELSE 0 END);
    v_new_loops := v_existing.token_loop_anomalies_count + (CASE WHEN p_has_token_loop THEN 1 ELSE 0 END);

    v_new_score := ROUND(
      GREATEST(0.0000, ((v_new_json + v_new_syntax)::NUMERIC / (v_new_evals * 2.0)) - (v_new_loops * 0.10)),
      4
    );

    IF v_new_score < 0.7500 THEN
      v_new_status := 'quarantined';
    ELSIF v_new_score < 0.8800 THEN
      v_new_status := 'quality_degraded';
    ELSE
      v_new_status := 'healthy';
    END IF;

    UPDATE public.galx_model_quality_sentinel_ledger
    SET evaluated_requests_count = v_new_evals,
        json_schema_valid_count = v_new_json,
        code_syntax_valid_count = v_new_syntax,
        token_loop_anomalies_count = v_new_loops,
        quality_assurance_score = v_new_score,
        circuit_status = v_new_status,
        last_evaluated_at = v_now,
        updated_at = v_now
    WHERE id = v_existing.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'model_id', p_model_id,
    'quality_score', v_new_score,
    'circuit_status', v_new_status
  );
END;
$$;
