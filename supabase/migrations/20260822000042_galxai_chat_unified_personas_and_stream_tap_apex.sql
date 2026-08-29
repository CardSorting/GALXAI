-- ============================================================================
-- GALXAI SUBSTRATE POSTGRESQL MIGRATION: V42
-- Unified Personas, Multi-Session Message Pools & Stream Tap Persistence Apex
-- ============================================================================

-- 1. ATOMIC DELTA SYNC WITH UNIFIED CUSTOM PERSONAS & MULTI-SESSION MESSAGE PRE-WARM
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
  v_personas JSONB := '[]'::jsonb;
  v_target_session_id TEXT := p_active_session_id;
  v_max_updated_at TIMESTAMPTZ;
  v_count INT;
  v_persona_count INT;
BEGIN
  -- 1. Compute lightweight state signature over conversations + custom personas
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

  -- Count custom personas
  SELECT COUNT(*) INTO v_persona_count
  FROM public.custom_personas
  WHERE p_user_id IS NULL OR user_id = p_user_id OR user_id IS NULL OR is_public = true;

  v_computed_etag := '"galx_sync_v42_' || v_count::text || '_' || v_persona_count::text || '_' || COALESCE(EXTRACT(EPOCH FROM v_max_updated_at)::bigint, 0)::text || '_' || SUBSTRING(v_state_signature FROM 1 FOR 8) || '"';

  -- 2. HTTP 304 Fast-Path Exit: If client ETag matches exactly, return 0-payload not modified!
  IF p_client_etag IS NOT NULL AND p_client_etag = v_computed_etag THEN
    RETURN jsonb_build_object(
      'success', true,
      'notModified', true,
      'etag', v_computed_etag
    );
  END IF;

  -- 3. Fetch active conversations
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

  -- 6. Fetch custom personas in the SAME single roundtrip query
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'tagline', p.tagline,
      'avatar', p.avatar,
      'greetingMessage', p.greeting_message,
      'systemPrompt', p.system_prompt,
      'baseModelId', p.base_model_id,
      'tags', p.tags,
      'category', p.category,
      'interactionCount', p.interaction_count,
      'isBuiltIn', p.is_builtin,
      'isPublic', p.is_public,
      'createdAt', EXTRACT(EPOCH FROM p.created_at) * 1000,
      'updatedAt', EXTRACT(EPOCH FROM p.updated_at) * 1000
    ) ORDER BY p.interaction_count DESC, p.created_at DESC
  ), '[]'::jsonb) INTO v_personas
  FROM public.custom_personas p
  WHERE p_user_id IS NULL 
     OR p.user_id = p_user_id 
     OR p.user_id IS NULL 
     OR p.is_public = true;

  RETURN jsonb_build_object(
    'success', true,
    'notModified', false,
    'etag', v_computed_etag,
    'sessions', v_sessions,
    'activeSessionId', v_target_session_id,
    'messages', v_active_messages,
    'personas', v_personas
  );
END;
$$;
