-- Star generations are private candidates until a deliberate BROC selection.
-- Historical published Star Works retain their existing publication state.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';

ALTER TABLE private.galx_star_practice_events
  DROP CONSTRAINT IF EXISTS galx_star_practice_events_event_type_check;
ALTER TABLE private.galx_star_practice_events
  ADD CONSTRAINT galx_star_practice_events_event_type_check CHECK (
    event_type IN (
      'canon', 'canon_revision', 'direction', 'scene', 'candidate',
      'critique', 'discovery', 'rejection', 'selection'
    )
  );

CREATE INDEX IF NOT EXISTS galx_star_practice_events_selection_recent
  ON private.galx_star_practice_events (
    attempt_id,
    ((event_payload->>'decisionVersion')::bigint) DESC,
    event_sequence DESC
  )
  WHERE event_type = 'selection';
ALTER TABLE private.galx_star_practice_events
  DROP CONSTRAINT IF EXISTS galx_star_practice_events_selection_check;
ALTER TABLE private.galx_star_practice_events
  ADD CONSTRAINT galx_star_practice_events_selection_check CHECK (
    event_type <> 'selection'
    OR COALESCE((
      event_payload->>'status' IN ('selected', 'withheld')
      AND jsonb_typeof(event_payload->'selectedAssetIds') = 'array'
      AND event_payload->>'decisionVersion' ~ '^[1-9][0-9]{0,8}$'
      AND CASE
        WHEN event_payload->>'status' = 'selected'
          THEN jsonb_array_length(event_payload->'selectedAssetIds') BETWEEN 1 AND 4
        ELSE jsonb_array_length(event_payload->'selectedAssetIds') = 0
      END
      AND jsonb_typeof(event_payload->'rationale') = 'string'
      AND length(btrim(event_payload->>'rationale')) BETWEEN 8 AND 1500
      AND jsonb_typeof(event_payload->'reviewer') = 'string'
      AND length(btrim(event_payload->>'reviewer')) BETWEEN 2 AND 120
    ), false)
  );

CREATE OR REPLACE FUNCTION private.galx_guard_star_practice_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_attempt_actor UUID;
  v_attempt_state TEXT;
  v_attempt_assets TEXT[];
  v_candidate_exists BOOLEAN;
  v_selected_count INTEGER;
  v_requested_count INTEGER;
  v_expected_decision_version BIGINT;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Star practice history is append-only' USING ERRCODE = '55000';
  END IF;

  IF NEW.event_type <> 'canon' THEN
    SELECT actor_id, state, asset_ids
      INTO v_attempt_actor, v_attempt_state, v_attempt_assets
    FROM private.galx_star_generation_attempts
    WHERE attempt_id = NEW.attempt_id;

    IF v_attempt_actor IS NULL OR v_attempt_actor IS DISTINCT FROM NEW.actor_id THEN
      RAISE EXCEPTION 'Star practice event must match its generation attempt actor'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.event_type IN ('candidate', 'selection') AND v_attempt_state <> 'completed' THEN
      RAISE EXCEPTION 'Only completed Star attempts can become practice candidates or selections'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.event_type = 'selection' THEN
      IF NEW.event_payload->>'decisionVersion' !~ '^[1-9][0-9]{0,8}$' THEN
        RAISE EXCEPTION 'Selection decision version must be a positive bounded integer'
          USING ERRCODE = '23514';
      END IF;
      PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('broc-selection:' || NEW.attempt_id::text, 0)
      );
      SELECT COALESCE((
        SELECT (event_payload->>'decisionVersion')::bigint
        FROM private.galx_star_practice_events
        WHERE attempt_id = NEW.attempt_id AND event_type = 'selection'
        ORDER BY (event_payload->>'decisionVersion')::bigint DESC, event_sequence DESC
        LIMIT 1
      ), 0) + 1
        INTO v_expected_decision_version;
      IF (NEW.event_payload->>'decisionVersion')::bigint <> v_expected_decision_version THEN
        RAISE EXCEPTION 'Selection decision version is stale'
          USING ERRCODE = '23514';
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM private.galx_star_practice_events AS candidate
        WHERE candidate.attempt_id = NEW.attempt_id
          AND candidate.actor_id = NEW.actor_id
          AND candidate.event_type = 'candidate'
      ) INTO v_candidate_exists;
      IF NOT v_candidate_exists THEN
        RAISE EXCEPTION 'A Star attempt must be recorded as a candidate before selection'
          USING ERRCODE = '23514';
      END IF;

      IF NEW.event_payload->>'status' = 'selected' THEN
        SELECT count(DISTINCT requested.asset_id), count(*)
          INTO v_selected_count, v_requested_count
        FROM jsonb_array_elements_text(NEW.event_payload->'selectedAssetIds') AS requested(asset_id);
        IF v_selected_count <> v_requested_count
           OR v_selected_count <> jsonb_array_length(NEW.event_payload->'selectedAssetIds')
           OR EXISTS (
             SELECT 1
             FROM jsonb_array_elements_text(NEW.event_payload->'selectedAssetIds') AS requested(asset_id)
             WHERE NOT (requested.asset_id = ANY(v_attempt_assets))
           ) THEN
          RAISE EXCEPTION 'Selection must name distinct assets from its completed Star attempt'
            USING ERRCODE = '23514';
        END IF;
      END IF;
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

