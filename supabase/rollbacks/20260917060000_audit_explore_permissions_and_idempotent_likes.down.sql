-- Rollback for 20260917060000_audit_explore_permissions_and_idempotent_likes.sql
DROP VIEW IF EXISTS public.community_creations_feed CASCADE;
DROP FUNCTION IF EXISTS public.fn_record_image_like(text, text, boolean) CASCADE;
