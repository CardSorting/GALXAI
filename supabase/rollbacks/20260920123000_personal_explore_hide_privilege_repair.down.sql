-- Rollback for 20260920123000_personal_explore_hide_privilege_repair.sql
-- Keep browser roles closed. The repair is intentionally fail-closed on
-- rollback: no inherited broad grants are restored.

REVOKE ALL ON TABLE public.user_image_explore_hides
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_image_explore_hides TO service_role;

REVOKE ALL ON TABLE public.user_image_explore_hide_limits
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_image_explore_hide_limits TO service_role;

REVOKE ALL ON TABLE public.image_moderation_events
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.image_moderation_events TO service_role;

REVOKE ALL ON FUNCTION public.fn_moderate_hide_community_image(text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fn_set_image_explore_hide(text, text, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_set_image_explore_hide(text, text, boolean)
  TO service_role;
