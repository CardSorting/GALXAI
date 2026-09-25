-- Restore automatic Star publication behavior. Selection history remains
-- append-only and its event type/constraint remain valid after rollback.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';

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
    NEW.work_class := 'star_published';
    NEW.is_public := true;
    NEW.visibility := 'public';
    IF TG_OP = 'INSERT' THEN NEW.is_explore_visible := true; END IF;
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

GRANT EXECUTE ON FUNCTION public.fn_increment_image_remix(TEXT) TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_image_stats TO anon, authenticated;
DROP POLICY IF EXISTS policy_user_image_stats_select ON public.user_image_stats;
CREATE POLICY policy_user_image_stats_select
  ON public.user_image_stats FOR SELECT
  TO anon, authenticated
  USING (true);

DROP TRIGGER IF EXISTS galx_reject_unmetered_remix_interaction
  ON public.user_image_interactions;
DROP FUNCTION IF EXISTS private.galx_reject_unmetered_remix_interaction();
