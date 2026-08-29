-- Rollback: 20260822000042_galxai_chat_unified_personas_and_stream_tap_apex
DROP FUNCTION IF EXISTS public.fn_get_chat_delta_sync(TEXT, TEXT, BIGINT, TEXT) CASCADE;
