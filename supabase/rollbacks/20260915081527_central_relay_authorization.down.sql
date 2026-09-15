-- Disable new admission and preserve all identities, results and lease bindings.
SET LOCAL lock_timeout='5s';
UPDATE private.galx_relay_installation_runtime SET registration_allowed=false,execution_allowed=false;
UPDATE private.galx_relay_pools SET registration_enabled=false;
UPDATE private.galx_relay_principals SET disabled=true;
REVOKE ALL ON FUNCTION private.relay_control(text,text,jsonb) FROM galx_relay_control;
-- Deliberately retain scoped legacy wrappers: restoring broad admission would
-- allow assigned accounts and already-issued work to cross the isolation boundary.
