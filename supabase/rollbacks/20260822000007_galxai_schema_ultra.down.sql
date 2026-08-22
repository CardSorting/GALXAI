-- ============================================================================
-- GALXAI: Rollback for 20260822000004_galxai_schema_ultra.sql
-- ============================================================================

DROP FUNCTION IF EXISTS fn_check_budget_thresholds(UUID, NUMERIC);
DROP TABLE IF EXISTS galx_budget_alerts CASCADE;
