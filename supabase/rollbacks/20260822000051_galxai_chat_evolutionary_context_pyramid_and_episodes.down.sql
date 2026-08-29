-- ROLLBACK: Migration 51 (Evolutionary Context Pyramid and Episodes)
DROP FUNCTION IF EXISTS public.fn_get_evolutionary_pyramid_context(VARCHAR, INT, INT);
DROP FUNCTION IF EXISTS public.fn_upsert_context_episode(VARCHAR, INT, INT, INT, VARCHAR, TEXT, JSONB, JSONB, INT, INT);
DROP TABLE IF EXISTS public.galx_chat_context_episodes CASCADE;
