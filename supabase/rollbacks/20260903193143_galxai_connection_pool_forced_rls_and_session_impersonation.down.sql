-- ============================================================================
-- GALXAI Rollback: 20260903193143_galxai_connection_pool_forced_rls_and_session_impersonation.down.sql
-- Reverts: 20260903193143_galxai_connection_pool_forced_rls_and_session_impersonation.sql
-- ============================================================================

DROP FUNCTION IF EXISTS fn_galxai_connection_pool_forced_rls_and_session_impersonation_action(UUID);
DROP TABLE IF EXISTS galx_galxai_connection_pool_forced_rls_and_session_impersonation CASCADE;
