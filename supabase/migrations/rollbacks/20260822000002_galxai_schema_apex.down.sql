-- ============================================================================
-- GALXAI: Rollback for 20260822000002_galxai_schema_apex.sql
-- ============================================================================

DROP FUNCTION IF EXISTS fn_release_distributed_lock_fenced(VARCHAR, VARCHAR, BIGINT);
DROP FUNCTION IF EXISTS fn_acquire_distributed_lock_fenced(VARCHAR, VARCHAR, BIGINT, BIGINT);
DROP FUNCTION IF EXISTS fn_commit_idempotency_key(VARCHAR, VARCHAR, VARCHAR, INTEGER, JSONB, JSONB, BIGINT);
DROP FUNCTION IF EXISTS fn_lock_idempotency_key(VARCHAR, VARCHAR, VARCHAR, BIGINT, BIGINT);

DROP TABLE IF EXISTS galx_distributed_locks CASCADE;
DROP TABLE IF EXISTS galx_idempotency_keys CASCADE;
DROP TABLE IF EXISTS galx_environments CASCADE;
DROP TABLE IF EXISTS galx_projects CASCADE;

DROP TYPE IF EXISTS galx_idempotency_state CASCADE;
DROP TYPE IF EXISTS galx_environment_type CASCADE;
