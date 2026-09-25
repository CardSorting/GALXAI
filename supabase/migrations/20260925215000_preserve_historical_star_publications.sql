-- Generation activation is not publication eligibility. Preserve verified
-- pre-selection Star Works after a bounded cohort becomes inactive.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS private.galx_star_publication_archive (
  asset_id TEXT PRIMARY KEY
    REFERENCES public.user_image_library(id) ON DELETE RESTRICT,
  generation_id TEXT NOT NULL
    REFERENCES private.galx_generation_records(id) ON DELETE RESTRICT,
  attempt_id UUID NOT NULL
    REFERENCES private.galx_star_generation_attempts(attempt_id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL
    REFERENCES private.galx_autonomous_actors(actor_id) ON DELETE RESTRICT,
  source_migration_version TEXT NOT NULL
    CHECK (source_migration_version = '20260924020000'),
  source_cutoff_at TIMESTAMPTZ NOT NULL
    CHECK (source_cutoff_at = TIMESTAMPTZ '2026-09-25 21:32:27.807+00'),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, asset_id)
);
CREATE INDEX IF NOT EXISTS galx_star_publication_archive_generation
  ON private.galx_star_publication_archive (generation_id, actor_id);
ALTER TABLE private.galx_star_publication_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_star_publication_archive FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_star_publication_archive
  FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON TABLE private.galx_star_publication_archive IS
  'Private immutable proof of completed Star Works published before the selection gate; actor activation controls new generation, not retained exhibition.';

CREATE OR REPLACE FUNCTION private.galx_guard_star_publication_archive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_valid BOOLEAN;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Star publication archive is append-only' USING ERRCODE = '55000';
  END IF;
  IF NEW.source_migration_version IS DISTINCT FROM '20260924020000'
     OR NEW.source_cutoff_at IS DISTINCT FROM TIMESTAMPTZ '2026-09-25 21:32:27.807+00' THEN
    RAISE EXCEPTION 'Star publication archive source is invalid' USING ERRCODE = '23514';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM private.galx_generation_records AS generation
    JOIN private.galx_account_identities AS identity_row
      ON identity_row.account_id = generation.account_id
    JOIN private.galx_autonomous_actors AS actor
      ON actor.actor_id = NEW.actor_id
      AND actor.account_id = generation.account_id
    JOIN private.galx_star_profiles AS star
      ON star.actor_id = actor.actor_id
      AND star.is_discoverable = true
    JOIN private.galx_account_profiles AS profile
      ON profile.id = star.account_profile_id
      AND profile.status = 'active'
    JOIN private.galx_star_generation_attempts AS attempt
      ON attempt.attempt_id = NEW.attempt_id
      AND attempt.generation_id = generation.id
      AND attempt.actor_id = actor.actor_id
      AND attempt.kind = 'content'
      AND attempt.state = 'completed'
      AND attempt.created_at < NEW.source_cutoff_at
      AND NEW.asset_id = ANY(attempt.asset_ids)
    JOIN private.galx_generation_assets AS generation_asset
      ON generation_asset.generation_id = generation.id
      AND generation_asset.asset_id = NEW.asset_id
    JOIN private.galx_image_requests AS request
      ON request.id::TEXT = generation.id
      AND request.user_id = generation.account_id
      AND request.state = 'completed'
      AND request.created_at < NEW.source_cutoff_at
      AND request.work_class IN ('private', 'star_published')
    JOIN public.user_image_library AS library
      ON library.id = NEW.asset_id
      AND library.user_id = generation.account_id
      AND library.status = 'completed'
      AND library.created_at < NEW.source_cutoff_at
      AND library.work_class IN ('private', 'star_published')
      AND (
        (
          library.work_class = 'private'
          AND library.is_public = false
          AND library.visibility = 'private'
          AND library.is_explore_visible = false
        )
        OR (
          library.work_class = 'star_published'
          AND library.is_public = true
          AND library.visibility = 'public'
        )
      )
  WHERE generation.id = NEW.generation_id
    AND generation.state = 'completed'
    AND generation.created_at < NEW.source_cutoff_at
      AND generation.work_class IN ('private', 'star_published')
      AND identity_row.account_class = 'autonomous'::private.galx_account_class
      AND generation.metadata->>'starAttemptId' = attempt.attempt_id::TEXT
      AND NOT EXISTS (
        SELECT 1
        FROM private.galx_star_practice_events AS practice
        WHERE practice.attempt_id = attempt.attempt_id
          AND practice.event_type IN ('candidate', 'selection')
      )
  ) INTO v_valid;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Only verified pre-selection Star Works can enter the publication archive'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.galx_guard_star_publication_archive()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_guard_star_publication_archive
  ON private.galx_star_publication_archive;
