-- ============================================================================
-- GALXAI: Apex PostgreSQL & Zero-Egress Cloudflare Edge Substrate Migration
-- Migration: 20260822000002_galxai_schema_apex.sql
-- Version: 3.1.0
-- ============================================================================

-- 1. APEX ENUMS
DO $$ BEGIN
    CREATE TYPE galx_environment_type AS ENUM ('production', 'staging', 'development');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE galx_idempotency_state AS ENUM ('IN_FLIGHT', 'COMMITTED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. PROJECTS & ENVIRONMENTS
CREATE TABLE IF NOT EXISTS galx_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES galx_workspaces(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(64) NOT NULL,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS galx_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES galx_projects(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    environment_type galx_environment_type NOT NULL DEFAULT 'development',
    monthly_budget_usd NUMERIC(12, 4) DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, name)
);

-- 3. STRIPE-GRADE IDEMPOTENCY KEY LEDGER
CREATE TABLE IF NOT EXISTS galx_idempotency_keys (
    id VARCHAR(128) PRIMARY KEY, -- e.g. "idem_usr123_hash"
    user_id VARCHAR(255) NOT NULL,
    endpoint VARCHAR(128) NOT NULL,
    request_hash VARCHAR(64) NOT NULL, -- SHA-256 of request payload
    state galx_idempotency_state NOT NULL DEFAULT 'IN_FLIGHT',
    status_code INTEGER DEFAULT NULL,
    response_headers JSONB DEFAULT NULL,
    response_body JSONB DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    expires_at_ms BIGINT NOT NULL,
    created_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_idemp_user_endpoint ON galx_idempotency_keys(user_id, endpoint, request_hash);
CREATE INDEX IF NOT EXISTS idx_galx_idemp_expires ON galx_idempotency_keys(expires_at_ms);

-- 4. DISTRIBUTED ADVISORY LOCKS & WORKER FENCING
CREATE TABLE IF NOT EXISTS galx_distributed_locks (
    lock_key VARCHAR(128) PRIMARY KEY,
    owner_id VARCHAR(128) NOT NULL, -- Worker / process ID
    fencing_token BIGINT NOT NULL DEFAULT 1,
    acquired_at_ms BIGINT NOT NULL,
    expires_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_locks_expires ON galx_distributed_locks(expires_at_ms);

-- 5. GRANULAR API KEY SCOPES
CREATE TABLE IF NOT EXISTS galx_api_key_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id VARCHAR(64) NOT NULL REFERENCES galx_developer_keys(id) ON DELETE CASCADE,
    scope VARCHAR(64) NOT NULL, -- e.g. "chat:write", "images:write", "queues:admin", "wallets:read"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(key_id, scope)
);

-- 6. FULL-TEXT SEARCH GIN INDEX ON EMBEDDINGS STORE
ALTER TABLE galx_embeddings_store ADD COLUMN IF NOT EXISTS tsv_content tsvector
GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_galx_embeddings_tsv ON galx_embeddings_store USING gin(tsv_content);

-- 7. APEX STORED PROCEDURES

-- A. Atomic Idempotency Begin
CREATE OR REPLACE FUNCTION fn_idempotency_begin(
    p_idempotency_key VARCHAR(128),
    p_user_id VARCHAR(255),
    p_endpoint VARCHAR(128),
    p_request_hash VARCHAR(64),
    p_ttl_ms BIGINT DEFAULT 86400000 -- 24 hours
)
RETURNS JSONB AS $$
DECLARE
    v_existing galx_idempotency_keys%ROWTYPE;
    v_now_ms BIGINT;
    v_expires_at_ms BIGINT;
BEGIN
    v_now_ms := CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT);
    v_expires_at_ms := v_now_ms + p_ttl_ms;

    SELECT * INTO v_existing
    FROM galx_idempotency_keys
    WHERE id = p_idempotency_key
    FOR UPDATE;

    IF FOUND THEN
        -- Check request hash mismatch
        IF v_existing.request_hash <> p_request_hash THEN
            RETURN jsonb_build_object(
                'status', 'MISMATCH_ERROR',
                'message', 'Idempotency key reused with different request payload.'
            );
        END IF;

        IF v_existing.state = 'COMMITTED' THEN
            RETURN jsonb_build_object(
                'status', 'CACHED',
                'status_code', v_existing.status_code,
                'response_headers', v_existing.response_headers,
                'response_body', v_existing.response_body
            );
        END IF;

        IF v_existing.state = 'IN_FLIGHT' AND v_existing.expires_at_ms > v_now_ms THEN
            RETURN jsonb_build_object(
                'status', 'IN_FLIGHT',
                'message', 'A request with this idempotency key is currently in flight.'
            );
        END IF;
    END IF;

    -- Upsert in-flight reservation
    INSERT INTO galx_idempotency_keys (
        id, user_id, endpoint, request_hash, state, expires_at_ms, created_at_ms
    ) VALUES (
        p_idempotency_key, p_user_id, p_endpoint, p_request_hash, 'IN_FLIGHT', v_expires_at_ms, v_now_ms
    )
    ON CONFLICT (id) DO UPDATE SET
        state = 'IN_FLIGHT',
        request_hash = p_request_hash,
        expires_at_ms = v_expires_at_ms,
        updated_at = NOW();

    RETURN jsonb_build_object('status', 'STARTED');
END;
$$ LANGUAGE plpgsql;

-- B. Atomic Idempotency Commit
CREATE OR REPLACE FUNCTION fn_idempotency_commit(
    p_idempotency_key VARCHAR(128),
    p_status_code INTEGER,
    p_response_headers JSONB,
    p_response_body JSONB
)
RETURNS VOID AS $$
BEGIN
    UPDATE galx_idempotency_keys
    SET state = 'COMMITTED',
        status_code = p_status_code,
        response_headers = p_response_headers,
        response_body = p_response_body,
        updated_at = NOW()
    WHERE id = p_idempotency_key;
END;
$$ LANGUAGE plpgsql;

-- C. Distributed Advisory Locking with Monotonic Fencing
CREATE OR REPLACE FUNCTION fn_acquire_distributed_lock(
    p_lock_key VARCHAR(128),
    p_owner_id VARCHAR(128),
    p_ttl_ms BIGINT DEFAULT 30000,
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_lock galx_distributed_locks%ROWTYPE;
    v_now_ms BIGINT;
    v_expires_at_ms BIGINT;
    v_new_fencing BIGINT := 1;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));
    v_expires_at_ms := v_now_ms + p_ttl_ms;

    SELECT * INTO v_lock
    FROM galx_distributed_locks
    WHERE lock_key = p_lock_key
    FOR UPDATE;

    IF FOUND THEN
        -- Check if current lock is held by another active owner
        IF v_lock.expires_at_ms > v_now_ms AND v_lock.owner_id <> p_owner_id THEN
            RETURN jsonb_build_object(
                'acquired', false,
                'reason', 'LOCK_HELD_BY_ANOTHER_OWNER',
                'current_owner', v_lock.owner_id,
                'expires_at_ms', v_lock.expires_at_ms
            );
        END IF;

        v_new_fencing := v_lock.fencing_token + 1;

        UPDATE galx_distributed_locks
        SET owner_id = p_owner_id,
            fencing_token = v_new_fencing,
            acquired_at_ms = v_now_ms,
            expires_at_ms = v_expires_at_ms,
            updated_at = NOW()
        WHERE lock_key = p_lock_key;
    ELSE
        INSERT INTO galx_distributed_locks (
            lock_key, owner_id, fencing_token, acquired_at_ms, expires_at_ms
        ) VALUES (
            p_lock_key, p_owner_id, 1, v_now_ms, v_expires_at_ms
        );
    END IF;

    RETURN jsonb_build_object(
        'acquired', true,
        'lock_key', p_lock_key,
        'owner_id', p_owner_id,
        'fencing_token', v_new_fencing,
        'expires_at_ms', v_expires_at_ms
    );
