-- ============================================================================
-- GALXAI: Explicit account identity, autonomous actor control, and provenance
--
-- This migration adds private control-plane metadata only. It does not create
-- autonomous actors, grant production entitlements, or generate content.
-- Existing owner identifiers are registered as human by default. Provider
-- credential rows (galx_shard_accounts) remain a separate concern.
-- ============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

DO $$ BEGIN
  CREATE TYPE private.galx_account_class AS ENUM ('human', 'autonomous');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE private.galx_autonomous_provisioning_source AS ENUM (
    'orchestration',
    'operator',
    'migration',
    'test'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE private.galx_entitlement_source AS ENUM ('paid_subscription', 'administrative');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- One registry for the existing owner identifier model. The optional auth link
-- lets normal Supabase users be reconciled without making autonomous actors
-- depend on an authentication row.
CREATE TABLE IF NOT EXISTS private.galx_account_identities (
  account_id TEXT PRIMARY KEY CHECK (length(btrim(account_id)) BETWEEN 1 AND 255),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  account_class private.galx_account_class NOT NULL DEFAULT 'human',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS galx_account_identities_class
  ON private.galx_account_identities (account_class, account_id);

ALTER TABLE private.galx_account_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_account_identities FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_account_identities FROM PUBLIC, anon, authenticated, service_role;

-- Backfill the authoritative auth population and the owner identifiers used by
-- existing billing, generation, chat, Sites, workspace, and relay records.
-- Every backfilled identifier is human because this migration has no
-- authoritative evidence for an autonomous account.
INSERT INTO private.galx_account_identities (account_id, auth_user_id, account_class)
SELECT u.id::TEXT, u.id, 'human'::private.galx_account_class
FROM auth.users AS u
ON CONFLICT (account_id) DO NOTHING;

DO $backfill$
DECLARE
  source_schema TEXT;
  source_table TEXT;
BEGIN
  FOR source_schema, source_table IN
    SELECT * FROM (VALUES
      ('public',  'galx_wallets'),
      ('public',  'galx_developer_keys'),
      ('public',  'galx_workspace_members'),
      ('public',  'galx_shard_accounts'),
      ('public',  'chat_conversations'),
      ('public',  'user_image_library'),
      ('private', 'galx_plan_checkouts'),
      ('private', 'galx_plan_subscriptions'),
      ('private', 'galx_image_requests'),
      ('private', 'galx_site_workspaces'),
      ('private', 'galx_site_turns'),
      ('private', 'galx_site_versions'),
      ('private', 'developer_access_requests'),
      ('private', 'galx_signup_credit_grants')
    ) AS sources(schema_name, table_name)
  LOOP
    IF to_regclass(format('%I.%I', source_schema, source_table)) IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = source_schema
        AND table_name = source_table
        AND column_name = 'user_id'
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format($sql$
      INSERT INTO private.galx_account_identities (account_id, account_class)
      SELECT DISTINCT btrim(user_id::TEXT), 'human'::private.galx_account_class
      FROM %I.%I
      WHERE user_id IS NOT NULL
        AND length(btrim(user_id::TEXT)) BETWEEN 1 AND 255
      ON CONFLICT (account_id) DO NOTHING
    $sql$, source_schema, source_table);
  END LOOP;

  UPDATE private.galx_account_identities AS identity_row
  SET auth_user_id = u.id,
      updated_at = now()
  FROM auth.users AS u
  WHERE identity_row.account_id = u.id::TEXT
    AND identity_row.auth_user_id IS NULL;
END;
$backfill$;

-- Newly-created ordinary auth users are human unless a separate, explicit
-- autonomous registration creates a new identity with the autonomous enum.
CREATE OR REPLACE FUNCTION private.galx_register_human_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO private.galx_account_identities (account_id, auth_user_id, account_class)
  VALUES (NEW.id::TEXT, NEW.id, 'human'::private.galx_account_class)
  ON CONFLICT (account_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_register_human_account() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_register_human_account ON auth.users;
CREATE TRIGGER galx_register_human_account
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.galx_register_human_account();

-- Classification is identity, not mutable profile metadata. Prevent accidental
-- human/autonomous flips and reassignment of an established auth link.
CREATE OR REPLACE FUNCTION private.galx_guard_account_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.account_class IS DISTINCT FROM OLD.account_class THEN
    RAISE EXCEPTION 'Account classification is immutable; create a new explicit identity'
      USING ERRCODE = '55000';
  END IF;
  IF OLD.auth_user_id IS NOT NULL AND NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'Established auth account link is immutable' USING ERRCODE = '55000';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_guard_account_identity() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_guard_account_identity ON private.galx_account_identities;
CREATE TRIGGER galx_guard_account_identity
BEFORE UPDATE ON private.galx_account_identities
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_account_identity();

-- A lightweight controlled population run/cohort. This is not an experiment
-- framework; it is only the durable cleanup and ownership boundary for actors.
CREATE TABLE IF NOT EXISTS private.galx_autonomous_actor_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_key TEXT NOT NULL UNIQUE CHECK (length(btrim(run_key)) BETWEEN 1 AND 128),
  control_owner_account_id TEXT NOT NULL
    REFERENCES private.galx_account_identities(account_id) ON DELETE RESTRICT,
  state TEXT NOT NULL DEFAULT 'planned'
    CHECK (state IN ('planned', 'active', 'disabled', 'completed', 'cleaned_up')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS galx_autonomous_actor_runs_owner
  ON private.galx_autonomous_actor_runs (control_owner_account_id, created_at DESC);

ALTER TABLE private.galx_autonomous_actor_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_autonomous_actor_runs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_autonomous_actor_runs FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.galx_assert_human_account(p_account_id TEXT, p_context TEXT)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_class private.galx_account_class;
BEGIN
  SELECT account_class INTO v_class
  FROM private.galx_account_identities
  WHERE account_id = p_account_id;
  IF v_class IS DISTINCT FROM 'human'::private.galx_account_class THEN
    RAISE EXCEPTION '% must reference a human account', p_context USING ERRCODE = '23514';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_assert_human_account(TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.galx_validate_autonomous_run()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  PERFORM private.galx_assert_human_account(NEW.control_owner_account_id, 'Run control owner');
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_validate_autonomous_run() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_validate_autonomous_run ON private.galx_autonomous_actor_runs;
CREATE TRIGGER galx_validate_autonomous_run
BEFORE INSERT OR UPDATE ON private.galx_autonomous_actor_runs
FOR EACH ROW EXECUTE FUNCTION private.galx_validate_autonomous_run();

CREATE TABLE IF NOT EXISTS private.galx_autonomous_actors (
  actor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL UNIQUE
    REFERENCES private.galx_account_identities(account_id) ON DELETE RESTRICT,
  run_id UUID REFERENCES private.galx_autonomous_actor_runs(run_id) ON DELETE RESTRICT,
  control_owner_account_id TEXT NOT NULL
    REFERENCES private.galx_account_identities(account_id) ON DELETE RESTRICT,
  provisioning_source private.galx_autonomous_provisioning_source NOT NULL,
  -- Safe-by-default: explicit creation does not activate an actor.
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS galx_autonomous_actors_run
  ON private.galx_autonomous_actors (run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS galx_autonomous_actors_enabled
  ON private.galx_autonomous_actors (is_enabled, created_at DESC);

ALTER TABLE private.galx_autonomous_actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_autonomous_actors FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_autonomous_actors FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.galx_validate_autonomous_actor()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_class private.galx_account_class;
  v_run_owner TEXT;
BEGIN
  SELECT account_class INTO v_class
  FROM private.galx_account_identities
  WHERE account_id = NEW.account_id;
  IF v_class IS DISTINCT FROM 'autonomous'::private.galx_account_class THEN
    RAISE EXCEPTION 'Autonomous actor must reference an autonomous account identity'
      USING ERRCODE = '23514';
  END IF;

  PERFORM private.galx_assert_human_account(NEW.control_owner_account_id, 'Actor control owner');

  IF NEW.run_id IS NOT NULL THEN
    SELECT control_owner_account_id INTO v_run_owner
    FROM private.galx_autonomous_actor_runs
    WHERE run_id = NEW.run_id;
    IF v_run_owner IS DISTINCT FROM NEW.control_owner_account_id THEN
      RAISE EXCEPTION 'Actor control owner must match the run control owner'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_validate_autonomous_actor() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_validate_autonomous_actor ON private.galx_autonomous_actors;
CREATE TRIGGER galx_validate_autonomous_actor
BEFORE INSERT OR UPDATE ON private.galx_autonomous_actors
FOR EACH ROW EXECUTE FUNCTION private.galx_validate_autonomous_actor();

-- Evolving persona/configuration references are kept out of the account and
-- actor rows so they can be versioned independently without a JSON document.
CREATE TABLE IF NOT EXISTS private.galx_autonomous_actor_configurations (
  actor_id UUID PRIMARY KEY
    REFERENCES private.galx_autonomous_actors(actor_id) ON DELETE RESTRICT,
  persona_ref TEXT NOT NULL CHECK (length(btrim(persona_ref)) BETWEEN 1 AND 255),
  configuration_ref TEXT NOT NULL CHECK (length(btrim(configuration_ref)) BETWEEN 1 AND 255),
  configuration_version INTEGER NOT NULL DEFAULT 1 CHECK (configuration_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE private.galx_autonomous_actor_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_autonomous_actor_configurations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_autonomous_actor_configurations FROM PUBLIC, anon, authenticated, service_role;

-- Administrative entitlement receipts are intentionally separate from Stripe
-- subscriptions. No checkout, invoice, customer, or payment-provider row is
-- created by this table.
CREATE TABLE IF NOT EXISTS private.galx_administrative_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL
    REFERENCES private.galx_account_identities(account_id) ON DELETE RESTRICT,
  entitlement_key TEXT NOT NULL CHECK (entitlement_key IN ('pro-v1')),
  source private.galx_entitlement_source NOT NULL DEFAULT 'administrative'
    CHECK (source = 'administrative'::private.galx_entitlement_source),
  granted_by_account_id TEXT NOT NULL
    REFERENCES private.galx_account_identities(account_id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 500),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by_account_id TEXT
    REFERENCES private.galx_account_identities(account_id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at),
  CHECK (revoked_at IS NULL OR revoked_at >= starts_at),
  CHECK (revoked_at IS NULL OR revoked_by_account_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS galx_administrative_entitlements_active
  ON private.galx_administrative_entitlements (account_id, entitlement_key, starts_at, ends_at)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS galx_administrative_entitlements_grantor
  ON private.galx_administrative_entitlements (granted_by_account_id, created_at DESC);

ALTER TABLE private.galx_administrative_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_administrative_entitlements FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_administrative_entitlements FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.galx_validate_administrative_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  PERFORM private.galx_assert_human_account(NEW.granted_by_account_id, 'Entitlement grantor');
  IF NEW.revoked_by_account_id IS NOT NULL THEN
    PERFORM private.galx_assert_human_account(NEW.revoked_by_account_id, 'Entitlement revoker');
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_validate_administrative_entitlement() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_validate_administrative_entitlement ON private.galx_administrative_entitlements;
CREATE TRIGGER galx_validate_administrative_entitlement
BEFORE INSERT OR UPDATE ON private.galx_administrative_entitlements
FOR EACH ROW EXECUTE FUNCTION private.galx_validate_administrative_entitlement();

-- Canonical private generation receipts make direct and durable image flows
-- converge on the same account provenance chain.
CREATE TABLE IF NOT EXISTS private.galx_generation_records (
  id TEXT PRIMARY KEY CHECK (length(btrim(id)) BETWEEN 1 AND 160),
  account_id TEXT NOT NULL
    REFERENCES private.galx_account_identities(account_id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('image')),
  state TEXT NOT NULL DEFAULT 'queued'
    CHECK (state IN ('queued', 'generating', 'completed', 'failed', 'cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS galx_generation_records_account
  ON private.galx_generation_records (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS galx_generation_records_state
  ON private.galx_generation_records (state, created_at DESC);

ALTER TABLE private.galx_generation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_generation_records FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_generation_records FROM PUBLIC, anon, authenticated, service_role;

-- Existing durable image receipts are already generation records. Preserve
-- their IDs so current idempotency and recovery contracts remain unchanged.
INSERT INTO private.galx_generation_records (id, account_id, kind, state, created_at, updated_at)
SELECT r.id::TEXT,
       r.user_id,
       'image',
       r.state,
       r.created_at,
       r.updated_at
FROM private.galx_image_requests AS r
ON CONFLICT (id) DO NOTHING;

-- A private relation preserves content -> generation without exposing the
-- generation identifier through the public image-library table.
CREATE TABLE IF NOT EXISTS private.galx_generation_assets (
  generation_id TEXT NOT NULL
    REFERENCES private.galx_generation_records(id) ON DELETE RESTRICT,
  asset_id TEXT NOT NULL
    REFERENCES public.user_image_library(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (generation_id, asset_id),
  UNIQUE (asset_id)
);

CREATE INDEX IF NOT EXISTS galx_generation_assets_asset
  ON private.galx_generation_assets (asset_id, generation_id);

ALTER TABLE private.galx_generation_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_generation_assets FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_generation_assets FROM PUBLIC, anon, authenticated, service_role;

-- Recover provenance for completed durable receipts where both sides are
-- present. Orphaned legacy references are left untouched and are not guessed.
INSERT INTO private.galx_generation_assets (generation_id, asset_id)
SELECT r.id::TEXT, asset_id
FROM private.galx_image_requests AS r
CROSS JOIN LATERAL unnest(COALESCE(r.asset_ids, ARRAY[]::TEXT[])) AS referenced(asset_id)
JOIN public.user_image_library AS library
  ON library.id = referenced.asset_id
 AND library.user_id = r.user_id
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION private.galx_create_generation_for_image_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  existing_account TEXT;
BEGIN
  INSERT INTO private.galx_account_identities (account_id, account_class)
  VALUES (NEW.user_id, 'human'::private.galx_account_class)
  ON CONFLICT (account_id) DO NOTHING;

  SELECT account_id INTO existing_account
  FROM private.galx_generation_records
  WHERE id = NEW.id::TEXT;
  IF existing_account IS NOT NULL AND existing_account IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Generation identifier is already owned by another account'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO private.galx_generation_records (id, account_id, kind, state, created_at, updated_at)
  VALUES (NEW.id::TEXT, NEW.user_id, 'image', NEW.state, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE
    SET state = CASE
      WHEN private.galx_generation_records.state IN ('completed', 'failed', 'cancelled')
        THEN private.galx_generation_records.state
      ELSE EXCLUDED.state
    END,
    updated_at = now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_create_generation_for_image_request() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_create_generation_for_image_request ON private.galx_image_requests;
CREATE TRIGGER galx_create_generation_for_image_request
AFTER INSERT ON private.galx_image_requests
FOR EACH ROW EXECUTE FUNCTION private.galx_create_generation_for_image_request();

-- Autonomous content is accepted only when the private write path supplies a
-- generation mapping. A deferred constraint trigger lets the batch writer add
-- the private mapping after the public asset row in the same transaction.
CREATE OR REPLACE FUNCTION private.galx_validate_generation_asset_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_class private.galx_account_class;
  v_generation_account TEXT;
BEGIN
  SELECT account_class INTO v_class
  FROM private.galx_account_identities
  WHERE account_id = NEW.user_id;

  IF v_class = 'autonomous'::private.galx_account_class THEN
    SELECT generation.account_id INTO v_generation_account
    FROM private.galx_generation_assets AS asset
    JOIN private.galx_generation_records AS generation
      ON generation.id = asset.generation_id
    WHERE asset.asset_id = NEW.id;
    IF v_generation_account IS NULL OR v_generation_account IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'Autonomous content requires matching generation provenance' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_validate_generation_asset_write() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_validate_generation_asset_write ON public.user_image_library;
CREATE CONSTRAINT TRIGGER galx_validate_generation_asset_write
AFTER INSERT OR UPDATE OF user_id ON public.user_image_library
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION private.galx_validate_generation_asset_write();

-- A private predicate keeps public community surfaces human-only without
-- exposing the account-class registry to browser roles.
CREATE OR REPLACE FUNCTION private.galx_is_human_account(p_account_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM private.galx_account_identities
    WHERE account_id = p_account_id
      AND account_class = 'human'::private.galx_account_class
  );
$function$;

REVOKE ALL ON FUNCTION private.galx_is_human_account(TEXT) FROM PUBLIC, anon, authenticated, service_role;

-- Existing community behavior is preserved for current human rows, while
-- future autonomous rows cannot be presented as ordinary public creations.
CREATE OR REPLACE VIEW public.community_creations_feed AS
SELECT
  l.id,
  l.user_id,
  l.prompt,
  l.aspect_ratio,
  l.dimensions,
  l.public_url,
  l.created_at,
  l.lqip,
  l.seed,
  l.model,
  COALESCE(s.likes_count, l.likes_count, 0) AS likes_count,
  COALESCE(s.remix_count, l.remix_count, 0) AS remix_count,
  COALESCE(s.views_count, l.views_count, 0) AS views_count
FROM public.user_image_library AS l
LEFT JOIN public.user_image_stats AS s ON s.image_id = l.id
WHERE l.status = 'completed'
  AND l.is_public = true
  AND l.visibility = 'public'
  AND private.galx_is_human_account(l.user_id)
  AND l.user_id NOT LIKE 'usr_%'
  AND l.user_id NOT LIKE 'test_%'
  AND l.id NOT LIKE 'img_test_%'
  AND l.size_bytes IS NOT NULL
  AND l.size_bytes > 1000;

GRANT SELECT ON public.community_creations_feed TO anon, authenticated, service_role;

DROP POLICY IF EXISTS policy_user_image_library_select_public ON public.user_image_library;
CREATE POLICY policy_user_image_library_select_public
  ON public.user_image_library FOR SELECT
  TO anon, authenticated
  USING (
    status = 'completed'
    AND is_public = true
    AND visibility = 'public'
    AND private.galx_is_human_account(user_id)
  );

-- Reassert the private batch writer with an explicit generation_id input. The
-- mapping is inserted only after the library row exists, in the same function
-- transaction, and existing asset provenance can never be overwritten.
CREATE OR REPLACE FUNCTION public.fn_batch_upsert_image_library(p_records JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_records IS NULL OR jsonb_array_length(p_records) = 0 THEN
    RETURN 0;
  END IF;
  IF jsonb_array_length(p_records) > 500 THEN
    RAISE EXCEPTION 'batch is limited to 500 assets' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_records) AS r(id TEXT, user_id TEXT, generation_id TEXT)
    JOIN private.galx_account_identities AS identity_row ON identity_row.account_id = r.user_id
    WHERE identity_row.account_class = 'autonomous'::private.galx_account_class
      AND NULLIF(btrim(r.generation_id), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Autonomous content requires generation provenance' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_records) AS r(id TEXT, user_id TEXT, generation_id TEXT)
    JOIN private.galx_generation_assets AS existing_asset ON existing_asset.asset_id = r.id
    WHERE NULLIF(btrim(r.generation_id), '') IS NOT NULL
      AND existing_asset.generation_id IS DISTINCT FROM r.generation_id
  ) THEN
    RAISE EXCEPTION 'Content provenance cannot be reassigned' USING ERRCODE = '55000';
  END IF;

  INSERT INTO public.user_image_library (
    id, user_id, session_id, status, prompt, revised_prompt, model,
    aspect_ratio, dimensions, quality, public_url, r2_key, content_type,
    size_bytes, sha256, lqip, seed, latency_ms, cost_usd, is_favorite,
    tags, metadata, created_at, updated_at
  )
  SELECT
    r.id,
    r.user_id,
    COALESCE(r.session_id, 'default'),
    COALESCE(r.status, 'completed'),
    r.prompt,
    r.revised_prompt,
    r.model,
    COALESCE(r.aspect_ratio, '1:1'),
    COALESCE(r.dimensions, '1024x1024'),
    COALESCE(r.quality, 'standard'),
    r.public_url,
    r.r2_key,
    COALESCE(r.content_type, 'image/png'),
    COALESCE(r.size_bytes, 0),
    r.sha256,
    r.lqip,
    r.seed,
    COALESCE(r.latency_ms, 0),
    COALESCE(r.cost_usd, 0),
    COALESCE(r.is_favorite, false),
    COALESCE(r.tags, '{}'),
    COALESCE(r.metadata, '{}'::jsonb),
    COALESCE(r.created_at, now()),
    now()
  FROM jsonb_to_recordset(p_records) AS r(
    id TEXT,
    user_id TEXT,
    generation_id TEXT,
    session_id TEXT,
    status TEXT,
    prompt TEXT,
    revised_prompt TEXT,
    model TEXT,
    aspect_ratio TEXT,
    dimensions TEXT,
    quality TEXT,
    public_url TEXT,
    r2_key TEXT,
    content_type TEXT,
    size_bytes BIGINT,
    sha256 TEXT,
    lqip TEXT,
    seed TEXT,
    latency_ms INTEGER,
    cost_usd NUMERIC,
    is_favorite BOOLEAN,
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    revised_prompt = COALESCE(EXCLUDED.revised_prompt, public.user_image_library.revised_prompt),
    is_favorite = EXCLUDED.is_favorite,
    tags = EXCLUDED.tags,
    metadata = EXCLUDED.metadata,
    updated_at = now()
  WHERE public.user_image_library.user_id = EXCLUDED.user_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO private.galx_generation_assets (generation_id, asset_id)
  SELECT DISTINCT r.generation_id, r.id
  FROM jsonb_to_recordset(p_records) AS r(id TEXT, user_id TEXT, generation_id TEXT)
  JOIN public.user_image_library AS library
    ON library.id = r.id
   AND library.user_id = r.user_id
  WHERE NULLIF(btrim(r.generation_id), '') IS NOT NULL
  ON CONFLICT (generation_id, asset_id) DO NOTHING;

  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_batch_upsert_image_library(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_batch_upsert_image_library(JSONB) TO service_role;

COMMENT ON TABLE private.galx_account_identities IS
  'Private account classification registry. Existing and ordinary accounts default to human; autonomous classification is explicit and immutable.';
COMMENT ON TABLE private.galx_autonomous_actors IS
  'Private autonomous actor lifecycle and control metadata. No population is created by the schema migration.';
COMMENT ON TABLE private.galx_administrative_entitlements IS
  'Private administrative entitlement receipts. These are not Stripe checkout, invoice, transaction, or payment records.';
COMMENT ON TABLE private.galx_generation_records IS
  'Private generation receipts retaining originating account provenance for durable content.';
