-- Restore the previous dependency without reopening the operational schema.
-- This fails closed while authenticated lacks private USAGE; it is not an
-- availability recovery. Reapply UP to restore account entry. No data is erased.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '10s';
DO $migration$
BEGIN
  IF to_regprocedure('galx_account_auth.galx_account_session_active()') IS NOT NULL THEN
    ALTER FUNCTION galx_account_auth.galx_account_session_active() SET SCHEMA private;
  END IF;
END;
$migration$;
CREATE OR REPLACE FUNCTION public.fn_account_session_active()
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $function$
  SELECT private.galx_account_session_active();
$function$;
REVOKE ALL ON FUNCTION public.fn_account_session_active() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_account_session_active() TO authenticated;
REVOKE ALL ON SCHEMA galx_account_auth FROM PUBLIC, anon, authenticated, service_role;
