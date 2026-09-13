-- Additive page-only reads. Keep the legacy summary RPC for existing callers.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '60s';

CREATE INDEX IF NOT EXISTS idx_image_library_completed_page
  ON public.user_image_library (user_id, created_at DESC, id DESC)
  WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_image_library_favorite_page
  ON public.user_image_library (user_id, created_at DESC, id DESC)
  WHERE status = 'completed' AND is_favorite;

CREATE OR REPLACE FUNCTION public.fn_page_user_image_library(
  p_user_id TEXT,
  p_limit INTEGER DEFAULT 36,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_aspect_ratio TEXT DEFAULT NULL,
  p_is_favorite BOOLEAN DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'newest',
  p_before BOOLEAN DEFAULT false
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER STABLE SET search_path = ''
AS $function$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 36), 1), 100);
  v_ascending BOOLEAN := (COALESCE(p_sort, 'newest') = 'oldest') <> COALESCE(p_before, false);
  v_order TEXT;
  v_display_order TEXT := CASE WHEN p_sort = 'oldest' THEN 'ASC' ELSE 'DESC' END;
  v_comparison TEXT;
  v_result JSONB;
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL OR char_length(p_user_id) > 160
    OR (p_cursor_created_at IS NULL) <> (p_cursor_id IS NULL)
    OR char_length(COALESCE(p_search, '')) > 200 THEN
    RAISE EXCEPTION 'Invalid image page query' USING ERRCODE = '22023';
  END IF;
  v_order := CASE WHEN v_ascending THEN 'ASC' ELSE 'DESC' END;
  v_comparison := CASE WHEN v_ascending THEN '>' ELSE '<' END;

  -- The interpolated operators/order come only from the constants above. Every
  -- caller value stays a bound parameter. EXECUTE plans for the current filters.
  EXECUTE format($query$
    WITH page_plus_one AS MATERIALIZED (
      SELECT library.id, library.user_id, library.session_id, library.status,
        left(library.prompt, 300) AS prompt, library.model, library.aspect_ratio,
        library.dimensions, library.quality, library.is_favorite,
        library.created_at, library.updated_at
      FROM public.user_image_library AS library
      WHERE library.user_id = $1 AND library.status = 'completed'
        AND ($3 IS NULL OR (library.created_at, library.id) %s ($3, $4))
        AND ($5 IS NULL OR library.session_id = $5)
        AND ($6 IS NULL OR library.aspect_ratio = $6)
        AND ($7 IS NULL OR library.is_favorite = $7)
        AND (NULLIF(btrim($8), '') IS NULL
          OR library.prompt ILIKE '%%' || btrim($8) || '%%'
          OR library.revised_prompt ILIKE '%%' || btrim($8) || '%%'
          OR library.model ILIKE '%%' || btrim($8) || '%%'
          OR EXISTS (SELECT 1 FROM unnest(library.tags) AS tag WHERE tag ILIKE '%%' || btrim($8) || '%%'))
      ORDER BY library.created_at %s, library.id %s
      LIMIT $2 + 1
    ), page_rows AS (
      SELECT * FROM page_plus_one ORDER BY created_at %s, id %s LIMIT $2
    )
    SELECT jsonb_build_object(
      'records', COALESCE((SELECT jsonb_agg(to_jsonb(page_rows) ORDER BY created_at %s, id %s) FROM page_rows), '[]'::jsonb),
      'hasMore', (SELECT count(*) > $2 FROM page_plus_one)
    )
  $query$, v_comparison, v_order, v_order, v_order, v_order, v_display_order, v_display_order)
  INTO v_result
  USING p_user_id, v_limit, p_cursor_created_at, p_cursor_id, p_session_id, p_aspect_ratio, p_is_favorite, p_search;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_page_user_image_library(TEXT, INTEGER, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_page_user_image_library(TEXT, INTEGER, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, BOOLEAN) TO service_role;
