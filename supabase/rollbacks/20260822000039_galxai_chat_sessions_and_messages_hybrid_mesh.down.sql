-- Rollback: 20260822000039_galxai_chat_sessions_and_messages_hybrid_mesh
DROP FUNCTION IF EXISTS public.galx_delete_chat_conversation CASCADE;
DROP FUNCTION IF EXISTS public.galx_sync_chat_session CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_conversations CASCADE;
