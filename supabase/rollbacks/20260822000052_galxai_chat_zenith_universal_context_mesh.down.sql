-- ROLLBACK: Migration 52 (Zenith Universal Context Mesh)
DROP FUNCTION IF EXISTS public.fn_get_zenith_universal_context(VARCHAR, VARCHAR, INT);
DROP TABLE IF EXISTS public.galx_chat_universal_workspace_anchors CASCADE;
