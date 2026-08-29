-- ROLLBACK: Migration 46 (Chat Hybrid Rolling Context Mesh)
DROP FUNCTION IF EXISTS public.fn_get_hybrid_rolling_context(VARCHAR, VARCHAR, INT);
DROP FUNCTION IF EXISTS public.fn_upsert_chat_rolling_memory(VARCHAR, VARCHAR, TEXT, INT, VARCHAR, JSONB, INT);
DROP TABLE IF EXISTS public.galx_chat_rolling_memory CASCADE;
