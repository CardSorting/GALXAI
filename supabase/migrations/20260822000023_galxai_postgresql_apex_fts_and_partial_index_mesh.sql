-- ============================================================================
-- GALXAI: Supabase PostgreSQL Apex Full-Text Search & Partial Index Mesh
-- Version: 23.0.0
-- Standards: State-filtered partial indexes, stored tsvector full-text search,
-- ranking procedures, and telemetry token check constraints.
-- ============================================================================

-- 1. STATE-FILTERED PARTIAL INDEXES (5x-20x Smaller Footprint, L1 Cache Retention)
CREATE INDEX IF NOT EXISTS idx_galx_tasks_active_pending 
    ON galx_tasks (queue_id, priority DESC, schedule_time_ms ASC) 
    WHERE status IN ('QUEUED', 'SCHEDULED', 'RETRYING');

CREATE INDEX IF NOT EXISTS idx_galx_telemetry_errors 
    ON galx_metrics_telemetry (provider, model_id, timestamp_ms DESC) 
    WHERE is_error = true;

CREATE INDEX IF NOT EXISTS idx_galx_stripe_cs_open 
    ON galx_stripe_checkout_sessions (created_at DESC) 
    WHERE status = 'open' AND payment_status = 'unpaid';

-- 2. FULL-TEXT SEARCH STORED TSVECTOR & GIN INDEXES
DO $$ BEGIN
    ALTER TABLE galx_audit_logs 
    ADD COLUMN search_vector tsvector 
    GENERATED ALWAYS AS (
        to_tsvector('english', 
            coalesce(action, '') || ' ' || 
            coalesce(user_id, '') || ' ' || 
            coalesce(resource_id, '')
        )
    ) STORED;
EXCEPTION WHEN duplicate_column THEN null; END $$;

CREATE INDEX IF NOT EXISTS idx_galx_audit_fts 
    ON galx_audit_logs USING gin (search_vector);

-- 3. TOKEN & LATENCY INTEGRITY CHECK CONSTRAINTS
DO $$ BEGIN
    ALTER TABLE galx_wallet_transactions 
    ADD CONSTRAINT chk_galx_wallet_tx_tokens_non_negative 
    CHECK (prompt_tokens >= 0 AND completion_tokens >= 0 AND cached_tokens >= 0);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE galx_metrics_telemetry 
    ADD CONSTRAINT chk_galx_telemetry_latency_positive 
    CHECK (latency_ms >= 0);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. ATOMIC FULL-TEXT SEARCH PROCEDURE WITH RELEVANCE RANKING
CREATE OR REPLACE FUNCTION fn_search_audit_logs(
    p_query TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    action VARCHAR(128),
    user_id VARCHAR(255),
    resource_id VARCHAR(255),
    metadata JSONB,
    timestamp_ms BIGINT,
    created_at TIMESTAMPTZ,
    rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tsquery tsquery;
BEGIN
    v_tsquery := plainto_tsquery('english', p_query);
    
    RETURN QUERY
    SELECT 
        a.id,
        a.action,
        a.user_id,
        a.resource_id,
        a.metadata,
        a.timestamp_ms,
        a.created_at,
        ts_rank(a.search_vector, v_tsquery) AS rank
    FROM galx_audit_logs a
    WHERE a.search_vector @@ v_tsquery
    ORDER BY rank DESC, a.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fn_search_audit_logs(TEXT, INTEGER) TO authenticated, service_role;
