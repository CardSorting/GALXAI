-- ============================================================================
-- GALXAI Migration: 20260920120000_personal_explore_hide_controls.sql
-- Purpose: Make Explore hides private, account-scoped and abuse-resistant.
--
-- A hide is a personalization preference, not a community moderation vote.
-- It must never change an asset's public/profile visibility for other people.
-- ============================================================================

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';

-- The table is intentionally not exposed to browser roles. The application
-- route verifies the signed-in account, while RLS remains a second boundary if
-- the table is ever granted through the Data API in a future environment.
CREATE TABLE IF NOT EXISTS public.user_image_explore_hides (
  viewer_user_id TEXT NOT NULL CHECK (char_length(viewer_user_id) BETWEEN 1 AND 160),
  asset_id TEXT NOT NULL CHECK (char_length(asset_id) BETWEEN 1 AND 160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_image_explore_hides_pkey PRIMARY KEY (viewer_user_id, asset_id)
);

ALTER TABLE public.user_image_explore_hides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_image_explore_hides FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_image_explore_hides FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_image_explore_hides TO service_role;

DROP POLICY IF EXISTS policy_user_image_explore_hides_select_owner
  ON public.user_image_explore_hides;
CREATE POLICY policy_user_image_explore_hides_select_owner
  ON public.user_image_explore_hides
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid())::text = viewer_user_id);

DROP POLICY IF EXISTS policy_user_image_explore_hides_insert_owner
  ON public.user_image_explore_hides;
CREATE POLICY policy_user_image_explore_hides_insert_owner
  ON public.user_image_explore_hides
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid())::text = viewer_user_id);

DROP POLICY IF EXISTS policy_user_image_explore_hides_delete_owner
  ON public.user_image_explore_hides;
CREATE POLICY policy_user_image_explore_hides_delete_owner
  ON public.user_image_explore_hides
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid())::text = viewer_user_id);

CREATE INDEX IF NOT EXISTS idx_user_image_explore_hides_viewer_created
  ON public.user_image_explore_hides (viewer_user_id, created_at DESC);

COMMENT ON TABLE public.user_image_explore_hides IS
  'Private per-viewer Explore preferences. Does not change creator profile visibility or asset publication.';

