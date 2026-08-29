-- ============================================================================
-- GALXAI: Supabase PostgreSQL Hyperscale Governance & Vacuum Armor
-- Version: 21.0.0
-- Standards: JSONB Path-Ops GIN indexing, aggressive autovacuum tuning,
-- advisory transaction locks, and function privilege containment.
-- ============================================================================

-- 1. JSONB PATH-OPS GIN INDEXES (3x-6x faster containment @> queries with 50% smaller index footprint)
CREATE INDEX IF NOT EXISTS idx_galx_wallet_tx_meta_gin 
    ON galx_wallet_transactions USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_galx_audit_meta_gin 
    ON galx_audit_logs USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_galx_stripe_cust_meta_gin 
    ON galx_stripe_customers USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_galx_stripe_cs_meta_gin 
    ON galx_stripe_checkout_sessions USING gin (metadata jsonb_path_ops);

-- 2. HIGH-CHURN AUTOVACUUM & AUTOANALYZE SCALE FACTOR TUNING
-- Vacuums dead tuples at 5% dead rows instead of default 20% to prevent bloat on high-frequency micro-billing
ALTER TABLE galx_wallet_transactions SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE galx_metrics_telemetry SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE galx_tasks SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE galx_audit_logs SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

-- 3. DISTRIBUTED ADVISORY TRANSACTION LOCK PROCEDURE
-- Non-blocking lightweight mutexes for distributed multi-agent swarm state synchronization
CREATE OR REPLACE FUNCTION fn_try_acquire_advisory_xact_lock(
    p_lock_key VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_lock_id BIGINT;
    v_acquired BOOLEAN;
BEGIN
    -- Derive deterministic 64-bit bigint hash from lock key
    v_lock_id := ('x' || substr(md5(p_lock_key), 1, 16))::bit(64)::bigint;
    
    -- Attempt non-blocking transaction-scoped advisory lock
    v_acquired := pg_try_advisory_xact_lock(v_lock_id);

    RETURN jsonb_build_object(
        'success', v_acquired,
        'lock_key', p_lock_key,
        'lock_id', v_lock_id,
        'acquired_at', NOW()
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fn_try_acquire_advisory_xact_lock(VARCHAR) TO authenticated, service_role;
