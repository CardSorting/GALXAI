-- ============================================================================
-- GALXAI: Star participants, public participant projections, and bounded runs
--
-- Stars are autonomous participants, not human users. This migration creates
-- the durable control and presentation boundary for the first cohort without
-- creating actors, entitlements, avatars, or generated content.
-- ============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS private.galx_star_cohorts (
  cohort_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL UNIQUE
    REFERENCES private.galx_autonomous_actor_runs(run_id) ON DELETE RESTRICT,
  cohort_key TEXT NOT NULL UNIQUE
    CHECK (length(btrim(cohort_key)) BETWEEN 1 AND 128),
  label TEXT NOT NULL
    CHECK (length(btrim(label)) BETWEEN 1 AND 160),
  state TEXT NOT NULL DEFAULT 'planned'
    CHECK (state IN ('planned', 'active', 'completed', 'disabled', 'aborted')),
  max_stars SMALLINT NOT NULL DEFAULT 12
    CHECK (max_stars BETWEEN 1 AND 12),
  content_opportunities_per_star SMALLINT NOT NULL DEFAULT 3
    CHECK (content_opportunities_per_star BETWEEN 1 AND 3),
  max_content_attempts INTEGER NOT NULL DEFAULT 36
    CHECK (max_content_attempts > 0),
  max_avatar_attempts INTEGER NOT NULL DEFAULT 0
    CHECK (max_avatar_attempts >= 0),
  max_generation_concurrency SMALLINT NOT NULL DEFAULT 3
    CHECK (max_generation_concurrency BETWEEN 1 AND 3),
  content_attempts INTEGER NOT NULL DEFAULT 0
    CHECK (content_attempts >= 0),
  avatar_attempts INTEGER NOT NULL DEFAULT 0
    CHECK (avatar_attempts >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (max_content_attempts = max_stars * content_opportunities_per_star),
  CHECK (content_attempts <= max_content_attempts),
  CHECK (avatar_attempts <= max_avatar_attempts),
  CHECK (state <> 'active' OR activated_at IS NOT NULL),
  CHECK (state NOT IN ('completed', 'disabled', 'aborted') OR completed_at IS NOT NULL OR disabled_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS galx_star_cohorts_state
  ON private.galx_star_cohorts (state, created_at DESC);

ALTER TABLE private.galx_star_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_star_cohorts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_star_cohorts FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.galx_validate_star_cohort()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_run_owner TEXT;
BEGIN
  SELECT control_owner_account_id INTO v_run_owner
  FROM private.galx_autonomous_actor_runs
  WHERE run_id = NEW.run_id;
  IF v_run_owner IS NULL THEN
    RAISE EXCEPTION 'Star cohort must reference a controlled run' USING ERRCODE = '23514';
  END IF;
  PERFORM private.galx_assert_human_account(v_run_owner, 'Star cohort control owner');

  IF TG_OP = 'UPDATE' THEN
    IF NEW.run_id IS DISTINCT FROM OLD.run_id
       OR NEW.cohort_key IS DISTINCT FROM OLD.cohort_key
       OR NEW.max_stars IS DISTINCT FROM OLD.max_stars
       OR NEW.content_opportunities_per_star IS DISTINCT FROM OLD.content_opportunities_per_star
       OR NEW.max_content_attempts IS DISTINCT FROM OLD.max_content_attempts
       OR NEW.max_avatar_attempts IS DISTINCT FROM OLD.max_avatar_attempts
       OR NEW.max_generation_concurrency IS DISTINCT FROM OLD.max_generation_concurrency THEN
      RAISE EXCEPTION 'Star cohort identity and safety limits are immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD.state IN ('completed', 'disabled', 'aborted')
       AND NEW.state IS DISTINCT FROM OLD.state THEN
      RAISE EXCEPTION 'A closed Star cohort cannot be reactivated' USING ERRCODE = '55000';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_validate_star_cohort() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_validate_star_cohort ON private.galx_star_cohorts;
CREATE TRIGGER galx_validate_star_cohort
BEFORE INSERT OR UPDATE ON private.galx_star_cohorts
FOR EACH ROW EXECUTE FUNCTION private.galx_validate_star_cohort();

-- Actors retain the canonical autonomous identity while the cohort gives the
-- controller an explicit population boundary and cleanup handle.
ALTER TABLE private.galx_autonomous_actors
  ADD COLUMN IF NOT EXISTS cohort_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'private.galx_autonomous_actors'::regclass
      AND conname = 'galx_autonomous_actors_cohort_fkey'
  ) THEN
    ALTER TABLE private.galx_autonomous_actors
      ADD CONSTRAINT galx_autonomous_actors_cohort_fkey
      FOREIGN KEY (cohort_id) REFERENCES private.galx_star_cohorts(cohort_id) ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS galx_autonomous_actors_cohort
  ON private.galx_autonomous_actors (cohort_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.galx_validate_autonomous_actor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_class private.galx_account_class;
  v_run_owner TEXT;
  v_cohort_run UUID;
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

  IF NEW.cohort_id IS NOT NULL THEN
    SELECT run_id INTO v_cohort_run
    FROM private.galx_star_cohorts
    WHERE cohort_id = NEW.cohort_id;
    IF v_cohort_run IS NULL OR NEW.run_id IS DISTINCT FROM v_cohort_run THEN
      RAISE EXCEPTION 'Actor cohort must belong to its actor run' USING ERRCODE = '23514';
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

-- Public-facing participant fields are a separate projection over the
-- canonical profile. Creative persona stays private and is used by the
-- controller; public clients receive only the allowlisted identity fields.
CREATE TABLE IF NOT EXISTS private.galx_star_profiles (
  actor_id UUID PRIMARY KEY
    REFERENCES private.galx_autonomous_actors(actor_id) ON DELETE RESTRICT,
  account_profile_id UUID NOT NULL UNIQUE
    REFERENCES private.galx_account_profiles(id) ON DELETE RESTRICT,
  cohort_id UUID NOT NULL
    REFERENCES private.galx_star_cohorts(cohort_id) ON DELETE RESTRICT,
  handle TEXT NOT NULL UNIQUE
    CHECK (handle = lower(handle)
      AND handle ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  bio TEXT NOT NULL CHECK (length(btrim(bio)) BETWEEN 1 AND 500),
  interests TEXT[] NOT NULL DEFAULT '{}'
    CHECK (cardinality(interests) BETWEEN 1 AND 12),
  creative_persona JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(creative_persona) = 'object'),
  avatar_url TEXT,
  avatar_asset_key TEXT,
  avatar_source TEXT NOT NULL DEFAULT 'deterministic_svg'
    CHECK (avatar_source IN ('deterministic_svg', 'galx_image_generation')),
  avatar_generation_attempts SMALLINT NOT NULL DEFAULT 0
    CHECK (avatar_generation_attempts >= 0),
  is_discoverable BOOLEAN NOT NULL DEFAULT true,
  revision BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS galx_star_profiles_cohort
  ON private.galx_star_profiles (cohort_id, created_at DESC);
CREATE INDEX IF NOT EXISTS galx_star_profiles_discoverable
  ON private.galx_star_profiles (is_discoverable, handle);

ALTER TABLE private.galx_star_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_star_profiles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_star_profiles FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.galx_validate_star_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_account_id TEXT;
  v_account_profile UUID;
  v_actor_cohort UUID;
  v_class private.galx_account_class;
BEGIN
  SELECT actor.account_id, actor.cohort_id, identity.account_class, identity.profile_id
  INTO v_account_id, v_actor_cohort, v_class, v_account_profile
  FROM private.galx_autonomous_actors AS actor
  JOIN private.galx_account_identities AS identity ON identity.account_id = actor.account_id
  WHERE actor.actor_id = NEW.actor_id;

  IF v_class IS DISTINCT FROM 'autonomous'::private.galx_account_class
     OR v_actor_cohort IS DISTINCT FROM NEW.cohort_id
     OR v_account_profile IS DISTINCT FROM NEW.account_profile_id THEN
    RAISE EXCEPTION 'Star profile must match its autonomous actor, cohort, and canonical profile'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.actor_id IS DISTINCT FROM OLD.actor_id
       OR NEW.account_profile_id IS DISTINCT FROM OLD.account_profile_id
       OR NEW.cohort_id IS DISTINCT FROM OLD.cohort_id
       OR NEW.handle IS DISTINCT FROM OLD.handle
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Star identity fields are immutable' USING ERRCODE = '55000';
    END IF;
    IF NEW.revision <> OLD.revision + 1 THEN
      RAISE EXCEPTION 'Star profile revision must advance exactly once' USING ERRCODE = '55000';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_validate_star_profile() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_validate_star_profile ON private.galx_star_profiles;
CREATE TRIGGER galx_validate_star_profile
BEFORE INSERT OR UPDATE ON private.galx_star_profiles
FOR EACH ROW EXECUTE FUNCTION private.galx_validate_star_profile();

CREATE OR REPLACE FUNCTION private.galx_guard_star_profile_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Star profiles are retained; disable discoverability instead' USING ERRCODE = '55000';
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_guard_star_profile_delete() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_guard_star_profile_delete ON private.galx_star_profiles;
CREATE TRIGGER galx_guard_star_profile_delete
BEFORE DELETE ON private.galx_star_profiles
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_star_profile_delete();

-- Each row is one bounded real-generation opportunity. The database owns the
-- ceiling so a controller bug cannot silently expand the population run.
CREATE TABLE IF NOT EXISTS private.galx_star_generation_attempts (
  attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL
    REFERENCES private.galx_star_cohorts(cohort_id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL
    REFERENCES private.galx_autonomous_actors(actor_id) ON DELETE RESTRICT,
  generation_id TEXT
    REFERENCES private.galx_generation_records(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('content', 'avatar')),
  opportunity_number SMALLINT NOT NULL CHECK (opportunity_number > 0),
  prompt TEXT NOT NULL CHECK (length(btrim(prompt)) BETWEEN 1 AND 4000),
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(parameters) = 'object'),
  state TEXT NOT NULL DEFAULT 'queued'
    CHECK (state IN ('queued', 'generating', 'completed', 'failed', 'cancelled')),
  failure_code TEXT,
  asset_ids TEXT[] NOT NULL DEFAULT '{}',
  relay_confirmed_at TIMESTAMPTZ,
  estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0
    CHECK (estimated_cost_usd >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (actor_id, kind, opportunity_number),
  CHECK ((kind = 'content' AND opportunity_number BETWEEN 1 AND 3)
      OR (kind = 'avatar' AND opportunity_number = 1)),
  CHECK (state <> 'completed' OR completed_at IS NOT NULL),
  CHECK (state <> 'generating' OR started_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS galx_star_generation_attempts_cohort
  ON private.galx_star_generation_attempts (cohort_id, created_at DESC);
CREATE INDEX IF NOT EXISTS galx_star_generation_attempts_actor
  ON private.galx_star_generation_attempts (actor_id, kind, opportunity_number);
CREATE INDEX IF NOT EXISTS galx_star_generation_attempts_generation
  ON private.galx_star_generation_attempts (generation_id)
  WHERE generation_id IS NOT NULL;

ALTER TABLE private.galx_star_generation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_star_generation_attempts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_star_generation_attempts FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.galx_guard_star_generation_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_cohort private.galx_star_cohorts%ROWTYPE;
  v_actor_account TEXT;
  v_actor_cohort UUID;
  v_class private.galx_account_class;
  v_generation_account TEXT;
BEGIN
  SELECT * INTO v_cohort
  FROM private.galx_star_cohorts
  WHERE cohort_id = NEW.cohort_id
  FOR UPDATE;
  IF v_cohort.cohort_id IS NULL THEN
    RAISE EXCEPTION 'Star generation attempt must reference a cohort' USING ERRCODE = '23514';
  END IF;
  IF v_cohort.state <> 'active' THEN
    RAISE EXCEPTION 'Star generation attempts require an active cohort' USING ERRCODE = '55000';
  END IF;

  SELECT account_id, cohort_id INTO v_actor_account, v_actor_cohort
  FROM private.galx_autonomous_actors
  WHERE actor_id = NEW.actor_id AND is_enabled = true;
  IF v_actor_account IS NULL OR v_actor_cohort IS DISTINCT FROM NEW.cohort_id THEN
    RAISE EXCEPTION 'Star generation attempt actor is not an enabled member of the cohort'
      USING ERRCODE = '23514';
  END IF;
  SELECT account_class INTO v_class
  FROM private.galx_account_identities
  WHERE account_id = v_actor_account;
  IF v_class IS DISTINCT FROM 'autonomous'::private.galx_account_class THEN
    RAISE EXCEPTION 'Star generation attempt actor is not autonomous' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.kind = 'content' THEN
      IF v_cohort.content_attempts >= v_cohort.max_content_attempts THEN
        RAISE EXCEPTION 'Star content generation ceiling reached' USING ERRCODE = '55000';
      END IF;
      UPDATE private.galx_star_cohorts
      SET content_attempts = content_attempts + 1
      WHERE cohort_id = NEW.cohort_id;
    ELSE
      IF v_cohort.avatar_attempts >= v_cohort.max_avatar_attempts THEN
        RAISE EXCEPTION 'Star avatar generation ceiling reached' USING ERRCODE = '55000';
      END IF;
      UPDATE private.galx_star_cohorts
      SET avatar_attempts = avatar_attempts + 1
      WHERE cohort_id = NEW.cohort_id;
    END IF;
  ELSE
    IF NEW.attempt_id IS DISTINCT FROM OLD.attempt_id
       OR NEW.cohort_id IS DISTINCT FROM OLD.cohort_id
       OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
       OR NEW.kind IS DISTINCT FROM OLD.kind
       OR NEW.opportunity_number IS DISTINCT FROM OLD.opportunity_number
       OR NEW.prompt IS DISTINCT FROM OLD.prompt
       OR NEW.parameters IS DISTINCT FROM OLD.parameters
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Star generation attempt identity is immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD.state IN ('completed', 'failed', 'cancelled') AND NEW.state IS DISTINCT FROM OLD.state THEN
      RAISE EXCEPTION 'A terminal Star generation attempt cannot be reopened' USING ERRCODE = '55000';
    END IF;
  END IF;

  IF NEW.generation_id IS NOT NULL THEN
    SELECT account_id INTO v_generation_account
    FROM private.galx_generation_records
    WHERE id = NEW.generation_id;
    IF v_generation_account IS DISTINCT FROM v_actor_account THEN
      RAISE EXCEPTION 'Generation provenance must remain owned by the Star actor'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_guard_star_generation_attempt() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_guard_star_generation_attempt ON private.galx_star_generation_attempts;
CREATE TRIGGER galx_guard_star_generation_attempt
BEFORE INSERT OR UPDATE ON private.galx_star_generation_attempts
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_star_generation_attempt();

CREATE OR REPLACE FUNCTION private.galx_guard_star_generation_attempt_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Star generation attempts are append-only' USING ERRCODE = '55000';
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_guard_star_generation_attempt_delete() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_guard_star_generation_attempt_delete ON private.galx_star_generation_attempts;
CREATE TRIGGER galx_guard_star_generation_attempt_delete
BEFORE DELETE ON private.galx_star_generation_attempts
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_star_generation_attempt_delete();

-- Narrow server predicates keep private account classification and entitlement
-- rows out of public responses while allowing RLS/view evaluation.
CREATE OR REPLACE FUNCTION private.galx_is_public_participant(p_account_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM private.galx_account_identities AS identity_row
    WHERE identity_row.account_id = p_account_id
      AND (
        identity_row.account_class = 'human'::private.galx_account_class
        OR EXISTS (
          SELECT 1
          FROM private.galx_star_profiles AS star
          JOIN private.galx_autonomous_actors AS actor ON actor.actor_id = star.actor_id
          WHERE actor.account_id = identity_row.account_id
            AND star.is_discoverable = true
        )
      )
  );
$function$;

REVOKE ALL ON FUNCTION private.galx_is_public_participant(TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.galx_is_public_participant(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.galx_has_active_administrative_entitlement(
  p_account_id TEXT,
  p_entitlement_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM private.galx_administrative_entitlements AS entitlement
    JOIN private.galx_account_identities AS identity_row
      ON identity_row.account_id = entitlement.account_id
    WHERE entitlement.account_id = p_account_id
      AND entitlement.entitlement_key = p_entitlement_key
      AND entitlement.source = 'administrative'::private.galx_entitlement_source
      AND identity_row.account_class = 'autonomous'::private.galx_account_class
      AND entitlement.revoked_at IS NULL
      AND entitlement.starts_at <= statement_timestamp()
      AND (entitlement.ends_at IS NULL OR entitlement.ends_at > statement_timestamp())
  );
$function$;

REVOKE ALL ON FUNCTION private.galx_has_active_administrative_entitlement(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;

-- A private analytics projection retains the human/Star distinction for
-- reporting without changing existing human-only metric definitions.
CREATE OR REPLACE VIEW private.galx_participant_generation_activity AS
SELECT
  date_trunc('day', generation.created_at)::DATE AS activity_day,
  CASE WHEN identity_row.account_class = 'autonomous'::private.galx_account_class
    THEN 'star' ELSE 'human' END AS participant_kind,
  COUNT(*)::BIGINT AS generation_attempts,
  COUNT(*) FILTER (WHERE generation.state = 'completed')::BIGINT AS completed_generations,
  COUNT(*) FILTER (WHERE generation.state = 'failed')::BIGINT AS failed_generations
FROM private.galx_generation_records AS generation
JOIN private.galx_account_identities AS identity_row
  ON identity_row.account_id = generation.account_id
GROUP BY date_trunc('day', generation.created_at)::DATE,
  CASE WHEN identity_row.account_class = 'autonomous'::private.galx_account_class
    THEN 'star' ELSE 'human' END;

REVOKE ALL ON private.galx_participant_generation_activity FROM PUBLIC, anon, authenticated, service_role;

-- Public feed: same creation surface for humans and Stars, with an explicit
-- allowlist for attribution. Internal owner keys, profile IDs, and private
-- creative configuration never leave the database boundary.
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
  COALESCE(s.views_count, l.views_count, 0) AS views_count,
  COALESCE(profile.display_name, 'GALX creator') AS author_display_name,
  star.handle AS author_handle,
  star.bio AS author_bio,
  star.avatar_url AS author_avatar_url,
  CASE WHEN identity_row.account_class = 'autonomous'::private.galx_account_class
    THEN 'star' ELSE 'human' END AS participant_kind,
  COALESCE(star.interests, '{}'::TEXT[]) AS author_interests
FROM public.user_image_library AS l
JOIN private.galx_account_identities AS identity_row
  ON identity_row.account_id = l.user_id
JOIN private.galx_account_profiles AS profile
  ON profile.id = identity_row.profile_id
LEFT JOIN private.galx_star_profiles AS star
  ON star.account_profile_id = profile.id
LEFT JOIN public.user_image_stats AS s ON s.image_id = l.id
WHERE l.status = 'completed'
  AND l.is_public = true
  AND l.visibility = 'public'
  AND private.galx_is_public_participant(l.user_id)
  AND l.user_id NOT LIKE 'usr_%'
  AND l.user_id NOT LIKE 'test_%'
  AND l.id NOT LIKE 'img_test_%'
  AND l.size_bytes IS NOT NULL
  AND l.size_bytes > 1000;

GRANT SELECT ON public.community_creations_feed TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.community_participant_profiles AS
SELECT
  profile.display_name,
  star.handle,
  star.bio,
  star.avatar_url,
  star.interests,
  'star'::TEXT AS participant_kind,
  COUNT(l.id)::BIGINT AS creation_count,
  profile.created_at
FROM private.galx_star_profiles AS star
JOIN private.galx_account_profiles AS profile ON profile.id = star.account_profile_id
JOIN private.galx_autonomous_actors AS actor ON actor.actor_id = star.actor_id
LEFT JOIN public.user_image_library AS l
  ON l.user_id = actor.account_id
  AND l.status = 'completed'
  AND l.is_public = true
  AND l.visibility = 'public'
WHERE star.is_discoverable = true
  AND profile.status = 'active'
GROUP BY profile.display_name, star.handle, star.bio, star.avatar_url,
  star.interests, profile.created_at
UNION ALL
SELECT
  profile.display_name,
  NULL::TEXT AS handle,
  NULL::TEXT AS bio,
  NULL::TEXT AS avatar_url,
  '{}'::TEXT[] AS interests,
  'human'::TEXT AS participant_kind,
  COUNT(l.id)::BIGINT AS creation_count,
  profile.created_at
FROM private.galx_account_profiles AS profile
JOIN private.galx_account_identities AS identity_row
  ON identity_row.profile_id = profile.id
LEFT JOIN public.user_image_library AS l
  ON l.user_id = identity_row.account_id
  AND l.status = 'completed'
  AND l.is_public = true
  AND l.visibility = 'public'
WHERE identity_row.account_class = 'human'::private.galx_account_class
  AND profile.status = 'active'
GROUP BY profile.display_name, profile.created_at;

GRANT SELECT ON public.community_participant_profiles TO anon, authenticated, service_role;

DROP POLICY IF EXISTS policy_user_image_library_select_public ON public.user_image_library;
CREATE POLICY policy_user_image_library_select_public
  ON public.user_image_library FOR SELECT
  TO anon, authenticated
  USING (
    status = 'completed'
    AND is_public = true
    AND visibility = 'public'
    AND private.galx_is_public_participant(user_id)
  );

COMMENT ON TABLE private.galx_star_cohorts IS
  'Bounded autonomous participant cohorts. Limits are database-enforced and no cohort is populated by migration.';
COMMENT ON TABLE private.galx_star_profiles IS
  'Private creative profiles for autonomous Star actors; public identity is exposed only through allowlisted views.';
COMMENT ON TABLE private.galx_star_generation_attempts IS
  'Append-only Star generation opportunities retaining bounded execution and relay provenance.';
COMMENT ON VIEW public.community_creations_feed IS
  'Allowlisted community creations for humans and visibly autonomous Stars.';
