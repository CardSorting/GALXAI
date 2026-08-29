-- Rollback: 20260822000041_galxai_chat_delta_sync_and_etag_apex
DROP FUNCTION IF EXISTS public.fn_get_chat_delta_sync(TEXT, TEXT, BIGINT, TEXT) CASCADE;
