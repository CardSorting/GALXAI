-- ============================================================================
-- ROLLBACK: 20260903195655_galxai_chat_memory_and_billing_forced_rls_armor.down.sql
-- DESCRIPTION: Revert chat memory and billing forced RLS armor
-- ============================================================================

-- 1. REVERT ROLLING MEMORY POLICIES
DROP POLICY IF EXISTS p_chat_rolling_mem_delete ON public.galx_chat_rolling_memory;
DROP POLICY IF EXISTS p_chat_rolling_mem_update ON public.galx_chat_rolling_memory;
DROP POLICY IF EXISTS p_chat_rolling_mem_insert ON public.galx_chat_rolling_memory;
DROP POLICY IF EXISTS p_chat_rolling_mem_select ON public.galx_chat_rolling_memory;

CREATE POLICY "Users can view own chat rolling memory" 
    ON public.galx_chat_rolling_memory
    FOR SELECT 
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own chat rolling memory" 
    ON public.galx_chat_rolling_memory
    FOR ALL 
    USING (auth.uid()::text = user_id);

-- 2. DROP AUTO-BINDING INSERT TRIGGERS
DROP TRIGGER IF EXISTS trg_enforce_budget_alerts_ownership ON public.galx_budget_alerts;
DROP TRIGGER IF EXISTS trg_enforce_chat_rolling_mem_ownership ON public.galx_chat_rolling_memory;

-- 3. DROP OWNERSHIP REASSIGNMENT TRIGGERS
DROP TRIGGER IF EXISTS trg_prevent_stripe_customers_ownership_reassignment ON public.galx_stripe_customers;
DROP TRIGGER IF EXISTS trg_prevent_budget_alerts_ownership_reassignment ON public.galx_budget_alerts;
DROP TRIGGER IF EXISTS trg_prevent_chat_rolling_mem_ownership_reassignment ON public.galx_chat_rolling_memory;

-- 4. REVERT FORCED ROW LEVEL SECURITY
ALTER TABLE IF EXISTS public.galx_stripe_invoices NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_stripe_customers NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_budget_alerts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_chat_context_episodes NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_chat_memory_graph_edges NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.galx_chat_rolling_memory NO FORCE ROW LEVEL SECURITY;
