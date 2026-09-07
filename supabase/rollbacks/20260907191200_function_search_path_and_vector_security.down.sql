-- Restore the exact prior search-path configuration and extension location.
-- This rollback reinstates the advisor warnings; use only for compatibility recovery.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER FUNCTION public.fn_acquire_distributed_lock(character varying,character varying,bigint,bigint) RESET search_path;
ALTER FUNCTION public.fn_batch_commit_task_attempts_cf(jsonb) RESET search_path;
ALTER FUNCTION public.fn_batch_draw_wallet_tokens_cf(jsonb) RESET search_path;
ALTER FUNCTION public.fn_batch_record_telemetry_cf(jsonb) RESET search_path;
ALTER FUNCTION public.fn_cleanup_expired_sessions(bigint) RESET search_path;
ALTER FUNCTION public.fn_format_rolling_duration(bigint) RESET search_path;
ALTER FUNCTION public.fn_galx_set_updated_at() RESET search_path;
ALTER FUNCTION public.fn_hybrid_vector_search(text,extensions.vector,uuid,character varying,numeric,integer) RESET search_path;
ALTER FUNCTION public.fn_idempotency_begin(character varying,character varying,character varying,character varying,bigint) RESET search_path;
ALTER FUNCTION public.fn_idempotency_commit(character varying,integer,jsonb,jsonb) RESET search_path;
ALTER FUNCTION public.fn_lease_queue_tasks_batch_cf(character varying,character varying,integer,bigint,bigint) RESET search_path;
ALTER FUNCTION public.fn_release_distributed_lock(character varying,character varying,bigint) RESET search_path;
ALTER FUNCTION public.fn_validate_api_key_access_ultra(character varying,character varying,character varying) RESET search_path;
ALTER FUNCTION public.fn_vector_search(extensions.vector,uuid,character varying,numeric,integer) RESET search_path;

ALTER EXTENSION vector SET SCHEMA public;
NOTIFY pgrst, 'reload schema';
