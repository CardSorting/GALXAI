-- ============================================================================
-- MIGRATION: 20260903200000_galxai_least_privilege_dac_grants_for_authenticated_tenant_role.sql
-- DESCRIPTION: Grant least-privilege DAC SQL permissions to authenticated role for pool tenant impersonation
-- GOVERNANCE: Paranoid Database Governance (AOP-DB Phase 3)
-- ============================================================================

-- 1. SCHEMA AND SEQUENCE USAGE
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 2. LEAST-PRIVILEGE TABLE GRANTS FOR AUTHENTICATED TENANT ROLE
-- Full CRUD for self-service tenant resources
GRANT SELECT, INSERT, UPDATE, DELETE ON public.galx_developer_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_personas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_generations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.galx_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.galx_chat_rolling_memory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.galx_budget_alerts TO authenticated;

-- Restricted grants: Wallets (no DELETE), Audits (no UPDATE/DELETE), Invoices (SELECT only)
GRANT SELECT, UPDATE ON public.galx_wallets TO authenticated;
GRANT SELECT, INSERT ON public.galx_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.galx_stripe_customers TO authenticated;
GRANT SELECT ON public.galx_stripe_invoices TO authenticated;

-- Guest access for unauthenticated playground sessions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO anon;
GRANT SELECT ON public.custom_personas TO anon;
GRANT SELECT ON public.image_generations TO anon;

-- 3. EXPLICIT REVOCATION OF DANGEROUS MUTATIONS (DEFENSE-IN-DEPTH)
REVOKE UPDATE, DELETE ON public.galx_audit_logs FROM authenticated, anon, PUBLIC;
REVOKE DELETE ON public.galx_wallets FROM authenticated, anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.galx_stripe_invoices FROM authenticated, anon, PUBLIC;
REVOKE DELETE ON public.galx_stripe_customers FROM authenticated, anon, PUBLIC;

-- 4. FUNCTION EXECUTION PRIVILEGES
GRANT EXECUTE ON FUNCTION public.fn_assert_tenant_context() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_set_tenant_session_context(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_current_tenant_claims() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_is_tenant_resource_owner(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_can_access_conversation(text) TO authenticated, anon, service_role;
