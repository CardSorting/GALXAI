-- Disable GALX_SITES_DOMAINS_WORKER_ENABLED before rolling back the application.
-- Preserve retries, ownership and external DNS effects, including conflict stops.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE private.galx_site_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_domains FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_site_domains FROM PUBLIC, anon, authenticated, service_role;