CREATE OR REPLACE FUNCTION private.galx_enforce_image_work_class()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_request_id TEXT;
  v_generation_class TEXT;
  v_generation_account TEXT;
  v_identity_class private.galx_account_class;
  v_authorized_star BOOLEAN;
  v_attempt_id UUID;
  v_attempt_text TEXT;
  v_attempt_valid BOOLEAN := false;
  v_selection_status TEXT;
  v_selected BOOLEAN := false;
  v_has_selection BOOLEAN := false;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Image Work ownership is immutable' USING ERRCODE = '23514';
  END IF;

  v_request_id := NULLIF(NEW.metadata->>'requestId', '');
  IF v_request_id IS NOT NULL THEN
    SELECT work_class, account_id INTO v_generation_class, v_generation_account
    FROM private.galx_generation_records
    WHERE id = v_request_id;
  END IF;

  IF v_generation_class = 'star_published' AND v_generation_account = NEW.user_id THEN
    SELECT account_class INTO v_identity_class
    FROM private.galx_account_identities
    WHERE account_id = NEW.user_id;
    SELECT EXISTS (
      SELECT 1
      FROM private.galx_autonomous_actors AS actor
      JOIN private.galx_star_profiles AS star ON star.actor_id = actor.actor_id
      JOIN private.galx_account_profiles AS profile ON profile.id = star.account_profile_id
      WHERE actor.account_id = NEW.user_id
        AND actor.is_enabled = true
        AND star.is_discoverable = true
        AND profile.status = 'active'
    ) INTO v_authorized_star;
    IF v_identity_class IS DISTINCT FROM 'autonomous'::private.galx_account_class OR NOT v_authorized_star THEN
      RAISE EXCEPTION 'Public Works require an authorized Star identity' USING ERRCODE = '23514';
    END IF;

    SELECT NULLIF(generation.metadata->>'starAttemptId', '')
      INTO v_attempt_text
    FROM private.galx_generation_records AS generation
    WHERE generation.id = v_request_id
      AND generation.account_id = NEW.user_id;

    IF v_attempt_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_attempt_id := v_attempt_text::uuid;
      SELECT EXISTS (
        SELECT 1 FROM private.galx_star_generation_attempts AS attempt
        WHERE attempt.attempt_id = v_attempt_id
          AND attempt.generation_id = v_request_id
          AND attempt.actor_id = (
            SELECT actor_id FROM private.galx_autonomous_actors WHERE account_id = NEW.user_id
          )
          AND attempt.state = 'completed'
          AND NEW.id = ANY(attempt.asset_ids)
      ) INTO v_attempt_valid;
    END IF;

    IF v_attempt_id IS NOT NULL AND v_attempt_valid THEN
      SELECT event_payload->>'status',
             COALESCE((event_payload->'selectedAssetIds') ? NEW.id, false)
        INTO v_selection_status, v_selected
      FROM private.galx_star_practice_events
      WHERE actor_id = (
          SELECT actor_id FROM private.galx_autonomous_actors WHERE account_id = NEW.user_id
        )
        AND attempt_id = v_attempt_id
        AND event_type = 'selection'
      ORDER BY (event_payload->>'decisionVersion')::bigint DESC, event_sequence DESC
      LIMIT 1;
      v_has_selection := FOUND;
    END IF;

    NEW.work_class := 'star_published';
    IF TG_OP = 'UPDATE' AND NEW.work_class IS DISTINCT FROM OLD.work_class THEN
      RAISE EXCEPTION 'Image Work class is immutable' USING ERRCODE = '23514';
    END IF;

    IF NEW.is_public IS TRUE AND NEW.visibility = 'public' AND v_selected THEN
      NEW.is_public := true;
      NEW.visibility := 'public';
      IF TG_OP = 'INSERT' THEN NEW.is_explore_visible := true; END IF;
    ELSIF TG_OP = 'UPDATE'
       AND NOT v_has_selection
       AND OLD.is_public IS TRUE
       AND OLD.visibility = 'public'
       AND NEW.is_public IS TRUE
       AND NEW.visibility = 'public' THEN
      -- Preserve pre-gate public Star Works, but do not allow this path to
      -- publish a new candidate because its previous row was not public.
      NEW.is_public := OLD.is_public;
      NEW.visibility := OLD.visibility;
      NEW.is_explore_visible := OLD.is_explore_visible;
    ELSE
      -- Generation creates an eligible Star Work candidate, not an exhibition.
      NEW.is_public := false;
      NEW.visibility := 'private';
      NEW.is_explore_visible := false;
    END IF;
  ELSE
    IF NEW.work_class = 'star_published' THEN
      RAISE EXCEPTION 'Human accounts cannot publish Works' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW.is_public OR NEW.visibility <> 'private' OR NEW.is_explore_visible) THEN
      RAISE EXCEPTION 'Human Works are private and cannot be published' USING ERRCODE = '23514';
    END IF;
    NEW.work_class := 'private';
    NEW.is_public := false;
    NEW.visibility := 'private';
    NEW.is_explore_visible := false;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.work_class IS DISTINCT FROM OLD.work_class THEN
    RAISE EXCEPTION 'Image Work class is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.galx_enforce_image_work_class() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_enforce_image_work_class ON public.user_image_library;
