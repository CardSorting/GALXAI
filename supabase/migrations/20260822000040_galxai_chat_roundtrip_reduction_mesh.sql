-- ============================================================================
-- GALXAI SUBSTRATE POSTGRESQL MIGRATION: V40
-- Chat Roundtrip Reduction Apex Mesh (1-Hop Bootstrap & Atomic Bundle Flush)
-- ============================================================================

-- 1. ATOMIC CHAT COMPOSITE BOOTSTRAP (1-HOP DASHBOARD & CHAT HYDRATION)
CREATE OR REPLACE FUNCTION public.fn_get_chat_composite_bootstrap(
  p_user_id TEXT DEFAULT NULL,
  p_active_session_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sessions JSONB;
  v_active_messages JSONB := '[]'::jsonb;
  v_target_session_id TEXT := p_active_session_id;
BEGIN
  -- 1. Fetch active conversations for user / guest, ordered by pin status and updatedAt
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
    );

  -- 2. If no target session specified, select the first available conversation
  IF v_target_session_id IS NULL AND jsonb_array_length(v_sessions) > 0 THEN
    v_target_session_id := (v_sessions->0->>'id');
  END IF;

  -- 3. Fetch active messages for the resolved target conversation in the SAME roundtrip
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
    'sessions', v_sessions,
    'activeSessionId', v_target_session_id,
    'messages', v_active_messages
  );
END;
$$;

-- 2. ATOMIC BUNDLE SYNC (1-HOP SESSION + MESSAGES BATCH UPSERT)
CREATE OR REPLACE FUNCTION public.fn_sync_chat_bundle(
  p_session JSONB DEFAULT NULL,
  p_messages JSONB DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL,
  p_delete_session_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session_id TEXT;
  v_title TEXT;
  v_model_id TEXT;
  v_persona_id TEXT;
  v_is_pinned BOOLEAN;
  v_is_archived BOOLEAN;
  v_msg_count INT := 0;
BEGIN
  -- Handle session deletion if requested
  IF p_delete_session_id IS NOT NULL THEN
    DELETE FROM public.chat_conversations
    WHERE id = p_delete_session_id
      AND (p_user_id IS NULL OR user_id = p_user_id OR user_id IS NULL OR user_id LIKE 'guest_%');
    RETURN jsonb_build_object('success', true, 'deleted', p_delete_session_id);
  END IF;

  -- 1. Upsert session if present
  IF p_session IS NOT NULL AND p_session->>'id' IS NOT NULL THEN
    v_session_id := p_session->>'id';
    v_title := COALESCE(p_session->>'title', 'New conversation');
    v_model_id := COALESCE(p_session->>'modelId', 'gpt-5.6-sol');
    v_persona_id := p_session->>'personaId';
    v_is_pinned := COALESCE((p_session->>'isPinned')::boolean, false);
    v_is_archived := COALESCE((p_session->>'isArchived')::boolean, false);

    INSERT INTO public.chat_conversations (
      id, user_id, title, model_id, persona_id, is_pinned, is_archived, updated_at
    ) VALUES (
      v_session_id, p_user_id, v_title, v_model_id, v_persona_id, v_is_pinned, v_is_archived, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      model_id = EXCLUDED.model_id,
      persona_id = COALESCE(EXCLUDED.persona_id, chat_conversations.persona_id),
      is_pinned = EXCLUDED.is_pinned,
      is_archived = EXCLUDED.is_archived,
      updated_at = NOW()
    WHERE chat_conversations.id = v_session_id;
  END IF;

  -- 2. Upsert array of messages in a single batch statement
  IF p_messages IS NOT NULL AND jsonb_array_length(p_messages) > 0 THEN
    v_session_id := COALESCE(v_session_id, p_messages->0->>'sessionId', p_messages->0->>'conversationId');

    IF v_session_id IS NOT NULL THEN
      INSERT INTO public.chat_messages (
        id, conversation_id, role, content, alternative_contents, active_index,
        thinking_content, model_id, persona_id, metrics, attachments, created_at
      )
      SELECT
        x.id,
        v_session_id,
        x.role,
        x.content,
        COALESCE(x.alternative_contents, '[]'::jsonb),
        COALESCE(x.active_index, 0),
        x.thinking_content,
        x.model_id,
        x.persona_id,
        x.metrics,
        x.attachments,
        COALESCE(to_timestamp((x.created_at_ms / 1000.0)), NOW())
      FROM jsonb_to_recordset(p_messages) AS x(
        id TEXT,
        role TEXT,
        content TEXT,
        alternative_contents JSONB,
        active_index INT,
        thinking_content TEXT,
        model_id TEXT,
        persona_id TEXT,
        metrics JSONB,
        attachments JSONB,
        created_at_ms DOUBLE PRECISION
      )
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        alternative_contents = EXCLUDED.alternative_contents,
        active_index = EXCLUDED.active_index,
        thinking_content = EXCLUDED.thinking_content,
        metrics = EXCLUDED.metrics,
        attachments = EXCLUDED.attachments;

      GET DIAGNOSTICS v_msg_count = ROW_COUNT;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'sessionId', v_session_id,
    'messagesSynced', v_msg_count
  );
END;
$$;
