-- Emergency rollback for 20260904230000.
-- WARNING: This restores the broad pre-reconciliation Data API posture and
-- PUBLIC execution defaults. Prefer a forward repair if any caller breaks.

DROP TRIGGER IF EXISTS galx_audit_logs_reject_mutation ON public.galx_audit_logs;
DROP TRIGGER IF EXISTS galx_governance_audit_events_reject_mutation ON public.galx_governance_audit_events;
DROP TRIGGER IF EXISTS galx_wallet_transactions_reject_mutation ON public.galx_wallet_transactions;

DROP FUNCTION IF EXISTS private.galx_reject_immutable_ledger_mutation();

DO $restore_table_access$
DECLARE
  v_table TEXT;
  v_policy RECORD;
  v_tables CONSTANT TEXT[] := ARRAY[
    'chat_conversations', 'chat_messages', 'community_grant_allocations',
    'community_user_monthly_grants', 'custom_personas', 'galx_audit_logs',
    'galx_budget_alerts', 'galx_chat_context_episodes',
    'galx_chat_memory_graph_edges', 'galx_chat_rolling_memory',
    'galx_developer_keys', 'galx_governance_audit_events',
    'galx_organization_members', 'galx_organizations',
    'galx_stripe_checkout_sessions', 'galx_stripe_customers',
    'galx_stripe_events', 'galx_stripe_invoices', 'galx_task_queues',
    'galx_tasks', 'galx_team_cost_centers', 'galx_team_invitations',
    'galx_token_revocation_log', 'galx_wallet_holds',
    'galx_wallet_transactions', 'galx_wallets', 'galx_workspace_members',
    'galx_workspaces', 'image_generations', 'lumi_user_pool_leases',
    'lumi_user_rolling_quotas', 'pool_tenant_burst_quotas'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      FOR v_policy IN
        SELECT policyname
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = v_table
          AND policyname = v_table || '_service_authority'
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', v_policy.policyname, v_table);
      END LOOP;

      EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', v_table);
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO anon, authenticated, service_role',
        v_table
      );
    END IF;
  END LOOP;
END;
$restore_table_access$;

DO $restore_definer_access$
DECLARE
  v_routine RECORD;
BEGIN
  FOR v_routine IN
    SELECT p.oid::regprocedure::TEXT AS signature, p.prokind
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.prokind IN ('f', 'p')
  LOOP
    IF v_routine.prokind = 'p' THEN
      EXECUTE format(
        'GRANT EXECUTE ON PROCEDURE %s TO PUBLIC, anon, authenticated, service_role',
        v_routine.signature
      );
    ELSE
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO PUBLIC, anon, authenticated, service_role',
        v_routine.signature
      );
    END IF;
  END LOOP;
END;
$restore_definer_access$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO PUBLIC, anon, authenticated, service_role;
