-- Rollback for 20260822000030_galxai_postgresql_bulk_array_and_audit_mesh.sql

DROP FUNCTION IF EXISTS fn_batch_record_audit_events(JSONB);
DROP FUNCTION IF EXISTS fn_batch_get_developer_keys_by_hashes(VARCHAR[]);
DROP FUNCTION IF EXISTS fn_batch_get_wallets_by_users(VARCHAR[]);
