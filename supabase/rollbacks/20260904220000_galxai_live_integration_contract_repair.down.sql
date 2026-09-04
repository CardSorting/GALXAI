-- ============================================================================
-- GALXAI Rollback: live integration contract repair
-- Safety: This is a corrective, forward-only migration. Reintroducing the
-- obsolete task columns or invalid shard enum values would corrupt authority.
-- The rollback therefore preserves the repaired routines and their grants.
-- ============================================================================

REVOKE ALL ON FUNCTION public.fn_lease_queue_tasks(
  VARCHAR, VARCHAR, INTEGER, BIGINT, VARCHAR, VARCHAR, BIGINT
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_lease_queue_tasks(
  VARCHAR, VARCHAR, INTEGER, BIGINT, VARCHAR, VARCHAR, BIGINT
) TO service_role;

REVOKE ALL ON FUNCTION public.fn_report_shard_health_cf(JSONB)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_report_shard_health_cf(JSONB) TO service_role;

COMMENT ON FUNCTION public.fn_lease_queue_tasks(
  VARCHAR, VARCHAR, INTEGER, BIGINT, VARCHAR, VARCHAR, BIGINT
) IS 'Backend-only, database-clocked task leasing with SKIP LOCKED and monotonic fencing.';
COMMENT ON FUNCTION public.fn_report_shard_health_cf(JSONB)
IS 'Backend-only health observation ingestion with bounded input, per-shard serialization, and valid circuit-state projection.';
