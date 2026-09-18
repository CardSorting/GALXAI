-- Rollback for 20260917070000_user_image_library_permissions_and_visibility.sql
DROP INDEX IF EXISTS public.idx_user_image_library_user_visibility;
DROP FUNCTION IF EXISTS public.fn_batch_mutate_image_library(text, text[], text, boolean, text);
