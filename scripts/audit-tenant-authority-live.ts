import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import { getPostgresSslConfig } from '../src/lib/db/postgres';

const databaseUrl = process.env.DATABASE_URL;
const migrationArgIndex = process.argv.indexOf('--with-migration');
const migrationPath = migrationArgIndex >= 0 ? process.argv[migrationArgIndex + 1] : undefined;
const assertHardened = process.argv.includes('--assert-hardened');

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for the live tenant-authority audit.');
}
if (migrationArgIndex >= 0 && !migrationPath) {
  throw new Error('--with-migration requires a migration file path.');
}

const TARGET_TABLES = [
  'chat_conversations',
  'chat_messages',
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
  'community_grant_allocations',
  'community_user_monthly_grants',
  'lumi_user_pool_leases',
  'lumi_user_rolling_quotas',
  'pool_tenant_burst_quotas',
] as const;

const TARGET_FUNCTIONS = [
  'fn_assert_tenant_context',
  'fn_can_access_conversation',
  'fn_commit_wallet_hold',
  'fn_delete_developer_key',
  'fn_get_current_tenant_claims',
  'fn_get_developer_key_by_id',
  'fn_get_developer_keys',
  'fn_get_developer_keys_watermark',
  'fn_is_tenant_resource_owner',
  'fn_lease_wallet_credit_slice',
  'fn_reconcile_wallet_credit_slice',
  'fn_release_wallet_hold',
  'fn_reserve_wallet_hold',
  'fn_scavenge_expired_holds',
  'fn_set_tenant_session_context',
  'fn_validate_session_active',
] as const;

const client = new Client({
  connectionString: databaseUrl,
  ssl: getPostgresSslConfig(),
  connectionTimeoutMillis: 10_000,
  application_name: 'galxai-tenant-authority-audit',
});

