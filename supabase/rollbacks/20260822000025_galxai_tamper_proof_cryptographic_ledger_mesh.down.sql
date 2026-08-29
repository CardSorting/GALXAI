-- Rollback for 20260822000025_galxai_tamper_proof_cryptographic_ledger_mesh.sql

DROP FUNCTION IF EXISTS fn_verify_wallet_ledger_integrity(UUID);
DROP FUNCTION IF EXISTS fn_record_tamper_proof_transaction(UUID, VARCHAR, galx_wallet_transaction_type, NUMERIC, NUMERIC, TEXT, VARCHAR, VARCHAR, VARCHAR, BIGINT, BIGINT, BIGINT, JSONB);

DROP INDEX IF EXISTS idx_galx_wallet_tx_hash;
DROP INDEX IF EXISTS idx_galx_wallet_tx_sequence;

ALTER TABLE galx_wallet_transactions DROP COLUMN IF EXISTS sequence_number;
ALTER TABLE galx_wallet_transactions DROP COLUMN IF EXISTS ledger_hash;
ALTER TABLE galx_wallet_transactions DROP COLUMN IF EXISTS prev_ledger_hash;
