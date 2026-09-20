-- Rollback for 20260920120000_personal_explore_hide_controls.sql
--
-- The retired global moderation boundary intentionally remains closed on
-- rollback. Re-enabling anonymous/global hides would restore the abuse path
-- this migration removes and is not a safe compatibility action.

DROP FUNCTION IF EXISTS public.fn_set_image_explore_hide(text, text, boolean);
DROP TABLE IF EXISTS public.user_image_explore_hide_limits;
DROP TABLE IF EXISTS public.user_image_explore_hides;
