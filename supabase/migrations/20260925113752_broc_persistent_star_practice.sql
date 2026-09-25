-- BROC keeps Star practice beside the existing Star records. Candidate work,
-- direction snapshots, and judgments remain private and append-only.

CREATE TABLE IF NOT EXISTS private.galx_star_practice_events (
  event_sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL
    REFERENCES private.galx_autonomous_actors(actor_id) ON DELETE RESTRICT,
  attempt_id UUID
    REFERENCES private.galx_star_generation_attempts(attempt_id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'canon',
      'canon_revision',
      'direction',
      'scene',
      'candidate',
      'critique',
      'discovery',
      'rejection'
    )),
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(event_payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (event_type = 'canon' AND attempt_id IS NULL)
    OR (event_type <> 'canon' AND attempt_id IS NOT NULL)
  ),
  CHECK (event_type <> 'direction' OR event_payload ? 'nextQuestion'),
  CHECK (
    event_type <> 'canon_revision'
    OR (event_payload ? 'canon' AND event_payload ? 'rationale')
  ),
  CHECK (
    event_type <> 'scene'
    OR (event_payload ? 'question' AND event_payload ? 'bodyId')
  ),
  CHECK (
    event_type <> 'candidate'
    OR event_payload->>'status' = 'unreviewed_candidate'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS galx_star_practice_events_canon
  ON private.galx_star_practice_events (actor_id)
  WHERE event_type = 'canon';
CREATE UNIQUE INDEX IF NOT EXISTS galx_star_practice_events_scene
  ON private.galx_star_practice_events (attempt_id)
  WHERE event_type = 'scene';
CREATE UNIQUE INDEX IF NOT EXISTS galx_star_practice_events_candidate
  ON private.galx_star_practice_events (attempt_id)
  WHERE event_type = 'candidate';
CREATE INDEX IF NOT EXISTS galx_star_practice_events_candidate_recent
  ON private.galx_star_practice_events (event_sequence DESC, attempt_id, actor_id)
  WHERE event_type = 'candidate' AND attempt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS galx_star_practice_events_actor_recent
  ON private.galx_star_practice_events (actor_id, event_sequence DESC);
CREATE INDEX IF NOT EXISTS galx_star_practice_events_attempt
  ON private.galx_star_practice_events (attempt_id)
  WHERE attempt_id IS NOT NULL;

ALTER TABLE private.galx_star_practice_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_star_practice_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_star_practice_events
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.galx_guard_star_practice_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_attempt_actor UUID;
  v_attempt_state TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Star practice history is append-only' USING ERRCODE = '55000';
  END IF;

  IF NEW.event_type <> 'canon' THEN
    SELECT actor_id, state
      INTO v_attempt_actor, v_attempt_state
    FROM private.galx_star_generation_attempts
    WHERE attempt_id = NEW.attempt_id;

    IF v_attempt_actor IS NULL OR v_attempt_actor IS DISTINCT FROM NEW.actor_id THEN
      RAISE EXCEPTION 'Star practice event must match its generation attempt actor'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.event_type = 'candidate' AND v_attempt_state <> 'completed' THEN
      RAISE EXCEPTION 'Only completed Star attempts can become practice candidates'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_guard_star_practice_event()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS galx_guard_star_practice_event
  ON private.galx_star_practice_events;
CREATE TRIGGER galx_guard_star_practice_event
BEFORE INSERT OR UPDATE OR DELETE ON private.galx_star_practice_events
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_star_practice_event();

COMMENT ON TABLE private.galx_star_practice_events IS
  'Private append-only BROC practice memory for existing Star actors: canon, direction, candidate, critique, discovery, and rejection events.';
