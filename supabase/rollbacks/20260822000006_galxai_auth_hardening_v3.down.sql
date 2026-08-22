-- ============================================================================
-- GALXAI: Rollback for 20260822000004_galxai_auth_hardening_v3.sql
-- ============================================================================

DROP FUNCTION IF EXISTS fn_clean_expired_sessions(BIGINT);
DROP FUNCTION IF EXISTS fn_revoke_session_with_reason(VARCHAR, VARCHAR, VARCHAR);
