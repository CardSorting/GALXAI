-- ============================================================================
-- ROLLBACK: 20260903200000_galxai_least_privilege_dac_grants_for_authenticated_tenant_role.down.sql
-- DESCRIPTION: Revert least-privilege DAC SQL permissions
-- ============================================================================

-- 1. REVOKE TABLE PERMISSIONS FROM AUTHENTICATED
REVOKE SELECT ON public.galx_stripe_invoices FROM authenticated;
REVOKE SELECT, INSERT, UPDATE ON public.galx_stripe_customers FROM authenticated;
REVOKE SELECT, INSERT ON public.galx_audit_logs FROM authenticated;
REVOKE SELECT, UPDATE ON public.galx_wallets FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.galx_budget_alerts FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.galx_chat_rolling_memory FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.galx_tasks FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.image_generations FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.custom_personas FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.chat_messages FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.galx_developer_keys FROM authenticated;

-- 2. REVOKE ANON PERMISSIONS
REVOKE SELECT ON public.image_generations FROM anon;
REVOKE SELECT ON public.custom_personas FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.chat_messages FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations FROM anon;
