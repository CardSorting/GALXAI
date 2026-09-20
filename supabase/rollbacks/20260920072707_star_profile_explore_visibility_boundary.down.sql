-- Rollback for 20260920072707_star_profile_explore_visibility_boundary.sql

DROP VIEW IF EXISTS public.community_star_profile_creations;

-- Restore the pre-boundary function behavior before removing the additive
-- surface flag. Existing moderation audit rows are retained for evidence.
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
  v_user_id text;
BEGIN
  IF p_asset_id IS NULL OR length(trim(p_asset_id)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid asset identifier');
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.user_image_library
  WHERE id = p_asset_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'hidden_client',
      'asset_id', p_asset_id
    );
  END IF;

  UPDATE public.user_image_library
  SET is_public = false,
      visibility = 'private',
      updated_at = NOW()
  WHERE id = p_asset_id;

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  INSERT INTO public.image_moderation_events (
    asset_id, moderator_id, action, reason, created_at
  ) VALUES (
    p_asset_id,
    COALESCE(p_moderator_id, 'anon_community_moderator'),
    'set_private',
    COALESCE(p_reason, 'community_hide'),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', 'set_private',
    'asset_id', p_asset_id,
    'owner_user_id', v_user_id,
    'affected_rows', v_affected
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_moderate_hide_community_image(text, text, text)
  TO anon, authenticated, service_role;

ALTER TABLE public.image_moderation_events
  ALTER COLUMN action SET DEFAULT 'set_private';

DROP INDEX IF EXISTS public.idx_user_image_library_explore_stream;
ALTER TABLE public.user_image_library DROP COLUMN IF EXISTS is_explore_visible;

-- Rebuild the latest public feed projection without the Explore-only filter.
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
