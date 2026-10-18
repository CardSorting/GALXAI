-- Native restore cleanup. Source thaw additionally requires explicit pre-write approval.
-- Do not run on a source after any local authority has accepted writes.
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '30s';
DO $guard$
DECLARE item record; function_id oid;
BEGIN
  IF current_database() <> 'galxai' AND NOT (
       current_database()='postgres'
       AND coalesce(current_setting('galx.cutover.allow_source_thaw',true),'')='owner-approved-before-local-writes') THEN
    RAISE EXCEPTION 'Write guard removal is not authorized for this target';
  END IF;
  function_id := to_regprocedure('private.galx_retired_source_guard_20261017()');
  IF function_id IS NULL THEN RAISE EXCEPTION 'Expected source write guard is missing'; END IF;
  IF (SELECT count(*) FROM pg_trigger WHERE tgname='galx_source_retired_20261017' AND tgfoid=function_id) <> 195 THEN
    RAISE EXCEPTION 'Source write guard inventory differs';
  END IF;
  IF current_database()='postgres' THEN
    -- TRIGGER grants permit installation on Auth tables, but Supabase reserves
    -- their ownership. The operator owns this function and can disarm it without
    -- dropping platform-owned triggers. A statement trigger's return is ignored.
    EXECUTE $sql$CREATE OR REPLACE FUNCTION private.galx_retired_source_guard_20261017() RETURNS trigger
      LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
      BEGIN RETURN NULL; END
      $fn$$sql$;
  ELSE
    -- Native peer-authenticated maintenance is a local cluster administrator.
    FOR item IN
      SELECT n.nspname,c.relname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE t.tgname='galx_source_retired_20261017' AND t.tgfoid=function_id
      ORDER BY n.nspname,c.relname
    LOOP
      EXECUTE format('DROP TRIGGER galx_source_retired_20261017 ON %I.%I',item.nspname,item.relname);
    END LOOP;
    EXECUTE 'DROP FUNCTION private.galx_retired_source_guard_20261017() RESTRICT';
  END IF;
END
$guard$;
