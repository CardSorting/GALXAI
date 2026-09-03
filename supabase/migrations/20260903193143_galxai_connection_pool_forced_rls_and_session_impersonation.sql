-- ============================================================================
-- MIGRATION: 20260903193143_galxai_connection_pool_forced_rls_and_session_impersonation.sql
-- DESCRIPTION: Force Row-Level Security on core tenant tables and establish session context impersonation
-- GOVERNANCE: Paranoid Database Governance (AOP-DB Phase 3)
-- ============================================================================

-- 1. FORCE ROW LEVEL SECURITY ON CORE TENANT TABLES
-- Forces RLS policies to evaluate even for table owners / direct connection pools
ALTER TABLE IF EXISTS public.galx_developer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_developer_keys FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_conversations FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.galx_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_audit_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.galx_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_wallets FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.galx_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.galx_task_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_task_queues FORCE ROW LEVEL SECURITY;

-- 2. COMPREHENSIVE RLS POLICIES FOR DEVELOPER GATEWAY KEYS
-- Ensure authenticated tenants can query, register, update, and revoke their own keys
DROP POLICY IF EXISTS "service_role_all_galx_developer_keys" ON public.galx_developer_keys;
CREATE POLICY "service_role_all_galx_developer_keys" ON public.galx_developer_keys
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS p_user_read_own_keys ON public.galx_developer_keys;
DROP POLICY IF EXISTS "user_view_own_developer_keys" ON public.galx_developer_keys;
CREATE POLICY p_user_read_own_keys ON public.galx_developer_keys
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS p_user_insert_own_keys ON public.galx_developer_keys;
CREATE POLICY p_user_insert_own_keys ON public.galx_developer_keys
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS p_user_update_own_keys ON public.galx_developer_keys;
CREATE POLICY p_user_update_own_keys ON public.galx_developer_keys
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()::text) = user_id)
    WITH CHECK ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS p_user_delete_own_keys ON public.galx_developer_keys;
CREATE POLICY p_user_delete_own_keys ON public.galx_developer_keys
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);

-- 3. TENANT SESSION CONTEXT ASSERTION HELPER
-- Validates that the active transaction session contains an authenticated tenant identity
CREATE OR REPLACE FUNCTION public.fn_assert_tenant_context()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tenant_id text;
BEGIN
    v_tenant_id := NULLIF(current_setting('request.jwt.claim.sub', true), '');
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant security violation: No authenticated tenant identity in transaction context';
    END IF;
    RETURN v_tenant_id;
END;
$$;

-- 4. TENANT SESSION CONTEXT INITIALIZER HELPER
-- Directly sets transaction-local JWT claims and configurations in a single atomic procedure call
CREATE OR REPLACE FUNCTION public.fn_set_tenant_session_context(
    p_user_id text,
    p_role text DEFAULT 'authenticated',
    p_email text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
        RAISE EXCEPTION 'Invalid tenant session: user_id cannot be empty';
    END IF;

    PERFORM set_config('request.jwt.claim.sub', p_user_id, true);
    PERFORM set_config('request.jwt.claim.role', p_role, true);
    PERFORM set_config('request.jwt.claim.email', p_email, true);
    PERFORM set_config('request.jwt.claims', jsonb_build_object(
        'sub', p_user_id,
        'role', p_role,
        'email', p_email
    )::text, true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_assert_tenant_context() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_set_tenant_session_context(text, text, text) TO authenticated, service_role;
