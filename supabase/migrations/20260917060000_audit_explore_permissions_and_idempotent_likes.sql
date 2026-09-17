-- ==============================================================================
-- Migration: 20260917060000_audit_explore_permissions_and_idempotent_likes.sql
-- Description:
--   1. Replaces fn_record_image_like with strict idempotent voting logic using
--      GET DIAGNOSTICS ROW_COUNT to prevent like/unlike count tampering.
--   2. Creates canonical public view public.community_creations_feed joining
--      completed non-test user creations with HOT stats.
--   3. Audits and guarantees permissions for anon and authenticated roles.
-- ==============================================================================

-- 1. Strict Idempotent Like Function
CREATE OR REPLACE FUNCTION public.fn_record_image_like(p_image_id text, p_session_hash text, p_increment boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_affected INTEGER := 0;
  v_new_likes INTEGER := 0;
  v_is_liked BOOLEAN;
BEGIN
  -- Anti-locking fast timeout to protect connection budget
  SET LOCAL lock_timeout = '200ms';

  IF p_increment THEN
    -- Try inserting the like interaction
    INSERT INTO public.user_image_interactions (image_id, session_hash, interaction_type)
    VALUES (p_image_id, p_session_hash, 'like')
    ON CONFLICT (image_id, session_hash, interaction_type) DO NOTHING;

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    IF v_affected > 0 THEN
      -- New like from this session: increment stats counter
      INSERT INTO public.user_image_stats (image_id, likes_count, updated_at)
      VALUES (p_image_id, 1, now())
      ON CONFLICT (image_id) DO UPDATE
      SET likes_count = public.user_image_stats.likes_count + 1,
          updated_at = now()
      RETURNING likes_count INTO v_new_likes;
    ELSE
      -- Duplicate like from the same session: retain existing count
      SELECT COALESCE(likes_count, 0) INTO v_new_likes
      FROM public.user_image_stats
      WHERE image_id = p_image_id;
    END IF;

    v_is_liked := true;
  ELSE
    -- Try deleting the like interaction
    DELETE FROM public.user_image_interactions
    WHERE image_id = p_image_id
      AND session_hash = p_session_hash
      AND interaction_type = 'like';

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    IF v_affected > 0 THEN
      -- Existing like was removed: decrement stats counter safely
      UPDATE public.user_image_stats
      SET likes_count = GREATEST(0, likes_count - 1),
          updated_at = now()
      WHERE image_id = p_image_id
      RETURNING likes_count INTO v_new_likes;
    ELSE
      -- Interaction was not present: retain existing count
      SELECT COALESCE(likes_count, 0) INTO v_new_likes
      FROM public.user_image_stats
      WHERE image_id = p_image_id;
    END IF;

    v_is_liked := false;
  END IF;

  RETURN jsonb_build_object(
    'likes_count', COALESCE(v_new_likes, 0),
    'is_liked', v_is_liked
  );
END;
$function$;

-- 2. Canonical Community Creations Feed View
CREATE OR REPLACE VIEW public.community_creations_feed AS
SELECT
  l.id,
  l.user_id,
  l.prompt,
  l.aspect_ratio,
  l.dimensions,
  l.public_url,
  l.created_at,
  l.lqip,
  l.seed,
  l.model,
  COALESCE(s.likes_count, l.likes_count, 0) AS likes_count,
  COALESCE(s.remix_count, l.remix_count, 0) AS remix_count,
  COALESCE(s.views_count, l.views_count, 0) AS views_count
FROM public.user_image_library l
LEFT JOIN public.user_image_stats s ON s.image_id = l.id
WHERE l.status = 'completed'
  AND l.is_public = true
  AND l.visibility = 'public'
  AND (l.user_id NOT LIKE 'usr_test_%' AND (l.size_bytes IS NULL OR l.size_bytes > 1000));

-- 3. Explicit Grants & Role Permissions Audit
GRANT SELECT ON public.community_creations_feed TO anon, authenticated, service_role;
GRANT SELECT ON public.user_image_library TO anon, authenticated, service_role;
GRANT SELECT ON public.user_image_stats TO anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON public.user_image_interactions TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.fn_record_image_like TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_record_image_view_batch TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_increment_image_remix TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_increment_image_view TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_toggle_image_like TO anon, authenticated, service_role;
