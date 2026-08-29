-- ============================================================================
-- Migration: 20260822000018_galxai_spend_governance_and_forensic_remediation.sql
-- Description: Enterprise AI Spend Governance Policies, Model Route Evidence,
--              Forensic Waste Incidents, and Departmental Cost Attribution Mesh.
-- Paranoia Standard: 100% RLS Enabled & Forced, Indexes on all Foreign Keys,
--                    SECURITY DEFINER with fixed search_path, Idempotent DDL.
-- ============================================================================

-- 1. Enterprise Spend Governance Policies
CREATE TABLE IF NOT EXISTS public.galx_spend_governance_policies (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.galx_workspaces(id) ON DELETE CASCADE,
    department VARCHAR(64) DEFAULT NULL,
    cost_center VARCHAR(64) DEFAULT NULL,
    environment VARCHAR(32) NOT NULL DEFAULT 'production',
    mode VARCHAR(16) NOT NULL DEFAULT 'observe' CHECK (mode IN ('observe', 'recommend', 'enforce')),
    tier_cascading_enabled BOOLEAN NOT NULL DEFAULT true,
    dynamic_prefix_cache_enabled BOOLEAN NOT NULL DEFAULT true,
    circuit_breaker_max_turns INTEGER NOT NULL DEFAULT 12,
    staging_spend_ceiling_daily_usd NUMERIC(10, 2) NOT NULL DEFAULT 25.00,
    max_output_tokens INTEGER DEFAULT 4096,
    max_estimated_request_cost_usd NUMERIC(8, 4) DEFAULT 5.0000,
    require_attribution BOOLEAN NOT NULL DEFAULT false,
    minimum_evaluation_samples INTEGER NOT NULL DEFAULT 200,
    maximum_quality_regression NUMERIC(5, 4) NOT NULL DEFAULT 0.0100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Model Route Evidence & Statistical Quality Attestation
CREATE TABLE IF NOT EXISTS public.galx_model_route_evidence (
    id VARCHAR(128) PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.galx_workspaces(id) ON DELETE CASCADE,
    requested_model VARCHAR(64) NOT NULL,
    target_model VARCHAR(64) NOT NULL,
    workload VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'approved' CHECK (status IN ('draft', 'approved', 'revoked')),
    sample_size INTEGER NOT NULL,
    baseline_success_rate NUMERIC(6, 4) NOT NULL,
    candidate_success_rate NUMERIC(6, 4) NOT NULL,
    lower_bound_quality_delta NUMERIC(6, 4) NOT NULL,
    attestation_digest VARCHAR(64) NOT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Forensic Waste Incidents & Real-Time Remediation Log
CREATE TABLE IF NOT EXISTS public.galx_forensic_waste_incidents (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.galx_workspaces(id) ON DELETE CASCADE,
    incident_type VARCHAR(64) NOT NULL CHECK (incident_type IN (
        'FRONTIER_MISALLOCATION',
        'CACHE_BUSTING_PREFIX',
        'UNCAPPED_STAGING_KEY',
        'RUNAWAY_AGENT_LOOP',
        'REDUNDANT_SEMANTIC_QUERY',
        'CONTEXT_BLOAT',
        'OUTPUT_EXPLOSION'
    )),
    severity VARCHAR(16) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    requested_model VARCHAR(64) NOT NULL,
    remediation_action VARCHAR(64) NOT NULL,
    estimated_waste_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    recovered_savings_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    department VARCHAR(64) DEFAULT NULL,
    cost_center VARCHAR(64) DEFAULT NULL,
    repository_name VARCHAR(128) DEFAULT NULL,
    service_name VARCHAR(128) DEFAULT NULL,
    fingerprint VARCHAR(128) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Departmental Spend Attribution & Chargeback Ledger
CREATE TABLE IF NOT EXISTS public.galx_departmental_spend_attributions (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.galx_workspaces(id) ON DELETE CASCADE,
    period_date DATE NOT NULL,
    department VARCHAR(64) NOT NULL,
    cost_center VARCHAR(64) NOT NULL,
    gross_retail_spend_usd NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    net_galx_spend_usd NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    total_requests BIGINT NOT NULL DEFAULT 0,
    total_input_tokens BIGINT NOT NULL DEFAULT 0,
    total_output_tokens BIGINT NOT NULL DEFAULT 0,
    cached_input_tokens BIGINT NOT NULL DEFAULT 0,
    avoided_waste_usd NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    cache_rebate_usd NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dept_spend_period UNIQUE (workspace_id, period_date, department, cost_center)
);

-- ============================================================================
-- Foreign Key & Operational Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_spend_policies_workspace ON public.galx_spend_governance_policies(workspace_id);
CREATE INDEX IF NOT EXISTS idx_spend_policies_dept ON public.galx_spend_governance_policies(workspace_id, department);
CREATE INDEX IF NOT EXISTS idx_route_evidence_workspace ON public.galx_model_route_evidence(workspace_id);
CREATE INDEX IF NOT EXISTS idx_route_evidence_lookup ON public.galx_model_route_evidence(workspace_id, requested_model, workload, status);
CREATE INDEX IF NOT EXISTS idx_waste_incidents_workspace ON public.galx_forensic_waste_incidents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_waste_incidents_detected ON public.galx_forensic_waste_incidents(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_dept_spend_workspace ON public.galx_departmental_spend_attributions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dept_spend_lookup ON public.galx_departmental_spend_attributions(workspace_id, period_date, department);

-- ============================================================================
-- RLS Security: 100% Forced & Strict Multi-Tenant Isolation
-- ============================================================================

ALTER TABLE public.galx_spend_governance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_spend_governance_policies FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_model_route_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_model_route_evidence FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_forensic_waste_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_forensic_waste_incidents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.galx_departmental_spend_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_departmental_spend_attributions FORCE ROW LEVEL SECURITY;

-- Policies for galx_spend_governance_policies
CREATE POLICY "Users can view spend governance policies in accessible workspaces"
    ON public.galx_spend_governance_policies
    FOR SELECT
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.galx_workspace_members
            WHERE user_id = (SELECT auth.uid()::text)
        )
    );

CREATE POLICY "Workspace admins can manage spend governance policies"
    ON public.galx_spend_governance_policies
    FOR ALL
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.galx_workspace_members
            WHERE user_id = (SELECT auth.uid()::text) AND role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.galx_workspace_members
            WHERE user_id = (SELECT auth.uid()::text) AND role IN ('owner', 'admin')
        )
    );

