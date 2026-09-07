-- Resolve 14 mutable function search paths and relocate pgvector out of public.
-- Trusted schemas only; pg_catalog first and pg_temp explicitly last prevent
-- caller search paths and temporary relations from shadowing application objects.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $vector_schema$
DECLARE v_schema text;
BEGIN
  SELECT n.nspname INTO STRICT v_schema
  FROM pg_catalog.pg_extension e
  JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'vector';
  IF v_schema = 'public' THEN
    ALTER EXTENSION vector SET SCHEMA extensions;
  ELSIF v_schema <> 'extensions' THEN
    RAISE EXCEPTION 'Unexpected vector extension schema: %', v_schema;
  END IF;
END;
$vector_schema$;

ALTER FUNCTION public.fn_acquire_distributed_lock(character varying,character varying,bigint,bigint) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_batch_commit_task_attempts_cf(jsonb) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_batch_draw_wallet_tokens_cf(jsonb) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_batch_record_telemetry_cf(jsonb) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_cleanup_expired_sessions(bigint) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_format_rolling_duration(bigint) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_galx_set_updated_at() SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_hybrid_vector_search(text,extensions.vector,uuid,character varying,numeric,integer) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.fn_idempotency_begin(character varying,character varying,character varying,character varying,bigint) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_idempotency_commit(character varying,integer,jsonb,jsonb) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_lease_queue_tasks_batch_cf(character varying,character varying,integer,bigint,bigint) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_release_distributed_lock(character varying,character varying,bigint) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_validate_api_key_access_ultra(character varying,character varying,character varying) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_vector_search(extensions.vector,uuid,character varying,numeric,integer) SET search_path = pg_catalog, public, extensions, pg_temp;

-- Refresh RPC argument type metadata after the extension relocation.
NOTIFY pgrst, 'reload schema';
