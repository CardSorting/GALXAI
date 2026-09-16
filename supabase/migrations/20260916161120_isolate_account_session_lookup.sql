-- Keep account liveness independent of the operator-only private schema.
-- No account/session records, authorization predicates or table grants change.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '10s';

CREATE SCHEMA IF NOT EXISTS galx_account_auth;
REVOKE ALL ON SCHEMA galx_account_auth FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA galx_account_auth TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA galx_account_auth REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Move the existing, claim-bound definer without changing its owner or body.
DO $migration$
BEGIN
  IF to_regprocedure('galx_account_auth.galx_account_session_active()') IS NULL THEN
    ALTER FUNCTION private.galx_account_session_active() SET SCHEMA galx_account_auth;
  END IF;
END;
$migration$;
REVOKE ALL ON FUNCTION galx_account_auth.galx_account_session_active() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION galx_account_auth.galx_account_session_active() TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_account_session_active()
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $function$
  SELECT galx_account_auth.galx_account_session_active();
$function$;
REVOKE ALL ON FUNCTION public.fn_account_session_active() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_account_session_active() TO authenticated;
