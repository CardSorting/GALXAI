-- ============================================================================
-- GALXAI SUBSTRATE POSTGRESQL MIGRATION: V41
-- Chat Delta Sync, Cryptographic ETag State Hashing, & Keyset Cursors
-- ============================================================================

-- 1. ADVANCED DELTA SYNC WITH CRYPTOGRAPHIC ETAG (HTTP 304 FAST-PATH)
CREATE OR REPLACE FUNCTION public.fn_get_chat_delta_sync(
  p_user_id TEXT DEFAULT NULL,
  p_client_etag TEXT DEFAULT NULL,
  p_since_epoch BIGINT DEFAULT NULL,
  p_active_session_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_state_signature TEXT;
  v_computed_etag TEXT;
  v_sessions JSONB;
  v_active_messages JSONB := '[]'::jsonb;
  v_target_session_id TEXT := p_active_session_id;
  v_max_updated_at TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- 1. Compute lightweight state signature over user's conversations
  SELECT 
    COUNT(*),
    MAX(c.updated_at),
    MD5(COALESCE(STRING_AGG(c.id || ':' || EXTRACT(EPOCH FROM c.updated_at)::text, ',' ORDER BY c.updated_at DESC), 'empty'))
  INTO v_count, v_max_updated_at, v_state_signature
  FROM public.chat_conversations c
  WHERE c.deleted_at IS NULL
    AND (
      p_user_id IS NULL 
      OR c.user_id = p_user_id 
      OR c.user_id IS NULL 
      OR c.user_id LIKE 'guest_%'
    );

  v_computed_etag := '"galx_sync_' || v_count::text || '_' || COALESCE(EXTRACT(EPOCH FROM v_max_updated_at)::bigint, 0)::text || '_' || SUBSTRING(v_state_signature FROM 1 FOR 8) || '"';

  -- 2. HTTP 304 Fast-Path Exit: If client ETag matches exactly, return 0-payload not modified!
  IF p_client_etag IS NOT NULL AND p_client_etag = v_computed_etag THEN
    RETURN jsonb_build_object(
      'success', true,
      'notModified', true,
      'etag', v_computed_etag
    );
  END IF;

  -- 3. Otherwise, fetch sessions (with optional keyset delta if p_since_epoch supplied)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'modelId', c.model_id,
      'personaId', c.persona_id,
      'isPinned', c.is_pinned,
      'isArchived', c.is_archived,
      'createdAt', EXTRACT(EPOCH FROM c.created_at) * 1000,
      'updatedAt', EXTRACT(EPOCH FROM c.updated_at) * 1000
    ) ORDER BY c.is_pinned DESC, c.updated_at DESC
  ), '[]'::jsonb) INTO v_sessions
  FROM public.chat_conversations c
  WHERE c.deleted_at IS NULL
    AND (
      p_user_id IS NULL 
      OR c.user_id = p_user_id 
      OR c.user_id IS NULL 
      OR c.user_id LIKE 'guest_%'
    )
    AND (
      p_since_epoch IS NULL 
      OR EXTRACT(EPOCH FROM c.updated_at) * 1000 > p_since_epoch
    );

  -- 4. Target session resolution
  IF v_target_session_id IS NULL AND jsonb_array_length(v_sessions) > 0 THEN
    v_target_session_id := (v_sessions->0->>'id');
  END IF;

  -- 5. Fetch active messages for the resolved session in 1 single roundtrip
  IF v_target_session_id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'role', m.role,
        'content', m.content,
        'alternativeContents', m.alternative_contents,
        'activeIndex', m.active_index,
        'thinkingContent', m.thinking_content,
        'modelId', m.model_id,
        'personaId', m.persona_id,
        'metrics', m.metrics,
        'attachments', m.attachments,
        'createdAt', EXTRACT(EPOCH FROM m.created_at) * 1000
      ) ORDER BY m.created_at ASC
    ), '[]'::jsonb) INTO v_active_messages
    FROM public.chat_messages m
    WHERE m.conversation_id = v_target_session_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'notModified', false,
    'etag', v_computed_etag,
    'sessions', v_sessions,
    'activeSessionId', v_target_session_id,
    'messages', v_active_messages
  );
END;
$$;
