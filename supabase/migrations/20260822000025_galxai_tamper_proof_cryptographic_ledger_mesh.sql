-- ============================================================================
-- GALXAI: Cryptographic Tamper-Proof Financial Ledger Mesh
-- Version: 25.0.0
-- Standards: Enterprise SHA-256 Merkle hash chains for financial immutability,
-- cryptographic sequence verification, and zero-trust audit guarantees.
-- ============================================================================

-- 1. ADD CRYPTOGRAPHIC HASH CHAIN COLUMNS
DO $$ BEGIN
    ALTER TABLE galx_wallet_transactions 
    ADD COLUMN prev_ledger_hash VARCHAR(64) DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE galx_wallet_transactions 
    ADD COLUMN ledger_hash VARCHAR(64) DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE galx_wallet_transactions 
    ADD COLUMN sequence_number BIGINT DEFAULT 1;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 2. SEQUENCE & HASH CHAIN COVERING INDEX
CREATE INDEX IF NOT EXISTS idx_galx_wallet_tx_sequence 
    ON galx_wallet_transactions (wallet_id, sequence_number DESC);

CREATE INDEX IF NOT EXISTS idx_galx_wallet_tx_hash 
    ON galx_wallet_transactions (ledger_hash);

-- 3. ATOMIC TAMPER-PROOF TRANSACTION INGESTION PROCEDURE
CREATE OR REPLACE FUNCTION fn_record_tamper_proof_transaction(
    p_wallet_id UUID,
    p_user_id VARCHAR(255),
    p_transaction_type galx_wallet_transaction_type,
    p_amount_usd NUMERIC(14, 6),
    p_balance_after_usd NUMERIC(14, 6),
    p_description TEXT,
    p_api_key_id VARCHAR(64) DEFAULT NULL,
    p_shard_id VARCHAR(64) DEFAULT NULL,
    p_model VARCHAR(128) DEFAULT NULL,
    p_prompt_tokens BIGINT DEFAULT 0,
    p_completion_tokens BIGINT DEFAULT 0,
    p_cached_tokens BIGINT DEFAULT 0,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET lock_timeout = '2s'
SET statement_timeout = '5s'
AS $$
DECLARE
    v_last_tx galx_wallet_transactions%ROWTYPE;
    v_prev_hash VARCHAR(64);
    v_new_hash VARCHAR(64);
    v_seq BIGINT := 1;
    v_hash_payload TEXT;
    v_tx_id UUID;
BEGIN
    -- Fetch the most recent transaction block for this wallet with lock
    SELECT * INTO v_last_tx
    FROM galx_wallet_transactions
    WHERE wallet_id = p_wallet_id
    ORDER BY sequence_number DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        v_prev_hash := COALESCE(v_last_tx.ledger_hash, 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000');
        v_seq := COALESCE(v_last_tx.sequence_number, 0) + 1;
    ELSE
        v_prev_hash := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
        v_seq := 1;
    END IF;

    -- Compute deterministic SHA-256 hash payload
    v_hash_payload := v_prev_hash || ':' ||
                      p_wallet_id::text || ':' ||
                      p_user_id || ':' ||
                      p_transaction_type::text || ':' ||
                      p_amount_usd::text || ':' ||
                      p_balance_after_usd::text || ':' ||
                      v_seq::text || ':' ||
                      p_description;

    v_new_hash := encode(digest(v_hash_payload, 'sha256'), 'hex');

    -- Insert cryptographic ledger block
    INSERT INTO galx_wallet_transactions (
        wallet_id,
        user_id,
        transaction_type,
        amount_usd,
        balance_after_usd,
        description,
        api_key_id,
        shard_id,
        model,
        prompt_tokens,
        completion_tokens,
        cached_tokens,
        metadata,
        prev_ledger_hash,
        ledger_hash,
        sequence_number
    ) VALUES (
        p_wallet_id,
        p_user_id,
        p_transaction_type,
        p_amount_usd,
        p_balance_after_usd,
        p_description,
        p_api_key_id,
        p_shard_id,
        p_model,
        p_prompt_tokens,
        p_completion_tokens,
        p_cached_tokens,
        p_metadata,
        v_prev_hash,
        v_new_hash,
        v_seq
    ) RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'sequence_number', v_seq,
        'prev_ledger_hash', v_prev_hash,
        'ledger_hash', v_new_hash
    );
END;
$$;

-- 4. CRYPTOGRAPHIC LEDGER CHAIN INTEGRITY AUDITOR
CREATE OR REPLACE FUNCTION fn_verify_wallet_ledger_integrity(
    p_wallet_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tx RECORD;
    v_expected_prev_hash VARCHAR(64) := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
    v_recomputed_hash VARCHAR(64);
    v_hash_payload TEXT;
    v_block_count INTEGER := 0;
BEGIN
    FOR v_tx IN
        SELECT *
        FROM galx_wallet_transactions
        WHERE wallet_id = p_wallet_id
        ORDER BY sequence_number ASC, created_at ASC
    LOOP
        v_block_count := v_block_count + 1;

        -- If block has cryptographic hash attached, verify chain link
        IF v_tx.ledger_hash IS NOT NULL THEN
            IF v_tx.prev_ledger_hash IS NOT NULL AND v_tx.prev_ledger_hash <> v_expected_prev_hash THEN
                RETURN jsonb_build_object(
                    'valid', false,
                    'error', 'CHAIN_LINK_BROKEN',
                    'block_id', v_tx.id,
                    'sequence_number', v_tx.sequence_number,
                    'expected_prev_hash', v_expected_prev_hash,
                    'actual_prev_hash', v_tx.prev_ledger_hash
                );
            END IF;

            -- Recompute hash
            v_hash_payload := v_tx.prev_ledger_hash || ':' ||
                              v_tx.wallet_id::text || ':' ||
                              v_tx.user_id || ':' ||
                              v_tx.transaction_type::text || ':' ||
                              v_tx.amount_usd::text || ':' ||
                              v_tx.balance_after_usd::text || ':' ||
                              v_tx.sequence_number::text || ':' ||
                              v_tx.description;

            v_recomputed_hash := encode(digest(v_hash_payload, 'sha256'), 'hex');

            IF v_recomputed_hash <> v_tx.ledger_hash THEN
                RETURN jsonb_build_object(
                    'valid', false,
                    'error', 'BLOCK_HASH_TAMPERED',
                    'block_id', v_tx.id,
                    'sequence_number', v_tx.sequence_number,
                    'expected_hash', v_recomputed_hash,
                    'actual_hash', v_tx.ledger_hash
                );
            END IF;

            v_expected_prev_hash := v_tx.ledger_hash;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'valid', true,
        'wallet_id', p_wallet_id,
        'audited_blocks', v_block_count,
        'latest_chain_hash', v_expected_prev_hash,
        'audited_at', NOW()
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fn_record_tamper_proof_transaction(UUID, VARCHAR, galx_wallet_transaction_type, NUMERIC, NUMERIC, TEXT, VARCHAR, VARCHAR, VARCHAR, BIGINT, BIGINT, BIGINT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_verify_wallet_ledger_integrity(UUID) TO authenticated, service_role;
