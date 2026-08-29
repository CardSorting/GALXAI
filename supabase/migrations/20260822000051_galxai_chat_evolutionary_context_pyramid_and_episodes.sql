-- ============================================================================
-- GALXAI SUBSTRATE POSTGRESQL MIGRATION: V51
-- Sovereign Chat Evolutionary Context Pyramid, Episodic Memory & Reciprocal Rank Fusion Apex
-- Version: 51.0.0
-- ============================================================================

-- 1. CHAT CONTEXT EPISODES TABLE (Hierarchical Multi-Resolution Episodic Memory)
CREATE TABLE IF NOT EXISTS public.galx_chat_context_episodes (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('ep_' || replace(gen_random_uuid()::text, '-', '')),
    conversation_id VARCHAR(64) NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    episode_index INT NOT NULL DEFAULT 0,
    start_turn_index INT NOT NULL DEFAULT 0,
    end_turn_index INT NOT NULL DEFAULT 0,
    thematic_topic VARCHAR(128) NOT NULL DEFAULT 'General Objective',
    executive_summary TEXT NOT NULL,
    key_artifacts JSONB NOT NULL DEFAULT '[]'::jsonb,
    resolved_decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
    token_volume INT NOT NULL DEFAULT 0,
    compressed_tokens INT NOT NULL DEFAULT 0,
    compression_ratio NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_chat_episodes_conv 
    ON public.galx_chat_context_episodes (conversation_id, episode_index ASC);


-- 2. FUNCTION: ATOMIC EPISODE UPSERT CTE
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
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_ratio NUMERIC(5,2) := 1.00;
BEGIN
    IF p_token_volume > 0 AND p_compressed_tokens > 0 THEN
        v_ratio := ROUND((p_token_volume::numeric / p_compressed_tokens::numeric), 2);
    END IF;

    INSERT INTO public.galx_chat_context_episodes (
        conversation_id, episode_index, start_turn_index, end_turn_index,
        thematic_topic, executive_summary, key_artifacts, resolved_decisions,
        token_volume, compressed_tokens, compression_ratio, created_at
    ) VALUES (
        p_conversation_id, p_episode_index, p_start_turn_index, p_end_turn_index,
        p_thematic_topic, p_executive_summary, COALESCE(p_key_artifacts, '[]'::jsonb),
        COALESCE(p_resolved_decisions, '[]'::jsonb), p_token_volume, p_compressed_tokens,
        v_ratio, v_now
    )
    ON CONFLICT (id) DO UPDATE SET
        thematic_topic = EXCLUDED.thematic_topic,
        executive_summary = EXCLUDED.executive_summary,
        key_artifacts = EXCLUDED.key_artifacts,
        resolved_decisions = EXCLUDED.resolved_decisions,
        token_volume = EXCLUDED.token_volume,
        compressed_tokens = EXCLUDED.compressed_tokens,
        compression_ratio = v_ratio;

    RETURN jsonb_build_object(
        'success', TRUE,
        'conversationId', p_conversation_id,
        'episodeIndex', p_episode_index,
        'compressionRatio', v_ratio
    );
END;
$$;


-- 3. FUNCTION: 1-HOP EVOLUTIONARY PYRAMID CONTEXT RESOLVER
CREATE OR REPLACE FUNCTION public.fn_get_evolutionary_pyramid_context(
    p_conversation_id VARCHAR(64),
    p_recent_turn_count INT DEFAULT 8,
    p_max_episodes INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_episodes JSONB := '[]'::jsonb;
    v_memory JSONB := NULL;
    v_recent_messages JSONB := '[]'::jsonb;
    v_total_messages INT := 0;
BEGIN
    -- 1. Fetch persistent hierarchical episodes in chronological order
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', e.id,
            'episodeIndex', e.episode_index,
            'startTurn', e.start_turn_index,
            'endTurn', e.end_turn_index,
            'topic', e.thematic_topic,
            'summary', e.executive_summary,
            'artifacts', e.key_artifacts,
            'decisions', e.resolved_decisions,
            'compressionRatio', e.compression_ratio
        ) ORDER BY e.episode_index ASC
    ), '[]'::jsonb) INTO v_episodes
    FROM (
        SELECT id, episode_index, start_turn_index, end_turn_index, thematic_topic, 
               executive_summary, key_artifacts, resolved_decisions, compression_ratio
        FROM public.galx_chat_context_episodes
        WHERE conversation_id = p_conversation_id
        ORDER BY episode_index ASC
        LIMIT LEAST(50, GREATEST(1, p_max_episodes))
    ) e;

    -- 2. Fetch root rolling memory state
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

    -- 3. Fetch recent verbatim messages
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
        'totalMessageCount', v_total_messages,
        'episodes', v_episodes,
        'memory', v_memory,
        'recentMessages', v_recent_messages
    );
END;
$$;


-- 4. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.galx_chat_context_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation episodes" 
    ON public.galx_chat_context_episodes
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_conversations c 
            WHERE c.id = galx_chat_context_episodes.conversation_id 
              AND (auth.uid()::text = c.user_id OR c.user_id IS NULL)
        )
    );

CREATE POLICY "Service role full access on context episodes" 
    ON public.galx_chat_context_episodes
    FOR ALL 
    USING (auth.role() = 'service_role');
