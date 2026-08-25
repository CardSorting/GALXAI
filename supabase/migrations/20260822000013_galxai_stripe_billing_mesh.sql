-- ============================================================================
-- GALXAI: Stripe Billing Infrastructure & PCI-DSS SAQ-A Mesh
-- Supabase PostgreSQL Core Schema Migration
-- Version: 13.0.0
-- ============================================================================

-- 1. STRIPE CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS galx_stripe_customers (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) DEFAULT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'usd',
    default_payment_method_id VARCHAR(255) DEFAULT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. STRIPE CHECKOUT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS galx_stripe_checkout_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255) DEFAULT NULL,
    amount_usd NUMERIC(14,6) NOT NULL CHECK (amount_usd > 0),
    match_grant_usd NUMERIC(14,6) NOT NULL DEFAULT 0 CHECK (match_grant_usd >= 0),
    total_credited_usd NUMERIC(14,6) NOT NULL CHECK (total_credited_usd >= amount_usd),
    status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'complete', 'expired', 'canceled')),
    payment_status VARCHAR(32) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'no_payment_required')),
    payment_intent_id VARCHAR(255) DEFAULT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. STRIPE INVOICES & RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS galx_stripe_invoices (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    stripe_invoice_id VARCHAR(255) NOT NULL UNIQUE,
    amount_due_usd NUMERIC(14,6) NOT NULL DEFAULT 0,
    amount_paid_usd NUMERIC(14,6) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'paid',
    hosted_invoice_url TEXT DEFAULT NULL,
    invoice_pdf_url TEXT DEFAULT NULL,
    period_start TIMESTAMPTZ DEFAULT NULL,
    period_end TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. STRIPE AUDIT EVENTS DLQ TABLE
CREATE TABLE IF NOT EXISTS galx_stripe_events (
    event_id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'processed' CHECK (status IN ('processed', 'ignored', 'failed')),
    error_message TEXT DEFAULT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. HIGH-VELOCITY INDEXES
CREATE INDEX IF NOT EXISTS idx_galx_stripe_cust_user ON galx_stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_stripe_cust_stripe_id ON galx_stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_galx_stripe_cs_user ON galx_stripe_checkout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_stripe_cs_status ON galx_stripe_checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_galx_stripe_inv_user ON galx_stripe_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_stripe_inv_stripe_id ON galx_stripe_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_galx_stripe_evt_type ON galx_stripe_events(event_type);

-- 6. ROW LEVEL SECURITY & PARANOID FORCE CONSTRAINTS
ALTER TABLE galx_stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_stripe_customers FORCE ROW LEVEL SECURITY;

ALTER TABLE galx_stripe_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_stripe_checkout_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE galx_stripe_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_stripe_invoices FORCE ROW LEVEL SECURITY;

ALTER TABLE galx_stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_stripe_events FORCE ROW LEVEL SECURITY;

-- Service Role Policies (All permissions for serverless backend)
DROP POLICY IF EXISTS p_service_role_stripe_customers ON galx_stripe_customers;
CREATE POLICY p_service_role_stripe_customers ON galx_stripe_customers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_stripe_sessions ON galx_stripe_checkout_sessions;
CREATE POLICY p_service_role_stripe_sessions ON galx_stripe_checkout_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_stripe_invoices ON galx_stripe_invoices;
CREATE POLICY p_service_role_stripe_invoices ON galx_stripe_invoices
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_stripe_events ON galx_stripe_events;
CREATE POLICY p_service_role_stripe_events ON galx_stripe_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated Users Read Policies (Scoped to own user_id)
DROP POLICY IF EXISTS p_user_read_own_stripe_customer ON galx_stripe_customers;
CREATE POLICY p_user_read_own_stripe_customer ON galx_stripe_customers
    FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS p_user_read_own_stripe_sessions ON galx_stripe_checkout_sessions;
CREATE POLICY p_user_read_own_stripe_sessions ON galx_stripe_checkout_sessions
    FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS p_user_read_own_stripe_invoices ON galx_stripe_invoices;
CREATE POLICY p_user_read_own_stripe_invoices ON galx_stripe_invoices
    FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

-- 7. ATOMIC STORED PROCEDURES (SECURITY DEFINER)

-- A. UPSERT STRIPE CUSTOMER
CREATE OR REPLACE FUNCTION fn_upsert_stripe_customer(
    p_id VARCHAR(64),
    p_user_id VARCHAR(255),
    p_stripe_customer_id VARCHAR(255),
    p_email VARCHAR(255) DEFAULT NULL,
    p_currency VARCHAR(10) DEFAULT 'usd',
    p_default_pm VARCHAR(255) DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_record galx_stripe_customers%ROWTYPE;
BEGIN
    INSERT INTO galx_stripe_customers (
        id, user_id, stripe_customer_id, email, currency, default_payment_method_id, metadata, updated_at
    )
    VALUES (
        p_id, p_user_id, p_stripe_customer_id, p_email, p_currency, p_default_pm, p_metadata, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        email = COALESCE(EXCLUDED.email, galx_stripe_customers.email),
        currency = EXCLUDED.currency,
        default_payment_method_id = COALESCE(EXCLUDED.default_payment_method_id, galx_stripe_customers.default_payment_method_id),
        metadata = galx_stripe_customers.metadata || EXCLUDED.metadata,
        updated_at = NOW()
    RETURNING * INTO v_record;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_record.id,
        'user_id', v_record.user_id,
        'stripe_customer_id', v_record.stripe_customer_id,
        'email', v_record.email
    );
END;
$$;

-- B. RECORD STRIPE CHECKOUT SESSION INITIATION
CREATE OR REPLACE FUNCTION fn_record_stripe_checkout_session(
    p_session_id VARCHAR(255),
    p_user_id VARCHAR(255),
    p_customer_id VARCHAR(255),
    p_amount_usd NUMERIC(14,6),
    p_match_grant_usd NUMERIC(14,6),
    p_total_credited_usd NUMERIC(14,6),
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO galx_stripe_checkout_sessions (
        session_id, user_id, customer_id, amount_usd, match_grant_usd, total_credited_usd,
        status, payment_status, metadata, updated_at
    )
    VALUES (
        p_session_id, p_user_id, p_customer_id, p_amount_usd, p_match_grant_usd, p_total_credited_usd,
        'open', 'unpaid', p_metadata, NOW()
    )
    ON CONFLICT (session_id) DO UPDATE SET
        customer_id = COALESCE(EXCLUDED.customer_id, galx_stripe_checkout_sessions.customer_id),
        amount_usd = EXCLUDED.amount_usd,
        match_grant_usd = EXCLUDED.match_grant_usd,
        total_credited_usd = EXCLUDED.total_credited_usd,
        metadata = galx_stripe_checkout_sessions.metadata || EXCLUDED.metadata,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'status', 'open'
    );
END;
$$;

-- C. ATOMIC FULFILLMENT OF STRIPE CHECKOUT SESSION (DOUBLE-ENTRY LEDGER INTEGRATION)
CREATE OR REPLACE FUNCTION fn_fulfill_stripe_checkout_session(
    p_session_id VARCHAR(255),
    p_payment_intent_id VARCHAR(255),
    p_event_id VARCHAR(255),
    p_payload_hash VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session galx_stripe_checkout_sessions%ROWTYPE;
    v_wallet galx_wallets%ROWTYPE;
    v_deposit_result JSONB;
BEGIN
    -- 1. Lock checkout session row
    SELECT * INTO v_session
    FROM galx_stripe_checkout_sessions
    WHERE session_id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- If session record not found locally, create it as complete
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'SESSION_NOT_FOUND'
        );
    END IF;

    -- Idempotency check: if already complete, skip balance mutation
    IF v_session.status = 'complete' AND v_session.payment_status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', true,
            'idempotent_duplicate', true,
            'session_id', p_session_id,
            'amount_usd', v_session.amount_usd,
            'total_credited_usd', v_session.total_credited_usd
        );
    END IF;

    -- 2. Execute atomic deposit & match grant via master wallet procedure
    v_deposit_result := fn_verify_deposit_and_match(
        v_session.user_id,
        v_session.amount_usd,
        COALESCE(p_payment_intent_id, p_session_id)
    );

    -- 3. Mark session complete and paid
    UPDATE galx_stripe_checkout_sessions
    SET status = 'complete',
        payment_status = 'paid',
        payment_intent_id = p_payment_intent_id,
        updated_at = NOW()
    WHERE session_id = p_session_id;

    -- 4. Record event in DLQ audit table
    INSERT INTO galx_stripe_events (event_id, event_type, status, payload_hash, created_at)
    VALUES (p_event_id, 'checkout.session.completed', 'processed', p_payload_hash, NOW())
    ON CONFLICT (event_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'deposit_result', v_deposit_result
    );
END;
$$;