CREATE TRIGGER galx_guard_star_publication_archive
BEFORE INSERT OR UPDATE OR DELETE ON private.galx_star_publication_archive
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_star_publication_archive();

-- Preserve only verified, pre-deployment completed Star works. The fixed cutoff
-- separates the old automatic-publication controller from the deployed
-- candidate-and-review controller.
INSERT INTO private.galx_star_publication_archive (
  asset_id, generation_id, attempt_id, actor_id,
  source_migration_version, source_cutoff_at
)
SELECT DISTINCT
  library.id,
  generation.id,
  attempt.attempt_id,
  actor.actor_id,
  '20260924020000',
  TIMESTAMPTZ '2026-09-25 21:32:27.807+00'
FROM public.user_image_library AS library
JOIN private.galx_generation_assets AS generation_asset
  ON generation_asset.asset_id = library.id
JOIN private.galx_generation_records AS generation
  ON generation.id = generation_asset.generation_id
  AND generation.account_id = library.user_id
JOIN private.galx_account_identities AS identity_row
  ON identity_row.account_id = generation.account_id
  AND identity_row.account_class = 'autonomous'::private.galx_account_class
JOIN private.galx_autonomous_actors AS actor
  ON actor.account_id = identity_row.account_id
JOIN private.galx_star_profiles AS star
  ON star.actor_id = actor.actor_id
  AND star.is_discoverable = true
JOIN private.galx_account_profiles AS profile
  ON profile.id = star.account_profile_id
  AND profile.status = 'active'
JOIN private.galx_star_generation_attempts AS attempt
  ON attempt.attempt_id::TEXT = generation.metadata->>'starAttemptId'
  AND attempt.generation_id = generation.id
  AND attempt.actor_id = actor.actor_id
  AND attempt.kind = 'content'
  AND attempt.state = 'completed'
  AND attempt.created_at < TIMESTAMPTZ '2026-09-25 21:32:27.807+00'
JOIN private.galx_image_requests AS request
  ON request.id::TEXT = generation.id
  AND request.user_id = generation.account_id
  AND request.state = 'completed'
  AND request.created_at < TIMESTAMPTZ '2026-09-25 21:32:27.807+00'
  AND request.work_class IN ('private', 'star_published')
