-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: CONTEXT WINDOW PRESERVATION & ATTENTION ANCHOR MESH
-- Migration: 20260901000064_galxai_context_window_preservation_and_attention_anchor_mesh.sql
-- Description:
--   Implements lost-in-the-middle attention anchoring & atomic turn-pair context persistence:
--   1. Session Attention Anchor Table (galx_session_attention_anchors).
--   2. Atomic Upsert & Retrieval RPCs (rpc_upsert_session_attention_anchor, rpc_get_session_working_context).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: galx_session_attention_anchors
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_session_attention_anchors (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('anc_' || gen_random_uuid()::text),
  session_id VARCHAR(64) NOT NULL UNIQUE,
  user_id VARCHAR(64) NOT NULL DEFAULT 'usr_anonymous',
  working_memory_summary TEXT NOT NULL DEFAULT '',
  pinned_entity_keys TEXT[] NOT NULL DEFAULT '{}',
  active_tool_contracts JSONB NOT NULL DEFAULT '[]'::jsonb,
  token_budget_allocated INTEGER NOT NULL DEFAULT 4096,
  attention_hoist_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_session_attention_anchors_user
  ON public.galx_session_attention_anchors (user_id, updated_at DESC);

-- ------------------------------------------------------------------------------
-- 2. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.galx_session_attention_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_session_attention_anchors FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_attention_anchors" ON public.galx_session_attention_anchors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_manage_own_attention_anchors" ON public.galx_session_attention_anchors
  FOR ALL TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- ------------------------------------------------------------------------------
-- 3. ATOMIC STORED PROCEDURE: rpc_upsert_session_attention_anchor
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_upsert_session_attention_anchor(
  p_session_id VARCHAR(64),
  p_user_id VARCHAR(64),
  p_working_memory_summary TEXT,
  p_pinned_entity_keys TEXT[],
  p_active_tool_contracts JSONB,
  p_token_budget_allocated INTEGER DEFAULT 4096
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_result RECORD;
BEGIN
  INSERT INTO public.galx_session_attention_anchors (
    session_id, user_id, working_memory_summary, pinned_entity_keys,
    active_tool_contracts, token_budget_allocated, attention_hoist_active,
    created_at, updated_at
  ) VALUES (
    p_session_id, p_user_id, p_working_memory_summary, p_pinned_entity_keys,
    p_active_tool_contracts, p_token_budget_allocated, true,
    v_now, v_now
  )
  ON CONFLICT (session_id) DO UPDATE SET
    working_memory_summary = EXCLUDED.working_memory_summary,
    pinned_entity_keys = EXCLUDED.pinned_entity_keys,
    active_tool_contracts = EXCLUDED.active_tool_contracts,
    token_budget_allocated = EXCLUDED.token_budget_allocated,
    updated_at = v_now
  RETURNING * INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_result.session_id,
    'working_memory_summary', v_result.working_memory_summary,
    'pinned_entity_keys', v_result.pinned_entity_keys,
    'token_budget_allocated', v_result.token_budget_allocated,
    'updated_at', v_result.updated_at
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC STORED PROCEDURE: rpc_get_session_working_context
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_get_session_working_context(
  p_session_id VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT * INTO v_record
  FROM public.galx_session_attention_anchors
  WHERE session_id = p_session_id;

  IF v_record IS NULL THEN
    RETURN jsonb_build_object('found', false, 'session_id', p_session_id);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'session_id', v_record.session_id,
    'user_id', v_record.user_id,
    'working_memory_summary', v_record.working_memory_summary,
    'pinned_entity_keys', v_record.pinned_entity_keys,
    'active_tool_contracts', v_record.active_tool_contracts,
    'token_budget_allocated', v_record.token_budget_allocated,
    'updated_at', v_record.updated_at
  );
END;
$$;
