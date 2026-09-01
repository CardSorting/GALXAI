-- ==============================================================================
-- ROLLBACK: 20260901000059_galxai_pools_ietf_burst_and_warmup_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_evaluate_pool_with_ietf_headers(VARCHAR(255), VARCHAR(32), VARCHAR(64), BOOLEAN);
DROP FUNCTION IF EXISTS public.fn_calculate_canary_warmup_weight(VARCHAR(64));

DROP TABLE IF EXISTS public.pool_tenant_burst_quotas CASCADE;
DROP TABLE IF EXISTS public.pool_canary_warmup_schedules CASCADE;
