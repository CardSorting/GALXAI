-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: HIGH-THROUGHPUT I/O EXECUTION AUTHORITY MESH
-- Migration: 20260901000067_galxai_high_throughput_io_authority_and_pipeline_mesh.sql
-- Description:
--   Implements high-throughput non-blocking I/O execution authority & stream flow metrics:
--   1. I/O Authority Cluster Ledger (galx_io_execution_authority_metrics).
--   2. Atomic Ingestion & Health RPCs (rpc_record_io_pipeline_telemetry, rpc_get_io_authority_cluster_health).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: galx_io_execution_authority_metrics
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_io_execution_authority_metrics (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('io_' || gen_random_uuid()::text),
  node_id VARCHAR(64) NOT NULL UNIQUE,
  active_stream_count INTEGER NOT NULL DEFAULT 0,
  io_throughput_tokens_per_sec NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  p99_drain_micros NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  backpressure_events_count INTEGER NOT NULL DEFAULT 0,
  total_bytes_piped BIGINT NOT NULL DEFAULT 0,
  is_flow_optimal BOOLEAN NOT NULL DEFAULT true,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_io_metrics_node_heartbeat
  ON public.galx_io_execution_authority_metrics (node_id, last_heartbeat_at DESC);

-- ------------------------------------------------------------------------------
-- 2. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.galx_io_execution_authority_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_io_execution_authority_metrics FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_io_metrics" ON public.galx_io_execution_authority_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "public_read_io_metrics" ON public.galx_io_execution_authority_metrics
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 3. ATOMIC STORED PROCEDURE: rpc_record_io_pipeline_telemetry
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_record_io_pipeline_telemetry(
  p_node_id VARCHAR(64),
  p_active_streams INTEGER,
  p_tokens_per_sec NUMERIC(10, 2),
  p_p99_micros NUMERIC(10, 2),
  p_backpressure_events INTEGER,
  p_bytes_piped BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_is_optimal BOOLEAN := (p_p99_micros < 500.0 AND p_backpressure_events < 10);
  v_record RECORD;
BEGIN
  INSERT INTO public.galx_io_execution_authority_metrics (
    node_id, active_stream_count, io_throughput_tokens_per_sec,
    p99_drain_micros, backpressure_events_count, total_bytes_piped,
    is_flow_optimal, last_heartbeat_at, created_at, updated_at
  ) VALUES (
    p_node_id, p_active_streams, p_tokens_per_sec,
    p_p99_micros, p_backpressure_events, p_bytes_piped,
    v_is_optimal, v_now, v_now, v_now
  )
  ON CONFLICT (node_id) DO UPDATE SET
    active_stream_count = EXCLUDED.active_stream_count,
    io_throughput_tokens_per_sec = EXCLUDED.io_throughput_tokens_per_sec,
    p99_drain_micros = EXCLUDED.p99_drain_micros,
    backpressure_events_count = EXCLUDED.backpressure_events_count,
    total_bytes_piped = public.galx_io_execution_authority_metrics.total_bytes_piped + EXCLUDED.total_bytes_piped,
    is_flow_optimal = v_is_optimal,
    last_heartbeat_at = v_now,
    updated_at = v_now
  RETURNING * INTO v_record;

  RETURN jsonb_build_object(
    'success', true,
    'node_id', v_record.node_id,
    'is_flow_optimal', v_record.is_flow_optimal,
    'throughput_tps', v_record.io_throughput_tokens_per_sec,
    'p99_drain_micros', v_record.p99_drain_micros,
    'updated_at', v_record.updated_at
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC STORED PROCEDURE: rpc_get_io_authority_cluster_health
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_get_io_authority_cluster_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_nodes INTEGER := 0;
  v_optimal_nodes INTEGER := 0;
  v_aggregate_tps NUMERIC(12, 2) := 0.00;
  v_total_streams INTEGER := 0;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_flow_optimal = true),
    COALESCE(SUM(io_throughput_tokens_per_sec), 0.00),
    COALESCE(SUM(active_stream_count), 0)
  INTO v_total_nodes, v_optimal_nodes, v_aggregate_tps, v_total_streams
  FROM public.galx_io_execution_authority_metrics
  WHERE last_heartbeat_at >= (clock_timestamp() - INTERVAL '3 minutes');

  RETURN jsonb_build_object(
    'success', true,
    'total_active_nodes', v_total_nodes,
    'optimal_nodes', v_optimal_nodes,
    'aggregate_tokens_per_sec', v_aggregate_tps,
    'active_stream_count', v_total_streams,
    'cluster_health_pct', CASE WHEN v_total_nodes > 0 THEN ROUND((v_optimal_nodes::NUMERIC / v_total_nodes) * 100.0, 2) ELSE 100.00 END
  );
END;
$$;
