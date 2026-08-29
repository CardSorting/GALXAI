-- ==========================================================================
-- GALXAI V53: Chat/context production hardening and distributed seat leases
-- Forward-only corrective migration for V39-V52.
-- ==========================================================================

-- The application authenticates with GALXAI credentials at the server boundary and
-- uses the service role for persistence. These tables are intentionally not a public
-- Supabase Data API. RLS remains forced as defense in depth.
DO $migration$
DECLARE
  v_table regclass;
  v_policy record;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'public.chat_conversations'::regclass,
    'public.chat_messages'::regclass,
    'public.galx_chat_rolling_memory'::regclass,
    'public.galx_chat_document_chunks'::regclass,
    'public.galx_chat_memory_graph_edges'::regclass,
    'public.galx_chat_context_episodes'::regclass,
    'public.galx_chat_universal_workspace_anchors'::regclass,
    'public.galx_seat_rolling_usage_events'::regclass,
    'public.galx_seat_rolling_windows_state'::regclass
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', v_table);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM anon, authenticated', v_table);
    EXECUTE format('GRANT ALL ON TABLE %s TO service_role', v_table);

    FOR v_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = (SELECT relname FROM pg_class WHERE oid = v_table)
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_policy.policyname, v_table);
    END LOOP;
  END LOOP;
END;
$migration$;

