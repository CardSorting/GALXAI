-- ROLLBACK: Migration 47 (Semantic Entity Memory and Chunk Mesh)
DROP FUNCTION IF EXISTS public.fn_get_semantic_rolling_context(VARCHAR, VARCHAR, INT);
DROP FUNCTION IF EXISTS public.fn_upsert_semantic_rolling_memory(VARCHAR, VARCHAR, TEXT, INT, VARCHAR, JSONB, JSONB, JSONB, JSONB, INT, VARCHAR);
DROP TABLE IF EXISTS public.galx_chat_document_chunks CASCADE;
ALTER TABLE public.galx_chat_rolling_memory 
    DROP COLUMN IF EXISTS user_profile,
    DROP COLUMN IF EXISTS active_decisions,
    DROP COLUMN IF EXISTS file_index,
    DROP COLUMN IF EXISTS pending_tasks,
    DROP COLUMN IF EXISTS cache_hash;
