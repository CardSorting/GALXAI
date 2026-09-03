-- ============================================================================
-- MIGRATION: 20260903202157_galxai_workspaces_and_team_billing_spend_armor.sql
-- DESCRIPTION: Workspace spend tamper-proofing, team cost center armor, and governance audit immutability
-- GOVERNANCE: Paranoid Database Governance (AOP-DB Phase 3)
-- ============================================================================

-- 1. FORCE ROW LEVEL SECURITY ON WORKSPACES AND WORKSPACE MEMBERS
ALTER TABLE IF EXISTS public.galx_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_workspaces FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.galx_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_workspace_members FORCE ROW LEVEL SECURITY;

-- 2. WORKSPACE SPEND TAMPER-PROOFING TRIGGER
CREATE OR REPLACE FUNCTION public.fn_prevent_workspace_spend_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role text := COALESCE(
        current_setting('request.jwt.claim.role', true),
        (SELECT auth.role())
    );
BEGIN
    -- Superuser and service role manage spend calculations via backend jobs
    IF v_role = 'service_role' OR current_user = 'postgres' THEN
        RETURN NEW;
    END IF;

    -- Authenticated tenants are prohibited from forging current month spend
    IF NEW.current_month_spend_usd IS DISTINCT FROM OLD.current_month_spend_usd THEN
        RAISE EXCEPTION 'Engine Violation: direct workspace current spend modification forbidden for authenticated role.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_prevent_workspace_spend_tampering() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_prevent_workspace_spend_tampering ON public.galx_workspaces;
CREATE TRIGGER trg_prevent_workspace_spend_tampering
    BEFORE UPDATE ON public.galx_workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_workspace_spend_tampering();

-- 3. TEAM COST CENTER SPEND TAMPER-PROOFING TRIGGER
CREATE OR REPLACE FUNCTION public.fn_prevent_cost_center_spend_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role text := COALESCE(
        current_setting('request.jwt.claim.role', true),
        (SELECT auth.role())
    );
BEGIN
    IF v_role = 'service_role' OR current_user = 'postgres' THEN
        RETURN NEW;
    END IF;

    IF NEW.current_spend_usd IS DISTINCT FROM OLD.current_spend_usd THEN
        RAISE EXCEPTION 'Engine Violation: direct cost center current spend modification forbidden for authenticated role.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_prevent_cost_center_spend_tampering() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_prevent_cost_center_spend_tampering ON public.galx_team_cost_centers;
CREATE TRIGGER trg_prevent_cost_center_spend_tampering
    BEFORE UPDATE ON public.galx_team_cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_cost_center_spend_tampering();

-- 4. GOVERNANCE AUDIT IMMUTABILITY TRIGGER
DROP TRIGGER IF EXISTS trg_prevent_gov_audit_mutation ON public.galx_governance_audit_events;
CREATE TRIGGER trg_prevent_gov_audit_mutation
    BEFORE UPDATE OR DELETE ON public.galx_governance_audit_events
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_audit_log_mutation();

-- 5. INITPLAN CACHED RLS POLICIES FOR WORKSPACES AND MEMBERS
DROP POLICY IF EXISTS p_workspaces_member_select ON public.galx_workspaces;
CREATE POLICY p_workspaces_member_select ON public.galx_workspaces
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.galx_workspace_members wm
            WHERE wm.workspace_id = galx_workspaces.id
              AND wm.user_id = (SELECT auth.uid()::text)
        )
    );

DROP POLICY IF EXISTS p_workspace_members_select ON public.galx_workspace_members;
CREATE POLICY p_workspace_members_select ON public.galx_workspace_members
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid()::text)
        OR EXISTS (
            SELECT 1 FROM public.galx_workspace_members wm2
            WHERE wm2.workspace_id = galx_workspace_members.workspace_id
              AND wm2.user_id = (SELECT auth.uid()::text)
        )
    );

-- 6. LEAST-PRIVILEGE DAC PERMISSIONS FOR AUTHENTICATED ROLE
GRANT SELECT ON public.galx_workspaces TO authenticated;
GRANT SELECT ON public.galx_workspace_members TO authenticated;
GRANT SELECT ON public.galx_organizations TO authenticated;
GRANT SELECT ON public.galx_organization_members TO authenticated;
GRANT SELECT ON public.galx_team_cost_centers TO authenticated;
GRANT SELECT ON public.galx_team_invitations TO authenticated;
GRANT SELECT ON public.galx_governance_audit_events TO authenticated;

REVOKE UPDATE, DELETE ON public.galx_governance_audit_events FROM authenticated, anon, PUBLIC;
