-- ============================================================================
-- MIGRATION: 20260903195655_galxai_chat_memory_and_billing_forced_rls_armor.sql
-- DESCRIPTION: Force RLS across chat memory and billing, prevent reassignment, and apply InitPlan RLS
-- GOVERNANCE: Paranoid Database Governance (AOP-DB Phase 3)
-- ============================================================================

-- 1. FORCE ROW LEVEL SECURITY ON CHAT MEMORY AND BILLING SUBSTRATES
ALTER TABLE IF EXISTS public.galx_chat_rolling_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_chat_rolling_memory FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.galx_chat_memory_graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_chat_memory_graph_edges FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.galx_chat_context_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_chat_context_episodes FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.galx_budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_budget_alerts FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.galx_stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_stripe_customers FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.galx_stripe_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_stripe_invoices FORCE ROW LEVEL SECURITY;

-- 2. OWNERSHIP REASSIGNMENT ARMOR
DROP TRIGGER IF EXISTS trg_prevent_chat_rolling_mem_ownership_reassignment ON public.galx_chat_rolling_memory;
CREATE TRIGGER trg_prevent_chat_rolling_mem_ownership_reassignment
    BEFORE UPDATE ON public.galx_chat_rolling_memory
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

DROP TRIGGER IF EXISTS trg_prevent_budget_alerts_ownership_reassignment ON public.galx_budget_alerts;
CREATE TRIGGER trg_prevent_budget_alerts_ownership_reassignment
    BEFORE UPDATE ON public.galx_budget_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

DROP TRIGGER IF EXISTS trg_prevent_stripe_customers_ownership_reassignment ON public.galx_stripe_customers;
CREATE TRIGGER trg_prevent_stripe_customers_ownership_reassignment
    BEFORE UPDATE ON public.galx_stripe_customers
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

-- 3. AUTO-BINDING TENANT OWNERSHIP ON INSERT
DROP TRIGGER IF EXISTS trg_enforce_chat_rolling_mem_ownership ON public.galx_chat_rolling_memory;
CREATE TRIGGER trg_enforce_chat_rolling_mem_ownership
    BEFORE INSERT ON public.galx_chat_rolling_memory
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_tenant_ownership_on_insert();

DROP TRIGGER IF EXISTS trg_enforce_budget_alerts_ownership ON public.galx_budget_alerts;
CREATE TRIGGER trg_enforce_budget_alerts_ownership
    BEFORE INSERT ON public.galx_budget_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_tenant_ownership_on_insert();

-- 4. OPTIMIZED INITPLAN CACHED RLS POLICIES FOR ROLLING MEMORY
DROP POLICY IF EXISTS "Users can view own chat rolling memory" ON public.galx_chat_rolling_memory;
DROP POLICY IF EXISTS "Users can update own chat rolling memory" ON public.galx_chat_rolling_memory;
DROP POLICY IF EXISTS p_chat_rolling_mem_select ON public.galx_chat_rolling_memory;
DROP POLICY IF EXISTS p_chat_rolling_mem_insert ON public.galx_chat_rolling_memory;
DROP POLICY IF EXISTS p_chat_rolling_mem_update ON public.galx_chat_rolling_memory;
DROP POLICY IF EXISTS p_chat_rolling_mem_delete ON public.galx_chat_rolling_memory;

CREATE POLICY p_chat_rolling_mem_select ON public.galx_chat_rolling_memory
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);

CREATE POLICY p_chat_rolling_mem_insert ON public.galx_chat_rolling_memory
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()::text) = user_id);

CREATE POLICY p_chat_rolling_mem_update ON public.galx_chat_rolling_memory
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()::text) = user_id)
    WITH CHECK ((SELECT auth.uid()::text) = user_id);

CREATE POLICY p_chat_rolling_mem_delete ON public.galx_chat_rolling_memory
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);
