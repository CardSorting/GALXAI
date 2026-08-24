-- ============================================================================
-- GALXAI: Complete Supabase PostgreSQL Backend Architecture Schema
-- Includes Core Substrate, 50% Match Ledger, CloudTasks Engine, pgvector,
-- Stripe-grade Idempotency, Distributed Advisory Locks, and Cloudflare Worker Batching.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. CUSTOM ENUMS
DO $$ BEGIN
    CREATE TYPE galx_provider_type AS ENUM ('openai', 'xai-grok');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE galx_auth_type AS ENUM ('api_key', 'oauth');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE galx_shard_mode AS ENUM ('pooled', 'private');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE galx_credential_status AS ENUM ('healthy', 'cooldown', 'exhausted', 'dead', 'paused', 'revoked');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE galx_rotation_strategy AS ENUM ('adaptive_headroom', 'smooth_weighted_round_robin', 'least_utilized', 'priority_failover');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE galx_queue_state AS ENUM ('RUNNING', 'PAUSED', 'DISABLED', 'DRAINING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE galx_task_status AS ENUM (
        'QUEUED', 'SCHEDULED', 'WAITING_DEPENDENCIES', 'DISPATCHING',
        'RUNNING', 'COMPLETED', 'RETRYING', 'CANCELLED', 'EXPIRED', 'DEAD_LETTERED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE galx_dispatch_target_type AS ENUM ('HTTP_PUSH', 'INTERNAL_MODEL', 'PULL_WORKER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE galx_wallet_transaction_type AS ENUM (
        'deposit', 'match_grant', 'usage_draw', 'auto_reload', 'refund', 'adjustment'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE galx_workspace_role AS ENUM ('owner', 'admin', 'developer', 'viewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE galx_environment_type AS ENUM ('production', 'staging', 'development');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE galx_idempotency_state AS ENUM ('IN_FLIGHT', 'COMMITTED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. WORKSPACES & RBAC
CREATE TABLE IF NOT EXISTS galx_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(32) NOT NULL DEFAULT 'standard',
    is_active BOOLEAN NOT NULL DEFAULT true,
    monthly_spend_cap_usd NUMERIC(12, 4) NOT NULL DEFAULT 1000.0000,
    current_month_spend_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS galx_workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES galx_workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    role galx_workspace_role NOT NULL DEFAULT 'developer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

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

-- 4. DEVELOPER API KEYS
CREATE TABLE IF NOT EXISTS galx_developer_keys (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(128) NOT NULL,
    prefix VARCHAR(32) NOT NULL,
    key_hash VARCHAR(64) UNIQUE NOT NULL,
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 600,
    total_requests BIGINT NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    spend_cap_usd NUMERIC(12, 4) DEFAULT NULL,
    current_spend_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
    allowed_models TEXT[] DEFAULT NULL,
    allowed_ips TEXT[] DEFAULT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_at TIMESTAMPTZ DEFAULT NULL,
    revoked_reason TEXT DEFAULT NULL,
    last_used_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_dev_keys_hash ON galx_developer_keys(key_hash) WHERE is_revoked = false;
CREATE INDEX IF NOT EXISTS idx_galx_dev_keys_user ON galx_developer_keys(user_id);

CREATE TABLE IF NOT EXISTS galx_api_key_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id VARCHAR(64) NOT NULL REFERENCES galx_developer_keys(id) ON DELETE CASCADE,
    scope VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(key_id, scope)
);

-- 5. SHARD ACCOUNTS & ENCRYPTED VAULT
CREATE TABLE IF NOT EXISTS galx_shard_accounts (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    provider galx_provider_type NOT NULL,
    auth_type galx_auth_type NOT NULL DEFAULT 'api_key',
    account_label VARCHAR(128) NOT NULL,
    api_key_masked VARCHAR(64) NOT NULL,
    encrypted_ciphertext TEXT NOT NULL,
    encrypted_iv VARCHAR(64) NOT NULL,
    encrypted_tag VARCHAR(64) NOT NULL,
    key_version VARCHAR(16) DEFAULT 'v1',
    shard_mode galx_shard_mode NOT NULL DEFAULT 'pooled',
    priority INTEGER NOT NULL DEFAULT 10,
    weight INTEGER NOT NULL DEFAULT 100,
    status galx_credential_status NOT NULL DEFAULT 'healthy',
    max_tokens BIGINT NOT NULL DEFAULT 10000000,
    remaining_tokens BIGINT NOT NULL DEFAULT 10000000,
    reserved_tokens BIGINT NOT NULL DEFAULT 0,
    refill_rate_per_minute BIGINT NOT NULL DEFAULT 10000000,
    max_requests INTEGER NOT NULL DEFAULT 10000,
    remaining_requests INTEGER NOT NULL DEFAULT 10000,
    last_refill_timestamp_ms BIGINT NOT NULL DEFAULT 0,
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

CREATE INDEX IF NOT EXISTS idx_galx_shards_provider ON galx_shard_accounts(provider, status, priority DESC);

-- 6. SHARD LEASES (2-PHASE RESERVATION)
CREATE TABLE IF NOT EXISTS galx_shard_leases (
    id VARCHAR(64) PRIMARY KEY,
    shard_id VARCHAR(64) NOT NULL REFERENCES galx_shard_accounts(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(255) NOT NULL,
    job_id VARCHAR(128) DEFAULT NULL,
    fencing_token BIGINT NOT NULL,
    estimated_tokens BIGINT NOT NULL,
    committed_tokens BIGINT DEFAULT NULL,
    acquired_at_ms BIGINT NOT NULL,
    expires_at_ms BIGINT NOT NULL,
    is_committed BOOLEAN NOT NULL DEFAULT false,
    is_reclaimed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_leases_active ON galx_shard_leases(expires_at_ms) WHERE is_committed = false AND is_reclaimed = false;

-- 7. CLOUDTASKS QUEUES & TASKS
CREATE TABLE IF NOT EXISTS galx_task_queues (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    description TEXT DEFAULT NULL,
    state galx_queue_state NOT NULL DEFAULT 'RUNNING',
    max_dispatches_per_second NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    max_concurrent_dispatches INTEGER NOT NULL DEFAULT 50,
    max_burst_size INTEGER NOT NULL DEFAULT 100,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    max_retry_duration_ms BIGINT DEFAULT NULL,
    min_backoff_ms INTEGER NOT NULL DEFAULT 1000,
    max_backoff_ms INTEGER NOT NULL DEFAULT 60000,
    max_doublings INTEGER NOT NULL DEFAULT 5,
    jitter_factor NUMERIC(4, 2) NOT NULL DEFAULT 0.20,
    dlq_target_queue_id VARCHAR(64) DEFAULT NULL,
    dlq_retention_ms BIGINT DEFAULT 604800000,
    dlq_webhook_url TEXT DEFAULT NULL,
    default_tenant_max_concurrency INTEGER NOT NULL DEFAULT 10,
    content_based_deduplication BOOLEAN NOT NULL DEFAULT false,
    default_deduplication_window_ms BIGINT NOT NULL DEFAULT 86400000,
    priority_aging_interval_ms BIGINT NOT NULL DEFAULT 30000,
    created_at_ms BIGINT NOT NULL,
    updated_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS galx_tasks (
    id VARCHAR(64) PRIMARY KEY,
    queue_id VARCHAR(64) NOT NULL REFERENCES galx_task_queues(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(128) DEFAULT NULL,
    content_hash VARCHAR(64) DEFAULT NULL,
    tag VARCHAR(64) DEFAULT NULL,
    group_id VARCHAR(128) DEFAULT NULL,
    depends_on TEXT[] NOT NULL DEFAULT '{}',
    priority INTEGER NOT NULL DEFAULT 50,
    target_type galx_dispatch_target_type NOT NULL DEFAULT 'INTERNAL_MODEL',
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
    parent_task_results JSONB NOT NULL DEFAULT '{}'::jsonb,
    progress JSONB DEFAULT NULL,
    active_pipeline_step_index INTEGER DEFAULT 0,
    pipeline_step_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    result JSONB DEFAULT NULL,
    last_error JSONB DEFAULT NULL,
    created_at_ms BIGINT NOT NULL,
    updated_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_tasks_lease ON galx_tasks(queue_id, status, schedule_time_ms, priority DESC);
CREATE INDEX IF NOT EXISTS idx_galx_tasks_group ON galx_tasks(queue_id, group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galx_tasks_idemp ON galx_tasks(queue_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS galx_task_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(64) NOT NULL REFERENCES galx_tasks(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    started_at_ms BIGINT NOT NULL,
    completed_at_ms BIGINT DEFAULT NULL,
    duration_ms INTEGER DEFAULT NULL,
    response_status_code INTEGER DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    error_details JSONB DEFAULT NULL,
    shard_id_used VARCHAR(64) DEFAULT NULL,
    model_used VARCHAR(128) DEFAULT NULL,
    worker_id VARCHAR(128) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS galx_queue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(64) UNIQUE NOT NULL,
    queue_id VARCHAR(64) NOT NULL REFERENCES galx_task_queues(id) ON DELETE CASCADE,
    task_id VARCHAR(64) REFERENCES galx_tasks(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. COMPUTE WALLET & 50% INSTANT MATCH LEDGER
CREATE TABLE IF NOT EXISTS galx_wallets (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    balance_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
    introductory_grant_usd NUMERIC(12, 6) NOT NULL DEFAULT 5.000000,
    deposited_total_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
    promotional_match_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
    lifetime_spent_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
    auto_reload_enabled BOOLEAN NOT NULL DEFAULT false,
    auto_reload_threshold_usd NUMERIC(12, 4) NOT NULL DEFAULT 10.0000,
    auto_reload_amount_usd NUMERIC(12, 4) NOT NULL DEFAULT 25.0000,
    auto_reload_payment_method_id VARCHAR(128) DEFAULT NULL,
    proof_of_deposit_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS galx_wallet_transactions (
    id VARCHAR(64) PRIMARY KEY,
    wallet_id VARCHAR(64) NOT NULL REFERENCES galx_wallets(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    transaction_type galx_wallet_transaction_type NOT NULL,
    amount_usd NUMERIC(12, 6) NOT NULL,
    balance_after_usd NUMERIC(12, 6) NOT NULL,
    description TEXT NOT NULL,
    api_key_id VARCHAR(64) REFERENCES galx_developer_keys(id) ON DELETE SET NULL,
    shard_id VARCHAR(64) REFERENCES galx_shard_accounts(id) ON DELETE SET NULL,
    model VARCHAR(128) DEFAULT NULL,
    prompt_tokens BIGINT NOT NULL DEFAULT 0,
    completion_tokens BIGINT NOT NULL DEFAULT 0,
    cached_tokens BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. METRICS & TELEMETRY
CREATE TABLE IF NOT EXISTS galx_metrics_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_galx_metrics_time ON galx_metrics_telemetry(timestamp_ms DESC);

-- 10. PGVECTOR EMBEDDINGS STORE WITH HYBRID FULL-TEXT SEARCH
CREATE TABLE IF NOT EXISTS galx_embeddings_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE CASCADE,
    collection_name VARCHAR(128) NOT NULL DEFAULT 'default',
    document_id VARCHAR(255) NOT NULL,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    tsv_content tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(1536) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_embeddings_hnsw ON galx_embeddings_store USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_galx_embeddings_tsv ON galx_embeddings_store USING gin(tsv_content);

-- 11. IDEMPOTENCY KEYS & DISTRIBUTED LOCKS
CREATE TABLE IF NOT EXISTS galx_idempotency_keys (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    endpoint VARCHAR(128) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_galx_idemp_lookup ON galx_idempotency_keys(user_id, endpoint, request_hash);

CREATE TABLE IF NOT EXISTS galx_distributed_locks (
    lock_key VARCHAR(128) PRIMARY KEY,
    owner_id VARCHAR(128) NOT NULL,
    fencing_token BIGINT NOT NULL DEFAULT 1,
    acquired_at_ms BIGINT NOT NULL,
    expires_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS galx_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(255) DEFAULT NULL,
    shard_id VARCHAR(64) DEFAULT NULL,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64) DEFAULT NULL,
    resource_id VARCHAR(128) DEFAULT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- Worker leasing with FOR UPDATE SKIP LOCKED
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
    v_lease_expiry_ms BIGINT;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));
    v_lease_expiry_ms := v_now_ms + p_lease_duration_ms;

    RETURN QUERY
    WITH candidate_tasks AS (
        SELECT t.id
        FROM galx_tasks t
        WHERE t.queue_id = p_queue_id
          AND t.status IN ('QUEUED', 'SCHEDULED', 'RETRYING')
          AND t.schedule_time_ms <= v_now_ms
          AND (p_tag_filter IS NULL OR t.tag = p_tag_filter)
          AND (p_group_id_filter IS NULL OR t.group_id = p_group_id_filter)
          AND (t.group_id IS NULL OR NOT EXISTS (
              SELECT 1 FROM galx_tasks active_g
              WHERE active_g.queue_id = p_queue_id
                AND active_g.group_id = t.group_id
                AND active_g.id <> t.id
                AND active_g.status IN ('DISPATCHING', 'RUNNING')
          ))
        ORDER BY
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
        lease_expires_at_ms = v_lease_expiry_ms,
        active_worker_id = p_worker_id,
        active_fencing_token = COALESCE(u.active_fencing_token, 0) + 1,
        updated_at_ms = v_now_ms,
        updated_at = NOW()
    FROM candidate_tasks c
    WHERE u.id = c.id
    RETURNING u.*;
END;
$$ LANGUAGE plpgsql;

-- Cloudflare Worker Batch Task Leasing
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

-- Micro-metered token draw
CREATE OR REPLACE FUNCTION fn_draw_wallet_tokens(
    p_user_id VARCHAR(255),
    p_cost_usd NUMERIC(12, 6),
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
    v_new_balance NUMERIC(12, 6);
    v_tx_id VARCHAR(64);
    v_trigger_auto_reload BOOLEAN := false;
BEGIN
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'WALLET_NOT_FOUND');
    END IF;

    IF v_wallet.balance_usd < p_cost_usd THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'INSUFFICIENT_FUNDS',
            'current_balance', v_wallet.balance_usd,
            'cost_usd', p_cost_usd
        );
    END IF;

    v_new_balance := v_wallet.balance_usd - p_cost_usd;
    v_tx_id := 'tx_' || CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT) || '_' || substr(md5(random()::text), 1, 6);

    UPDATE galx_wallets
    SET balance_usd = v_new_balance,
        lifetime_spent_usd = v_wallet.lifetime_spent_usd + p_cost_usd,
        updated_at = NOW()
    WHERE id = v_wallet.id;

    INSERT INTO galx_wallet_transactions (
        id, wallet_id, user_id, transaction_type, amount_usd, balance_after_usd,
        description, api_key_id, shard_id, model, prompt_tokens, completion_tokens, cached_tokens, metadata
    ) VALUES (
        v_tx_id, v_wallet.id, p_user_id, 'usage_draw', -p_cost_usd, v_new_balance,
        p_description, p_api_key_id, p_shard_id, p_model, p_prompt_tokens, p_completion_tokens, p_cached_tokens, p_metadata
    );

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

-- 50% Instant match verification
CREATE OR REPLACE FUNCTION fn_verify_deposit_and_match(
    p_user_id VARCHAR(255),
    p_deposit_amount_usd NUMERIC(12, 4),
    p_payment_ref VARCHAR(128) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_wallet galx_wallets%ROWTYPE;
    v_match_grant NUMERIC(12, 6) := 0;
    v_total_credit NUMERIC(12, 6);
    v_new_balance NUMERIC(12, 6);
    v_tx_dep_id VARCHAR(64);
    v_tx_match_id VARCHAR(64);
BEGIN
    SELECT * INTO v_wallet
    FROM galx_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO galx_wallets (
            id, user_id, balance_usd, introductory_grant_usd, deposited_total_usd, promotional_match_usd, proof_of_deposit_verified
        ) VALUES (
            'wallet_' || CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
            p_user_id, 0, 5.0, 0, 0, false
        ) RETURNING * INTO v_wallet;
    END IF;

    IF NOT v_wallet.proof_of_deposit_verified AND p_deposit_amount_usd >= 10.0 THEN
        v_match_grant := 5.000000;
    END IF;

    v_total_credit := p_deposit_amount_usd + v_match_grant;
    v_new_balance := v_wallet.balance_usd + v_total_credit;

    v_tx_dep_id := 'tx_' || CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT) || '_dep';
    v_tx_match_id := 'tx_' || CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT) || '_match';

    UPDATE galx_wallets
    SET balance_usd = v_new_balance,
        deposited_total_usd = v_wallet.deposited_total_usd + p_deposit_amount_usd,
        promotional_match_usd = v_wallet.promotional_match_usd + v_match_grant,
        proof_of_deposit_verified = true,
        verified_at = NOW(),
        updated_at = NOW()
    WHERE id = v_wallet.id;

    INSERT INTO galx_wallet_transactions (
        id, wallet_id, user_id, transaction_type, amount_usd, balance_after_usd, description, metadata
    ) VALUES (
        v_tx_dep_id, v_wallet.id, p_user_id, 'deposit', p_deposit_amount_usd, v_wallet.balance_usd + p_deposit_amount_usd,
        'Developer refundable compute deposit', jsonb_build_object('payment_ref', p_payment_ref)
    );

    IF v_match_grant > 0 THEN
        INSERT INTO galx_wallet_transactions (
            id, wallet_id, user_id, transaction_type, amount_usd, balance_after_usd, description, metadata
        ) VALUES (
            v_tx_match_id, v_wallet.id, p_user_id, 'match_grant', v_match_grant, v_new_balance,
            '50% Introductory promotional compute match grant ($5 on $10 deposit)', jsonb_build_object('rule', 'ADR_0007_MATCH')
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

-- 2-Phase Shard lease reservation
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
    v_fencing BIGINT;
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

    IF (v_shard.remaining_tokens - v_shard.reserved_tokens) < p_estimated_tokens THEN
        RETURN jsonb_build_object('success', false, 'reason', 'INSUFFICIENT_HEADROOM');
    END IF;

    v_fencing := v_shard.fencing_token + 1;
    v_lease_id := 'lease_' || v_now_ms || '_' || substr(md5(random()::text), 1, 8);

    UPDATE galx_shard_accounts
    SET reserved_tokens = v_shard.reserved_tokens + p_estimated_tokens,
        fencing_token = v_fencing,
        updated_at_ms = v_now_ms,
        updated_at = NOW()
    WHERE id = p_shard_id;

    INSERT INTO galx_shard_leases (
        id, shard_id, workspace_id, user_id, job_id, fencing_token,
        estimated_tokens, acquired_at_ms, expires_at_ms
    ) VALUES (
        v_lease_id, p_shard_id, v_shard.workspace_id, p_user_id, p_job_id, v_fencing,
        p_estimated_tokens, v_now_ms, v_expires_at_ms
    );

    RETURN jsonb_build_object(
        'success', true,
        'lease_id', v_lease_id,
        'fencing_token', v_fencing,
        'expires_at_ms', v_expires_at_ms
    );
END;
$$ LANGUAGE plpgsql;

-- 2-Phase Shard lease release
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
    v_committed BIGINT;
    v_now_ms BIGINT;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    SELECT * INTO v_lease
    FROM galx_shard_leases
    WHERE id = p_lease_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'LEASE_NOT_FOUND');
    END IF;

    IF v_lease.is_committed OR v_lease.is_reclaimed THEN
        RETURN jsonb_build_object('success', false, 'reason', 'LEASE_ALREADY_SETTLED');
    END IF;

    SELECT * INTO v_shard
    FROM galx_shard_accounts
    WHERE id = v_lease.shard_id
    FOR UPDATE;

    v_committed := COALESCE(p_actual_tokens, v_lease.estimated_tokens);

    UPDATE galx_shard_accounts
    SET reserved_tokens = GREATEST(0, v_shard.reserved_tokens - v_lease.estimated_tokens),
        remaining_tokens = GREATEST(0, v_shard.remaining_tokens - v_committed),
        total_requests_served = v_shard.total_requests_served + 1,
        total_tokens_consumed = v_shard.total_tokens_consumed + v_committed,
        average_latency_ms = CASE 
            WHEN p_latency_ms IS NOT NULL THEN (0.8 * v_shard.average_latency_ms) + (0.2 * p_latency_ms)
            ELSE v_shard.average_latency_ms
        END,
        last_latency_ms = COALESCE(p_latency_ms, v_shard.last_latency_ms),
        consecutive_failures = CASE WHEN p_success THEN 0 ELSE v_shard.consecutive_failures + 1 END,
        consecutive_successes = CASE WHEN p_success THEN v_shard.consecutive_successes + 1 ELSE 0 END,
        updated_at_ms = v_now_ms,
        updated_at = NOW()
    WHERE id = v_lease.shard_id;

    UPDATE galx_shard_leases
    SET is_committed = true,
        committed_tokens = v_committed,
        updated_at = NOW()
    WHERE id = p_lease_id;

    RETURN jsonb_build_object(
        'success', true,
        'lease_id', p_lease_id,
        'committed_tokens', v_committed
    );
END;
$$ LANGUAGE plpgsql;

-- Scavenger
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
        FOR UPDATE
    LOOP
        UPDATE galx_shard_accounts
        SET reserved_tokens = GREATEST(0, reserved_tokens - r.estimated_tokens),
            updated_at_ms = v_now_ms,
            updated_at = NOW()
        WHERE id = r.shard_id;

        UPDATE galx_shard_leases
        SET is_reclaimed = true,
            updated_at = NOW()
        WHERE id = r.id;

        v_reclaimed_count := v_reclaimed_count + 1;
    END LOOP;

    RETURN v_reclaimed_count;
END;
$$ LANGUAGE plpgsql;

-- Hybrid search
CREATE OR REPLACE FUNCTION fn_hybrid_vector_search(
    p_query_text TEXT,
    p_query_embedding vector(1536),
    p_workspace_id UUID DEFAULT NULL,
    p_collection_name VARCHAR(128) DEFAULT 'default',
    p_alpha NUMERIC DEFAULT 0.5,
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

-- Idempotency begin
CREATE OR REPLACE FUNCTION fn_idempotency_begin(
    p_idempotency_key VARCHAR(128),
    p_user_id VARCHAR(255),
    p_endpoint VARCHAR(128),
    p_request_hash VARCHAR(64),
    p_ttl_ms BIGINT DEFAULT 86400000
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
        IF v_existing.request_hash <> p_request_hash THEN
            RETURN jsonb_build_object('status', 'MISMATCH_ERROR', 'message', 'Idempotency key reused with different request payload.');
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
            RETURN jsonb_build_object('status', 'IN_FLIGHT', 'message', 'A request with this idempotency key is currently in flight.');
        END IF;
    END IF;

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

-- Idempotency commit
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

-- Advisory Lock Acquire
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

-- Advisory Lock Release
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

-- ============================================================================
-- SECTION 13: BATCH PROCEDURES (Cloudflare Edge Mesh)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_batch_draw_wallet_tokens_cf(
    p_draws JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_user_id VARCHAR(255);
    v_cost_usd NUMERIC(12, 6);
    v_desc TEXT;
    v_model VARCHAR(128);
    v_prompt_tokens BIGINT;
    v_comp_tokens BIGINT;
    v_cached_tokens BIGINT;
    v_api_key_id VARCHAR(64);
    v_shard_id VARCHAR(64);
    v_wallet galx_wallets%ROWTYPE;
    v_new_balance NUMERIC(12, 6);
    v_tx_id VARCHAR(64);
    v_now_ms BIGINT;
    v_results JSONB := '[]'::jsonb;
BEGIN
    v_now_ms := CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT);

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_draws)
    LOOP
        v_user_id := v_item->>'userId';
        v_cost_usd := CAST(v_item->>'costUsd' AS NUMERIC(12, 6));
        v_desc := COALESCE(v_item->>'description', 'Batch token draw');
        v_model := v_item->>'model';
        v_prompt_tokens := COALESCE(CAST(v_item->>'promptTokens' AS BIGINT), 0);
        v_comp_tokens := COALESCE(CAST(v_item->>'completionTokens' AS BIGINT), 0);
        v_cached_tokens := COALESCE(CAST(v_item->>'cachedTokens' AS BIGINT), 0);
        v_api_key_id := v_item->>'apiKeyId';
        v_shard_id := v_item->>'shardId';

        SELECT * INTO v_wallet
        FROM galx_wallets
        WHERE user_id = v_user_id
        FOR UPDATE;

        IF NOT FOUND OR v_wallet.balance_usd < v_cost_usd THEN
            v_results := v_results || jsonb_build_object(
                'userId', v_user_id,
                'success', false,
                'reason', CASE WHEN NOT FOUND THEN 'WALLET_NOT_FOUND' ELSE 'INSUFFICIENT_FUNDS' END
            );
        ELSE
            v_new_balance := v_wallet.balance_usd - v_cost_usd;
            v_tx_id := 'tx_' || v_now_ms || '_' || substr(md5(random()::text), 1, 6);

            UPDATE galx_wallets
            SET balance_usd = v_new_balance,
                lifetime_spent_usd = v_wallet.lifetime_spent_usd + v_cost_usd,
                updated_at = NOW()
            WHERE id = v_wallet.id;

            INSERT INTO galx_wallet_transactions (
                id, wallet_id, user_id, transaction_type, amount_usd, balance_after_usd,
                description, api_key_id, shard_id, model, prompt_tokens, completion_tokens, cached_tokens, metadata
            ) VALUES (
                v_tx_id, v_wallet.id, v_user_id, 'usage_draw', -v_cost_usd, v_new_balance,
                v_desc, v_api_key_id, v_shard_id, v_model, v_prompt_tokens, v_comp_tokens, v_cached_tokens,
                COALESCE(v_item->'metadata', '{}'::jsonb)
            );

            v_results := v_results || jsonb_build_object(
                'userId', v_user_id,
                'success', true,
                'transactionId', v_tx_id,
                'newBalance', v_new_balance,
                'costUsd', v_cost_usd
            );
        END IF;
    END LOOP;

    RETURN v_results;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_batch_commit_task_attempts_cf(
    p_attempts JSONB
)
RETURNS INTEGER AS $$
DECLARE
    v_item JSONB;
    v_task_id VARCHAR(64);
    v_count INTEGER := 0;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_attempts)
    LOOP
        v_task_id := v_item->>'taskId';

        INSERT INTO galx_task_attempts (
            task_id, attempt_number, started_at_ms, completed_at_ms, duration_ms,
            response_status_code, error_message, worker_id, created_at
        ) VALUES (
            v_task_id,
            COALESCE(CAST(v_item->>'attemptNumber' AS INTEGER), 1),
            CAST(v_item->>'startedAtMs' AS BIGINT),
            CAST(v_item->>'completedAtMs' AS BIGINT),
            CAST(v_item->>'durationMs' AS INTEGER),
            CAST(v_item->>'statusCode' AS INTEGER),
            v_item->>'errorMessage',
            v_item->>'workerId',
            v_now
        );

        IF v_item ? 'status' THEN
            UPDATE galx_tasks
            SET status = CAST(v_item->>'status' AS galx_task_status),
                result = COALESCE(v_item->'result', result),
                last_error = COALESCE(v_item->'lastError', last_error),
                updated_at_ms = CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
                updated_at = v_now
            WHERE id = v_task_id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_batch_record_telemetry_cf(
    p_samples JSONB
)
RETURNS INTEGER AS $$
DECLARE
    v_item JSONB;
    v_count INTEGER := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_samples)
    LOOP
        INSERT INTO galx_metrics_telemetry (
            provider, model_id, shard_id, latency_ms,
            prompt_tokens, completion_tokens, total_tokens,
            is_error, status_code, timestamp_ms
        ) VALUES (
            CAST(v_item->>'provider' AS galx_provider_type),
            v_item->>'modelId',
            v_item->>'shardId',
            CAST(v_item->>'latencyMs' AS NUMERIC(10, 2)),
            COALESCE(CAST(v_item->>'promptTokens' AS INTEGER), 0),
            COALESCE(CAST(v_item->>'completionTokens' AS INTEGER), 0),
            COALESCE(CAST(v_item->>'totalTokens' AS INTEGER), 0),
            COALESCE(CAST(v_item->>'isError' AS BOOLEAN), false),
            COALESCE(CAST(v_item->>'statusCode' AS INTEGER), 200),
            COALESCE(CAST(v_item->>'timestampMs' AS BIGINT), CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT))
        );
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 14: BUDGET ALERTS & ULTRA AUTHENTICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS galx_budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES galx_workspaces(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES galx_environments(id) ON DELETE CASCADE,
    threshold_percentage INTEGER NOT NULL CHECK (threshold_percentage BETWEEN 1 AND 100),
    notification_webhook_url TEXT NOT NULL,
    is_triggered BOOLEAN NOT NULL DEFAULT false,
    triggered_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, threshold_percentage)
);

CREATE INDEX IF NOT EXISTS idx_galx_budget_ws ON galx_budget_alerts(workspace_id, is_triggered);

CREATE OR REPLACE FUNCTION fn_check_budget_thresholds(
    p_workspace_id UUID,
    p_additional_spend_usd NUMERIC(12, 6) DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_ws galx_workspaces%ROWTYPE;
    v_new_spend NUMERIC(12, 6);
    v_pct NUMERIC(6, 2);
    v_alert RECORD;
    v_triggered_alerts JSONB := '[]'::jsonb;
BEGIN
    SELECT * INTO v_ws
    FROM galx_workspaces
    WHERE id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'WORKSPACE_NOT_FOUND');
    END IF;

    v_new_spend := v_ws.current_month_spend_usd + p_additional_spend_usd;

    IF v_ws.monthly_spend_cap_usd > 0 THEN
        v_pct := (v_new_spend / v_ws.monthly_spend_cap_usd) * 100;
    ELSE
        v_pct := 0;
    END IF;

    UPDATE galx_workspaces
    SET current_month_spend_usd = v_new_spend,
        updated_at = NOW()
    WHERE id = p_workspace_id;

    FOR v_alert IN
        SELECT *
        FROM galx_budget_alerts
        WHERE workspace_id = p_workspace_id
          AND is_triggered = false
          AND threshold_percentage <= v_pct
    LOOP
        UPDATE galx_budget_alerts
        SET is_triggered = true,
            triggered_at = NOW(),
            updated_at = NOW()
        WHERE id = v_alert.id;

        v_triggered_alerts := v_triggered_alerts || jsonb_build_object(
            'alertId', v_alert.id,
            'thresholdPercentage', v_alert.threshold_percentage,
            'webhookUrl', v_alert.notification_webhook_url,
            'currentSpendUsd', v_new_spend,
            'spendCapUsd', v_ws.monthly_spend_cap_usd
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'currentSpendUsd', v_new_spend,
        'spendCapUsd', v_ws.monthly_spend_cap_usd,
        'percentageUsed', v_pct,
        'isCapped', (v_new_spend >= v_ws.monthly_spend_cap_usd),
        'triggeredAlerts', v_triggered_alerts
    );
END;
$$ LANGUAGE plpgsql;

ALTER TABLE galx_budget_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_galx_budget_alerts" ON galx_budget_alerts FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SECTION 15: QUANTUM-GRADE SHARD HEALTH & WEBHOOK AUDIT
-- ============================================================================

CREATE TABLE IF NOT EXISTS galx_shard_health_probes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shard_id VARCHAR(64) NOT NULL REFERENCES galx_shard_accounts(id) ON DELETE CASCADE,
    worker_id VARCHAR(128) NOT NULL,
    latency_ms NUMERIC(10, 2) NOT NULL,
    status_code INTEGER NOT NULL,
    is_success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT DEFAULT NULL,
    probe_timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_health_shard_time ON galx_shard_health_probes(shard_id, probe_timestamp_ms DESC);

CREATE TABLE IF NOT EXISTS galx_webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL,
    target_url TEXT NOT NULL,
    status_code INTEGER,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    duration_ms INTEGER,
    is_success BOOLEAN NOT NULL DEFAULT false,
    response_body TEXT DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    delivered_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_webhooks_event ON galx_webhook_deliveries(event_type, delivered_at_ms DESC);

CREATE OR REPLACE FUNCTION fn_report_shard_health_cf(
    p_probes JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_shard_id VARCHAR(64);
    v_success BOOLEAN;
    v_latency NUMERIC(10, 2);
    v_status INTEGER;
    v_consecutive_failures INTEGER;
    v_avg_latency NUMERIC(10, 2);
    v_updated_shards JSONB := '[]'::jsonb;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_probes)
    LOOP
        v_shard_id := v_item->>'shardId';
        v_latency := CAST(v_item->>'latencyMs' AS NUMERIC(10, 2));
        v_status := COALESCE(CAST(v_item->>'statusCode' AS INTEGER), 200);
        v_success := COALESCE(CAST(v_item->>'isSuccess' AS BOOLEAN), true);

        INSERT INTO galx_shard_health_probes (
            shard_id, worker_id, latency_ms, status_code, is_success, error_message, probe_timestamp_ms
        ) VALUES (
            v_shard_id,
            v_item->>'workerId',
            v_latency,
            v_status,
            v_success,
            v_item->>'errorMessage',
            COALESCE(CAST(v_item->>'timestampMs' AS BIGINT), CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT))
        );

        SELECT 
            COUNT(*) FILTER (WHERE is_success = false),
            COALESCE(AVG(latency_ms), 200.0)
        INTO v_consecutive_failures, v_avg_latency
        FROM (
            SELECT is_success, latency_ms
            FROM galx_shard_health_probes
            WHERE shard_id = v_shard_id
            ORDER BY probe_timestamp_ms DESC
            LIMIT 10
        ) sub;

        IF v_consecutive_failures >= 5 THEN
            UPDATE galx_shard_accounts
            SET status = 'draining',
                updated_at_ms = CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
                updated_at = NOW()
            WHERE id = v_shard_id;

            v_updated_shards := v_updated_shards || jsonb_build_object(
                'shardId', v_shard_id,
                'newStatus', 'draining',
                'reason', 'CONSECUTIVE_FAILURES_EXCEEDED'
            );
        ELSIF v_consecutive_failures >= 2 THEN
            UPDATE galx_shard_accounts
            SET status = 'degraded',
                updated_at_ms = CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
                updated_at = NOW()
            WHERE id = v_shard_id AND status = 'healthy';
        ELSIF v_consecutive_failures = 0 THEN
            UPDATE galx_shard_accounts
            SET status = 'healthy',
                updated_at_ms = CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
                updated_at = NOW()
            WHERE id = v_shard_id AND status = 'degraded';
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'probesIngested', jsonb_array_length(p_probes),
        'statusTransitions', v_updated_shards
    );
END;
$$ LANGUAGE plpgsql;

ALTER TABLE galx_shard_health_probes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_galx_shard_health" ON galx_shard_health_probes FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE galx_webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_galx_webhook_deliveries" ON galx_webhook_deliveries FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 23. HARDENED USER SESSIONS & PROVIDER-AS-AUTH SUBSTRATE
-- ============================================================================

CREATE TABLE IF NOT EXISTS galx_user_sessions (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(255) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    shard_id VARCHAR(64) REFERENCES galx_shard_accounts(id) ON DELETE SET NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(64) UNIQUE,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_at TIMESTAMPTZ DEFAULT NULL,
    revoked_reason TEXT DEFAULT NULL,
    issued_at_ms BIGINT NOT NULL,
    expires_at_ms BIGINT NOT NULL,
    last_active_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_sessions_token_hash ON galx_user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_user_id ON galx_user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_shard_id ON galx_user_sessions(shard_id);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_expires_at ON galx_user_sessions(expires_at_ms);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_active ON galx_user_sessions(user_id, is_revoked, expires_at_ms);

CREATE OR REPLACE FUNCTION fn_create_user_session(
    p_id VARCHAR(64),
    p_user_id VARCHAR(255),
    p_provider VARCHAR(32),
    p_shard_id VARCHAR(64),
    p_token_hash VARCHAR(64),
    p_refresh_token_hash VARCHAR(64) DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_issued_at_ms BIGINT DEFAULT NULL,
    p_expires_at_ms BIGINT DEFAULT NULL,
    p_workspace_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now_ms BIGINT;
    v_issued_ms BIGINT;
    v_expires_ms BIGINT;
    v_session RECORD;
BEGIN
    v_now_ms := CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT);
    v_issued_ms := COALESCE(p_issued_at_ms, v_now_ms);
    v_expires_ms := COALESCE(p_expires_at_ms, v_now_ms + 2592000000);

    INSERT INTO galx_user_sessions (
        id,
        workspace_id,
        user_id,
        provider,
        shard_id,
        token_hash,
        refresh_token_hash,
        ip_address,
        user_agent,
        is_revoked,
        issued_at_ms,
        expires_at_ms,
        last_active_at_ms,
        created_at,
        updated_at
    ) VALUES (
        p_id,
        p_workspace_id,
        p_user_id,
        p_provider,
        p_shard_id,
        p_token_hash,
        p_refresh_token_hash,
        p_ip_address,
        p_user_agent,
        false,
        v_issued_ms,
        v_expires_ms,
        v_now_ms,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        token_hash = EXCLUDED.token_hash,
        refresh_token_hash = COALESCE(EXCLUDED.refresh_token_hash, galx_user_sessions.refresh_token_hash),
        shard_id = COALESCE(EXCLUDED.shard_id, galx_user_sessions.shard_id),
        last_active_at_ms = v_now_ms,
        is_revoked = false,
        revoked_at = NULL,
        revoked_reason = NULL,
        updated_at = NOW()
    RETURNING * INTO v_session;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session.id,
        'user_id', v_session.user_id,
        'provider', v_session.provider,
        'shard_id', v_session.shard_id,
        'expires_at_ms', v_session.expires_at_ms
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_verify_user_session(
    p_token_hash VARCHAR(64),
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now_ms BIGINT;
    v_session RECORD;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    SELECT * INTO v_session
    FROM galx_user_sessions
    WHERE token_hash = p_token_hash;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'SESSION_NOT_FOUND');
    END IF;

    IF v_session.is_revoked THEN
        RETURN jsonb_build_object('success', false, 'reason', 'SESSION_REVOKED', 'revoked_reason', v_session.revoked_reason);
    END IF;

    IF v_session.expires_at_ms <= v_now_ms THEN
        RETURN jsonb_build_object('success', false, 'reason', 'SESSION_EXPIRED');
    END IF;

    UPDATE galx_user_sessions
    SET last_active_at_ms = v_now_ms,
        updated_at = NOW()
    WHERE id = v_session.id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session.id,
        'user_id', v_session.user_id,
        'provider', v_session.provider,
        'shard_id', v_session.shard_id,
        'workspace_id', v_session.workspace_id,
        'expires_at_ms', v_session.expires_at_ms,
        'issued_at_ms', v_session.issued_at_ms,
        'last_active_at_ms', v_now_ms
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_revoke_user_session(
    p_session_id VARCHAR(64),
    p_reason TEXT DEFAULT 'User requested logout',
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now_ms BIGINT;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    UPDATE galx_user_sessions
    SET is_revoked = true,
        revoked_at = NOW(),
        revoked_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'session_id', p_session_id, 'revoked_at_ms', v_now_ms);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_revoke_all_user_sessions(
    p_user_id VARCHAR(255),
    p_reason TEXT DEFAULT 'Global logout from all devices',
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_revoked_count INTEGER;
BEGIN
    UPDATE galx_user_sessions
    SET is_revoked = true,
        revoked_at = NOW(),
        revoked_reason = p_reason,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND is_revoked = false;

    GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'revoked_count', v_revoked_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_cleanup_expired_sessions(
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_now_ms BIGINT;
    v_deleted_count INTEGER := 0;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    DELETE FROM galx_user_sessions
    WHERE expires_at_ms < v_now_ms
       OR (is_revoked = true AND updated_at < NOW() - INTERVAL '7 days');

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE galx_user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_galx_user_sessions" ON galx_user_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "user_view_own_sessions" ON galx_user_sessions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "user_delete_own_sessions" ON galx_user_sessions FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================================================
-- 24. ADVANCED TOKEN ROTATION, REUSE ATTACK DETECTION, & MULTI-DEVICE SUBSTRATE
-- ============================================================================

ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS session_family_id VARCHAR(64);
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS sequence_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS fingerprint_hash VARCHAR(64) DEFAULT NULL;
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS previous_token_hash VARCHAR(64) DEFAULT NULL;
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS grace_period_until_ms BIGINT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_galx_sessions_family_id ON galx_user_sessions(session_family_id);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_prev_hash ON galx_user_sessions(previous_token_hash);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_fpt ON galx_user_sessions(fingerprint_hash);

CREATE TABLE IF NOT EXISTS galx_token_revocation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    revocation_reason VARCHAR(128) NOT NULL,
    is_threat_event BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_revocation_user_id ON galx_token_revocation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_revocation_threat ON galx_token_revocation_log(is_threat_event);

CREATE OR REPLACE FUNCTION fn_rotate_session_token_atomic(
    p_old_token_hash VARCHAR(64),
    p_new_token_hash VARCHAR(64),
    p_new_expires_at_ms BIGINT,
    p_new_fingerprint VARCHAR(64) DEFAULT NULL,
    p_grace_window_ms BIGINT DEFAULT 30000,
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now_ms BIGINT;
    v_session RECORD;
    v_grace_session RECORD;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    SELECT * INTO v_session
    FROM galx_user_sessions
    WHERE token_hash = p_old_token_hash;

    IF FOUND THEN
        IF v_session.is_revoked THEN
            RETURN jsonb_build_object('success', false, 'reason', 'SESSION_REVOKED', 'reuse_detected', false);
        END IF;

        IF v_session.expires_at_ms <= v_now_ms THEN
            RETURN jsonb_build_object('success', false, 'reason', 'SESSION_EXPIRED', 'reuse_detected', false);
        END IF;

        UPDATE galx_user_sessions
        SET previous_token_hash = p_old_token_hash,
            token_hash = p_new_token_hash,
            sequence_number = sequence_number + 1,
            fingerprint_hash = COALESCE(p_new_fingerprint, fingerprint_hash),
            expires_at_ms = p_new_expires_at_ms,
            grace_period_until_ms = v_now_ms + p_grace_window_ms,
            last_active_at_ms = v_now_ms,
            updated_at = NOW()
        WHERE id = v_session.id;

        RETURN jsonb_build_object(
            'success', true,
            'session_id', v_session.id,
            'sequence_number', v_session.sequence_number + 1,
            'expires_at_ms', p_new_expires_at_ms,
            'reuse_detected', false
        );
    END IF;

    SELECT * INTO v_grace_session
    FROM galx_user_sessions
    WHERE previous_token_hash = p_old_token_hash;

    IF FOUND THEN
        IF v_now_ms <= COALESCE(v_grace_session.grace_period_until_ms, 0) THEN
            RETURN jsonb_build_object(
                'success', true,
                'session_id', v_grace_session.id,
                'sequence_number', v_grace_session.sequence_number,
                'expires_at_ms', v_grace_session.expires_at_ms,
                'is_grace_replay', true,
                'reuse_detected', false
            );
        END IF;

        UPDATE galx_user_sessions
        SET is_revoked = true,
            revoked_at = NOW(),
            revoked_reason = 'TOKEN_REUSE_ATTACK_DETECTED: Automatic session family termination',
            updated_at = NOW()
        WHERE session_family_id = v_grace_session.session_family_id
           OR id = v_grace_session.id;

        INSERT INTO galx_token_revocation_log (
            session_id, user_id, token_hash, revocation_reason, is_threat_event, metadata
        ) VALUES (
            v_grace_session.id,
            v_grace_session.user_id,
            p_old_token_hash,
            'TOKEN_REUSE_ATTACK_DETECTED',
            true,
            jsonb_build_object('timestamp_ms', v_now_ms, 'family_id', v_grace_session.session_family_id)
        );

        RETURN jsonb_build_object(
            'success', false,
            'reason', 'TOKEN_REUSE_ATTACK_DETECTED',
            'reuse_detected', true,
            'session_id', v_grace_session.id,
            'family_id', v_grace_session.session_family_id
        );
    END IF;

    RETURN jsonb_build_object('success', false, 'reason', 'SESSION_NOT_FOUND', 'reuse_detected', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_revoke_other_user_sessions(
    p_user_id VARCHAR(255),
    p_current_session_id VARCHAR(64),
    p_reason TEXT DEFAULT 'User requested remote device logout',
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_revoked_count INTEGER;
BEGIN
    UPDATE galx_user_sessions
    SET is_revoked = true,
        revoked_at = NOW(),
        revoked_reason = p_reason,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND id != p_current_session_id
      AND is_revoked = false;

    GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'revoked_count', v_revoked_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_revoke_session_family(
    p_family_id VARCHAR(64),
    p_reason TEXT DEFAULT 'Session lineage family revocation',
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_revoked_count INTEGER;
BEGIN
    UPDATE galx_user_sessions
    SET is_revoked = true,
        revoked_at = NOW(),
        revoked_reason = p_reason,
        updated_at = NOW()
    WHERE session_family_id = p_family_id
      AND is_revoked = false;

    GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'family_id', p_family_id, 'revoked_count', v_revoked_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE galx_token_revocation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_galx_token_revocation" ON galx_token_revocation_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "user_view_own_revocation_logs" ON galx_token_revocation_log FOR SELECT USING (auth.uid()::text = user_id);

-- ============================================================================
-- 25. STEP-UP SUDO MODE, RISK SCORING TELEMETRY, & KMS RE-WRAPPING SUBSTRATE
-- ============================================================================

ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS sudo_elevated_until_ms BIGINT DEFAULT NULL;
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE galx_user_sessions ADD COLUMN IF NOT EXISTS scopes TEXT[] NOT NULL DEFAULT ARRAY['*']::text[];

CREATE INDEX IF NOT EXISTS idx_galx_sessions_sudo ON galx_user_sessions(sudo_elevated_until_ms);
CREATE INDEX IF NOT EXISTS idx_galx_sessions_risk ON galx_user_sessions(risk_score);

CREATE TABLE IF NOT EXISTS galx_session_risk_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    risk_score INTEGER NOT NULL,
    risk_factors JSONB DEFAULT '[]'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_risk_user_id ON galx_session_risk_events(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_risk_score ON galx_session_risk_events(risk_score);

CREATE OR REPLACE FUNCTION fn_elevate_session_sudo(
    p_session_id VARCHAR(64),
    p_user_id VARCHAR(255),
    p_duration_ms BIGINT DEFAULT 900000,
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now_ms BIGINT;
    v_elevated_until BIGINT;
    v_session RECORD;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));
    v_elevated_until := v_now_ms + p_duration_ms;

    SELECT * INTO v_session
    FROM galx_user_sessions
    WHERE id = p_session_id
      AND user_id = p_user_id
      AND is_revoked = false;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND_OR_REVOKED');
    END IF;

    UPDATE galx_user_sessions
    SET sudo_elevated_until_ms = v_elevated_until,
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'sudo_active', true,
        'sudo_elevated_until_ms', v_elevated_until,
        'expires_in_ms', p_duration_ms
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_reencrypt_vault_shard_record(
    p_shard_id VARCHAR(128),
    p_new_encrypted_payload JSONB,
    p_new_version VARCHAR(32) DEFAULT 'v2',
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now_ms BIGINT;
    v_shard RECORD;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    SELECT * INTO v_shard
    FROM galx_shard_accounts
    WHERE id = p_shard_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SHARD_NOT_FOUND');
    END IF;

    UPDATE galx_shard_accounts
    SET encrypted_secrets = p_new_encrypted_payload,
        encrypted_payload = p_new_encrypted_payload,
        updated_at_ms = v_now_ms
    WHERE id = p_shard_id;

    RETURN jsonb_build_object(
        'success', true,
        'shard_id', p_shard_id,
        'key_version', p_new_version,
        'reencrypted_at_ms', v_now_ms
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE galx_session_risk_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_galx_session_risk_events" ON galx_session_risk_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "user_view_own_risk_events" ON galx_session_risk_events FOR SELECT USING (auth.uid()::text = user_id);

-- ============================================================================
-- 20260822000009_galxai_oauth_authoritative_mesh.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS galx_oauth_identities (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('openai', 'xai-grok', 'anthropic')),
    provider_account_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    shard_id VARCHAR(64) REFERENCES galx_shard_accounts(id) ON DELETE SET NULL,
    encrypted_access_token JSONB NOT NULL,
    encrypted_refresh_token JSONB,
    id_token_claims JSONB,
    scopes TEXT[],
    expires_at TIMESTAMPTZ,
    last_refreshed_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'needs_reauth')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_galx_oauth_identity_user_provider UNIQUE(user_id, provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS galx_oauth_requests (
    id VARCHAR(64) PRIMARY KEY,
    state VARCHAR(255) NOT NULL UNIQUE,
    code_verifier VARCHAR(255) NOT NULL,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('openai', 'xai-grok', 'anthropic')),
    redirect_uri TEXT NOT NULL,
    mode VARCHAR(32) NOT NULL DEFAULT 'pooled',
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(255),
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    is_consumed BOOLEAN NOT NULL DEFAULT false,
    consumed_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS galx_oauth_device_codes (
    id VARCHAR(64) PRIMARY KEY,
    device_code VARCHAR(128) NOT NULL UNIQUE,
    user_code VARCHAR(16) NOT NULL UNIQUE,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('openai', 'xai-grok', 'anthropic')),
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
    session_token TEXT DEFAULT NULL,
    token_record JSONB DEFAULT NULL,
    user_id VARCHAR(255) DEFAULT NULL,
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    polling_interval_sec INT NOT NULL DEFAULT 5,
    last_polled_at_ms BIGINT DEFAULT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS galx_oauth_pushed_requests (
    id VARCHAR(64) PRIMARY KEY,
    request_uri VARCHAR(128) NOT NULL UNIQUE,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('openai', 'xai-grok', 'anthropic')),
    client_id VARCHAR(255) NOT NULL,
    redirect_uri TEXT NOT NULL,
    scope TEXT DEFAULT NULL,
    code_challenge VARCHAR(255) DEFAULT NULL,
    code_challenge_method VARCHAR(32) DEFAULT 'S256',
    state VARCHAR(255) DEFAULT NULL,
    response_type VARCHAR(32) DEFAULT 'code',
    workspace_id UUID REFERENCES galx_workspaces(id) ON DELETE SET NULL,
    is_consumed BOOLEAN NOT NULL DEFAULT false,
    consumed_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_user ON galx_oauth_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_provider ON galx_oauth_identities(provider);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_shard ON galx_oauth_identities(shard_id);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_active ON galx_oauth_identities(user_id, provider) WHERE status != 'revoked';
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_expiring ON galx_oauth_identities(expires_at) WHERE status = 'active' AND expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_galx_oauth_req_state ON galx_oauth_requests(state);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_req_ws ON galx_oauth_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_req_unconsumed ON galx_oauth_requests(state, provider) WHERE is_consumed = false;
CREATE INDEX IF NOT EXISTS idx_galx_oauth_req_expires ON galx_oauth_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_galx_oauth_dev_code ON galx_oauth_device_codes(device_code);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_dev_user ON galx_oauth_device_codes(user_code);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_dev_ws ON galx_oauth_device_codes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_dev_pending ON galx_oauth_device_codes(user_code) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_galx_oauth_par_uri ON galx_oauth_pushed_requests(request_uri);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_par_ws ON galx_oauth_pushed_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_oauth_par_unconsumed ON galx_oauth_pushed_requests(request_uri) WHERE is_consumed = false;

ALTER TABLE galx_oauth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_oauth_identities FORCE ROW LEVEL SECURITY;

ALTER TABLE galx_oauth_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_oauth_requests FORCE ROW LEVEL SECURITY;

ALTER TABLE galx_oauth_device_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_oauth_device_codes FORCE ROW LEVEL SECURITY;

ALTER TABLE galx_oauth_pushed_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_oauth_pushed_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY p_service_role_oauth_identities ON galx_oauth_identities
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY p_service_role_oauth_requests ON galx_oauth_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY p_service_role_oauth_device ON galx_oauth_device_codes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY p_service_role_oauth_par ON galx_oauth_pushed_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION fn_consume_oauth_request(
    p_state VARCHAR(255),
    p_provider VARCHAR(32) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_req RECORD;
BEGIN
    SELECT * INTO v_req
    FROM galx_oauth_requests
    WHERE state = p_state
      AND (p_provider IS NULL OR provider = p_provider)
      AND is_consumed = false
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_OR_EXPIRED_STATE');
    END IF;

    UPDATE galx_oauth_requests
    SET is_consumed = true,
        consumed_at = NOW()
    WHERE id = v_req.id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_req.id,
        'state', v_req.state,
        'code_verifier', v_req.code_verifier,
        'provider', v_req.provider,
        'redirect_uri', v_req.redirect_uri,
        'mode', v_req.mode,
        'workspace_id', v_req.workspace_id,
        'user_id', v_req.user_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_approve_device_code(
    p_user_code VARCHAR(16),
    p_session_token TEXT,
    p_token_record JSONB DEFAULT NULL,
    p_user_id VARCHAR(255) DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_dev RECORD;
BEGIN
    SELECT * INTO v_dev
    FROM galx_oauth_device_codes
    WHERE user_code = UPPER(TRIM(p_user_code))
      AND status = 'pending'
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    UPDATE galx_oauth_device_codes
    SET status = 'approved',
        session_token = p_session_token,
        token_record = p_token_record,
        user_id = COALESCE(p_user_id, v_dev.user_id)
    WHERE id = v_dev.id;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION fn_purge_expired_oauth_states()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted INT := 0;
    v_cnt INT;
BEGIN
    DELETE FROM galx_oauth_requests WHERE expires_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    v_deleted := v_deleted + v_cnt;

    DELETE FROM galx_oauth_device_codes WHERE expires_at < NOW() - INTERVAL '1 hour' AND status != 'approved';
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    v_deleted := v_deleted + v_cnt;

    DELETE FROM galx_oauth_pushed_requests WHERE expires_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    v_deleted := v_deleted + v_cnt;

    RETURN v_deleted;
END;
$$;

-- ============================================================================
-- 20260822000010_galxai_oauth_fapi_apex_hardening.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS galx_oauth_dpop_proofs (
    jti VARCHAR(128) PRIMARY KEY,
    access_token_hash VARCHAR(128) DEFAULT NULL,
    http_method VARCHAR(16) NOT NULL,
    http_uri TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_dpop_expires_at ON galx_oauth_dpop_proofs(expires_at);
CREATE INDEX IF NOT EXISTS idx_galx_dpop_ath ON galx_oauth_dpop_proofs(access_token_hash) WHERE access_token_hash IS NOT NULL;

ALTER TABLE galx_oauth_dpop_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_oauth_dpop_proofs FORCE ROW LEVEL SECURITY;

CREATE POLICY p_service_role_oauth_dpop ON galx_oauth_dpop_proofs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION fn_record_dpop_proof(
    p_jti VARCHAR(128),
    p_ath VARCHAR(128) DEFAULT NULL,
    p_htm VARCHAR(16) DEFAULT 'POST',
    p_htu TEXT DEFAULT '',
    p_iat_ms BIGINT DEFAULT NULL,
    p_exp_ms BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now_ms BIGINT;
    v_iat TIMESTAMPTZ;
    v_exp TIMESTAMPTZ;
    v_exists RECORD;
BEGIN
    v_now_ms := CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT);
    v_iat := TO_TIMESTAMP(COALESCE(p_iat_ms, v_now_ms) / 1000.0);
    v_exp := TO_TIMESTAMP(COALESCE(p_exp_ms, v_now_ms + 300000) / 1000.0);

    SELECT * INTO v_exists
    FROM galx_oauth_dpop_proofs
    WHERE jti = p_jti;

    IF FOUND THEN
        RETURN jsonb_build_object('valid', false, 'error', 'DPOP_JTI_REPLAY_DETECTED');
    END IF;

    INSERT INTO galx_oauth_dpop_proofs (
        jti,
        access_token_hash,
        http_method,
        http_uri,
        issued_at,
        expires_at,
        created_at
    ) VALUES (
        p_jti,
        p_ath,
        UPPER(p_htm),
        p_htu,
        v_iat,
        v_exp,
        NOW()
    );

    RETURN jsonb_build_object('valid', true);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('valid', false, 'error', 'DPOP_JTI_REPLAY_DETECTED');
END;
$$;

CREATE OR REPLACE FUNCTION fn_poll_device_code(
    p_device_code VARCHAR(128),
    p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now_ms BIGINT;
    v_dev RECORD;
    v_slow_interval INT;
BEGIN
    v_now_ms := COALESCE(p_now_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT));

    SELECT * INTO v_dev
    FROM galx_oauth_device_codes
    WHERE device_code = p_device_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_grant', 'error_description', 'Device code not found or invalid');
    END IF;

    IF v_dev.expires_at <= NOW() THEN
        DELETE FROM galx_oauth_device_codes WHERE id = v_dev.id;
        RETURN jsonb_build_object('success', false, 'error', 'expired_token', 'error_description', 'The device authorization code has expired.');
    END IF;

    IF v_dev.last_polled_at_ms IS NOT NULL AND (v_now_ms - v_dev.last_polled_at_ms) < (v_dev.polling_interval_sec * 1000 - 500) THEN
        v_slow_interval := v_dev.polling_interval_sec + 5;
        UPDATE galx_oauth_device_codes
        SET polling_interval_sec = v_slow_interval,
            last_polled_at_ms = v_now_ms
        WHERE id = v_dev.id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'slow_down',
            'error_description', 'Polling too rapidly. Increase interval.',
            'interval', v_slow_interval
        );
    END IF;

    UPDATE galx_oauth_device_codes
    SET last_polled_at_ms = v_now_ms
    WHERE id = v_dev.id;

    IF v_dev.status = 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'authorization_pending',
            'error_description', 'The user has not yet authorized the request.',
            'interval', v_dev.polling_interval_sec
        );
    END IF;

    IF v_dev.status = 'denied' THEN
        DELETE FROM galx_oauth_device_codes WHERE id = v_dev.id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'access_denied',
            'error_description', 'The user denied the authorization request.'
        );
    END IF;

    IF v_dev.status = 'approved' THEN
        DELETE FROM galx_oauth_device_codes WHERE id = v_dev.id;

        RETURN jsonb_build_object(
            'success', true,
            'access_token', v_dev.session_token,
            'token_type', 'Bearer',
            'expires_in', 2592000,
            'token_record', v_dev.token_record
        );
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'invalid_grant', 'error_description', 'Unexpected status');
END;
$$;

CREATE OR REPLACE FUNCTION fn_consume_pushed_request(
    p_request_uri VARCHAR(128)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_par RECORD;
BEGIN
    SELECT * INTO v_par
    FROM galx_oauth_pushed_requests
    WHERE request_uri = p_request_uri
      AND is_consumed = false
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_OR_EXPIRED_REQUEST_URI');
    END IF;

    UPDATE galx_oauth_pushed_requests
    SET is_consumed = true,
        consumed_at = NOW()
    WHERE id = v_par.id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_par.id,
        'request_uri', v_par.request_uri,
        'provider', v_par.provider,
        'client_id', v_par.client_id,
        'redirect_uri', v_par.redirect_uri,
        'scope', v_par.scope,
        'code_challenge', v_par.code_challenge,
        'code_challenge_method', v_par.code_challenge_method,
        'state', v_par.state,
        'response_type', v_par.response_type,
        'workspace_id', v_par.workspace_id
    );
END;
$$;

-- ============================================================================
-- 20260822000011_galxai_oauth_rtr_family_mesh.sql
-- ============================================================================

ALTER TABLE galx_oauth_identities ADD COLUMN IF NOT EXISTS session_family_id VARCHAR(64) DEFAULT NULL;
ALTER TABLE galx_oauth_identities ADD COLUMN IF NOT EXISTS sequence_number INT NOT NULL DEFAULT 1;
ALTER TABLE galx_oauth_identities ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(64) DEFAULT NULL;
ALTER TABLE galx_oauth_identities ADD COLUMN IF NOT EXISTS previous_refresh_token_hash VARCHAR(64) DEFAULT NULL;
ALTER TABLE galx_oauth_identities ADD COLUMN IF NOT EXISTS grace_period_until TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE galx_oauth_device_codes ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE galx_oauth_device_codes ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 5;

CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_family ON galx_oauth_identities(user_id, session_family_id) WHERE session_family_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_rf_hash ON galx_oauth_identities(refresh_token_hash) WHERE refresh_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galx_oauth_ident_prev_rf_hash ON galx_oauth_identities(previous_refresh_token_hash) WHERE previous_refresh_token_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION fn_rotate_oauth_identity_tokens(
    p_identity_id VARCHAR(64),
    p_old_refresh_hash VARCHAR(64),
    p_new_encrypted_access JSONB,
    p_new_encrypted_refresh JSONB,
    p_new_refresh_hash VARCHAR(64),
    p_expires_at TIMESTAMPTZ,
    p_grace_window_sec INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ident RECORD;
    v_new_seq INT;
    v_grace_until TIMESTAMPTZ;
    v_family_id VARCHAR(64);
    v_now TIMESTAMPTZ := NOW();
    v_now_ms BIGINT := CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT);
BEGIN
    SELECT * INTO v_ident
    FROM galx_oauth_identities
    WHERE id = p_identity_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'IDENTITY_NOT_FOUND');
    END IF;

    IF v_ident.status = 'revoked' THEN
        RETURN jsonb_build_object('success', false, 'error', 'IDENTITY_ALREADY_REVOKED');
    END IF;

    v_family_id := COALESCE(v_ident.session_family_id, 'fam_' || SUBSTRING(v_ident.id FROM 1 FOR 16));

    -- CASE 1: Standard Normal Rotation (Old refresh token matches current active hash)
    IF v_ident.refresh_token_hash IS NULL OR v_ident.refresh_token_hash = p_old_refresh_hash THEN
        v_new_seq := v_ident.sequence_number + 1;
        v_grace_until := v_now + (p_grace_window_sec || ' seconds')::INTERVAL;

        UPDATE galx_oauth_identities
        SET session_family_id = v_family_id,
            sequence_number = v_new_seq,
            previous_refresh_token_hash = v_ident.refresh_token_hash,
            refresh_token_hash = p_new_refresh_hash,
            encrypted_access_token = p_new_encrypted_access,
            encrypted_refresh_token = p_new_encrypted_refresh,
            expires_at = p_expires_at,
            last_refreshed_at = v_now,
            grace_period_until = v_grace_until,
            status = 'active',
            updated_at = v_now
        WHERE id = v_ident.id;

        INSERT INTO galx_audit_logs (
            id,
            workspace_id,
            user_id,
            shard_id,
            action,
            resource_type,
            resource_id,
            metadata,
            timestamp_ms,
            created_at
        ) VALUES (
            'audit_' || v_now_ms || '_' || SUBSTRING(p_new_refresh_hash FROM 1 FOR 8),
            NULL,
            v_ident.user_id,
            v_ident.shard_id,
            'oauth.token_rotated',
            'oauth_identity',
            v_ident.id,
            jsonb_build_object('sequence_number', v_new_seq, 'session_family_id', v_family_id, 'provider', v_ident.provider),
            v_now_ms,
            v_now
        );

        RETURN jsonb_build_object(
            'success', true,
            'sequence_number', v_new_seq,
            'session_family_id', v_family_id,
            'expires_at', p_expires_at
        );
    END IF;

    -- CASE 2: Token Replay within Grace Period Window (Tolerates network retries)
    IF v_ident.previous_refresh_token_hash = p_old_refresh_hash THEN
        IF v_ident.grace_period_until IS NOT NULL AND v_now <= v_ident.grace_period_until THEN
            RETURN jsonb_build_object(
                'success', true,
                'grace_window', true,
                'sequence_number', v_ident.sequence_number,
                'session_family_id', v_family_id,
                'expires_at', v_ident.expires_at
            );
        END IF;
    END IF;

    -- CASE 3: TOKEN REUSE ATTACK DETECTED (RFC 6819 Token Theft Containment)
    UPDATE galx_oauth_identities
    SET status = 'revoked',
        updated_at = v_now
    WHERE session_family_id = v_family_id
       OR user_id = v_ident.user_id;

    UPDATE galx_user_sessions
    SET is_revoked = true,
        revoked_at = v_now,
        revoked_reason = 'OAuth Refresh Token Reuse Attack Detected',
        updated_at = v_now
    WHERE user_id = v_ident.user_id
      AND is_revoked = false;

    INSERT INTO galx_audit_logs (
        id,
        workspace_id,
        user_id,
        shard_id,
        action,
        resource_type,
        resource_id,
        metadata,
        timestamp_ms,
        created_at
    ) VALUES (
        'threat_' || v_now_ms || '_' || SUBSTRING(p_old_refresh_hash FROM 1 FOR 8),
        NULL,
        v_ident.user_id,
        v_ident.shard_id,
        'oauth.threat.token_reuse_killswitch',
        'oauth_identity',
        v_ident.id,
        jsonb_build_object(
            'threat_level', 'CRITICAL',
            'session_family_id', v_family_id,
            'presented_hash', p_old_refresh_hash,
            'expected_hash', v_ident.refresh_token_hash
        ),
        v_now_ms,
        v_now
    );

    RETURN jsonb_build_object(
        'success', false,
        'error', 'TOKEN_REUSE_ATTACK_DETECTED',
        'family_revoked', true,
        'session_family_id', v_family_id
    );
END;
$$;

-- ============================================================================
-- 20260822000012_galxai_oauth_backchannel_and_vacuum_mesh.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS galx_oauth_backchannel_logouts (
    id VARCHAR(64) PRIMARY KEY,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('openai', 'xai-grok', 'anthropic')),
    sub VARCHAR(255) NOT NULL,
    sid VARCHAR(255) DEFAULT NULL,
    jti VARCHAR(128) UNIQUE DEFAULT NULL,
    iss TEXT NOT NULL,
    events JSONB NOT NULL DEFAULT '{"http://schemas.openid.net/event/backchannel-logout": {}}'::jsonb,
    raw_logout_token TEXT NOT NULL,
    is_processed BOOLEAN NOT NULL DEFAULT false,
    identities_revoked INT NOT NULL DEFAULT 0,
    sessions_revoked INT NOT NULL DEFAULT 0,
    processed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_bc_logout_provider_sub ON galx_oauth_backchannel_logouts(provider, sub);
CREATE INDEX IF NOT EXISTS idx_galx_bc_logout_sid ON galx_oauth_backchannel_logouts(sid) WHERE sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galx_bc_logout_jti ON galx_oauth_backchannel_logouts(jti) WHERE jti IS NOT NULL;

ALTER TABLE galx_oauth_backchannel_logouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_oauth_backchannel_logouts FORCE ROW LEVEL SECURITY;

CREATE POLICY p_service_role_oauth_backchannel ON galx_oauth_backchannel_logouts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION fn_process_backchannel_logout(
    p_id VARCHAR(64),
    p_provider VARCHAR(32),
    p_sub VARCHAR(255),
    p_iss TEXT,
    p_raw_token TEXT,
    p_sid VARCHAR(255) DEFAULT NULL,
    p_jti VARCHAR(128) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_identities_revoked INT := 0;
    v_sessions_revoked INT := 0;
    v_target_user_id VARCHAR(255);
    v_now TIMESTAMPTZ := NOW();
    v_now_ms BIGINT := CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT);
BEGIN
    SELECT user_id INTO v_target_user_id
    FROM galx_oauth_identities
    WHERE provider = p_provider
      AND (provider_account_id = p_sub OR email = p_sub)
    LIMIT 1;

    UPDATE galx_oauth_identities
    SET status = 'revoked',
        updated_at = v_now
    WHERE provider = p_provider
      AND (provider_account_id = p_sub OR email = p_sub OR (v_target_user_id IS NOT NULL AND user_id = v_target_user_id));
    GET DIAGNOSTICS v_identities_revoked = ROW_COUNT;

    IF v_target_user_id IS NOT NULL THEN
        UPDATE galx_user_sessions
        SET is_revoked = true,
            revoked_at = v_now,
            revoked_reason = 'OIDC Back-Channel Logout (' || p_provider || ')',
            updated_at = v_now
        WHERE user_id = v_target_user_id
          AND is_revoked = false;
        GET DIAGNOSTICS v_sessions_revoked = ROW_COUNT;
    END IF;

    INSERT INTO galx_oauth_backchannel_logouts (
        id,
        provider,
        sub,
        sid,
        jti,
        iss,
        raw_logout_token,
        is_processed,
        identities_revoked,
        sessions_revoked,
        processed_at,
        created_at
    ) VALUES (
        p_id,
        p_provider,
        p_sub,
        p_sid,
        p_jti,
        p_iss,
        p_raw_token,
        true,
        v_identities_revoked,
        v_sessions_revoked,
        v_now,
        v_now
    );

    INSERT INTO galx_audit_logs (
        id,
        workspace_id,
        user_id,
        shard_id,
        action,
        resource_type,
        resource_id,
        metadata,
        timestamp_ms,
        created_at
    ) VALUES (
        'audit_bc_' || v_now_ms || '_' || SUBSTRING(p_id FROM 1 FOR 8),
        NULL,
        v_target_user_id,
        NULL,
        'oauth.oidc.backchannel_logout',
        'oauth_identity',
        p_sub,
        jsonb_build_object(
            'provider', p_provider,
            'sub', p_sub,
            'sid', p_sid,
            'identities_revoked', v_identities_revoked,
            'sessions_revoked', v_sessions_revoked
        ),
        v_now_ms,
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_target_user_id,
        'identities_revoked', v_identities_revoked,
        'sessions_revoked', v_sessions_revoked
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_scavenge_oauth_substrate_cron()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_purged_dpop INT := 0;
    v_purged_requests INT := 0;
    v_purged_devices INT := 0;
    v_purged_par INT := 0;
    v_expired_identities INT := 0;
    v_cnt INT;
BEGIN
    DELETE FROM galx_oauth_dpop_proofs WHERE expires_at < NOW();
    GET DIAGNOSTICS v_purged_dpop = ROW_COUNT;

    DELETE FROM galx_oauth_requests WHERE expires_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_purged_requests = ROW_COUNT;

    DELETE FROM galx_oauth_device_codes WHERE expires_at < NOW() - INTERVAL '1 hour' AND status != 'approved';
    GET DIAGNOSTICS v_purged_devices = ROW_COUNT;

    DELETE FROM galx_oauth_pushed_requests WHERE expires_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_purged_par = ROW_COUNT;

    UPDATE galx_oauth_identities
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
    GET DIAGNOSTICS v_expired_identities = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'purged_dpop_proofs', v_purged_dpop,
        'purged_oauth_requests', v_purged_requests,
        'purged_device_codes', v_purged_devices,
        'purged_par_requests', v_purged_par,
        'expired_identities_marked', v_expired_identities
    );
END;
$$;

-- 4. ATOMIC IDENTITY UPSERT & RETRIEVAL FUNCTIONS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION fn_save_oauth_identity(
    p_id VARCHAR(64),
    p_user_id VARCHAR(255),
    p_provider VARCHAR(32),
    p_provider_account_id VARCHAR(255),
    p_email VARCHAR(255),
    p_encrypted_access_token JSONB,
    p_display_name VARCHAR(255) DEFAULT NULL,
    p_shard_id VARCHAR(64) DEFAULT NULL,
    p_session_family_id VARCHAR(64) DEFAULT NULL,
    p_sequence_number INT DEFAULT 1,
    p_refresh_token_hash VARCHAR(64) DEFAULT NULL,
    p_previous_refresh_token_hash VARCHAR(64) DEFAULT NULL,
    p_grace_period_until TIMESTAMPTZ DEFAULT NULL,
    p_encrypted_refresh_token JSONB DEFAULT NULL,
    p_id_token_claims JSONB DEFAULT NULL,
    p_scopes TEXT[] DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_last_refreshed_at TIMESTAMPTZ DEFAULT NULL,
    p_status VARCHAR(32) DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
BEGIN
    INSERT INTO galx_oauth_identities (
        id, user_id, provider, provider_account_id, email, display_name,
        shard_id, session_family_id, sequence_number, refresh_token_hash,
        previous_refresh_token_hash, grace_period_until, encrypted_access_token,
        encrypted_refresh_token, id_token_claims, scopes, expires_at,
        last_refreshed_at, status, created_at, updated_at
    ) VALUES (
        p_id, p_user_id, p_provider, p_provider_account_id, p_email, p_display_name,
        p_shard_id, p_session_family_id, p_sequence_number, p_refresh_token_hash,
        p_previous_refresh_token_hash, p_grace_period_until, p_encrypted_access_token,
        p_encrypted_refresh_token, p_id_token_claims, p_scopes, p_expires_at,
        p_last_refreshed_at, p_status, v_now, v_now
    )
    ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        provider = EXCLUDED.provider,
        provider_account_id = EXCLUDED.provider_account_id,
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        shard_id = EXCLUDED.shard_id,
        session_family_id = EXCLUDED.session_family_id,
        sequence_number = EXCLUDED.sequence_number,
        refresh_token_hash = EXCLUDED.refresh_token_hash,
        previous_refresh_token_hash = EXCLUDED.previous_refresh_token_hash,
        grace_period_until = EXCLUDED.grace_period_until,
        encrypted_access_token = EXCLUDED.encrypted_access_token,
        encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
        id_token_claims = EXCLUDED.id_token_claims,
        scopes = EXCLUDED.scopes,
        expires_at = EXCLUDED.expires_at,
        last_refreshed_at = EXCLUDED.last_refreshed_at,
        status = EXCLUDED.status,
        updated_at = v_now;

    RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_oauth_identity_by_id(
    p_id VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ident RECORD;
BEGIN
    SELECT * INTO v_ident
    FROM galx_oauth_identities
    WHERE id = p_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', false);
    END IF;

    RETURN jsonb_build_object(
        'found', true,
        'identity', row_to_json(v_ident)
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_oauth_identities_by_user(
    p_user_id VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_list JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(i)), '[]'::jsonb)
    INTO v_list
    FROM (
        SELECT * FROM galx_oauth_identities
        WHERE user_id = p_user_id
          AND status IN ('active', 'needs_reauth')
        ORDER BY created_at DESC
    ) i;

    RETURN jsonb_build_object(
        'success', true,
        'identities', v_list
    );
END;
$$;










