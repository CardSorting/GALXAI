-- ============================================================================
-- GALXAI: canonical account profiles and compatibility ownership bridge
--
-- The existing owner key remains the compatibility boundary for old records.
-- New private control-plane rows use an opaque profile UUID, while public
-- product tables keep their existing allowlisted owner fields. This is an
-- expand/contract step: application reads can adopt profile_id first, and the
-- legacy owner key can be retired only after an explicit drain and audit.
-- ============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

DO $$ BEGIN
  CREATE TYPE private.galx_account_profile_status AS ENUM ('active', 'suspended', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- One canonical, private row per durable owner key. Auth is an optional
-- identity link; autonomous accounts never need an auth.users row.
CREATE TABLE IF NOT EXISTS private.galx_account_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key TEXT NOT NULL UNIQUE CHECK (length(btrim(owner_key)) BETWEEN 1 AND 255),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  account_class private.galx_account_class NOT NULL DEFAULT 'human',
  status private.galx_account_profile_status NOT NULL DEFAULT 'active',
  display_name TEXT CHECK (display_name IS NULL OR length(btrim(display_name)) BETWEEN 1 AND 120),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  revision BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CHECK ((status = 'archived') = (archived_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS galx_account_profiles_auth_active
  ON private.galx_account_profiles (auth_user_id)
  WHERE auth_user_id IS NOT NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS galx_account_profiles_class_status
  ON private.galx_account_profiles (account_class, status, created_at DESC);

ALTER TABLE private.galx_account_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_account_profiles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_account_profiles FROM PUBLIC, anon, authenticated, service_role;

-- Preferences are a separate one-to-one projection so identity lifecycle and
-- UI settings can evolve independently without a JSONB contract explosion.
CREATE TABLE IF NOT EXISTS private.galx_account_profile_preferences (
  profile_id UUID PRIMARY KEY
    REFERENCES private.galx_account_profiles(id) ON DELETE RESTRICT,
  locale TEXT NOT NULL DEFAULT 'en'
    CHECK (locale IN ('en', 'es', 'zh', 'ja', 'de', 'fr', 'pt', 'ko', 'ar')),
  timezone TEXT NOT NULL DEFAULT 'UTC'
    CHECK (length(btrim(timezone)) BETWEEN 1 AND 80),
  revision BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE private.galx_account_profile_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_account_profile_preferences FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_account_profile_preferences FROM PUBLIC, anon, authenticated, service_role;

-- The identity registry remains the stable legacy bridge, but every identity
-- now points at the canonical profile row.
ALTER TABLE private.galx_account_identities
  ADD COLUMN IF NOT EXISTS profile_id UUID;

-- Register all currently-known owner-key sources before creating profile rows.
-- The list is intentionally explicit: provider credentials and relay account
-- identifiers are not inferred as human ownership merely because they are text.
DO $register_owners$
DECLARE
  source_schema TEXT;
  source_table TEXT;
  owner_column TEXT;
BEGIN
  FOR source_schema, source_table, owner_column IN
    SELECT * FROM (VALUES
      ('public',  'galx_workspace_members', 'user_id'),
      ('public',  'galx_developer_keys', 'user_id'),
      ('public',  'galx_shard_concurrency_leases', 'user_id'),
      ('public',  'galx_tasks', 'user_id'),
      ('public',  'galx_wallets', 'user_id'),
      ('public',  'galx_wallet_transactions', 'user_id'),
      ('public',  'galx_metrics_telemetry', 'user_id'),
      ('public',  'galx_audit_logs', 'user_id'),
      ('public',  'galx_user_sessions', 'user_id'),
      ('public',  'galx_stripe_customers', 'user_id'),
      ('public',  'galx_stripe_checkout_sessions', 'user_id'),
      ('public',  'galx_stripe_invoices', 'user_id'),
      ('public',  'chat_conversations', 'user_id'),
      ('public',  'user_image_library', 'user_id'),
      ('public',  'image_library_gc_outbox', 'user_id'),
      ('public',  'custom_personas', 'user_id'),
      ('public',  'image_generations', 'user_id'),
      ('public',  'galx_chat_rolling_memory', 'user_id'),
      ('public',  'galx_chat_universal_workspace_anchors', 'user_id'),
      ('public',  'galx_chat_context_episodes', 'user_id'),
      ('public',  'galx_chat_document_chunks', 'user_id'),
      ('public',  'galx_chat_memory_graph_edges', 'user_id'),
      ('public',  'galx_seat_rolling_usage_events', 'user_id'),
      ('public',  'galx_seat_rolling_windows_state', 'user_id'),
      ('public',  'galx_seat_request_leases', 'user_id'),
      ('public',  'galx_wallet_holds', 'user_id'),
      ('private', 'galx_plan_checkouts', 'user_id'),
      ('private', 'galx_plan_subscriptions', 'user_id'),
      ('private', 'galx_image_requests', 'user_id'),
      ('private', 'galx_site_workspaces', 'user_id'),
      ('private', 'galx_site_turns', 'user_id'),
      ('private', 'galx_site_versions', 'user_id'),
      ('private', 'galx_site_namespaces', 'user_id'),
      ('private', 'galx_site_domains', 'user_id'),
      ('private', 'developer_access_requests', 'user_id'),
      ('private', 'developer_preview_feedback', 'user_id'),
      ('private', 'preview_admin_members', 'user_id'),
      ('private', 'galx_signup_credit_grants', 'user_id'),
      ('private', 'galx_free_generation_grants', 'user_id'),
      ('private', 'galx_free_generation_usage', 'user_id'),
      ('private', 'galx_nova_message_usage_periods', 'user_id'),
      ('private', 'galx_nova_message_reservations', 'user_id'),
      ('private', 'galx_nova_usage_notifications', 'user_id'),
      ('private', 'galx_sites_fair_invocations', 'account_id'),
      ('private', 'galx_sites_fair_demand', 'account_id'),
      ('private', 'galx_sites_fair_cooldowns', 'account_id'),
      ('private', 'galx_generation_records', 'account_id')
    ) AS sources(schema_name, table_name, owner_name)
  LOOP
    IF to_regclass(format('%I.%I', source_schema, source_table)) IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = source_schema AND table_name = source_table AND column_name = owner_column
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format($sql$
      INSERT INTO private.galx_account_identities (account_id, account_class)
      SELECT DISTINCT btrim(%1$I::TEXT), 'human'::private.galx_account_class
      FROM %2$I.%3$I
      WHERE %1$I IS NOT NULL AND length(btrim(%1$I::TEXT)) BETWEEN 1 AND 255
      ON CONFLICT (account_id) DO NOTHING
    $sql$, owner_column, source_schema, source_table);
  END LOOP;
END;
$register_owners$;

INSERT INTO private.galx_account_identities (account_id, auth_user_id, account_class)
SELECT u.id::TEXT, u.id, 'human'::private.galx_account_class
FROM auth.users AS u
ON CONFLICT (account_id) DO NOTHING;

UPDATE private.galx_account_identities AS i
SET auth_user_id = u.id,
    updated_at = now()
FROM auth.users AS u
WHERE i.account_id = u.id::TEXT
  AND i.auth_user_id IS NULL;

-- Preserve the explicit account class and auth link from the identity bridge.
INSERT INTO private.galx_account_profiles (owner_key, auth_user_id, account_class)
SELECT account_id, auth_user_id, account_class
FROM private.galx_account_identities
ON CONFLICT (owner_key) DO NOTHING;

UPDATE private.galx_account_profiles AS p
SET auth_user_id = i.auth_user_id,
    account_class = i.account_class,
    updated_at = now()
FROM private.galx_account_identities AS i
WHERE i.account_id = p.owner_key
  AND (p.auth_user_id IS DISTINCT FROM i.auth_user_id OR p.account_class IS DISTINCT FROM i.account_class);

INSERT INTO private.galx_account_profile_preferences (profile_id)
SELECT id FROM private.galx_account_profiles
ON CONFLICT (profile_id) DO NOTHING;

UPDATE private.galx_account_identities AS i
SET profile_id = p.id,
    updated_at = now()
FROM private.galx_account_profiles AS p
WHERE p.owner_key = i.account_id
  AND i.profile_id IS DISTINCT FROM p.id;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'private.galx_account_identities'::regclass
      AND conname = 'galx_account_identities_profile_id_fkey'
  ) THEN
    ALTER TABLE private.galx_account_identities
      ADD CONSTRAINT galx_account_identities_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES private.galx_account_profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE private.galx_account_identities
  ALTER COLUMN profile_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS galx_account_identities_profile
  ON private.galx_account_identities (profile_id, account_id);

-- A single idempotent constructor is shared by auth creation, legacy owner
-- writes, profile reads, and all private bridge triggers.
CREATE OR REPLACE FUNCTION private.galx_ensure_account_profile(
  p_owner_key TEXT,
  p_auth_user_id UUID,
  p_account_class private.galx_account_class
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_owner_key TEXT := NULLIF(btrim(p_owner_key), '');
  v_profile private.galx_account_profiles%ROWTYPE;
BEGIN
  IF v_owner_key IS NULL OR length(v_owner_key) > 255 THEN
    RAISE EXCEPTION 'Account owner is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_account_class IS NULL THEN
    RAISE EXCEPTION 'Account classification is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO private.galx_account_profiles (owner_key, auth_user_id, account_class)
  VALUES (v_owner_key, p_auth_user_id, p_account_class)
  ON CONFLICT (owner_key) DO NOTHING;

  SELECT * INTO v_profile
  FROM private.galx_account_profiles
  WHERE owner_key = v_owner_key
  FOR UPDATE;

  IF v_profile.account_class IS DISTINCT FROM p_account_class THEN
    RAISE EXCEPTION 'Account classification is immutable' USING ERRCODE = '23514';
  END IF;
  IF p_auth_user_id IS NOT NULL AND v_profile.auth_user_id IS NOT NULL
     AND v_profile.auth_user_id IS DISTINCT FROM p_auth_user_id THEN
    RAISE EXCEPTION 'Account auth link is already assigned' USING ERRCODE = '23505';
  END IF;
  IF p_auth_user_id IS NOT NULL AND v_profile.auth_user_id IS NULL THEN
    UPDATE private.galx_account_profiles
    SET auth_user_id = p_auth_user_id, revision = revision + 1, updated_at = now()
    WHERE id = v_profile.id;
  END IF;

  INSERT INTO private.galx_account_profile_preferences (profile_id)
  VALUES (v_profile.id)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN v_profile.id;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_ensure_account_profile(TEXT, UUID, private.galx_account_class)
  FROM PUBLIC, anon, authenticated, service_role;

-- Profile identity fields are immutable. Mutable profile/preferences changes
-- must carry a monotonically increasing revision for optimistic concurrency.
CREATE OR REPLACE FUNCTION private.galx_guard_account_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.owner_key IS DISTINCT FROM OLD.owner_key
     OR NEW.account_class IS DISTINCT FROM OLD.account_class
     OR (OLD.auth_user_id IS NOT NULL AND NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id) THEN
    RAISE EXCEPTION 'Account identity fields are immutable' USING ERRCODE = '55000';
  END IF;
  IF NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION 'Profile revision must advance exactly once' USING ERRCODE = '55000';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_guard_account_profile() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_guard_account_profile ON private.galx_account_profiles;
CREATE TRIGGER galx_guard_account_profile
BEFORE UPDATE ON private.galx_account_profiles
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_account_profile();

CREATE OR REPLACE FUNCTION private.galx_guard_account_profile_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id THEN
    RAISE EXCEPTION 'Profile preference ownership is immutable' USING ERRCODE = '55000';
  END IF;
  IF NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION 'Preference revision must advance exactly once' USING ERRCODE = '55000';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_guard_account_profile_preferences() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_guard_account_profile_preferences ON private.galx_account_profile_preferences;
CREATE TRIGGER galx_guard_account_profile_preferences
BEFORE UPDATE ON private.galx_account_profile_preferences
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_account_profile_preferences();

CREATE OR REPLACE FUNCTION private.galx_sync_account_identity_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_profile_id UUID;
BEGIN
  v_profile_id := private.galx_ensure_account_profile(NEW.account_id, NEW.auth_user_id, NEW.account_class);
  IF NEW.profile_id IS NOT NULL AND NEW.profile_id IS DISTINCT FROM v_profile_id THEN
    RAISE EXCEPTION 'Identity profile does not match its owner key' USING ERRCODE = '23514';
  END IF;
  NEW.profile_id := v_profile_id;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_sync_account_identity_profile() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_sync_account_identity_profile ON private.galx_account_identities;
CREATE TRIGGER galx_sync_account_identity_profile
BEFORE INSERT OR UPDATE ON private.galx_account_identities
FOR EACH ROW EXECUTE FUNCTION private.galx_sync_account_identity_profile();

-- Auth-created human accounts now initialize both canonical layers.
CREATE OR REPLACE FUNCTION private.galx_register_human_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  PERFORM private.galx_ensure_account_profile(NEW.id::TEXT, NEW.id, 'human'::private.galx_account_class);
  INSERT INTO private.galx_account_identities (account_id, auth_user_id, account_class, profile_id)
  VALUES (NEW.id::TEXT, NEW.id, 'human'::private.galx_account_class,
          private.galx_ensure_account_profile(NEW.id::TEXT, NEW.id, 'human'::private.galx_account_class))
  ON CONFLICT (account_id) DO UPDATE
    SET auth_user_id = COALESCE(private.galx_account_identities.auth_user_id, EXCLUDED.auth_user_id),
        profile_id = EXCLUDED.profile_id,
        updated_at = now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_register_human_account() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_register_human_account ON auth.users;
CREATE TRIGGER galx_register_human_account
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.galx_register_human_account();

-- Private rows carry a real foreign key to the canonical profile. Public rows
-- keep their existing response-safe owner fields, but register the owner on
-- write so the profile registry remains complete without exposing profile IDs.
CREATE OR REPLACE FUNCTION private.galx_register_owner_from_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_owner_key TEXT := NULLIF(btrim(to_jsonb(NEW)->>TG_ARGV[0]), '');
  v_class private.galx_account_class;
  v_profile_id UUID;
BEGIN
  IF v_owner_key IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT account_class INTO v_class
  FROM private.galx_account_identities
  WHERE account_id = v_owner_key;
  v_class := COALESCE(v_class, 'human'::private.galx_account_class);
  v_profile_id := private.galx_ensure_account_profile(
    v_owner_key, NULL, v_class
  );
  INSERT INTO private.galx_account_identities (account_id, account_class, profile_id)
  VALUES (v_owner_key, v_class, v_profile_id)
  ON CONFLICT (account_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_register_owner_from_row() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.galx_attach_account_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_owner_key TEXT := NULLIF(btrim(to_jsonb(NEW)->>TG_ARGV[0]), '');
  v_profile_id UUID;
  v_supplied_profile_id UUID := NEW.account_profile_id;
  v_class private.galx_account_class;
BEGIN
  IF v_owner_key IS NULL THEN
    IF v_supplied_profile_id IS NOT NULL THEN
      RAISE EXCEPTION 'An owner is required when a profile is supplied' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  SELECT profile_id, account_class INTO v_profile_id, v_class
  FROM private.galx_account_identities
  WHERE account_id = v_owner_key;
  v_class := COALESCE(v_class, 'human'::private.galx_account_class);
  v_profile_id := COALESCE(v_profile_id, private.galx_ensure_account_profile(v_owner_key, NULL, v_class));
  INSERT INTO private.galx_account_identities (account_id, account_class, profile_id)
  VALUES (v_owner_key, v_class, v_profile_id)
  ON CONFLICT (account_id) DO NOTHING;

  IF v_supplied_profile_id IS NOT NULL AND v_supplied_profile_id IS DISTINCT FROM v_profile_id THEN
    RAISE EXCEPTION 'Account profile does not match the owner' USING ERRCODE = '23514';
  END IF;
  NEW.account_profile_id := v_profile_id;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_attach_account_profile() FROM PUBLIC, anon, authenticated, service_role;

-- Signup-credit rows are business-audit records. Existing non-pending rows
-- must remain immutable, but the ownership bridge needs to attach the new
-- profile metadata during this expand step. Allow only that metadata change
-- for settled rows; preserve the original pending-state transition contract.
ALTER TABLE private.galx_signup_credit_grants
  ADD COLUMN IF NOT EXISTS account_profile_id UUID;

CREATE OR REPLACE FUNCTION private.galx_preserve_signup_credit_grant()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Signup credit records are immutable' USING ERRCODE = '55000';
  END IF;

  IF OLD.status <> 'pending' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.amount_usd IS DISTINCT FROM OLD.amount_usd
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.identity_hash IS DISTINCT FROM OLD.identity_hash
       OR NEW.transaction_id IS DISTINCT FROM OLD.transaction_id
       OR NEW.enrolled_at IS DISTINCT FROM OLD.enrolled_at
       OR NEW.granted_at IS DISTINCT FROM OLD.granted_at THEN
      RAISE EXCEPTION 'Signup credit records are immutable' USING ERRCODE = '55000';
    END IF;
  ELSE
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.amount_usd IS DISTINCT FROM OLD.amount_usd
       OR NEW.enrolled_at IS DISTINCT FROM OLD.enrolled_at THEN
      RAISE EXCEPTION 'Signup credit records are immutable' USING ERRCODE = '55000';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_preserve_signup_credit_grant() FROM PUBLIC, anon, authenticated, service_role;

DO $bridge$
DECLARE
  item RECORD;
  v_constraint TEXT;
  v_index TEXT;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('private', 'galx_plan_checkouts', 'user_id'),
      ('private', 'galx_plan_subscriptions', 'user_id'),
      ('private', 'galx_image_requests', 'user_id'),
      ('private', 'galx_site_workspaces', 'user_id'),
      ('private', 'galx_site_turns', 'user_id'),
      ('private', 'galx_site_versions', 'user_id'),
      ('private', 'galx_site_namespaces', 'user_id'),
      ('private', 'galx_site_domains', 'user_id'),
      ('private', 'developer_access_requests', 'user_id'),
      ('private', 'developer_preview_feedback', 'user_id'),
      ('private', 'preview_admin_members', 'user_id'),
      ('private', 'galx_signup_credit_grants', 'user_id'),
      ('private', 'galx_free_generation_grants', 'user_id'),
      ('private', 'galx_free_generation_usage', 'user_id'),
      ('private', 'galx_nova_message_usage_periods', 'user_id'),
      ('private', 'galx_nova_message_reservations', 'user_id'),
      ('private', 'galx_nova_usage_notifications', 'user_id'),
      ('private', 'galx_sites_fair_invocations', 'account_id'),
      ('private', 'galx_sites_fair_demand', 'account_id'),
      ('private', 'galx_sites_fair_cooldowns', 'account_id'),
      ('private', 'galx_generation_records', 'account_id')
    ) AS entries(schema_name, table_name, owner_column)
  LOOP
    IF to_regclass(format('%I.%I', item.schema_name, item.table_name)) IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = item.schema_name AND table_name = item.table_name
        AND column_name = item.owner_column
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS account_profile_id UUID', item.schema_name, item.table_name);
    EXECUTE format($sql$
      UPDATE %1$I.%2$I AS owner_row
      SET account_profile_id = identity_row.profile_id
      FROM private.galx_account_identities AS identity_row
      WHERE owner_row.account_profile_id IS DISTINCT FROM identity_row.profile_id
        AND owner_row.%3$I IS NOT NULL
        AND identity_row.account_id = btrim(owner_row.%3$I::TEXT)
    $sql$, item.schema_name, item.table_name, item.owner_column);

    v_constraint := left(item.table_name || '_account_profile_id_fkey', 63);
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.conrelid = format('%I.%I', item.schema_name, item.table_name)::regclass
        AND c.contype = 'f' AND a.attname = 'account_profile_id'
        AND pg_get_constraintdef(c.oid) LIKE '%galx_account_profiles%'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (account_profile_id) REFERENCES private.galx_account_profiles(id) ON DELETE RESTRICT NOT VALID',
        item.schema_name, item.table_name, v_constraint
      );
    END IF;
    EXECUTE format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I', item.schema_name, item.table_name, v_constraint);

    v_index := left('galx_' || item.table_name || '_account_profile_idx', 63);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I (account_profile_id)', v_index, item.schema_name, item.table_name);

    EXECUTE format('DROP TRIGGER IF EXISTS galx_attach_account_profile ON %I.%I', item.schema_name, item.table_name);
    EXECUTE format(
      'CREATE TRIGGER galx_attach_account_profile BEFORE INSERT OR UPDATE OF %I, account_profile_id ON %I.%I FOR EACH ROW EXECUTE FUNCTION private.galx_attach_account_profile(%L)',
      item.owner_column, item.schema_name, item.table_name, item.owner_column
    );
  END LOOP;
END;
$bridge$;

DO $public_owner_hooks$
DECLARE
  item RECORD;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('public', 'galx_workspace_members', 'user_id'),
      ('public', 'galx_developer_keys', 'user_id'),
      ('public', 'galx_shard_concurrency_leases', 'user_id'),
      ('public', 'galx_tasks', 'user_id'),
      ('public', 'galx_wallets', 'user_id'),
      ('public', 'galx_wallet_transactions', 'user_id'),
      ('public', 'galx_metrics_telemetry', 'user_id'),
      ('public', 'galx_audit_logs', 'user_id'),
      ('public', 'galx_user_sessions', 'user_id'),
      ('public', 'galx_stripe_customers', 'user_id'),
      ('public', 'galx_stripe_checkout_sessions', 'user_id'),
      ('public', 'galx_stripe_invoices', 'user_id'),
      ('public', 'chat_conversations', 'user_id'),
      ('public', 'user_image_library', 'user_id'),
      ('public', 'image_library_gc_outbox', 'user_id'),
      ('public', 'custom_personas', 'user_id'),
      ('public', 'image_generations', 'user_id'),
      ('public', 'galx_chat_rolling_memory', 'user_id'),
      ('public', 'galx_chat_universal_workspace_anchors', 'user_id'),
      ('public', 'galx_chat_context_episodes', 'user_id'),
      ('public', 'galx_chat_document_chunks', 'user_id'),
      ('public', 'galx_chat_memory_graph_edges', 'user_id'),
      ('public', 'galx_seat_rolling_usage_events', 'user_id'),
      ('public', 'galx_seat_rolling_windows_state', 'user_id'),
      ('public', 'galx_seat_request_leases', 'user_id'),
      ('public', 'galx_wallet_holds', 'user_id')
    ) AS entries(schema_name, table_name, owner_column)
  LOOP
    IF to_regclass(format('%I.%I', item.schema_name, item.table_name)) IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = item.schema_name AND table_name = item.table_name
        AND column_name = item.owner_column
    ) THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS galx_register_account_owner ON %I.%I', item.schema_name, item.table_name);
    EXECUTE format(
      'CREATE TRIGGER galx_register_account_owner BEFORE INSERT OR UPDATE OF %I ON %I.%I FOR EACH ROW EXECUTE FUNCTION private.galx_register_owner_from_row(%L)',
      item.owner_column, item.schema_name, item.table_name, item.owner_column
    );
  END LOOP;
END;
$public_owner_hooks$;

-- The policy engine only needs this narrow boolean predicate. Keep the private
-- schema/table inaccessible while allowing policy evaluation for public image
-- reads. This fixes the overly-broad revoke in the preceding migration.
GRANT EXECUTE ON FUNCTION private.galx_is_human_account(TEXT) TO anon, authenticated;

-- Versioned snapshots make actor configuration changes inspectable without
-- putting mutable configuration into the actor identity row.
CREATE TABLE IF NOT EXISTS private.galx_autonomous_actor_configuration_versions (
  actor_id UUID NOT NULL
    REFERENCES private.galx_autonomous_actors(actor_id) ON DELETE RESTRICT,
  configuration_version INTEGER NOT NULL CHECK (configuration_version > 0),
  persona_ref TEXT NOT NULL CHECK (length(btrim(persona_ref)) BETWEEN 1 AND 255),
  configuration_ref TEXT NOT NULL CHECK (length(btrim(configuration_ref)) BETWEEN 1 AND 255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, configuration_version)
);

CREATE INDEX IF NOT EXISTS galx_actor_config_versions_created
  ON private.galx_autonomous_actor_configuration_versions (created_at DESC, actor_id);
ALTER TABLE private.galx_autonomous_actor_configuration_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_autonomous_actor_configuration_versions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_autonomous_actor_configuration_versions FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO private.galx_autonomous_actor_configuration_versions
  (actor_id, configuration_version, persona_ref, configuration_ref, created_at)
SELECT actor_id, configuration_version, persona_ref, configuration_ref, created_at
FROM private.galx_autonomous_actor_configurations
ON CONFLICT (actor_id, configuration_version) DO NOTHING;

CREATE OR REPLACE FUNCTION private.galx_record_actor_configuration_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (NEW.persona_ref IS DISTINCT FROM OLD.persona_ref
       OR NEW.configuration_ref IS DISTINCT FROM OLD.configuration_ref)
     AND NEW.configuration_version <= OLD.configuration_version THEN
    RAISE EXCEPTION 'Actor configuration version must advance' USING ERRCODE = '55000';
  END IF;

  INSERT INTO private.galx_autonomous_actor_configuration_versions
    (actor_id, configuration_version, persona_ref, configuration_ref)
  VALUES (NEW.actor_id, NEW.configuration_version, NEW.persona_ref, NEW.configuration_ref)
  ON CONFLICT (actor_id, configuration_version) DO NOTHING;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_record_actor_configuration_version() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_record_actor_configuration_version ON private.galx_autonomous_actor_configurations;
CREATE TRIGGER galx_record_actor_configuration_version
AFTER INSERT OR UPDATE ON private.galx_autonomous_actor_configurations
FOR EACH ROW EXECUTE FUNCTION private.galx_record_actor_configuration_version();

CREATE OR REPLACE FUNCTION private.galx_guard_actor_configuration_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Actor configuration history is append-only' USING ERRCODE = '55000';
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_guard_actor_configuration_version() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_guard_actor_configuration_version ON private.galx_autonomous_actor_configuration_versions;
CREATE TRIGGER galx_guard_actor_configuration_version
BEFORE UPDATE OR DELETE ON private.galx_autonomous_actor_configuration_versions
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_actor_configuration_version();

-- Administrative entitlements are a current-state projection plus an
-- append-only event ledger. Grantor/revoker identities are always human.
ALTER TABLE private.galx_administrative_entitlements
  ADD COLUMN IF NOT EXISTS account_profile_id UUID,
  ADD COLUMN IF NOT EXISTS granted_by_profile_id UUID,
  ADD COLUMN IF NOT EXISTS revoked_by_profile_id UUID,
  ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE private.galx_administrative_entitlements AS e
SET account_profile_id = (SELECT profile_id FROM private.galx_account_identities WHERE account_id = e.account_id),
    granted_by_profile_id = (SELECT profile_id FROM private.galx_account_identities WHERE account_id = e.granted_by_account_id),
    revoked_by_profile_id = (SELECT profile_id FROM private.galx_account_identities WHERE account_id = e.revoked_by_account_id)
WHERE EXISTS (SELECT 1 FROM private.galx_account_identities WHERE account_id = e.account_id)
  AND EXISTS (SELECT 1 FROM private.galx_account_identities WHERE account_id = e.granted_by_account_id)
  AND (
    e.account_profile_id IS DISTINCT FROM (SELECT profile_id FROM private.galx_account_identities WHERE account_id = e.account_id) OR
    e.granted_by_profile_id IS DISTINCT FROM (SELECT profile_id FROM private.galx_account_identities WHERE account_id = e.granted_by_account_id) OR
    e.revoked_by_profile_id IS DISTINCT FROM (SELECT profile_id FROM private.galx_account_identities WHERE account_id = e.revoked_by_account_id)
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.galx_administrative_entitlements'::regclass AND conname = 'galx_administrative_entitlements_profile_fkey') THEN
    ALTER TABLE private.galx_administrative_entitlements
      ADD CONSTRAINT galx_administrative_entitlements_profile_fkey
      FOREIGN KEY (account_profile_id) REFERENCES private.galx_account_profiles(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.galx_administrative_entitlements'::regclass AND conname = 'galx_administrative_entitlements_grantor_profile_fkey') THEN
    ALTER TABLE private.galx_administrative_entitlements
      ADD CONSTRAINT galx_administrative_entitlements_grantor_profile_fkey
      FOREIGN KEY (granted_by_profile_id) REFERENCES private.galx_account_profiles(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.galx_administrative_entitlements'::regclass AND conname = 'galx_administrative_entitlements_revoker_profile_fkey') THEN
    ALTER TABLE private.galx_administrative_entitlements
      ADD CONSTRAINT galx_administrative_entitlements_revoker_profile_fkey
      FOREIGN KEY (revoked_by_profile_id) REFERENCES private.galx_account_profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS galx_administrative_entitlements_profile_active
  ON private.galx_administrative_entitlements (account_profile_id, entitlement_key, starts_at, ends_at)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS galx_administrative_entitlements_grantor_profile
  ON private.galx_administrative_entitlements (granted_by_profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS private.galx_administrative_entitlement_events (
  event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entitlement_id UUID NOT NULL
    REFERENCES private.galx_administrative_entitlements(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('granted', 'revoked')),
  account_profile_id UUID NOT NULL
    REFERENCES private.galx_account_profiles(id) ON DELETE RESTRICT,
  actor_profile_id UUID NOT NULL
    REFERENCES private.galx_account_profiles(id) ON DELETE RESTRICT,
  revision BIGINT NOT NULL CHECK (revision > 0),
  reason TEXT NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 500),
  previous_state JSONB,
  next_state JSONB NOT NULL CHECK (jsonb_typeof(next_state) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE private.galx_administrative_entitlement_events
  ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS galx_entitlement_events_revision
  ON private.galx_administrative_entitlement_events (entitlement_id, action, revision);

CREATE INDEX IF NOT EXISTS galx_entitlement_events_entitlement
  ON private.galx_administrative_entitlement_events (entitlement_id, created_at DESC);
CREATE INDEX IF NOT EXISTS galx_entitlement_events_account
  ON private.galx_administrative_entitlement_events (account_profile_id, created_at DESC);
ALTER TABLE private.galx_administrative_entitlement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_administrative_entitlement_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_administrative_entitlement_events FROM PUBLIC, anon, authenticated, service_role;

-- Existing current-state rows receive a historical baseline so the audit
-- ledger is useful immediately after rollout, not only for future changes.
INSERT INTO private.galx_administrative_entitlement_events
  (entitlement_id, action, account_profile_id, actor_profile_id, revision, reason, previous_state, next_state, created_at)
SELECT
  e.id,
  'granted',
  e.account_profile_id,
  e.granted_by_profile_id,
  e.revision,
  e.reason,
  NULL,
  jsonb_build_object(
    'status', CASE WHEN e.revoked_at IS NULL THEN 'active' ELSE 'revoked' END,
    'revision', e.revision,
    'startsAt', e.starts_at,
    'endsAt', e.ends_at,
    'revokedAt', e.revoked_at
  ),
  e.created_at
FROM private.galx_administrative_entitlements AS e
WHERE e.account_profile_id IS NOT NULL
  AND e.granted_by_profile_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM private.galx_administrative_entitlement_events AS existing
    WHERE existing.entitlement_id = e.id AND existing.action = 'granted' AND existing.revision = e.revision
  );

CREATE OR REPLACE FUNCTION private.galx_validate_administrative_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_account_profile UUID;
  v_grantor_profile UUID;
  v_revoker_profile UUID;
BEGIN
  SELECT profile_id INTO v_account_profile
  FROM private.galx_account_identities WHERE account_id = NEW.account_id;
  SELECT profile_id INTO v_grantor_profile
  FROM private.galx_account_identities WHERE account_id = NEW.granted_by_account_id;
  IF v_account_profile IS NULL OR v_grantor_profile IS NULL THEN
    RAISE EXCEPTION 'Entitlement identities are not registered' USING ERRCODE = '23514';
  END IF;

  PERFORM private.galx_assert_human_account(NEW.granted_by_account_id, 'Entitlement grantor');
  IF NEW.revoked_by_account_id IS NOT NULL THEN
    PERFORM private.galx_assert_human_account(NEW.revoked_by_account_id, 'Entitlement revoker');
    SELECT profile_id INTO v_revoker_profile
    FROM private.galx_account_identities WHERE account_id = NEW.revoked_by_account_id;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.account_id IS DISTINCT FROM OLD.account_id
       OR NEW.entitlement_key IS DISTINCT FROM OLD.entitlement_key
       OR NEW.source IS DISTINCT FROM OLD.source
       OR NEW.granted_by_account_id IS DISTINCT FROM OLD.granted_by_account_id
       OR NEW.reason IS DISTINCT FROM OLD.reason
       OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
       OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Entitlement grant fields are immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'Entitlement revocation is immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
      IF NEW.revoked_by_account_id IS NULL OR NEW.revoked_at < NEW.starts_at THEN
        RAISE EXCEPTION 'A revocation requires a valid human revoker' USING ERRCODE = '23514';
      END IF;
      NEW.revision := OLD.revision + 1;
    ELSE
      RAISE EXCEPTION 'Administrative entitlements may only transition to revoked' USING ERRCODE = '55000';
    END IF;
  ELSE
    NEW.revision := COALESCE(NEW.revision, 1);
  END IF;

  NEW.account_profile_id := v_account_profile;
  NEW.granted_by_profile_id := v_grantor_profile;
  NEW.revoked_by_profile_id := v_revoker_profile;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_validate_administrative_entitlement() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_validate_administrative_entitlement ON private.galx_administrative_entitlements;
CREATE TRIGGER galx_validate_administrative_entitlement
BEFORE INSERT OR UPDATE ON private.galx_administrative_entitlements
FOR EACH ROW EXECUTE FUNCTION private.galx_validate_administrative_entitlement();

CREATE OR REPLACE FUNCTION private.galx_guard_administrative_entitlement_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Administrative entitlements are append-only; revoke the entitlement' USING ERRCODE = '55000';
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_guard_administrative_entitlement_delete() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_guard_administrative_entitlement_delete ON private.galx_administrative_entitlements;
CREATE TRIGGER galx_guard_administrative_entitlement_delete
BEFORE DELETE ON private.galx_administrative_entitlements
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_administrative_entitlement_delete();

CREATE OR REPLACE FUNCTION private.galx_record_administrative_entitlement_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_previous JSONB;
  v_next JSONB;
BEGIN
  v_previous := CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
    'status', CASE WHEN OLD.revoked_at IS NULL THEN 'active' ELSE 'revoked' END,
    'revision', OLD.revision,
    'startsAt', OLD.starts_at,
    'endsAt', OLD.ends_at,
    'revokedAt', OLD.revoked_at
  ) ELSE NULL END;
  v_next := jsonb_build_object(
    'status', CASE WHEN NEW.revoked_at IS NULL THEN 'active' ELSE 'revoked' END,
    'revision', NEW.revision,
    'startsAt', NEW.starts_at,
    'endsAt', NEW.ends_at,
    'revokedAt', NEW.revoked_at
  );
  INSERT INTO private.galx_administrative_entitlement_events
    (entitlement_id, action, account_profile_id, actor_profile_id, revision, reason, previous_state, next_state)
  VALUES (
    NEW.id,
    CASE WHEN TG_OP = 'INSERT' THEN 'granted' ELSE 'revoked' END,
    NEW.account_profile_id,
    CASE WHEN TG_OP = 'INSERT' THEN NEW.granted_by_profile_id ELSE NEW.revoked_by_profile_id END,
    NEW.revision,
    NEW.reason,
    v_previous,
    v_next
  );
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_record_administrative_entitlement_event() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_record_administrative_entitlement_event ON private.galx_administrative_entitlements;
CREATE TRIGGER galx_record_administrative_entitlement_event
AFTER INSERT OR UPDATE ON private.galx_administrative_entitlements
FOR EACH ROW EXECUTE FUNCTION private.galx_record_administrative_entitlement_event();

CREATE OR REPLACE FUNCTION private.galx_guard_entitlement_event_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Entitlement audit history is append-only' USING ERRCODE = '55000';
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_guard_entitlement_event_history() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_guard_entitlement_event_history ON private.galx_administrative_entitlement_events;
CREATE TRIGGER galx_guard_entitlement_event_history
BEFORE UPDATE OR DELETE ON private.galx_administrative_entitlement_events
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_entitlement_event_history();

COMMENT ON TABLE private.galx_account_profiles IS
  'Private canonical account profile. Legacy owner keys remain only as a compatibility bridge.';
COMMENT ON TABLE private.galx_account_profile_preferences IS
  'Private per-account preferences with optimistic revisioning; never a public identity response.';
COMMENT ON TABLE private.galx_autonomous_actor_configuration_versions IS
  'Append-only snapshots for autonomous actor configuration changes.';
COMMENT ON TABLE private.galx_administrative_entitlement_events IS
  'Append-only administrative entitlement history; the current entitlement row is a revocable projection.';
