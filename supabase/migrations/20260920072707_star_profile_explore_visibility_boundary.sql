-- Migration: 20260920072707_star_profile_explore_visibility_boundary.sql
-- Description: Keep Explore moderation independent from public Star profile galleries.

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';

-- An Explore suppression is a surface-level decision, not a change to the
-- creation's public ownership or profile visibility. Existing public creations
-- remain visible to Explore until explicitly hidden.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_image_library'
      AND column_name = 'is_explore_visible'
  ) THEN
    ALTER TABLE public.user_image_library
      ADD COLUMN is_explore_visible BOOLEAN NOT NULL DEFAULT true;
  END IF;
END;
$migration$;

COMMENT ON COLUMN public.user_image_library.is_explore_visible IS
  'Whether a public creation appears in the community Explore stream; does not change public Star profile visibility.';

CREATE INDEX IF NOT EXISTS idx_user_image_library_explore_stream
  ON public.user_image_library (created_at DESC, id DESC)
  WHERE status = 'completed'
    AND is_public = true
    AND visibility = 'public'
    AND is_explore_visible = true;

-- Explore is the only surface that consumes this projection, so moderation
-- removes an item here while public Star profile galleries use the separate
-- profile projection below.
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
  AND l.is_explore_visible = true
  AND private.galx_is_public_participant(l.user_id)
  AND l.user_id NOT LIKE 'usr_%'
  AND l.user_id NOT LIKE 'test_%'
  AND l.id NOT LIKE 'img_test_%'
  AND l.size_bytes IS NOT NULL
  AND l.size_bytes > 1000;

GRANT SELECT ON public.community_creations_feed TO anon, authenticated, service_role;

-- Star profiles intentionally do not inherit Explore suppression. This is a
-- public, allowlisted projection: it contains only fields needed to render a
-- Star gallery and to mint a short-lived, server-sealed asset URL.
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
  COALESCE(profile.display_name, 'GALX creator') AS author_display_name,
  star.handle AS author_handle,
  star.avatar_url AS author_avatar_url,
  'star'::TEXT AS participant_kind
FROM public.user_image_library AS l
JOIN private.galx_account_identities AS identity_row
  ON identity_row.account_id = l.user_id
JOIN private.galx_account_profiles AS profile
  ON profile.id = identity_row.profile_id
JOIN private.galx_autonomous_actors AS actor
  ON actor.account_id = identity_row.account_id
JOIN private.galx_star_profiles AS star
  ON star.actor_id = actor.actor_id
LEFT JOIN public.user_image_stats AS s ON s.image_id = l.id
WHERE identity_row.account_class = 'autonomous'::private.galx_account_class
  AND star.is_discoverable = true
  AND profile.status = 'active'
  AND l.status = 'completed'
  AND l.is_public = true
  AND l.visibility = 'public'
  AND l.user_id NOT LIKE 'usr_%'
  AND l.user_id NOT LIKE 'test_%'
  AND l.id NOT LIKE 'img_test_%'
  AND l.size_bytes IS NOT NULL
  AND l.size_bytes > 1000;

GRANT SELECT ON public.community_star_profile_creations TO anon, authenticated, service_role;

COMMENT ON VIEW public.community_star_profile_creations IS
  'Allowlisted public Star profile creations; independent of community Explore suppression.';

-- Community moderation hides a creation from Explore only. Preserve its public
-- status and profile gallery access so a Star page remains a complete archive.
ALTER TABLE public.image_moderation_events
  ALTER COLUMN action SET DEFAULT 'hide_from_explore';

CREATE OR REPLACE FUNCTION public.fn_moderate_hide_community_image(
  p_asset_id text,
  p_moderator_id text DEFAULT NULL,
  p_reason text DEFAULT 'community_moderation'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_affected int := 0;
BEGIN
  IF p_asset_id IS NULL OR length(trim(p_asset_id)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid asset identifier');
  END IF;

  -- A missing durable row can still be a client-only showcase item. Do not
  -- disclose ownership or internal row state in the public result.
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_image_library
    WHERE id = p_asset_id
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'hidden_client',
      'asset_id', p_asset_id
    );
  END IF;

  UPDATE public.user_image_library
  SET is_explore_visible = false,
      updated_at = NOW()
  WHERE id = p_asset_id;

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  INSERT INTO public.image_moderation_events (
    asset_id,
    moderator_id,
    action,
    reason,
    created_at
  ) VALUES (
    p_asset_id,
    COALESCE(p_moderator_id, 'anon_community_moderator'),
    'hide_from_explore',
    COALESCE(p_reason, 'community_hide'),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', 'hidden_from_explore',
    'asset_id', p_asset_id,
    'affected_rows', v_affected,
    'profile_visibility', 'preserved'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_moderate_hide_community_image(text, text, text)
  TO anon, authenticated, service_role;
