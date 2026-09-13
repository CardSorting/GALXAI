-- Nullable fields preserve existing applications and their access decisions.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';
ALTER TABLE private.developer_access_requests
  ADD COLUMN IF NOT EXISTS introduction text CHECK (length(introduction) BETWEEN 20 AND 1000),
  ADD COLUMN IF NOT EXISTS github_url text CHECK (length(github_url) <= 300 AND github_url ~ '^https://github[.]com/[A-Za-z0-9][A-Za-z0-9-]*$'),
  ADD COLUMN IF NOT EXISTS linkedin_url text CHECK (length(linkedin_url) <= 300 AND linkedin_url ~ '^https://www[.]linkedin[.]com/in/[A-Za-z0-9_%~-]+$'),
  ADD COLUMN IF NOT EXISTS cohort_interest text CHECK (cohort_interest IN ('next', 'later')),
  ADD COLUMN IF NOT EXISTS application_updated_at timestamptz;
ALTER TABLE private.developer_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.developer_access_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.developer_access_requests FROM PUBLIC, anon, authenticated;
