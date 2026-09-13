-- Roll back the matching application before removing its additive read function.
SET LOCAL lock_timeout = '2s';
DROP FUNCTION IF EXISTS public.fn_page_user_image_library(TEXT, INTEGER, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, BOOLEAN);
DROP INDEX IF EXISTS public.idx_image_library_completed_page;
DROP INDEX IF EXISTS public.idx_image_library_favorite_page;