-- Existing duplicate rows came from conflict targets that could never match the
-- intended natural key. Retain the newest row per key before adding uniqueness.
DELETE FROM public.galx_chat_context_episodes older
USING public.galx_chat_context_episodes newer
WHERE older.conversation_id = newer.conversation_id
  AND older.episode_index = newer.episode_index
  AND (older.created_at, older.id) < (newer.created_at, newer.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_galx_chat_episode_natural_key
  ON public.galx_chat_context_episodes (conversation_id, episode_index);

DELETE FROM public.galx_chat_document_chunks older
USING public.galx_chat_document_chunks newer
WHERE older.conversation_id = newer.conversation_id
  AND older.doc_sha256 = newer.doc_sha256
  AND older.chunk_index = newer.chunk_index
  AND older.doc_sha256 IS NOT NULL
  AND (older.created_at, older.id) < (newer.created_at, newer.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_galx_chat_document_chunk_natural_key
  ON public.galx_chat_document_chunks (conversation_id, doc_sha256, chunk_index)
  WHERE doc_sha256 IS NOT NULL;

DELETE FROM public.galx_seat_rolling_usage_events older
USING public.galx_seat_rolling_usage_events newer
WHERE older.request_id = newer.request_id
  AND older.request_id IS NOT NULL
  AND (older.created_at, older.id) < (newer.created_at, newer.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_galx_seat_usage_request_id
  ON public.galx_seat_rolling_usage_events (request_id)
  WHERE request_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- Exact-owner chat persistence
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_upsert_owned_chat_messages(
  p_conversation_id TEXT,
  p_user_id TEXT,
  p_messages JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL OR NULLIF(btrim(p_conversation_id), '') IS NULL THEN
    RAISE EXCEPTION 'Authenticated user and conversation are required' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_messages) <> 'array' OR jsonb_array_length(p_messages) > 1000 THEN
    RAISE EXCEPTION 'Messages must be an array containing at most 1000 items' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE id = p_conversation_id AND user_id = p_user_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Chat conversation is not accessible' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_messages) element
    LEFT JOIN public.chat_messages message ON message.id = element->>'id'
    WHERE NULLIF(element->>'id', '') IS NULL
       OR COALESCE(element->>'role', '') NOT IN ('system', 'user', 'assistant')
       OR jsonb_typeof(element->'content') IS DISTINCT FROM 'string'
       OR (message.id IS NOT NULL AND message.conversation_id <> p_conversation_id)
  ) THEN
    RAISE EXCEPTION 'Invalid message or cross-conversation message identifier' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.chat_messages (
    id, conversation_id, role, content, alternative_contents, active_index,
    thinking_content, model_id, persona_id, metrics, attachments, created_at
  )
  SELECT
    item.id,
    p_conversation_id,
    item.role,
    item.content,
    COALESCE(item.alternative_contents, '[]'::jsonb),
    GREATEST(0, COALESCE(item.active_index, 0)),
    item.thinking_content,
    item.model_id,
    item.persona_id,
    item.metrics,
    item.attachments,
    COALESCE(item.created_at, to_timestamp(item.created_at_ms / 1000.0), now())
  FROM jsonb_to_recordset(p_messages) AS item(
    id TEXT,
    role TEXT,
    content TEXT,
    alternative_contents JSONB,
    active_index INTEGER,
    thinking_content TEXT,
    model_id TEXT,
    persona_id TEXT,
    metrics JSONB,
    attachments JSONB,
    created_at TIMESTAMPTZ,
    created_at_ms DOUBLE PRECISION
  )
  ON CONFLICT (id) DO UPDATE SET
    content = EXCLUDED.content,
    alternative_contents = EXCLUDED.alternative_contents,
    active_index = EXCLUDED.active_index,
    thinking_content = EXCLUDED.thinking_content,
    model_id = EXCLUDED.model_id,
    persona_id = EXCLUDED.persona_id,
    metrics = EXCLUDED.metrics,
    attachments = EXCLUDED.attachments
  WHERE chat_messages.conversation_id = EXCLUDED.conversation_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.chat_conversations
  SET updated_at = now()
  WHERE id = p_conversation_id AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'messagesSynced', v_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.galx_sync_chat_session(
  p_id TEXT,
  p_user_id TEXT,
  p_title TEXT,
  p_model_id TEXT,
  p_persona_id TEXT DEFAULT NULL,
  p_is_pinned BOOLEAN DEFAULT false,
  p_is_archived BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL OR NULLIF(btrim(p_id), '') IS NULL THEN
    RAISE EXCEPTION 'Authenticated user and session ID are required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.chat_conversations (
    id, user_id, title, model_id, persona_id, is_pinned, is_archived, updated_at
  ) VALUES (
    p_id, p_user_id, left(COALESCE(p_title, 'New conversation'), 200),
    p_model_id, p_persona_id, p_is_pinned, p_is_archived, now()
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    model_id = EXCLUDED.model_id,
    persona_id = EXCLUDED.persona_id,
    is_pinned = EXCLUDED.is_pinned,
    is_archived = EXCLUDED.is_archived,
    updated_at = now()
  WHERE chat_conversations.user_id = p_user_id;

  SELECT to_jsonb(conversation) INTO v_result
  FROM public.chat_conversations conversation
  WHERE conversation.id = p_id AND conversation.user_id = p_user_id;
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Chat session is not accessible' USING ERRCODE = '42501';
  END IF;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.galx_delete_chat_conversation(
  p_id TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_hard_delete BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '22023';
  END IF;
  IF p_hard_delete THEN
    DELETE FROM public.chat_conversations WHERE id = p_id AND user_id = p_user_id;
  ELSE
    UPDATE public.chat_conversations
    SET is_archived = true, deleted_at = now(), updated_at = now()
    WHERE id = p_id AND user_id = p_user_id;
  END IF;
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_chat_composite_bootstrap(
  p_user_id TEXT DEFAULT NULL,
  p_active_session_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_sessions JSONB := '[]'::jsonb;
  v_messages JSONB := '[]'::jsonb;
  v_active_id TEXT;
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', conversation.id,
    'title', conversation.title,
    'modelId', conversation.model_id,
    'personaId', conversation.persona_id,
    'isPinned', conversation.is_pinned,
    'isArchived', conversation.is_archived,
    'createdAt', extract(epoch FROM conversation.created_at) * 1000,
    'updatedAt', extract(epoch FROM conversation.updated_at) * 1000
  ) ORDER BY conversation.is_pinned DESC, conversation.updated_at DESC), '[]'::jsonb)
  INTO v_sessions
  FROM public.chat_conversations conversation
  WHERE conversation.user_id = p_user_id AND conversation.deleted_at IS NULL;

  SELECT conversation.id INTO v_active_id
  FROM public.chat_conversations conversation
  WHERE conversation.user_id = p_user_id
    AND conversation.deleted_at IS NULL
    AND (p_active_session_id IS NULL OR conversation.id = p_active_session_id)
  ORDER BY CASE WHEN conversation.id = p_active_session_id THEN 0 ELSE 1 END,
           conversation.is_pinned DESC,
           conversation.updated_at DESC
  LIMIT 1;

  IF v_active_id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', message.id,
      'role', message.role,
      'content', message.content,
      'alternativeContents', message.alternative_contents,
      'activeIndex', message.active_index,
      'thinkingContent', message.thinking_content,
      'modelId', message.model_id,
      'personaId', message.persona_id,
      'metrics', message.metrics,
      'attachments', message.attachments,
      'createdAt', extract(epoch FROM message.created_at) * 1000
    ) ORDER BY message.created_at, message.id), '[]'::jsonb)
    INTO v_messages
    FROM public.chat_messages message
    WHERE message.conversation_id = v_active_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'sessions', v_sessions,
    'activeSessionId', v_active_id,
    'messages', v_messages
  );
