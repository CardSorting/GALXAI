-- ============================================================================
-- ROLLBACK: 20260903194428_galxai_persona_and_ownership_reassignment_armor.down.sql
-- DESCRIPTION: Revert persona and image forced RLS and ownership reassignment defense
-- ============================================================================

-- 1. DROP HELPER FUNCTION
DROP FUNCTION IF EXISTS public.fn_is_tenant_resource_owner(text);

-- 2. REVERT POLICIES ON IMAGE GENERATIONS
DROP POLICY IF EXISTS p_images_delete ON public.image_generations;
DROP POLICY IF EXISTS p_images_update ON public.image_generations;
DROP POLICY IF EXISTS p_images_insert ON public.image_generations;
DROP POLICY IF EXISTS p_images_read ON public.image_generations;

-- 3. REVERT POLICIES ON CUSTOM PERSONAS
DROP POLICY IF EXISTS p_personas_delete ON public.custom_personas;
DROP POLICY IF EXISTS p_personas_update ON public.custom_personas;
DROP POLICY IF EXISTS p_personas_insert ON public.custom_personas;
DROP POLICY IF EXISTS p_personas_read ON public.custom_personas;

-- 4. DROP AUTO-BINDING TRIGGERS ON PERSONAS AND IMAGES
DROP TRIGGER IF EXISTS trg_enforce_image_gen_ownership ON public.image_generations;
DROP TRIGGER IF EXISTS trg_enforce_custom_personas_ownership ON public.custom_personas;

-- 5. DROP OWNERSHIP REASSIGNMENT TRIGGERS
DROP TRIGGER IF EXISTS trg_prevent_wallet_ownership_reassignment ON public.galx_wallets;
DROP TRIGGER IF EXISTS trg_prevent_image_gen_ownership_reassignment ON public.image_generations;
DROP TRIGGER IF EXISTS trg_prevent_custom_personas_ownership_reassignment ON public.custom_personas;
DROP TRIGGER IF EXISTS trg_prevent_chat_conv_ownership_reassignment ON public.chat_conversations;
DROP TRIGGER IF EXISTS trg_prevent_dev_keys_ownership_reassignment ON public.galx_developer_keys;
DROP FUNCTION IF EXISTS public.fn_prevent_tenant_ownership_reassignment();

-- 6. REVERT FORCED ROW LEVEL SECURITY
ALTER TABLE IF EXISTS public.image_generations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.custom_personas NO FORCE ROW LEVEL SECURITY;
