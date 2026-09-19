-- Rollback for 20260919110000_autonomous_account_identity_and_provenance.sql
-- Intended for a controlled recovery window after new actor/content rows have
-- been drained. It removes only objects introduced by that migration.

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

DROP POLICY IF EXISTS policy_user_image_library_select_public ON public.user_image_library;
CREATE POLICY policy_user_image_library_select_public
  ON public.user_image_library FOR SELECT
  TO anon, authenticated
  USING (status = 'completed' AND is_public = true AND visibility = 'public');

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
  AND l.user_id NOT LIKE 'usr_%'
  AND l.user_id NOT LIKE 'test_%'
  AND l.id NOT LIKE 'img_test_%'
  AND l.size_bytes IS NOT NULL
  AND l.size_bytes > 1000;

DROP TRIGGER IF EXISTS galx_validate_generation_asset_write ON public.user_image_library;
DROP FUNCTION IF EXISTS private.galx_validate_generation_asset_write();
DROP TRIGGER IF EXISTS galx_create_generation_for_image_request ON private.galx_image_requests;
DROP FUNCTION IF EXISTS private.galx_create_generation_for_image_request();

DROP TABLE IF EXISTS private.galx_generation_assets;
DROP TABLE IF EXISTS private.galx_generation_records;
DROP TRIGGER IF EXISTS galx_validate_administrative_entitlement ON private.galx_administrative_entitlements;
DROP FUNCTION IF EXISTS private.galx_validate_administrative_entitlement();
DROP TABLE IF EXISTS private.galx_administrative_entitlements;
DROP TABLE IF EXISTS private.galx_autonomous_actor_configurations;
DROP TRIGGER IF EXISTS galx_validate_autonomous_actor ON private.galx_autonomous_actors;
DROP FUNCTION IF EXISTS private.galx_validate_autonomous_actor();
DROP TABLE IF EXISTS private.galx_autonomous_actors;
DROP TRIGGER IF EXISTS galx_validate_autonomous_run ON private.galx_autonomous_actor_runs;
DROP FUNCTION IF EXISTS private.galx_validate_autonomous_run();
DROP FUNCTION IF EXISTS private.galx_assert_human_account(TEXT, TEXT);
DROP TABLE IF EXISTS private.galx_autonomous_actor_runs;

DROP TRIGGER IF EXISTS galx_guard_account_identity ON private.galx_account_identities;
DROP FUNCTION IF EXISTS private.galx_guard_account_identity();
DROP TRIGGER IF EXISTS galx_register_human_account ON auth.users;
DROP FUNCTION IF EXISTS private.galx_register_human_account();
DROP FUNCTION IF EXISTS private.galx_is_human_account(TEXT);
DROP TABLE IF EXISTS private.galx_account_identities;

DROP TYPE IF EXISTS private.galx_entitlement_source;
DROP TYPE IF EXISTS private.galx_autonomous_provisioning_source;
DROP TYPE IF EXISTS private.galx_account_class;
