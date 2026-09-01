-- ==============================================================================
-- ROLLBACK: 20260901000055_galxai_tier_shards_and_predictive_routing_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_settle_and_release_shard_lease(VARCHAR(64), BIGINT, NUMERIC, BOOLEAN, VARCHAR(64));
DROP FUNCTION IF EXISTS public.rpc_acquire_tier_shard_lease(VARCHAR(255), VARCHAR(32), VARCHAR(32), BIGINT, INTEGER);

DROP TABLE IF EXISTS public.galx_shard_health_telemetry_ledger CASCADE;
DROP TABLE IF EXISTS public.galx_shard_concurrency_leases CASCADE;

ALTER TABLE public.galx_shard_accounts
  DROP COLUMN IF EXISTS circuit_state,
  DROP COLUMN IF EXISTS hydraulic_headroom_score,
  DROP COLUMN IF EXISTS ewma_latency_p95_ms,
  DROP COLUMN IF EXISTS active_in_flight_count,
  DROP COLUMN IF EXISTS max_concurrency_ceiling,
  DROP COLUMN IF EXISTS tier_pool;
