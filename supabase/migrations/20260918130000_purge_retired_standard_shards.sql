-- Permanently purge the three shard accounts that were created for the
-- retired GALX Relay Standard pool. These accounts were already revoked and
-- permission-retracted; this removes the accounts and their dependent shard
-- data, including the immutable lease rows retained by the prior retirement.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE TEMP TABLE _retired_standard_shards (id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _retired_standard_shards (id) VALUES
  ('codex_sh_238671c215e5f3b13898cd7b'),
  ('codex_sh_47da301f8280a763f659ebc8'),
  ('codex_sh_834707761bf76510dd70d6a7');

DO $guard$
DECLARE
  target_count integer;
  eligible_count integer;
BEGIN
  SELECT count(*) INTO target_count
  FROM public.galx_shard_accounts a
  JOIN _retired_standard_shards t ON t.id=a.id;
  -- Fresh installations never received the retired shards; the purge is
  -- intentionally a no-op there while remaining strict for partial matches.
  IF target_count = 0 THEN
    RETURN;
  END IF;
  IF target_count <> 3 THEN
    RAISE EXCEPTION 'Refusing retired shard purge: expected 3 exact accounts, found %', target_count;
  END IF;

  SELECT count(*) INTO eligible_count
  FROM public.galx_shard_accounts a
  JOIN _retired_standard_shards t ON t.id=a.id
  WHERE a.relay_pool_id IS NULL
    AND a.status='revoked'
    AND a.permission_retracted=true;
  IF eligible_count <> 3 THEN
    RAISE EXCEPTION 'Refusing retired shard purge: target accounts are not all revoked and retracted';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM private.galx_relay_account_assignments a
    JOIN _retired_standard_shards t ON t.id=a.account_id
  ) OR EXISTS (
    SELECT 1
    FROM private.galx_relay_registrations r
    JOIN _retired_standard_shards t ON t.id=r.account_id
  ) THEN
    RAISE EXCEPTION 'Refusing retired shard purge: private relay ownership rows remain';
  END IF;
END $guard$;

-- Lease rows are intentionally immutable during normal operations. This
-- reviewed retirement migration is the explicit authority to remove them.
ALTER TABLE public.galx_shard_leases DISABLE TRIGGER USER;
DELETE FROM public.galx_shard_leases l
USING _retired_standard_shards t
WHERE l.shard_id=t.id;
ALTER TABLE public.galx_shard_leases ENABLE TRIGGER USER;

-- Remaining public dependents use their declared CASCADE/SET NULL policies.
-- Delete the source rows only after the lease evidence has been purged.
DELETE FROM public.galx_shard_accounts a
USING _retired_standard_shards t
WHERE a.id=t.id;

COMMENT ON TABLE public.galx_shard_accounts IS
  'Authoritative shard account registry; retired Standard relay shards are purged.';
