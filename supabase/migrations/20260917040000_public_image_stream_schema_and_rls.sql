-- ============================================================================
-- ARCHITECT DATABASE IMPACT STATEMENT:
-- Migration: 20260917040000_public_image_stream_schema_and_rls.sql
--
-- Purpose:
--   Unlocks public community image feed capabilities mirroring industry
--   standards (Midjourney, Civitai, Lexica). Grants anon and authenticated
--   roles read access strictly to completed public generations under explicit
--   Row Level Security, keeping private and owner assets strictly isolated.
--
-- Tables Modified:
--   - public.user_image_library (adds is_public, visibility, likes_count, remix_count, views_count)
--
-- Security & RLS:
--   - Grants SELECT to anon and authenticated.
--   - Enforces policy_user_image_library_select_public: status = 'completed' AND is_public = true AND visibility = 'public'.
--   - Existing owner policies and FORCE ROW LEVEL SECURITY remain fully active.
--   - Adds atomic counter RPCs (fn_toggle_image_like, fn_increment_image_view, fn_increment_image_remix)
--     with explicit search_path = '' lockdown.
-- ============================================================================

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';

-- 1. Add stream visibility & interaction counter columns idempotently
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_image_library' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.user_image_library ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_image_library' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE public.user_image_library ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_image_library' AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE public.user_image_library ADD COLUMN likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_image_library' AND column_name = 'remix_count'
  ) THEN
    ALTER TABLE public.user_image_library ADD COLUMN remix_count INTEGER NOT NULL DEFAULT 0 CHECK (remix_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_image_library' AND column_name = 'views_count'
  ) THEN
    ALTER TABLE public.user_image_library ADD COLUMN views_count INTEGER NOT NULL DEFAULT 0 CHECK (views_count >= 0);
  END IF;
END;
$migration$;

-- 2. Grant public select capabilities under RLS
GRANT SELECT ON public.user_image_library TO anon, authenticated;

-- 3. Install Public Community Read Policy
DROP POLICY IF EXISTS policy_user_image_library_select_public ON public.user_image_library;
CREATE POLICY policy_user_image_library_select_public
  ON public.user_image_library FOR SELECT
  TO anon, authenticated
  USING (status = 'completed' AND is_public = true AND visibility = 'public');

-- 4. High-performance Keyset Pagination and Feed Indexes
CREATE INDEX IF NOT EXISTS idx_user_image_library_public_stream
  ON public.user_image_library (created_at DESC, id DESC)
  WHERE status = 'completed' AND is_public = true AND visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_user_image_library_public_aspect
  ON public.user_image_library (aspect_ratio, created_at DESC, id DESC)
  WHERE status = 'completed' AND is_public = true AND visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_user_image_library_public_likes
  ON public.user_image_library (likes_count DESC, created_at DESC, id DESC)
  WHERE status = 'completed' AND is_public = true AND visibility = 'public';

-- 5. Atomic Counter Functions with search_path lockdown
CREATE OR REPLACE FUNCTION public.fn_toggle_image_like(
  p_image_id TEXT,
  p_increment BOOLEAN
)
RETURNS INTEGER
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_new_likes INTEGER;
BEGIN
  UPDATE public.user_image_library
  SET likes_count = GREATEST(0, likes_count + (CASE WHEN p_increment THEN 1 ELSE -1 END)),
      updated_at = now()
  WHERE id = p_image_id
    AND status = 'completed'
    AND is_public = true
    AND visibility = 'public'
  RETURNING likes_count INTO v_new_likes;

  RETURN COALESCE(v_new_likes, 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_toggle_image_like(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_toggle_image_like(TEXT, BOOLEAN) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_increment_image_view(
  p_image_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_new_views INTEGER;
BEGIN
  UPDATE public.user_image_library
  SET views_count = views_count + 1
  WHERE id = p_image_id
    AND status = 'completed'
    AND is_public = true
    AND visibility = 'public'
  RETURNING views_count INTO v_new_views;

  RETURN COALESCE(v_new_views, 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_increment_image_view(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_increment_image_view(TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_increment_image_remix(
  p_image_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_new_remix INTEGER;
BEGIN
  UPDATE public.user_image_library
  SET remix_count = remix_count + 1
  WHERE id = p_image_id
    AND status = 'completed'
    AND is_public = true
    AND visibility = 'public'
  RETURNING remix_count INTO v_new_remix;

  RETURN COALESCE(v_new_remix, 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_increment_image_remix(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_increment_image_remix(TEXT) TO anon, authenticated, service_role;
