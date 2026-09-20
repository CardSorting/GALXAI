-- Data-retaining rollback marker for the Star participant expand phase.
--
-- Star identities, entitlements, generation receipts, and public attribution
-- are durable product evidence. Dropping them would destroy provenance and
-- could make existing content appear ownerless. The supported rollback is to
-- disable the cohort/controller and roll application reads back to the prior
-- feed projection after a reviewed data-preservation decision.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF to_regclass('private.galx_star_cohorts') IS NULL
     OR to_regclass('private.galx_star_profiles') IS NULL
     OR to_regclass('private.galx_star_generation_attempts') IS NULL THEN
    RAISE EXCEPTION 'Star participant migration is incomplete' USING ERRCODE = '55000';
  END IF;
  RAISE NOTICE 'Star participant control and provenance rows retained for data-safe rollback';
END
$$;
