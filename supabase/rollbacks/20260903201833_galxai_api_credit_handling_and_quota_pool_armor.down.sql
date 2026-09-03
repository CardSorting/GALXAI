-- ============================================================================
-- ROLLBACK: 20260903201833_galxai_api_credit_handling_and_quota_pool_armor.down.sql
-- DESCRIPTION: Revert API credit handling and quota pool armor
-- ============================================================================

-- 1. REVOKE GRANTED TABLE PERMISSIONS
REVOKE SELECT ON public.community_grant_allocations FROM authenticated;
REVOKE SELECT ON public.community_user_monthly_grants FROM authenticated;
REVOKE SELECT ON public.lumi_user_rolling_quotas FROM authenticated;
REVOKE SELECT ON public.lumi_user_pool_leases FROM authenticated;
REVOKE SELECT ON public.pool_tenant_burst_quotas FROM authenticated;
REVOKE SELECT ON public.galx_wallet_holds FROM authenticated;

-- 2. REVERT RLS POLICIES
DROP POLICY IF EXISTS p_comm_grant_allocs_select ON public.community_grant_allocations;
DROP POLICY IF EXISTS p_comm_grants_select ON public.community_user_monthly_grants;
DROP POLICY IF EXISTS p_lumi_quotas_select ON public.lumi_user_rolling_quotas;
DROP POLICY IF EXISTS p_lumi_leases_select ON public.lumi_user_pool_leases;
DROP POLICY IF EXISTS p_tenant_burst_quotas_select ON public.pool_tenant_burst_quotas;

CREATE POLICY "users_read_own_comm_grants" 
    ON public.community_user_monthly_grants
    FOR SELECT TO authenticated 
    USING (user_id = auth.uid()::text);

CREATE POLICY "users_read_own_lumi_quotas" 
    ON public.lumi_user_rolling_quotas
    FOR SELECT TO authenticated 
    USING (user_id = auth.uid()::text);

CREATE POLICY "users_read_own_lumi_leases" 
    ON public.lumi_user_pool_leases
    FOR SELECT TO authenticated 
    USING (user_id = auth.uid()::text);

CREATE POLICY "users_read_own_tenant_bursts" 
    ON public.pool_tenant_burst_quotas
    FOR SELECT TO authenticated 
    USING (user_id = auth.uid()::text);

-- 3. DROP OWNERSHIP REASSIGNMENT TRIGGERS
DROP TRIGGER IF EXISTS trg_prevent_comm_grants_ownership_reassignment ON public.community_user_monthly_grants;
DROP TRIGGER IF EXISTS trg_prevent_lumi_quotas_ownership_reassignment ON public.lumi_user_rolling_quotas;
DROP TRIGGER IF EXISTS trg_prevent_lumi_leases_ownership_reassignment ON public.lumi_user_pool_leases;
DROP TRIGGER IF EXISTS trg_prevent_burst_quotas_ownership_reassignment ON public.pool_tenant_burst_quotas;
DROP TRIGGER IF EXISTS trg_prevent_holds_ownership_reassignment ON public.galx_wallet_holds;

-- 4. DROP CHECK CONSTRAINT
ALTER TABLE IF EXISTS public.galx_wallet_holds DROP CONSTRAINT IF EXISTS chk_wallet_holds_user_id_valid;
