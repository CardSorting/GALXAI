-- ============================================================================
-- Migration: 20260822000016_galxai_project_allocations_and_smart_routing_mesh.sql
-- Description: Multi-Tenant Project Budget Allocations, Declarative Model Routing,
--              Multi-Channel Alerting, and Department Hierarchy Mesh.
-- Paranoia Standard: 100% RLS Enabled & Forced, Indexes on all Foreign Keys,
--                    SECURITY DEFINER with fixed search_path, Idempotent DDL.
-- ============================================================================

-- 1. Multi-Tenant Project Budget Allocations (Production vs Staging vs Dev)
CREATE TABLE IF NOT EXISTS public.galx_project_spend_allocations (
    id VARCHAR(64) PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.galx_projects(id) ON DELETE CASCADE,
    environment_name VARCHAR(64) NOT NULL DEFAULT 'production',
    monthly_budget_cap_usd NUMERIC(14, 6) NOT NULL DEFAULT 500.000000,
    current_spend_usd NUMERIC(14, 6) NOT NULL DEFAULT 0.000000,
    auto_pause_on_cap BOOLEAN NOT NULL DEFAULT true,
    warning_threshold_pct INTEGER NOT NULL DEFAULT 80,
    burst_headroom_pct INTEGER NOT NULL DEFAULT 15,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, environment_name)
);

