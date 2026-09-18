-- GALX Relay Standard is retired. Preserve its private records for audit and
-- reconciliation, but close registration and execution so no new work can be
-- admitted. Premium remains the only active relay product.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

UPDATE private.galx_relay_installation_runtime r
SET registration_allowed=false, execution_allowed=false
FROM private.galx_relay_installations i
WHERE i.id=r.installation_id AND i.pool_id='standard';

UPDATE private.galx_relay_principals
SET disabled=true
WHERE pool_id='standard';

COMMENT ON TABLE private.galx_relay_pools IS
  'Premium is the only active relay product. Retired Standard rows remain private for historical reconciliation and are never admitted.';
