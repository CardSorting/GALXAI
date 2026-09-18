-- Migration: 20260917100000_community_feed_test_isolation_and_resilience.sql
-- Description: Isolate community creations feed from automated test fixtures and enforce binary artifact existence

-- 1. Update canonical public view to strictly exclude test accounts and require non-zero size
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
  AND l.user_id NOT LIKE 'usr_%'
  AND l.user_id NOT LIKE 'test_%'
  AND l.id NOT LIKE 'img_test_%'
  AND l.size_bytes IS NOT NULL
  AND l.size_bytes > 1000;

-- 2. Ensure permissions
GRANT SELECT ON public.community_creations_feed TO anon, authenticated, service_role;

-- 3. Clean up synthetic/test records in user_image_library: ensure they are private
UPDATE public.user_image_library
SET is_public = false,
    visibility = 'private',
    updated_at = NOW()
WHERE is_public = true
  AND (
    user_id LIKE 'usr_%'
    OR user_id LIKE 'test_%'
    OR id LIKE 'img_test_%'
    OR size_bytes IS NULL
    OR size_bytes <= 1000
  );
