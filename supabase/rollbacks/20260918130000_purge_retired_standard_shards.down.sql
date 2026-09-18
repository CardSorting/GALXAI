-- The retired shard credentials, leases, and dependent data were permanently
-- purged. They cannot be reconstructed safely.
DO $rollback$
BEGIN
  RAISE EXCEPTION 'purge_retired_standard_shards is irreversible';
END $rollback$;
