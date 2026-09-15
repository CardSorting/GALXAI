-- Main GALXAI project only. Additive, dormant foundation: no account migration,
-- executable enrollment API, runtime grants, credential copies or lease changes.
SET LOCAL lock_timeout = '5s';
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.galx_relay_pools (
  id text PRIMARY KEY CHECK (id IN ('premium','standard')),
  account_class text NOT NULL,
  workloads text[] NOT NULL,
  registration_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT galx_relay_pool_capabilities CHECK (
    (id='premium' AND account_class='paid' AND workloads=ARRAY['text','sites','images']::text[]) OR
    (id='standard' AND account_class='free' AND workloads=ARRAY['text']::text[])
  ),
  -- A later reviewed migration must open this after scoped enrollment/admission exists.
  CONSTRAINT galx_relay_registration_not_activated CHECK (registration_enabled=false)
);
INSERT INTO private.galx_relay_pools(id,account_class,workloads)
VALUES ('premium','paid',ARRAY['text','sites','images']),('standard','free',ARRAY['text'])
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS private.galx_relay_installations (
  id uuid PRIMARY KEY,
  pool_id text NOT NULL REFERENCES private.galx_relay_pools(id) ON DELETE RESTRICT,
  host_id uuid NOT NULL UNIQUE,
  generation bigint NOT NULL DEFAULT 1 CHECK (generation > 0),
  state text NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved','retired')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (id,pool_id)
);
CREATE INDEX IF NOT EXISTS galx_relay_installations_pool_idx ON private.galx_relay_installations(pool_id);
CREATE UNIQUE INDEX IF NOT EXISTS galx_relay_installations_reserved_pool_idx
  ON private.galx_relay_installations(pool_id) WHERE state='reserved';

CREATE TABLE IF NOT EXISTS private.galx_relay_account_assignments (
  account_id varchar(64) PRIMARY KEY REFERENCES public.galx_shard_accounts(id) ON DELETE RESTRICT,
  pool_id text NOT NULL REFERENCES private.galx_relay_pools(id) ON DELETE RESTRICT,
  installation_id uuid NOT NULL,
  managed_desktop_id uuid NOT NULL UNIQUE,
  registration_operation_id uuid NOT NULL UNIQUE,
  assignment_revision bigint NOT NULL DEFAULT 1 CHECK (assignment_revision > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (installation_id,pool_id) REFERENCES private.galx_relay_installations(id,pool_id) ON DELETE RESTRICT,
  UNIQUE (account_id,pool_id,installation_id,registration_operation_id)
);
CREATE INDEX IF NOT EXISTS galx_relay_assignments_pool_idx ON private.galx_relay_account_assignments(pool_id,account_id);
CREATE INDEX IF NOT EXISTS galx_relay_assignments_installation_idx ON private.galx_relay_account_assignments(installation_id,pool_id);

CREATE TABLE IF NOT EXISTS private.galx_relay_registration_operations (
  id uuid PRIMARY KEY,
  account_id varchar(64) NOT NULL,
  pool_id text NOT NULL,
  installation_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[a-f0-9]{64}$'),
  outcome text NOT NULL DEFAULT 'registered' CHECK (outcome='registered'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  -- The saved result and assignment must name exactly the same operation and scope.
  FOREIGN KEY (account_id,pool_id,installation_id,id)
    REFERENCES private.galx_relay_account_assignments(account_id,pool_id,installation_id,registration_operation_id)
    ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS galx_relay_operations_account_idx
  ON private.galx_relay_registration_operations(account_id,pool_id,installation_id,id);
CREATE INDEX IF NOT EXISTS galx_relay_operations_pool_created_idx
  ON private.galx_relay_registration_operations(pool_id,created_at DESC,id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='galx_relay_assignment_operation_fkey'
      AND conrelid='private.galx_relay_account_assignments'::regclass) THEN
    ALTER TABLE private.galx_relay_account_assignments ADD CONSTRAINT galx_relay_assignment_operation_fkey
      FOREIGN KEY (registration_operation_id) REFERENCES private.galx_relay_registration_operations(id)
      ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

ALTER TABLE private.galx_relay_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_relay_pools FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_relay_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_relay_installations FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_relay_account_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_relay_account_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_relay_registration_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_relay_registration_operations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_relay_pools,private.galx_relay_installations,
  private.galx_relay_account_assignments,private.galx_relay_registration_operations
  FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer;
-- No runtime or operator login receives grants in this foundation migration.
-- The owning database administrator can inspect it; future scoped service roles
-- need explicit reviewed policies. No caller-supplied GUC is a pool authority.

CREATE OR REPLACE FUNCTION private.guard_relay_foundation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_account public.galx_shard_accounts%ROWTYPE;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE','TRUNCATE') THEN
    RAISE EXCEPTION 'Relay identity and registration history are immutable' USING ERRCODE='42501';
  END IF;
  IF TG_TABLE_NAME IN ('galx_relay_account_assignments','galx_relay_registration_operations') THEN
    IF NOT COALESCE((SELECT registration_enabled FROM private.galx_relay_pools WHERE id=NEW.pool_id),false) THEN
      RAISE EXCEPTION 'Relay registration is not activated' USING ERRCODE='42501';
    END IF;
  END IF;
  IF TG_TABLE_NAME='galx_relay_account_assignments' THEN
    -- Even a future writer must bind to the existing manual desktop authority.
    SELECT * INTO v_account FROM public.galx_shard_accounts WHERE id=NEW.account_id FOR SHARE;
    IF NOT FOUND OR v_account.managed_desktop_id IS DISTINCT FROM NEW.managed_desktop_id
      OR v_account.desktop_enrolled_at IS NULL OR v_account.permission_retracted
      OR v_account.status::text IN ('revoked','dead','quarantined') THEN
      RAISE EXCEPTION 'A current manual desktop enrollment is required' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_relay_foundation() FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer;
DO $$ DECLARE relation text; BEGIN
  FOREACH relation IN ARRAY ARRAY['galx_relay_pools','galx_relay_installations','galx_relay_account_assignments','galx_relay_registration_operations'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS guard_relay_foundation_row ON private.%I',relation);
    EXECUTE format('CREATE TRIGGER guard_relay_foundation_row BEFORE INSERT OR UPDATE OR DELETE ON private.%I FOR EACH ROW EXECUTE FUNCTION private.guard_relay_foundation()',relation);
    EXECUTE format('DROP TRIGGER IF EXISTS guard_relay_foundation_truncate ON private.%I',relation);
    EXECUTE format('CREATE TRIGGER guard_relay_foundation_truncate BEFORE TRUNCATE ON private.%I FOR EACH STATEMENT EXECUTE FUNCTION private.guard_relay_foundation()',relation);
  END LOOP;
END $$;
COMMENT ON TABLE private.galx_relay_pools IS 'Main-project control-plane metadata only. Registration remains disabled until scoped service and lease enforcement are deployed.';
COMMENT ON TABLE private.galx_relay_installations IS 'Central installation reservations. Host IDs are operator inventory, not proof of physical/network isolation.';
COMMENT ON TABLE private.galx_relay_account_assignments IS 'Exclusive, permanent central account assignments. No transfers or relay-local registry authority.';
COMMENT ON TABLE private.galx_relay_registration_operations IS 'Immutable central registration outcomes; no credentials, provider output, or arbitrary result JSON.';
