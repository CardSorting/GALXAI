-- ============================================================================
-- MIGRATION: 20260903194428_galxai_persona_and_ownership_reassignment_armor.sql
-- DESCRIPTION: Enforce FORCED RLS on personas/images, prevent ownership reassignment, and auto-bind tenant identity
-- GOVERNANCE: Paranoid Database Governance (AOP-DB Phase 3)
-- ============================================================================

-- 1. FORCE ROW LEVEL SECURITY ON PERSONAS AND IMAGE GENERATIONS
ALTER TABLE IF EXISTS public.custom_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.custom_personas FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.image_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.image_generations FORCE ROW LEVEL SECURITY;

-- 2. OWNERSHIP REASSIGNMENT DEFENSE
-- Forbids changing the user_id on existing tenant records, neutralizing ownership theft and orphaning attacks
CREATE OR REPLACE FUNCTION public.fn_prevent_tenant_ownership_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Tenant security violation: Reassigning resource ownership from % to % is strictly prohibited', OLD.user_id, NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_dev_keys_ownership_reassignment ON public.galx_developer_keys;
CREATE TRIGGER trg_prevent_dev_keys_ownership_reassignment
    BEFORE UPDATE ON public.galx_developer_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

DROP TRIGGER IF EXISTS trg_prevent_chat_conv_ownership_reassignment ON public.chat_conversations;
CREATE TRIGGER trg_prevent_chat_conv_ownership_reassignment
    BEFORE UPDATE ON public.chat_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

DROP TRIGGER IF EXISTS trg_prevent_custom_personas_ownership_reassignment ON public.custom_personas;
CREATE TRIGGER trg_prevent_custom_personas_ownership_reassignment
    BEFORE UPDATE ON public.custom_personas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

DROP TRIGGER IF EXISTS trg_prevent_image_gen_ownership_reassignment ON public.image_generations;
CREATE TRIGGER trg_prevent_image_gen_ownership_reassignment
    BEFORE UPDATE ON public.image_generations
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

DROP TRIGGER IF EXISTS trg_prevent_wallet_ownership_reassignment ON public.galx_wallets;
CREATE TRIGGER trg_prevent_wallet_ownership_reassignment
    BEFORE UPDATE ON public.galx_wallets
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

-- 3. TENANT OWNERSHIP AUTO-BINDING FOR PERSONAS AND IMAGES
DROP TRIGGER IF EXISTS trg_enforce_custom_personas_ownership ON public.custom_personas;
CREATE TRIGGER trg_enforce_custom_personas_ownership
    BEFORE INSERT ON public.custom_personas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_tenant_ownership_on_insert();

DROP TRIGGER IF EXISTS trg_enforce_image_gen_ownership ON public.image_generations;
CREATE TRIGGER trg_enforce_image_gen_ownership
    BEFORE INSERT ON public.image_generations
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_tenant_ownership_on_insert();

-- 4. HARDEN RLS POLICIES WITH INITPLAN CACHED SUBQUERIES
-- Custom Personas
DROP POLICY IF EXISTS "Public personas are readable by all" ON public.custom_personas;
DROP POLICY IF EXISTS p_personas_read ON public.custom_personas;
CREATE POLICY p_personas_read ON public.custom_personas
    FOR SELECT
    USING (is_public = true OR is_built_in = true OR user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can create their own custom personas" ON public.custom_personas;
DROP POLICY IF EXISTS p_personas_insert ON public.custom_personas;
CREATE POLICY p_personas_insert ON public.custom_personas
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can update their own custom personas" ON public.custom_personas;
DROP POLICY IF EXISTS p_personas_update ON public.custom_personas;
CREATE POLICY p_personas_update ON public.custom_personas
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()::text))
    WITH CHECK (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete their own custom personas" ON public.custom_personas;
DROP POLICY IF EXISTS p_personas_delete ON public.custom_personas;
CREATE POLICY p_personas_delete ON public.custom_personas
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()::text));

-- Image Generations
DROP POLICY IF EXISTS "Public images readable by all" ON public.image_generations;
DROP POLICY IF EXISTS p_images_read ON public.image_generations;
CREATE POLICY p_images_read ON public.image_generations
    FOR SELECT
    USING (is_public = true OR user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can insert image generations" ON public.image_generations;
DROP POLICY IF EXISTS p_images_insert ON public.image_generations;
CREATE POLICY p_images_insert ON public.image_generations
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS p_images_update ON public.image_generations;
CREATE POLICY p_images_update ON public.image_generations
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()::text))
    WITH CHECK (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS p_images_delete ON public.image_generations;
CREATE POLICY p_images_delete ON public.image_generations
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()::text));

-- 5. FAST TENANT RESOURCE OWNER PREPARATION PROCEDURE
CREATE OR REPLACE FUNCTION public.fn_is_tenant_resource_owner(p_owner_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT (p_owner_user_id IS NOT NULL AND p_owner_user_id = (SELECT auth.uid()::text));
$$;

GRANT EXECUTE ON FUNCTION public.fn_is_tenant_resource_owner(text) TO authenticated, service_role;
