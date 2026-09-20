-- GALXAI: repair autonomous request identity handling and bounded counters
--
-- The original request bridge attempted to insert every owner as human before
-- conflict handling. That is valid for new legacy owners but must not ask an
-- existing autonomous identity to change class. The original opportunity
-- counter also ran in a BEFORE INSERT trigger, which counted ON CONFLICT
-- DO NOTHING probes. Both repairs preserve the same cohort ceiling.

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION private.galx_create_generation_for_image_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  existing_account TEXT;
BEGIN
  -- Only new legacy owners receive the human default. Existing autonomous
  -- identities must never pass through a synthetic human INSERT trigger.
  IF NOT EXISTS (
    SELECT 1
    FROM private.galx_account_identities
    WHERE account_id = NEW.user_id
  ) THEN
    INSERT INTO private.galx_account_identities (account_id, account_class)
    VALUES (NEW.user_id, 'human'::private.galx_account_class)
    ON CONFLICT (account_id) DO NOTHING;
  END IF;

  SELECT account_id INTO existing_account
  FROM private.galx_generation_records
  WHERE id = NEW.id::TEXT;
  IF existing_account IS NOT NULL AND existing_account IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Generation identifier is already owned by another account'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO private.galx_generation_records (id, account_id, kind, state, created_at, updated_at)
  VALUES (NEW.id::TEXT, NEW.user_id, 'image', NEW.state, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE
    SET state = CASE
      WHEN private.galx_generation_records.state IN ('completed', 'failed', 'cancelled')
        THEN private.galx_generation_records.state
      ELSE EXCLUDED.state
    END,
    updated_at = now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_create_generation_for_image_request() FROM PUBLIC, anon, authenticated, service_role;

-- Validation stays BEFORE INSERT/UPDATE, but quota accounting moves to an
-- AFTER INSERT trigger. PostgreSQL fires BEFORE INSERT triggers for an
-- ON CONFLICT DO NOTHING candidate even when no row is inserted; AFTER INSERT
-- fires only for a row that actually exists.
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
  v_class private.galx_account_class;
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

  SELECT account_id, cohort_id INTO v_actor_account, v_actor_cohort
  FROM private.galx_autonomous_actors
  WHERE actor_id = NEW.actor_id AND is_enabled = true;
  IF v_actor_account IS NULL OR v_actor_cohort IS DISTINCT FROM NEW.cohort_id THEN
    RAISE EXCEPTION 'Star generation attempt actor is not an enabled member of the cohort'
      USING ERRCODE = '23514';
  END IF;
  SELECT account_class INTO v_class
  FROM private.galx_account_identities
  WHERE account_id = v_actor_account;
  IF v_class IS DISTINCT FROM 'autonomous'::private.galx_account_class THEN
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

CREATE OR REPLACE FUNCTION private.galx_count_star_generation_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_cohort private.galx_star_cohorts%ROWTYPE;
BEGIN
  SELECT * INTO v_cohort
  FROM private.galx_star_cohorts
  WHERE cohort_id = NEW.cohort_id
  FOR UPDATE;
  IF v_cohort.cohort_id IS NULL OR v_cohort.state <> 'active' THEN
    RAISE EXCEPTION 'Star generation attempts require an active cohort' USING ERRCODE = '55000';
  END IF;
  IF NEW.kind = 'content' THEN
    IF v_cohort.content_attempts >= v_cohort.max_content_attempts THEN
      RAISE EXCEPTION 'Star content generation ceiling reached' USING ERRCODE = '55000';
    END IF;
    UPDATE private.galx_star_cohorts
    SET content_attempts = content_attempts + 1
    WHERE cohort_id = NEW.cohort_id;
  ELSE
    IF v_cohort.avatar_attempts >= v_cohort.max_avatar_attempts THEN
      RAISE EXCEPTION 'Star avatar generation ceiling reached' USING ERRCODE = '55000';
    END IF;
    UPDATE private.galx_star_cohorts
    SET avatar_attempts = avatar_attempts + 1
    WHERE cohort_id = NEW.cohort_id;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_count_star_generation_attempt() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_count_star_generation_attempt ON private.galx_star_generation_attempts;
CREATE TRIGGER galx_count_star_generation_attempt
AFTER INSERT ON private.galx_star_generation_attempts
FOR EACH ROW EXECUTE FUNCTION private.galx_count_star_generation_attempt();

-- Repair the durable counters from append-only attempt rows. This is an
-- idempotent reconciliation, not a reset of the controlled run.
UPDATE private.galx_star_cohorts AS cohort
SET content_attempts = (
      SELECT COUNT(*)::INTEGER
      FROM private.galx_star_generation_attempts AS attempt
      WHERE attempt.cohort_id = cohort.cohort_id AND attempt.kind = 'content'
    ),
    avatar_attempts = (
      SELECT COUNT(*)::INTEGER
      FROM private.galx_star_generation_attempts AS attempt
      WHERE attempt.cohort_id = cohort.cohort_id AND attempt.kind = 'avatar'
    ),
    updated_at = now();

-- One further explicit recovery is permitted because the first recovery
-- consumed a slot while this request-identity defect was still present.
ALTER TABLE private.galx_star_cohorts
  DROP CONSTRAINT IF EXISTS galx_star_cohorts_resume_count_check,
  ADD CONSTRAINT galx_star_cohorts_resume_count_check CHECK (resume_count BETWEEN 0 AND 2);

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
         OR NEW.resume_count > 2
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

COMMENT ON COLUMN private.galx_star_cohorts.resume_count IS
  'Explicit recovery count; this initial bounded cohort permits at most two audited reactivations while its fixed 36-opportunity ceiling remains unchanged.';
