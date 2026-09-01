-- ==============================================================================
-- ROLLBACK: 20260901000067_galxai_high_throughput_io_authority_and_pipeline_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_io_authority_cluster_health();
DROP FUNCTION IF EXISTS public.rpc_record_io_pipeline_telemetry(VARCHAR(64), INTEGER, NUMERIC(10, 2), NUMERIC(10, 2), INTEGER, BIGINT);

DROP TABLE IF EXISTS public.galx_io_execution_authority_metrics CASCADE;
