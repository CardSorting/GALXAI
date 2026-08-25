-- ============================================================================
-- Rollback: 20260822000017_galxai_slo_canaries_and_outage_ledger.down.sql
-- Description: Deterministic 1-click rollback for Migration 17.
-- ============================================================================

DROP FUNCTION IF EXISTS public.galx_calculate_slo_error_budget(UUID, VARCHAR);
DROP FUNCTION IF EXISTS public.galx_record_synthetic_canary_result(TEXT, TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, TEXT);

DROP TABLE IF EXISTS public.galx_scheduled_maintenance_windows CASCADE;
DROP TABLE IF EXISTS public.galx_incident_outage_ledger CASCADE;
DROP TABLE IF EXISTS public.galx_synthetic_canary_probes CASCADE;
DROP TABLE IF EXISTS public.galx_slo_agreements CASCADE;
