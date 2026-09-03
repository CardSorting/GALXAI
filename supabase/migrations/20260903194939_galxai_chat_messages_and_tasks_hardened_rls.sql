-- ============================================================================
-- MIGRATION: 20260903194939_galxai_chat_messages_and_tasks_hardened_rls.sql
-- DESCRIPTION: Conversation ownership validation, chat message RLS lockdown, and tasks CRUD RLS armor
-- GOVERNANCE: Paranoid Database Governance (AOP-DB Phase 3)
-- ============================================================================

-- 1. CONVERSATION ACCESS VALIDATOR FUNCTION
-- Validates caller ownership of parent conversation with cached InitPlan subquery
CREATE OR REPLACE FUNCTION public.fn_can_access_conversation(p_conversation_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id = p_conversation_id
          AND (
            c.user_id = (SELECT auth.uid()::text)
            OR (c.user_id LIKE 'guest_%' AND (SELECT auth.uid()::text) IS NULL)
          )
    );
$$;

GRANT EXECUTE ON FUNCTION public.fn_can_access_conversation(text) TO authenticated, anon, service_role;

-- 2. HARDEN CHAT MESSAGES RLS POLICIES
DROP POLICY IF EXISTS "Users can read messages of accessible conversations" ON public.chat_messages;
DROP POLICY IF EXISTS p_chat_messages_select ON public.chat_messages;
CREATE POLICY p_chat_messages_select ON public.chat_messages
    FOR SELECT
    USING (public.fn_can_access_conversation(conversation_id));

DROP POLICY IF EXISTS "Users can insert messages into accessible conversations" ON public.chat_messages;
DROP POLICY IF EXISTS p_chat_messages_insert ON public.chat_messages;
CREATE POLICY p_chat_messages_insert ON public.chat_messages
    FOR INSERT
    WITH CHECK (public.fn_can_access_conversation(conversation_id));

DROP POLICY IF EXISTS p_chat_messages_update ON public.chat_messages;
CREATE POLICY p_chat_messages_update ON public.chat_messages
    FOR UPDATE
    USING (public.fn_can_access_conversation(conversation_id))
    WITH CHECK (public.fn_can_access_conversation(conversation_id));

DROP POLICY IF EXISTS "Users can delete messages of accessible conversations" ON public.chat_messages;
DROP POLICY IF EXISTS p_chat_messages_delete ON public.chat_messages;
CREATE POLICY p_chat_messages_delete ON public.chat_messages
    FOR DELETE
    USING (public.fn_can_access_conversation(conversation_id));

-- 3. PREVENT MESSAGE CONVERSATION REASSIGNMENT
CREATE OR REPLACE FUNCTION public.fn_prevent_message_conversation_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.conversation_id IS NOT NULL AND NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
        RAISE EXCEPTION 'Tenant security violation: Moving messages between conversations is strictly prohibited (id: %)', OLD.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_msg_conv_reassignment ON public.chat_messages;
CREATE TRIGGER trg_prevent_msg_conv_reassignment
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_message_conversation_reassignment();

-- 4. HARDEN GALX_TASKS RLS & OWNERSHIP ARMOR
DROP TRIGGER IF EXISTS trg_prevent_tasks_ownership_reassignment ON public.galx_tasks;
CREATE TRIGGER trg_prevent_tasks_ownership_reassignment
    BEFORE UPDATE ON public.galx_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_tenant_ownership_reassignment();

DROP TRIGGER IF EXISTS trg_enforce_tasks_ownership ON public.galx_tasks;
CREATE TRIGGER trg_enforce_tasks_ownership
    BEFORE INSERT ON public.galx_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_tenant_ownership_on_insert();

DROP POLICY IF EXISTS "user_view_own_tasks" ON public.galx_tasks;
DROP POLICY IF EXISTS p_tasks_select ON public.galx_tasks;
CREATE POLICY p_tasks_select ON public.galx_tasks
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS p_tasks_insert ON public.galx_tasks;
CREATE POLICY p_tasks_insert ON public.galx_tasks
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS p_tasks_update ON public.galx_tasks;
CREATE POLICY p_tasks_update ON public.galx_tasks
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()::text) = user_id)
    WITH CHECK ((SELECT auth.uid()::text) = user_id);

DROP POLICY IF EXISTS p_tasks_delete ON public.galx_tasks;
CREATE POLICY p_tasks_delete ON public.galx_tasks
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()::text) = user_id);
