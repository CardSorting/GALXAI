-- Rollback for 20260919170000_star_cohort_membership_and_refresh.sql.
-- This intentionally fails if a refresh has durable attempts, preserving the
-- append-only audit trail rather than silently deleting population history.

DROP TRIGGER IF EXISTS galx_guard_star_cohort_member_delete ON private.galx_star_cohort_members;
DROP TRIGGER IF EXISTS galx_validate_star_cohort_member ON private.galx_star_cohort_members;
DROP FUNCTION IF EXISTS private.galx_guard_star_cohort_member_delete();
DROP FUNCTION IF EXISTS private.galx_validate_star_cohort_member();

ALTER TABLE private.galx_star_generation_attempts
  DROP CONSTRAINT IF EXISTS galx_star_generation_attempts_cohort_actor_kind_opportunity_key,
  ADD CONSTRAINT galx_star_generation_attempts_actor_id_kind_opportunity_number_key
    UNIQUE (actor_id, kind, opportunity_number);

CREATE OR REPLACE FUNCTION private.galx_guard_star_generation_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_cohort private.galx_star_cohorts%ROWTYPE;
  v_actor_account TEXT;
  v_actor_cohort UUID;
  v_generation_account TEXT;
BEGIN
  SELECT * INTO v_cohort
  FROM private.galx_star_cohorts
  WHERE cohort_id = NEW.cohort_id
  FOR UPDATE;
  IF v_cohort.cohort_id IS NULL OR v_cohort.state <> 'active' THEN
    RAISE EXCEPTION 'Star generation attempts require an active cohort' USING ERRCODE = '55000';
  END IF;
  SELECT account_id, cohort_id INTO v_actor_account, v_actor_cohort
  FROM private.galx_autonomous_actors
  WHERE actor_id = NEW.actor_id AND is_enabled = true;
  IF v_actor_account IS NULL OR v_actor_cohort IS DISTINCT FROM NEW.cohort_id THEN
    RAISE EXCEPTION 'Star generation attempt actor is not an enabled member of the cohort'
      USING ERRCODE = '23514';
  END IF;
  IF (SELECT account_class FROM private.galx_account_identities WHERE account_id = v_actor_account)
      IS DISTINCT FROM 'autonomous'::private.galx_account_class THEN
    RAISE EXCEPTION 'Star generation attempt actor is not autonomous' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.attempt_id IS DISTINCT FROM OLD.attempt_id
       OR NEW.cohort_id IS DISTINCT FROM OLD.cohort_id
       OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
       OR NEW.kind IS DISTINCT FROM OLD.kind
       OR NEW.opportunity_number IS DISTINCT FROM OLD.opportunity_number
       OR NEW.prompt IS DISTINCT FROM OLD.prompt
       OR NEW.parameters IS DISTINCT FROM OLD.parameters
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Star generation attempt identity is immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD.state IN ('completed', 'failed', 'cancelled') AND NEW.state IS DISTINCT FROM OLD.state THEN
      RAISE EXCEPTION 'A terminal Star generation attempt cannot be reopened' USING ERRCODE = '55000';
    END IF;
  END IF;
  IF NEW.generation_id IS NOT NULL THEN
    SELECT account_id INTO v_generation_account
    FROM private.galx_generation_records
    WHERE id = NEW.generation_id;
    IF v_generation_account IS DISTINCT FROM v_actor_account THEN
      RAISE EXCEPTION 'Generation provenance must remain owned by the Star actor'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_guard_star_generation_attempt() FROM PUBLIC, anon, authenticated, service_role;

DROP TABLE private.galx_star_cohort_members;
