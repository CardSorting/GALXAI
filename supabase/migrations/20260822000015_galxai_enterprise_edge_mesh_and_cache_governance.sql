-- ============================================================================
-- Migration: 20260822000015_galxai_enterprise_edge_mesh_and_cache_governance.sql
-- Description: Enterprise Multi-Tenant Edge Cache, Adaptive Rate Limiting, 
--              Shard Health Telemetry, and SOC 2 Compliance Verification Mesh.
-- Paranoia Standard: 100% RLS Enabled & Forced, Indexes on all Foreign Keys, 
--                    SECURITY DEFINER with fixed search_path, Idempotent DDL.
-- ============================================================================

-- 1. Adaptive Rate Limit & Token Bucket Quotas
CREATE TABLE IF NOT EXISTS public.galx_rate_limit_quotas (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.galx_workspaces(id) ON DELETE CASCADE,
    api_key_id VARCHAR(64) REFERENCES public.galx_developer_keys(id) ON DELETE SET NULL,
    model_id VARCHAR(64) NOT NULL,
    rpm_limit INTEGER NOT NULL DEFAULT 1000,
    tpm_limit INTEGER NOT NULL DEFAULT 500000,
    burst_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.50,
    tokens_remaining BIGINT NOT NULL DEFAULT 500000,
    window_started_at_ms BIGINT NOT NULL,
    last_replenished_at_ms BIGINT NOT NULL,
    is_throttled BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Deterministic Prompt Cache KV Registry
CREATE TABLE IF NOT EXISTS public.galx_prompt_cache_registry (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.galx_workspaces(id) ON DELETE CASCADE,
    model_id VARCHAR(64) NOT NULL,
    prefix_hash_sha256 VARCHAR(64) NOT NULL,
    token_count INTEGER NOT NULL,
    hit_count BIGINT NOT NULL DEFAULT 0,
    total_dollars_saved_usd NUMERIC(14, 6) NOT NULL DEFAULT 0.000000,
    edge_pop_locations TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ttl_seconds INTEGER NOT NULL DEFAULT 86400,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Multi-Region Anycast Edge Shard Health Telemetry
CREATE TABLE IF NOT EXISTS public.galx_edge_shard_metrics (
    id VARCHAR(64) PRIMARY KEY,
    shard_id VARCHAR(64) NOT NULL REFERENCES public.galx_shard_accounts(id) ON DELETE CASCADE,
    edge_pop VARCHAR(32) NOT NULL,
    latency_p50_ms NUMERIC(8, 2) NOT NULL DEFAULT 12.00,
    latency_p90_ms NUMERIC(8, 2) NOT NULL DEFAULT 18.50,
    latency_p99_ms NUMERIC(8, 2) NOT NULL DEFAULT 35.00,
    ttft_avg_ms NUMERIC(8, 2) NOT NULL DEFAULT 11.80,
    consecutive_errors INTEGER NOT NULL DEFAULT 0,
    circuit_status VARCHAR(32) NOT NULL DEFAULT 'closed' CHECK (circuit_status IN ('closed', 'half_open', 'tripped_open')),
    last_health_ping_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Automated SOC 2 Compliance & Data Privacy Records
CREATE TABLE IF NOT EXISTS public.galx_compliance_records (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.galx_workspaces(id) ON DELETE CASCADE,
    framework VARCHAR(32) NOT NULL CHECK (framework IN ('SOC2_TYPE2', 'GDPR', 'HIPAA', 'PCI_DSS', 'CCPA', 'EU_AI_ACT')),
    record_type VARCHAR(64) NOT NULL CHECK (record_type IN ('ZDR_ATTESTATION', 'DATA_ERASURE_RECEIPT', 'DPA_EXECUTION', 'KEY_ROTATION_PROOF', 'ACCESS_REVIEW')),
    cryptographic_digest_sha256 VARCHAR(64) NOT NULL,
    attestation_signature TEXT NOT NULL,
    verified_by VARCHAR(255) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ============================================================================
-- Secondary B-Tree & Multi-Column Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_galx_rate_limit_quotas_workspace ON public.galx_rate_limit_quotas (workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_rate_limit_quotas_api_key ON public.galx_rate_limit_quotas (api_key_id);
CREATE INDEX IF NOT EXISTS idx_galx_rate_limit_quotas_model ON public.galx_rate_limit_quotas (model_id);
CREATE INDEX IF NOT EXISTS idx_galx_rate_limit_quotas_throttled ON public.galx_rate_limit_quotas (is_throttled);

CREATE INDEX IF NOT EXISTS idx_galx_prompt_cache_workspace ON public.galx_prompt_cache_registry (workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_prompt_cache_hash ON public.galx_prompt_cache_registry (prefix_hash_sha256);
CREATE INDEX IF NOT EXISTS idx_galx_prompt_cache_model ON public.galx_prompt_cache_registry (model_id);
CREATE INDEX IF NOT EXISTS idx_galx_prompt_cache_expires ON public.galx_prompt_cache_registry (expires_at);

CREATE INDEX IF NOT EXISTS idx_galx_edge_metrics_shard ON public.galx_edge_shard_metrics (shard_id);
CREATE INDEX IF NOT EXISTS idx_galx_edge_metrics_pop ON public.galx_edge_shard_metrics (edge_pop);
CREATE INDEX IF NOT EXISTS idx_galx_edge_metrics_circuit ON public.galx_edge_shard_metrics (circuit_status);

CREATE INDEX IF NOT EXISTS idx_galx_compliance_workspace ON public.galx_compliance_records (workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_compliance_framework ON public.galx_compliance_records (framework);
CREATE INDEX IF NOT EXISTS idx_galx_compliance_record_type ON public.galx_compliance_records (record_type);

-- ============================================================================
-- Paranoid Row Level Security (RLS) Configuration
-- ============================================================================

ALTER TABLE public.galx_rate_limit_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_rate_limit_quotas FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_prompt_cache_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_prompt_cache_registry FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_edge_shard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_edge_shard_metrics FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_compliance_records FORCE ROW LEVEL SECURITY;

-- 1. galx_rate_limit_quotas RLS Policies
DROP POLICY IF EXISTS "galx_rate_limit_service_role" ON public.galx_rate_limit_quotas;
CREATE POLICY "galx_rate_limit_service_role" ON public.galx_rate_limit_quotas
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "galx_rate_limit_authenticated_select" ON public.galx_rate_limit_quotas;
CREATE POLICY "galx_rate_limit_authenticated_select" ON public.galx_rate_limit_quotas
    FOR SELECT
    TO authenticated
    USING (workspace_id IN (
        SELECT workspace_id FROM public.galx_workspace_members WHERE user_id = auth.uid()::text
    ));

-- 2. galx_prompt_cache_registry RLS Policies
DROP POLICY IF EXISTS "galx_prompt_cache_service_role" ON public.galx_prompt_cache_registry;
CREATE POLICY "galx_prompt_cache_service_role" ON public.galx_prompt_cache_registry
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "galx_prompt_cache_authenticated_select" ON public.galx_prompt_cache_registry;
CREATE POLICY "galx_prompt_cache_authenticated_select" ON public.galx_prompt_cache_registry
    FOR SELECT
    TO authenticated
    USING (workspace_id IN (
        SELECT workspace_id FROM public.galx_workspace_members WHERE user_id = auth.uid()::text
    ));

-- 3. galx_edge_shard_metrics RLS Policies
DROP POLICY IF EXISTS "galx_edge_metrics_service_role" ON public.galx_edge_shard_metrics;
CREATE POLICY "galx_edge_metrics_service_role" ON public.galx_edge_shard_metrics
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "galx_edge_metrics_authenticated_select" ON public.galx_edge_shard_metrics;
CREATE POLICY "galx_edge_metrics_authenticated_select" ON public.galx_edge_shard_metrics
    FOR SELECT
    TO authenticated
    USING (true);

-- 4. galx_compliance_records RLS Policies
DROP POLICY IF EXISTS "galx_compliance_service_role" ON public.galx_compliance_records;
CREATE POLICY "galx_compliance_service_role" ON public.galx_compliance_records
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "galx_compliance_authenticated_select" ON public.galx_compliance_records;
CREATE POLICY "galx_compliance_authenticated_select" ON public.galx_compliance_records
    FOR SELECT
    TO authenticated
    USING (workspace_id IN (
        SELECT workspace_id FROM public.galx_workspace_members WHERE user_id = auth.uid()::text
    ));

-- ============================================================================
-- Atomic Stored Procedures with Fixed Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.galx_record_prompt_cache_hit(
    p_cache_id TEXT,
    p_dollars_saved NUMERIC,
    p_edge_pop TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.galx_prompt_cache_registry
    SET 
        hit_count = hit_count + 1,
        total_dollars_saved_usd = total_dollars_saved_usd + COALESCE(p_dollars_saved, 0),
        edge_pop_locations = CASE 
            WHEN p_edge_pop IS NOT NULL AND NOT (edge_pop_locations @> ARRAY[p_edge_pop]::TEXT[]) 
            THEN array_append(edge_pop_locations, p_edge_pop)
            ELSE edge_pop_locations
        END,
        last_accessed_at = NOW()
    WHERE id = p_cache_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.galx_evaluate_adaptive_rate_limit(
    p_workspace_id UUID,
    p_model_id TEXT,
    p_tokens_requested INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_quota RECORD;
    v_now_ms BIGINT;
    v_elapsed_ms BIGINT;
    v_replenish_rate NUMERIC;
    v_new_tokens BIGINT;
    v_allowed BOOLEAN;
BEGIN
    v_now_ms := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

    SELECT * INTO v_quota
    FROM public.galx_rate_limit_quotas
    WHERE workspace_id = p_workspace_id AND model_id = p_model_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Default pass-through if no specific quota row configured
        RETURN jsonb_build_object(
            'allowed', true,
            'tokens_remaining', 500000,
            'is_throttled', false,
            'reason', 'NO_RESTRICTIVE_QUOTA'
        );
    END IF;

    -- Calculate replenished tokens (TPM replenished continuously per ms)
    v_elapsed_ms := GREATEST(0, v_now_ms - v_quota.last_replenished_at_ms);
    v_replenish_rate := v_quota.tpm_limit / 60000.0;
    v_new_tokens := LEAST(v_quota.tpm_limit, (v_quota.tokens_remaining + (v_elapsed_ms * v_replenish_rate))::BIGINT);

    IF v_new_tokens >= p_tokens_requested THEN
        v_allowed := true;
        v_new_tokens := v_new_tokens - p_tokens_requested;
    ELSE
        v_allowed := false;
    END IF;

    UPDATE public.galx_rate_limit_quotas
    SET 
        tokens_remaining = v_new_tokens,
        last_replenished_at_ms = v_now_ms,
        is_throttled = NOT v_allowed,
        updated_at = NOW()
    WHERE id = v_quota.id;

    RETURN jsonb_build_object(
        'allowed', v_allowed,
        'tokens_remaining', v_new_tokens,
        'is_throttled', NOT v_allowed,
        'tpm_limit', v_quota.tpm_limit,
        'rpm_limit', v_quota.rpm_limit
    );
END;
$$;