END;
$function$;

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
AS $function$
DECLARE
  v_session_id TEXT;
  v_messages_result JSONB := jsonb_build_object('messagesSynced', 0);
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '22023';
  END IF;
  IF p_delete_session_id IS NOT NULL AND p_session IS NOT NULL THEN
    RAISE EXCEPTION 'A bundle cannot update and delete a session together' USING ERRCODE = '22023';
  END IF;

  IF p_delete_session_id IS NOT NULL THEN
    DELETE FROM public.chat_conversations
    WHERE id = p_delete_session_id AND user_id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Chat session is not accessible' USING ERRCODE = '42501';
    END IF;
    RETURN jsonb_build_object('success', true, 'deleted', p_delete_session_id);
  END IF;

  IF p_session IS NOT NULL THEN
    v_session_id := NULLIF(p_session->>'id', '');
    PERFORM public.galx_sync_chat_session(
      v_session_id,
      p_user_id,
      COALESCE(p_session->>'title', 'New conversation'),
      COALESCE(p_session->>'modelId', 'gpt-5.6-sol'),
      NULLIF(p_session->>'personaId', ''),
      COALESCE((p_session->>'isPinned')::boolean, false),
      COALESCE((p_session->>'isArchived')::boolean, false)
    );
  END IF;

  IF p_messages IS NOT NULL AND jsonb_array_length(p_messages) > 0 THEN
    IF v_session_id IS NULL THEN
      RAISE EXCEPTION 'Session ID is required with messages' USING ERRCODE = '22023';
    END IF;
    v_messages_result := public.fn_upsert_owned_chat_messages(v_session_id, p_user_id, p_messages);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'sessionId', v_session_id,
    'messagesSynced', COALESCE((v_messages_result->>'messagesSynced')::integer, 0)
  );
END;
$function$;

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
AS $function$
DECLARE
  v_result JSONB;
  v_etag TEXT;
  v_signature TEXT;
  v_multi JSONB := '{}'::jsonb;
  v_personas JSONB := '[]'::jsonb;
  v_top_ids TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '22023';
  END IF;

  SELECT md5(concat_ws(':',
    count(DISTINCT conversation.id),
    COALESCE(max(conversation.updated_at)::text, ''),
    count(message.id),
    COALESCE(max(message.created_at)::text, '')
  )) INTO v_signature
  FROM public.chat_conversations conversation
  LEFT JOIN public.chat_messages message ON message.conversation_id = conversation.id
  WHERE conversation.user_id = p_user_id AND conversation.deleted_at IS NULL;
  v_etag := '"galx_sync_v53_' || v_signature || '"';

  IF p_client_etag = v_etag THEN
    RETURN jsonb_build_object('success', true, 'notModified', true, 'etag', v_etag);
  END IF;

  v_result := public.fn_get_chat_composite_bootstrap(p_user_id, p_active_session_id);

  SELECT COALESCE(array_agg(conversation.id ORDER BY conversation.is_pinned DESC, conversation.updated_at DESC), ARRAY[]::TEXT[])
  INTO v_top_ids
  FROM (
    SELECT owned.id, owned.is_pinned, owned.updated_at
    FROM public.chat_conversations owned
    WHERE owned.user_id = p_user_id AND owned.deleted_at IS NULL
    ORDER BY owned.is_pinned DESC, owned.updated_at DESC
    LIMIT 5
  ) conversation;

  SELECT COALESCE(jsonb_object_agg(grouped.conversation_id, grouped.messages), '{}'::jsonb)
  INTO v_multi
  FROM (
    SELECT message.conversation_id, jsonb_agg(jsonb_build_object(
      'id', message.id,
      'role', message.role,
      'content', message.content,
      'alternativeContents', message.alternative_contents,
      'activeIndex', message.active_index,
      'thinkingContent', message.thinking_content,
      'modelId', message.model_id,
      'personaId', message.persona_id,
      'metrics', message.metrics,
      'attachments', message.attachments,
      'createdAt', extract(epoch FROM message.created_at) * 1000
    ) ORDER BY message.created_at, message.id) AS messages
    FROM public.chat_messages message
    WHERE message.conversation_id = ANY(v_top_ids)
    GROUP BY message.conversation_id
  ) grouped;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', persona.id,
    'name', persona.name,
    'tagline', persona.tagline,
    'greetingMessage', persona.greeting_message,
    'systemPrompt', persona.system_prompt,
    'baseModelId', persona.base_model_id,
    'category', persona.anime_archetype,
    'interactionCount', persona.chat_count,
    'isBuiltIn', persona.is_built_in,
    'isPublic', persona.is_public,
    'createdAt', extract(epoch FROM persona.created_at) * 1000
  ) ORDER BY persona.chat_count DESC, persona.created_at DESC), '[]'::jsonb)
  INTO v_personas
  FROM public.custom_personas persona
  WHERE persona.user_id = p_user_id OR persona.is_public = true OR persona.is_built_in = true;

  RETURN v_result || jsonb_build_object(
    'notModified', false,
    'etag', v_etag,
    'multiSessionMessages', v_multi,
    'personas', v_personas,
    'sinceEpochAcknowledged', p_since_epoch
  );