-- 2. Declarative Multi-Model Failover & Latency Routing Policies
CREATE TABLE IF NOT EXISTS public.galx_model_routing_rules (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.galx_workspaces(id) ON DELETE CASCADE,
    rule_name VARCHAR(128) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 10,
    primary_model VARCHAR(64) NOT NULL,
    fallback_model VARCHAR(64) NOT NULL,
    max_latency_threshold_ms NUMERIC(8, 2) NOT NULL DEFAULT 35.00,
    on_status_codes INTEGER[] NOT NULL DEFAULT ARRAY[429, 500, 502, 503, 504]::INTEGER[],
    preserve_prompt_cache BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    routing_strategy VARCHAR(32) NOT NULL DEFAULT 'latency_and_health' CHECK (routing_strategy IN ('latency_and_health', 'cost_optimized', 'priority_failover', 'round_robin')),
    total_reroutes BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Multi-Channel Billing Alert Endpoints (Slack, Discord, PagerDuty, Webhooks)
CREATE TABLE IF NOT EXISTS public.galx_billing_notification_channels (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.galx_workspaces(id) ON DELETE CASCADE,
    channel_type VARCHAR(32) NOT NULL CHECK (channel_type IN ('slack', 'discord', 'pagerduty', 'email_dl', 'webhook', 'teams')),
    destination_url TEXT NOT NULL,
    channel_name VARCHAR(128) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    quiet_hours_start_utc VARCHAR(5) DEFAULT NULL, -- e.g. "22:00"
    quiet_hours_end_utc VARCHAR(5) DEFAULT NULL,   -- e.g. "06:00"
    min_severity VARCHAR(16) NOT NULL DEFAULT 'warning' CHECK (min_severity IN ('info', 'warning', 'critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Department Cost Centers & Multi-Tier Allocations
CREATE TABLE IF NOT EXISTS public.galx_department_cost_allocations (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.galx_workspaces(id) ON DELETE CASCADE,
    cost_center_code VARCHAR(32) NOT NULL,
    department_name VARCHAR(128) NOT NULL,
    gl_account_code VARCHAR(64) NOT NULL DEFAULT '6020-AI-INFRA',
    allocated_percentage NUMERIC(5, 2) NOT NULL DEFAULT 25.00,
    monthly_budget_cap_usd NUMERIC(14, 6) NOT NULL DEFAULT 2500.000000,
    current_month_spend_usd NUMERIC(14, 6) NOT NULL DEFAULT 0.000000,
    burn_velocity_daily_usd NUMERIC(14, 6) NOT NULL DEFAULT 0.000000,
    owner_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, cost_center_code)
);

-- ============================================================================
-- Secondary B-Tree & Multi-Column Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_galx_project_alloc_project ON public.galx_project_spend_allocations (project_id);
CREATE INDEX IF NOT EXISTS idx_galx_project_alloc_env ON public.galx_project_spend_allocations (environment_name);
CREATE INDEX IF NOT EXISTS idx_galx_project_alloc_paused ON public.galx_project_spend_allocations (is_paused);

CREATE INDEX IF NOT EXISTS idx_galx_model_rules_workspace ON public.galx_model_routing_rules (workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_model_rules_primary ON public.galx_model_routing_rules (primary_model);
CREATE INDEX IF NOT EXISTS idx_galx_model_rules_active ON public.galx_model_routing_rules (is_active);

CREATE INDEX IF NOT EXISTS idx_galx_notif_channels_workspace ON public.galx_billing_notification_channels (workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_notif_channels_type ON public.galx_billing_notification_channels (channel_type);

CREATE INDEX IF NOT EXISTS idx_galx_dept_alloc_workspace ON public.galx_department_cost_allocations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_dept_alloc_code ON public.galx_department_cost_allocations (cost_center_code);

-- ============================================================================
-- Paranoid Row Level Security (RLS) Configuration
-- ============================================================================

ALTER TABLE public.galx_project_spend_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_project_spend_allocations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_model_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_model_routing_rules FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_billing_notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_billing_notification_channels FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_department_cost_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_department_cost_allocations FORCE ROW LEVEL SECURITY;

-- 1. galx_project_spend_allocations RLS Policies
DROP POLICY IF EXISTS "galx_project_alloc_service_role" ON public.galx_project_spend_allocations;
CREATE POLICY "galx_project_alloc_service_role" ON public.galx_project_spend_allocations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "galx_project_alloc_authenticated_select" ON public.galx_project_spend_allocations;
CREATE POLICY "galx_project_alloc_authenticated_select" ON public.galx_project_spend_allocations
    FOR SELECT
    TO authenticated
    USING (project_id IN (
        SELECT p.id FROM public.galx_projects p
        JOIN public.galx_workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = auth.uid()::text
    ));

-- 2. galx_model_routing_rules RLS Policies
DROP POLICY IF EXISTS "galx_model_rules_service_role" ON public.galx_model_routing_rules;
CREATE POLICY "galx_model_rules_service_role" ON public.galx_model_routing_rules
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "galx_model_rules_authenticated_select" ON public.galx_model_routing_rules;
CREATE POLICY "galx_model_rules_authenticated_select" ON public.galx_model_routing_rules
    FOR SELECT
    TO authenticated
    USING (workspace_id IN (
        SELECT workspace_id FROM public.galx_workspace_members WHERE user_id = auth.uid()::text
    ));

-- 3. galx_billing_notification_channels RLS Policies
DROP POLICY IF EXISTS "galx_notif_channels_service_role" ON public.galx_billing_notification_channels;
CREATE POLICY "galx_notif_channels_service_role" ON public.galx_billing_notification_channels
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "galx_notif_channels_authenticated_select" ON public.galx_billing_notification_channels;
CREATE POLICY "galx_notif_channels_authenticated_select" ON public.galx_billing_notification_channels
    FOR SELECT
    TO authenticated
    USING (workspace_id IN (
        SELECT workspace_id FROM public.galx_workspace_members WHERE user_id = auth.uid()::text
    ));

-- 4. galx_department_cost_allocations RLS Policies
DROP POLICY IF EXISTS "galx_dept_alloc_service_role" ON public.galx_department_cost_allocations;
CREATE POLICY "galx_dept_alloc_service_role" ON public.galx_department_cost_allocations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "galx_dept_alloc_authenticated_select" ON public.galx_department_cost_allocations;
CREATE POLICY "galx_dept_alloc_authenticated_select" ON public.galx_department_cost_allocations
    FOR SELECT
    TO authenticated
    USING (workspace_id IN (
        SELECT workspace_id FROM public.galx_workspace_members WHERE user_id = auth.uid()::text
    ));

-- ============================================================================
-- Atomic Stored Procedures with Fixed Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.galx_evaluate_smart_model_route(
    p_workspace_id UUID,
    p_requested_model TEXT,
    p_observed_latency_ms NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rule RECORD;
    v_effective_model TEXT;
    v_rerouted BOOLEAN := false;
    v_reason TEXT := 'PRIMARY_EXECUTION';
BEGIN
    SELECT * INTO v_rule
    FROM public.galx_model_routing_rules
    WHERE workspace_id = p_workspace_id
      AND primary_model = p_requested_model
      AND is_active = true
    ORDER BY priority DESC
    LIMIT 1;

    IF FOUND THEN
        IF p_observed_latency_ms > v_rule.max_latency_threshold_ms THEN
            v_effective_model := v_rule.fallback_model;
            v_rerouted := true;
            v_reason := 'LATENCY_THRESHOLD_EXCEEDED';

            -- Increment reroute analytics
            UPDATE public.galx_model_routing_rules
            SET total_reroutes = total_reroutes + 1, updated_at = NOW()
            WHERE id = v_rule.id;
        ELSE
            v_effective_model := p_requested_model;
        END IF;
    ELSE
        v_effective_model := p_requested_model;
    END IF;

    RETURN jsonb_build_object(
        'effective_model', v_effective_model,
        'requested_model', p_requested_model,
        'is_rerouted', v_rerouted,
        'reason', v_reason,
        'preserve_prompt_cache', COALESCE(v_rule.preserve_prompt_cache, true)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.galx_allocate_department_spend(
    p_workspace_id UUID,
    p_cost_center_code TEXT,
    p_spend_delta NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_dept RECORD;
    v_new_spend NUMERIC;
    v_is_capped BOOLEAN;
BEGIN
    SELECT * INTO v_dept
    FROM public.galx_department_cost_allocations
    WHERE workspace_id = p_workspace_id AND cost_center_code = p_cost_center_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'COST_CENTER_NOT_FOUND');
    END IF;

    v_new_spend := v_dept.current_month_spend_usd + COALESCE(p_spend_delta, 0);
    v_is_capped := v_new_spend >= v_dept.monthly_budget_cap_usd;

    UPDATE public.galx_department_cost_allocations
    SET 
        current_month_spend_usd = v_new_spend,
        burn_velocity_daily_usd = (v_new_spend / GREATEST(1, EXTRACT(DAY FROM NOW()))),
        updated_at = NOW()
    WHERE id = v_dept.id;

    RETURN jsonb_build_object(
        'success', true,
        'cost_center_code', p_cost_center_code,
        'new_spend_usd', v_new_spend,
        'budget_cap_usd', v_dept.monthly_budget_cap_usd,
        'is_capped', v_is_capped,
        'utilization_pct', ROUND((v_new_spend / v_dept.monthly_budget_cap_usd) * 100, 2)
    );
END;
$$;
