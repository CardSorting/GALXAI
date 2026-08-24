-- ============================================================================
-- Rollback for 20260822000009_galxai_oauth_authoritative_mesh.sql
-- ============================================================================

DROP FUNCTION IF EXISTS fn_purge_expired_oauth_states();
DROP FUNCTION IF EXISTS fn_approve_device_code(VARCHAR, TEXT, JSONB, VARCHAR);
DROP FUNCTION IF EXISTS fn_consume_oauth_request(VARCHAR, VARCHAR);

DROP TABLE IF EXISTS galx_oauth_pushed_requests CASCADE;
DROP TABLE IF EXISTS galx_oauth_device_codes CASCADE;
DROP TABLE IF EXISTS galx_oauth_requests CASCADE;
DROP TABLE IF EXISTS galx_oauth_identities CASCADE;
