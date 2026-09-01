-- ==============================================================================
-- ROLLBACK: 20260901000062_galxai_prompt_compaction_and_semantic_cache_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_lookup_or_register_compact_prompt(VARCHAR(64), INTEGER, INTEGER, JSONB);
DROP TABLE IF EXISTS public.galx_prompt_compaction_cache CASCADE;
