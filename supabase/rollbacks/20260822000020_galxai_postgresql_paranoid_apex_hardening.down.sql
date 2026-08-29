-- Rollback for 20260822000020_galxai_postgresql_paranoid_apex_hardening.sql

DROP INDEX IF EXISTS idx_galx_wallet_tx_user_covering;
DROP INDEX IF EXISTS idx_galx_wallets_user_covering;
DROP INDEX IF EXISTS idx_galx_dev_keys_active_covering;
DROP INDEX IF EXISTS idx_galx_embeddings_workspace;
DROP INDEX IF EXISTS idx_galx_telemetry_workspace;
DROP INDEX IF EXISTS idx_galx_audit_workspace;
DROP INDEX IF EXISTS idx_galx_dev_keys_workspace;
DROP INDEX IF EXISTS idx_galx_wallet_tx_wallet_id;

ALTER TABLE galx_wallets DROP CONSTRAINT IF EXISTS chk_galx_wallets_promo_non_negative;
ALTER TABLE galx_wallets DROP CONSTRAINT IF EXISTS chk_galx_wallets_deposited_non_negative;
ALTER TABLE galx_wallets DROP CONSTRAINT IF EXISTS chk_galx_wallets_balance_non_negative;
