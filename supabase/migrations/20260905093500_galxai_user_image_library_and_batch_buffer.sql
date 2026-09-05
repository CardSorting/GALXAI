-- GALXAI Visual Asset & Request Library Schema (PostgreSQL + Supabase)
-- Authoritative data ruler with micro-batch upsert RPC and composite index mesh.
-- Enforces forced Row-Level Security (RLS) with strict tenant isolation.

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';

-- 1. Create Authoritative User Image Library Table
CREATE TABLE IF NOT EXISTS public.user_image_library (
  id TEXT PRIMARY KEY CHECK (char_length(id) BETWEEN 1 AND 160),
  user_id TEXT NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 160),
  session_id TEXT NOT NULL DEFAULT 'default' CHECK (char_length(session_id) BETWEEN 1 AND 160),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('queued', 'generating', 'completed', 'failed')),
  prompt TEXT NOT NULL,
  revised_prompt TEXT,
  model TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  dimensions TEXT NOT NULL DEFAULT '1024x1024',
  quality TEXT NOT NULL DEFAULT 'standard',
  public_url TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/png',
  size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  sha256 TEXT NOT NULL,
  lqip TEXT,
  seed TEXT,
  latency_ms INTEGER NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0 CHECK (cost_usd >= 0),
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_image_library_r2_key_unique UNIQUE (r2_key)
);

-- Durable object-GC outbox: database deletion and cleanup intent commit atomically.
-- Failed R2 calls therefore leave retryable work instead of orphaning objects silently.
CREATE TABLE IF NOT EXISTS public.image_library_gc_outbox (
  r2_key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT
);
ALTER TABLE public.image_library_gc_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_library_gc_outbox FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.image_library_gc_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.image_library_gc_outbox TO service_role;
CREATE INDEX IF NOT EXISTS idx_image_library_gc_outbox_enqueued
  ON public.image_library_gc_outbox (enqueued_at, r2_key);

-- 2. Enforce Row Level Security (RLS)
ALTER TABLE public.user_image_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_image_library FORCE ROW LEVEL SECURITY;

-- 3. Tenant Isolation RLS Policies
DROP POLICY IF EXISTS policy_user_image_library_select_owner ON public.user_image_library;
CREATE POLICY policy_user_image_library_select_owner
  ON public.user_image_library FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid())::text = user_id);

DROP POLICY IF EXISTS policy_user_image_library_update_owner ON public.user_image_library;
CREATE POLICY policy_user_image_library_update_owner
  ON public.user_image_library FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid())::text = user_id)
  WITH CHECK ((SELECT auth.uid())::text = user_id);

DROP POLICY IF EXISTS policy_user_image_library_delete_owner ON public.user_image_library;
CREATE POLICY policy_user_image_library_delete_owner
  ON public.user_image_library FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid())::text = user_id);

DROP POLICY IF EXISTS policy_user_image_library_insert_service ON public.user_image_library;
DROP POLICY IF EXISTS policy_user_image_library_insert_owner ON public.user_image_library;
CREATE POLICY policy_user_image_library_insert_owner
  ON public.user_image_library FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid())::text = user_id);

-- The gallery is server-mediated. Keep the exposed public table closed to browser roles;
-- the owner policies remain defense-in-depth if direct access is enabled later.
REVOKE ALL ON TABLE public.user_image_library FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_image_library TO service_role;

