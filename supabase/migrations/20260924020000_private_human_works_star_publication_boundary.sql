-- Human image outputs are private Works. Only controlled Star generations may
-- enter the public archive, Explore, and public participant projections.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE private.galx_image_requests
  ADD COLUMN IF NOT EXISTS work_class TEXT NOT NULL DEFAULT 'private';
ALTER TABLE private.galx_generation_records
  ADD COLUMN IF NOT EXISTS work_class TEXT NOT NULL DEFAULT 'private';
ALTER TABLE public.user_image_library
  ADD COLUMN IF NOT EXISTS work_class TEXT NOT NULL DEFAULT 'private';

DO $constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='private.galx_image_requests'::regclass AND conname='galx_image_requests_work_class_check') THEN
    ALTER TABLE private.galx_image_requests ADD CONSTRAINT galx_image_requests_work_class_check CHECK (work_class IN ('private','star_published'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='private.galx_generation_records'::regclass AND conname='galx_generation_records_work_class_check') THEN
    ALTER TABLE private.galx_generation_records ADD CONSTRAINT galx_generation_records_work_class_check CHECK (work_class IN ('private','star_published'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.user_image_library'::regclass AND conname='user_image_library_work_class_check') THEN
    ALTER TABLE public.user_image_library ADD CONSTRAINT user_image_library_work_class_check CHECK (work_class IN ('private','star_published'));
  END IF;
END
$constraints$;

-- Preserve existing Star Works only where the controlled Star attempt record
-- and generation provenance agree. All human, orphaned, and unverified rows
-- become private in the same migration.
UPDATE private.galx_generation_records AS generation
SET work_class = 'star_published'
FROM private.galx_account_identities AS identity_row
JOIN private.galx_autonomous_actors AS actor ON actor.account_id = identity_row.account_id
JOIN private.galx_star_profiles AS star ON star.actor_id = actor.actor_id
JOIN private.galx_account_profiles AS profile ON profile.id = star.account_profile_id
CROSS JOIN private.galx_star_generation_attempts AS attempt
WHERE generation.account_id = identity_row.account_id
  AND identity_row.account_class = 'autonomous'::private.galx_account_class
  AND actor.is_enabled = true
  AND star.is_discoverable = true
  AND profile.status = 'active'
  AND attempt.attempt_id::TEXT = generation.metadata->>'starAttemptId'
  AND attempt.generation_id = generation.id
  AND attempt.actor_id = actor.actor_id
  AND attempt.kind = 'content'
  AND attempt.state = 'completed'
  AND generation.metadata ? 'starAttemptId'
  AND generation.metadata->>'starAttemptId' <> '';

UPDATE private.galx_image_requests AS request
SET work_class = generation.work_class
FROM private.galx_generation_records AS generation
WHERE generation.id = request.id::text
  AND generation.account_id = request.user_id
  AND request.work_class IS DISTINCT FROM generation.work_class;

UPDATE public.user_image_library AS library
SET work_class = generation.work_class
FROM private.galx_generation_assets AS asset
JOIN private.galx_generation_records AS generation ON generation.id = asset.generation_id
JOIN private.galx_account_identities AS identity_row ON identity_row.account_id = generation.account_id
JOIN private.galx_autonomous_actors AS actor ON actor.account_id = identity_row.account_id
JOIN private.galx_star_profiles AS star ON star.actor_id = actor.actor_id
JOIN private.galx_account_profiles AS profile ON profile.id = star.account_profile_id
JOIN private.galx_star_generation_attempts AS attempt
  ON attempt.attempt_id::TEXT = generation.metadata->>'starAttemptId'
  AND attempt.generation_id = generation.id
  AND attempt.actor_id = actor.actor_id
  AND attempt.kind = 'content'
  AND attempt.state = 'completed'
WHERE asset.asset_id = library.id
  AND generation.account_id = library.user_id
  AND generation.work_class = 'star_published'
  AND identity_row.account_class = 'autonomous'::private.galx_account_class
  AND actor.is_enabled = true
  AND star.is_discoverable = true
  AND profile.status = 'active';

UPDATE public.user_image_library
SET work_class = 'private', is_public = false, visibility = 'private', is_explore_visible = false
WHERE work_class <> 'star_published';

UPDATE public.user_image_library
SET is_public = true, visibility = 'public'
WHERE work_class = 'star_published';

ALTER TABLE private.galx_image_requests
  ALTER COLUMN work_class SET DEFAULT 'private';
ALTER TABLE private.galx_generation_records
  ALTER COLUMN work_class SET DEFAULT 'private';
ALTER TABLE public.user_image_library
  ALTER COLUMN work_class SET DEFAULT 'private',
  ALTER COLUMN is_public SET DEFAULT false,
  ALTER COLUMN visibility SET DEFAULT 'private',
  ALTER COLUMN is_explore_visible SET DEFAULT false;

COMMENT ON COLUMN public.user_image_library.work_class IS
  'Private human Work or published Star Work. Human accounts cannot change this class or publish.';
COMMENT ON COLUMN private.galx_image_requests.work_class IS
  'Server-only publication class fixed at request creation; human requests are private.';

CREATE OR REPLACE FUNCTION private.galx_guard_image_request_work_class()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_class private.galx_account_class;
  v_authorized_star BOOLEAN;
BEGIN
  SELECT account_class INTO v_class
  FROM private.galx_account_identities
  WHERE account_id = NEW.user_id;

  SELECT EXISTS (
    SELECT 1
    FROM private.galx_autonomous_actors AS actor
    JOIN private.galx_star_profiles AS star ON star.actor_id = actor.actor_id
    JOIN private.galx_account_profiles AS profile ON profile.id = star.account_profile_id
    WHERE actor.account_id = NEW.user_id
      AND actor.is_enabled = true
      AND star.is_discoverable = true
      AND profile.status = 'active'
  ) INTO v_authorized_star;

  IF NEW.work_class = 'star_published' AND
     (v_class IS DISTINCT FROM 'autonomous'::private.galx_account_class OR NOT v_authorized_star) THEN
    RAISE EXCEPTION 'Public Works require an authorized Star identity' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.work_class IS DISTINCT FROM OLD.work_class) THEN
    RAISE EXCEPTION 'Image request owner and Work class are immutable' USING ERRCODE = '23514';
  END IF;
  IF v_class IS DISTINCT FROM 'autonomous'::private.galx_account_class THEN
    NEW.work_class := 'private';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.galx_guard_image_request_work_class() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_guard_image_request_work_class ON private.galx_image_requests;
CREATE TRIGGER galx_guard_image_request_work_class
BEFORE INSERT OR UPDATE ON private.galx_image_requests
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_image_request_work_class();

CREATE OR REPLACE FUNCTION private.galx_create_generation_for_image_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  existing_account TEXT;
BEGIN
  -- Auth-created human identities and internally provisioned Star identities
  -- already exist before a request is created. Only bootstrap a missing human
  -- identity; attempting INSERT .. ON CONFLICT DO NOTHING for an existing Star
  -- still fires the identity BEFORE INSERT trigger and violates immutable class.
  IF NOT EXISTS (
    SELECT 1 FROM private.galx_account_identities
    WHERE account_id = NEW.user_id
  ) THEN
    INSERT INTO private.galx_account_identities (account_id, account_class)
    VALUES (NEW.user_id, 'human'::private.galx_account_class)
    ON CONFLICT (account_id) DO NOTHING;
  END IF;

  SELECT account_id INTO existing_account
  FROM private.galx_generation_records
  WHERE id = NEW.id::TEXT;
  IF existing_account IS NOT NULL AND existing_account IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Generation identifier is already owned by another account'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO private.galx_generation_records (id, account_id, kind, state, work_class, created_at, updated_at)
  VALUES (NEW.id::TEXT, NEW.user_id, 'image', NEW.state, NEW.work_class, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE
    SET state = CASE
      WHEN private.galx_generation_records.state IN ('completed', 'failed', 'cancelled')
        THEN private.galx_generation_records.state
      ELSE EXCLUDED.state
    END,
    work_class = EXCLUDED.work_class,
    updated_at = now();
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.galx_create_generation_for_image_request() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_create_generation_for_image_request ON private.galx_image_requests;
CREATE TRIGGER galx_create_generation_for_image_request
AFTER INSERT ON private.galx_image_requests
FOR EACH ROW EXECUTE FUNCTION private.galx_create_generation_for_image_request();

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
  v_authorized_star BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Image Work ownership is immutable' USING ERRCODE = '23514';
  END IF;

  v_request_id := NULLIF(NEW.metadata->>'requestId', '');
  IF v_request_id IS NOT NULL THEN
    SELECT work_class, account_id INTO v_generation_class, v_generation_account
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
        AND actor.is_enabled = true
        AND star.is_discoverable = true
        AND profile.status = 'active'
    ) INTO v_authorized_star;
    IF v_identity_class IS DISTINCT FROM 'autonomous'::private.galx_account_class OR NOT v_authorized_star THEN
      RAISE EXCEPTION 'Public Works require an authorized Star identity' USING ERRCODE = '23514';
    END IF;
    NEW.work_class := 'star_published';
    NEW.is_public := true;
    NEW.visibility := 'public';
    IF TG_OP = 'INSERT' THEN NEW.is_explore_visible := true; END IF;
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

  IF TG_OP = 'UPDATE' AND NEW.work_class IS DISTINCT FROM OLD.work_class THEN
    RAISE EXCEPTION 'Image Work class is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.galx_enforce_image_work_class() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_enforce_image_work_class ON public.user_image_library;
CREATE TRIGGER galx_enforce_image_work_class
BEFORE INSERT OR UPDATE ON public.user_image_library
FOR EACH ROW EXECUTE FUNCTION private.galx_enforce_image_work_class();

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
      AND actor.is_enabled = true
      AND star.is_discoverable = true
      AND profile.status = 'active'
  );
$function$;
REVOKE ALL ON FUNCTION private.galx_is_public_participant(TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.galx_is_public_participant(TEXT) TO anon, authenticated;

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
  profile.display_name AS author_display_name,
  star.handle AS author_handle,
  star.bio AS author_bio,
  star.avatar_url AS author_avatar_url,
  'star'::TEXT AS participant_kind,
  COALESCE(star.interests, '{}'::TEXT[]) AS author_interests
FROM public.user_image_library AS l
JOIN private.galx_account_identities AS identity_row ON identity_row.account_id = l.user_id
JOIN private.galx_account_profiles AS profile ON profile.id = identity_row.profile_id
JOIN private.galx_autonomous_actors AS actor ON actor.account_id = identity_row.account_id
JOIN private.galx_star_profiles AS star ON star.actor_id = actor.actor_id
LEFT JOIN public.user_image_stats AS s ON s.image_id = l.id
WHERE l.status = 'completed'
  AND identity_row.account_class = 'autonomous'::private.galx_account_class
  AND l.work_class = 'star_published'
  AND l.is_public = true
  AND l.visibility = 'public'
  AND star.is_discoverable = true
  AND actor.is_enabled = true
  AND profile.status = 'active'
  AND l.user_id NOT LIKE 'usr_%'
  AND l.user_id NOT LIKE 'test_%'
  AND l.id NOT LIKE 'img_test_%'
  AND l.size_bytes IS NOT NULL
  AND l.size_bytes > 1000
  AND l.is_explore_visible = true;
-- Feed reads must go through the server's explicit public DTO. The database
-- projection contains owner identifiers needed only to mint owner-bound image
-- tokens, so it is never directly readable through the public REST API.
REVOKE ALL ON public.community_creations_feed FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_creations_feed TO service_role;

CREATE OR REPLACE VIEW public.community_star_profile_creations AS
SELECT
  l.id,
  l.user_id,
  l.prompt,
  l.aspect_ratio,
  l.dimensions,
  l.public_url,
  l.created_at,
  l.lqip,
  COALESCE(s.likes_count, l.likes_count, 0) AS likes_count,
  COALESCE(s.remix_count, l.remix_count, 0) AS remix_count,
  COALESCE(s.views_count, l.views_count, 0) AS views_count,
  profile.display_name AS author_display_name,
  star.handle AS author_handle,
  star.avatar_url AS author_avatar_url,
  'star'::TEXT AS participant_kind
FROM public.user_image_library AS l
JOIN private.galx_account_identities AS identity_row ON identity_row.account_id = l.user_id
JOIN private.galx_account_profiles AS profile ON profile.id = identity_row.profile_id
JOIN private.galx_autonomous_actors AS actor ON actor.account_id = identity_row.account_id
JOIN private.galx_star_profiles AS star ON star.actor_id = actor.actor_id
LEFT JOIN public.user_image_stats AS s ON s.image_id = l.id
WHERE identity_row.account_class = 'autonomous'::private.galx_account_class
  AND actor.is_enabled = true
  AND star.is_discoverable = true
  AND profile.status = 'active'
  AND l.status = 'completed'
  AND l.work_class = 'star_published'
  AND l.is_public = true
  AND l.visibility = 'public'
  AND l.user_id NOT LIKE 'usr_%'
  AND l.user_id NOT LIKE 'test_%'
  AND l.id NOT LIKE 'img_test_%'
  AND l.size_bytes IS NOT NULL
  AND l.size_bytes > 1000;
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
  COUNT(l.id)::BIGINT AS creation_count,
  profile.created_at
FROM private.galx_star_profiles AS star
JOIN private.galx_account_profiles AS profile ON profile.id = star.account_profile_id
JOIN private.galx_autonomous_actors AS actor ON actor.actor_id = star.actor_id
JOIN private.galx_account_identities AS identity_row ON identity_row.account_id = actor.account_id
LEFT JOIN public.user_image_library AS l
  ON l.user_id = actor.account_id
  AND l.status = 'completed'
  AND l.work_class = 'star_published'
  AND l.is_public = true
  AND l.visibility = 'public'
WHERE identity_row.account_class = 'autonomous'::private.galx_account_class
  AND star.is_discoverable = true
  AND actor.is_enabled = true
  AND profile.status = 'active'
GROUP BY profile.display_name, star.handle, star.bio, star.avatar_url,
  star.interests, profile.created_at;
GRANT SELECT ON public.community_participant_profiles TO anon, authenticated, service_role;

-- Do not expose raw rows (owner ids, storage keys, prompts, or metadata) via
-- PostgREST. Owner-scoped library access is mediated by authenticated routes.
REVOKE ALL ON public.user_image_library FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS policy_user_image_library_select_public ON public.user_image_library;
CREATE POLICY policy_user_image_library_select_public
  ON public.user_image_library FOR SELECT
  TO anon, authenticated
  USING (
    status = 'completed'
    AND work_class = 'star_published'
    AND is_public = true
    AND visibility = 'public'
    AND private.galx_is_public_participant(user_id)
  );

-- Owner APIs can still change favorites and delete private assets. Visibility
-- mutation is removed, and every attempt to use it fails at the database.
-- Remove the historical four-argument overload before installing the guarded
-- five-argument signature. Leaving both signatures (with a default fifth
-- argument) makes four-argument PostgreSQL/PostgREST calls ambiguous.
DROP FUNCTION IF EXISTS public.fn_batch_mutate_image_library(text, text[], text, boolean);

CREATE OR REPLACE FUNCTION public.fn_batch_mutate_image_library(
  p_user_id text,
  p_asset_ids text[],
  p_action text,
  p_is_favorite boolean DEFAULT NULL::boolean,
  p_visibility text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE v_result JSONB;
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL OR COALESCE(array_length(p_asset_ids, 1), 0) = 0 THEN
    RETURN jsonb_build_object('affectedCount', 0, 'assetIds', '[]'::jsonb, 'r2Keys', '[]'::jsonb);
  END IF;
  IF COALESCE(array_length(p_asset_ids, 1), 0) > 500 THEN
    RAISE EXCEPTION 'batch is limited to 500 assets' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'visibility' THEN
    RAISE EXCEPTION 'Human accounts cannot publish Works' USING ERRCODE = '42501';
  ELSIF p_action = 'favorite' THEN
    WITH changed AS (
      UPDATE public.user_image_library
      SET is_favorite = COALESCE(p_is_favorite, false), updated_at = now()
      WHERE user_id = p_user_id AND id = ANY(p_asset_ids) AND work_class = 'private'
      RETURNING id
    ) SELECT jsonb_build_object('affectedCount', COUNT(*), 'assetIds', COALESCE(jsonb_agg(id), '[]'::jsonb), 'r2Keys', '[]'::jsonb)
      INTO v_result FROM changed;
  ELSIF p_action = 'delete' THEN
    WITH changed AS (
      DELETE FROM public.user_image_library
      WHERE user_id = p_user_id AND id = ANY(p_asset_ids) AND work_class = 'private'
      RETURNING id, r2_key
    ), enqueued AS (
      INSERT INTO public.image_library_gc_outbox (r2_key, user_id, asset_id)
      SELECT r2_key, p_user_id, id FROM changed WHERE r2_key IS NOT NULL
      ON CONFLICT (r2_key) DO NOTHING RETURNING r2_key
    ) SELECT jsonb_build_object('affectedCount', COUNT(*), 'assetIds', COALESCE(jsonb_agg(id), '[]'::jsonb),
      'r2Keys', COALESCE(jsonb_agg(r2_key) FILTER (WHERE r2_key IS NOT NULL), '[]'::jsonb))
      INTO v_result FROM changed;
  ELSE
    RAISE EXCEPTION 'unsupported image library action' USING ERRCODE = '22023';
  END IF;
  RETURN v_result;
END;
$function$;
REVOKE ALL ON FUNCTION public.fn_batch_mutate_image_library(text, text[], text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_batch_mutate_image_library(text, text[], text, boolean, text) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_user_image_library_star_public_works
  ON public.user_image_library (created_at DESC, id DESC)
  WHERE work_class = 'star_published' AND status = 'completed' AND is_public = true AND visibility = 'public';

COMMENT ON VIEW public.community_creations_feed IS
  'Allowlisted public Explore feed containing only published Works from authorized Stars.';
COMMENT ON VIEW public.community_star_profile_creations IS
  'Allowlisted Star archives containing only published Works from authorized Stars.';
