-- ==============================================================================
-- ROLLBACK: 20260901000065_galxai_semantic_ast_skeletons_and_context_pyramid_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_fetch_ast_skeletons_batch(VARCHAR(255)[]);
DROP FUNCTION IF EXISTS public.rpc_upsert_ast_skeleton(VARCHAR(255), VARCHAR(64), VARCHAR(32), TEXT, INTEGER, INTEGER);

DROP TABLE IF EXISTS public.galx_codebase_ast_skeletons CASCADE;
