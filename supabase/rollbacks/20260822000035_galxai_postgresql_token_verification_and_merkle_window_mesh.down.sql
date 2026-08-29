-- Rollback for 20260822000035_galxai_postgresql_token_verification_and_merkle_window_mesh.sql

DROP FUNCTION IF EXISTS fn_verify_merkle_chain_window(UUID, INTEGER);
DROP FUNCTION IF EXISTS fn_batch_verify_tokens(VARCHAR[]);
