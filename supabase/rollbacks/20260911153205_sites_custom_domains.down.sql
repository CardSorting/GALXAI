-- Pause GALX_SITES_DOMAINS_ENABLED before rollback. Preserve ownership and DNS intent.
-- DNS and hostname registrations are external effects, not reversed by SQL rollback.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
REVOKE ALL ON private.galx_site_namespaces, private.galx_site_domains FROM PUBLIC, anon, authenticated, service_role;
ALTER TABLE private.galx_site_namespaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_namespaces FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_domains FORCE ROW LEVEL SECURITY;
