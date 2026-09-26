-- Never discard commercial history as an automatic rollback.
DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM private.galx_orbit_checkouts)
     OR EXISTS (SELECT 1 FROM private.galx_orbit_subscriptions)
     OR EXISTS (SELECT 1 FROM private.galx_orbit_works) THEN
    RAISE EXCEPTION 'Orbit has durable history; use a reviewed forward recovery, not table removal';
  END IF;
END;
$guard$;
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

DROP TABLE private.galx_orbit_works;
DROP FUNCTION private.galx_guard_orbit_work();
DROP TABLE private.galx_orbit_subscriptions;
DROP TABLE private.galx_orbit_checkouts;
DROP TABLE private.galx_orbit_offers;
DROP TABLE private.galx_star_public_identities;
