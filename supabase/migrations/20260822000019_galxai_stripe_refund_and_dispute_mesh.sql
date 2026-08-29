-- ============================================================================
-- GALXAI: Stripe Financial Reconciliation & Dispute Mesh
-- Supabase PostgreSQL Core Schema Migration
-- Version: 19.0.0
-- ============================================================================

-- 1. ATOMIC STORED PROCEDURE: RECORD WALLET REFUND OR ADJUSTMENT
CREATE OR REPLACE FUNCTION fn_record_wallet_refund_or_adjustment(
    p_user_id VARCHAR(255),
    p_refund_amount_usd NUMERIC(14, 6),
    p_reason TEXT DEFAULT 'Stripe refund/adjustment',
    p_payment_ref VARCHAR(128) DEFAULT NULL,
    p_reverse_bonus BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet galx_wallets%ROWTYPE;
    v_bonus_reversal NUMERIC(14, 6) := 0.000000;
    v_total_debit NUMERIC(14, 6);
    v_new_balance NUMERIC(14, 6);
    v_new_deposited NUMERIC(14, 6);
    v_new_promo NUMERIC(14, 6);
    v_tx_id UUID;
BEGIN
    -- 1. Acquire exclusive row lock to prevent race conditions during inference token draws
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'WALLET_NOT_FOUND'
        );
    END IF;

    -- 2. Calculate proportional promotional bonus adjustment if active
    IF p_reverse_bonus AND v_wallet.deposited_total_usd > 0 AND v_wallet.promotional_match_usd > 0 THEN
        v_bonus_reversal := LEAST(
            v_wallet.promotional_match_usd,
            ROUND((p_refund_amount_usd / v_wallet.deposited_total_usd) * v_wallet.promotional_match_usd, 6)
        );
    END IF;

    v_total_debit := p_refund_amount_usd + v_bonus_reversal;
    v_new_balance := GREATEST(0.000000, v_wallet.balance_usd - v_total_debit);
    v_new_deposited := GREATEST(0.000000, v_wallet.deposited_total_usd - p_refund_amount_usd);
    v_new_promo := GREATEST(0.000000, v_wallet.promotional_match_usd - v_bonus_reversal);

    -- 3. Update wallet state atomically
    UPDATE galx_wallets
    SET balance_usd = v_new_balance,
        deposited_total_usd = v_new_deposited,
        promotional_match_usd = v_new_promo,
        updated_at = NOW()
    WHERE id = v_wallet.id;

    -- 4. Insert immutable audit transaction log
    INSERT INTO galx_wallet_transactions (
        wallet_id,
        user_id,
        transaction_type,
        amount_usd,
        balance_after_usd,
        description,
        metadata
    ) VALUES (
        v_wallet.id,
        p_user_id,
        'refund',
        -v_total_debit,
        v_new_balance,
        p_reason,
        jsonb_build_object(
            'payment_ref', p_payment_ref,
            'refund_amount_usd', p_refund_amount_usd,
            'bonus_reversal_usd', v_bonus_reversal,
            'previous_balance_usd', v_wallet.balance_usd,
            'reconciled_at', NOW()
        )
    ) RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'previous_balance', v_wallet.balance_usd,
        'refund_amount', p_refund_amount_usd,
        'bonus_reversal', v_bonus_reversal,
        'total_debit', v_total_debit,
        'new_balance', v_new_balance
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fn_record_wallet_refund_or_adjustment(VARCHAR, NUMERIC, TEXT, VARCHAR, BOOLEAN) TO authenticated, service_role;
