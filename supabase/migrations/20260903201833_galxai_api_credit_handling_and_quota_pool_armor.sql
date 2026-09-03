-- ============================================================================
-- MIGRATION: 20260903201833_galxai_api_credit_handling_and_quota_pool_armor.sql
-- DESCRIPTION: API inference credit holds, burst quotas, and rolling credit pool hardening
-- GOVERNANCE: Paranoid Database Governance (AOP-DB Phase 3)
-- ============================================================================

-- 1. IDEMPOTENT CHECK CONSTRAINT ON CREDIT HOLDS
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_wallet_holds_user_id_valid'
          AND conrelid = 'public.galx_wallet_holds'::regclass
    ) THEN
        ALTER TABLE public.galx_wallet_holds
        ADD CONSTRAINT chk_wallet_holds_user_id_valid
        CHECK (user_id IS NOT NULL AND length(trim(user_id)) > 0 AND length(user_id) <= 128);
    END IF;
END $$;

-- 2. OWNERSHIP REASSIGNMENT ARMOR ON HOLDS AND QUOTAS
DROP TRIGGER IF EXISTS trg_prevent_holds_ownership_reassignment ON public.galx_wallet_holds;
CREATE TRIGGER trg_prevent_holds_ownership_reassignment
    BEFORE UPDATE ON public.galx_wallet_holds
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

DROP TRIGGER IF EXISTS trg_prevent_burst_quotas_ownership_reassignment ON public.pool_tenant_burst_quotas;
CREATE TRIGGER trg_prevent_burst_quotas_ownership_reassignment
    BEFORE UPDATE ON public.pool_tenant_burst_quotas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

DROP TRIGGER IF EXISTS trg_prevent_lumi_leases_ownership_reassignment ON public.lumi_user_pool_leases;
CREATE TRIGGER trg_prevent_lumi_leases_ownership_reassignment
    BEFORE UPDATE ON public.lumi_user_pool_leases
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

DROP TRIGGER IF EXISTS trg_prevent_lumi_quotas_ownership_reassignment ON public.lumi_user_rolling_quotas;
CREATE TRIGGER trg_prevent_lumi_quotas_ownership_reassignment
    BEFORE UPDATE ON public.lumi_user_rolling_quotas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

DROP TRIGGER IF EXISTS trg_prevent_comm_grants_ownership_reassignment ON public.community_user_monthly_grants;
CREATE TRIGGER trg_prevent_comm_grants_ownership_reassignment
    BEFORE UPDATE ON public.community_user_monthly_grants
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

-- 3. UPGRADE RLS POLICIES TO CACHED INITPLAN SUBQUERIES
DROP POLICY IF EXISTS "users_read_own_tenant_bursts" ON public.pool_tenant_burst_quotas;
DROP POLICY IF EXISTS p_tenant_burst_quotas_select ON public.pool_tenant_burst_quotas;
CREATE POLICY p_tenant_burst_quotas_select ON public.pool_tenant_burst_quotas
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS "users_read_own_lumi_leases" ON public.lumi_user_pool_leases;
DROP POLICY IF EXISTS p_lumi_leases_select ON public.lumi_user_pool_leases;
CREATE POLICY p_lumi_leases_select ON public.lumi_user_pool_leases
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS "users_read_own_lumi_quotas" ON public.lumi_user_rolling_quotas;
DROP POLICY IF EXISTS p_lumi_quotas_select ON public.lumi_user_rolling_quotas;
CREATE POLICY p_lumi_quotas_select ON public.lumi_user_rolling_quotas
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS "users_read_own_comm_grants" ON public.community_user_monthly_grants;
DROP POLICY IF EXISTS p_comm_grants_select ON public.community_user_monthly_grants;
CREATE POLICY p_comm_grants_select ON public.community_user_monthly_grants
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS "users_read_own_comm_grant_allocs" ON public.community_grant_allocations;
DROP POLICY IF EXISTS p_comm_grant_allocs_select ON public.community_grant_allocations;
CREATE POLICY p_comm_grant_allocs_select ON public.community_grant_allocations
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);

-- 4. GRANULAR DAC PERMISSIONS FOR AUTHENTICATED ROLE
GRANT SELECT ON public.galx_wallet_holds TO authenticated;
GRANT SELECT ON public.pool_tenant_burst_quotas TO authenticated;
GRANT SELECT ON public.lumi_user_pool_leases TO authenticated;
GRANT SELECT ON public.lumi_user_rolling_quotas TO authenticated;
GRANT SELECT ON public.community_user_monthly_grants TO authenticated;
GRANT SELECT ON public.community_grant_allocations TO authenticated;

-- 5. EXPLICIT REVOCATION OF DANGEROUS MUTATIONS (DEFENSE-IN-DEPTH)
REVOKE UPDATE, DELETE ON public.galx_wallet_holds FROM authenticated, anon, PUBLIC;
REVOKE UPDATE, DELETE ON public.pool_tenant_burst_quotas FROM authenticated, anon, PUBLIC;
REVOKE UPDATE, DELETE ON public.lumi_user_pool_leases FROM authenticated, anon, PUBLIC;
REVOKE UPDATE, DELETE ON public.lumi_user_rolling_quotas FROM authenticated, anon, PUBLIC;
REVOKE UPDATE, DELETE ON public.community_user_monthly_grants FROM authenticated, anon, PUBLIC;
REVOKE UPDATE, DELETE ON public.community_grant_allocations FROM authenticated, anon, PUBLIC;

-- 6. EXECUTION PRIVILEGES FOR CREDIT MANAGEMENT PROCEDURES
GRANT EXECUTE ON FUNCTION public.fn_reserve_wallet_hold(VARCHAR, NUMERIC, BIGINT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_commit_wallet_hold(UUID, NUMERIC, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_release_wallet_hold(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_scavenge_expired_holds() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_lease_wallet_credit_slice(VARCHAR, NUMERIC, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_reconcile_wallet_credit_slice(VARCHAR, VARCHAR, NUMERIC) TO authenticated, service_role;
