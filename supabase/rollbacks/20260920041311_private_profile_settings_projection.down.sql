-- ============================================================================
-- GALXAI rollback: private account-profile Settings projection
-- ============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

DROP VIEW IF EXISTS private.galx_account_profile_settings;

-- Preference rows are canonical account data and remain in place.
DO $$
BEGIN
  RAISE NOTICE 'Canonical account profiles and preferences retained';
END
$$;
