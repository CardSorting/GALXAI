-- Safe disable rollback: retain identities, assignments, outcomes and constraints.
-- Deliberately does not drop tables or reopen any legacy credential authority.
SET LOCAL lock_timeout = '5s';
REVOKE ALL ON private.galx_relay_pools,private.galx_relay_installations,
  private.galx_relay_account_assignments,private.galx_relay_registration_operations
  FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer;
REVOKE ALL ON FUNCTION private.guard_relay_foundation() FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer;
-- Registration was never activated by the UP migration. Fail rather than pretend
-- this rollback can safely reverse a later activation without its paired rollback.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM private.galx_relay_pools WHERE registration_enabled) THEN
    RAISE EXCEPTION 'Roll back relay activation before the foundation' USING ERRCODE='55000';
  END IF;
END $$;
