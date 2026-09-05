-- Rollback for 20260905093500_galxai_user_image_library_and_batch_buffer.sql

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';

DROP FUNCTION IF EXISTS public.fn_ack_image_library_gc(TEXT[]);
DROP FUNCTION IF EXISTS public.fn_batch_mutate_image_library(TEXT, TEXT[], TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.fn_query_user_image_library(TEXT, INTEGER, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.fn_get_user_image_library_stats(TEXT);
DROP FUNCTION IF EXISTS public.fn_batch_upsert_image_library(JSONB);

DROP INDEX IF EXISTS public.idx_user_image_library_aspect_ratio;
DROP INDEX IF EXISTS public.idx_user_image_library_favorite;
DROP INDEX IF EXISTS public.idx_user_image_library_session;
DROP INDEX IF EXISTS public.idx_user_image_library_feed;
DROP INDEX IF EXISTS public.idx_image_library_gc_outbox_enqueued;

DROP POLICY IF EXISTS policy_user_image_library_insert_owner ON public.user_image_library;
DROP POLICY IF EXISTS policy_user_image_library_delete_owner ON public.user_image_library;
DROP POLICY IF EXISTS policy_user_image_library_update_owner ON public.user_image_library;
DROP POLICY IF EXISTS policy_user_image_library_select_owner ON public.user_image_library;

DROP TABLE IF EXISTS public.user_image_library;
DROP TABLE IF EXISTS public.image_library_gc_outbox;
