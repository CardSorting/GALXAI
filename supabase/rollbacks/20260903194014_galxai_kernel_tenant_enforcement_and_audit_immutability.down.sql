-- ============================================================================
-- ROLLBACK: 20260903194014_galxai_kernel_tenant_enforcement_and_audit_immutability.down.sql
-- DESCRIPTION: Revert audit immutability triggers, auto-binding ownership, and RLS adjustments
-- ============================================================================

-- 1. DROP INTROSPECTION FUNCTION
DROP FUNCTION IF EXISTS public.fn_get_current_tenant_claims();

-- 2. REVERT RLS POLICIES
DROP POLICY IF EXISTS p_user_read_own_wallet ON public.galx_wallets;
DROP POLICY IF EXISTS p_user_insert_own_audit_logs ON public.galx_audit_logs;
DROP POLICY IF EXISTS p_user_read_own_audit_logs ON public.galx_audit_logs;

-- 3. DROP TENANT OWNERSHIP TRIGGERS
DROP TRIGGER IF EXISTS trg_enforce_chat_conv_tenant_ownership ON public.chat_conversations;
DROP TRIGGER IF EXISTS trg_enforce_dev_keys_tenant_ownership ON public.galx_developer_keys;
DROP FUNCTION IF EXISTS public.fn_enforce_tenant_ownership_on_insert();

-- 4. DROP AUDIT IMMUTABILITY TRIGGER
DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON public.galx_audit_logs;
DROP FUNCTION IF EXISTS public.fn_prevent_audit_log_mutation();

-- 5. RESTORE PRIVILEGES
GRANT UPDATE, DELETE ON public.galx_audit_logs TO authenticated;
