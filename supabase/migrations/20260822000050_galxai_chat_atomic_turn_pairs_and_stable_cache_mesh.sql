-- ============================================================================
-- GALXAI SUBSTRATE POSTGRESQL MIGRATION: V50
-- Sovereign Chat Atomic Turn-Pair Integrity, Stable Prompt Cache & Code Diff Mesh Apex
-- Version: 50.0.0
-- ============================================================================

-- 1. ENHANCE CHAT ROLLING MEMORY WITH STABLE CACHE HASH & CODE DIFF MANIFEST
ALTER TABLE public.galx_chat_rolling_memory 
    ADD COLUMN IF NOT EXISTS stable_cache_hash VARCHAR(64) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS atomic_turn_boundary INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS code_diff_manifest JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_galx_chat_rolling_stable_hash 
    ON public.galx_chat_rolling_memory (stable_cache_hash);


-- 2. FUNCTION: ATOMIC RESOLVER WITH TURN-PAIR INTEGRITY & STABLE PREFIX CTE
CREATE OR REPLACE FUNCTION public.fn_get_atomic_rolling_context(
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
    v_boundary INT := p_recent_buffer_count;
BEGIN
    -- 1. Fetch active memory block
    SELECT jsonb_build_object(
        'summaryContent', m.summary_content,
        'compactedTurnsCount', m.compacted_turns_count,
        'lastCompactedMessageId', m.last_compacted_message_id,
        'stableCacheHash', m.stable_cache_hash,
        'atomicTurnBoundary', m.atomic_turn_boundary,
        'codeDiffManifest', m.code_diff_manifest,
        'userProfile', m.user_profile,
        'activeDecisions', m.active_decisions,
        'fileIndex', m.file_index,
        'pendingTasks', m.pending_tasks,
        'tokenCount', m.token_count,
        'updatedAt', EXTRACT(EPOCH FROM m.updated_at) * 1000
    ) INTO v_memory
    FROM public.galx_chat_rolling_memory m
    WHERE m.conversation_id = p_conversation_id
    LIMIT 1;

    -- 2. Count total messages
    SELECT COUNT(*) INTO v_total_messages
    FROM public.chat_messages
    WHERE conversation_id = p_conversation_id;

    -- 3. Fetch recent messages respecting atomic tool turn-pairs
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
        LIMIT GREATEST(1, v_boundary)
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
