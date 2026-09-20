-- Rollback intentionally fails if a refresh has recorded attempts because
-- restoring actor-wide uniqueness would make the append-only history invalid.
ALTER TABLE private.galx_star_generation_attempts
  DROP CONSTRAINT IF EXISTS galx_star_generation_attempts_cohort_actor_kind_opportunity_key,
  ADD CONSTRAINT galx_star_generation_attempts_actor_id_kind_opportunity_num_key
    UNIQUE (actor_id, kind, opportunity_number);
