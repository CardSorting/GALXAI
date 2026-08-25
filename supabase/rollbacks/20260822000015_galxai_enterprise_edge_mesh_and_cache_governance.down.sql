-- ============================================================================
-- Rollback: 20260822000015_galxai_enterprise_edge_mesh_and_cache_governance.down.sql
-- Description: Deterministic 1-click rollback for Migration 15.
-- ============================================================================

DROP FUNCTION IF EXISTS public.galx_evaluate_adaptive_rate_limit(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.galx_record_prompt_cache_hit(TEXT, NUMERIC, TEXT);

DROP TABLE IF EXISTS public.galx_compliance_records CASCADE;
DROP TABLE IF EXISTS public.galx_edge_shard_metrics CASCADE;
DROP TABLE IF EXISTS public.galx_prompt_cache_registry CASCADE;
DROP TABLE IF EXISTS public.galx_rate_limit_quotas CASCADE;
