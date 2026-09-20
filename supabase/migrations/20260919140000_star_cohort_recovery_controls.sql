-- ============================================================================
-- GALXAI: explicit one-time recovery control for a stopped Star cohort
--
-- A systemic defect may stop a bounded cohort before its ceiling is consumed.
-- Resumption is a separately auditable operator action, never an automatic
-- retry or a new cohort. Only one recovery is permitted for this initial run.
-- ============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE private.galx_star_cohorts
  ADD COLUMN IF NOT EXISTS resume_count SMALLINT NOT NULL DEFAULT 0
    CHECK (resume_count BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS last_resume_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_resumed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'private.galx_star_cohorts'::regclass
      AND conname = 'galx_star_cohorts_resume_reason_check'
  ) THEN
    ALTER TABLE private.galx_star_cohorts
      ADD CONSTRAINT galx_star_cohorts_resume_reason_check
      CHECK (resume_count = 0 OR length(btrim(COALESCE(last_resume_reason, ''))) BETWEEN 1 AND 500);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION private.galx_validate_star_cohort()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_run_owner TEXT;
BEGIN
  SELECT control_owner_account_id INTO v_run_owner
  FROM private.galx_autonomous_actor_runs
  WHERE run_id = NEW.run_id;
  IF v_run_owner IS NULL THEN
    RAISE EXCEPTION 'Star cohort must reference a controlled run' USING ERRCODE = '23514';
  END IF;
  PERFORM private.galx_assert_human_account(v_run_owner, 'Star cohort control owner');

  IF TG_OP = 'UPDATE' THEN
    IF NEW.run_id IS DISTINCT FROM OLD.run_id
       OR NEW.cohort_key IS DISTINCT FROM OLD.cohort_key
       OR NEW.max_stars IS DISTINCT FROM OLD.max_stars
       OR NEW.content_opportunities_per_star IS DISTINCT FROM OLD.content_opportunities_per_star
       OR NEW.max_content_attempts IS DISTINCT FROM OLD.max_content_attempts
       OR NEW.max_avatar_attempts IS DISTINCT FROM OLD.max_avatar_attempts
       OR NEW.max_generation_concurrency IS DISTINCT FROM OLD.max_generation_concurrency
       OR NEW.resume_count < OLD.resume_count
       OR NEW.resume_count > OLD.resume_count + 1 THEN
      RAISE EXCEPTION 'Star cohort identity, safety limits, and recovery count are immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD.state IN ('completed', 'aborted') AND NEW.state IS DISTINCT FROM OLD.state THEN
      RAISE EXCEPTION 'A closed Star cohort cannot be reactivated' USING ERRCODE = '55000';
    END IF;
    IF OLD.state = 'disabled' AND NEW.state = 'active' THEN
      IF NEW.resume_count <> OLD.resume_count + 1
         OR length(btrim(COALESCE(NEW.last_resume_reason, ''))) < 1
         OR NEW.last_resumed_at IS NULL THEN
        RAISE EXCEPTION 'Disabled Star cohorts require explicit audited recovery authorization'
          USING ERRCODE = '55000';
      END IF;
    ELSIF OLD.resume_count <> NEW.resume_count
       OR OLD.last_resume_reason IS DISTINCT FROM NEW.last_resume_reason
       OR OLD.last_resumed_at IS DISTINCT FROM NEW.last_resumed_at THEN
      RAISE EXCEPTION 'Star cohort recovery fields may only change during explicit reactivation'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_validate_star_cohort() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_validate_star_cohort ON private.galx_star_cohorts;
CREATE TRIGGER galx_validate_star_cohort
BEFORE INSERT OR UPDATE ON private.galx_star_cohorts
FOR EACH ROW EXECUTE FUNCTION private.galx_validate_star_cohort();

COMMENT ON COLUMN private.galx_star_cohorts.resume_count IS
  'Explicit recovery count; the initial bounded cohort permits at most one audited reactivation.';
