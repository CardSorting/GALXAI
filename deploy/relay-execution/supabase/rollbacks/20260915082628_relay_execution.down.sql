-- Close the execution interface; retain identity, requests and unresolved settlements.
REVOKE EXECUTE ON FUNCTION private.relay_execution(text,uuid,text,jsonb) FROM galx_relay_execution;