END;
$function$;

-- --------------------------------------------------------------------------
-- Durable memory ownership and idempotency corrections
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_upsert_semantic_rolling_memory(
  p_conversation_id VARCHAR(64),
  p_user_id VARCHAR(255),
  p_summary_content TEXT,
  p_compacted_turns_count INT DEFAULT 0,
  p_last_compacted_message_id VARCHAR(64) DEFAULT NULL,
  p_user_profile JSONB DEFAULT '{}'::jsonb,
  p_active_decisions JSONB DEFAULT '[]'::jsonb,
  p_file_index JSONB DEFAULT '[]'::jsonb,
  p_pending_tasks JSONB DEFAULT '[]'::jsonb,
  p_token_count INT DEFAULT 0,
  p_cache_hash VARCHAR(64) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE id = p_conversation_id AND user_id = p_user_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Chat conversation is not accessible' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.galx_chat_rolling_memory (
    conversation_id, user_id, summary_content, compacted_turns_count,
    last_compacted_message_id, user_profile, active_decisions, file_index,
    pending_tasks, token_count, cache_hash, created_at, updated_at
  ) VALUES (
    p_conversation_id, p_user_id, p_summary_content, GREATEST(0, p_compacted_turns_count),
    p_last_compacted_message_id, COALESCE(p_user_profile, '{}'::jsonb),
    COALESCE(p_active_decisions, '[]'::jsonb), COALESCE(p_file_index, '[]'::jsonb),
    COALESCE(p_pending_tasks, '[]'::jsonb), GREATEST(0, p_token_count), p_cache_hash,
    now(), now()
  )
  ON CONFLICT (conversation_id) DO UPDATE SET
    summary_content = EXCLUDED.summary_content,
    compacted_turns_count = EXCLUDED.compacted_turns_count,
    last_compacted_message_id = COALESCE(EXCLUDED.last_compacted_message_id, galx_chat_rolling_memory.last_compacted_message_id),
    user_profile = EXCLUDED.user_profile,
    active_decisions = EXCLUDED.active_decisions,
    file_index = EXCLUDED.file_index,
    pending_tasks = EXCLUDED.pending_tasks,
    token_count = EXCLUDED.token_count,
    cache_hash = EXCLUDED.cache_hash,
    updated_at = now()
  WHERE galx_chat_rolling_memory.user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rolling memory is not accessible' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object('success', true, 'conversationId', p_conversation_id, 'cacheHash', p_cache_hash);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_upsert_semantic_rolling_memory_v2(
  p_conversation_id VARCHAR(64),
  p_user_id VARCHAR(255),
  p_summary_content TEXT,
  p_compacted_turns_count INT DEFAULT 0,
  p_last_compacted_message_id VARCHAR(64) DEFAULT NULL,
  p_user_profile JSONB DEFAULT '{}'::jsonb,
  p_active_decisions JSONB DEFAULT '[]'::jsonb,
  p_file_index JSONB DEFAULT '[]'::jsonb,
  p_pending_tasks JSONB DEFAULT '[]'::jsonb,
  p_token_count INT DEFAULT 0,
  p_cache_hash VARCHAR(64) DEFAULT NULL,
  p_stable_cache_hash VARCHAR(64) DEFAULT NULL,
  p_atomic_turn_boundary INT DEFAULT 0,
  p_code_diff_manifest JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  v_result := public.fn_upsert_semantic_rolling_memory(
    p_conversation_id, p_user_id, p_summary_content, p_compacted_turns_count,
    p_last_compacted_message_id, p_user_profile, p_active_decisions, p_file_index,
    p_pending_tasks, p_token_count, p_cache_hash
  );
  UPDATE public.galx_chat_rolling_memory
  SET stable_cache_hash = p_stable_cache_hash,
      atomic_turn_boundary = GREATEST(0, p_atomic_turn_boundary),
      code_diff_manifest = COALESCE(p_code_diff_manifest, '[]'::jsonb),
      updated_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rolling memory is not accessible' USING ERRCODE = '42501';
  END IF;
  RETURN v_result || jsonb_build_object('stableCacheHash', p_stable_cache_hash);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_search_relevant_document_chunks(
  p_conversation_id VARCHAR(64),
  p_query_text TEXT,
  p_limit INT DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_query TSQUERY;
  v_results JSONB := '[]'::jsonb;
BEGIN
  IF NULLIF(btrim(p_query_text), '') IS NULL THEN RETURN v_results; END IF;
  v_query := websearch_to_tsquery('english', left(p_query_text, 16000));

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ranked.id,
    'documentName', ranked.document_name,
    'chunkIndex', ranked.chunk_index,
    'pageStart', ranked.page_start,
    'pageEnd', ranked.page_end,
    'content', ranked.content,
    'tokenCount', ranked.token_count,
    'rank', ranked.rank
  ) ORDER BY ranked.rank DESC, ranked.chunk_index), '[]'::jsonb)
  INTO v_results
  FROM (
    SELECT chunk.*, ts_rank_cd(chunk.search_vector, v_query) AS rank
    FROM public.galx_chat_document_chunks chunk
    WHERE chunk.conversation_id = p_conversation_id
      AND chunk.search_vector @@ v_query
    ORDER BY rank DESC, chunk.chunk_index
    LIMIT GREATEST(1, LEAST(10, p_limit))
  ) ranked;
  RETURN v_results;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_upsert_context_episode(
  p_conversation_id VARCHAR(64),
  p_episode_index INT,
  p_start_turn_index INT,
  p_end_turn_index INT,
  p_thematic_topic VARCHAR(128),
  p_executive_summary TEXT,
  p_key_artifacts JSONB DEFAULT '[]'::jsonb,
  p_resolved_decisions JSONB DEFAULT '[]'::jsonb,
  p_token_volume INT DEFAULT 0,
  p_compressed_tokens INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_ratio NUMERIC(5,2) := 1.00;
BEGIN
  IF p_token_volume > 0 AND p_compressed_tokens > 0 THEN
    v_ratio := LEAST(999.99, round(p_token_volume::numeric / p_compressed_tokens::numeric, 2));
  END IF;
  INSERT INTO public.galx_chat_context_episodes (
    conversation_id, episode_index, start_turn_index, end_turn_index,
    thematic_topic, executive_summary, key_artifacts, resolved_decisions,
    token_volume, compressed_tokens, compression_ratio, created_at
  ) VALUES (
    p_conversation_id, p_episode_index, p_start_turn_index, p_end_turn_index,
    p_thematic_topic, p_executive_summary, COALESCE(p_key_artifacts, '[]'::jsonb),
    COALESCE(p_resolved_decisions, '[]'::jsonb), GREATEST(0, p_token_volume),
    GREATEST(0, p_compressed_tokens), v_ratio, now()
  )
  ON CONFLICT (conversation_id, episode_index) DO UPDATE SET
    start_turn_index = EXCLUDED.start_turn_index,
    end_turn_index = EXCLUDED.end_turn_index,
    thematic_topic = EXCLUDED.thematic_topic,
    executive_summary = EXCLUDED.executive_summary,
    key_artifacts = EXCLUDED.key_artifacts,
    resolved_decisions = EXCLUDED.resolved_decisions,
    token_volume = EXCLUDED.token_volume,
    compressed_tokens = EXCLUDED.compressed_tokens,
    compression_ratio = EXCLUDED.compression_ratio;
  RETURN jsonb_build_object('success', true, 'conversationId', p_conversation_id, 'episodeIndex', p_episode_index);
END;
$function$;

-- --------------------------------------------------------------------------
-- Expiring, idempotent, cross-instance seat request leases
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_seat_request_leases (
  request_id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  org_id VARCHAR(64) REFERENCES public.galx_organizations(id) ON DELETE SET NULL,
  model_id VARCHAR(128) NOT NULL,
  tier VARCHAR(32) NOT NULL CHECK (tier IN ('developer', 'small-business', 'enterprise', 'apex')),
  reserved_units NUMERIC(10,4) NOT NULL DEFAULT 1.0 CHECK (reserved_units > 0),
  actual_units NUMERIC(10,4),
  is_stream BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_galx_seat_lease_terminal_state CHECK (NOT (settled_at IS NOT NULL AND released_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_galx_seat_request_leases_active
  ON public.galx_seat_request_leases (user_id, expires_at)
  WHERE settled_at IS NULL AND released_at IS NULL;

ALTER TABLE public.galx_seat_request_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_seat_request_leases FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.galx_seat_request_leases FROM anon, authenticated;
GRANT ALL ON TABLE public.galx_seat_request_leases TO service_role;

DROP FUNCTION IF EXISTS public.fn_evaluate_and_acquire_seat_gate_v2(
  VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, NUMERIC, INTEGER
);

CREATE OR REPLACE FUNCTION public.fn_evaluate_and_acquire_seat_gate_v2(
  p_user_id VARCHAR(255),
  p_request_id VARCHAR(128),
  p_requested_model VARCHAR(128) DEFAULT 'gpt-5.6-sol',
  p_org_id VARCHAR(64) DEFAULT NULL,
  p_is_stream BOOLEAN DEFAULT true,
  p_reserved_units NUMERIC(10,4) DEFAULT 1.0,
  p_lease_ttl_seconds INTEGER DEFAULT 180,
  p_fallback_tier VARCHAR(32) DEFAULT 'developer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_tier VARCHAR(32) := 'developer';
  v_role VARCHAR(32) := 'developer';
  v_org_id VARCHAR(64);
  v_status VARCHAR(32);
  v_spend NUMERIC(14,6) := 0;
  v_cap NUMERIC(14,6) := 25;
  v_throttle VARCHAR(16) := 'hard';
  v_limit_5h NUMERIC(10,4) := 30;
  v_limit_week NUMERIC(10,4) := 200;
  v_concurrency_limit INTEGER := 20;
  v_used_5h NUMERIC(10,4) := 0;
  v_used_week NUMERIC(10,4) := 0;
  v_reserved_5h NUMERIC(10,4) := 0;
  v_reserved_week NUMERIC(10,4) := 0;
  v_active_streams INTEGER := 0;
  v_existing public.galx_seat_request_leases%ROWTYPE;
  v_model TEXT := lower(btrim(p_requested_model));
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL
     OR NULLIF(btrim(p_request_id), '') IS NULL
     OR p_reserved_units <= 0 THEN
    RAISE EXCEPTION 'User, request ID, and positive reserved units are required' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('galx-seat:' || p_user_id, 0));

  SELECT * INTO v_existing
  FROM public.galx_seat_request_leases
  WHERE request_id = p_request_id;
  IF FOUND THEN
    IF v_existing.user_id <> p_user_id THEN
      RAISE EXCEPTION 'Request identifier collision' USING ERRCODE = '42501';
    END IF;
    RETURN jsonb_build_object(
      'allowed', false,
      'rejectionCode', CASE
        WHEN v_existing.settled_at IS NOT NULL THEN 'request_already_settled'
        WHEN v_existing.released_at IS NOT NULL THEN 'request_already_released'
        ELSE 'request_in_progress'
      END,
      'idempotent', true,
      'requestId', p_request_id,
      'tier', v_existing.tier,
      'leaseExpiresAt', v_existing.expires_at
    );
  END IF;

  SELECT member.org_id, member.role, member.status, member.monthly_spend_usd,
         member.monthly_spend_cap_usd, member.throttle_mode, organization.tier
  INTO v_org_id, v_role, v_status, v_spend, v_cap, v_throttle, v_tier
  FROM public.galx_organization_members member
  JOIN public.galx_organizations organization ON organization.id = member.org_id
  WHERE member.user_id = p_user_id
    AND (p_org_id IS NULL OR member.org_id = p_org_id)
  ORDER BY member.updated_at DESC
  LIMIT 1;

  v_role := COALESCE(v_role, 'developer');
  v_spend := COALESCE(v_spend, 0);
  v_cap := COALESCE(v_cap, 25);
  v_throttle := COALESCE(v_throttle, 'hard');
  IF v_status IS NOT NULL AND v_status <> 'active' THEN
    RETURN jsonb_build_object('allowed', false, 'rejectionCode', 'seat_inactive', 'tier', v_tier);
  END IF;
  v_tier := COALESCE(
    v_tier,
    CASE WHEN p_fallback_tier IN ('developer', 'small-business', 'enterprise', 'apex')
      THEN p_fallback_tier ELSE 'developer' END
  );

  CASE v_tier
    WHEN 'apex' THEN v_limit_5h := 1500; v_limit_week := 25000; v_concurrency_limit := 500;
    WHEN 'enterprise' THEN v_limit_5h := 350; v_limit_week := 5000; v_concurrency_limit := 200;
    WHEN 'small-business' THEN v_limit_5h := 100; v_limit_week := 1000; v_concurrency_limit := 50;
    ELSE v_tier := 'developer'; v_limit_5h := 30; v_limit_week := 200; v_concurrency_limit := 20;
  END CASE;

  IF (v_tier = 'developer' AND (v_model LIKE '%terra%' OR v_model LIKE '%codex%' OR v_model LIKE '%image%'))
     OR (v_tier = 'small-business' AND v_model LIKE '%image%') THEN
    RETURN jsonb_build_object('allowed', false, 'rejectionCode', 'tier_model_restricted', 'tier', v_tier);
  END IF;
  IF v_throttle = 'hard' AND v_spend >= v_cap THEN
    RETURN jsonb_build_object('allowed', false, 'rejectionCode', 'seat_spend_cap_exceeded', 'tier', v_tier);
  END IF;

  SELECT COALESCE(sum(units) FILTER (WHERE created_at >= v_now - interval '5 hours'), 0),
         COALESCE(sum(units), 0)
  INTO v_used_5h, v_used_week
  FROM public.galx_seat_rolling_usage_events
  WHERE user_id = p_user_id AND created_at >= v_now - interval '7 days';

  SELECT COALESCE(sum(reserved_units) FILTER (WHERE created_at >= v_now - interval '5 hours'), 0),
         COALESCE(sum(reserved_units), 0),
         count(*) FILTER (WHERE is_stream)
  INTO v_reserved_5h, v_reserved_week, v_active_streams
  FROM public.galx_seat_request_leases
  WHERE user_id = p_user_id
    AND settled_at IS NULL
    AND released_at IS NULL
    AND expires_at > v_now;

  IF v_used_5h + v_reserved_5h + p_reserved_units > v_limit_5h THEN
    RETURN jsonb_build_object('allowed', false, 'rejectionCode', 'seat_5hour_limit_exceeded', 'tier', v_tier);
  END IF;
  IF v_used_week + v_reserved_week + p_reserved_units > v_limit_week THEN
    RETURN jsonb_build_object('allowed', false, 'rejectionCode', 'seat_weekly_limit_exceeded', 'tier', v_tier);
  END IF;
  IF p_is_stream AND v_active_streams >= v_concurrency_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'rejectionCode', 'seat_concurrency_limit_exceeded',
      'tier', v_tier,
      'activeStreams', v_active_streams,
      'concurrencyLimit', v_concurrency_limit
    );
  END IF;

  INSERT INTO public.galx_seat_request_leases (
    request_id, user_id, org_id, model_id, tier, reserved_units, is_stream, expires_at
  ) VALUES (
    p_request_id, p_user_id, v_org_id, p_requested_model, v_tier,
    p_reserved_units, p_is_stream,
    v_now + make_interval(secs => GREATEST(30, LEAST(900, p_lease_ttl_seconds)))
  );

  INSERT INTO public.galx_seat_rolling_windows_state (
    user_id, org_id, tier, active_concurrent_streams, concurrency_limit, updated_at
  ) VALUES (
    p_user_id, v_org_id, v_tier, v_active_streams + CASE WHEN p_is_stream THEN 1 ELSE 0 END,
    v_concurrency_limit, v_now
  )
  ON CONFLICT (user_id) DO UPDATE SET
    org_id = EXCLUDED.org_id,
    tier = EXCLUDED.tier,
    active_concurrent_streams = EXCLUDED.active_concurrent_streams,
    concurrency_limit = EXCLUDED.concurrency_limit,
    updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object(
    'allowed', true,
    'requestId', p_request_id,
    'tier', v_tier,
    'role', v_role,
    'concurrencySlotAcquired', p_is_stream,
    'activeStreams', v_active_streams + CASE WHEN p_is_stream THEN 1 ELSE 0 END,
    'concurrencyLimit', v_concurrency_limit,
    'leaseExpiresAt', v_now + make_interval(secs => GREATEST(30, LEAST(900, p_lease_ttl_seconds)))
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_settle_seat_request_lease_v2(
  p_user_id VARCHAR(255),
  p_request_id VARCHAR(128),
  p_model_id VARCHAR(128),
  p_tokens INTEGER DEFAULT 0,
  p_cost_usd NUMERIC(14,6) DEFAULT 0,
  p_units NUMERIC(10,4) DEFAULT NULL,
  p_conversation_id VARCHAR(64) DEFAULT NULL,
  p_user_message JSONB DEFAULT NULL,
  p_assistant_message JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_lease public.galx_seat_request_leases%ROWTYPE;
  v_units NUMERIC(10,4);
  v_message_rows JSONB := '[]'::jsonb;
  v_active INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('galx-seat:' || p_user_id, 0));
  SELECT * INTO v_lease
  FROM public.galx_seat_request_leases
  WHERE request_id = p_request_id AND user_id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seat request lease was not found' USING ERRCODE = '22023';
  END IF;
  IF v_lease.settled_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'settledAt', v_lease.settled_at);
  END IF;
  IF v_lease.released_at IS NOT NULL THEN
    RAISE EXCEPTION 'Seat request lease was already released' USING ERRCODE = '55000';
  END IF;

  v_units := GREATEST(0.01, COALESCE(p_units, v_lease.reserved_units));
  INSERT INTO public.galx_seat_rolling_usage_events (
    user_id, org_id, model_id, units, tokens_consumed, cost_usd, request_id, created_at
  ) VALUES (
    p_user_id, v_lease.org_id, p_model_id, v_units,
    GREATEST(0, p_tokens), GREATEST(0, p_cost_usd), p_request_id, now()
  ) ON CONFLICT (request_id) WHERE request_id IS NOT NULL DO NOTHING;

  IF p_conversation_id IS NOT NULL THEN
    IF p_user_message IS NOT NULL THEN v_message_rows := v_message_rows || jsonb_build_array(p_user_message); END IF;
    IF p_assistant_message IS NOT NULL THEN v_message_rows := v_message_rows || jsonb_build_array(p_assistant_message); END IF;
    IF jsonb_array_length(v_message_rows) > 0 THEN
      PERFORM public.fn_upsert_owned_chat_messages(p_conversation_id, p_user_id, v_message_rows);
    END IF;
  END IF;

  UPDATE public.galx_seat_request_leases
  SET settled_at = now(), actual_units = v_units
  WHERE request_id = p_request_id AND settled_at IS NULL AND released_at IS NULL;

  IF p_cost_usd > 0 THEN
    UPDATE public.galx_organization_members
    SET monthly_spend_usd = monthly_spend_usd + p_cost_usd,
        last_active_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id AND status = 'active';
  END IF;

  SELECT count(*) INTO v_active
  FROM public.galx_seat_request_leases
  WHERE user_id = p_user_id AND is_stream
    AND settled_at IS NULL AND released_at IS NULL AND expires_at > now();
  UPDATE public.galx_seat_rolling_windows_state
  SET active_concurrent_streams = v_active, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'requestId', p_request_id, 'settledAt', now());
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_release_seat_request_lease_v2(
  p_user_id VARCHAR(255),
  p_request_id VARCHAR(128)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_active INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('galx-seat:' || p_user_id, 0));
  UPDATE public.galx_seat_request_leases
  SET released_at = now()
  WHERE request_id = p_request_id AND user_id = p_user_id
    AND settled_at IS NULL AND released_at IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT count(*) INTO v_active
  FROM public.galx_seat_request_leases
  WHERE user_id = p_user_id AND is_stream
    AND settled_at IS NULL AND released_at IS NULL AND expires_at > now();
  UPDATE public.galx_seat_rolling_windows_state
  SET active_concurrent_streams = v_active, updated_at = now()
  WHERE user_id = p_user_id;
  RETURN true;
END;
$function$;

-- Revoke every internal SECURITY DEFINER overload by catalog identity, then grant
-- only the server-side service role. This also covers legacy signatures.
DO $privileges$
DECLARE
  v_function regprocedure;
BEGIN
  FOR v_function IN
    SELECT function.oid::regprocedure
    FROM pg_proc function
    JOIN pg_namespace namespace ON namespace.oid = function.pronamespace
    WHERE namespace.nspname = 'public'
      AND function.prosecdef
      AND function.proname = ANY (ARRAY[
        'galx_sync_chat_session',
        'galx_delete_chat_conversation',
        'fn_get_chat_composite_bootstrap',
        'fn_sync_chat_bundle',
        'fn_get_chat_delta_sync',
        'fn_get_chat_delta_sync_with_seat_telemetry',
        'fn_upsert_chat_rolling_memory',
        'fn_get_hybrid_rolling_context',
        'fn_upsert_semantic_rolling_memory',
        'fn_upsert_semantic_rolling_memory_v2',
        'fn_get_semantic_rolling_context',
        'fn_search_relevant_document_chunks',
        'fn_register_content_addressable_document',
        'fn_get_graph_linked_context',
        'fn_upsert_memory_graph_edges',
        'fn_get_atomic_rolling_context',
        'fn_upsert_context_episode',
        'fn_get_evolutionary_pyramid_context',
        'fn_get_zenith_universal_context',
        'fn_record_seat_rolling_usage',
        'fn_get_seat_rolling_telemetry',
        'fn_acquire_seat_concurrency_slot',
        'fn_release_seat_concurrency_slot',
        'fn_evaluate_and_acquire_seat_gate',
        'fn_settle_seat_stream_completion_composite',
        'fn_upsert_owned_chat_messages',
        'fn_evaluate_and_acquire_seat_gate_v2',
        'fn_settle_seat_request_lease_v2',
        'fn_release_seat_request_lease_v2'
      ])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_function);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_function);
  END LOOP;
END;
$privileges$;
