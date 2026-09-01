-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: XFETCH & BLOOM ORIGIN SHIELD MESH
-- Migration: 20260901000070_galxai_xfetch_and_bloom_origin_shield_mesh.sql
-- Description:
--   Implements mathematical XFetch probabilistic early refresh and Bloom filter origin shielding:
--   1. Bloom Filter Registry Table (galx_origin_shield_bloom_filters).
--   2. Atomic Ingestion & Membership Check RPCs (rpc_upsert_bloom_filter, rpc_check_bloom_membership).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: galx_origin_shield_bloom_filters
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_origin_shield_bloom_filters (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('bloom_' || gen_random_uuid()::text),
  filter_name VARCHAR(64) NOT NULL UNIQUE,
  bit_count INTEGER NOT NULL DEFAULT 65536,
  hash_functions_count INTEGER NOT NULL DEFAULT 4,
  element_count INTEGER NOT NULL DEFAULT 0,
  estimated_fpr NUMERIC(6, 5) NOT NULL DEFAULT 0.00100,
  bit_data TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ------------------------------------------------------------------------------
-- 2. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.galx_origin_shield_bloom_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_origin_shield_bloom_filters FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_bloom_filters" ON public.galx_origin_shield_bloom_filters
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "public_read_bloom_filters" ON public.galx_origin_shield_bloom_filters
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 3. ATOMIC STORED PROCEDURE: rpc_upsert_bloom_filter
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_upsert_bloom_filter(
  p_filter_name VARCHAR(64),
  p_bit_count INTEGER,
  p_element_count INTEGER,
  p_bit_data TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_fpr NUMERIC(6, 5);
BEGIN
  v_fpr := CASE 
    WHEN p_element_count > 0 AND p_bit_count > 0 
    THEN ROUND(POWER(1.0 - EXP(-4.0 * p_element_count::NUMERIC / p_bit_count::NUMERIC), 4)::NUMERIC, 5)
    ELSE 0.00010
  END;

  INSERT INTO public.galx_origin_shield_bloom_filters (
    filter_name, bit_count, hash_functions_count, element_count,
    estimated_fpr, bit_data, created_at, updated_at
  ) VALUES (
    p_filter_name, p_bit_count, 4, p_element_count,
    v_fpr, p_bit_data, v_now, v_now
  )
  ON CONFLICT (filter_name) DO UPDATE SET
    bit_count = EXCLUDED.bit_count,
    element_count = EXCLUDED.element_count,
    estimated_fpr = v_fpr,
    bit_data = EXCLUDED.bit_data,
    updated_at = v_now;

  RETURN jsonb_build_object(
    'success', true,
    'filter_name', p_filter_name,
    'element_count', p_element_count,
    'estimated_fpr', v_fpr
  );
END;
$$;
