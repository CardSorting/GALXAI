-- Export application details privately before rollback; these new fields are removed.
-- Existing applications, approval decisions, expiry, staff and audit records remain intact.
SET LOCAL lock_timeout = '3s';
ALTER TABLE private.developer_access_requests
  DROP COLUMN IF EXISTS introduction,
  DROP COLUMN IF EXISTS github_url,
  DROP COLUMN IF EXISTS linkedin_url,
  DROP COLUMN IF EXISTS cohort_interest,
  DROP COLUMN IF EXISTS application_updated_at;
