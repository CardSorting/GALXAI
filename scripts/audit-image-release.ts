/** Read-only release audit. It never lists user rows, object keys, or secret values. */
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { approvedAllowanceFor, IMAGE_ALLOWANCE_CONFIGURATION } from '../src/lib/billing/image-allowance-config';

type GateStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'UNAPPROVED';
interface Finding { gate: string; status: GateStatus; detail: string }
const findings: Finding[] = [];
const add = (gate: string, status: GateStatus, detail: string) => findings.push({ gate, status, detail });
const rootFiles = await Promise.all(['wrangler.toml', 'supabase/migrations/20260924030000_private_image_allowance_accounting.sql',
  'src/app/api/billing/plan/route.ts', 'src/core/storage/GalxUnifiedR2StorageManager.ts',
  'src/lib/images/request-service.ts'].map(file => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
const [wrangler, allowanceMigration, billingRoute, storageManager, requestService] = rootFiles;

const privateImageConfig = storageManager.match(/images:\s*\{([\s\S]*?)\n\s*\},\n\s*user_webapps:/)?.[1] ?? '';
const privateStorageGuard = storageManager.match(/public isPrivateImageStorageConfigured\(\): boolean \{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
const privateStoragePathIsAuthoritative = !wrangler.includes('PRIVATE_IMAGE_BUCKET') &&
  privateImageConfig.includes('R2_PRIVATE_IMAGES_BUCKET_NAME') &&
  privateImageConfig.includes("publicDomain: 'https://galx.ai'") && !privateImageConfig.includes('workerBindingName') &&
  privateStorageGuard.includes('R2_PRIVATE_IMAGES_BUCKET_NAME') && privateStorageGuard.includes('this.accountId') &&
  privateStorageGuard.includes('this.accessKeyId') && privateStorageGuard.includes('this.secretAccessKey') &&
  /isPrivateImageStorageConfigured\(\)[\s\S]*?repository\.create/.test(requestService);
add('local private-storage path', privateStoragePathIsAuthoritative ? 'PASS' : 'FAIL',
  privateStoragePathIsAuthoritative
    ? 'Vercel uses the server-side private R2 configuration before request reservation; no unused Worker binding is required.'
    : 'The private application storage path is not clearly configured and guarded before reservation.');

const noDatabaseAllowanceTable = !allowanceMigration.includes('galx_image_plan_allowances') &&
  !billingRoute.includes('galx_image_plan_allowances');
add('single allowance configuration surface', noDatabaseAllowanceTable ? 'PASS' : 'FAIL',
  noDatabaseAllowanceTable ? 'Allowance activation is sourced from the typed configuration; period usage is an accounting snapshot.' : 'A second mutable allowance source remains in billing or migration code.');

const planKeys = Object.keys(IMAGE_ALLOWANCE_CONFIGURATION.plans);
const allApproved = planKeys.length === 3 && planKeys.every(key =>
  approvedAllowanceFor(IMAGE_ALLOWANCE_CONFIGURATION, key as keyof typeof IMAGE_ALLOWANCE_CONFIGURATION.plans) !== null);
add('purchased allowance approval', allApproved ? 'PASS' : 'UNAPPROVED',
  allApproved ? 'Workshop, Studio, and MAX use valid approved allocations and shared output weights from the canonical typed configuration.'
    : 'One or more plan allocations or shared output weights remain unapproved or invalid; checkout and dispatch must stay closed.');

add('historical object-storage inventory', 'BLOCKED', 'Historical human assets: UNVERIFIED; complete bucket inventory and unauthenticated origin checks are still required.');
add('historical CDN/cache inventory', 'BLOCKED', 'Historical cached image URLs: UNVERIFIED; origin and cache coverage has not been established.');
add('legacy human-generated assets', 'BLOCKED', 'Legacy human asset set: UNVERIFIED; current source code is not evidence of historical object privacy.');
add('production environment and bucket settings', 'BLOCKED', 'Hosted environment values and live bucket/public-domain settings were not inspected by this local read-only check.');
add('deployed generation-route authorization', 'BLOCKED', 'Local route tests do not certify deployed authentication, entitlement, reservation, or Star authorization settings.');

const auditUrl = process.env.GALX_RELEASE_AUDIT_DATABASE_URL;
if (!auditUrl) {
  add('hosted database RLS/grants/views', 'BLOCKED', 'Set GALX_RELEASE_AUDIT_DATABASE_URL explicitly to a read-only audit target; no target was selected.');
} else {
  const pool = new Pool({ connectionString: auditUrl, max: 1, connectionTimeoutMillis: 5000, statement_timeout: 8000, query_timeout: 8000 });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN READ ONLY');
      await client.query("SET LOCAL statement_timeout='5s'");
      const required = (await client.query(`SELECT
        to_regclass('public.user_image_library') IS NOT NULL AS image_library,
        to_regclass('private.galx_image_requests') IS NOT NULL AS image_requests,
        to_regclass('private.galx_generation_records') IS NOT NULL AS generation_records,
        to_regclass('private.galx_generation_assets') IS NOT NULL AS generation_assets,
        to_regclass('private.galx_image_plan_period_usage') IS NOT NULL AS allowance_periods,
        to_regclass('private.galx_image_usage_reservations') IS NOT NULL AS allowance_reservations,
        to_regclass('private.galx_image_plan_allowances') IS NULL AS no_duplicate_allowance_table,
        to_regclass('public.community_creations_feed') IS NOT NULL AS explore_view,
        to_regclass('public.community_star_profile_creations') IS NOT NULL AS star_archive_view,
        to_regclass('public.community_participant_profiles') IS NOT NULL AS star_profile_view,
        to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS migration_history`)).rows[0];
      const rls = (await client.query(`SELECT n.nspname AS schema_name,c.relname AS relation_name,
        c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS rls_forced
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE (n.nspname,c.relname) IN (('public','user_image_library'),('private','galx_image_requests'),
          ('private','galx_generation_records'),('private','galx_generation_assets'),
          ('private','galx_image_plan_period_usage'),('private','galx_image_usage_reservations'))`)).rows;
      const grants = (await client.query(`SELECT
        has_table_privilege('anon',to_regclass('public.user_image_library'),'SELECT') AS anon_library,
        has_table_privilege('authenticated',to_regclass('public.user_image_library'),'SELECT') AS auth_library,
        has_table_privilege('anon',to_regclass('public.user_image_library'),'INSERT') AS anon_insert,
        has_table_privilege('anon',to_regclass('public.user_image_library'),'UPDATE') AS anon_update,
        has_table_privilege('anon',to_regclass('public.user_image_library'),'DELETE') AS anon_delete,
        has_table_privilege('authenticated',to_regclass('public.user_image_library'),'INSERT') AS auth_insert,
        has_table_privilege('authenticated',to_regclass('public.user_image_library'),'UPDATE') AS auth_update,
        has_table_privilege('authenticated',to_regclass('public.user_image_library'),'DELETE') AS auth_delete,
        has_table_privilege('anon',to_regclass('public.community_creations_feed'),'SELECT') AS anon_feed,
        has_table_privilege('authenticated',to_regclass('public.community_creations_feed'),'SELECT') AS auth_feed,
        has_table_privilege('anon',to_regclass('public.community_creations_feed'),'INSERT') AS anon_feed_write,
        has_table_privilege('authenticated',to_regclass('public.community_creations_feed'),'INSERT') AS auth_feed_write,
        has_table_privilege('anon',to_regclass('public.community_star_profile_creations'),'SELECT') AS anon_archive,
        has_table_privilege('authenticated',to_regclass('public.community_star_profile_creations'),'SELECT') AS auth_archive,
        has_table_privilege('anon',to_regclass('public.community_star_profile_creations'),'INSERT') AS anon_archive_write,
        has_table_privilege('authenticated',to_regclass('public.community_star_profile_creations'),'INSERT') AS auth_archive_write,
        has_table_privilege('service_role',to_regclass('public.community_creations_feed'),'SELECT') AS service_feed,
        has_table_privilege('service_role',to_regclass('public.community_star_profile_creations'),'SELECT') AS service_archive,
        has_table_privilege('anon',to_regclass('public.community_participant_profiles'),'SELECT') AS anon_profiles,
        has_table_privilege('authenticated',to_regclass('public.community_participant_profiles'),'SELECT') AS auth_profiles,
        has_table_privilege('anon',to_regclass('public.community_participant_profiles'),'INSERT') AS anon_profile_write,
        has_table_privilege('anon',to_regclass('public.community_participant_profiles'),'UPDATE') AS anon_profile_update,
        has_table_privilege('anon',to_regclass('public.community_participant_profiles'),'DELETE') AS anon_profile_delete,
        has_table_privilege('authenticated',to_regclass('public.community_participant_profiles'),'INSERT') AS auth_profile_write,
        has_table_privilege('authenticated',to_regclass('public.community_participant_profiles'),'UPDATE') AS auth_profile_update,
        has_table_privilege('authenticated',to_regclass('public.community_participant_profiles'),'DELETE') AS auth_profile_delete,
        has_table_privilege('anon',to_regclass('private.galx_image_requests'),'SELECT') AS anon_requests,
        has_table_privilege('authenticated',to_regclass('private.galx_image_requests'),'SELECT') AS auth_requests,
        has_table_privilege('service_role',to_regclass('private.galx_image_requests'),'SELECT') AS service_requests,
        has_table_privilege('anon',to_regclass('private.galx_generation_records'),'SELECT') AS anon_generations,
        has_table_privilege('authenticated',to_regclass('private.galx_generation_records'),'SELECT') AS auth_generations,
        has_table_privilege('service_role',to_regclass('private.galx_generation_records'),'SELECT') AS service_generations,
        has_table_privilege('anon',to_regclass('private.galx_generation_assets'),'SELECT') AS anon_generation_assets,
        has_table_privilege('authenticated',to_regclass('private.galx_generation_assets'),'SELECT') AS auth_generation_assets,
        has_table_privilege('service_role',to_regclass('private.galx_generation_assets'),'SELECT') AS service_generation_assets,
        has_table_privilege('anon',to_regclass('private.galx_image_plan_period_usage'),'SELECT') AS anon_allowance,
        has_table_privilege('authenticated',to_regclass('private.galx_image_plan_period_usage'),'SELECT') AS auth_allowance,
        has_table_privilege('service_role',to_regclass('private.galx_image_plan_period_usage'),'SELECT') AS service_allowance,
        has_table_privilege('anon',to_regclass('private.galx_image_usage_reservations'),'SELECT') AS anon_reservations,
        has_table_privilege('authenticated',to_regclass('private.galx_image_usage_reservations'),'SELECT') AS auth_reservations,
        has_table_privilege('service_role',to_regclass('private.galx_image_usage_reservations'),'SELECT') AS service_reservations,
        has_table_privilege('service_role',to_regclass('public.community_participant_profiles'),'SELECT') AS service_profiles`)).rows[0];
      const publicViewWrites = (await client.query(`SELECT COALESCE(bool_or(has_table_privilege(role_name,to_regclass(relation_name),privilege)),false) AS any_browser_write
        FROM (VALUES ('anon'),('authenticated')) AS roles(role_name)
        CROSS JOIN (VALUES ('public.community_creations_feed'),('public.community_star_profile_creations'),
          ('public.community_participant_profiles')) AS relations(relation_name)
        CROSS JOIN (VALUES ('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE')) AS privileges(privilege)`)).rows[0].any_browser_write === true;
      const privateTableGrants = (await client.query(`SELECT COALESCE(bool_or(has_table_privilege(role_name,to_regclass(relation_name),privilege)),false) AS any_direct_access
        FROM (VALUES ('anon'),('authenticated'),('service_role')) AS roles(role_name)
        CROSS JOIN (VALUES ('private.galx_image_requests'),('private.galx_generation_records'),
          ('private.galx_generation_assets'),('private.galx_image_plan_period_usage'),
          ('private.galx_image_usage_reservations')) AS relations(relation_name)
        CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS privileges(privilege)`)).rows[0].any_direct_access === true;
      const publicPolicy = (await client.query(`SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='user_image_library'
          AND policyname='policy_user_image_library_select_public' AND cmd='SELECT'
          AND 'anon'=ANY(roles) AND 'authenticated'=ANY(roles)
          AND position('star_published' in COALESCE(qual,'')) > 0
          AND position('is_public' in COALESCE(qual,'')) > 0
          AND position('visibility' in COALESCE(qual,'')) > 0
          AND position('galx_is_public_participant' in COALESCE(qual,'')) > 0
      ) AND EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='user_image_library'
          AND policyname='policy_user_image_library_select_owner' AND cmd='SELECT'
          AND 'authenticated'=ANY(roles)
          AND position('auth.uid' in COALESCE(qual,'')) > 0
          AND position('user_id' in COALESCE(qual,'')) > 0
      ) AS restricted_public_policy`)).rows[0].restricted_public_policy === true;
      const viewRules = (await client.query(`SELECT
        position('star_published' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_star_filter,
        position('star_published' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_star_filter,
        position('is_public' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_public_filter,
        position('visibility' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_visibility_filter,
        position('is_explore_visible' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_explore_filter,
        position('is_public' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_public_filter,
        position('visibility' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_visibility_filter,
        position('account_class' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_autonomous_identity,
        position('is_discoverable' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_discoverable_star,
        position('is_enabled' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_enabled_star,
        position('profile.status' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_active_profile,
        position('account_class' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_autonomous_identity,
        position('is_discoverable' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_discoverable_star,
        position('is_enabled' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_enabled_star,
        position('profile.status' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_active_profile,
        position('account_class' in pg_get_viewdef('public.community_participant_profiles'::regclass,true)) > 0 AS profile_autonomous_identity,
        position('is_discoverable' in pg_get_viewdef('public.community_participant_profiles'::regclass,true)) > 0 AS profile_discoverability,
        position('is_enabled' in pg_get_viewdef('public.community_participant_profiles'::regclass,true)) > 0 AS profile_enabled,
        position('profile.status' in pg_get_viewdef('public.community_participant_profiles'::regclass,true)) > 0 AS profile_active`)).rows[0];
      const missing = Object.entries(required).filter(([, value]) => value !== true).map(([name]) => name);
      const weakRls = rls.length !== 4 || rls.some(row => !row.rls_enabled || !row.rls_forced);
      const weakGrants = grants.anon_library || grants.auth_library || grants.auth_insert || grants.auth_update || grants.auth_delete ||
        grants.anon_insert || grants.anon_update || grants.anon_delete || grants.anon_feed || grants.auth_feed ||
        grants.anon_feed_write || grants.auth_feed_write || grants.anon_archive || grants.auth_archive ||
        grants.anon_archive_write || grants.auth_archive_write || grants.anon_profile_write || grants.auth_profile_write ||
        grants.anon_profile_update || grants.anon_profile_delete || grants.auth_profile_update || grants.auth_profile_delete ||
        grants.anon_requests || grants.auth_requests || grants.service_requests ||
        grants.anon_generations || grants.auth_generations || grants.service_generations ||
        grants.anon_generation_assets || grants.auth_generation_assets || grants.service_generation_assets ||
        grants.anon_allowance || grants.auth_allowance || grants.service_allowance ||
        grants.anon_reservations || grants.auth_reservations || grants.service_reservations ||
        !grants.service_feed || !grants.service_archive || !grants.anon_profiles || !grants.auth_profiles || !grants.service_profiles ||
        publicViewWrites || privateTableGrants;
      const weakViews = Object.values(viewRules).some(value => value !== true);
      const dbReady = missing.length === 0 && !weakRls && !weakGrants && !weakViews && publicPolicy;
      add('hosted database RLS/grants/views', dbReady ? 'PASS' : 'FAIL', dbReady
        ? 'Required relations, forced RLS, a Star-only row policy, browser-role grants, and Star-only public view predicates passed metadata checks.'
        : 'Database metadata does not meet the image privacy boundary; inspect privately and do not expose raw catalog output.');
      const applied = required.migration_history
        ? (await client.query(`SELECT count(*)::int AS count FROM supabase_migrations.schema_migrations WHERE version IN ('20260924020000','20260924030000')`)).rows[0].count
        : 0;
      add('hosted Phase 3 migration markers', Number(applied) === 2 ? 'PASS' : 'FAIL',
        Number(applied) === 2 ? 'Both private-Work and allowance-accounting migrations are recorded as applied.' : 'Expected Phase 3 migration markers are missing.');
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  } catch {
    add('hosted database RLS/grants/views', 'BLOCKED', 'Read-only metadata connection or expected metadata query failed; no database details were emitted.');
  } finally {
    await pool.end();
  }
}

const counts = Object.fromEntries((['PASS', 'FAIL', 'BLOCKED', 'UNAPPROVED'] as const).map(status =>
  [status, findings.filter(finding => finding.status === status).length]));
const ready = counts.FAIL === 0 && counts.BLOCKED === 0 && counts.UNAPPROVED === 0;
console.log(JSON.stringify({ status: ready ? 'RELEASE READY' : 'RELEASE NOT READY', counts, findings }, null, 2));
if (counts.FAIL > 0) process.exitCode = 1;
