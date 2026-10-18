-- Private operator guard, not an application migration or a data rewrite.
-- The caller owns BEGIN/COMMIT and verifies the exact hosted project over TLS.
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '30s';
DO $guard$
BEGIN
  IF current_user <> 'postgres' OR current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'Unexpected maintenance target';
  END IF;
  IF to_regprocedure('private.galx_retired_source_guard_20261017()') IS NOT NULL
     OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='galx_source_retired_20261017') THEN
    RAISE EXCEPTION 'Existing write guard requires phase inspection';
  END IF;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public','private','auth','galx_account_auth','supabase_migrations','extensions')
        AND c.relkind IN ('r','p')) <> 196 THEN
    RAISE EXCEPTION 'Unexpected source table inventory';
  END IF;
END
$guard$;
CREATE FUNCTION private.galx_retired_source_guard_20261017() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $body$
BEGIN
  RAISE EXCEPTION USING ERRCODE='25006', MESSAGE='Service is temporarily unavailable.';
END
$body$;
REVOKE ALL ON FUNCTION private.galx_retired_source_guard_20261017() FROM PUBLIC;
COMMENT ON FUNCTION private.galx_retired_source_guard_20261017() IS 'GALX central source retirement guard 2026-10-17; remove from native restore only';
DO $install$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','private','auth','galx_account_auth','supabase_migrations','extensions')
      AND c.relkind IN ('r','p')
      -- Supabase protects only its platform Auth version marker from TRIGGER.
      -- It carries no account/session/application data and is checked separately.
      AND NOT (n.nspname='auth' AND c.relname='schema_migrations')
    ORDER BY n.nspname,c.relname
  LOOP
    EXECUTE format('CREATE TRIGGER galx_source_retired_20261017 BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON %I.%I FOR EACH STATEMENT EXECUTE FUNCTION private.galx_retired_source_guard_20261017()',item.nspname,item.relname);
  END LOOP;
END
$install$;
