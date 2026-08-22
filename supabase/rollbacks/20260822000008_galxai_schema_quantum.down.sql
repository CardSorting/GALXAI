-- ============================================================================
-- GALXAI: Rollback for 20260822000005_galxai_schema_quantum.sql
-- ============================================================================

DROP FUNCTION IF EXISTS fn_record_webhook_dispatch(VARCHAR, VARCHAR, VARCHAR, JSONB, VARCHAR, INTEGER, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS fn_report_shard_health_batch(JSONB);

DROP TABLE IF EXISTS galx_webhook_dispatches CASCADE;
DROP TABLE IF EXISTS galx_shard_health_probes CASCADE;