-- 4. High-Performance Composite Indexes
CREATE INDEX IF NOT EXISTS idx_user_image_library_feed
  ON public.user_image_library (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_image_library_session
  ON public.user_image_library (user_id, session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_image_library_favorite
  ON public.user_image_library (user_id, is_favorite, created_at DESC)
  WHERE is_favorite = true;

CREATE INDEX IF NOT EXISTS idx_user_image_library_aspect_ratio
  ON public.user_image_library (user_id, aspect_ratio, created_at DESC);

-- 5. Single-Roundtrip Atomic Micro-Batch Upsert RPC
CREATE OR REPLACE FUNCTION public.fn_batch_upsert_image_library(
  p_records JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_records IS NULL OR jsonb_array_length(p_records) = 0 THEN
    RETURN 0;
  END IF;
  IF jsonb_array_length(p_records) > 500 THEN
    RAISE EXCEPTION 'batch is limited to 500 assets' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_image_library (
    id, user_id, session_id, status, prompt, revised_prompt, model,
    aspect_ratio, dimensions, quality, public_url, r2_key, content_type,
    size_bytes, sha256, lqip, seed, latency_ms, cost_usd, is_favorite,
    tags, metadata, created_at, updated_at
  )
  SELECT
    r.id,
    r.user_id,
    COALESCE(r.session_id, 'default'),
    COALESCE(r.status, 'completed'),
    r.prompt,
    r.revised_prompt,
    r.model,
    COALESCE(r.aspect_ratio, '1:1'),
    COALESCE(r.dimensions, '1024x1024'),
    COALESCE(r.quality, 'standard'),
    r.public_url,
    r.r2_key,
    COALESCE(r.content_type, 'image/png'),
    COALESCE(r.size_bytes, 0),
    r.sha256,
    r.lqip,
    r.seed,
    COALESCE(r.latency_ms, 0),
    COALESCE(r.cost_usd, 0),
    COALESCE(r.is_favorite, false),
    COALESCE(r.tags, '{}'),
    COALESCE(r.metadata, '{}'::jsonb),
    COALESCE(r.created_at, now()),
    now()
  FROM jsonb_to_recordset(p_records) AS r(
    id TEXT,
    user_id TEXT,
    session_id TEXT,
    status TEXT,
    prompt TEXT,
    revised_prompt TEXT,
    model TEXT,
    aspect_ratio TEXT,
    dimensions TEXT,
    quality TEXT,
    public_url TEXT,
    r2_key TEXT,
    content_type TEXT,
    size_bytes BIGINT,
    sha256 TEXT,
    lqip TEXT,
    seed TEXT,
    latency_ms INTEGER,
    cost_usd NUMERIC,
    is_favorite BOOLEAN,
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    revised_prompt = COALESCE(EXCLUDED.revised_prompt, public.user_image_library.revised_prompt),
    is_favorite = EXCLUDED.is_favorite,
    tags = EXCLUDED.tags,
    metadata = EXCLUDED.metadata,
    updated_at = now()
  WHERE public.user_image_library.user_id = EXCLUDED.user_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_batch_upsert_image_library(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_batch_upsert_image_library(JSONB) TO service_role;

-- 6. Instant Zero-Egress Library Aggregate Statistics RPC
CREATE OR REPLACE FUNCTION public.fn_get_user_image_library_stats(
  p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $function$
DECLARE
  v_stats JSONB;
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL THEN
    RETURN jsonb_build_object(
      'totalImages', 0,
      'totalBytes', 0,
      'favoriteCount', 0,
      'sessionCount', 0,
      'aspectRatios', '{}'::jsonb
    );
  END IF;

  SELECT jsonb_build_object(
    'totalImages', COALESCE(COUNT(*), 0),
    'totalBytes', COALESCE(SUM(size_bytes), 0),
    'favoriteCount', COALESCE(COUNT(*) FILTER (WHERE is_favorite = true), 0),
    'sessionCount', COALESCE(COUNT(DISTINCT session_id), 0),
    'aspectRatios', COALESCE(
      (SELECT jsonb_object_agg(sub.aspect_ratio, sub.cnt)
       FROM (
         SELECT aspect_ratio, COUNT(*) AS cnt
         FROM public.user_image_library
         WHERE user_id = p_user_id
         GROUP BY aspect_ratio
       ) sub),
      '{}'::jsonb
    )
  )
  INTO v_stats
  FROM public.user_image_library
  WHERE user_id = p_user_id;

  RETURN v_stats;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_get_user_image_library_stats(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_user_image_library_stats(TEXT) TO service_role;

-- 7. One-hop cursor page + count + facets + stats query.
-- Cursor pagination preserves O(1) page access and avoids OFFSET scans at deep pages.
CREATE OR REPLACE FUNCTION public.fn_query_user_image_library(
  p_user_id TEXT,
  p_limit INTEGER DEFAULT 48,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_aspect_ratio TEXT DEFAULT NULL,
  p_is_favorite BOOLEAN DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'newest'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $function$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 48), 1), 100);
  v_sort TEXT := CASE WHEN p_sort = 'oldest' THEN 'oldest' ELSE 'newest' END;
  v_result JSONB;
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required' USING ERRCODE = '22023';
  END IF;

  WITH filtered AS MATERIALIZED (
    SELECT library.*
    FROM public.user_image_library AS library
    WHERE library.user_id = p_user_id
      AND (p_session_id IS NULL OR library.session_id = p_session_id)
      AND (p_aspect_ratio IS NULL OR library.aspect_ratio = p_aspect_ratio)
      AND (p_is_favorite IS NULL OR library.is_favorite = p_is_favorite)
      AND (
        NULLIF(btrim(p_search), '') IS NULL
        OR library.prompt ILIKE '%' || btrim(p_search) || '%'
        OR library.revised_prompt ILIKE '%' || btrim(p_search) || '%'
        OR library.model ILIKE '%' || btrim(p_search) || '%'
        OR EXISTS (
          SELECT 1 FROM unnest(library.tags) AS tag
          WHERE tag ILIKE '%' || btrim(p_search) || '%'
        )
      )
  ), page_plus_one AS MATERIALIZED (
    SELECT filtered.*
    FROM filtered
    WHERE p_cursor_created_at IS NULL
      OR p_cursor_id IS NULL
      OR (v_sort = 'newest' AND (filtered.created_at, filtered.id) < (p_cursor_created_at, p_cursor_id))
      OR (v_sort = 'oldest' AND (filtered.created_at, filtered.id) > (p_cursor_created_at, p_cursor_id))
    ORDER BY
      CASE WHEN v_sort = 'newest' THEN filtered.created_at END DESC,
      CASE WHEN v_sort = 'newest' THEN filtered.id END DESC,
      CASE WHEN v_sort = 'oldest' THEN filtered.created_at END ASC,
      CASE WHEN v_sort = 'oldest' THEN filtered.id END ASC
    LIMIT v_limit + 1
  ), page_rows AS (
    SELECT page_plus_one.*
    FROM page_plus_one
    ORDER BY
      CASE WHEN v_sort = 'newest' THEN page_plus_one.created_at END DESC,
      CASE WHEN v_sort = 'newest' THEN page_plus_one.id END DESC,
      CASE WHEN v_sort = 'oldest' THEN page_plus_one.created_at END ASC,
      CASE WHEN v_sort = 'oldest' THEN page_plus_one.id END ASC
    LIMIT v_limit
  ), last_row AS (
    SELECT page_rows.created_at, page_rows.id
    FROM page_rows
    ORDER BY
      CASE WHEN v_sort = 'newest' THEN page_rows.created_at END ASC,
      CASE WHEN v_sort = 'newest' THEN page_rows.id END ASC,
      CASE WHEN v_sort = 'oldest' THEN page_rows.created_at END DESC,
      CASE WHEN v_sort = 'oldest' THEN page_rows.id END DESC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'records', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(row_data)
        ORDER BY
          CASE WHEN v_sort = 'newest' THEN row_data.created_at END DESC,
          CASE WHEN v_sort = 'newest' THEN row_data.id END DESC,
          CASE WHEN v_sort = 'oldest' THEN row_data.created_at END ASC,
          CASE WHEN v_sort = 'oldest' THEN row_data.id END ASC
      )
      FROM page_rows AS row_data
    ), '[]'::jsonb),
    'totalCount', (SELECT COUNT(*) FROM filtered),
    'hasMore', (SELECT COUNT(*) > v_limit FROM page_plus_one),
    'nextCursorCreatedAt', (SELECT created_at FROM last_row),
    'nextCursorId', (SELECT id FROM last_row),
    'stats', (
      SELECT jsonb_build_object(
        'totalImages', COUNT(*),
        'totalBytes', COALESCE(SUM(size_bytes), 0),
        'favoriteCount', COUNT(*) FILTER (WHERE is_favorite),
        'sessionCount', COUNT(DISTINCT session_id),
        'aspectRatios', COALESCE((
          SELECT jsonb_object_agg(ratio_counts.aspect_ratio, ratio_counts.item_count)
          FROM (
            SELECT aspect_ratio, COUNT(*) AS item_count
            FROM public.user_image_library
            WHERE user_id = p_user_id
            GROUP BY aspect_ratio
          ) AS ratio_counts
        ), '{}'::jsonb)
      )
      FROM public.user_image_library
      WHERE user_id = p_user_id
    ),
    'availableSessions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('sessionId', sessions.session_id, 'count', sessions.item_count)
                       ORDER BY sessions.item_count DESC, sessions.session_id)
      FROM (
        SELECT session_id, COUNT(*) AS item_count
        FROM public.user_image_library
        WHERE user_id = p_user_id
        GROUP BY session_id
      ) AS sessions
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_query_user_image_library(TEXT, INTEGER, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_query_user_image_library(TEXT, INTEGER, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO service_role;

-- 8. Set-based favorite/delete mutations. DELETE returns R2 keys so object removal can
-- be coalesced into one storage call without first fetching every asset.
CREATE OR REPLACE FUNCTION public.fn_batch_mutate_image_library(
  p_user_id TEXT,
  p_asset_ids TEXT[],
  p_action TEXT,
  p_is_favorite BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
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

REVOKE ALL ON FUNCTION public.fn_batch_mutate_image_library(TEXT, TEXT[], TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_batch_mutate_image_library(TEXT, TEXT[], TEXT, BOOLEAN) TO service_role;

-- Acknowledge only keys confirmed deleted by R2. Unacknowledged rows remain durable
-- for a later cleanup sweep.
CREATE OR REPLACE FUNCTION public.fn_ack_image_library_gc(p_r2_keys TEXT[])
RETURNS INTEGER
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH removed AS (
    DELETE FROM public.image_library_gc_outbox
    WHERE r2_key = ANY(p_r2_keys)
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM removed;
$function$;

REVOKE ALL ON FUNCTION public.fn_ack_image_library_gc(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_ack_image_library_gc(TEXT[]) TO service_role;
