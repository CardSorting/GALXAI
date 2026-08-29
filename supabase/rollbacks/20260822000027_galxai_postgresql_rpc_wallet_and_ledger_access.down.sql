-- Rollback for 20260822000027_galxai_postgresql_rpc_wallet_and_ledger_access.sql

DROP FUNCTION IF EXISTS fn_verify_wallet_ledger_integrity(VARCHAR);
DROP FUNCTION IF EXISTS fn_get_wallet_by_user(VARCHAR);
