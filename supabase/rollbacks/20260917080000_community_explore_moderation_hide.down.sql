-- Rollback for 20260917080000_community_explore_moderation_hide.sql
DROP FUNCTION IF EXISTS public.fn_moderate_hide_community_image(text, text, text);
DROP TABLE IF EXISTS public.image_moderation_events CASCADE;
