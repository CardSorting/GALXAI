-- Rollback for 20260822000023_galxai_postgresql_apex_fts_and_partial_index_mesh.sql

DROP FUNCTION IF EXISTS fn_search_audit_logs(TEXT, INTEGER);

ALTER TABLE galx_metrics_telemetry DROP CONSTRAINT IF EXISTS chk_galx_telemetry_latency_positive;
ALTER TABLE galx_wallet_transactions DROP CONSTRAINT IF EXISTS chk_galx_wallet_tx_tokens_non_negative;

DROP INDEX IF EXISTS idx_galx_audit_fts;
ALTER TABLE galx_audit_logs DROP COLUMN IF EXISTS search_vector;

DROP INDEX IF EXISTS idx_galx_stripe_cs_open;
DROP INDEX IF EXISTS idx_galx_telemetry_errors;
DROP INDEX IF EXISTS idx_galx_tasks_active_pending;
