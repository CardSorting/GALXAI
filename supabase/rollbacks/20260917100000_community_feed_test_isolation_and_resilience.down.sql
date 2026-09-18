-- Rollback for 20260917100000_community_feed_test_isolation_and_resilience.sql
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
