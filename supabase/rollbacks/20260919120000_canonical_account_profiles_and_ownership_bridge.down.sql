-- Data-retaining rollback marker for the expand phase.
--
-- This migration backfills canonical identity and audit history, and adds
-- private compatibility columns. Removing those objects would destroy the
-- very records needed to complete a safe contract phase. The supported
-- rollback is therefore to keep the bridge dormant/compatible and roll the
-- application back to legacy owner-key reads; profile data remains available
-- for a later, reviewed contract migration.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF to_regclass('private.galx_account_profiles') IS NULL
     OR to_regclass('private.galx_account_profile_preferences') IS NULL THEN
    RAISE EXCEPTION 'Canonical account profile migration is incomplete' USING ERRCODE = '55000';
  END IF;
  RAISE NOTICE 'Canonical account profile bridge retained for data-safe compatibility rollback';
END
$$;
