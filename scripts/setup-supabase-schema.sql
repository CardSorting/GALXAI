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


