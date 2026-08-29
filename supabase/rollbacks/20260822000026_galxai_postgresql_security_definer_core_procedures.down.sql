-- Rollback for 20260822000026_galxai_postgresql_security_definer_core_procedures.sql

-- Revert privileges to default
GRANT EXECUTE ON FUNCTION fn_lease_queue_tasks(VARCHAR, VARCHAR, INTEGER, BIGINT, VARCHAR, VARCHAR, BIGINT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION fn_draw_wallet_tokens_batch(JSONB) TO PUBLIC;
GRANT EXECUTE ON FUNCTION fn_draw_wallet_tokens(VARCHAR, NUMERIC, TEXT, VARCHAR, VARCHAR, VARCHAR, BIGINT, BIGINT, BIGINT, JSONB) TO PUBLIC;