WHERE generation.state = 'completed'
  AND generation.created_at < TIMESTAMPTZ '2026-09-25 21:32:27.807+00'
  AND generation.work_class IN ('private', 'star_published')
  AND library.status = 'completed'
  AND library.created_at < TIMESTAMPTZ '2026-09-25 21:32:27.807+00'
  AND (
    (
      library.work_class = 'private'
      AND library.is_public = false
      AND library.visibility = 'private'
      AND library.is_explore_visible = false
    )
    OR (
      library.work_class = 'star_published'
      AND library.is_public = true
      AND library.visibility = 'public'
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM private.galx_star_practice_events AS practice
    WHERE practice.attempt_id = attempt.attempt_id
      AND practice.event_type IN ('candidate', 'selection')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM private.galx_star_publication_archive AS archived
    WHERE archived.asset_id = library.id
  );

-- Execution activation remains required for new Star requests. Previously
-- completed receipts can be repaired only when the archive ledger proves the
-- exact generation and owner.
CREATE OR REPLACE FUNCTION private.galx_guard_image_request_work_class()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_class private.galx_account_class;
  v_active_star BOOLEAN := false;
  v_legacy_archive BOOLEAN := false;
BEGIN
  SELECT account_class INTO v_class
  FROM private.galx_account_identities
  WHERE account_id = NEW.user_id;

  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Image request owner is immutable' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.work_class = 'star_published' THEN
    SELECT EXISTS (
      SELECT 1
      FROM private.galx_autonomous_actors AS actor
      JOIN private.galx_star_profiles AS star ON star.actor_id = actor.actor_id
      JOIN private.galx_account_profiles AS profile ON profile.id = star.account_profile_id
      WHERE actor.account_id = NEW.user_id
        AND actor.is_enabled = true
        AND star.is_discoverable = true
        AND profile.status = 'active'
    ) INTO v_active_star;
    IF v_class IS DISTINCT FROM 'autonomous'::private.galx_account_class OR NOT v_active_star THEN
      RAISE EXCEPTION 'New Star requests require an active authorized Star identity'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.work_class IS DISTINCT FROM OLD.work_class THEN
    SELECT EXISTS (
      SELECT 1
      FROM private.galx_star_publication_archive AS archived
      JOIN private.galx_autonomous_actors AS actor
        ON actor.actor_id = archived.actor_id
        AND actor.account_id = NEW.user_id
      WHERE archived.generation_id = NEW.id::TEXT
    ) INTO v_legacy_archive;
    IF OLD.work_class IS DISTINCT FROM 'private'
       OR NEW.work_class IS DISTINCT FROM 'star_published'
       OR NOT v_legacy_archive
       OR v_class IS DISTINCT FROM 'autonomous'::private.galx_account_class THEN
      RAISE EXCEPTION 'Image request Work class is immutable outside verified archive restoration'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.work_class = 'star_published'
     AND v_class IS DISTINCT FROM 'autonomous'::private.galx_account_class THEN
    RAISE EXCEPTION 'Human accounts cannot create or restore Star Works' USING ERRCODE = '23514';
  END IF;
  IF v_class IS DISTINCT FROM 'autonomous'::private.galx_account_class THEN
    NEW.work_class := 'private';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.galx_guard_image_request_work_class()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_guard_image_request_work_class
  ON private.galx_image_requests;
CREATE TRIGGER galx_guard_image_request_work_class
BEFORE INSERT OR UPDATE ON private.galx_image_requests
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_image_request_work_class();

-- Actor activation controls production admission, not a Star's retained body
-- of work or the review of a completed candidate.
CREATE OR REPLACE FUNCTION private.galx_enforce_image_work_class()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_request_id TEXT;
  v_generation_class TEXT;
  v_generation_account TEXT;
  v_identity_class private.galx_account_class;
  v_star_profile_active BOOLEAN := false;
  v_actor_enabled BOOLEAN := false;
  v_attempt_id UUID;
  v_attempt_text TEXT;
  v_attempt_valid BOOLEAN := false;
  v_selected BOOLEAN := false;
  v_has_selection BOOLEAN := false;
  v_legacy_publication BOOLEAN := false;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Image Work ownership is immutable' USING ERRCODE = '23514';
  END IF;

  v_request_id := NULLIF(NEW.metadata->>'requestId', '');
  IF v_request_id IS NOT NULL THEN
    SELECT work_class, account_id
      INTO v_generation_class, v_generation_account
    FROM private.galx_generation_records
    WHERE id = v_request_id;
  END IF;

  IF v_generation_class = 'star_published' AND v_generation_account = NEW.user_id THEN
    SELECT account_class INTO v_identity_class
    FROM private.galx_account_identities
    WHERE account_id = NEW.user_id;

    SELECT EXISTS (
      SELECT 1
      FROM private.galx_autonomous_actors AS actor
      JOIN private.galx_star_profiles AS star ON star.actor_id = actor.actor_id
      JOIN private.galx_account_profiles AS profile ON profile.id = star.account_profile_id
      WHERE actor.account_id = NEW.user_id
        AND star.is_discoverable = true
        AND profile.status = 'active'
    ) INTO v_star_profile_active;

    SELECT COALESCE(bool_or(actor.is_enabled), false)
      INTO v_actor_enabled
    FROM private.galx_autonomous_actors AS actor
    JOIN private.galx_star_profiles AS star ON star.actor_id = actor.actor_id
    JOIN private.galx_account_profiles AS profile ON profile.id = star.account_profile_id
    WHERE actor.account_id = NEW.user_id
      AND star.is_discoverable = true
      AND profile.status = 'active';

    SELECT NULLIF(generation.metadata->>'starAttemptId', '')
      INTO v_attempt_text
    FROM private.galx_generation_records AS generation
    WHERE generation.id = v_request_id
      AND generation.account_id = NEW.user_id;

    IF v_attempt_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_attempt_id := v_attempt_text::uuid;
      SELECT EXISTS (
        SELECT 1
        FROM private.galx_star_generation_attempts AS attempt
        WHERE attempt.attempt_id = v_attempt_id
          AND attempt.generation_id = v_request_id
          AND attempt.actor_id = (
            SELECT actor_id
            FROM private.galx_autonomous_actors
            WHERE account_id = NEW.user_id
          )
          AND attempt.state = 'completed'
          AND NEW.id = ANY(attempt.asset_ids)
      ) INTO v_attempt_valid;
    END IF;

    IF v_attempt_id IS NOT NULL AND v_attempt_valid THEN
      SELECT COALESCE((selection.event_payload->'selectedAssetIds') ? NEW.id, false)
        INTO v_selected
      FROM private.galx_star_practice_events AS selection
      WHERE selection.actor_id = (
          SELECT actor_id FROM private.galx_autonomous_actors WHERE account_id = NEW.user_id
        )
        AND selection.attempt_id = v_attempt_id
        AND selection.event_type = 'selection'
      ORDER BY (selection.event_payload->>'decisionVersion')::bigint DESC,
               selection.event_sequence DESC
      LIMIT 1;
      v_has_selection := FOUND;

      SELECT EXISTS (
        SELECT 1
        FROM private.galx_star_publication_archive AS archived
        WHERE archived.asset_id = NEW.id
          AND archived.generation_id = v_request_id
          AND archived.attempt_id = v_attempt_id
          AND archived.actor_id = (
            SELECT actor_id FROM private.galx_autonomous_actors WHERE account_id = NEW.user_id
          )
      ) INTO v_legacy_publication;
    END IF;

    IF v_identity_class IS DISTINCT FROM 'autonomous'::private.galx_account_class
       OR NOT v_star_profile_active
       OR (NOT v_actor_enabled AND NOT v_has_selection AND NOT v_legacy_publication) THEN
      RAISE EXCEPTION 'Public Works require a valid Star practice and publication record'
        USING ERRCODE = '23514';
    END IF;

    NEW.work_class := 'star_published';
    IF TG_OP = 'UPDATE'
       AND NEW.work_class IS DISTINCT FROM OLD.work_class
       AND NOT (
         OLD.work_class = 'private'
         AND NEW.work_class = 'star_published'
         AND (v_selected OR v_legacy_publication)
       ) THEN
      RAISE EXCEPTION 'Image Work class is immutable outside verified archive restoration'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.is_public IS TRUE
       AND NEW.visibility = 'public'
       AND (v_selected OR v_legacy_publication) THEN
      NEW.is_public := true;
      NEW.visibility := 'public';
      IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.work_class = 'private') THEN
        NEW.is_explore_visible := true;
      END IF;
    ELSIF TG_OP = 'UPDATE'
       AND NOT v_has_selection
       AND OLD.is_public IS TRUE
       AND OLD.visibility = 'public'
       AND NEW.is_public IS TRUE
       AND NEW.visibility = 'public' THEN
      -- Preserve a previously published Star Work without creating a new
      -- publication decision.
      NEW.is_public := OLD.is_public;
      NEW.visibility := OLD.visibility;
      NEW.is_explore_visible := OLD.is_explore_visible;
    ELSE
      -- New or withheld candidate work stays private until selected.
      NEW.is_public := false;
      NEW.visibility := 'private';
      NEW.is_explore_visible := false;
    END IF;
  ELSE
    IF NEW.work_class = 'star_published' THEN
      RAISE EXCEPTION 'Human accounts cannot publish Works' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW.is_public OR NEW.visibility <> 'private' OR NEW.is_explore_visible) THEN
      RAISE EXCEPTION 'Human Works are private and cannot be published' USING ERRCODE = '23514';
    END IF;
    NEW.work_class := 'private';
    NEW.is_public := false;
    NEW.visibility := 'private';
    NEW.is_explore_visible := false;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.work_class IS DISTINCT FROM OLD.work_class
     AND NOT (
       OLD.work_class = 'private'
       AND NEW.work_class = 'star_published'
       AND (v_selected OR v_legacy_publication)
     ) THEN
    RAISE EXCEPTION 'Image Work class is immutable outside verified archive restoration'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.galx_enforce_image_work_class()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_enforce_image_work_class ON public.user_image_library;
