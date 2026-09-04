-- ============================================================================
-- GALXAI Migration: QoS work-authority least privilege
-- Purpose: Make LUMI/community lease and quota procedures backend-only and
--          remove direct runtime mutation rights from their state tables.
-- Risk: HIGH (compute admission, quota, and grant settlement authority).
-- ============================================================================

-- These state tables are authoritative. Authenticated users may retain the
-- existing RLS-scoped read projection where a product surface needs it, but no
-- client or service credential may bypass the adjudicating RPCs with raw DML.
ALTER TABLE public.lumi_user_pool_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumi_user_pool_leases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.lumi_user_rolling_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumi_user_rolling_quotas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.lumi_cluster_pool_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumi_cluster_pool_metrics FORCE ROW LEVEL SECURITY;
ALTER TABLE public.community_user_monthly_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_user_monthly_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.community_free_pool_daily_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_free_pool_daily_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE public.community_grant_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_grant_allocations FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.lumi_user_pool_leases
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.lumi_user_rolling_quotas
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.lumi_cluster_pool_metrics
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.community_user_monthly_grants
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.community_free_pool_daily_ledger
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.community_grant_allocations
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE public.lumi_user_pool_leases TO authenticated, service_role;
GRANT SELECT ON TABLE public.lumi_user_rolling_quotas TO authenticated, service_role;
GRANT SELECT ON TABLE public.community_user_monthly_grants TO authenticated, service_role;
GRANT SELECT ON TABLE public.community_grant_allocations TO authenticated, service_role;
GRANT SELECT ON TABLE public.lumi_cluster_pool_metrics TO service_role;
GRANT SELECT ON TABLE public.community_free_pool_daily_ledger TO service_role;

-- SECURITY DEFINER routines are capabilities. PostgreSQL grants EXECUTE to
-- PUBLIC by default, so every authority routine receives an explicit deny then
-- the one intended backend grant.
REVOKE ALL ON FUNCTION public.rpc_acquire_lumi_stream_lease_v2(
  TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rpc_heartbeat_lumi_stream_lease(
  TEXT, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rpc_settle_lumi_stream_lease_v2(
  TEXT, TEXT, BIGINT, BIGINT, BIGINT
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rpc_sweep_expired_lumi_leases()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rpc_evaluate_and_acquire_community_grant(
  TEXT, TEXT, DATE, NUMERIC
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rpc_settle_community_grant_draw(
  TEXT, NUMERIC, TEXT, DATE
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.rpc_acquire_lumi_stream_lease_v2(
  TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER
) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_heartbeat_lumi_stream_lease(
  TEXT, TEXT, INTEGER
) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_settle_lumi_stream_lease_v2(
  TEXT, TEXT, BIGINT, BIGINT, BIGINT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_sweep_expired_lumi_leases() TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_evaluate_and_acquire_community_grant(
  TEXT, TEXT, DATE, NUMERIC
) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_settle_community_grant_draw(
  TEXT, NUMERIC, TEXT, DATE
) TO service_role;

COMMENT ON FUNCTION public.rpc_acquire_lumi_stream_lease_v2(
  TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER
) IS 'Service-only QoS admission capability; local fallbacks cannot mint production work ownership.';
COMMENT ON FUNCTION public.rpc_evaluate_and_acquire_community_grant(
  TEXT, TEXT, DATE, NUMERIC
) IS 'Service-only community grant adjudication capability.';
