-- ==============================================================================
-- ROLLBACK: 20260901000063_galxai_quality_survivability_and_sentinel_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_record_quality_telemetry(VARCHAR(64), VARCHAR(64), BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS public.rpc_evaluate_model_quality_survivability(VARCHAR(64));

DROP TABLE IF EXISTS public.galx_quality_remediation_rules CASCADE;
DROP TABLE IF EXISTS public.galx_model_quality_sentinel_ledger CASCADE;
