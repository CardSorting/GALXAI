-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: SEMANTIC AST SKELETONS & CONTEXT PYRAMID MESH
-- Migration: 20260901000065_galxai_semantic_ast_skeletons_and_context_pyramid_mesh.sql
-- Description:
--   Implements codebase AST skeletonization and context window pyramid caching:
--   1. Semantic AST Skeletons Table (galx_codebase_ast_skeletons).
--   2. Atomic Upsert & Batch Fetch RPCs (rpc_upsert_ast_skeleton, rpc_fetch_ast_skeletons_batch).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: galx_codebase_ast_skeletons
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_codebase_ast_skeletons (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('ast_' || gen_random_uuid()::text),
  file_path VARCHAR(255) NOT NULL UNIQUE,
  file_sha256 VARCHAR(64) NOT NULL,
  language VARCHAR(32) NOT NULL DEFAULT 'typescript',
  skeleton_content TEXT NOT NULL,
  raw_tokens INTEGER NOT NULL,
  skeleton_tokens INTEGER NOT NULL,
  token_reduction_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  hit_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_ast_skeletons_path_hash
  ON public.galx_codebase_ast_skeletons (file_path, file_sha256);

-- ------------------------------------------------------------------------------
-- 2. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.galx_codebase_ast_skeletons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_codebase_ast_skeletons FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_ast_skeletons" ON public.galx_codebase_ast_skeletons
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "public_read_ast_skeletons" ON public.galx_codebase_ast_skeletons
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 3. ATOMIC STORED PROCEDURE: rpc_upsert_ast_skeleton
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_upsert_ast_skeleton(
  p_file_path VARCHAR(255),
  p_file_sha256 VARCHAR(64),
  p_language VARCHAR(32),
  p_skeleton_content TEXT,
  p_raw_tokens INTEGER,
  p_skeleton_tokens INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_saved INTEGER := GREATEST(0, p_raw_tokens - p_skeleton_tokens);
  v_ratio NUMERIC(5, 2) := 0.00;
  v_result RECORD;
BEGIN
  IF p_raw_tokens > 0 THEN
    v_ratio := ROUND(((v_saved::NUMERIC / p_raw_tokens) * 100.0), 2);
  END IF;

  INSERT INTO public.galx_codebase_ast_skeletons (
    file_path, file_sha256, language, skeleton_content,
    raw_tokens, skeleton_tokens, token_reduction_pct, hit_count,
    created_at, updated_at
  ) VALUES (
    p_file_path, p_file_sha256, p_language, p_skeleton_content,
    p_raw_tokens, p_skeleton_tokens, v_ratio, 1,
    v_now, v_now
  )
  ON CONFLICT (file_path) DO UPDATE SET
    file_sha256 = EXCLUDED.file_sha256,
    language = EXCLUDED.language,
    skeleton_content = EXCLUDED.skeleton_content,
    raw_tokens = EXCLUDED.raw_tokens,
    skeleton_tokens = EXCLUDED.skeleton_tokens,
    token_reduction_pct = v_ratio,
    hit_count = public.galx_codebase_ast_skeletons.hit_count + 1,
    updated_at = v_now
  RETURNING * INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'file_path', v_result.file_path,
    'file_sha256', v_result.file_sha256,
    'raw_tokens', v_result.raw_tokens,
    'skeleton_tokens', v_result.skeleton_tokens,
    'token_reduction_pct', v_result.token_reduction_pct,
    'updated_at', v_result.updated_at
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC STORED PROCEDURE: rpc_fetch_ast_skeletons_batch
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_fetch_ast_skeletons_batch(
  p_file_paths VARCHAR(255)[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_skeletons JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'file_path', file_path,
      'file_sha256', file_sha256,
      'language', language,
      'skeleton_content', skeleton_content,
      'skeleton_tokens', skeleton_tokens,
      'token_reduction_pct', token_reduction_pct
    )
  )
  INTO v_skeletons
  FROM public.galx_codebase_ast_skeletons
  WHERE file_path = ANY(p_file_paths);

  RETURN jsonb_build_object(
    'success', true,
    'count', jsonb_array_length(COALESCE(v_skeletons, '[]'::jsonb)),
    'skeletons', COALESCE(v_skeletons, '[]'::jsonb)
  );
END;
$$;
