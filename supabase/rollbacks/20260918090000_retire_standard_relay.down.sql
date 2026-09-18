-- Reversal is intentionally conservative: reopen only the retired control
-- plane. Execution remains closed until a separate, reviewed deployment
-- qualification explicitly enables it.
UPDATE private.galx_relay_installation_runtime r
SET registration_allowed=true, execution_allowed=false
FROM private.galx_relay_installations i
WHERE i.id=r.installation_id AND i.pool_id='standard';

UPDATE private.galx_relay_principals
SET disabled=false
WHERE pool_id='standard';

COMMENT ON TABLE private.galx_relay_pools IS
  'Main-project control-plane metadata only. Registration remains disabled until scoped service and lease enforcement are deployed.';
