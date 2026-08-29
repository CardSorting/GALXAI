-- Rollback for 20260822000021_galxai_postgresql_hyperscale_governance_and_vacuum_armor.sql

DROP FUNCTION IF EXISTS fn_try_acquire_advisory_xact_lock(VARCHAR);

ALTER TABLE galx_audit_logs RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
ALTER TABLE galx_tasks RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
ALTER TABLE galx_metrics_telemetry RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
ALTER TABLE galx_wallet_transactions RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);

DROP INDEX IF EXISTS idx_galx_stripe_cs_meta_gin;
DROP INDEX IF EXISTS idx_galx_stripe_cust_meta_gin;
DROP INDEX IF EXISTS idx_galx_audit_meta_gin;
DROP INDEX IF EXISTS idx_galx_wallet_tx_meta_gin;
