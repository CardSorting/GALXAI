-- ============================================================================
-- GALXAI SUBSTRATE POSTGRESQL MIGRATION: V49
-- Sovereign Chat Temporal Entity Graph, Recursive Memory CTE & 4-Block Cache Mesh Apex
-- Version: 49.0.0
-- ============================================================================

-- 1. CHAT MEMORY GRAPH EDGES TABLE (Temporal Knowledge & Decision Graph)
CREATE TABLE IF NOT EXISTS public.galx_chat_memory_graph_edges (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('edge_' || replace(gen_random_uuid()::text, '-', '')),
    conversation_id VARCHAR(64) NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    source_entity VARCHAR(128) NOT NULL,
    relation_type VARCHAR(64) NOT NULL DEFAULT 'relates_to', -- 'depends_on', 'fixes', 'configures', 'replaces', 'references'
    target_entity VARCHAR(128) NOT NULL,
    turn_index INT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_chat_graph_conv 
    ON public.galx_chat_memory_graph_edges (conversation_id, source_entity);

CREATE INDEX IF NOT EXISTS idx_galx_chat_graph_target 
    ON public.galx_chat_memory_graph_edges (conversation_id, target_entity);


-- 2. FUNCTION: RECURSIVE CTE GRAPH CONTEXT TRAVERSAL (1-HOP KNOWLEDGE RESOLUTION)
-- Recursively traverses entity links (depth <= 2) to resolve connected decisions and files in 1 single roundtrip!
CREATE OR REPLACE FUNCTION public.fn_get_graph_linked_context(
    p_conversation_id VARCHAR(64),
    p_query_entities TEXT[],
    p_max_depth INT DEFAULT 2
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_results JSONB := '[]'::jsonb;
BEGIN
    IF p_query_entities IS NULL OR array_length(p_query_entities, 1) IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    WITH RECURSIVE memory_graph_cte AS (
        -- Base Case: direct edges matching queried entity names (case-insensitive)
        SELECT 
            e.id,
            e.source_entity,
            e.relation_type,
            e.target_entity,
            e.turn_index,
            e.metadata,
            1 AS depth,
            ARRAY[e.id] AS path
        FROM public.galx_chat_memory_graph_edges e
        WHERE e.conversation_id = p_conversation_id
          AND (
            LOWER(e.source_entity) = ANY(SELECT LOWER(x) FROM unnest(p_query_entities) AS x)
            OR LOWER(e.target_entity) = ANY(SELECT LOWER(x) FROM unnest(p_query_entities) AS x)
          )

        UNION ALL

        -- Recursive Step: traverse connected edges up to max_depth
        SELECT 
            e.id,
            e.source_entity,
            e.relation_type,
            e.target_entity,
            e.turn_index,
            e.metadata,
            cte.depth + 1,
            cte.path || e.id
        FROM public.galx_chat_memory_graph_edges e
        JOIN memory_graph_cte cte 
          ON (e.source_entity = cte.target_entity OR e.target_entity = cte.source_entity)
        WHERE e.conversation_id = p_conversation_id
          AND cte.depth < GREATEST(1, LEAST(3, p_max_depth))
          AND NOT (e.id = ANY(cte.path)) -- prevent cycles
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'sourceEntity', source_entity,
            'relationType', relation_type,
            'targetEntity', target_entity,
            'turnIndex', turn_index,
            'depth', depth,
            'metadata', metadata
        )
    ), '[]'::jsonb) INTO v_results
    FROM memory_graph_cte;

    RETURN v_results;
END;
$$;


-- 3. FUNCTION: BATCH UPSERT GRAPH EDGES CTE
CREATE OR REPLACE FUNCTION public.fn_upsert_memory_graph_edges(
    p_conversation_id VARCHAR(64),
    p_edges JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inserted INT := 0;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    IF p_edges IS NOT NULL AND jsonb_array_length(p_edges) > 0 THEN
        INSERT INTO public.galx_chat_memory_graph_edges (
            id, conversation_id, source_entity, relation_type,
            target_entity, turn_index, metadata, created_at
        )
        SELECT 
            COALESCE(elem->>'id', 'edge_' || replace(gen_random_uuid()::text, '-', '')),
            p_conversation_id,
            COALESCE(elem->>'sourceEntity', 'unknown_source'),
            COALESCE(elem->>'relationType', 'relates_to'),
            COALESCE(elem->>'targetEntity', 'unknown_target'),
            COALESCE((elem->>'turnIndex')::INT, 0),
            COALESCE(elem->'metadata', '{}'::jsonb),
            v_now
        FROM jsonb_array_elements(p_edges) AS elem
        ON CONFLICT (id) DO NOTHING;

        GET DIAGNOSTICS v_inserted = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'conversationId', p_conversation_id,
        'insertedEdgesCount', v_inserted
    );
END;
$$;


-- 4. ROW LEVEL SECURITY POLICIES FOR GRAPH EDGES
ALTER TABLE public.galx_chat_memory_graph_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation memory graph edges" 
    ON public.galx_chat_memory_graph_edges
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_conversations c 
            WHERE c.id = galx_chat_memory_graph_edges.conversation_id 
              AND (auth.uid()::text = c.user_id OR c.user_id IS NULL)
        )
    );

CREATE POLICY "Service role full access on memory graph edges" 
    ON public.galx_chat_memory_graph_edges
    FOR ALL 
    USING (auth.role() = 'service_role');
