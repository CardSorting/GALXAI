-- GALXAI Migration: 20260920123000_personal_explore_hide_privilege_repair.sql
-- Purpose: remove inherited service_role table privileges left by prior ACLs.
-- The Explore preference function needs only the explicit operations below.

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';

REVOKE ALL ON TABLE public.user_image_explore_hides
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_image_explore_hides TO service_role;

REVOKE ALL ON TABLE public.user_image_explore_hide_limits
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_image_explore_hide_limits TO service_role;

REVOKE ALL ON TABLE public.image_moderation_events
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.image_moderation_events TO service_role;

-- The old global function remains closed; only the new account-scoped function
-- is callable by the server-side service role.
REVOKE ALL ON FUNCTION public.fn_moderate_hide_community_image(text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fn_set_image_explore_hide(text, text, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_set_image_explore_hide(text, text, boolean)
  TO service_role;
