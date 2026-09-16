-- Containment rollback: retain irreversible credential retirement and connection evidence.
-- Old services do not understand reconnect-required state, so close execution/registration.
SET LOCAL lock_timeout='5s';
UPDATE private.galx_relay_installation_runtime SET registration_allowed=false,execution_allowed=false;
REVOKE ALL ON FUNCTION private.relay_control(text,text,jsonb) FROM galx_relay_control;
REVOKE ALL ON FUNCTION private.retire_legacy_credentials(text[]),private.retire_legacy_credential_material(text[]) FROM postgres;
-- Reapply grants only with compatible source and fresh acceptance. Purged secrets cannot be restored.
