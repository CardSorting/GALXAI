-- ============================================================================
-- GALXAI: Rollback for 20260822000003_galxai_auth_hardening_v2.sql
-- ============================================================================

DROP FUNCTION IF EXISTS fn_record_session_audit(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, NUMERIC);
DROP FUNCTION IF EXISTS fn_elevate_session_sudo(VARCHAR, BIGINT);
DROP FUNCTION IF EXISTS fn_rotate_user_session(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, BIGINT);

DROP TABLE IF EXISTS galx_session_audit_log CASCADE;
DROP TABLE IF EXISTS galx_session_revocations CASCADE;

ALTER TABLE galx_user_sessions
    DROP COLUMN IF EXISTS is_sudo_mode,
    DROP COLUMN IF EXISTS sudo_expires_at_ms,
    DROP COLUMN IF EXISTS scopes,
    DROP COLUMN IF EXISTS risk_score,
    DROP COLUMN IF EXISTS family_id,
    DROP COLUMN IF EXISTS rotation_counter;
