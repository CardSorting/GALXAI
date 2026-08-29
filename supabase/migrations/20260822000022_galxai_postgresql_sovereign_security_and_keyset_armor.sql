-- ============================================================================
-- GALXAI: Supabase PostgreSQL Sovereign Security & Keyset Armor
-- Version: 22.0.0
-- Standards: Keyset cursor composite indexing (O(1) deep pagination),
-- database-level regex format validation, and public privilege lockdown.
-- ============================================================================

-- 1. KEYSET CURSOR COMPOSITE INDEXES (O(1) Zero-Scan Deep Pagination)
CREATE INDEX IF NOT EXISTS idx_galx_wallet_tx_keyset 
    ON galx_wallet_transactions (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_galx_telemetry_keyset 
    ON galx_metrics_telemetry (provider, timestamp_ms DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_galx_audit_keyset 
    ON galx_audit_logs (user_id, timestamp_ms DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_galx_tasks_keyset 
    ON galx_tasks (queue_id, created_at_ms DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_galx_stripe_inv_keyset
    ON galx_stripe_invoices (user_id, created_at DESC, id DESC);

-- 2. SCHEMA FORMAT INTEGRITY CHECK CONSTRAINTS
DO $$ BEGIN
    ALTER TABLE galx_stripe_customers 
    ADD CONSTRAINT chk_galx_stripe_cust_email_format 
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE galx_stripe_checkout_sessions 
    ADD CONSTRAINT chk_galx_stripe_cs_amount_positive 
    CHECK (amount_usd > 0);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE galx_stripe_invoices 
    ADD CONSTRAINT chk_galx_stripe_inv_amount_non_negative 
    CHECK (amount_due_usd >= 0 AND amount_paid_usd >= 0);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. PRINCIPLE OF LEAST PRIVILEGE: FUNCTION PERMISSIONS LOCKDOWN
-- Revoke wildcard execution on public functions from anonymous public role
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Re-grant execute access strictly to authenticated users and service_role backend
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
