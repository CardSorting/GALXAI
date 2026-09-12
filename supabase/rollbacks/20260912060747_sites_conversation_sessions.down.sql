-- Application rollback preserves all conversation and version evidence. Pause new
-- generation before reverting application code; do not drop or rewrite history.
UPDATE private.galx_sites_fair_policy SET mode='disabled',revision=revision+1;
ALTER TABLE private.galx_site_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_turns FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_versions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_site_turns,private.galx_site_versions FROM PUBLIC,anon,authenticated,service_role;
