-- ROLLBACK: Migration 50 (Atomic Turn Pairs and Stable Cache Mesh)
DROP FUNCTION IF EXISTS public.fn_get_atomic_rolling_context(VARCHAR, VARCHAR, INT);
ALTER TABLE public.galx_chat_rolling_memory 
    DROP COLUMN IF EXISTS stable_cache_hash,
    DROP COLUMN IF EXISTS atomic_turn_boundary,
    DROP COLUMN IF EXISTS code_diff_manifest;
