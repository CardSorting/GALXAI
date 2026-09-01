-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: ORIGIN HIT RATE MITIGATION & SWR MESH
-- Migration: 20260901000069_galxai_origin_hit_rate_mitigation_and_swr_mesh.sql
-- Description:
--   Dramatically reduces Supabase origin database hits via single-flight coalescing & SWR metrics:
--   1. Origin Query Hit Ledger (galx_origin_query_hit_ledger).
--   2. Atomic Ingestion & Origin Hit Aggregation RPCs.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: galx_origin_query_hit_ledger
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_origin_query_hit_ledger (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('hit_' || gen_random_uuid()::text),
  query_key VARCHAR(128) NOT NULL UNIQUE,
  origin_hits_count BIGINT NOT NULL DEFAULT 0,
  cache_hits_count BIGINT NOT NULL DEFAULT 0,
  egress_bytes_saved BIGINT NOT NULL DEFAULT 0,
  coalesced_stampede_count BIGINT NOT NULL DEFAULT 0,
  last_origin_hit_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_query_hit_ledger_key
  ON public.galx_origin_query_hit_ledger (query_key, last_origin_hit_at DESC);

-- ------------------------------------------------------------------------------
-- 2. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.galx_origin_query_hit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_origin_query_hit_ledger FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_origin_hits" ON public.galx_origin_query_hit_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "public_read_origin_hits" ON public.galx_origin_query_hit_ledger
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 3. ATOMIC STORED PROCEDURE: rpc_record_origin_query_metrics
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_record_origin_query_metrics(
  p_query_key VARCHAR(128),
  p_origin_hits BIGINT,
  p_cache_hits BIGINT,
  p_bytes_saved BIGINT,
  p_coalesced BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_record RECORD;
BEGIN
  INSERT INTO public.galx_origin_query_hit_ledger (
    query_key, origin_hits_count, cache_hits_count, egress_bytes_saved,
    coalesced_stampede_count, last_origin_hit_at, created_at, updated_at
  ) VALUES (
    p_query_key, p_origin_hits, p_cache_hits, p_bytes_saved,
    p_coalesced, v_now, v_now, v_now
  )
  ON CONFLICT (query_key) DO UPDATE SET
    origin_hits_count = public.galx_origin_query_hit_ledger.origin_hits_count + EXCLUDED.origin_hits_count,
    cache_hits_count = public.galx_origin_query_hit_ledger.cache_hits_count + EXCLUDED.cache_hits_count,
    egress_bytes_saved = public.galx_origin_query_hit_ledger.egress_bytes_saved + EXCLUDED.egress_bytes_saved,
    coalesced_stampede_count = public.galx_origin_query_hit_ledger.coalesced_stampede_count + EXCLUDED.coalesced_stampede_count,
    last_origin_hit_at = CASE WHEN EXCLUDED.origin_hits_count > 0 THEN v_now ELSE public.galx_origin_query_hit_ledger.last_origin_hit_at END,
    updated_at = v_now
  RETURNING * INTO v_record;

  RETURN jsonb_build_object(
    'success', true,
    'query_key', v_record.query_key,
    'total_origin_hits', v_record.origin_hits_count,
    'total_cache_hits', v_record.cache_hits_count,
    'hit_reduction_pct', CASE WHEN (v_record.origin_hits_count + v_record.cache_hits_count) > 0 
      THEN ROUND((v_record.cache_hits_count::NUMERIC / (v_record.origin_hits_count + v_record.cache_hits_count)) * 100.0, 2)
      ELSE 100.00 END
  );
END;
$$;
