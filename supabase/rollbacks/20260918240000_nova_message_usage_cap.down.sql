-- Rollback only with an explicit maintenance window after all reservations are settled.
DROP FUNCTION IF EXISTS public.fn_release_nova_message(text, text);
DROP FUNCTION IF EXISTS public.fn_commit_nova_message(text, text);
DROP FUNCTION IF EXISTS public.fn_reserve_nova_message(text, text, bigint, bigint);
DROP TABLE IF EXISTS private.galx_nova_message_reservations;
DROP TABLE IF EXISTS private.galx_nova_message_usage_periods;