-- Keep abuse accounting separate from active preferences. Deleting a hide when
-- a viewer presses Undo must not reset the burst/daily allowance, otherwise a
-- client could hide and immediately undo in a loop to evade the guardrails.
CREATE TABLE IF NOT EXISTS public.user_image_explore_hide_limits (
  viewer_user_id TEXT PRIMARY KEY CHECK (char_length(viewer_user_id) BETWEEN 1 AND 160),
  burst_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  burst_count INTEGER NOT NULL DEFAULT 0 CHECK (burst_count >= 0),
  day_started_on DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_count INTEGER NOT NULL DEFAULT 0 CHECK (daily_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_image_explore_hide_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_image_explore_hide_limits FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_image_explore_hide_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_image_explore_hide_limits TO service_role;

COMMENT ON TABLE public.user_image_explore_hide_limits IS
  'Private per-viewer hide-rate ledger; counters survive undo and are never a public moderation signal.';

-- Historical global moderation records remain useful to operators, but they
-- are not a user-facing report queue and must not be readable or writable by
-- browser roles.
ALTER TABLE public.image_moderation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_moderation_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.image_moderation_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.image_moderation_events TO service_role;

DROP POLICY IF EXISTS policy_image_moderation_events_select
  ON public.image_moderation_events;
DROP POLICY IF EXISTS policy_image_moderation_events_service_only
  ON public.image_moderation_events;
CREATE POLICY policy_image_moderation_events_service_only
  ON public.image_moderation_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Retire the old anonymous/global mutation boundary. Keeping the function
-- definition preserves migration history and lets an old rollback fail closed;
-- removing execution privileges prevents it from being an HTTP RPC surface.
REVOKE ALL ON FUNCTION public.fn_moderate_hide_community_image(text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

-- One account-scoped mutation boundary for both hide and undo. The route is
-- the browser-facing authentication boundary; the claim check below prevents
-- a future direct authenticated invocation from changing another viewer's
-- preference when a JWT claim is present.
CREATE OR REPLACE FUNCTION public.fn_set_image_explore_hide(
  p_viewer_user_id TEXT,
  p_asset_id TEXT,
  p_hidden BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claimed_user_id TEXT := NULLIF(current_setting('request.jwt.claim.sub', true), '');
  v_active_count INTEGER := 0;
  v_burst_count INTEGER := 0;
  v_daily_count INTEGER := 0;
  v_retry_after INTEGER := 60;
  v_deleted INTEGER := 0;
  v_inserted INTEGER := 0;
  v_burst_started_at TIMESTAMPTZ;
  v_day_started_on DATE;
BEGIN
  IF NULLIF(btrim(p_viewer_user_id), '') IS NULL
     OR p_viewer_user_id = 'anonymous_developer'
     OR char_length(p_viewer_user_id) > 160
     OR NULLIF(btrim(p_asset_id), '') IS NULL
     OR char_length(p_asset_id) > 160
     OR p_hidden IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_request');
  END IF;

  IF v_claimed_user_id IS NOT NULL AND v_claimed_user_id <> p_viewer_user_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'forbidden');
  END IF;

  -- Unknown/static showcase IDs can still be dismissed in the current browser,
  -- but do not become durable rows that an attacker can use to fill the table.
  IF p_hidden AND NOT EXISTS (
    SELECT 1
    FROM public.user_image_library AS library
    WHERE library.id = p_asset_id
      AND library.status = 'completed'
      AND library.is_public = true
      AND library.visibility = 'public'
  ) THEN
    RETURN jsonb_build_object('success', true, 'state', 'hidden_client');
  END IF;

  -- Serialize both hide and undo for this account. A failed try-lock returns a
  -- retryable outcome instead of allowing concurrent requests to bypass caps.
  IF NOT pg_try_advisory_xact_lock(hashtextextended('image-explore-hide:' || p_viewer_user_id, 0)) THEN
    RETURN jsonb_build_object('success', false, 'code', 'busy', 'retry_after_seconds', 2);
  END IF;

  -- Undo is idempotent and does not decrement the abuse ledger. Its deletion is
  -- still serialized with hide so the final preference is deterministic.
  IF NOT p_hidden THEN
    DELETE FROM public.user_image_explore_hides
    WHERE viewer_user_id = p_viewer_user_id
      AND asset_id = p_asset_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN jsonb_build_object(
      'success', true,
      'state', 'visible',
      'changed', v_deleted > 0
    );
  END IF;

  -- Duplicate hides are cheap and do not count against a viewer's allowance.
  IF EXISTS (
    SELECT 1
    FROM public.user_image_explore_hides
    WHERE viewer_user_id = p_viewer_user_id
      AND asset_id = p_asset_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'state', 'hidden', 'already_hidden', true);
  END IF;

  SELECT COUNT(*) INTO v_active_count
  FROM public.user_image_explore_hides
  WHERE viewer_user_id = p_viewer_user_id;

  IF v_active_count >= 500 THEN
    RETURN jsonb_build_object('success', false, 'code', 'hide_limit');
  END IF;

  -- Create and lock the account ledger before resetting windows. The ledger is
  -- intentionally independent of active rows, so undo cannot erase history.
  INSERT INTO public.user_image_explore_hide_limits (viewer_user_id)
  VALUES (p_viewer_user_id)
  ON CONFLICT (viewer_user_id) DO NOTHING;

  SELECT burst_started_at, burst_count, day_started_on, daily_count
    INTO v_burst_started_at, v_burst_count, v_day_started_on, v_daily_count
  FROM public.user_image_explore_hide_limits
  WHERE viewer_user_id = p_viewer_user_id
  FOR UPDATE;

  IF v_burst_started_at <= now() - interval '10 minutes' THEN
    v_burst_started_at := now();
    v_burst_count := 0;
  END IF;

  IF v_day_started_on < CURRENT_DATE THEN
    v_day_started_on := CURRENT_DATE;
    v_daily_count := 0;
  END IF;

  UPDATE public.user_image_explore_hide_limits
  SET burst_started_at = v_burst_started_at,
      burst_count = v_burst_count,
      day_started_on = v_day_started_on,
      daily_count = v_daily_count,
      updated_at = now()
  WHERE viewer_user_id = p_viewer_user_id;

  IF v_burst_count >= 30 THEN
    v_retry_after := GREATEST(
      1,
      LEAST(
        900,
        CEIL(EXTRACT(EPOCH FROM (v_burst_started_at + interval '10 minutes' - now())))::INTEGER
      )
    );
    RETURN jsonb_build_object(
      'success', false,
      'code', 'rate_limited',
      'retry_after_seconds', v_retry_after
    );
  END IF;

  IF v_daily_count >= 200 THEN
    RETURN jsonb_build_object('success', false, 'code', 'daily_limit', 'retry_after_seconds', 3600);
  END IF;

  INSERT INTO public.user_image_explore_hides (viewer_user_id, asset_id)
  VALUES (p_viewer_user_id, p_asset_id)
  ON CONFLICT (viewer_user_id, asset_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('success', true, 'state', 'hidden', 'already_hidden', true);
  END IF;

  UPDATE public.user_image_explore_hide_limits
  SET burst_count = burst_count + 1,
      daily_count = daily_count + 1,
      updated_at = now()
  WHERE viewer_user_id = p_viewer_user_id;

  RETURN jsonb_build_object('success', true, 'state', 'hidden', 'already_hidden', false);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_set_image_explore_hide(text, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_image_explore_hide(text, text, boolean)
  TO service_role;

COMMENT ON FUNCTION public.fn_set_image_explore_hide(text, text, boolean) IS
  'Private account-scoped Explore preference with duplicate safety, active-list cap and burst/daily abuse limits.';
