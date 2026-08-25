-- ============================================================================
-- GALXAI: Rollback Migration 14 (Teams & Seats Governance Mesh)
-- ============================================================================

DROP FUNCTION IF EXISTS galx_record_governance_event(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, JSONB);

DROP TABLE IF EXISTS galx_governance_audit_events CASCADE;
DROP TABLE IF EXISTS galx_team_invitations CASCADE;
DROP TABLE IF EXISTS galx_team_cost_centers CASCADE;
DROP TABLE IF EXISTS galx_organization_members CASCADE;
DROP TABLE IF EXISTS galx_organizations CASCADE;
