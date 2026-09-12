-- Stop new work without discarding subscription ownership or checkout evidence.
SET LOCAL lock_timeout='2s';
UPDATE private.galx_sites_fair_policy SET mode='disabled',revision=revision+1,updated_at=now() WHERE singleton;
