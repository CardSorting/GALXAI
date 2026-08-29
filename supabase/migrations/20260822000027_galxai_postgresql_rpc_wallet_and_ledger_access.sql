-- ============================================================================
-- GALXAI: PostgreSQL RPC Wallet Resolution & Ledger Access Armor
-- Version: 27.0.0
-- Standards: SECURITY DEFINER wallet resolution and user-direct cryptographic
-- ledger integrity audit procedure.
-- ============================================================================

-- 1. SECURITY DEFINER RPC FOR DIRECT WALLET RESOLUTION
CREATE OR REPLACE FUNCTION fn_get_wallet_by_user(
    p_user_id VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet galx_wallets%ROWTYPE;
BEGIN
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'found', false,
            'user_id', p_user_id
        );
    END IF;

    RETURN jsonb_build_object(
        'found', true,
        'id', v_wallet.id,
        'user_id', v_wallet.user_id,
        'workspace_id', v_wallet.workspace_id,
        'balance_usd', v_wallet.balance_usd,
        'introductory_grant_usd', v_wallet.introductory_grant_usd,
        'deposited_total_usd', v_wallet.deposited_total_usd,
        'promotional_match_usd', v_wallet.promotional_match_usd,
        'lifetime_spent_usd', v_wallet.lifetime_spent_usd,
        'auto_reload_enabled', v_wallet.auto_reload_enabled,
        'auto_reload_threshold_usd', v_wallet.auto_reload_threshold_usd,
        'auto_reload_amount_usd', v_wallet.auto_reload_amount_usd,
        'auto_reload_payment_method_id', v_wallet.auto_reload_payment_method_id,
        'proof_of_deposit_verified', v_wallet.proof_of_deposit_verified,
        'verified_at', v_wallet.verified_at,
        'created_at', v_wallet.created_at,
        'updated_at', v_wallet.updated_at
    );
END;
$$;

-- 2. USER-DIRECT CRYPTOGRAPHIC LEDGER INTEGRITY AUDITOR
DROP FUNCTION IF EXISTS fn_verify_wallet_ledger_integrity(UUID);

CREATE OR REPLACE FUNCTION fn_verify_wallet_ledger_integrity(
    p_user_id VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet galx_wallets%ROWTYPE;
    v_tx RECORD;
    v_expected_prev_hash VARCHAR(64) := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
    v_recomputed_hash VARCHAR(64);
    v_hash_payload TEXT;
    v_block_count INTEGER := 0;
BEGIN
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'WALLET_NOT_FOUND',
            'audited_blocks', 0
        );
    END IF;

    FOR v_tx IN
        SELECT *
        FROM galx_wallet_transactions
        WHERE wallet_id = v_wallet.id
        ORDER BY sequence_number ASC, created_at ASC
    LOOP
        v_block_count := v_block_count + 1;

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
        'wallet_id', v_wallet.id,
        'user_id', p_user_id,
        'audited_blocks', v_block_count,
        'latest_chain_hash', v_expected_prev_hash,
        'audited_at', NOW()
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fn_get_wallet_by_user(VARCHAR) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_verify_wallet_ledger_integrity(VARCHAR) TO authenticated, service_role, anon;
