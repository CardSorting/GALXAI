-- ============================================================================
-- GALXAI SUBSTRATE POSTGRESQL MIGRATION: V47
-- Sovereign Chat Semantic Entity Memory, Document Chunking & Hybrid Cache Mesh Apex
-- Version: 47.0.0
-- ============================================================================

-- 1. CHAT DOCUMENT CHUNKS TABLE (For Multi-Thousand Page Document Thread Retrieval)
CREATE TABLE IF NOT EXISTS public.galx_chat_document_chunks (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('chk_' || replace(gen_random_uuid()::text, '-', '')),
    conversation_id VARCHAR(64) NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    chunk_index INT NOT NULL DEFAULT 0,
    page_start INT NOT NULL DEFAULT 1,
    page_end INT NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    token_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_chat_doc_chunks_conv 
    ON public.galx_chat_document_chunks (conversation_id, chunk_index ASC);


-- 2. ENHANCE CHAT ROLLING MEMORY WITH STRUCTURED SEMANTIC SLOTS
ALTER TABLE public.galx_chat_rolling_memory 
    ADD COLUMN IF NOT EXISTS user_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS active_decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS file_index JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS pending_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS cache_hash VARCHAR(64) DEFAULT NULL;


-- 3. FUNCTION: ATOMIC SEMANTIC UPSERT WITH CHUNK PERSISTENCE CTE
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
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
BEGIN
    INSERT INTO public.galx_chat_rolling_memory (
        conversation_id, user_id, summary_content, compacted_turns_count,
        last_compacted_message_id, user_profile, active_decisions, file_index,
        pending_tasks, token_count, cache_hash, created_at, updated_at
    ) VALUES (
        p_conversation_id, p_user_id, p_summary_content, p_compacted_turns_count,
        p_last_compacted_message_id, COALESCE(p_user_profile, '{}'::jsonb),
        COALESCE(p_active_decisions, '[]'::jsonb), COALESCE(p_file_index, '[]'::jsonb),
        COALESCE(p_pending_tasks, '[]'::jsonb), p_token_count, p_cache_hash, v_now, v_now
    )
    ON CONFLICT (conversation_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        summary_content = EXCLUDED.summary_content,
        compacted_turns_count = EXCLUDED.compacted_turns_count,
        last_compacted_message_id = COALESCE(EXCLUDED.last_compacted_message_id, galx_chat_rolling_memory.last_compacted_message_id),
        user_profile = EXCLUDED.user_profile,
        active_decisions = EXCLUDED.active_decisions,
        file_index = EXCLUDED.file_index,
        pending_tasks = EXCLUDED.pending_tasks,
        token_count = EXCLUDED.token_count,
        cache_hash = EXCLUDED.cache_hash,
        updated_at = v_now;

    RETURN jsonb_build_object(
        'success', TRUE,
        'conversationId', p_conversation_id,
        'compactedTurnsCount', p_compacted_turns_count,
        'cacheHash', p_cache_hash,
        'updatedAt', v_now
    );
END;
$$;


-- 4. FUNCTION: 1-HOP COMPREHENSIVE SEMANTIC ROLLING CONTEXT RESOLVER
CREATE OR REPLACE FUNCTION public.fn_get_semantic_rolling_context(
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
    v_doc_chunks JSONB := '[]'::jsonb;
    v_total_messages INT := 0;
BEGIN
    -- 1. Fetch structured semantic memory block
    SELECT jsonb_build_object(
        'summaryContent', m.summary_content,
        'compactedTurnsCount', m.compacted_turns_count,
        'lastCompactedMessageId', m.last_compacted_message_id,
        'userProfile', m.user_profile,
        'activeDecisions', m.active_decisions,
        'fileIndex', m.file_index,
        'pendingTasks', m.pending_tasks,
        'tokenCount', m.token_count,
        'cacheHash', m.cache_hash,
        'updatedAt', EXTRACT(EPOCH FROM m.updated_at) * 1000
    ) INTO v_memory
    FROM public.galx_chat_rolling_memory m
    WHERE m.conversation_id = p_conversation_id
    LIMIT 1;

    -- 2. Count total messages
    SELECT COUNT(*) INTO v_total_messages
    FROM public.chat_messages
    WHERE conversation_id = p_conversation_id;

    -- 3. Fetch recent verbatim messages in chronological order
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

    -- 4. Fetch active pinned document chunk outlines
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'documentName', c.document_name,
            'chunkIndex', c.chunk_index,
            'pageStart', c.page_start,
            'pageEnd', c.page_end,
            'tokenCount', c.token_count
        ) ORDER BY c.chunk_index ASC
    ), '[]'::jsonb) INTO v_doc_chunks
    FROM public.galx_chat_document_chunks c
    WHERE c.conversation_id = p_conversation_id
    LIMIT 50;

    RETURN jsonb_build_object(
        'success', TRUE,
        'conversationId', p_conversation_id,
        'totalMessageCount', v_total_messages,
        'memory', v_memory,
        'docChunks', v_doc_chunks,
        'recentMessages', v_recent_messages
    );
END;
$$;


-- 5. RLS POLICIES FOR DOCUMENT CHUNKS
ALTER TABLE public.galx_chat_document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation document chunks" 
    ON public.galx_chat_document_chunks
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_conversations c 
            WHERE c.id = galx_chat_document_chunks.conversation_id 
              AND (auth.uid()::text = c.user_id OR c.user_id IS NULL)
        )
    );

CREATE POLICY "Service role full access on document chunks" 
    ON public.galx_chat_document_chunks
    FOR ALL 
    USING (auth.role() = 'service_role');
