-- Rollback for 20260822000022_galxai_postgresql_sovereign_security_and_keyset_armor.sql

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

ALTER TABLE galx_stripe_invoices DROP CONSTRAINT IF EXISTS chk_galx_stripe_inv_amount_non_negative;
ALTER TABLE galx_stripe_checkout_sessions DROP CONSTRAINT IF EXISTS chk_galx_stripe_cs_amount_positive;
ALTER TABLE galx_stripe_customers DROP CONSTRAINT IF EXISTS chk_galx_stripe_cust_email_format;

DROP INDEX IF EXISTS idx_galx_stripe_inv_keyset;
DROP INDEX IF EXISTS idx_galx_tasks_keyset;
DROP INDEX IF EXISTS idx_galx_audit_keyset;
DROP INDEX IF EXISTS idx_galx_telemetry_keyset;
DROP INDEX IF EXISTS idx_galx_wallet_tx_keyset;
