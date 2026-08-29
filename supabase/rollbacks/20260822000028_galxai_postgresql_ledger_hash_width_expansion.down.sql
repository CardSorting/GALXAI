-- Rollback for 20260822000028_galxai_postgresql_ledger_hash_width_expansion.sql

ALTER TABLE galx_wallet_transactions 
    ALTER COLUMN prev_ledger_hash TYPE VARCHAR(64),
    ALTER COLUMN ledger_hash TYPE VARCHAR(64);
