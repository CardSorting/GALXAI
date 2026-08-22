-- ============================================================================
-- GALXAI: Rollback for 20260822000002_galxai_user_sessions_auth.sql
-- ============================================================================

DROP FUNCTION IF EXISTS fn_scavenge_expired_sessions(BIGINT);
DROP FUNCTION IF EXISTS fn_revoke_user_session(VARCHAR, TEXT);
DROP FUNCTION IF EXISTS fn_touch_user_session(VARCHAR);
DROP FUNCTION IF EXISTS fn_get_active_session_by_hash(VARCHAR);
DROP FUNCTION IF EXISTS fn_create_user_session(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BIGINT, BIGINT, UUID);

DROP TABLE IF EXISTS galx_user_sessions CASCADE;