async function run(): Promise<void> {
  await client.connect();
  await client.query(migrationPath || assertHardened ? 'BEGIN' : 'BEGIN TRANSACTION READ ONLY');
  await client.query("SET LOCAL statement_timeout = '15s'");

  try {
    if (migrationPath) {
      const resolvedMigration = path.resolve(migrationPath);
      const migrationRoot = `${path.resolve('supabase/migrations')}${path.sep}`;
      if (!resolvedMigration.startsWith(migrationRoot)) {
        throw new Error('--with-migration must reference a file inside supabase/migrations.');
      }
      await client.query(fs.readFileSync(resolvedMigration, 'utf8'));
    }

    const tables = await client.query(
      `
        SELECT
          c.relname AS table_name,
          c.relrowsecurity AS rls_enabled,
          c.relforcerowsecurity AS rls_forced,
          pg_get_userbyid(c.relowner) AS owner
        FROM pg_catalog.pg_class AS c
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND c.relname = ANY($1::text[])
        ORDER BY c.relname
      `,
      [TARGET_TABLES]
    );

    const privileges = await client.query(
      `
        WITH roles(role_name) AS (
          VALUES ('anon'::name), ('authenticated'::name), ('service_role'::name)
        )
        SELECT
          c.relname AS table_name,
          roles.role_name,
          has_table_privilege(roles.role_name, c.oid, 'SELECT') AS can_select,
          has_table_privilege(roles.role_name, c.oid, 'INSERT') AS can_insert,
          has_table_privilege(roles.role_name, c.oid, 'UPDATE') AS can_update,
          has_table_privilege(roles.role_name, c.oid, 'DELETE') AS can_delete
        FROM pg_catalog.pg_class AS c
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        CROSS JOIN roles
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND c.relname = ANY($1::text[])
        ORDER BY c.relname, roles.role_name
      `,
      [TARGET_TABLES]
    );

    const policies = await client.query(
      `
        SELECT
          tablename AS table_name,
          policyname AS policy_name,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = ANY($1::text[])
        ORDER BY tablename, policyname
      `,
      [TARGET_TABLES]
    );

    const functions = await client.query(
      `
        WITH roles(role_name) AS (
          VALUES ('anon'::name), ('authenticated'::name), ('service_role'::name)
        )
        SELECT
          p.proname AS function_name,
          pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
          p.prosecdef AS security_definer,
          p.proconfig AS configuration,
          roles.role_name,
          has_function_privilege(roles.role_name, p.oid, 'EXECUTE') AS can_execute
        FROM pg_catalog.pg_proc AS p
        JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
        CROSS JOIN roles
        WHERE n.nspname = 'public'
          AND p.proname = ANY($1::text[])
        ORDER BY p.proname, identity_arguments, roles.role_name
      `,
      [TARGET_FUNCTIONS]
    );

    const triggers = await client.query(
      `
        SELECT
          c.relname AS table_name,
          t.tgname AS trigger_name,
          p.proname AS function_name,
          pg_catalog.pg_get_triggerdef(t.oid, true) AS definition
        FROM pg_catalog.pg_trigger AS t
        JOIN pg_catalog.pg_class AS c ON c.oid = t.tgrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_proc AS p ON p.oid = t.tgfoid
        WHERE NOT t.tgisinternal
          AND n.nspname = 'public'
          AND c.relname = ANY($1::text[])
        ORDER BY c.relname, t.tgname
      `,
      [TARGET_TABLES]
    );

    const exposedSecurityDefiners = await client.query(
      `
        SELECT
          p.proname AS function_name,
          pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
          has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
          p.proconfig AS configuration
        FROM pg_catalog.pg_proc AS p
        JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef
          AND (
            has_function_privilege('anon', p.oid, 'EXECUTE')
            OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
          )
        ORDER BY p.proname, identity_arguments
      `
    );

    const defaultPrivileges = await client.query(
      `
        SELECT
          defaults.defaclobjtype AS object_type,
          COALESCE(grantee.rolname, 'PUBLIC') AS grantee,
          acl.privilege_type,
          acl.is_grantable
        FROM pg_catalog.pg_default_acl AS defaults
        JOIN pg_catalog.pg_roles AS owner_role ON owner_role.oid = defaults.defaclrole
        JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = defaults.defaclnamespace
        CROSS JOIN LATERAL pg_catalog.aclexplode(defaults.defaclacl) AS acl
        LEFT JOIN pg_catalog.pg_roles AS grantee ON grantee.oid = acl.grantee
        WHERE owner_role.rolname = 'postgres'
          AND namespace.nspname = 'public'
        ORDER BY defaults.defaclobjtype, grantee, acl.privilege_type
      `
    );

    const applied = await client.query(
      `
        SELECT version, name
        FROM supabase_migrations.schema_migrations
        WHERE version >= '20260903190000'
        ORDER BY version
      `
    );

    const report = {
      generatedAt: new Date().toISOString(),
      migrationEvaluatedInRollback: Boolean(migrationPath),
      tables: tables.rows,
      privileges: privileges.rows,
      policies: policies.rows,
      functions: functions.rows,
      exposedSecurityDefiners: exposedSecurityDefiners.rows,
      defaultPrivileges: defaultPrivileges.rows,
      triggers: triggers.rows,
      recentAppliedMigrations: applied.rows,
    };

    if (assertHardened) {
      const failures: string[] = [];
      let probeSequence = 0;
      const probeError = async (
        label: string,
        sql: string,
        expectedCode: string,
        role?: 'anon' | 'authenticated' | 'service_role',
        params: unknown[] = []
      ): Promise<void> => {
        const savepoint = `authority_probe_${++probeSequence}`;
        await client.query(`SAVEPOINT ${savepoint}`);
        try {
          if (role) await client.query(`SET LOCAL ROLE ${role}`);
          try {
            await client.query(sql, params);
            failures.push(`${label} unexpectedly succeeded`);
          } catch (error) {
            const code = (error as { code?: string }).code;
            if (code !== expectedCode) {
              failures.push(`${label} failed with ${code || 'unknown'}, expected ${expectedCode}`);
            }
          }
        } catch (error) {
          const code = (error as { code?: string }).code;
          failures.push(`${label} probe setup failed with ${code || 'unknown'}`);
        } finally {
          await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
          await client.query(`RELEASE SAVEPOINT ${savepoint}`);
        }
      };

      const probeSuccess = async (
        label: string,
        sql: string,
        role: 'service_role'
      ): Promise<void> => {
        const savepoint = `authority_probe_${++probeSequence}`;
        await client.query(`SAVEPOINT ${savepoint}`);
        try {
          await client.query(`SET LOCAL ROLE ${role}`);
          await client.query(sql);
        } catch (error) {
          const code = (error as { code?: string }).code;
          failures.push(`${label} failed with ${code || 'unknown'}`);
        } finally {
          await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
          await client.query(`RELEASE SAVEPOINT ${savepoint}`);
        }
      };
      const tableRows = new Map(tables.rows.map((row) => [row.table_name, row]));
      const immutableLedgers = new Set([
        'galx_audit_logs',
        'galx_governance_audit_events',
        'galx_wallet_transactions',
      ]);
      const adjudicatedState = new Set([
        'community_grant_allocations',
        'community_user_monthly_grants',
        'galx_wallet_holds',
        'lumi_user_pool_leases',
        'lumi_user_rolling_quotas',
        'pool_tenant_burst_quotas',
      ]);

      for (const tableName of TARGET_TABLES) {
        const table = tableRows.get(tableName);
        if (!table) {
          failures.push(`missing authority table: public.${tableName}`);
          continue;
        }
        if (!table.rls_enabled || !table.rls_forced) {
          failures.push(`RLS is not enabled and forced on public.${tableName}`);
        }

        const tablePrivileges = privileges.rows.filter((row) => row.table_name === tableName);
        for (const row of tablePrivileges.filter((entry) => entry.role_name !== 'service_role')) {
          if (row.can_select || row.can_insert || row.can_update || row.can_delete) {
            failures.push(`${row.role_name} retains table privileges on public.${tableName}`);
          }
        }

        const service = tablePrivileges.find((entry) => entry.role_name === 'service_role');
        if (!service?.can_select) failures.push(`service_role cannot read public.${tableName}`);
        const expectedInsert = !adjudicatedState.has(tableName);
        const expectedMutation = !adjudicatedState.has(tableName) && !immutableLedgers.has(tableName);
        if (Boolean(service?.can_insert) !== expectedInsert) {
          failures.push(`service_role INSERT privilege mismatch on public.${tableName}`);
        }
        if (Boolean(service?.can_update) !== expectedMutation) {
          failures.push(`service_role UPDATE privilege mismatch on public.${tableName}`);
        }
        if (Boolean(service?.can_delete) !== expectedMutation) {
          failures.push(`service_role DELETE privilege mismatch on public.${tableName}`);
        }

        const tablePolicies = policies.rows.filter((row) => row.table_name === tableName);
        if (
          tablePolicies.length !== 1 ||
          tablePolicies[0]?.policy_name !== `${tableName}_service_authority` ||
          tablePolicies[0]?.cmd !== 'ALL' ||
          !tablePolicies[0]?.roles?.includes('service_role')
        ) {
          failures.push(`public.${tableName} does not have exactly one service authority policy`);
        }
      }

      if (exposedSecurityDefiners.rowCount !== 0) {
        failures.push(`${exposedSecurityDefiners.rowCount} SECURITY DEFINER routine(s) remain browser-callable`);
      }

      const retiredFunctions = new Set([
        'fn_assert_tenant_context',
        'fn_can_access_conversation',
        'fn_get_current_tenant_claims',
        'fn_is_tenant_resource_owner',
        'fn_set_tenant_session_context',
        'fn_validate_session_active',
      ]);
      for (const functionName of new Set(functions.rows.map((row) => row.function_name))) {
        if (retiredFunctions.has(functionName)) {
          failures.push(`abandoned routine public.${functionName} still exists`);
        }
      }

      const expectedTriggers = new Map([
        ['galx_audit_logs', 'galx_audit_logs_reject_mutation'],
        ['galx_governance_audit_events', 'galx_governance_audit_events_reject_mutation'],
        ['galx_wallet_transactions', 'galx_wallet_transactions_reject_mutation'],
      ]);
      for (const [tableName, triggerName] of expectedTriggers) {
        if (!triggers.rows.some((row) => row.table_name === tableName && row.trigger_name === triggerName)) {
          failures.push(`append-only trigger ${triggerName} is missing from public.${tableName}`);
        }
      }

      const unsafeDefaults = defaultPrivileges.rows.filter(
        (row) =>
          ['PUBLIC', 'anon', 'authenticated'].includes(row.grantee) &&
          ['r', 'S', 'f'].includes(row.object_type)
      );
      if (unsafeDefaults.length > 0) {
        failures.push(`${unsafeDefaults.length} unsafe public-schema default privilege(s) remain`);
      }

      await probeError(
        'anon authority-table read',
        'SELECT 1 FROM public.galx_developer_keys LIMIT 0',
        '42501',
        'anon'
      );
      await probeError(
        'authenticated authority-table read',
        'SELECT 1 FROM public.galx_developer_keys LIMIT 0',
        '42501',
        'authenticated'
      );
      await probeError(
        'anon definer-capability execution',
        'SELECT public.fn_get_developer_keys(NULL::VARCHAR)',
        '42501',
        'anon'
      );
      await probeError(
        'authenticated definer-capability execution',
        'SELECT public.fn_get_developer_keys(NULL::VARCHAR)',
        '42501',
        'authenticated'
      );
      await probeSuccess(
        'service authority-table read',
        'SELECT 1 FROM public.galx_developer_keys LIMIT 0',
        'service_role'
      );
      await probeSuccess(
        'service definer-capability execution',
        'SELECT COUNT(*) FROM public.fn_get_developer_keys(NULL::VARCHAR)',
        'service_role'
      );

      for (const tableName of expectedTriggers.keys()) {
        const fixture = await client.query(`SELECT id FROM public.${tableName} LIMIT 1`);
        if (fixture.rowCount && fixture.rows[0]?.id != null) {
          await probeError(
            `${tableName} immutable update`,
            `UPDATE public.${tableName} SET id = id WHERE id = $1`,
            '55000',
            undefined,
            [fixture.rows[0].id]
          );
        }
      }

      if (failures.length > 0) {
        throw new Error(`Tenant authority hardening failed:\n- ${failures.join('\n- ')}`);
      }

      console.log(
        JSON.stringify(
          {
            hardened: true,
            migrationEvaluatedInRollback: Boolean(migrationPath),
            forcedRlsTables: tables.rowCount,
            serviceOnlyPolicies: policies.rowCount,
            browserCallableSecurityDefiners: exposedSecurityDefiners.rowCount,
            immutableLedgerTriggers: expectedTriggers.size,
            runtimeAuthorityProbes: probeSequence,
          },
          null,
          2
        )
      );
    } else {
      console.log(JSON.stringify(report, null, 2));
    }
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
