-- ==============================================================================
-- ROLLBACK: 20260901000054_galxai_lumi_and_community_qos_pools_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_settle_community_grant_draw(TEXT, NUMERIC, TEXT, DATE);
DROP FUNCTION IF EXISTS public.rpc_evaluate_and_acquire_community_grant(TEXT, TEXT, DATE, NUMERIC);
DROP FUNCTION IF EXISTS public.rpc_release_lumi_stream_lease(TEXT, TEXT, BIGINT);
DROP FUNCTION IF EXISTS public.rpc_acquire_lumi_stream_lease(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER);

DROP TABLE IF EXISTS public.community_user_monthly_grants CASCADE;
DROP TABLE IF EXISTS public.community_free_pool_daily_ledger CASCADE;
DROP TABLE IF EXISTS public.lumi_cluster_pool_metrics CASCADE;
DROP TABLE IF EXISTS public.lumi_user_rolling_quotas CASCADE;
DROP TABLE IF EXISTS public.lumi_user_pool_leases CASCADE;
