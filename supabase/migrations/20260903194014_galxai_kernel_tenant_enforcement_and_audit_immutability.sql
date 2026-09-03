-- ============================================================================
-- MIGRATION: 20260903194014_galxai_kernel_tenant_enforcement_and_audit_immutability.sql
-- DESCRIPTION: Enforce schema-level audit immutability, auto-binding tenant ownership, and optimized InitPlan RLS
-- GOVERNANCE: Paranoid Database Governance (AOP-DB Phase 3)
-- ============================================================================

-- 1. AUDIT LOG IMMUTABILITY PROTOCOL
-- Prevents UPDATE or DELETE mutations on the audit log table at the PostgreSQL engine level
CREATE OR REPLACE FUNCTION public.fn_prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Cryptographic security violation: Audit logs are immutable and cannot be modified or deleted (id: %)', OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON public.galx_audit_logs;
CREATE TRIGGER trg_prevent_audit_log_mutation
    BEFORE UPDATE OR DELETE ON public.galx_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_audit_log_mutation();

-- Revoke write-alteration privileges from non-superusers
REVOKE UPDATE, DELETE ON public.galx_audit_logs FROM authenticated, anon, PUBLIC;

-- 2. TENANT OWNERSHIP AUTO-BINDING ON INSERT
-- Guarantees that authenticated tenants automatically bind their authenticated identity to new records
CREATE OR REPLACE FUNCTION public.fn_enforce_tenant_ownership_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid text;
    v_auth_role text;
BEGIN
    v_auth_uid := NULLIF(current_setting('request.jwt.claim.sub', true), '');
    v_auth_role := COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), current_user);

    -- Apply only to authenticated tenant executions
    IF v_auth_role = 'authenticated' THEN
        IF v_auth_uid IS NULL THEN
            RAISE EXCEPTION 'Tenant security violation: Authenticated session requires valid request.jwt.claim.sub';
        END IF;

        IF NEW.user_id IS NULL THEN
            NEW.user_id := v_auth_uid;
        ELSIF NEW.user_id <> v_auth_uid THEN
            RAISE EXCEPTION 'Tenant isolation violation: Cannot create resource for another tenant (expected %, got %)', v_auth_uid, NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_dev_keys_tenant_ownership ON public.galx_developer_keys;
CREATE TRIGGER trg_enforce_dev_keys_tenant_ownership
    BEFORE INSERT ON public.galx_developer_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_tenant_ownership_on_insert();

DROP TRIGGER IF EXISTS trg_enforce_chat_conv_tenant_ownership ON public.chat_conversations;
CREATE TRIGGER trg_enforce_chat_conv_tenant_ownership
    BEFORE INSERT ON public.chat_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_tenant_ownership_on_insert();

-- 3. OPTIMIZED INITPLAN CACHED RLS POLICIES FOR AUDIT LOGS & WALLETS
-- Wrapping auth.uid() inside (SELECT auth.uid()::text) evaluates once per query (InitPlan) rather than per row
DROP POLICY IF EXISTS p_user_read_own_audit_logs ON public.galx_audit_logs;
CREATE POLICY p_user_read_own_audit_logs ON public.galx_audit_logs
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS p_user_insert_own_audit_logs ON public.galx_audit_logs;
CREATE POLICY p_user_insert_own_audit_logs ON public.galx_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS p_user_read_own_wallet ON public.galx_wallets;
CREATE POLICY p_user_read_own_wallet ON public.galx_wallets
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);

-- 4. TENANT CONTEXT INTROSPECTION PROCEDURE
-- Returns the full decoded JWT claims object for forensic verification
CREATE OR REPLACE FUNCTION public.fn_get_current_tenant_claims()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_claims text;
BEGIN
    v_claims := NULLIF(current_setting('request.jwt.claims', true), '');
    IF v_claims IS NOT NULL THEN
        BEGIN
            RETURN v_claims::jsonb;
        EXCEPTION WHEN OTHERS THEN
            -- Return structured fallback
        END;
    END IF;

    RETURN jsonb_build_object(
        'sub', NULLIF(current_setting('request.jwt.claim.sub', true), ''),
        'role', COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), current_user),
        'email', NULLIF(current_setting('request.jwt.claim.email', true), '')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_current_tenant_claims() TO authenticated, service_role;
