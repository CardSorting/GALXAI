-- ============================================================================
-- Rollback Migration: 20260822000018_galxai_spend_governance_and_forensic_remediation.down.sql
-- ============================================================================

DROP FUNCTION IF EXISTS public.galx_record_forensic_waste_incident(VARCHAR, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, NUMERIC, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB);

DROP TABLE IF EXISTS public.galx_departmental_spend_attributions CASCADE;
DROP TABLE IF EXISTS public.galx_forensic_waste_incidents CASCADE;
DROP TABLE IF EXISTS public.galx_model_route_evidence CASCADE;
DROP TABLE IF EXISTS public.galx_spend_governance_policies CASCADE;
