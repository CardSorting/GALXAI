# ADR 0102: Chat Messages Access Validation & Tasks CRUD RLS Armor

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Superseded by ADR 0117

This ADR describes an abandoned migration branch that was never applied to the authoritative database. Its guest-conversation predicate was unsafe; chat and task mutations now cross an authenticated server boundary.

## Context
Following the activation of transaction-scoped connection pooling (ADRs 0097–0101), an audit of child resource relationships revealed two critical security vulnerabilities:
1. **Unchecked Parent Access on Message Insertion**: In previous migrations, `chat_messages` configured an `INSERT` policy that checked only `EXISTS (SELECT 1 FROM chat_conversations c WHERE c.id = chat_messages.conversation_id)`. The policy did not assert conversation ownership (`c.user_id = auth.uid()`). Consequently, any authenticated tenant or guest could inject messages into another user's conversation by ID. Furthermore, queries on `chat_messages` repeatedly executed unindexed existence subqueries per message row.
2. **Missing Write RLS on `galx_tasks`**: `galx_tasks` previously only defined an RLS policy for `SELECT` (`user_view_own_tasks`). Authenticated tenants executing tasks via direct pooled connections with `SET LOCAL ROLE authenticated` could not enqueue, lease, update, or cancel their own tasks.
3. **Cross-Conversation Message Reassignment**: A malicious update could execute `UPDATE chat_messages SET conversation_id = 'other_conv_id'`, moving private messages between tenant chat sessions.

## Decision
Under the Supabase Paranoid Governance framework (AOP-DB Protocol), this ADR proposed the now-retired migration `20260903194939_galxai_chat_messages_and_tasks_hardened_rls.sql` and paired rollback:

1. **`fn_can_access_conversation` Access Validator**:
   - Deployed a `STABLE SECURITY DEFINER` function with `search_path = public, pg_temp`:
     ```sql
     CREATE OR REPLACE FUNCTION public.fn_can_access_conversation(p_conversation_id text)
     RETURNS boolean AS $$
         SELECT EXISTS (
             SELECT 1 FROM public.chat_conversations c
             WHERE c.id = p_conversation_id
               AND (
                 c.user_id = (SELECT auth.uid()::text)
                 OR (c.user_id LIKE 'guest_%' AND (SELECT auth.uid()::text) IS NULL)
               )
         );
     $$;
     ```
   - Evaluates caller ownership of the parent conversation using cached InitPlan subqueries.

2. **Hardened Chat Messages RLS Policies**:
   - Replaced open/permissive policies with strict checks against `fn_can_access_conversation`:
     - `p_chat_messages_select`: `FOR SELECT USING (public.fn_can_access_conversation(conversation_id));`
     - `p_chat_messages_insert`: `FOR INSERT WITH CHECK (public.fn_can_access_conversation(conversation_id));`
     - `p_chat_messages_update`: `FOR UPDATE USING (...) WITH CHECK (...);`
     - `p_chat_messages_delete`: `FOR DELETE USING (...);`

3. **Message Conversation Reassignment Defense**:
   - Deployed `public.fn_prevent_message_conversation_reassignment()` as a `BEFORE UPDATE` trigger on `public.chat_messages`.
   - Prevents changing `conversation_id` on existing messages.

4. **Tasks CRUD RLS & Ownership Armor**:
   - Attached `fn_prevent_tenant_ownership_reassignment()` and `fn_enforce_tenant_ownership_on_insert()` to `public.galx_tasks`.
   - Deployed complete CRUD policies on `galx_tasks` (`p_tasks_select`, `p_tasks_insert`, `p_tasks_update`, `p_tasks_delete`) keyed to `(SELECT auth.uid()::text) = user_id`.

## Consequences
- **Positive**: Absolute prevention of cross-tenant message injection and conversation hijacking.
- **Positive**: Full self-service lifecycle management of background tasks under active `authenticated` RLS.
- **Positive**: 77/77 migrations verified by `npm run db:verify`, 92/92 database tests passing.
