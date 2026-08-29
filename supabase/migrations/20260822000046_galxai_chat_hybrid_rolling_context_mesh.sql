-- ============================================================================
-- GALXAI SUBSTRATE POSTGRESQL MIGRATION: V46
-- Sovereign Chat Hybrid Rolling Context & Long-Horizon Memory Mesh
-- Couples L1 In-Memory BroccoliDB with L2 Durable PostgreSQL Memory Blocks
-- Version: 46.0.0
-- ============================================================================

-- 1. CHAT ROLLING MEMORY DURABLE STORAGE TABLE
CREATE TABLE IF NOT EXISTS public.galx_chat_rolling_memory (
    conversation_id VARCHAR(64) PRIMARY KEY REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    summary_content TEXT NOT NULL,
    compacted_turns_count INT NOT NULL DEFAULT 0 CHECK (compacted_turns_count >= 0),
    last_compacted_message_id VARCHAR(64) DEFAULT NULL,
    pinned_document_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    token_count INT NOT NULL DEFAULT 0 CHECK (token_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_chat_rolling_mem_user 
    ON public.galx_chat_rolling_memory (user_id);

CREATE INDEX IF NOT EXISTS idx_galx_chat_rolling_mem_updated 
    ON public.galx_chat_rolling_memory (updated_at DESC);


-- 2. FUNCTION: ATOMIC UPSERT CHAT ROLLING MEMORY
CREATE OR REPLACE FUNCTION public.fn_upsert_chat_rolling_memory(
    p_conversation_id VARCHAR(64),
    p_user_id VARCHAR(255),
    p_summary_content TEXT,
    p_compacted_turns_count INT DEFAULT 0,
    p_last_compacted_message_id VARCHAR(64) DEFAULT NULL,
    p_pinned_doc_refs JSONB DEFAULT '[]'::jsonb,
    p_token_count INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
BEGIN
    INSERT INTO public.galx_chat_rolling_memory (
        conversation_id, user_id, summary_content, compacted_turns_count,
        last_compacted_message_id, pinned_document_refs, token_count, created_at, updated_at
    ) VALUES (
        p_conversation_id, p_user_id, p_summary_content, p_compacted_turns_count,
        p_last_compacted_message_id, COALESCE(p_pinned_doc_refs, '[]'::jsonb), p_token_count, v_now, v_now
    )
    ON CONFLICT (conversation_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        summary_content = EXCLUDED.summary_content,
        compacted_turns_count = EXCLUDED.compacted_turns_count,
        last_compacted_message_id = COALESCE(EXCLUDED.last_compacted_message_id, galx_chat_rolling_memory.last_compacted_message_id),
        pinned_document_refs = EXCLUDED.pinned_document_refs,
        token_count = EXCLUDED.token_count,
        updated_at = v_now;

    RETURN jsonb_build_object(
        'success', TRUE,
        'conversationId', p_conversation_id,
        'compactedTurnsCount', p_compacted_turns_count,
        'updatedAt', v_now
    );
END;
$$;


-- 3. FUNCTION: 1-HOP HYBRID ROLLING CONTEXT RESOLVER
-- In 1 single roundtrip, fetches active rolling memory + recent verbatim messages
CREATE OR REPLACE FUNCTION public.fn_get_hybrid_rolling_context(
    p_conversation_id VARCHAR(64),
    p_user_id VARCHAR(255) DEFAULT NULL,
    p_recent_buffer_count INT DEFAULT 8
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_memory JSONB := NULL;
    v_recent_messages JSONB := '[]'::jsonb;
    v_total_messages INT := 0;
BEGIN
    -- 1. Fetch active rolling memory block
    SELECT jsonb_build_object(
        'summaryContent', m.summary_content,
        'compactedTurnsCount', m.compacted_turns_count,
        'lastCompactedMessageId', m.last_compacted_message_id,
        'pinnedDocumentRefs', m.pinned_document_refs,
        'tokenCount', m.token_count,
        'updatedAt', EXTRACT(EPOCH FROM m.updated_at) * 1000
    ) INTO v_memory
    FROM public.galx_chat_rolling_memory m
    WHERE m.conversation_id = p_conversation_id
    LIMIT 1;

    -- 2. Count total messages in this conversation
    SELECT COUNT(*) INTO v_total_messages
    FROM public.chat_messages
    WHERE conversation_id = p_conversation_id;

    -- 3. Fetch the most recent N verbatim messages in chronological order
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', sub.id,
            'role', sub.role,
            'content', sub.content,
            'thinkingContent', sub.thinking_content,
            'modelId', sub.model_id,
            'personaId', sub.persona_id,
            'metrics', sub.metrics,
            'attachments', sub.attachments,
            'createdAt', EXTRACT(EPOCH FROM sub.created_at) * 1000
        ) ORDER BY sub.created_at ASC
    ), '[]'::jsonb) INTO v_recent_messages
    FROM (
        SELECT id, role, content, thinking_content, model_id, persona_id, metrics, attachments, created_at
        FROM public.chat_messages
        WHERE conversation_id = p_conversation_id
        ORDER BY created_at DESC
        LIMIT GREATEST(1, p_recent_buffer_count)
    ) sub;

    RETURN jsonb_build_object(
        'success', TRUE,
        'conversationId', p_conversation_id,
        'totalMessageCount', v_total_messages,
        'memory', v_memory,
        'recentMessages', v_recent_messages
    );
END;
$$;


-- 4. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.galx_chat_rolling_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat rolling memory" 
    ON public.galx_chat_rolling_memory
    FOR SELECT 
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own chat rolling memory" 
    ON public.galx_chat_rolling_memory
    FOR ALL 
    USING (auth.uid()::text = user_id);

CREATE POLICY "Service role full access on chat rolling memory" 
    ON public.galx_chat_rolling_memory
    FOR ALL 
    USING (auth.role() = 'service_role');
