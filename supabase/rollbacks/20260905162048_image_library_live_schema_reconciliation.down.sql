-- Rollback for the live schema reconciliation.
-- The preceding 20260905093500 migration owns the intended image-library objects.
-- Reverting this drift repair is intentionally non-destructive so rollback cannot
-- remove the authoritative library or reintroduce public SECURITY DEFINER grants.

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';

DO $rollback$
BEGIN
  RAISE NOTICE 'No destructive rollback: image-library objects remain owned by migration 20260905093500';
END;
$rollback$ LANGUAGE plpgsql;
