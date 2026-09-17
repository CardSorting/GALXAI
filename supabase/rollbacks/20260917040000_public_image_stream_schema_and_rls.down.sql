-- ============================================================================
-- ROLLBACK: 20260917040000_public_image_stream_schema_and_rls.down.sql
-- Reverses public image feed schema, policies, indexes, and RPC functions.
-- ============================================================================

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';

-- 1. Drop atomic counter functions
DROP FUNCTION IF EXISTS public.fn_increment_image_remix(TEXT);
DROP FUNCTION IF EXISTS public.fn_increment_image_view(TEXT);
DROP FUNCTION IF EXISTS public.fn_toggle_image_like(TEXT, BOOLEAN);

-- 2. Drop indexes
DROP INDEX IF EXISTS public.idx_user_image_library_public_likes;
DROP INDEX IF EXISTS public.idx_user_image_library_public_aspect;
DROP INDEX IF EXISTS public.idx_user_image_library_public_stream;

-- 3. Drop public policy and revoke public select
DROP POLICY IF EXISTS policy_user_image_library_select_public ON public.user_image_library;
REVOKE SELECT ON public.user_image_library FROM anon, authenticated;

-- 4. Revert columns if needed
DO $rollback$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_image_library' AND column_name = 'views_count'
  ) THEN
    ALTER TABLE public.user_image_library DROP COLUMN views_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_image_library' AND column_name = 'remix_count'
  ) THEN
    ALTER TABLE public.user_image_library DROP COLUMN remix_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_image_library' AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE public.user_image_library DROP COLUMN likes_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_image_library' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE public.user_image_library DROP COLUMN visibility;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_image_library' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.user_image_library DROP COLUMN is_public;
  END IF;
END;
$rollback$;
