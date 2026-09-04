-- ============================================================================
-- GALXAI Rollback: QoS work-authority least privilege
-- Safety: PUBLIC/anon/authenticated EXECUTE and direct mutation grants are
-- intentionally not restored. Availability must not recreate shadow authority.
-- ============================================================================

-- Preserve RLS-scoped read compatibility and backend observability.
GRANT SELECT ON TABLE public.lumi_user_pool_leases TO authenticated, service_role;
GRANT SELECT ON TABLE public.lumi_user_rolling_quotas TO authenticated, service_role;
GRANT SELECT ON TABLE public.community_user_monthly_grants TO authenticated, service_role;
GRANT SELECT ON TABLE public.community_grant_allocations TO authenticated, service_role;
GRANT SELECT ON TABLE public.lumi_cluster_pool_metrics TO service_role;
GRANT SELECT ON TABLE public.community_free_pool_daily_ledger TO service_role;

-- Keep all work-authority procedures service-only during rollback.
REVOKE ALL ON FUNCTION public.rpc_acquire_lumi_stream_lease_v2(
  TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_acquire_lumi_stream_lease_v2(
  TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER
) TO service_role;
