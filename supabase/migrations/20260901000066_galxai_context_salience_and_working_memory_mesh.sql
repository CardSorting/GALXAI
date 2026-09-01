-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: CONTEXT SALIENCE & WORKING MEMORY MESH
-- Migration: 20260901000066_galxai_context_salience_and_working_memory_mesh.sql
-- Description:
--   Implements information-theoretic context salience scoring & hierarchical working memory:
--   1. Context Salience Scores Table (galx_context_salience_scores).
--   2. Atomic Batch Upsert & Salience-Ranked Fetch RPCs (rpc_batch_upsert_salience_scores, rpc_fetch_high_salience_context_window).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: galx_context_salience_scores
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_context_salience_scores (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('sal_' || gen_random_uuid()::text),
  message_id VARCHAR(64) NOT NULL UNIQUE,
  conversation_id VARCHAR(64) NOT NULL,
  salience_score NUMERIC(5, 4) NOT NULL DEFAULT 0.5000 CHECK (salience_score >= 0.0000 AND salience_score <= 1.0000),
  entity_count INTEGER NOT NULL DEFAULT 0,
  is_pinned_invariant BOOLEAN NOT NULL DEFAULT false,
  compressed_summary TEXT NOT NULL DEFAULT '',
  token_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_salience_conv_score
  ON public.galx_context_salience_scores (conversation_id, salience_score DESC);

-- ------------------------------------------------------------------------------
-- 2. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.galx_context_salience_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_context_salience_scores FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_salience_scores" ON public.galx_context_salience_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "public_read_salience_scores" ON public.galx_context_salience_scores
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 3. ATOMIC STORED PROCEDURE: rpc_batch_upsert_salience_scores
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_batch_upsert_salience_scores(
  p_conversation_id VARCHAR(64),
  p_message_ids VARCHAR(64)[],
  p_salience_scores NUMERIC(5, 4)[],
  p_entity_counts INTEGER[],
  p_is_pinned BOOLEAN[],
  p_token_counts INTEGER[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_len INTEGER;
  i INTEGER;
BEGIN
  v_len := array_length(p_message_ids, 1);
  IF v_len IS NULL OR v_len = 0 THEN
    RETURN jsonb_build_object('success', true, 'count', 0);
  END IF;

  FOR i IN 1..v_len LOOP
    INSERT INTO public.galx_context_salience_scores (
      message_id, conversation_id, salience_score, entity_count,
      is_pinned_invariant, token_count, created_at, updated_at
    ) VALUES (
      p_message_ids[i],
      p_conversation_id,
      p_salience_scores[i],
      p_entity_counts[i],
      p_is_pinned[i],
      p_token_counts[i],
      v_now,
      v_now
    )
    ON CONFLICT (message_id) DO UPDATE SET
      salience_score = EXCLUDED.salience_score,
      entity_count = EXCLUDED.entity_count,
      is_pinned_invariant = EXCLUDED.is_pinned_invariant,
      token_count = EXCLUDED.token_count,
      updated_at = v_now;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', p_conversation_id,
    'count', v_len
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC STORED PROCEDURE: rpc_fetch_high_salience_context_window
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_fetch_high_salience_context_window(
  p_conversation_id VARCHAR(64),
  p_min_salience NUMERIC(5, 4) DEFAULT 0.6000,
  p_max_token_budget INTEGER DEFAULT 8192
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_messages JSONB;
  v_total_tokens INTEGER := 0;
BEGIN
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'message_id', message_id,
        'salience_score', salience_score,
        'entity_count', entity_count,
        'is_pinned', is_pinned_invariant,
        'token_count', token_count
      ) ORDER BY is_pinned_invariant DESC, salience_score DESC
    ),
    COALESCE(SUM(token_count), 0)
  INTO v_messages, v_total_tokens
  FROM public.galx_context_salience_scores
  WHERE conversation_id = p_conversation_id
    AND (salience_score >= p_min_salience OR is_pinned_invariant = true);

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', p_conversation_id,
    'total_tokens', v_total_tokens,
    'messages', COALESCE(v_messages, '[]'::jsonb)
  );
END;
$$;
