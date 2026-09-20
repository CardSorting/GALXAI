-- Data-retaining marker: the request identity and counter repairs are kept in
-- place so autonomous provenance cannot regress during rollback operations.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF to_regclass('private.galx_star_cohorts') IS NULL THEN
    RAISE EXCEPTION 'Star cohort table is missing' USING ERRCODE = '55000';
  END IF;
  RAISE NOTICE 'Star request identity and counter repairs retained for data-safe rollback';
END
$$;
