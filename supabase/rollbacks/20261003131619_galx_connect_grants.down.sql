-- Disable Connect first. Rollback removes only Connect records and invalidates its credentials.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';
DROP TABLE IF EXISTS private.galx_nova_requests;
DROP TABLE IF EXISTS private.galx_connect_tokens;
DROP TABLE IF EXISTS private.galx_connect_codes;
DROP TABLE IF EXISTS private.galx_connect_grants;
DROP TABLE IF EXISTS private.galx_connect_requests;
DROP TABLE IF EXISTS private.galx_inference_access;
