-- Migration: 20260920075103_restore_legacy_star_profile_visibility.sql
-- Description: Restore Star creations changed to private by the retired Explore hide behavior.

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';

-- The previous moderation function converted an Explore hide into a private
-- asset. Restore only rows whose latest legacy moderation event is still the
-- row's most recent update, which avoids overriding a later owner privacy
-- decision. Repaired assets remain out of Explore until explicitly restored by
-- a future, separately authorized product action.
WITH latest_legacy_event AS (
  SELECT asset_id, MAX(created_at) AS last_event_at
  FROM public.image_moderation_events
  WHERE action = 'set_private'
  GROUP BY asset_id
), star_candidates AS (
  SELECT library.id
  FROM public.user_image_library AS library
  JOIN latest_legacy_event AS legacy
    ON legacy.asset_id = library.id
  JOIN private.galx_account_identities AS identity_row
    ON identity_row.account_id = library.user_id
  JOIN private.galx_account_profiles AS profile
    ON profile.id = identity_row.profile_id
  JOIN private.galx_autonomous_actors AS actor
    ON actor.account_id = identity_row.account_id
  JOIN private.galx_star_profiles AS star
    ON star.actor_id = actor.actor_id
  WHERE identity_row.account_class = 'autonomous'::private.galx_account_class
    AND star.is_discoverable = true
    AND profile.status = 'active'
    AND library.status = 'completed'
    AND library.is_public = false
    AND library.visibility = 'private'
    AND ABS(EXTRACT(EPOCH FROM (library.updated_at - legacy.last_event_at))) <= 1
)
UPDATE public.user_image_library AS library
SET is_public = true,
    visibility = 'public',
    is_explore_visible = false,
    updated_at = NOW()
FROM star_candidates
WHERE library.id = star_candidates.id
  AND library.is_public = false
  AND library.visibility = 'private';
