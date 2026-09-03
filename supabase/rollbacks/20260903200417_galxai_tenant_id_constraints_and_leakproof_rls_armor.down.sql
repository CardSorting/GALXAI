-- ============================================================================
-- ROLLBACK: 20260903200417_galxai_tenant_id_constraints_and_leakproof_rls_armor.down.sql
-- DESCRIPTION: Revert tenant ID check constraints and leakproof optimization
-- ============================================================================

-- 1. DROP SESSION VALIDATION FUNCTION
DROP FUNCTION IF EXISTS public.fn_validate_session_active(text);

-- 2. REVERT LEAKPROOF OPTIMIZATION
DO $$ BEGIN
    ALTER FUNCTION public.fn_can_access_conversation(text) NOT LEAKPROOF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER FUNCTION public.fn_is_tenant_resource_owner(text) NOT LEAKPROOF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. DROP CHECK CONSTRAINTS
ALTER TABLE IF EXISTS public.galx_stripe_customers DROP CONSTRAINT IF EXISTS chk_stripe_customers_user_id_valid;
ALTER TABLE IF EXISTS public.galx_budget_alerts DROP CONSTRAINT IF EXISTS chk_budget_alerts_user_id_valid;
ALTER TABLE IF EXISTS public.galx_chat_rolling_memory DROP CONSTRAINT IF EXISTS chk_chat_rolling_mem_user_id_valid;
ALTER TABLE IF EXISTS public.galx_audit_logs DROP CONSTRAINT IF EXISTS chk_audit_logs_user_id_valid;
ALTER TABLE IF EXISTS public.galx_wallets DROP CONSTRAINT IF EXISTS chk_wallets_user_id_valid;
ALTER TABLE IF EXISTS public.galx_tasks DROP CONSTRAINT IF EXISTS chk_tasks_user_id_valid;
ALTER TABLE IF EXISTS public.image_generations DROP CONSTRAINT IF EXISTS chk_images_user_id_valid;
ALTER TABLE IF EXISTS public.custom_personas DROP CONSTRAINT IF EXISTS chk_personas_user_id_valid;
ALTER TABLE IF EXISTS public.chat_conversations DROP CONSTRAINT IF EXISTS chk_chat_conv_user_id_valid;
ALTER TABLE IF EXISTS public.galx_developer_keys DROP CONSTRAINT IF EXISTS chk_dev_keys_user_id_valid;
