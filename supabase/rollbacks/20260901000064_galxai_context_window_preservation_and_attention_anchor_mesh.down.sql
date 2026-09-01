-- ==============================================================================
-- ROLLBACK: 20260901000064_galxai_context_window_preservation_and_attention_anchor_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_session_working_context(VARCHAR(64));
DROP FUNCTION IF EXISTS public.rpc_upsert_session_attention_anchor(VARCHAR(64), VARCHAR(64), TEXT, TEXT[], JSONB, INTEGER);

DROP TABLE IF EXISTS public.galx_session_attention_anchors CASCADE;
