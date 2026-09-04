-- ============================================================================
-- GALXAI Migration: tenant authority reconciliation
-- Purpose: Replace the abandoned 20260903 tenant branch with one coherent,
--          server-mediated authority boundary and secure PostgreSQL defaults.
-- Risk: CRITICAL (tenant, credential, billing, queue, and audit authority).
-- Locking: Metadata-only ACCESS EXCLUSIVE locks, bounded by a 2s lock timeout.
-- ============================================================================

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';

-- Application requests cross a server-side authorization boundary before
-- repositories use the pooled PostgreSQL connection or service-role client.
-- These tables are authority state, not a browser-writable synchronization API.
DO $reconcile_tables$
DECLARE
  v_table TEXT;
  v_policy RECORD;
  v_sequence RECORD;
  v_tables CONSTANT TEXT[] := ARRAY[
    'chat_conversations',
    'chat_messages',
    'community_grant_allocations',
    'community_user_monthly_grants',
    'custom_personas',
    'galx_audit_logs',
    'galx_budget_alerts',
    'galx_chat_context_episodes',
    'galx_chat_memory_graph_edges',
    'galx_chat_rolling_memory',
    'galx_developer_keys',
    'galx_governance_audit_events',
    'galx_organization_members',
    'galx_organizations',
    'galx_stripe_checkout_sessions',
    'galx_stripe_customers',
    'galx_stripe_events',
    'galx_stripe_invoices',
    'galx_task_queues',
    'galx_tasks',
    'galx_team_cost_centers',
    'galx_team_invitations',
    'galx_token_revocation_log',
    'galx_wallet_holds',
    'galx_wallet_transactions',
    'galx_wallets',
    'galx_workspace_members',
    'galx_workspaces',
    'image_generations',
    'lumi_user_pool_leases',
    'lumi_user_rolling_quotas',
    'pool_tenant_burst_quotas'
  ];
  v_immutable_ledgers CONSTANT TEXT[] := ARRAY[
    'galx_audit_logs',
    'galx_governance_audit_events',
    'galx_wallet_transactions'
  ];
  v_rpc_adjudicated_state CONSTANT TEXT[] := ARRAY[
    'community_grant_allocations',
    'community_user_monthly_grants',
    'galx_wallet_holds',
    'lumi_user_pool_leases',
    'lumi_user_rolling_quotas',
    'pool_tenant_burst_quotas'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      RAISE EXCEPTION 'Tenant authority contract table public.% is missing', v_table
        USING ERRCODE = '42P01';
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_table);

    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role',
      v_table
    );

    IF v_table = ANY(v_immutable_ledgers) THEN
      EXECUTE format('GRANT SELECT, INSERT ON TABLE public.%I TO service_role', v_table);
    ELSIF v_table = ANY(v_rpc_adjudicated_state) THEN
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO service_role', v_table);
    ELSE
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role',
        v_table
      );
    END IF;

    -- Remove mixed-era policies, including policies scoped to PUBLIC with an
    -- auth.role() predicate. One explicit service policy is easier to audit.
    FOR v_policy IN
      SELECT policyname
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'public' AND tablename = v_table
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', v_policy.policyname, v_table);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      v_table || '_service_authority',
      v_table
    );
  END LOOP;

  -- Remove inherited access to sequences owned by authority tables while
  -- retaining only the capabilities required for service-mediated inserts.
  FOR v_sequence IN
    SELECT DISTINCT
      sequence_namespace.nspname AS sequence_schema,
      sequence_class.relname AS sequence_name
    FROM pg_catalog.pg_class AS sequence_class
    JOIN pg_catalog.pg_namespace AS sequence_namespace
      ON sequence_namespace.oid = sequence_class.relnamespace
    JOIN pg_catalog.pg_depend AS dependency
      ON dependency.objid = sequence_class.oid
      AND dependency.deptype IN ('a', 'i')
    JOIN pg_catalog.pg_class AS table_class
      ON table_class.oid = dependency.refobjid
    JOIN pg_catalog.pg_namespace AS table_namespace
      ON table_namespace.oid = table_class.relnamespace
    WHERE sequence_class.relkind = 'S'
      AND table_namespace.nspname = 'public'
      AND table_class.relname = ANY(v_tables)
  LOOP
    EXECUTE format(
      'REVOKE ALL ON SEQUENCE %I.%I FROM PUBLIC, anon, authenticated, service_role',
      v_sequence.sequence_schema,
      v_sequence.sequence_name
    );
    EXECUTE format(
      'GRANT USAGE, SELECT ON SEQUENCE %I.%I TO service_role',
      v_sequence.sequence_schema,
      v_sequence.sequence_name
    );
  END LOOP;
