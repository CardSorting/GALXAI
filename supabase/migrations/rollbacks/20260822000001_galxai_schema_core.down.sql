-- ============================================================================
-- GALXAI: Rollback for 20260822000001_galxai_schema_core.sql
-- ============================================================================

DROP FUNCTION IF EXISTS fn_release_distributed_lock(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS fn_acquire_distributed_lock(VARCHAR, VARCHAR, BIGINT);
DROP FUNCTION IF EXISTS fn_match_embeddings(vector, FLOAT, INT);
DROP FUNCTION IF EXISTS fn_draw_wallet_tokens(VARCHAR, NUMERIC, VARCHAR, VARCHAR, VARCHAR, VARCHAR, BIGINT, BIGINT, BIGINT, JSONB);
DROP FUNCTION IF EXISTS fn_verify_deposit_and_match(VARCHAR, NUMERIC, VARCHAR);
DROP FUNCTION IF EXISTS fn_complete_task(UUID, VARCHAR, galx_task_status, JSONB, TEXT, BIGINT);
DROP FUNCTION IF EXISTS fn_lease_task_for_worker(VARCHAR, VARCHAR, BIGINT, BIGINT);
DROP FUNCTION IF EXISTS fn_release_shard_lease(VARCHAR, BIGINT, BIGINT, BIGINT, BIGINT, NUMERIC);
DROP FUNCTION IF EXISTS fn_acquire_shard_lease(VARCHAR, VARCHAR, BIGINT, BIGINT, BIGINT);

DROP TABLE IF EXISTS galx_embeddings_store CASCADE;
DROP TABLE IF EXISTS galx_audit_events CASCADE;
DROP TABLE IF EXISTS galx_telemetry_metrics CASCADE;
DROP TABLE IF EXISTS galx_wallet_transactions CASCADE;
DROP TABLE IF EXISTS galx_wallets CASCADE;
DROP TABLE IF EXISTS galx_task_attempts CASCADE;
DROP TABLE IF EXISTS galx_tasks CASCADE;
DROP TABLE IF EXISTS galx_task_queues CASCADE;
DROP TABLE IF EXISTS galx_shard_leases CASCADE;
DROP TABLE IF EXISTS galx_shard_accounts CASCADE;
DROP TABLE IF EXISTS galx_api_key_scopes CASCADE;
DROP TABLE IF EXISTS galx_developer_keys CASCADE;
DROP TABLE IF EXISTS galx_workspace_members CASCADE;
DROP TABLE IF EXISTS galx_workspaces CASCADE;

DROP TYPE IF EXISTS galx_workspace_role CASCADE;
DROP TYPE IF EXISTS galx_wallet_transaction_type CASCADE;
DROP TYPE IF EXISTS galx_dispatch_target_type CASCADE;
DROP TYPE IF EXISTS galx_task_status CASCADE;
DROP TYPE IF EXISTS galx_queue_state CASCADE;
DROP TYPE IF EXISTS galx_rotation_strategy CASCADE;
DROP TYPE IF EXISTS galx_credential_status CASCADE;
DROP TYPE IF EXISTS galx_shard_mode CASCADE;
DROP TYPE IF EXISTS galx_auth_type CASCADE;
DROP TYPE IF EXISTS galx_provider_type CASCADE;
