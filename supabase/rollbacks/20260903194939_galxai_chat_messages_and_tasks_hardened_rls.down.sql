-- ============================================================================
-- ROLLBACK: 20260903194939_galxai_chat_messages_and_tasks_hardened_rls.down.sql
-- DESCRIPTION: Revert chat messages validation and tasks CRUD RLS
-- ============================================================================

-- 1. REVERT GALX_TASKS POLICIES & TRIGGERS
DROP POLICY IF EXISTS p_tasks_delete ON public.galx_tasks;
DROP POLICY IF EXISTS p_tasks_update ON public.galx_tasks;
DROP POLICY IF EXISTS p_tasks_insert ON public.galx_tasks;
DROP POLICY IF EXISTS p_tasks_select ON public.galx_tasks;

CREATE POLICY "user_view_own_tasks" ON public.galx_tasks
    FOR SELECT USING (auth.uid()::text = user_id);

DROP TRIGGER IF EXISTS trg_enforce_tasks_ownership ON public.galx_tasks;
DROP TRIGGER IF EXISTS trg_prevent_tasks_ownership_reassignment ON public.galx_tasks;

-- 2. REVERT CHAT_MESSAGES TRIGGERS & POLICIES
DROP TRIGGER IF EXISTS trg_prevent_msg_conv_reassignment ON public.chat_messages;
DROP FUNCTION IF EXISTS public.fn_prevent_message_conversation_reassignment();

DROP POLICY IF EXISTS p_chat_messages_delete ON public.chat_messages;
DROP POLICY IF EXISTS p_chat_messages_update ON public.chat_messages;
DROP POLICY IF EXISTS p_chat_messages_insert ON public.chat_messages;
DROP POLICY IF EXISTS p_chat_messages_select ON public.chat_messages;

CREATE POLICY "Users can read messages of accessible conversations" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_conversations c
            WHERE c.id = chat_messages.conversation_id
              AND (
                auth.uid() IS NULL 
                OR c.user_id = auth.uid()::text 
                OR c.user_id IS NULL 
                OR c.user_id LIKE 'guest_%'
              )
        )
    );

CREATE POLICY "Users can insert messages into accessible conversations" ON public.chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_conversations c
            WHERE c.id = chat_messages.conversation_id
        )
    );

CREATE POLICY "Users can delete messages of accessible conversations" ON public.chat_messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.chat_conversations c
            WHERE c.id = chat_messages.conversation_id
              AND (
                auth.uid() IS NULL 
                OR c.user_id = auth.uid()::text 
                OR c.user_id IS NULL 
                OR c.user_id LIKE 'guest_%'
              )
        )
    );

-- 3. DROP VALIDATOR FUNCTION
DROP FUNCTION IF EXISTS public.fn_can_access_conversation(text);