CREATE TRIGGER galx_enforce_image_work_class
BEFORE INSERT OR UPDATE ON public.user_image_library
FOR EACH ROW EXECUTE FUNCTION private.galx_enforce_image_work_class();

-- Remix is accounted for by the authenticated generation receipt and purchased
-- allowance. The old public counter RPC cannot represent paid remix activity.
REVOKE ALL ON FUNCTION public.fn_increment_image_remix(TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE SELECT ON TABLE public.user_image_stats FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS policy_user_image_stats_select ON public.user_image_stats;

-- Preserve historical interaction rows, but do not accept client-authored
-- remix telemetry. A real remix is represented by its authenticated,
-- allowance-reserved private generation receipt.
CREATE OR REPLACE FUNCTION private.galx_reject_unmetered_remix_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.interaction_type = 'remix' THEN
    RAISE EXCEPTION 'Remix activity requires a metered private generation'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.galx_reject_unmetered_remix_interaction()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_reject_unmetered_remix_interaction
  ON public.user_image_interactions;
CREATE TRIGGER galx_reject_unmetered_remix_interaction
BEFORE INSERT OR UPDATE OF interaction_type ON public.user_image_interactions
FOR EACH ROW EXECUTE FUNCTION private.galx_reject_unmetered_remix_interaction();

COMMENT ON FUNCTION private.galx_enforce_image_work_class() IS
  'Authorized Star generation rows remain private candidates until an append-only BROC selection event selects the exact asset; historical published Star Works retain their state.';
