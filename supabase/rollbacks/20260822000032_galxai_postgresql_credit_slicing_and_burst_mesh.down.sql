-- Rollback for 20260822000032_galxai_postgresql_credit_slicing_and_burst_mesh.sql

DROP FUNCTION IF EXISTS fn_batch_probabilistic_recompute_lock(VARCHAR[], VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS fn_reconcile_wallet_credit_slice(VARCHAR, VARCHAR, NUMERIC);
DROP FUNCTION IF EXISTS fn_lease_wallet_credit_slice(VARCHAR, NUMERIC, INTEGER);
