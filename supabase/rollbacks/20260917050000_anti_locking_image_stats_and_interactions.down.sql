-- ============================================================================
-- ROLLBACK: 20260917050000_anti_locking_image_stats_and_interactions.down.sql
-- Reverses anti-locking user_image_stats and user_image_interactions tables and RPCs.
-- ============================================================================

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';

-- 1. Drop functions
DROP FUNCTION IF EXISTS public.fn_record_image_view_batch(TEXT[], TEXT);
DROP FUNCTION IF EXISTS public.fn_record_image_like(TEXT, TEXT, BOOLEAN);

-- 2. Drop policies
DROP POLICY IF EXISTS policy_user_image_interactions_delete ON public.user_image_interactions;
DROP POLICY IF EXISTS policy_user_image_interactions_insert ON public.user_image_interactions;
DROP POLICY IF EXISTS policy_user_image_interactions_select ON public.user_image_interactions;
DROP POLICY IF EXISTS policy_user_image_stats_select ON public.user_image_stats;

-- 3. Drop tables
DROP TABLE IF EXISTS public.user_image_interactions;
DROP TABLE IF EXISTS public.user_image_stats;