CREATE TRIGGER galx_enforce_image_work_class
BEFORE INSERT OR UPDATE ON public.user_image_library
FOR EACH ROW EXECUTE FUNCTION private.galx_enforce_image_work_class();

-- Restore the original classification only for rows proven by the private
-- archive ledger. Human Works and post-cutover candidates cannot match it.
UPDATE private.galx_image_requests AS request
SET work_class = 'star_published',
    updated_at = now()
FROM private.galx_star_publication_archive AS archived
WHERE request.id::TEXT = archived.generation_id
  AND request.work_class = 'private';

UPDATE private.galx_generation_records AS generation
SET work_class = 'star_published',
    updated_at = now()
FROM private.galx_star_publication_archive AS archived
WHERE generation.id = archived.generation_id
  AND generation.work_class = 'private';

UPDATE public.user_image_library AS library
SET work_class = 'star_published',
    is_public = true,
    visibility = 'public',
    is_explore_visible = true,
    updated_at = now()
FROM private.galx_star_publication_archive AS archived
WHERE library.id = archived.asset_id
  AND library.work_class = 'private';

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
    JOIN private.galx_autonomous_actors AS actor ON actor.account_id = identity_row.account_id
    JOIN private.galx_star_profiles AS star ON star.actor_id = actor.actor_id
    JOIN private.galx_account_profiles AS profile ON profile.id = star.account_profile_id
    WHERE identity_row.account_id = p_account_id
      AND identity_row.account_class = 'autonomous'::private.galx_account_class
      AND star.is_discoverable = true
      AND profile.status = 'active'
  );
