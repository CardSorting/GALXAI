-- ============================================================================
-- Migration: 20260822000017_galxai_slo_canaries_and_outage_ledger.sql
-- Description: Enterprise Service Level Objectives (SLO), Synthetic Canaries,
--              Incident Outage Ledger, and Maintenance Windows Mesh.
-- Paranoia Standard: 100% RLS Enabled & Forced, Indexes on all Foreign Keys,
--                    SECURITY DEFINER with fixed search_path, Idempotent DDL.
-- ============================================================================

-- 1. Enterprise Service Level Objectives (SLO) & Error Budget Agreements
CREATE TABLE IF NOT EXISTS public.galx_slo_agreements (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.galx_workspaces(id) ON DELETE CASCADE,
    tier VARCHAR(32) NOT NULL DEFAULT 'enterprise',
    target_uptime_pct NUMERIC(6, 3) NOT NULL DEFAULT 99.990,
    target_latency_p95_ms NUMERIC(8, 2) NOT NULL DEFAULT 25.00,
    target_latency_p99_ms NUMERIC(8, 2) NOT NULL DEFAULT 40.00,
    error_budget_total_seconds NUMERIC(10, 2) NOT NULL DEFAULT 259.20, -- ~4.32 mins per month for 99.99%
    error_budget_spent_seconds NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    current_month_uptime_pct NUMERIC(6, 3) NOT NULL DEFAULT 100.000,
    sla_credit_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 2.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Multi-Region Edge Synthetic Canary Probes (SFO, IAD, FRA, NRT, SYD)
CREATE TABLE IF NOT EXISTS public.galx_synthetic_canary_probes (
    id VARCHAR(64) PRIMARY KEY,
    probe_name VARCHAR(64) NOT NULL,
    edge_pop VARCHAR(32) NOT NULL,
    model_id VARCHAR(64) NOT NULL,
    status_code INTEGER NOT NULL DEFAULT 200,
    ttft_latency_ms NUMERIC(8, 2) NOT NULL,
    total_duration_ms NUMERIC(8, 2) NOT NULL,
    tls_handshake_ms NUMERIC(8, 2) NOT NULL DEFAULT 4.50,
    is_healthy BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT DEFAULT NULL,
    probed_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Transparent Incident Outage & SLA Rebate Ledger
CREATE TABLE IF NOT EXISTS public.galx_incident_outage_ledger (
    id VARCHAR(64) PRIMARY KEY,
    incident_number VARCHAR(32) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
    affected_components TEXT[] NOT NULL DEFAULT ARRAY['edge_routing']::TEXT[],
    affected_providers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    root_cause_summary TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ DEFAULT NULL,
    duration_seconds INTEGER DEFAULT NULL,
    automatic_sla_credits_issued_usd NUMERIC(14, 6) NOT NULL DEFAULT 0.000000,
    postmortem_slug VARCHAR(128) DEFAULT NULL,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Scheduled Maintenance Windows Registry
CREATE TABLE IF NOT EXISTS public.galx_scheduled_maintenance_windows (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    expected_impact VARCHAR(64) NOT NULL DEFAULT 'Zero downtime edge traffic rerouting',
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Secondary B-Tree & Multi-Column Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_galx_slo_workspace ON public.galx_slo_agreements (workspace_id);
CREATE INDEX IF NOT EXISTS idx_galx_slo_tier ON public.galx_slo_agreements (tier);
CREATE INDEX IF NOT EXISTS idx_galx_slo_active ON public.galx_slo_agreements (is_active);

CREATE INDEX IF NOT EXISTS idx_galx_canary_probe_name ON public.galx_synthetic_canary_probes (probe_name);
CREATE INDEX IF NOT EXISTS idx_galx_canary_pop ON public.galx_synthetic_canary_probes (edge_pop);
CREATE INDEX IF NOT EXISTS idx_galx_canary_healthy ON public.galx_synthetic_canary_probes (is_healthy);
CREATE INDEX IF NOT EXISTS idx_galx_canary_probed_at ON public.galx_synthetic_canary_probes (probed_at_ms);

CREATE INDEX IF NOT EXISTS idx_galx_incident_severity ON public.galx_incident_outage_ledger (severity);
CREATE INDEX IF NOT EXISTS idx_galx_incident_started ON public.galx_incident_outage_ledger (started_at);
CREATE INDEX IF NOT EXISTS idx_galx_incident_published ON public.galx_incident_outage_ledger (is_published);

CREATE INDEX IF NOT EXISTS idx_galx_maint_start ON public.galx_scheduled_maintenance_windows (scheduled_start);
CREATE INDEX IF NOT EXISTS idx_galx_maint_completed ON public.galx_scheduled_maintenance_windows (is_completed);

-- ============================================================================
-- Paranoid Row Level Security (RLS) Configuration
-- ============================================================================

ALTER TABLE public.galx_slo_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_slo_agreements FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_synthetic_canary_probes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_synthetic_canary_probes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_incident_outage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_incident_outage_ledger FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_scheduled_maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_scheduled_maintenance_windows FORCE ROW LEVEL SECURITY;

-- 1. galx_slo_agreements RLS Policies
DROP POLICY IF EXISTS "galx_slo_service_role" ON public.galx_slo_agreements;
CREATE POLICY "galx_slo_service_role" ON public.galx_slo_agreements
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "galx_slo_authenticated_select" ON public.galx_slo_agreements;
CREATE POLICY "galx_slo_authenticated_select" ON public.galx_slo_agreements
    FOR SELECT
    TO authenticated
    USING (workspace_id IN (
        SELECT workspace_id FROM public.galx_workspace_members WHERE user_id = auth.uid()::text
    ));

-- 2. galx_synthetic_canary_probes RLS Policies
DROP POLICY IF EXISTS "galx_canary_service_role" ON public.galx_synthetic_canary_probes;
CREATE POLICY "galx_canary_service_role" ON public.galx_synthetic_canary_probes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "galx_canary_authenticated_select" ON public.galx_synthetic_canary_probes;
CREATE POLICY "galx_canary_authenticated_select" ON public.galx_synthetic_canary_probes
    FOR SELECT
    TO authenticated
    USING (true);

-- 3. galx_incident_outage_ledger RLS Policies
DROP POLICY IF EXISTS "galx_incident_service_role" ON public.galx_incident_outage_ledger;
CREATE POLICY "galx_incident_service_role" ON public.galx_incident_outage_ledger
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "galx_incident_authenticated_select" ON public.galx_incident_outage_ledger;
CREATE POLICY "galx_incident_authenticated_select" ON public.galx_incident_outage_ledger
    FOR SELECT
    TO authenticated
    USING (is_published = true);

-- 4. galx_scheduled_maintenance_windows RLS Policies
DROP POLICY IF EXISTS "galx_maint_service_role" ON public.galx_scheduled_maintenance_windows;
CREATE POLICY "galx_maint_service_role" ON public.galx_scheduled_maintenance_windows
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "galx_maint_authenticated_select" ON public.galx_scheduled_maintenance_windows;
CREATE POLICY "galx_maint_authenticated_select" ON public.galx_scheduled_maintenance_windows
    FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================================
-- Atomic Stored Procedures with Fixed Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.galx_record_synthetic_canary_result(
    p_probe_name TEXT,
    p_edge_pop TEXT,
    p_model_id TEXT,
    p_status_code INTEGER,
    p_ttft_ms NUMERIC,
    p_total_duration_ms NUMERIC,
    p_tls_ms NUMERIC,
    p_error_msg TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id VARCHAR(64);
    v_now_ms BIGINT;
    v_healthy BOOLEAN;
BEGIN
    v_now_ms := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
    v_id := 'probe_' || v_now_ms || '_' || substring(md5(random()::text) from 1 for 6);
    v_healthy := (p_status_code >= 200 AND p_status_code < 400);

    INSERT INTO public.galx_synthetic_canary_probes (
        id,
        probe_name,
        edge_pop,
        model_id,
        status_code,
        ttft_latency_ms,
        total_duration_ms,
        tls_handshake_ms,
        is_healthy,
        error_message,
        probed_at_ms
    ) VALUES (
        v_id,
        p_probe_name,
        p_edge_pop,
        p_model_id,
        p_status_code,
        p_ttft_ms,
        p_total_duration_ms,
        COALESCE(p_tls_ms, 4.50),
        v_healthy,
        p_error_msg,
        v_now_ms
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.galx_calculate_slo_error_budget(
    p_workspace_id UUID,
    p_slo_id VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_slo RECORD;
    v_budget_remaining_pct NUMERIC;
BEGIN
    SELECT * INTO v_slo
    FROM public.galx_slo_agreements
    WHERE workspace_id = p_workspace_id AND id = p_slo_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'SLO_AGREEMENT_NOT_FOUND'
        );
    END IF;

    IF v_slo.error_budget_total_seconds > 0 THEN
        v_budget_remaining_pct := GREATEST(0.00, ROUND(((v_slo.error_budget_total_seconds - v_slo.error_budget_spent_seconds) / v_slo.error_budget_total_seconds) * 100, 2));
    ELSE
        v_budget_remaining_pct := 100.00;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'slo_id', v_slo.id,
        'target_uptime_pct', v_slo.target_uptime_pct,
        'current_uptime_pct', v_slo.current_month_uptime_pct,
        'error_budget_total_seconds', v_slo.error_budget_total_seconds,
        'error_budget_spent_seconds', v_slo.error_budget_spent_seconds,
        'budget_remaining_pct', v_budget_remaining_pct,
        'is_breached', (v_budget_remaining_pct <= 0.00)
    );
END;
$$;
