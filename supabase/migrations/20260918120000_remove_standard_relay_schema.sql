-- Remove GALX Relay Standard from the live control-plane schema.
-- Historical migration files remain immutable audit records; this migration
-- removes the retired pool, its owned control-plane data, and its live
-- function/constraint references.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SET CONSTRAINTS ALL DEFERRED;

CREATE TEMP TABLE _retired_standard_accounts ON COMMIT DROP AS
  SELECT DISTINCT account_id
  FROM private.galx_relay_account_assignments
  WHERE pool_id='standard'
  UNION
  SELECT id AS account_id
  FROM public.galx_shard_accounts
  WHERE relay_pool_id='standard';
CREATE TEMP TABLE _retired_standard_installations ON COMMIT DROP AS
  SELECT id
  FROM private.galx_relay_installations
  WHERE pool_id='standard';
CREATE TEMP TABLE _retired_standard_leases ON COMMIT DROP AS
  SELECT lease_id
  FROM private.galx_relay_lease_bindings
  WHERE pool_id='standard';

-- The relay history guards intentionally protect ordinary operators from
-- deletion. This migration is the reviewed retirement authority.
ALTER TABLE private.galx_relay_control_operations DISABLE TRIGGER USER;
ALTER TABLE private.galx_relay_management_operations DISABLE TRIGGER USER;
ALTER TABLE private.galx_relay_lease_bindings DISABLE TRIGGER USER;
ALTER TABLE private.galx_relay_installations DISABLE TRIGGER USER;
ALTER TABLE private.galx_relay_pools DISABLE TRIGGER USER;
ALTER TABLE private.galx_relay_account_assignments DISABLE TRIGGER USER;
ALTER TABLE private.galx_relay_registration_operations DISABLE TRIGGER USER;

DELETE FROM private.galx_relay_control_operations
WHERE pool_id='standard';
DELETE FROM private.galx_relay_management_operations
WHERE pool_id='standard';
DELETE FROM private.galx_relay_lease_bindings
WHERE pool_id='standard';
-- Keep the shared public lease rows as immutable audit evidence. Removing the
-- private relay binding is sufficient to eliminate the retired pool from the
-- relay schema without violating the global lease ledger's retention guard.
DELETE FROM private.galx_relay_account_control
WHERE account_id IN (SELECT account_id FROM _retired_standard_accounts);
DELETE FROM private.galx_relay_registrations
WHERE pool_id='standard';
DELETE FROM private.galx_relay_account_assignments
WHERE pool_id='standard';
DELETE FROM private.galx_relay_registration_operations
WHERE pool_id='standard';
DELETE FROM private.galx_relay_installation_runtime
WHERE installation_id IN (SELECT id FROM _retired_standard_installations);
DELETE FROM private.galx_relay_principals
WHERE pool_id='standard';
DELETE FROM private.galx_relay_installations
WHERE pool_id='standard';

-- These revoked/retracted account rows still own immutable public lease
-- evidence. Preserve the accounts and their evidence, but remove the retired
-- pool marker so the public registry no longer references Standard.
ALTER TABLE public.galx_shard_accounts DISABLE TRIGGER USER;
UPDATE public.galx_shard_accounts
SET relay_pool_id=NULL
WHERE relay_pool_id='standard';

DELETE FROM private.galx_relay_pools
WHERE id='standard';

-- Flush deferred foreign-key events before changing trigger state. PostgreSQL
-- rejects ALTER TABLE while the transaction still has pending trigger work.
SET CONSTRAINTS ALL IMMEDIATE;

ALTER TABLE private.galx_relay_control_operations ENABLE TRIGGER USER;
ALTER TABLE private.galx_relay_management_operations ENABLE TRIGGER USER;
ALTER TABLE private.galx_relay_lease_bindings ENABLE TRIGGER USER;
ALTER TABLE private.galx_relay_installations ENABLE TRIGGER USER;
ALTER TABLE private.galx_relay_pools ENABLE TRIGGER USER;
ALTER TABLE private.galx_relay_account_assignments ENABLE TRIGGER USER;
ALTER TABLE private.galx_relay_registration_operations ENABLE TRIGGER USER;
ALTER TABLE public.galx_shard_accounts ENABLE TRIGGER USER;

ALTER TABLE private.galx_relay_pools DROP CONSTRAINT IF EXISTS galx_relay_pool_capabilities;
ALTER TABLE private.galx_relay_pools DROP CONSTRAINT IF EXISTS galx_relay_pools_id_check;
ALTER TABLE private.galx_relay_pools
  ADD CONSTRAINT galx_relay_pools_id_check CHECK (id='premium'),
  ADD CONSTRAINT galx_relay_pool_capabilities CHECK (
    id='premium' AND account_class='paid' AND workloads=ARRAY['text','sites','images']::text[]
  );

-- Replace only the two live relay functions whose bodies still encode the
-- retired branch. CREATE OR REPLACE preserves their existing grants/security.
DO $migration$
DECLARE
  definition text;
  original text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO definition
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='private' AND p.proname='relay_configure_installation_before_automatic'
    AND pg_get_function_identity_arguments(p.oid)='p_pool text, p_installation uuid, p_host uuid, p_principals jsonb, p_registration boolean, p_execution boolean, p_evidence_sha256 text';
  IF definition IS NULL THEN RAISE EXCEPTION 'Relay installation function is missing'; END IF;
  original:=definition;
  definition:=replace(definition,$find$p_pool NOT IN ('premium','standard')$find$,$replace$p_pool <> 'premium'$replace$);
  IF definition=original THEN RAISE EXCEPTION 'Relay installation function did not contain the retired pool guard'; END IF;
  EXECUTE definition;

  SELECT pg_get_functiondef(p.oid) INTO definition
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='private' AND p.proname='relay_control_before_connections'
    AND pg_get_function_identity_arguments(p.oid)='p_token_sha256 text, p_action text, p_body jsonb';
  IF definition IS NULL THEN RAISE EXCEPTION 'Relay control function is missing'; END IF;
  original:=definition;
  definition:=replace(definition,$find$OR (p.pool_id='standard' AND p_body->>'workload'<>'text')$find$,$replace$$replace$);
  IF definition=original THEN RAISE EXCEPTION 'Relay control function did not contain the retired workload guard'; END IF;
  EXECUTE definition;
END $migration$;

COMMENT ON TABLE private.galx_relay_pools IS
  'Premium-only relay control-plane metadata.';
