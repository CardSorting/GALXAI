-- ============================================================================
-- GALXAI: Rollback for 20260822000003_galxai_schema_edge_mesh.sql
-- ============================================================================

DROP FUNCTION IF EXISTS fn_lease_tasks_batch_cf(VARCHAR, INTEGER, BIGINT, BIGINT);
DROP FUNCTION IF EXISTS fn_batch_record_telemetry_cf(JSONB);
DROP FUNCTION IF EXISTS fn_batch_commit_task_attempts_cf(JSONB);
DROP FUNCTION IF EXISTS fn_batch_draw_wallet_tokens_cf(JSONB);