END;
$reconcile_tables$;

-- Retire artifacts from any environment where part of the abandoned branch
-- was executed manually without a migration-ledger entry.
DO $retire_stale_triggers$
DECLARE
  v_trigger RECORD;
BEGIN
  FOR v_trigger IN
    SELECT *
    FROM (VALUES
      ('galx_audit_logs', 'trg_prevent_audit_log_mutation'),
      ('galx_developer_keys', 'trg_enforce_dev_keys_tenant_ownership'),
      ('chat_conversations', 'trg_enforce_chat_conv_tenant_ownership'),
      ('galx_developer_keys', 'trg_prevent_dev_keys_ownership_reassignment'),
      ('chat_conversations', 'trg_prevent_chat_conv_ownership_reassignment'),
      ('custom_personas', 'trg_prevent_custom_personas_ownership_reassignment'),
      ('image_generations', 'trg_prevent_image_gen_ownership_reassignment'),
      ('galx_wallets', 'trg_prevent_wallet_ownership_reassignment'),
      ('custom_personas', 'trg_enforce_custom_personas_ownership'),
      ('image_generations', 'trg_enforce_image_gen_ownership'),
      ('chat_messages', 'trg_prevent_msg_conv_reassignment'),
      ('galx_tasks', 'trg_prevent_tasks_ownership_reassignment'),
      ('galx_tasks', 'trg_enforce_tasks_ownership'),
      ('galx_chat_rolling_memory', 'trg_prevent_chat_rolling_mem_ownership_reassignment'),
      ('galx_budget_alerts', 'trg_prevent_budget_alerts_ownership_reassignment'),
      ('galx_stripe_customers', 'trg_prevent_stripe_customers_ownership_reassignment'),
      ('galx_chat_rolling_memory', 'trg_enforce_chat_rolling_mem_ownership'),
      ('galx_budget_alerts', 'trg_enforce_budget_alerts_ownership'),
      ('galx_wallets', 'trg_prevent_wallet_balance_tampering'),
      ('galx_wallet_transactions', 'trg_prevent_wallet_tx_mutation'),
      ('galx_stripe_events', 'trg_prevent_stripe_events_mutation'),
      ('galx_stripe_invoices', 'trg_prevent_stripe_invoices_mutation'),
      ('galx_stripe_checkout_sessions', 'trg_prevent_stripe_cs_ownership_reassignment'),
      ('galx_wallet_holds', 'trg_prevent_holds_ownership_reassignment'),
      ('pool_tenant_burst_quotas', 'trg_prevent_burst_quotas_ownership_reassignment'),
      ('lumi_user_pool_leases', 'trg_prevent_lumi_leases_ownership_reassignment'),
      ('lumi_user_rolling_quotas', 'trg_prevent_lumi_quotas_ownership_reassignment'),
      ('community_user_monthly_grants', 'trg_prevent_comm_grants_ownership_reassignment'),
      ('galx_workspaces', 'trg_prevent_workspace_spend_tampering'),
      ('galx_team_cost_centers', 'trg_prevent_cost_center_spend_tampering'),
      ('galx_governance_audit_events', 'trg_prevent_gov_audit_mutation')
    ) AS stale(table_name, trigger_name)
  LOOP
    IF to_regclass(format('public.%I', v_trigger.table_name)) IS NOT NULL THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON public.%I',
        v_trigger.trigger_name,
        v_trigger.table_name
      );
    END IF;
  END LOOP;
