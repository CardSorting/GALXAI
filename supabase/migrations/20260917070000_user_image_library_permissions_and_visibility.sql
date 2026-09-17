-- ==============================================================================
-- Migration: 20260917070000_user_image_library_permissions_and_visibility.sql
-- Description:
--   1. Grants UPDATE and DELETE on user_image_library to authenticated role.
--   2. Hardens policy_user_image_library_update_owner with explicit WITH CHECK.
--   3. Upgrades fn_batch_mutate_image_library to support 'visibility' action.
--   4. Creates index for fast per-user visibility lookups.
-- ==============================================================================

-- 1. Explicit Role Privileges
GRANT SELECT, UPDATE, DELETE ON TABLE public.user_image_library TO authenticated;
GRANT SELECT ON TABLE public.user_image_library TO anon;

-- 2. Hardened RLS Policy for Owner Updates
DROP POLICY IF EXISTS policy_user_image_library_update_owner ON public.user_image_library;
CREATE POLICY policy_user_image_library_update_owner
  ON public.user_image_library FOR UPDATE
  TO public
  USING (((auth.uid())::text = user_id) OR (auth.role() = 'service_role'::text))
  WITH CHECK (((auth.uid())::text = user_id) OR (auth.role() = 'service_role'::text));

-- 3. Upgraded fn_batch_mutate_image_library with Visibility Support
CREATE OR REPLACE FUNCTION public.fn_batch_mutate_image_library(
  p_user_id text,
  p_asset_ids text[],
  p_action text,
  p_is_favorite boolean DEFAULT NULL::boolean,
  p_visibility text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL OR COALESCE(array_length(p_asset_ids, 1), 0) = 0 THEN
    RETURN jsonb_build_object('affectedCount', 0, 'assetIds', '[]'::jsonb, 'r2Keys', '[]'::jsonb);
  END IF;
  IF COALESCE(array_length(p_asset_ids, 1), 0) > 500 THEN
    RAISE EXCEPTION 'batch is limited to 500 assets' USING ERRCODE = '22023';
  END IF;

  IF p_action = 'favorite' THEN
    WITH changed AS (
      UPDATE public.user_image_library
      SET is_favorite = COALESCE(p_is_favorite, false), updated_at = now()
      WHERE user_id = p_user_id AND id = ANY(p_asset_ids)
      RETURNING id
    )
    SELECT jsonb_build_object(
      'affectedCount', COUNT(*),
      'assetIds', COALESCE(jsonb_agg(id), '[]'::jsonb),
      'r2Keys', '[]'::jsonb
    ) INTO v_result FROM changed;

  ELSIF p_action = 'visibility' THEN
    IF p_visibility NOT IN ('public', 'unlisted', 'private') THEN
      RAISE EXCEPTION 'invalid visibility setting' USING ERRCODE = '22023';
    END IF;
    WITH changed AS (
      UPDATE public.user_image_library
      SET visibility = p_visibility,
          is_public = (p_visibility = 'public'),
          updated_at = now()
      WHERE user_id = p_user_id AND id = ANY(p_asset_ids)
      RETURNING id
    )
    SELECT jsonb_build_object(
      'affectedCount', COUNT(*),
      'assetIds', COALESCE(jsonb_agg(id), '[]'::jsonb),
      'r2Keys', '[]'::jsonb
    ) INTO v_result FROM changed;

  ELSIF p_action = 'delete' THEN
    WITH changed AS (
      DELETE FROM public.user_image_library
      WHERE user_id = p_user_id AND id = ANY(p_asset_ids)
      RETURNING id, r2_key
    ), enqueued AS (
      INSERT INTO public.image_library_gc_outbox (r2_key, user_id, asset_id)
      SELECT r2_key, p_user_id, id FROM changed WHERE r2_key IS NOT NULL
      ON CONFLICT (r2_key) DO NOTHING
      RETURNING r2_key
    )
    SELECT jsonb_build_object(
      'affectedCount', COUNT(*),
      'assetIds', COALESCE(jsonb_agg(id), '[]'::jsonb),
      'r2Keys', COALESCE(jsonb_agg(r2_key) FILTER (WHERE r2_key IS NOT NULL), '[]'::jsonb)
    ) INTO v_result FROM changed;

  ELSE
    RAISE EXCEPTION 'unsupported image library action' USING ERRCODE = '22023';
  END IF;

  RETURN v_result;
END;
$function$;

-- 4. Fast Index for User Visibility
CREATE INDEX IF NOT EXISTS idx_user_image_library_user_visibility
  ON public.user_image_library (user_id, visibility, created_at DESC);

-- 5. Execution Grants
GRANT EXECUTE ON FUNCTION public.fn_batch_mutate_image_library(text, text[], text, boolean, text) TO authenticated, service_role;
