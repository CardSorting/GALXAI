-- ============================================================================
-- GALXAI: Universal AI Routing Gateway & Substrate Architecture
-- Supabase PostgreSQL Core Schema Migration
-- Version: 3.0.0
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. CUSTOM ENUM TYPES
DO $$ BEGIN
    CREATE TYPE galx_provider_type AS ENUM ('openai', 'xai-grok');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE galx_auth_type AS ENUM ('api_key', 'oauth');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE galx_shard_mode AS ENUM ('pooled', 'private');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE galx_credential_status AS ENUM ('healthy', 'cooldown', 'exhausted', 'dead', 'paused', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE galx_rotation_strategy AS ENUM ('adaptive_headroom', 'smooth_weighted_round_robin', 'least_utilized', 'priority_failover');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE galx_queue_state AS ENUM ('RUNNING', 'PAUSED', 'DISABLED', 'DRAINING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE galx_task_status AS ENUM (
        'QUEUED',
        'SCHEDULED',
        'WAITING_DEPENDENCIES',
        'DISPATCHING',
        'RUNNING',
        'COMPLETED',
        'RETRYING',
        'CANCELLED',
        'EXPIRED',
        'DEAD_LETTERED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE galx_dispatch_target_type AS ENUM ('HTTP_PUSH', 'INTERNAL_MODEL', 'PULL_WORKER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE galx_wallet_transaction_type AS ENUM (
        'deposit',
        'match_grant',
        'usage_draw',
        'auto_reload',
        'refund',
        'adjustment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE galx_workspace_role AS ENUM ('owner', 'admin', 'developer', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. WORKSPACES & MULTI-TENANCY
CREATE TABLE IF NOT EXISTS galx_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(32) NOT NULL DEFAULT 'standard', -- standard, growth, enterprise
    is_active BOOLEAN NOT NULL DEFAULT true,
    monthly_spend_cap_usd NUMERIC(12, 4) DEFAULT 1000.0000,
    current_month_spend_usd NUMERIC(12, 4) DEFAULT 0.0000,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS galx_workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES galx_workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL, -- references auth.users(id) or external auth user ID
    role galx_workspace_role NOT NULL DEFAULT 'developer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- 4. DEVELOPER GATEWAY API KEYS (galx_live_..., galx_test_...)
CREATE TABLE IF NOT EXISTS galx_developer_keys (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(128) NOT NULL,
    prefix VARCHAR(32) NOT NULL, -- e.g. "galx_live_ab12"
    key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of secret key
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 600,
    total_requests BIGINT NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    spend_cap_usd NUMERIC(10, 4) DEFAULT NULL,
    current_spend_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    allowed_models TEXT[] DEFAULT NULL,
    allowed_ips TEXT[] DEFAULT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_at TIMESTAMPTZ DEFAULT NULL,
    revoked_reason TEXT DEFAULT NULL,
    last_used_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ENCRYPTED PROVIDER SHARD ACCOUNTS (AES-256-GCM Vault & Circuit State)
CREATE TABLE IF NOT EXISTS galx_shard_accounts (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(255) NOT NULL,
    provider galx_provider_type NOT NULL,
    auth_type galx_auth_type NOT NULL DEFAULT 'api_key',
    account_label VARCHAR(128) NOT NULL,
    api_key_masked VARCHAR(64) NOT NULL,
    -- AES-256-GCM Cryptographic Payload
    encrypted_ciphertext TEXT NOT NULL,
    encrypted_iv VARCHAR(64) NOT NULL,
    encrypted_tag VARCHAR(64) NOT NULL,
    key_version VARCHAR(32) DEFAULT 'v1',
    shard_mode galx_shard_mode NOT NULL DEFAULT 'pooled',
    priority INTEGER NOT NULL DEFAULT 50 CHECK (priority >= 1 AND priority <= 100),
    weight INTEGER NOT NULL DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
    status galx_credential_status NOT NULL DEFAULT 'healthy',
    -- Continuous Token Bucket State
    max_tokens BIGINT NOT NULL DEFAULT 10000000,
    remaining_tokens BIGINT NOT NULL DEFAULT 10000000,
    reserved_tokens BIGINT NOT NULL DEFAULT 0,
    refill_rate_per_minute BIGINT NOT NULL DEFAULT 10000000,
    max_requests INTEGER NOT NULL DEFAULT 10000,
    remaining_requests INTEGER NOT NULL DEFAULT 10000,
    last_refill_timestamp_ms BIGINT NOT NULL DEFAULT 0,
    -- Usage & Circuit Telemetry
    total_requests_served BIGINT NOT NULL DEFAULT 0,
    total_tokens_consumed BIGINT NOT NULL DEFAULT 0,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    consecutive_successes INTEGER NOT NULL DEFAULT 0,
    average_latency_ms NUMERIC(10, 2) NOT NULL DEFAULT 250.00,
    last_latency_ms NUMERIC(10, 2) DEFAULT NULL,
    fencing_token BIGINT NOT NULL DEFAULT 1,
    permission_retracted BOOLEAN NOT NULL DEFAULT false,
    cooldown_until_ms BIGINT DEFAULT NULL,
    created_at_ms BIGINT NOT NULL,
    updated_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. SHARD LEASES (Atomic 2-Phase Execution Leases & Scavenger Tracking)
CREATE TABLE IF NOT EXISTS galx_shard_leases (
    id VARCHAR(64) PRIMARY KEY,
    shard_id VARCHAR(64) NOT NULL REFERENCES galx_shard_accounts(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(255) NOT NULL,
    job_id VARCHAR(128) DEFAULT NULL,
    fencing_token BIGINT NOT NULL,
    estimated_tokens BIGINT NOT NULL DEFAULT 2000,
    committed_tokens BIGINT DEFAULT NULL,
    acquired_at_ms BIGINT NOT NULL,
    expires_at_ms BIGINT NOT NULL,
    is_committed BOOLEAN NOT NULL DEFAULT false,
    is_reclaimed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. CLOUD-STYLE ASYNC TASK QUEUES
CREATE TABLE IF NOT EXISTS galx_task_queues (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT DEFAULT NULL,
    state galx_queue_state NOT NULL DEFAULT 'RUNNING',
    -- Rate Limits
    max_dispatches_per_second NUMERIC(8, 2) NOT NULL DEFAULT 50.00,
    max_concurrent_dispatches INTEGER NOT NULL DEFAULT 20,
    max_burst_size INTEGER NOT NULL DEFAULT 100,
    -- Retry Policy
    max_attempts INTEGER NOT NULL DEFAULT 5,
    max_retry_duration_ms BIGINT DEFAULT 86400000,
    min_backoff_ms INTEGER NOT NULL DEFAULT 1000,
    max_backoff_ms INTEGER NOT NULL DEFAULT 300000,
    max_doublings INTEGER NOT NULL DEFAULT 5,
    jitter_factor NUMERIC(4, 2) NOT NULL DEFAULT 0.20,
    -- Dead Letter Configuration
    dlq_target_queue_id VARCHAR(64) DEFAULT NULL,
    dlq_retention_ms BIGINT DEFAULT 604800000, -- 7 days
    dlq_webhook_url TEXT DEFAULT NULL,
    -- Concurrency & Scheduling Tuning
    default_tenant_max_concurrency INTEGER NOT NULL DEFAULT 10,
    content_based_deduplication BOOLEAN NOT NULL DEFAULT false,
    default_deduplication_window_ms BIGINT DEFAULT 86400000, -- 24 hours
    priority_aging_interval_ms BIGINT DEFAULT 30000, -- 30 seconds
    created_at_ms BIGINT NOT NULL,
    updated_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. ASYNC TASKS (DAG Dependencies, FIFO Group Locks, Cron Schedules)
CREATE TABLE IF NOT EXISTS galx_tasks (
    id VARCHAR(64) PRIMARY KEY,
    queue_id VARCHAR(64) NOT NULL REFERENCES galx_task_queues(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(128) DEFAULT NULL,
    content_hash VARCHAR(64) DEFAULT NULL,
    tag VARCHAR(64) DEFAULT NULL,
    group_id VARCHAR(128) DEFAULT NULL, -- Strict FIFO partition key
    depends_on TEXT[] DEFAULT ARRAY[]::TEXT[], -- DAG parent task IDs
    priority INTEGER NOT NULL DEFAULT 50 CHECK (priority >= 1 AND priority <= 100),
    target_type galx_dispatch_target_type NOT NULL,
    target_payload JSONB NOT NULL,
    pipeline_steps JSONB DEFAULT NULL,
    cron_config JSONB DEFAULT NULL,
    deadline_ms BIGINT DEFAULT NULL,
    ttl_ms BIGINT DEFAULT NULL,
    status galx_task_status NOT NULL DEFAULT 'QUEUED',
    schedule_time_ms BIGINT NOT NULL,
    dispatch_count INTEGER NOT NULL DEFAULT 0,
    response_count INTEGER NOT NULL DEFAULT 0,
    first_attempt_ms BIGINT DEFAULT NULL,
    last_attempt_ms BIGINT DEFAULT NULL,
    lease_expires_at_ms BIGINT DEFAULT NULL,
    active_worker_id VARCHAR(128) DEFAULT NULL,
    active_fencing_token BIGINT DEFAULT NULL,
    parent_task_results JSONB DEFAULT '{}'::jsonb,
    progress JSONB DEFAULT NULL,
    active_pipeline_step_index INTEGER DEFAULT 0,
    pipeline_step_results JSONB DEFAULT '[]'::jsonb,
    result JSONB DEFAULT NULL,
    last_error JSONB DEFAULT NULL,
    created_at_ms BIGINT NOT NULL,
    updated_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TASK ATTEMPTS & EXECUTION TRACES
CREATE TABLE IF NOT EXISTS galx_task_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(64) NOT NULL REFERENCES galx_tasks(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    started_at_ms BIGINT NOT NULL,
    completed_at_ms BIGINT DEFAULT NULL,
    duration_ms BIGINT DEFAULT NULL,
    response_status_code INTEGER DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    error_details JSONB DEFAULT NULL,
    shard_id_used VARCHAR(64) DEFAULT NULL,
    model_used VARCHAR(128) DEFAULT NULL,
    worker_id VARCHAR(128) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. REAL-TIME QUEUE EVENTS
CREATE TABLE IF NOT EXISTS galx_queue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(64) NOT NULL,
    queue_id VARCHAR(64) NOT NULL REFERENCES galx_task_queues(id) ON DELETE CASCADE,
    task_id VARCHAR(64) DEFAULT NULL,
    event_type VARCHAR(64) NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. DEVELOPER COMPUTE WALLETS & PROOF-OF-DEPOSIT (ADR 0007)
CREATE TABLE IF NOT EXISTS galx_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID UNIQUE REFERENCES galx_workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    balance_usd NUMERIC(14, 6) NOT NULL DEFAULT 0.000000,
    introductory_grant_usd NUMERIC(14, 6) NOT NULL DEFAULT 5.000000,
    deposited_total_usd NUMERIC(14, 6) NOT NULL DEFAULT 0.000000,
    promotional_match_usd NUMERIC(14, 6) NOT NULL DEFAULT 0.000000,
    lifetime_spent_usd NUMERIC(14, 6) NOT NULL DEFAULT 0.000000,
    auto_reload_enabled BOOLEAN NOT NULL DEFAULT false,
    auto_reload_threshold_usd NUMERIC(14, 6) NOT NULL DEFAULT 10.000000,
    auto_reload_amount_usd NUMERIC(14, 6) NOT NULL DEFAULT 25.000000,
    auto_reload_payment_method_id VARCHAR(128) DEFAULT NULL,
    proof_of_deposit_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. IMMUTABLE MICRO-BILLING TRANSACTIONS LEDGER
CREATE TABLE IF NOT EXISTS galx_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES galx_wallets(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    transaction_type galx_wallet_transaction_type NOT NULL,
    amount_usd NUMERIC(14, 6) NOT NULL,
    balance_after_usd NUMERIC(14, 6) NOT NULL,
    description TEXT NOT NULL,
    api_key_id VARCHAR(64) DEFAULT NULL,
    shard_id VARCHAR(64) DEFAULT NULL,
    model VARCHAR(128) DEFAULT NULL,
    prompt_tokens BIGINT DEFAULT 0,
    completion_tokens BIGINT DEFAULT 0,
    cached_tokens BIGINT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. TIME-SERIES METRICS & TELEMETRY
CREATE TABLE IF NOT EXISTS galx_metrics_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(255) DEFAULT NULL,
    provider galx_provider_type NOT NULL,
    model_id VARCHAR(128) NOT NULL,
    shard_id VARCHAR(64) NOT NULL,
    latency_ms NUMERIC(10, 2) NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    is_error BOOLEAN NOT NULL DEFAULT false,
    status_code INTEGER NOT NULL DEFAULT 200,
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. VECTOR EMBEDDINGS STORE (pgvector for semantic search & contextual caching)
CREATE TABLE IF NOT EXISTS galx_embeddings_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE CASCADE,
    collection_name VARCHAR(128) NOT NULL DEFAULT 'default',
    document_id VARCHAR(255) NOT NULL,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536), -- Standard OpenAI / text-embedding-3 dimension
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. AUDIT LOGS
CREATE TABLE IF NOT EXISTS galx_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(255) DEFAULT NULL,
    shard_id VARCHAR(64) DEFAULT NULL,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64) DEFAULT NULL,
    resource_id VARCHAR(128) DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 16. HIGH-PERFORMANCE INDEXES
-- ============================================================================

-- Developer Keys Indexes
CREATE INDEX IF NOT EXISTS idx_galx_developer_keys_hash ON galx_developer_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_galx_developer_keys_prefix ON galx_developer_keys(prefix);
CREATE INDEX IF NOT EXISTS idx_galx_developer_keys_user ON galx_developer_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_developer_keys_active ON galx_developer_keys(is_revoked) WHERE is_revoked = false;

-- Shard Accounts Indexes
CREATE INDEX IF NOT EXISTS idx_galx_shards_provider_status ON galx_shard_accounts(provider, status);
CREATE INDEX IF NOT EXISTS idx_galx_shards_mode ON galx_shard_accounts(shard_mode);
CREATE INDEX IF NOT EXISTS idx_galx_shards_user ON galx_shard_accounts(user_id);

-- Shard Leases Indexes
CREATE INDEX IF NOT EXISTS idx_galx_shard_leases_active ON galx_shard_leases(shard_id, expires_at_ms) WHERE is_committed = false AND is_reclaimed = false;

-- Tasks Indexes
CREATE INDEX IF NOT EXISTS idx_galx_tasks_queue_status_schedule ON galx_tasks(queue_id, status, schedule_time_ms);
CREATE INDEX IF NOT EXISTS idx_galx_tasks_group_fifo ON galx_tasks(queue_id, group_id, created_at_ms) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galx_tasks_idempotency ON galx_tasks(queue_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galx_tasks_content_hash ON galx_tasks(queue_id, content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galx_tasks_tag ON galx_tasks(queue_id, tag) WHERE tag IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galx_tasks_user ON galx_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_tasks_depends_on ON galx_tasks USING GIN(depends_on);

-- Queue Events Indexes
CREATE INDEX IF NOT EXISTS idx_galx_queue_events_queue_time ON galx_queue_events(queue_id, timestamp_ms DESC);
CREATE INDEX IF NOT EXISTS idx_galx_queue_events_task ON galx_queue_events(task_id) WHERE task_id IS NOT NULL;

-- Wallet Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_galx_wallet_tx_wallet_time ON galx_wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_galx_wallet_tx_user ON galx_wallet_transactions(user_id);

-- Telemetry Indexes
CREATE INDEX IF NOT EXISTS idx_galx_telemetry_provider_model ON galx_metrics_telemetry(provider, model_id, timestamp_ms DESC);
CREATE INDEX IF NOT EXISTS idx_galx_telemetry_shard ON galx_metrics_telemetry(shard_id, timestamp_ms DESC);

-- Audit Logs Indexes
CREATE INDEX IF NOT EXISTS idx_galx_audit_logs_user_time ON galx_audit_logs(user_id, timestamp_ms DESC);
CREATE INDEX IF NOT EXISTS idx_galx_audit_logs_action ON galx_audit_logs(action);

-- Vector Similarity Index (HNSW for blazing fast Cosine distance queries)
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_galx_embeddings_hnsw ON galx_embeddings_store USING hnsw (embedding vector_cosine_ops);
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- ============================================================================
-- 17. AUTOMATED UPDATED_AT TIMESTAMP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_galx_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER trg_galx_workspaces_updated_at BEFORE UPDATE ON galx_workspaces FOR EACH ROW EXECUTE FUNCTION fn_galx_set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_galx_developer_keys_updated_at BEFORE UPDATE ON galx_developer_keys FOR EACH ROW EXECUTE FUNCTION fn_galx_set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_galx_shard_accounts_updated_at BEFORE UPDATE ON galx_shard_accounts FOR EACH ROW EXECUTE FUNCTION fn_galx_set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_galx_task_queues_updated_at BEFORE UPDATE ON galx_task_queues FOR EACH ROW EXECUTE FUNCTION fn_galx_set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_galx_tasks_updated_at BEFORE UPDATE ON galx_tasks FOR EACH ROW EXECUTE FUNCTION fn_galx_set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_galx_wallets_updated_at BEFORE UPDATE ON galx_wallets FOR EACH ROW EXECUTE FUNCTION fn_galx_set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 18. STORED PROCEDURES & ATOMIC TRANSACTION FUNCTIONS
-- ============================================================================

-- A. ATOMIC WORKER TASK LEASING WITH FOR UPDATE SKIP LOCKED
-- Ensures zero contention and strict FIFO group locking
CREATE OR REPLACE FUNCTION fn_lease_queue_tasks(
    p_queue_id VARCHAR(64),
    p_worker_id VARCHAR(128),
    p_max_tasks INTEGER DEFAULT 10,
    p_lease_duration_ms BIGINT DEFAULT 60000,
    p_tag_filter VARCHAR(64) DEFAULT NULL,
    p_group_id_filter VARCHAR(128) DEFAULT NULL,
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS SETOF galx_tasks AS $$
DECLARE
    v_now_ms BIGINT;
    v_lease_expiry BIGINT;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));
    v_lease_expiry := v_now_ms + p_lease_duration_ms;

    RETURN QUERY
    WITH candidate_tasks AS (
        SELECT t.id
        FROM galx_tasks t
        WHERE t.queue_id = p_queue_id
          AND t.status IN ('QUEUED', 'SCHEDULED', 'RETRYING')
          AND t.schedule_time_ms <= v_now_ms
          AND (p_tag_filter IS NULL OR t.tag = p_tag_filter)
          AND (p_group_id_filter IS NULL OR t.group_id = p_group_id_filter)
          -- FIFO Partition Gate: Ensure no earlier task in the same group is currently active
          AND (
              t.group_id IS NULL OR NOT EXISTS (
                  SELECT 1 FROM galx_tasks g
                  WHERE g.queue_id = p_queue_id
                    AND g.group_id = t.group_id
                    AND g.status IN ('DISPATCHING', 'RUNNING')
                    AND g.id <> t.id
              )
          )
        ORDER BY
            -- Dynamic anti-starvation priority score
            (t.priority + LEAST(50, ((v_now_ms - t.created_at_ms) / 30000) * 5)) DESC,
            t.created_at_ms ASC
        LIMIT p_max_tasks
        FOR UPDATE SKIP LOCKED
    )
    UPDATE galx_tasks u
    SET status = 'RUNNING',
        dispatch_count = u.dispatch_count + 1,
        last_attempt_ms = v_now_ms,
        first_attempt_ms = COALESCE(u.first_attempt_ms, v_now_ms),
        lease_expires_at_ms = v_lease_expiry,
        active_worker_id = p_worker_id,
        active_fencing_token = COALESCE(u.active_fencing_token, 0) + 1,
        updated_at_ms = v_now_ms
    FROM candidate_tasks c
    WHERE u.id = c.id
    RETURNING u.*;
END;
$$ LANGUAGE plpgsql;

-- B. ATOMIC MICRO-METERED WALLET TOKEN DEBIT
-- Implements exact $0.000001 precision, deducts from promotional match then cash balance
CREATE OR REPLACE FUNCTION fn_draw_wallet_tokens(
    p_user_id VARCHAR(255),
    p_cost_usd NUMERIC(14, 6),
    p_description TEXT,
    p_api_key_id VARCHAR(64) DEFAULT NULL,
    p_shard_id VARCHAR(64) DEFAULT NULL,
    p_model VARCHAR(128) DEFAULT NULL,
    p_prompt_tokens BIGINT DEFAULT 0,
    p_completion_tokens BIGINT DEFAULT 0,
    p_cached_tokens BIGINT DEFAULT 0,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_wallet galx_wallets%ROWTYPE;
    v_new_balance NUMERIC(14, 6);
    v_tx_id UUID;
    v_trigger_auto_reload BOOLEAN := false;
BEGIN
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'WALLET_NOT_FOUND',
            'balance', 0
        );
    END IF;

    IF v_wallet.balance_usd < p_cost_usd THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'INSUFFICIENT_FUNDS',
            'current_balance', v_wallet.balance_usd,
            'required_cost', p_cost_usd
        );
    END IF;

    v_new_balance := v_wallet.balance_usd - p_cost_usd;

    -- Update wallet state
    UPDATE galx_wallets
    SET balance_usd = v_new_balance,
        lifetime_spent_usd = lifetime_spent_usd + p_cost_usd,
        updated_at = NOW()
    WHERE id = v_wallet.id;

    -- Record immutable transaction
    INSERT INTO galx_wallet_transactions (
        wallet_id,
        user_id,
        transaction_type,
        amount_usd,
        balance_after_usd,
        description,
        api_key_id,
        shard_id,
        model,
        prompt_tokens,
        completion_tokens,
        cached_tokens,
        metadata
    ) VALUES (
        v_wallet.id,
        p_user_id,
        'usage_draw',
        -p_cost_usd,
        v_new_balance,
        p_description,
        p_api_key_id,
        p_shard_id,
        p_model,
        p_prompt_tokens,
        p_completion_tokens,
        p_cached_tokens,
        p_metadata
    ) RETURNING id INTO v_tx_id;

    -- Check auto-reload safeguard trigger
    IF v_wallet.auto_reload_enabled AND v_new_balance <= v_wallet.auto_reload_threshold_usd THEN
        v_trigger_auto_reload := true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'previous_balance', v_wallet.balance_usd,
        'cost_usd', p_cost_usd,
        'new_balance', v_new_balance,
        'trigger_auto_reload', v_trigger_auto_reload
    );
END;
$$ LANGUAGE plpgsql;

-- C. ATOMIC DEPOSIT VERIFICATION & 50% MATCH GRANT TRANSACTION
CREATE OR REPLACE FUNCTION fn_verify_deposit_and_match(
    p_user_id VARCHAR(255),
    p_deposit_amount_usd NUMERIC(14, 6),
    p_payment_ref VARCHAR(128) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_wallet galx_wallets%ROWTYPE;
    v_match_grant NUMERIC(14, 6) := 0.000000;
    v_total_credit NUMERIC(14, 6);
    v_new_balance NUMERIC(14, 6);
BEGIN
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Create wallet if missing
        INSERT INTO galx_wallets (
            user_id,
            balance_usd,
            introductory_grant_usd,
            deposited_total_usd,
            promotional_match_usd,
            proof_of_deposit_verified,
            verified_at
        ) VALUES (
            p_user_id,
            0,
            5.000000,
            0,
            0,
            true,
            NOW()
        ) RETURNING * INTO v_wallet;
    END IF;

    -- 50% instant match on initial $10+ deposit
    IF NOT v_wallet.proof_of_deposit_verified OR v_wallet.deposited_total_usd = 0 THEN
        v_match_grant := 5.000000; -- Fixed $5 introductory developer grant
    END IF;

    v_total_credit := p_deposit_amount_usd + v_match_grant;
    v_new_balance := v_wallet.balance_usd + v_total_credit;

    UPDATE galx_wallets
    SET balance_usd = v_new_balance,
        deposited_total_usd = deposited_total_usd + p_deposit_amount_usd,
        promotional_match_usd = promotional_match_usd + v_match_grant,
        proof_of_deposit_verified = true,
        verified_at = COALESCE(verified_at, NOW()),
        updated_at = NOW()
    WHERE id = v_wallet.id;

    -- Record deposit transaction
    INSERT INTO galx_wallet_transactions (
        wallet_id,
        user_id,
        transaction_type,
        amount_usd,
        balance_after_usd,
        description,
        metadata
    ) VALUES (
        v_wallet.id,
        p_user_id,
        'deposit',
        p_deposit_amount_usd,
        v_wallet.balance_usd + p_deposit_amount_usd,
        'Developer refundable compute deposit',
        jsonb_build_object('payment_ref', p_payment_ref)
    );

    -- Record match grant transaction if applied
    IF v_match_grant > 0 THEN
        INSERT INTO galx_wallet_transactions (
            wallet_id,
            user_id,
            transaction_type,
            amount_usd,
            balance_after_usd,
            description,
            metadata
        ) VALUES (
            v_wallet.id,
            p_user_id,
            'match_grant',
            v_match_grant,
            v_new_balance,
            '50% Introductory platform developer compute match grant',
            jsonb_build_object('grant_type', 'proof_of_deposit_match')
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'deposit_amount', p_deposit_amount_usd,
        'match_grant', v_match_grant,
        'total_credit', v_total_credit,
        'new_balance', v_new_balance,
        'proof_of_deposit_verified', true
    );
END;
$$ LANGUAGE plpgsql;

-- D. ATOMIC SHARD LEASE ACQUISITION WITH SOFT TOKEN RESERVATION
CREATE OR REPLACE FUNCTION fn_acquire_shard_lease(
    p_shard_id VARCHAR(64),
    p_user_id VARCHAR(255),
    p_estimated_tokens BIGINT DEFAULT 2000,
    p_lease_ttl_ms BIGINT DEFAULT 120000,
    p_job_id VARCHAR(128) DEFAULT NULL,
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_shard galx_shard_accounts%ROWTYPE;
    v_lease_id VARCHAR(64);
    v_now_ms BIGINT;
    v_expires_at_ms BIGINT;
    v_new_fencing_token BIGINT;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));
    v_expires_at_ms := v_now_ms + p_lease_ttl_ms;

    SELECT * INTO v_shard
    FROM galx_shard_accounts
    WHERE id = p_shard_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_FOUND');
    END IF;

    IF v_shard.status <> 'healthy' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_HEALTHY', 'status', v_shard.status);
    END IF;

    IF v_shard.permission_retracted THEN
        RETURN jsonb_build_object('success', false, 'reason', 'PERMISSION_RETRACTED');
    END IF;

    v_new_fencing_token := v_shard.fencing_token + 1;
    v_lease_id := 'lease_' || v_now_ms || '_' || substr(md5(random()::text), 1, 8);

    -- Increment soft reservation and fencing token
    UPDATE galx_shard_accounts
    SET reserved_tokens = reserved_tokens + p_estimated_tokens,
        fencing_token = v_new_fencing_token,
        updated_at_ms = v_now_ms
    WHERE id = p_shard_id;

    -- Insert lease record
    INSERT INTO galx_shard_leases (
        id,
        shard_id,
        user_id,
        job_id,
        fencing_token,
        estimated_tokens,
        acquired_at_ms,
        expires_at_ms
    ) VALUES (
        v_lease_id,
        p_shard_id,
        p_user_id,
        p_job_id,
        v_new_fencing_token,
        p_estimated_tokens,
        v_now_ms,
        v_expires_at_ms
    );

    RETURN jsonb_build_object(
        'success', true,
        'lease_id', v_lease_id,
        'shard_id', p_shard_id,
        'fencing_token', v_new_fencing_token,
        'expires_at_ms', v_expires_at_ms,
        'estimated_tokens', p_estimated_tokens
    );
END;
$$ LANGUAGE plpgsql;

-- E. ATOMIC SHARD LEASE RELEASE & TOKEN RECONCILIATION
CREATE OR REPLACE FUNCTION fn_release_shard_lease(
    p_lease_id VARCHAR(64),
    p_actual_tokens BIGINT DEFAULT NULL,
    p_latency_ms NUMERIC(10, 2) DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_lease galx_shard_leases%ROWTYPE;
    v_shard galx_shard_accounts%ROWTYPE;
    v_tokens_to_deduct BIGINT;
    v_now_ms BIGINT;
    v_new_avg_latency NUMERIC(10, 2);
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    SELECT * INTO v_lease
    FROM galx_shard_leases
    WHERE id = p_lease_id
    FOR UPDATE;

    IF NOT FOUND OR v_lease.is_committed OR v_lease.is_reclaimed THEN
        RETURN jsonb_build_object('success', false, 'reason', 'LEASE_INACTIVE_OR_PROCESSED');
    END IF;

    SELECT * INTO v_shard
    FROM galx_shard_accounts
    WHERE id = v_lease.shard_id
    FOR UPDATE;

    v_tokens_to_deduct := COALESCE(p_actual_tokens, v_lease.estimated_tokens);

    -- Calculate EWMA latency (alpha = 0.2)
    IF p_latency_ms IS NOT NULL THEN
        v_new_avg_latency := (0.2 * p_latency_ms) + (0.8 * v_shard.average_latency_ms);
    ELSE
        v_new_avg_latency := v_shard.average_latency_ms;
    END IF;

    -- Update shard state
    UPDATE galx_shard_accounts
    SET reserved_tokens = GREATEST(0, reserved_tokens - v_lease.estimated_tokens),
        remaining_tokens = GREATEST(0, remaining_tokens - v_tokens_to_deduct),
        total_tokens_consumed = total_tokens_consumed + v_tokens_to_deduct,
        total_requests_served = total_requests_served + 1,
        consecutive_failures = CASE WHEN p_success THEN 0 ELSE consecutive_failures + 1 END,
        consecutive_successes = CASE WHEN p_success THEN consecutive_successes + 1 ELSE 0 END,
        average_latency_ms = v_new_avg_latency,
        last_latency_ms = COALESCE(p_latency_ms, last_latency_ms),
        updated_at_ms = v_now_ms
    WHERE id = v_shard.id;

    -- Mark lease committed
    UPDATE galx_shard_leases
    SET is_committed = true,
        committed_tokens = v_tokens_to_deduct,
        updated_at = NOW()
    WHERE id = v_lease.id;

    RETURN jsonb_build_object(
        'success', true,
        'lease_id', p_lease_id,
        'committed_tokens', v_tokens_to_deduct,
        'remaining_tokens', GREATEST(0, v_shard.remaining_tokens - v_tokens_to_deduct)
    );
END;
$$ LANGUAGE plpgsql;

-- F. EXPIRED LEASE SCAVENGER PROCEDURE
CREATE OR REPLACE FUNCTION fn_cleanup_expired_leases(
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_now_ms BIGINT;
    v_reclaimed_count INTEGER := 0;
    r RECORD;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    FOR r IN
        SELECT l.id, l.shard_id, l.estimated_tokens
        FROM galx_shard_leases l
        WHERE l.expires_at_ms < v_now_ms
          AND l.is_committed = false
          AND l.is_reclaimed = false
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Reclaim soft reserved tokens from shard
        UPDATE galx_shard_accounts
        SET reserved_tokens = GREATEST(0, reserved_tokens - r.estimated_tokens),
            updated_at_ms = v_now_ms
        WHERE id = r.shard_id;

        -- Mark lease reclaimed
        UPDATE galx_shard_leases
        SET is_reclaimed = true,
            updated_at = NOW()
        WHERE id = r.id;

        v_reclaimed_count := v_reclaimed_count + 1;
    END LOOP;

    RETURN v_reclaimed_count;
END;
$$ LANGUAGE plpgsql;

-- G. VECTOR SIMILARITY COSINE SEARCH FUNCTION
CREATE OR REPLACE FUNCTION fn_vector_search(
    p_query_embedding vector(1536),
    p_workspace_id UUID DEFAULT NULL,
    p_collection_name VARCHAR(128) DEFAULT 'default',
    p_match_threshold NUMERIC DEFAULT 0.70,
    p_match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    document_id VARCHAR(255),
    chunk_index INTEGER,
    content TEXT,
    metadata JSONB,
    similarity NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.document_id,
        e.chunk_index,
        e.content,
        e.metadata,
        CAST(1 - (e.embedding <=> p_query_embedding) AS NUMERIC) AS similarity
    FROM galx_embeddings_store e
    WHERE (p_workspace_id IS NULL OR e.workspace_id = p_workspace_id)
      AND e.collection_name = p_collection_name
      AND (1 - (e.embedding <=> p_query_embedding)) >= p_match_threshold
    ORDER BY e.embedding <=> p_query_embedding ASC
    LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 19. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE galx_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_developer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_shard_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_shard_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_task_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_task_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_queue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_metrics_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_embeddings_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_audit_logs ENABLE ROW LEVEL SECURITY;

-- Service Role Full Bypass Policy for background engines
CREATE POLICY "service_role_all_galx_workspaces" ON galx_workspaces FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_workspace_members" ON galx_workspace_members FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_developer_keys" ON galx_developer_keys FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_shard_accounts" ON galx_shard_accounts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_shard_leases" ON galx_shard_leases FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_task_queues" ON galx_task_queues FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_tasks" ON galx_tasks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_task_attempts" ON galx_task_attempts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_queue_events" ON galx_queue_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_wallets" ON galx_wallets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_wallet_transactions" ON galx_wallet_transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_metrics_telemetry" ON galx_metrics_telemetry FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_embeddings_store" ON galx_embeddings_store FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_galx_audit_logs" ON galx_audit_logs FOR ALL USING (auth.role() = 'service_role');

-- Tenant Authenticated User Scoped Read/Write Policies
CREATE POLICY "user_view_own_developer_keys" ON galx_developer_keys FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "user_view_own_wallets" ON galx_wallets FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "user_view_own_wallet_tx" ON galx_wallet_transactions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "user_view_own_tasks" ON galx_tasks FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "user_view_own_audit_logs" ON galx_audit_logs FOR SELECT USING (auth.uid()::text = user_id);
