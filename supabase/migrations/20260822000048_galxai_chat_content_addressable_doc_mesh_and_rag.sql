-- ============================================================================
-- GALXAI SUBSTRATE POSTGRESQL MIGRATION: V48
-- Sovereign Chat Content-Addressable Document Mesh, Semantic Search & Adaptive Context Apex
-- Version: 48.0.0
-- ============================================================================

-- 1. ADD CONTENT-ADDRESSABLE SHA-256 HASH & FULL-TEXT SEARCH TO DOCUMENT CHUNKS
ALTER TABLE public.galx_chat_document_chunks 
    ADD COLUMN IF NOT EXISTS doc_sha256 VARCHAR(64) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(document_name, '') || ' ' || coalesce(content, ''))
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_galx_chat_doc_chunks_sha 
    ON public.galx_chat_document_chunks (doc_sha256);

CREATE INDEX IF NOT EXISTS idx_galx_chat_doc_chunks_fts 
    ON public.galx_chat_document_chunks USING gin (search_vector);


-- 2. FUNCTION: ATOMIC RELEVANT DOCUMENT CHUNKS SEARCH (L2 FULL-TEXT RETRIEVAL)
CREATE OR REPLACE FUNCTION public.fn_search_relevant_document_chunks(
    p_conversation_id VARCHAR(64),
    p_query_text TEXT,
    p_limit INT DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_query_tsquery TSQUERY;
    v_results JSONB := '[]'::jsonb;
BEGIN
    IF p_query_text IS NULL OR TRIM(p_query_text) = '' THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Convert plain user prompt to websearch tsquery safely
    BEGIN
        v_query_tsquery := plainto_tsquery('english', p_query_text);
    EXCEPTION WHEN OTHERS THEN
        v_query_tsquery := NULL;
    END;

    IF v_query_tsquery IS NOT NULL THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'documentName', c.document_name,
                'chunkIndex', c.chunk_index,
                'pageStart', c.page_start,
                'pageEnd', c.page_end,
                'content', c.content,
                'tokenCount', c.token_count,
                'rank', ts_rank(c.search_vector, v_query_tsquery)
            ) ORDER BY ts_rank(c.search_vector, v_query_tsquery) DESC
        ), '[]'::jsonb) INTO v_results
        FROM public.galx_chat_document_chunks c
        WHERE c.conversation_id = p_conversation_id
          AND c.search_vector @@ v_query_tsquery
        LIMIT GREATEST(1, LEAST(10, p_limit));
    END IF;

    RETURN v_results;
END;
$$;


-- 3. FUNCTION: DEDUPLICATE & REGISTER DOCUMENT CHUNKS (CONTENT-ADDRESSABLE HASHING)
CREATE OR REPLACE FUNCTION public.fn_register_content_addressable_document(
    p_conversation_id VARCHAR(64),
    p_document_name VARCHAR(255),
    p_doc_sha256 VARCHAR(64),
    p_chunks JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing_count INT := 0;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Check if chunks with this SHA256 already exist for this conversation
    SELECT COUNT(*) INTO v_existing_count
    FROM public.galx_chat_document_chunks
    WHERE conversation_id = p_conversation_id AND doc_sha256 = p_doc_sha256;

    IF v_existing_count > 0 THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'deduplicated', TRUE,
            'existingChunksCount', v_existing_count,
            'docSha256', p_doc_sha256
        );
    END IF;

    -- Otherwise insert new chunks from JSON array
    IF p_chunks IS NOT NULL AND jsonb_array_length(p_chunks) > 0 THEN
        INSERT INTO public.galx_chat_document_chunks (
            id, conversation_id, document_name, chunk_index,
            page_start, page_end, content, token_count, doc_sha256, created_at
        )
        SELECT 
            COALESCE(elem->>'id', 'chk_' || replace(gen_random_uuid()::text, '-', '')),
            p_conversation_id,
            p_document_name,
            COALESCE((elem->>'chunkIndex')::INT, 0),
            COALESCE((elem->>'pageStart')::INT, 1),
            COALESCE((elem->>'pageEnd')::INT, 1),
            COALESCE(elem->>'content', ''),
            COALESCE((elem->>'tokenCount')::INT, 0),
            p_doc_sha256,
            v_now
        FROM jsonb_array_elements(p_chunks) AS elem
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'deduplicated', FALSE,
        'insertedCount', jsonb_array_length(p_chunks),
        'docSha256', p_doc_sha256
    );
END;
$$;
