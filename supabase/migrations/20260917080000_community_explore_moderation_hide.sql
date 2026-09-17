-- Migration: 20260917080000_community_explore_moderation_hide.sql
-- Description: Community explore moderation procedure allowing any user to hide explore images back to private

-- 1. Image Moderation Audit Log Table
CREATE TABLE IF NOT EXISTS public.image_moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL,
  moderator_id text,
  action text NOT NULL DEFAULT 'set_private',
  reason text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_moderation_events_asset_id
  ON public.image_moderation_events (asset_id, created_at DESC);

ALTER TABLE public.image_moderation_events ENABLE ROW LEVEL SECURITY;

-- Allow read of moderation events by authenticated users and service_role
DROP POLICY IF EXISTS policy_image_moderation_events_select ON public.image_moderation_events;
CREATE POLICY policy_image_moderation_events_select
  ON public.image_moderation_events
  FOR SELECT
  TO authenticated, service_role
  USING (true);

GRANT SELECT, INSERT ON public.image_moderation_events TO anon, authenticated, service_role;

-- 2. Community Moderation Hide Stored Procedure
-- SECURITY DEFINER allows any user or visitor to safely moderate a public creation,
-- immediately returning it to the creator's private library (is_public = false, visibility = 'private').
CREATE OR REPLACE FUNCTION public.fn_moderate_hide_community_image(
  p_asset_id text,
  p_moderator_id text DEFAULT NULL,
  p_reason text DEFAULT 'community_moderation'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_affected int := 0;
  v_user_id text;
  v_current_public boolean;
  v_current_visibility text;
BEGIN
  IF p_asset_id IS NULL OR length(trim(p_asset_id)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid asset identifier');
  END IF;

  -- 1. Verify existence of asset
  SELECT user_id, is_public, visibility
  INTO v_user_id, v_current_public, v_current_visibility
  FROM public.user_image_library
  WHERE id = p_asset_id;

  IF v_user_id IS NULL THEN
    -- May be a client-side showcase item or demo asset
    RETURN jsonb_build_object(
      'success', true,
      'action', 'hidden_client',
      'asset_id', p_asset_id,
      'note', 'Asset not in durable library table, hidden in client stream'
    );
  END IF;

  -- 2. Update to private in user_image_library
  UPDATE public.user_image_library
  SET is_public = false,
      visibility = 'private',
      updated_at = NOW()
  WHERE id = p_asset_id;

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  -- 3. Record audit entry
  INSERT INTO public.image_moderation_events (
    asset_id,
    moderator_id,
    action,
    reason,
    created_at
  ) VALUES (
    p_asset_id,
    COALESCE(p_moderator_id, 'anon_community_moderator'),
    'set_private',
    COALESCE(p_reason, 'community_hide'),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', 'set_private',
    'asset_id', p_asset_id,
    'owner_user_id', v_user_id,
    'affected_rows', v_affected
  );
END;
$$;

-- 3. Execution Grants for Moderation Function
GRANT EXECUTE ON FUNCTION public.fn_moderate_hide_community_image(text, text, text) TO anon, authenticated, service_role;
