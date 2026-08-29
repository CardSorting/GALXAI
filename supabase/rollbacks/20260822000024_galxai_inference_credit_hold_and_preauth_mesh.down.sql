-- Rollback for 20260822000024_galxai_inference_credit_hold_and_preauth_mesh.sql

DROP FUNCTION IF EXISTS fn_release_expired_wallet_holds();
DROP FUNCTION IF EXISTS fn_commit_wallet_hold(UUID, NUMERIC, TEXT, VARCHAR, BIGINT, BIGINT, BIGINT, JSONB);
DROP FUNCTION IF EXISTS fn_reserve_wallet_hold(VARCHAR, NUMERIC, BIGINT, JSONB);

DROP TABLE IF EXISTS galx_wallet_holds CASCADE;
