-- Active account authority after Auth logout. No user/session inventory is exposed.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '10s';

CREATE OR REPLACE FUNCTION private.galx_account_session_active()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_claims jsonb := auth.jwt();
  v_session text := v_claims ->> 'session_id';
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR v_claims ->> 'role' IS DISTINCT FROM 'authenticated'
     OR v_claims ->> 'is_anonymous' = 'true'
     OR v_session IS NULL
     OR v_session !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM auth.sessions AS s
    JOIN auth.users AS u ON u.id = s.user_id
    WHERE s.id = v_session::uuid AND s.user_id = v_user
      AND NOT COALESCE(u.is_anonymous, false)
      AND (s.not_after IS NULL OR s.not_after > statement_timestamp())
  );
END;
$function$;
REVOKE ALL ON FUNCTION private.galx_account_session_active() FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.galx_account_session_active() TO authenticated;

-- Invoker wrapper: PostgREST authenticates the caller; the private lookup binds
-- both session_id and owner to those claims. There are no caller-supplied IDs.
CREATE OR REPLACE FUNCTION public.fn_account_session_active()
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $function$
  SELECT private.galx_account_session_active();
$function$;
REVOKE ALL ON FUNCTION public.fn_account_session_active() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_account_session_active() TO authenticated;
