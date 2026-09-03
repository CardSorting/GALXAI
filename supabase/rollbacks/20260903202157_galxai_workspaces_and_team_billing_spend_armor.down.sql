-- ============================================================================
-- ROLLBACK: 20260903202157_galxai_workspaces_and_team_billing_spend_armor.down.sql
-- DESCRIPTION: Revert workspaces and team billing spend armor
-- ============================================================================

-- 1. REVOKE GRANTED PERMISSIONS
REVOKE SELECT ON public.galx_governance_audit_events FROM authenticated;
REVOKE SELECT ON public.galx_team_invitations FROM authenticated;
REVOKE SELECT ON public.galx_team_cost_centers FROM authenticated;
REVOKE SELECT ON public.galx_organization_members FROM authenticated;
REVOKE SELECT ON public.galx_organizations FROM authenticated;
REVOKE SELECT ON public.galx_workspace_members FROM authenticated;
REVOKE SELECT ON public.galx_workspaces FROM authenticated;

-- 2. DROP POLICIES
DROP POLICY IF EXISTS p_workspace_members_select ON public.galx_workspace_members;
DROP POLICY IF EXISTS p_workspaces_member_select ON public.galx_workspaces;

-- 3. DROP TRIGGERS AND FUNCTIONS
DROP TRIGGER IF EXISTS trg_prevent_gov_audit_mutation ON public.galx_governance_audit_events;

DROP TRIGGER IF EXISTS trg_prevent_cost_center_spend_tampering ON public.galx_team_cost_centers;
DROP FUNCTION IF EXISTS public.fn_prevent_cost_center_spend_tampering();

DROP TRIGGER IF EXISTS trg_prevent_workspace_spend_tampering ON public.galx_workspaces;
DROP FUNCTION IF EXISTS public.fn_prevent_workspace_spend_tampering();

-- 4. REVERT FORCED ROW LEVEL SECURITY
ALTER TABLE IF EXISTS public.galx_workspace_members NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_workspaces NO FORCE ROW LEVEL SECURITY;
