-- Retain policy/history and compatibility; fail closed without replaying registration.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
UPDATE private.galx_relay_installation_runtime SET automatic_activation=false,execution_allowed=false,registration_allowed=false;
UPDATE private.galx_relay_pools SET registration_enabled=false;
REVOKE ALL ON FUNCTION private.relay_control(text,text,jsonb) FROM galx_relay_control;
COMMENT ON COLUMN private.galx_relay_installation_runtime.automatic_activation IS 'Rollback disabled automatic activation and protocol access. Restore only compatible code with fresh verification; retain account intent and history.';