-- Policies for galx_model_route_evidence
CREATE POLICY "Users can view route evidence in accessible workspaces"
    ON public.galx_model_route_evidence
    FOR SELECT
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.galx_workspace_members
            WHERE user_id = (SELECT auth.uid()::text)
        )
    );

CREATE POLICY "Workspace admins can insert or update route evidence"
    ON public.galx_model_route_evidence
    FOR ALL
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.galx_workspace_members
            WHERE user_id = (SELECT auth.uid()::text) AND role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.galx_workspace_members
            WHERE user_id = (SELECT auth.uid()::text) AND role IN ('owner', 'admin')
        )
    );

-- Policies for galx_forensic_waste_incidents
CREATE POLICY "Users can view waste incidents in accessible workspaces"
    ON public.galx_forensic_waste_incidents
    FOR SELECT
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.galx_workspace_members
            WHERE user_id = (SELECT auth.uid()::text)
        )
    );

-- Policies for galx_departmental_spend_attributions
CREATE POLICY "Users can view spend attributions in accessible workspaces"
    ON public.galx_departmental_spend_attributions
    FOR SELECT
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.galx_workspace_members
            WHERE user_id = (SELECT auth.uid()::text)
        )
    );

-- ============================================================================
-- Stored Procedures: Forensic Waste Recording & Attribution Rollup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.galx_record_forensic_waste_incident(
    p_incident_id VARCHAR(64),
    p_workspace_id UUID,
    p_incident_type VARCHAR(64),
    p_severity VARCHAR(16),
    p_requested_model VARCHAR(64),
    p_remediation_action VARCHAR(64),
    p_estimated_waste_usd NUMERIC(10, 4),
    p_recovered_savings_usd NUMERIC(10, 4),
    p_department VARCHAR(64) DEFAULT NULL,
    p_cost_center VARCHAR(64) DEFAULT NULL,
    p_repository_name VARCHAR(128) DEFAULT NULL,
    p_service_name VARCHAR(128) DEFAULT NULL,
    p_fingerprint VARCHAR(128) DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.galx_forensic_waste_incidents (
        id,
        workspace_id,
        incident_type,
        severity,
        requested_model,
        remediation_action,
        estimated_waste_usd,
        recovered_savings_usd,
        department,
        cost_center,
        repository_name,
        service_name,
        fingerprint,
        metadata,
        detected_at
    ) VALUES (
        p_incident_id,
        p_workspace_id,
        p_incident_type,
        p_severity,
        p_requested_model,
        p_remediation_action,
        p_estimated_waste_usd,
        p_recovered_savings_usd,
        p_department,
        p_cost_center,
        p_repository_name,
        p_service_name,
        COALESCE(p_fingerprint, md5(p_incident_id || p_incident_type)),
        p_metadata,
        NOW()
    );
END;
$$;
