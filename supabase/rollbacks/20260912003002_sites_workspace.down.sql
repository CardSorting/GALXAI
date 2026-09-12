-- Pause workspace writes before application rollback. Preserve drafts and unresolved operations.
ALTER TABLE IF EXISTS private.galx_site_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS private.galx_site_workspaces FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_site_workspaces FROM PUBLIC,anon,authenticated,service_role;
