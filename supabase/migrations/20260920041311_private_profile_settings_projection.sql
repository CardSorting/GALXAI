-- ============================================================================
-- GALXAI: private account-profile Settings projection
--
-- Gives server-side Settings reads one explicit, private projection while
-- keeping ordinary account profiles separate from public Star profiles.
-- ============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

-- Repair any legacy canonical profiles that predate the one-to-one preference
-- row. The canonical constructor already maintains this invariant for new rows.
INSERT INTO private.galx_account_profile_preferences (profile_id)
SELECT profile.id
FROM private.galx_account_profiles AS profile
ON CONFLICT (profile_id) DO NOTHING;

CREATE OR REPLACE VIEW private.galx_account_profile_settings
WITH (security_barrier = true)
AS
SELECT
  profile.owner_key,
  profile.display_name,
  preferences.locale,
  preferences.timezone,
  profile.revision
FROM private.galx_account_profiles AS profile
JOIN private.galx_account_profile_preferences AS preferences
  ON preferences.profile_id = profile.id
WHERE profile.account_class = 'human'::private.galx_account_class
  AND profile.status = 'active';

REVOKE ALL ON private.galx_account_profile_settings
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON VIEW private.galx_account_profile_settings IS
  'Private server-side allowlist for the authenticated account Settings profile. Not a public creator profile.';
