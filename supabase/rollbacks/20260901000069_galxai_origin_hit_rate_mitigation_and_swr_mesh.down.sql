-- ==============================================================================
-- ROLLBACK: 20260901000069_galxai_origin_hit_rate_mitigation_and_swr_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_record_origin_query_metrics(VARCHAR(128), BIGINT, BIGINT, BIGINT, BIGINT);
DROP TABLE IF EXISTS public.galx_origin_query_hit_ledger CASCADE;
