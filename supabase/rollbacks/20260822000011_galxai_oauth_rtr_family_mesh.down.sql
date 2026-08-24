-- ============================================================================
-- Rollback for 20260822000011_galxai_oauth_rtr_family_mesh.sql
-- ============================================================================

DROP FUNCTION IF EXISTS fn_rotate_oauth_identity_tokens(VARCHAR, VARCHAR, JSONB, JSONB, VARCHAR, TIMESTAMPTZ, INT);

DROP INDEX IF EXISTS idx_galx_oauth_ident_prev_rf_hash;
DROP INDEX IF EXISTS idx_galx_oauth_ident_rf_hash;
DROP INDEX IF EXISTS idx_galx_oauth_ident_family;

ALTER TABLE galx_oauth_device_codes DROP COLUMN IF EXISTS max_attempts;
ALTER TABLE galx_oauth_device_codes DROP COLUMN IF EXISTS failed_attempts;

ALTER TABLE galx_oauth_identities DROP COLUMN IF EXISTS grace_period_until;
ALTER TABLE galx_oauth_identities DROP COLUMN IF EXISTS previous_refresh_token_hash;
ALTER TABLE galx_oauth_identities DROP COLUMN IF EXISTS refresh_token_hash;
ALTER TABLE galx_oauth_identities DROP COLUMN IF EXISTS sequence_number;
ALTER TABLE galx_oauth_identities DROP COLUMN IF EXISTS session_family_id;