END;
$retire_stale_triggers$;

DROP FUNCTION IF EXISTS public.fn_assert_tenant_context();
DROP FUNCTION IF EXISTS public.fn_set_tenant_session_context(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.fn_get_current_tenant_claims();
DROP FUNCTION IF EXISTS public.fn_prevent_audit_log_mutation();
DROP FUNCTION IF EXISTS public.fn_enforce_tenant_ownership_on_insert();
DROP FUNCTION IF EXISTS public.fn_prevent_tenant_ownership_reassignment();
DROP FUNCTION IF EXISTS public.fn_is_tenant_resource_owner(TEXT);
DROP FUNCTION IF EXISTS public.fn_can_access_conversation(TEXT);
DROP FUNCTION IF EXISTS public.fn_prevent_message_conversation_reassignment();
DROP FUNCTION IF EXISTS public.fn_validate_session_active(TEXT);
DROP FUNCTION IF EXISTS public.fn_prevent_wallet_balance_tampering();
DROP FUNCTION IF EXISTS public.fn_prevent_workspace_spend_tampering();
DROP FUNCTION IF EXISTS public.fn_prevent_cost_center_spend_tampering();

-- Immutable facts are protected independently of role grants. Keep the trigger
-- routine outside the Data API schema and avoid SECURITY DEFINER entirely.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE OR REPLACE FUNCTION private.galx_reject_immutable_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION '% is append-only; % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '55000';
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_reject_immutable_ledger_mutation()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.galx_reject_immutable_ledger_mutation()
  TO service_role;

CREATE TRIGGER galx_audit_logs_reject_mutation
  BEFORE UPDATE OR DELETE ON public.galx_audit_logs
  FOR EACH ROW EXECUTE FUNCTION private.galx_reject_immutable_ledger_mutation();

CREATE TRIGGER galx_governance_audit_events_reject_mutation
  BEFORE UPDATE OR DELETE ON public.galx_governance_audit_events
  FOR EACH ROW EXECUTE FUNCTION private.galx_reject_immutable_ledger_mutation();

CREATE TRIGGER galx_wallet_transactions_reject_mutation
  BEFORE UPDATE OR DELETE ON public.galx_wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION private.galx_reject_immutable_ledger_mutation();

-- Definer-rights routines are capabilities. PostgreSQL grants EXECUTE to
-- PUBLIC by default, so existing routines are closed to browser roles and are
-- explicitly available only to the backend service authority.
DO $secure_definer_capabilities$
DECLARE
  v_routine RECORD;
BEGIN
  FOR v_routine IN
    SELECT
      p.oid::regprocedure::TEXT AS signature,
      p.prokind
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prokind IN ('f', 'p')
  LOOP
    IF v_routine.prokind = 'p' THEN
      EXECUTE format(
        'REVOKE ALL ON PROCEDURE %s FROM PUBLIC, anon, authenticated, service_role',
        v_routine.signature
      );
      EXECUTE format('GRANT EXECUTE ON PROCEDURE %s TO service_role', v_routine.signature);
    ELSE
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',
        v_routine.signature
      );
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_routine.signature);
    END IF;
  END LOOP;
END;
$secure_definer_capabilities$;

-- Secure-by-default posture for objects created by future migrations. Explicit
-- client projections must opt in with a reviewed table policy and DAC grant.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

COMMENT ON FUNCTION private.galx_reject_immutable_ledger_mutation()
IS 'Rejects UPDATE and DELETE on append-only authority journals without elevated execution context.';
