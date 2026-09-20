-- Repair the truncated PostgreSQL name of the pre-refresh opportunity
-- constraint. The 1700 migration intentionally used IF EXISTS, but PostgreSQL
-- shortened the original auto-generated name to *_opportunity_num_key.
ALTER TABLE private.galx_star_generation_attempts
  DROP CONSTRAINT IF EXISTS galx_star_generation_attempts_actor_id_kind_opportunity_num_key;

-- Keep the intended cohort-scoped uniqueness explicit and idempotent for
-- projects where the 1700 migration was applied with the expected name.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'private.galx_star_generation_attempts'::regclass
      AND conname = 'galx_star_generation_attempts_cohort_actor_kind_opportunity_key'
  ) THEN
    ALTER TABLE private.galx_star_generation_attempts
      ADD CONSTRAINT galx_star_generation_attempts_cohort_actor_kind_opportunity_key
      UNIQUE (cohort_id, actor_id, kind, opportunity_number);
  END IF;
END
$$;
