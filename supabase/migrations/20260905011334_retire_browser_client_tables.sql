-- Retire persistence that existed only for the removed browser chat and image
-- studio experiences. Chat conversation/message persistence remains available
-- to authenticated inference clients.

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';

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
  v_etag := '"galx_sync_v54_' || v_signature || '"';

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

  RETURN v_result || jsonb_build_object(
    'notModified', false,
    'etag', v_etag,
    'multiSessionMessages', v_multi,
    'sinceEpochAcknowledged', p_since_epoch
  );
END;
$function$;

ALTER TABLE public.chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_persona_id_fkey;

-- Contract phase: clear the retired data and move the empty relations out of
-- the public/Data API schema. Keeping empty tombstones for one release makes
-- the schema move reversible without preserving the client maintenance surface.
DELETE FROM public.image_generations;
DELETE FROM public.custom_personas;

REVOKE ALL ON TABLE public.image_generations FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.custom_personas FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.image_generations SET SCHEMA private;
ALTER TABLE private.image_generations RENAME TO retired_image_generations;
ALTER TABLE public.custom_personas SET SCHEMA private;
ALTER TABLE private.custom_personas RENAME TO retired_custom_personas;
