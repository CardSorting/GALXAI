-- Persist automatic reconciliation independently of the customer connection.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE private.galx_site_domains
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count BETWEEN 0 AND 30),
  ADD COLUMN IF NOT EXISTS automation_stopped boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS galx_site_domains_due_idx
  ON private.galx_site_domains (next_check_at, id)
  WHERE status = 'pending' AND plan IS NOT NULL AND NOT automation_stopped;
ALTER TABLE private.galx_site_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_domains FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_site_domains FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON COLUMN private.galx_site_domains.automation_stopped IS
  'Private conflict stop. Duplicate customer requests cannot bypass operator reconciliation.';
