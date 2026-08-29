-- ============================================================================
-- GALXAI SUBSTRATE POSTGRESQL MIGRATION: V52
-- Sovereign Chat Zenith Universal Pass, Cross-Session Anchors & Hardware Cache Mesh
-- Version: 52.0.0
-- ============================================================================

-- 1. UNIVERSAL WORKSPACE ANCHORS TABLE (Shared Team Architecture & Schemas)
CREATE TABLE IF NOT EXISTS public.galx_chat_universal_workspace_anchors (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('anchor_' || replace(gen_random_uuid()::text, '-', '')),
    workspace_id VARCHAR(64) NOT NULL DEFAULT 'default_workspace',
    anchor_type VARCHAR(64) NOT NULL DEFAULT 'architectural_schema', -- 'architectural_schema', 'global_rule', 'sovereign_policy'
    anchor_key VARCHAR(128) NOT NULL,
    anchor_content TEXT NOT NULL,
    token_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workspace_anchor_key UNIQUE (workspace_id, anchor_key)
);

CREATE INDEX IF NOT EXISTS idx_galx_chat_workspace_anchors 
    ON public.galx_chat_universal_workspace_anchors (workspace_id);


-- 2. FUNCTION: ATOMIC 1-HOP ZENITH UNIVERSAL CONTEXT RESOLVER
CREATE OR REPLACE FUNCTION public.fn_get_zenith_universal_context(
    p_conversation_id VARCHAR(64),
    p_workspace_id VARCHAR(64) DEFAULT 'default_workspace',
    p_recent_turn_count INT DEFAULT 8
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_workspace_anchors JSONB := '[]'::jsonb;
    v_episodes JSONB := '[]'::jsonb;
    v_memory JSONB := NULL;
    v_recent_messages JSONB := '[]'::jsonb;
    v_total_messages INT := 0;
BEGIN
    -- 1. Fetch active workspace anchors (shared team context)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'anchorKey', a.anchor_key,
            'anchorType', a.anchor_type,
            'content', a.anchor_content,
            'tokenCount', a.token_count
        ) ORDER BY a.created_at ASC
    ), '[]'::jsonb) INTO v_workspace_anchors
    FROM public.galx_chat_universal_workspace_anchors a
    WHERE a.workspace_id = p_workspace_id
    LIMIT 20;

    -- 2. Fetch thematic episodes
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', e.id,
            'episodeIndex', e.episode_index,
            'startTurn', e.start_turn_index,
            'endTurn', e.end_turn_index,
            'topic', e.thematic_topic,
            'summary', e.executive_summary,
            'compressionRatio', e.compression_ratio
        ) ORDER BY e.episode_index ASC
    ), '[]'::jsonb) INTO v_episodes
    FROM public.galx_chat_context_episodes e
    WHERE e.conversation_id = p_conversation_id
    LIMIT 10;

    -- 3. Fetch root rolling memory state
    SELECT jsonb_build_object(
        'summaryContent', m.summary_content,
        'compactedTurnsCount', m.compacted_turns_count,
        'stableCacheHash', m.stable_cache_hash,
        'userProfile', m.user_profile,
        'activeDecisions', m.active_decisions,
        'fileIndex', m.file_index,
        'pendingTasks', m.pending_tasks,
        'tokenCount', m.token_count
    ) INTO v_memory
    FROM public.galx_chat_rolling_memory m
    WHERE m.conversation_id = p_conversation_id
    LIMIT 1;

    -- 4. Fetch recent messages
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
        LIMIT GREATEST(1, p_recent_turn_count)
    ) sub;

    SELECT COUNT(*) INTO v_total_messages
    FROM public.chat_messages
    WHERE conversation_id = p_conversation_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'conversationId', p_conversation_id,
        'workspaceId', p_workspace_id,
        'totalMessageCount', v_total_messages,
        'workspaceAnchors', v_workspace_anchors,
        'episodes', v_episodes,
        'memory', v_memory,
        'recentMessages', v_recent_messages
    );
END;
$$;


-- 3. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.galx_chat_universal_workspace_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace anchors" 
    ON public.galx_chat_universal_workspace_anchors
    FOR SELECT 
    USING (TRUE);

CREATE POLICY "Service role full access on workspace anchors" 
    ON public.galx_chat_universal_workspace_anchors
    FOR ALL 
    USING (auth.role() = 'service_role');
