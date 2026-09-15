-- Containment rollback: retain removed markers, identities, revisions and immutable history.
SET LOCAL lock_timeout='5s';
UPDATE private.galx_relay_installation_runtime SET registration_allowed=false,execution_allowed=false;
UPDATE private.galx_relay_pools SET registration_enabled=false;
REVOKE ALL ON FUNCTION private.relay_control(text,text,jsonb) FROM galx_relay_control;
