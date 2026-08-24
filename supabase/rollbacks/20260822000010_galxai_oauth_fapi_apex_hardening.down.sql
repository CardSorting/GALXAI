-- ============================================================================
-- Rollback for 20260822000010_galxai_oauth_fapi_apex_hardening.sql
-- ============================================================================

DROP FUNCTION IF EXISTS fn_consume_pushed_request(VARCHAR);
DROP FUNCTION IF EXISTS fn_poll_device_code(VARCHAR, BIGINT);
DROP FUNCTION IF EXISTS fn_record_dpop_proof(VARCHAR, VARCHAR, VARCHAR, TEXT, BIGINT, BIGINT);

DROP TABLE IF EXISTS galx_oauth_dpop_proofs CASCADE;