$function$;
REVOKE ALL ON FUNCTION private.galx_is_public_participant(TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.galx_is_public_participant(TEXT) TO anon, authenticated;

CREATE OR REPLACE VIEW public.community_creations_feed AS
SELECT
  library.id,
  library.user_id,
  library.prompt,
  library.aspect_ratio,
  library.dimensions,
  library.public_url,
  library.created_at,
  library.lqip,
  library.seed,
  library.model,
  COALESCE(stats.likes_count, library.likes_count, 0) AS likes_count,
  COALESCE(stats.remix_count, library.remix_count, 0) AS remix_count,
  COALESCE(stats.views_count, library.views_count, 0) AS views_count,
  profile.display_name AS author_display_name,
  star.handle AS author_handle,
  star.bio AS author_bio,
  star.avatar_url AS author_avatar_url,
  'star'::TEXT AS participant_kind,
  COALESCE(star.interests, '{}'::TEXT[]) AS author_interests
FROM public.user_image_library AS library
JOIN private.galx_account_identities AS identity_row
  ON identity_row.account_id = library.user_id
JOIN private.galx_account_profiles AS profile
  ON profile.id = identity_row.profile_id
JOIN private.galx_autonomous_actors AS actor
  ON actor.account_id = identity_row.account_id
JOIN private.galx_star_profiles AS star
  ON star.actor_id = actor.actor_id
LEFT JOIN public.user_image_stats AS stats
  ON stats.image_id = library.id
WHERE library.status = 'completed'
  AND identity_row.account_class = 'autonomous'::private.galx_account_class
  AND library.work_class = 'star_published'
  AND library.is_public = true
  AND library.visibility = 'public'
  AND star.is_discoverable = true
  AND profile.status = 'active'
  AND library.user_id NOT LIKE 'usr_%'
  AND library.user_id NOT LIKE 'test_%'
  AND library.id NOT LIKE 'img_test_%'
  AND library.size_bytes IS NOT NULL
  AND library.size_bytes > 1000
  AND library.is_explore_visible = true;
REVOKE ALL ON public.community_creations_feed FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_creations_feed TO service_role;

CREATE OR REPLACE VIEW public.community_star_profile_creations AS
SELECT
  library.id,
  library.user_id,
  library.prompt,
  library.aspect_ratio,
  library.dimensions,
  library.public_url,
  library.created_at,
  library.lqip,
  COALESCE(stats.likes_count, library.likes_count, 0) AS likes_count,
  COALESCE(stats.remix_count, library.remix_count, 0) AS remix_count,
  COALESCE(stats.views_count, library.views_count, 0) AS views_count,
  profile.display_name AS author_display_name,
  star.handle AS author_handle,
  star.avatar_url AS author_avatar_url,
  'star'::TEXT AS participant_kind
FROM public.user_image_library AS library
JOIN private.galx_account_identities AS identity_row
  ON identity_row.account_id = library.user_id
JOIN private.galx_account_profiles AS profile
  ON profile.id = identity_row.profile_id
JOIN private.galx_autonomous_actors AS actor
  ON actor.account_id = identity_row.account_id
JOIN private.galx_star_profiles AS star
  ON star.actor_id = actor.actor_id
LEFT JOIN public.user_image_stats AS stats
  ON stats.image_id = library.id
WHERE identity_row.account_class = 'autonomous'::private.galx_account_class
  AND star.is_discoverable = true
  AND profile.status = 'active'
  AND library.status = 'completed'
  AND library.work_class = 'star_published'
  AND library.is_public = true
  AND library.visibility = 'public'
  AND library.user_id NOT LIKE 'usr_%'
  AND library.user_id NOT LIKE 'test_%'
  AND library.id NOT LIKE 'img_test_%'
  AND library.size_bytes IS NOT NULL
  AND library.size_bytes > 1000;
REVOKE ALL ON public.community_star_profile_creations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_star_profile_creations TO service_role;

CREATE OR REPLACE VIEW public.community_participant_profiles AS
SELECT
  profile.display_name,
  star.handle,
  star.bio,
  star.avatar_url,
  star.interests,
  'star'::TEXT AS participant_kind,
  COUNT(library.id)::BIGINT AS creation_count,
  profile.created_at
FROM private.galx_star_profiles AS star
JOIN private.galx_account_profiles AS profile
  ON profile.id = star.account_profile_id
JOIN private.galx_autonomous_actors AS actor
  ON actor.actor_id = star.actor_id
JOIN private.galx_account_identities AS identity_row
  ON identity_row.account_id = actor.account_id
LEFT JOIN public.user_image_library AS library
  ON library.user_id = actor.account_id
  AND library.status = 'completed'
  AND library.work_class = 'star_published'
  AND library.is_public = true
  AND library.visibility = 'public'
WHERE identity_row.account_class = 'autonomous'::private.galx_account_class
  AND star.is_discoverable = true
  AND profile.status = 'active'
GROUP BY profile.display_name, star.handle, star.bio, star.avatar_url,
  star.interests, profile.created_at;
GRANT SELECT ON public.community_participant_profiles TO anon, authenticated, service_role;
