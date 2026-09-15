-- Containment rollback: retain legacy assignment denial and durable evidence.
BEGIN;
UPDATE private.galx_relay_installation_runtime SET registration_allowed=false, execution_allowed=false;
UPDATE private.galx_relay_pools SET registration_enabled=false;
REVOKE EXECUTE ON FUNCTION private.relay_control(text,text,jsonb) FROM galx_relay_control;
COMMIT;
