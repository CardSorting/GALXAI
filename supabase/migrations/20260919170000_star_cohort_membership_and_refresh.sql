-- ============================================================================
-- GALXAI: reusable Star cohort membership and bounded refresh support
--
-- A Star account and actor are durable identities. Population cohorts are
-- bounded execution batches. Membership keeps those two lifecycles separate
-- so a closed batch can be retained while the same Star participates in a
-- separately authorized, independently capped batch.
-- ============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS private.galx_star_cohort_members (
  cohort_id UUID NOT NULL
    REFERENCES private.galx_star_cohorts(cohort_id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL
    REFERENCES private.galx_autonomous_actors(actor_id) ON DELETE RESTRICT,
  control_owner_account_id TEXT NOT NULL
    REFERENCES private.galx_account_identities(account_id) ON DELETE RESTRICT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cohort_id, actor_id)
);

CREATE INDEX IF NOT EXISTS galx_star_cohort_members_actor
  ON private.galx_star_cohort_members (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS galx_star_cohort_members_enabled
  ON private.galx_star_cohort_members (is_enabled, cohort_id);

ALTER TABLE private.galx_star_cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_star_cohort_members FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_star_cohort_members FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.galx_validate_star_cohort_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_cohort_run UUID;
  v_cohort_state TEXT;
  v_cohort_owner TEXT;
  v_actor_account TEXT;
  v_actor_owner TEXT;
  v_class private.galx_account_class;
BEGIN
  SELECT cohort.run_id, cohort.state, run.control_owner_account_id
    INTO v_cohort_run, v_cohort_state, v_cohort_owner
  FROM private.galx_star_cohorts AS cohort
  JOIN private.galx_autonomous_actor_runs AS run ON run.run_id = cohort.run_id
  WHERE cohort.cohort_id = NEW.cohort_id;

  IF v_cohort_run IS NULL THEN
    RAISE EXCEPTION 'Star cohort membership must reference a controlled cohort'
      USING ERRCODE = '23514';
  END IF;

  SELECT actor.account_id, actor.control_owner_account_id
    INTO v_actor_account, v_actor_owner
  FROM private.galx_autonomous_actors AS actor
  WHERE actor.actor_id = NEW.actor_id;

  SELECT identity_row.account_class INTO v_class
  FROM private.galx_account_identities AS identity_row
  WHERE identity_row.account_id = v_actor_account;

  IF v_class IS DISTINCT FROM 'autonomous'::private.galx_account_class THEN
    RAISE EXCEPTION 'Star cohort membership must reference an autonomous actor'
      USING ERRCODE = '23514';
  END IF;
  IF v_actor_owner IS DISTINCT FROM v_cohort_owner
     OR NEW.control_owner_account_id IS DISTINCT FROM v_cohort_owner THEN
    RAISE EXCEPTION 'Star cohort membership control owner must match the cohort owner'
      USING ERRCODE = '23514';
  END IF;
  PERFORM private.galx_assert_human_account(NEW.control_owner_account_id, 'Star cohort membership owner');

  IF TG_OP = 'UPDATE' THEN
    IF NEW.cohort_id IS DISTINCT FROM OLD.cohort_id
       OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
       OR NEW.control_owner_account_id IS DISTINCT FROM OLD.control_owner_account_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Star cohort membership identity is immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD.is_enabled AND NOT NEW.is_enabled AND v_cohort_state = 'active' THEN
      NULL;
    ELSIF NOT OLD.is_enabled AND NEW.is_enabled AND v_cohort_state <> 'active' THEN
      RAISE EXCEPTION 'A Star membership can only be enabled for an active cohort'
        USING ERRCODE = '55000';
    END IF;
  ELSIF NEW.is_enabled AND v_cohort_state <> 'active' THEN
    RAISE EXCEPTION 'A Star membership can only be enabled for an active cohort'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.is_enabled AND EXISTS (
    SELECT 1
    FROM private.galx_star_cohort_members AS other_member
    JOIN private.galx_star_cohorts AS other_cohort
      ON other_cohort.cohort_id = other_member.cohort_id
    WHERE other_member.actor_id = NEW.actor_id
      AND other_member.cohort_id <> NEW.cohort_id
      AND other_member.is_enabled = true
      AND other_cohort.state = 'active'
  ) THEN
    RAISE EXCEPTION 'A Star actor cannot be active in multiple cohorts'
      USING ERRCODE = '55000';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_validate_star_cohort_member() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_validate_star_cohort_member ON private.galx_star_cohort_members;
CREATE TRIGGER galx_validate_star_cohort_member
BEFORE INSERT OR UPDATE ON private.galx_star_cohort_members
FOR EACH ROW EXECUTE FUNCTION private.galx_validate_star_cohort_member();

CREATE OR REPLACE FUNCTION private.galx_guard_star_cohort_member_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Star cohort memberships are retained; disable the membership instead'
    USING ERRCODE = '55000';
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_guard_star_cohort_member_delete() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_guard_star_cohort_member_delete ON private.galx_star_cohort_members;
CREATE TRIGGER galx_guard_star_cohort_member_delete
BEFORE DELETE ON private.galx_star_cohort_members
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_star_cohort_member_delete();

-- Backfill membership for any already-provisioned initial cohort. Closed
-- cohorts remain disabled; this does not reopen or mutate their audit state.
INSERT INTO private.galx_star_cohort_members
  (cohort_id, actor_id, control_owner_account_id, is_enabled)
SELECT actor.cohort_id, actor.actor_id, actor.control_owner_account_id, actor.is_enabled
FROM private.galx_autonomous_actors AS actor
WHERE actor.cohort_id IS NOT NULL
ON CONFLICT (cohort_id, actor_id) DO NOTHING;

-- Opportunity numbers are scoped to a bounded cohort, not to the durable
-- Star actor. Existing rows remain unchanged and retain their original
-- cohort; a refresh gets a fresh 1..3 opportunity set.
ALTER TABLE private.galx_star_generation_attempts
  DROP CONSTRAINT IF EXISTS galx_star_generation_attempts_actor_id_kind_opportunity_number_key,
  ADD CONSTRAINT galx_star_generation_attempts_cohort_actor_kind_opportunity_key
    UNIQUE (cohort_id, actor_id, kind, opportunity_number);

CREATE OR REPLACE FUNCTION private.galx_guard_star_generation_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_cohort private.galx_star_cohorts%ROWTYPE;
  v_actor_account TEXT;
  v_generation_account TEXT;
BEGIN
  SELECT * INTO v_cohort
  FROM private.galx_star_cohorts
  WHERE cohort_id = NEW.cohort_id
  FOR UPDATE;
  IF v_cohort.cohort_id IS NULL THEN
    RAISE EXCEPTION 'Star generation attempt must reference a cohort' USING ERRCODE = '23514';
  END IF;
  IF v_cohort.state <> 'active' THEN
    RAISE EXCEPTION 'Star generation attempts require an active cohort' USING ERRCODE = '55000';
  END IF;

  SELECT actor.account_id INTO v_actor_account
  FROM private.galx_autonomous_actors AS actor
  JOIN private.galx_star_cohort_members AS member
    ON member.actor_id = actor.actor_id
   AND member.cohort_id = NEW.cohort_id
   AND member.is_enabled = true
  WHERE actor.actor_id = NEW.actor_id
    AND actor.is_enabled = true;
  IF v_actor_account IS NULL THEN
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

COMMENT ON TABLE private.galx_star_cohort_members IS
  'Private, append-only membership of durable autonomous Star actors in bounded execution cohorts.';
COMMENT ON CONSTRAINT galx_star_generation_attempts_cohort_actor_kind_opportunity_key
  ON private.galx_star_generation_attempts IS
  'One content or avatar opportunity per Star, per bounded cohort; durable actor identities may join later cohorts.';