END;
$$ LANGUAGE plpgsql;

-- D. Release Distributed Lock
CREATE OR REPLACE FUNCTION fn_release_distributed_lock(
    p_lock_key VARCHAR(128),
    p_owner_id VARCHAR(128),
    p_fencing_token BIGINT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM galx_distributed_locks
    WHERE lock_key = p_lock_key
      AND owner_id = p_owner_id
      AND (p_fencing_token IS NULL OR fencing_token = p_fencing_token);

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql;

-- E. Hybrid Semantic & Lexical Vector Search with Reciprocal Rank Fusion (RRF)
CREATE OR REPLACE FUNCTION fn_hybrid_vector_search(
    p_query_text TEXT,
    p_query_embedding vector(1536),
    p_workspace_id UUID DEFAULT NULL,
    p_collection_name VARCHAR(128) DEFAULT 'default',
    p_alpha NUMERIC DEFAULT 0.5, -- 0.0 = pure full-text, 1.0 = pure vector
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    document_id VARCHAR(255),
    chunk_index INTEGER,
    content TEXT,
    metadata JSONB,
    vector_score NUMERIC,
    text_score NUMERIC,
    combined_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH vector_matches AS (
        SELECT
            e.id,
            CAST(1 - (e.embedding <=> p_query_embedding) AS NUMERIC) AS v_score,
            ROW_NUMBER() OVER (ORDER BY e.embedding <=> p_query_embedding ASC) AS v_rank
        FROM galx_embeddings_store e
        WHERE (p_workspace_id IS NULL OR e.workspace_id = p_workspace_id)
          AND e.collection_name = p_collection_name
          AND e.embedding IS NOT NULL
        LIMIT p_limit * 3
    ),
    text_matches AS (
        SELECT
            e.id,
            CAST(ts_rank_cd(e.tsv_content, plainto_tsquery('english', p_query_text)) AS NUMERIC) AS t_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(e.tsv_content, plainto_tsquery('english', p_query_text)) DESC) AS t_rank
        FROM galx_embeddings_store e
        WHERE (p_workspace_id IS NULL OR e.workspace_id = p_workspace_id)
          AND e.collection_name = p_collection_name
          AND e.tsv_content @@ plainto_tsquery('english', p_query_text)
        LIMIT p_limit * 3
    )
    SELECT
        e.id,
        e.document_id,
        e.chunk_index,
        e.content,
        e.metadata,
        COALESCE(vm.v_score, 0) AS vector_score,
        COALESCE(tm.t_score, 0) AS text_score,
        CAST(
            (p_alpha * COALESCE(1.0 / (60 + vm.v_rank), 0)) +
            ((1 - p_alpha) * COALESCE(1.0 / (60 + tm.t_rank), 0))
        AS NUMERIC) AS combined_score
    FROM galx_embeddings_store e
    LEFT JOIN vector_matches vm ON e.id = vm.id
    LEFT JOIN text_matches tm ON e.id = tm.id
    WHERE vm.id IS NOT NULL OR tm.id IS NOT NULL
    ORDER BY combined_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- F. Low-Egress Cloudflare Worker Batch Task Leasing
CREATE OR REPLACE FUNCTION fn_lease_queue_tasks_batch_cf(
    p_queue_id VARCHAR(64),
    p_worker_id VARCHAR(128),
    p_max_tasks INTEGER DEFAULT 25,
    p_lease_duration_ms BIGINT DEFAULT 60000,
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now_ms BIGINT;
    v_tasks JSONB;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    WITH leased AS (
        SELECT *
        FROM fn_lease_queue_tasks(
            p_queue_id := p_queue_id,
            p_worker_id := p_worker_id,
            p_max_tasks := p_max_tasks,
            p_lease_duration_ms := p_lease_duration_ms,
            p_now_ms := v_now_ms
        )
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', l.id,
            'queueId', l.queue_id,
            'userId', l.user_id,
            'priority', l.priority,
            'target', l.target_payload,
            'dispatchCount', l.dispatch_count,
            'leaseExpiresAtMs', l.lease_expires_at_ms,
            'fencingToken', l.active_fencing_token
        )
    ) INTO v_tasks
    FROM leased l;

    RETURN COALESCE(v_tasks, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 8. ROW LEVEL SECURITY FOR APEX TABLES
ALTER TABLE galx_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_distributed_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_api_key_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_galx_projects" ON galx_projects FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_environments" ON galx_environments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_idempotency_keys" ON galx_idempotency_keys FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_distributed_locks" ON galx_distributed_locks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_api_key_scopes" ON galx_api_key_scopes FOR ALL USING (auth.role() = 'service_role');
