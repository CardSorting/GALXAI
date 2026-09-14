SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
-- Stop new free work without erasing lifetime grants, attempts or unknown work.
UPDATE private.galx_free_generation_policy SET enabled=false,revision=revision+1,updated_at=now();
REVOKE ALL ON private.galx_free_generation_policy FROM PUBLIC, anon, authenticated, service_role;
