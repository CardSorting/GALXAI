import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { getPostgresSslConfig } from '../src/lib/db/postgres';

interface RoutineGrantRow {
  proname: string;
  proacl: string | null;
  proconfig: string[] | null;
}

function assertInvariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Shard authority invariant failed: ${message}`);
}

function hasPublicExecute(acl: string | null): boolean {
  return /(?:^\{|,)(?:anon|authenticated)?=X\//.test(acl || '');
}

function hasServiceExecute(acl: string | null): boolean {
  return /(?:^\{|,)service_role=X\//.test(acl || '');
}

function hasRuntimeExecute(acl: string | null): boolean {
  return hasPublicExecute(acl) || hasServiceExecute(acl);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required for live shard authority verification');

  const migrationArgIndex = process.argv.indexOf('--with-migration');
  const migrationPath = migrationArgIndex >= 0 ? process.argv[migrationArgIndex + 1] : undefined;
  if (migrationArgIndex >= 0 && !migrationPath) {
    throw new Error('--with-migration requires a migration file path');
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: getPostgresSslConfig(),
    connectionTimeoutMillis: 10_000
  });
  await client.connect();

  try {
    const manualPolicy = await client.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='galx_shard_accounts' AND column_name='managed_desktop_id'");
    if (manualPolicy.rowCount) throw new Error('This historical verifier predates manual desktop enrollment. Use test:relay:manual-db and the read-only apply-manual-desktop-enrollment.ts inventory; do not reopen generic upsert.');
    await client.query('BEGIN');
    if (migrationPath) {
      await client.query(fs.readFileSync(path.resolve(migrationPath), 'utf8'));
    }

    const rls = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE oid IN (
        'public.galx_shard_accounts'::regclass,
        'public.galx_shard_leases'::regclass,
        'public.galx_shard_registry_events'::regclass
      )
    `);
    assertInvariant(rls.rowCount === 3, 'all shard authority tables must exist');
    for (const table of rls.rows) {
      assertInvariant(table.relrowsecurity, `${table.relname} RLS must be enabled`);
      assertInvariant(table.relforcerowsecurity, `${table.relname} RLS must be forced`);
    }

    const retiredRls = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE oid IN (
        'public.galx_shard_concurrency_leases'::regclass,
        'public.galx_shard_health_telemetry_ledger'::regclass,
        'public.galx_shard_health_probes'::regclass
      )
    `);
    assertInvariant(retiredRls.rowCount === 3, 'all legacy/evidence shard tables must exist');
    for (const table of retiredRls.rows) {
      assertInvariant(table.relrowsecurity, `${table.relname} RLS must be enabled`);
      assertInvariant(table.relforcerowsecurity, `${table.relname} RLS must be forced`);
    }

    const clientGrants = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name IN (
          'galx_shard_accounts',
          'galx_shard_leases',
          'galx_shard_registry_events',
          'galx_shard_concurrency_leases',
          'galx_shard_health_telemetry_ledger',
          'galx_shard_health_probes'
        )
        AND grantee IN ('PUBLIC', 'anon', 'authenticated')
    `);
    assertInvariant(Number(clientGrants.rows[0]?.count) === 0, 'client roles must have no shard table grants');

    const retiredRuntimeTableGrants = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name IN (
          'galx_shard_concurrency_leases',
          'galx_shard_health_telemetry_ledger'
        )
        AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
    `);
    assertInvariant(
      Number(retiredRuntimeTableGrants.rows[0]?.count) === 0,
      'retired shard tables must be owner-only forensic records'
    );

    const excessiveServiceTableGrants = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name IN (
          'galx_shard_accounts',
          'galx_shard_leases',
          'galx_shard_registry_events',
          'galx_shard_health_probes'
        )
        AND grantee = 'service_role'
        AND privilege_type IN ('TRUNCATE', 'TRIGGER', 'REFERENCES')
    `);
    assertInvariant(
      Number(excessiveServiceTableGrants.rows[0]?.count) === 0,
      'service_role must not own truncate, trigger, or references privileges on shard tables'
    );

    const routines = await client.query<RoutineGrantRow>(`
      SELECT p.proname, p.proacl::text, p.proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'fn_upsert_shard_registry',
          'fn_acquire_shard_lease',
          'fn_extend_shard_lease',
          'fn_release_shard_lease',
          'fn_cleanup_expired_leases'
        )
      ORDER BY p.proname
    `);
    assertInvariant(routines.rowCount === 5, 'all shard authority routines must exist');
    for (const routine of routines.rows) {
      assertInvariant(!hasPublicExecute(routine.proacl), `${routine.proname} must be backend-only`);
      assertInvariant(hasServiceExecute(routine.proacl), `${routine.proname} must be executable by service_role`);
      assertInvariant(
        routine.proconfig?.some(value => value === 'search_path=public, pg_temp'),
        `${routine.proname} must pin its search_path`
      );
    }

    const retiredRoutines = await client.query<RoutineGrantRow>(`
      SELECT p.proname, p.proacl::text, p.proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.oid IN (
          'public.rpc_acquire_tier_shard_lease(varchar,varchar,varchar,bigint,integer)'::regprocedure,
          'public.rpc_settle_and_release_shard_lease(varchar,bigint,numeric,boolean,varchar)'::regprocedure,
          'public.fn_reencrypt_vault_shard_record(varchar,jsonb,varchar,bigint)'::regprocedure,
          'public.fn_gateway_preflight_composite_mesh(varchar,varchar,numeric,varchar)'::regprocedure,
          'public.fn_gateway_postflight_composite_mesh(varchar,uuid,varchar,varchar,numeric,varchar,integer,integer,integer,integer,integer,varchar)'::regprocedure
        )
      ORDER BY p.proname
    `);
    assertInvariant(retiredRoutines.rowCount === 5, 'all superseded shard routines must remain auditable');
    for (const routine of retiredRoutines.rows) {
      assertInvariant(!hasRuntimeExecute(routine.proacl), `${routine.proname} must be owner-only`);
      assertInvariant(
        routine.proconfig?.some(value => value === 'search_path=public, pg_temp'),
        `${routine.proname} must pin its search_path even while retired`
      );
    }

    const supportedCompatibilityRoutines = await client.query<RoutineGrantRow & { definition: string }>(`
      SELECT p.proname, p.proacl::text, p.proconfig, pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.oid IN (
          'public.fn_gateway_preflight_composite_mesh_v2(varchar,varchar,numeric,varchar,varchar,bigint)'::regprocedure,
          'public.fn_gateway_postflight_composite_mesh_v2(varchar,uuid,varchar,varchar,numeric,varchar,integer,integer,integer,integer,integer,varchar)'::regprocedure,
          'public.fn_gateway_preflight_qos_universal_v3(varchar,varchar,varchar,varchar)'::regprocedure,
          'public.fn_report_shard_health_cf(jsonb)'::regprocedure
        )
      ORDER BY p.proname
    `);
    assertInvariant(supportedCompatibilityRoutines.rowCount === 4, 'supported backend compatibility routines must exist');
    for (const routine of supportedCompatibilityRoutines.rows) {
      assertInvariant(!hasPublicExecute(routine.proacl), `${routine.proname} must not be client-callable`);
      assertInvariant(hasServiceExecute(routine.proacl), `${routine.proname} must be service-only`);
      assertInvariant(
        routine.proconfig?.some(value => value === 'search_path=public, pg_temp'),
        `${routine.proname} must pin its search_path`
      );
    }

    const preflightV2 = supportedCompatibilityRoutines.rows.find(
      routine => routine.proname === 'fn_gateway_preflight_composite_mesh_v2'
    )?.definition || '';
    const postflightV2 = supportedCompatibilityRoutines.rows.find(
      routine => routine.proname === 'fn_gateway_postflight_composite_mesh_v2'
    )?.definition || '';
    assertInvariant(
      /fn_acquire_shard_lease/i.test(preflightV2) && !/INSERT\s+INTO\s+(?:public\.)?galx_shard_leases/i.test(preflightV2),
      'gateway preflight v2 must delegate lease acquisition'
    );
    assertInvariant(
      /pg_advisory_xact_lock/i.test(preflightV2),
      'gateway preflight v2 must serialize duplicate request IDs before shard selection'
    );
    assertInvariant(
      /fn_release_shard_lease/i.test(postflightV2) && !/DELETE\s+FROM\s+(?:public\.)?galx_shard_leases/i.test(postflightV2),
      'gateway postflight v2 must delegate fenced settlement and retain the lease record'
    );

    const shardSurfaceRoutines = await client.query<RoutineGrantRow>(`
      SELECT p.proname, p.proacl::text, p.proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND (
          pg_get_functiondef(p.oid) ILIKE '%galx_shard_accounts%'
          OR pg_get_functiondef(p.oid) ILIKE '%galx_shard_leases%'
          OR pg_get_functiondef(p.oid) ILIKE '%galx_shard_concurrency_leases%'
        )
    `);
    for (const routine of shardSurfaceRoutines.rows) {
      assertInvariant(!hasPublicExecute(routine.proacl), `${routine.proname} exposes the shard surface to a client role`);
    }

    const settlementGuard = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'galx_wallet_transactions'
        AND indexname = 'idx_galx_wallet_usage_draw_lease_once'
    `);
    assertInvariant(Number(settlementGuard.rows[0]?.count) === 1, 'lease settlement must have a unique wallet receipt guard');

    const adjacentWorkRls = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE oid IN (
        'public.lumi_user_pool_leases'::regclass,
        'public.lumi_user_rolling_quotas'::regclass,
        'public.lumi_cluster_pool_metrics'::regclass,
        'public.community_user_monthly_grants'::regclass,
        'public.community_free_pool_daily_ledger'::regclass,
        'public.community_grant_allocations'::regclass
      )
    `);
    assertInvariant(adjacentWorkRls.rowCount === 6, 'all adjacent work-authority tables must exist');
    for (const table of adjacentWorkRls.rows) {
      assertInvariant(table.relrowsecurity, `${table.relname} RLS must be enabled`);
      assertInvariant(table.relforcerowsecurity, `${table.relname} RLS must be forced`);
    }

    const adjacentWorkMutationGrants = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name IN (
          'lumi_user_pool_leases',
          'lumi_user_rolling_quotas',
          'lumi_cluster_pool_metrics',
          'community_user_monthly_grants',
          'community_free_pool_daily_ledger',
          'community_grant_allocations'
        )
        AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
        AND privilege_type <> 'SELECT'
    `);
    assertInvariant(
      Number(adjacentWorkMutationGrants.rows[0]?.count) === 0,
      'runtime roles must not bypass adjacent work-authority routines with table DML'
    );

    const adjacentWorkAnonGrants = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name IN (
          'lumi_user_pool_leases',
          'lumi_user_rolling_quotas',
          'lumi_cluster_pool_metrics',
          'community_user_monthly_grants',
          'community_free_pool_daily_ledger',
          'community_grant_allocations'
        )
        AND grantee IN ('PUBLIC', 'anon')
    `);
    assertInvariant(
      Number(adjacentWorkAnonGrants.rows[0]?.count) === 0,
      'anonymous roles must have no adjacent work-authority table grants'
    );

    const adjacentWorkRoutines = await client.query<RoutineGrantRow>(`
      SELECT p.proname, p.proacl::text, p.proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.oid IN (
          'public.rpc_acquire_lumi_stream_lease_v2(text,text,text,text,integer,integer,integer)'::regprocedure,
          'public.rpc_heartbeat_lumi_stream_lease(text,text,integer)'::regprocedure,
          'public.rpc_settle_lumi_stream_lease_v2(text,text,bigint,bigint,bigint)'::regprocedure,
          'public.rpc_sweep_expired_lumi_leases()'::regprocedure,
          'public.rpc_evaluate_and_acquire_community_grant(text,text,date,numeric)'::regprocedure,
          'public.rpc_settle_community_grant_draw(text,numeric,text,date)'::regprocedure
        )
      ORDER BY p.proname
    `);
    assertInvariant(adjacentWorkRoutines.rowCount === 6, 'all adjacent work-authority routines must exist');
    for (const routine of adjacentWorkRoutines.rows) {
      assertInvariant(!hasPublicExecute(routine.proacl), `${routine.proname} must not be client-callable`);
      assertInvariant(hasServiceExecute(routine.proacl), `${routine.proname} must be service-only`);
      assertInvariant(
        routine.proconfig?.some(value => value === 'search_path=public, pg_temp'),
        `${routine.proname} must pin its search_path`
      );
    }

    const capacityConstraints = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM pg_constraint
      WHERE conrelid = 'public.galx_shard_accounts'::regclass
        AND conname IN (
          'galx_shards_token_state_nonnegative',
          'galx_shards_request_state_nonnegative',
          'galx_shards_concurrency_state_valid',
          'galx_shards_refill_remainders_valid'
        )
    `);
    assertInvariant(
      Number(capacityConstraints.rows[0]?.count) === 4,
      'all shard capacity state constraints must exist'
    );

    const leakedProjectionKeys = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM public.galx_shard_registry_events
      WHERE projection ?| ARRAY[
        'accessToken', 'refreshToken', 'apiKey', 'secret',
        'encryptedCiphertext', 'encryptedIv', 'encryptedTag'
      ]
    `);
    assertInvariant(
      Number(leakedProjectionKeys.rows[0]?.count) === 0,
      'journal projections must not contain credential material'
    );

    const probe = await client.query<{ id: string; registry_revision: string }>(`
      SELECT id, registry_revision::text
      FROM public.galx_shard_accounts
      ORDER BY id
      LIMIT 1
    `);
    let counterOnlyJournalWrites = 0;
    let controlPlaneJournalWrites = 0;
    let idempotentLeaseAcquire = false;
    let idempotentLeaseRelease = false;
    let fencedLeaseRenewal = false;
    let databaseCapacityEnforced = false;
    let databaseRequestCapacityEnforced = false;
    let databaseRollingWindowEnforced = false;
    let fractionalRefillCarryPreserved = false;
    let counterSafeRegistryUpsert = false;
    let gatewayAdmissionIdempotent = false;
    let gatewaySettlementIdempotent = false;
    if (probe.rows[0]) {
      const { id } = probe.rows[0];
      const revisionBefore = Number(probe.rows[0].registry_revision);
      const eventsBefore = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM public.galx_shard_registry_events'
      );

      await client.query(
        'UPDATE public.galx_shard_accounts SET reserved_tokens = reserved_tokens + 1 WHERE id = $1',
        [id]
      );
      const afterCounter = await client.query<{ registry_revision: string }>(
        'SELECT registry_revision::text FROM public.galx_shard_accounts WHERE id = $1',
        [id]
      );
      const eventsAfterCounter = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM public.galx_shard_registry_events'
      );

      assertInvariant(
        Number(afterCounter.rows[0]?.registry_revision) === revisionBefore,
        'usage counters must not advance registry revision'
      );
      counterOnlyJournalWrites = Number(eventsAfterCounter.rows[0]?.count) - Number(eventsBefore.rows[0]?.count);
      assertInvariant(counterOnlyJournalWrites === 0, 'usage counters must not emit registry events');

      await client.query(
        'UPDATE public.galx_shard_accounts SET priority = priority + 1 WHERE id = $1',
        [id]
      );
      const afterControl = await client.query<{ registry_revision: string }>(
        'SELECT registry_revision::text FROM public.galx_shard_accounts WHERE id = $1',
        [id]
      );
      const eventsAfterControl = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM public.galx_shard_registry_events'
      );

      assertInvariant(
        Number(afterControl.rows[0]?.registry_revision) === revisionBefore + 1,
        'control-plane changes must advance registry revision exactly once'
      );
      controlPlaneJournalWrites = Number(eventsAfterControl.rows[0]?.count) - Number(eventsAfterCounter.rows[0]?.count);
      assertInvariant(controlPlaneJournalWrites === 1, 'control-plane changes must emit exactly one registry event');
    }

    const healthyShard = await client.query<{ id: string }>(`
      SELECT id
      FROM public.galx_shard_accounts
      WHERE status = 'healthy' AND permission_retracted = false
      ORDER BY id
      LIMIT 1
    `);
    if (healthyShard.rows[0]) {
      const jobId = `authority_verify_${process.pid}_${Date.now()}`;
      const acquireParams = [healthyShard.rows[0].id, 'authority_verifier', 1, 60_000, jobId, Date.now()];
      const firstAcquire = await client.query<{ result: any }>(
        `SELECT public.fn_acquire_shard_lease(
          $1::varchar, $2::varchar, $3::bigint, $4::bigint, $5::varchar, $6::bigint
        ) AS result`,
        acquireParams
      );
      const secondAcquire = await client.query<{ result: any }>(
        `SELECT public.fn_acquire_shard_lease(
          $1::varchar, $2::varchar, $3::bigint, $4::bigint, $5::varchar, $6::bigint
        ) AS result`,
        acquireParams
      );
      const firstLease = firstAcquire.rows[0]?.result;
      const replayedLease = secondAcquire.rows[0]?.result;
      idempotentLeaseAcquire = Boolean(
        firstLease?.success &&
        replayedLease?.success &&
        replayedLease?.idempotent_replay &&
        firstLease.lease_id === replayedLease.lease_id
      );
      assertInvariant(idempotentLeaseAcquire, 'acquisition retry must return the original lease');

      const renewal = await client.query<{ result: any }>(
        `SELECT public.fn_extend_shard_lease(
          $1::varchar, $2::bigint, $3::bigint, $4::bigint
        ) AS result`,
        [firstLease.lease_id, firstLease.fencing_token, 120_000, Date.now()]
      );
      const rejectedStaleRenewal = await client.query<{ result: any }>(
        `SELECT public.fn_extend_shard_lease(
          $1::varchar, $2::bigint, $3::bigint, $4::bigint
        ) AS result`,
        [firstLease.lease_id, Number(firstLease.fencing_token) - 1, 120_000, Date.now()]
      );
      fencedLeaseRenewal = Boolean(
        renewal.rows[0]?.result?.success &&
        !rejectedStaleRenewal.rows[0]?.result?.success &&
        rejectedStaleRenewal.rows[0]?.result?.reason === 'FENCING_TOKEN_MISMATCH'
      );
      assertInvariant(fencedLeaseRenewal, 'lease renewal must require the current fencing token');

      const releaseParams = [firstLease.lease_id, 1, 10, true, Date.now()];
      const firstRelease = await client.query<{ result: any }>(
        `SELECT public.fn_release_shard_lease(
          $1::varchar, $2::bigint, $3::numeric, $4::boolean, $5::bigint
        ) AS result`,
        releaseParams
      );
      const secondRelease = await client.query<{ result: any }>(
        `SELECT public.fn_release_shard_lease(
          $1::varchar, $2::bigint, $3::numeric, $4::boolean, $5::bigint
        ) AS result`,
        releaseParams
      );
      idempotentLeaseRelease = Boolean(
        firstRelease.rows[0]?.result?.success &&
        secondRelease.rows[0]?.result?.success &&
        secondRelease.rows[0]?.result?.idempotent_replay
      );
      assertInvariant(idempotentLeaseRelease, 'release retry must return the committed decision');

      const beforeCounterSafeUpsert = await client.query<{ payload: any }>(
        'SELECT to_jsonb(s) AS payload FROM public.galx_shard_accounts s WHERE id = $1',
        [healthyShard.rows[0].id]
      );
      await client.query(
        'UPDATE public.galx_shard_accounts SET reserved_tokens = reserved_tokens + 7 WHERE id = $1',
        [healthyShard.rows[0].id]
      );
      await client.query(
        'SELECT public.fn_upsert_shard_registry($1::jsonb)',
        [beforeCounterSafeUpsert.rows[0].payload]
      );
      const afterCounterSafeUpsert = await client.query<{ reserved_tokens: string }>(
        'SELECT reserved_tokens::text FROM public.galx_shard_accounts WHERE id = $1',
        [healthyShard.rows[0].id]
      );
      counterSafeRegistryUpsert = Number(afterCounterSafeUpsert.rows[0]?.reserved_tokens) ===
        Number(beforeCounterSafeUpsert.rows[0].payload.reserved_tokens) + 7;
      assertInvariant(counterSafeRegistryUpsert, 'registry upsert must not overwrite live lease counters');

      await client.query(
        `UPDATE public.galx_shard_accounts
         SET remaining_tokens = 1,
             reserved_tokens = 0,
             refill_rate_per_minute = 0,
             last_refill_timestamp_ms = $2,
             active_in_flight_count = 0,
             sliding_window_quota = '{}'::jsonb
         WHERE id = $1`,
        [healthyShard.rows[0].id, Date.now()]
      );
      const capacityDecision = await client.query<{ result: any }>(
        `SELECT public.fn_acquire_shard_lease(
          $1::varchar, $2::varchar, $3::bigint, $4::bigint, $5::varchar, $6::bigint
        ) AS result`,
        [healthyShard.rows[0].id, 'authority_verifier', 2, 60_000, `${jobId}_capacity`, Date.now()]
      );
      databaseCapacityEnforced = Boolean(
        !capacityDecision.rows[0]?.result?.success &&
        capacityDecision.rows[0]?.result?.reason === 'SHARD_TOKEN_QUOTA_EXHAUSTED'
      );
      assertInvariant(databaseCapacityEnforced, 'PostgreSQL must reject leases beyond authoritative token headroom');

      await client.query(
        `UPDATE public.galx_shard_accounts
         SET remaining_tokens = max_tokens,
             reserved_tokens = 0,
             max_requests = 1,
             remaining_requests = 1,
             active_in_flight_count = 0,
             max_concurrency_ceiling = GREATEST(max_concurrency_ceiling, 2),
             sliding_window_quota = '{}'::jsonb,
             last_refill_timestamp_ms = $2
         WHERE id = $1`,
        [healthyShard.rows[0].id, Date.now()]
      );
      const requestSlot = await client.query<{ result: any }>(
        `SELECT public.fn_acquire_shard_lease(
          $1::varchar, $2::varchar, $3::bigint, $4::bigint, $5::varchar, $6::bigint
        ) AS result`,
        [healthyShard.rows[0].id, 'authority_verifier', 1, 60_000, `${jobId}_request_slot`, Date.now()]
      );
      const requestCapacityDecision = await client.query<{ result: any }>(
        `SELECT public.fn_acquire_shard_lease(
          $1::varchar, $2::varchar, $3::bigint, $4::bigint, $5::varchar, $6::bigint
        ) AS result`,
        [healthyShard.rows[0].id, 'authority_verifier', 1, 60_000, `${jobId}_request_capacity`, Date.now()]
      );
      databaseRequestCapacityEnforced = Boolean(
        requestSlot.rows[0]?.result?.success &&
        !requestCapacityDecision.rows[0]?.result?.success &&
        requestCapacityDecision.rows[0]?.result?.reason === 'SHARD_REQUEST_QUOTA_EXHAUSTED'
      );
      assertInvariant(
        databaseRequestCapacityEnforced,
        `pending leases must reserve request capacity (first=${requestSlot.rows[0]?.result?.reason || requestSlot.rows[0]?.result?.success}, second=${requestCapacityDecision.rows[0]?.result?.reason || requestCapacityDecision.rows[0]?.result?.success})`
      );

      await client.query(
        `UPDATE public.galx_shard_accounts
         SET remaining_requests = max_requests,
             active_in_flight_count = 0,
             sliding_window_quota = jsonb_build_object(
               'windowDurationMs', 86400000,
               'maxRequestsPerWindow', 1
             ),
             last_refill_timestamp_ms = $2
         WHERE id = $1`,
        [healthyShard.rows[0].id, Date.now()]
      );
      const rollingWindowDecision = await client.query<{ result: any }>(
        `SELECT public.fn_acquire_shard_lease(
          $1::varchar, $2::varchar, $3::bigint, $4::bigint, $5::varchar, $6::bigint
        ) AS result`,
        [healthyShard.rows[0].id, 'authority_verifier', 1, 60_000, `${jobId}_rolling`, Date.now()]
      );
      databaseRollingWindowEnforced = Boolean(
        !rollingWindowDecision.rows[0]?.result?.success &&
        rollingWindowDecision.rows[0]?.result?.reason === 'SHARD_SLIDING_WINDOW_EXHAUSTED'
      );
      assertInvariant(databaseRollingWindowEnforced, 'PostgreSQL must enforce durable rolling-window usage');

      const refillBaseMs = Date.now();
      await client.query(
        `UPDATE public.galx_shard_accounts
         SET remaining_tokens = 0,
             reserved_tokens = 0,
             refill_rate_per_minute = 30,
             token_refill_remainder = 0,
             remaining_requests = max_requests,
             active_in_flight_count = 0,
             sliding_window_quota = '{}'::jsonb,
             last_refill_timestamp_ms = $2
         WHERE id = $1`,
        [healthyShard.rows[0].id, refillBaseMs - 1000]
      );
      const halfCredit = await client.query<{ result: any }>(
        `SELECT public.fn_acquire_shard_lease(
          $1::varchar, $2::varchar, $3::bigint, $4::bigint, $5::varchar, $6::bigint
        ) AS result`,
        [healthyShard.rows[0].id, 'authority_verifier', 1, 60_000, `${jobId}_refill_half`, refillBaseMs]
      );
      const fullCredit = await client.query<{ result: any }>(
        `SELECT public.fn_acquire_shard_lease(
          $1::varchar, $2::varchar, $3::bigint, $4::bigint, $5::varchar, $6::bigint
        ) AS result`,
        [healthyShard.rows[0].id, 'authority_verifier', 1, 60_000, `${jobId}_refill_full`, refillBaseMs + 1000]
      );
      fractionalRefillCarryPreserved = Boolean(
        !halfCredit.rows[0]?.result?.success &&
        halfCredit.rows[0]?.result?.reason === 'SHARD_TOKEN_QUOTA_EXHAUSTED' &&
        fullCredit.rows[0]?.result?.success
      );
      assertInvariant(fractionalRefillCarryPreserved, 'fractional refill credit must survive frequent admission checks');
    }

    const gatewayPrincipal = await client.query<{
      key_hash: string;
      user_id: string;
      workspace_id: string | null;
    }>(`
      SELECT k.key_hash, k.user_id, k.workspace_id::text
      FROM public.galx_developer_keys k
      JOIN public.galx_wallets w ON w.user_id = k.user_id
      WHERE k.is_revoked = false
      ORDER BY k.created_at DESC
      LIMIT 1
    `);
    if (gatewayPrincipal.rows[0] && healthyShard.rows[0]) {
      const principal = gatewayPrincipal.rows[0];
      const requestId = `authority-gateway-${process.pid}-${Date.now()}`;
      const gatewayParams = [
        principal.key_hash,
        'authority-verifier',
        0,
        'authority-verifier',
        requestId,
        1
      ];
      const firstPreflight = await client.query<{ result: any }>(
        `SELECT public.fn_gateway_preflight_composite_mesh_v2(
          $1::varchar, $2::varchar, $3::numeric, $4::varchar, $5::varchar, $6::bigint
        ) AS result`,
        gatewayParams
      );
      const replayedPreflight = await client.query<{ result: any }>(
        `SELECT public.fn_gateway_preflight_composite_mesh_v2(
          $1::varchar, $2::varchar, $3::numeric, $4::varchar, $5::varchar, $6::bigint
        ) AS result`,
        gatewayParams
      );
      const firstGatewayLease = firstPreflight.rows[0]?.result;
      const replayedGatewayLease = replayedPreflight.rows[0]?.result;
      gatewayAdmissionIdempotent = Boolean(
        firstGatewayLease?.success &&
        replayedGatewayLease?.success &&
        replayedGatewayLease?.idempotent_replay &&
        firstGatewayLease.lease_id === replayedGatewayLease.lease_id
      );
      assertInvariant(gatewayAdmissionIdempotent, 'gateway retry must replay one authoritative admission');

      const settlementParams = [
        principal.user_id,
        principal.workspace_id,
        firstGatewayLease.shard_id,
        firstGatewayLease.lease_id,
        0,
        'authority-verifier',
        1,
        0,
        0,
        1,
        200,
        null
      ];
      const firstSettlement = await client.query<{ result: any }>(
        `SELECT public.fn_gateway_postflight_composite_mesh_v2(
          $1::varchar, $2::uuid, $3::varchar, $4::varchar, $5::numeric, $6::varchar,
          $7::integer, $8::integer, $9::integer, $10::integer, $11::integer, $12::varchar
        ) AS result`,
        settlementParams
      );
      const replayedSettlement = await client.query<{ result: any }>(
        `SELECT public.fn_gateway_postflight_composite_mesh_v2(
          $1::varchar, $2::uuid, $3::varchar, $4::varchar, $5::numeric, $6::varchar,
          $7::integer, $8::integer, $9::integer, $10::integer, $11::integer, $12::varchar
        ) AS result`,
        settlementParams
      );
      gatewaySettlementIdempotent = Boolean(
        firstSettlement.rows[0]?.result?.success &&
        replayedSettlement.rows[0]?.result?.success &&
        replayedSettlement.rows[0]?.result?.idempotent_replay &&
        firstSettlement.rows[0]?.result?.transaction_id === replayedSettlement.rows[0]?.result?.transaction_id
      );
      assertInvariant(gatewaySettlementIdempotent, 'gateway retry must replay one wallet and lease settlement');
    }

    assertInvariant(
      !fs.existsSync(path.resolve('.galx-shards.json')),
      'legacy JSON credential cache must not exist'
    );

    console.log(JSON.stringify({
      authority: 'supabase-postgresql',
      forcedRls: true,
      clientTableGrants: 0,
      publicLeaseRpcGrants: 0,
      serviceRoleRoutineGrants: 5,
      competingLeaseAuthorities: 0,
      retiredRuntimeTableGrants: 0,
      excessiveServiceTableGrants: 0,
      serviceOnlyCompatibilityRoutines: 4,
      idempotentSettlementGuard: true,
      adjacentWorkAuthorityRoutines: 6,
      adjacentWorkMutationGrants: 0,
      adjacentWorkAnonymousGrants: 0,
      capacityStateConstraints: 4,
      leakedJournalCredentialKeys: 0,
      legacyJsonCachePresent: false,
      counterOnlyJournalWrites,
      controlPlaneJournalWrites,
      idempotentLeaseAcquire,
      idempotentLeaseRelease,
      fencedLeaseRenewal,
      databaseCapacityEnforced,
      databaseRequestCapacityEnforced,
      databaseRollingWindowEnforced,
      fractionalRefillCarryPreserved,
      counterSafeRegistryUpsert,
      gatewayAdmissionIdempotent,
      gatewaySettlementIdempotent,
      migrationEvaluatedInRollback: Boolean(migrationPath)
    }, null, 2));
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    await client.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
