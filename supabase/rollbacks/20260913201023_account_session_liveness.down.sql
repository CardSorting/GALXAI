-- Roll back dependent application code first. No account or session data is removed.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '10s';
DROP FUNCTION IF EXISTS public.fn_account_session_active();
DROP FUNCTION IF EXISTS private.galx_account_session_active();
-- Preserve existing schema USAGE: other private functions may depend on it.
