-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: PROMPT COMPACTION & SEMANTIC CACHE MESH
-- Migration: 20260901000062_galxai_prompt_compaction_and_semantic_cache_mesh.sql
-- Description:
--   Implements high-throughput deterministic prompt compaction caching:
--   1. Prompt compaction & KV prefix cache ledger (galx_prompt_compaction_cache).
--   2. Atomic lookup and upsert procedure (rpc_lookup_or_register_compact_prompt).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: galx_prompt_compaction_cache
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_prompt_compaction_cache (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('cmp_' || gen_random_uuid()::text),
  prompt_sha256 VARCHAR(64) NOT NULL UNIQUE,
  original_tokens INTEGER NOT NULL,
  compacted_tokens INTEGER NOT NULL,
  tokens_saved INTEGER NOT NULL,
  compression_ratio_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  compacted_payload JSONB NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_prompt_compaction_lookup
  ON public.galx_prompt_compaction_cache (prompt_sha256);

-- ------------------------------------------------------------------------------
-- 2. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.galx_prompt_compaction_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_prompt_compaction_cache FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_compaction_cache" ON public.galx_prompt_compaction_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "public_read_compaction_cache" ON public.galx_prompt_compaction_cache
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 3. ATOMIC STORED PROCEDURE: rpc_lookup_or_register_compact_prompt
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_lookup_or_register_compact_prompt(
  p_prompt_sha256 VARCHAR(64),
  p_original_tokens INTEGER,
  p_compacted_tokens INTEGER,
  p_compacted_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_existing RECORD;
  v_saved INTEGER := GREATEST(0, p_original_tokens - p_compacted_tokens);
  v_ratio NUMERIC(5, 2) := 0.00;
BEGIN
  IF p_original_tokens > 0 THEN
    v_ratio := ROUND(((v_saved::NUMERIC / p_original_tokens) * 100.0), 2);
  END IF;

  -- 1. Try lookup and increment hit count
  UPDATE public.galx_prompt_compaction_cache
  SET hit_count = hit_count + 1, updated_at = v_now
  WHERE prompt_sha256 = p_prompt_sha256
  RETURNING * INTO v_existing;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'cached', true,
      'prompt_sha256', p_prompt_sha256,
      'original_tokens', v_existing.original_tokens,
      'compacted_tokens', v_existing.compacted_tokens,
      'tokens_saved', v_existing.tokens_saved,
      'compression_ratio_pct', v_existing.compression_ratio_pct,
      'compacted_payload', v_existing.compacted_payload,
      'hit_count', v_existing.hit_count
    );
  END IF;

  -- 2. Insert new compaction record
  INSERT INTO public.galx_prompt_compaction_cache (
    prompt_sha256, original_tokens, compacted_tokens, tokens_saved,
    compression_ratio_pct, compacted_payload, hit_count, created_at, updated_at
  ) VALUES (
    p_prompt_sha256, p_original_tokens, p_compacted_tokens, v_saved,
    v_ratio, p_compacted_payload, 1, v_now, v_now
  )
  ON CONFLICT (prompt_sha256) DO UPDATE SET
    hit_count = public.galx_prompt_compaction_cache.hit_count + 1,
    updated_at = v_now
  RETURNING * INTO v_existing;

  RETURN jsonb_build_object(
    'cached', false,
    'prompt_sha256', p_prompt_sha256,
    'original_tokens', v_existing.original_tokens,
    'compacted_tokens', v_existing.compacted_tokens,
    'tokens_saved', v_existing.tokens_saved,
    'compression_ratio_pct', v_existing.compression_ratio_pct,
    'compacted_payload', v_existing.compacted_payload,
    'hit_count', v_existing.hit_count
  );
END;
$$;
