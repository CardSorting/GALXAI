import { Client } from 'pg';
import { getPostgresSslConfig } from '../src/lib/db/postgres';
import { STAR_COHORT_KEY, STAR_REFRESH_COHORT_KEY, STAR_REFRESH_V2_COHORT_KEY, STAR_RETRY_COHORT_KEY } from '../src/lib/stars/star-cohort';

const refresh = process.argv.includes('--refresh');
const refreshV2 = process.argv.includes('--refresh-v2');
const retry = process.argv.includes('--retry');
if ([refresh, refreshV2, retry].filter(Boolean).length > 1) throw new Error('--refresh, --refresh-v2, and --retry are mutually exclusive');
const cohortKey = retry ? STAR_RETRY_COHORT_KEY : refreshV2 ? STAR_REFRESH_V2_COHORT_KEY : refresh ? STAR_REFRESH_COHORT_KEY : STAR_COHORT_KEY;

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = process.env.SUPABASE_PROJECT_REF;
if (!process.env.DATABASE_URL && (!password || !projectRef)) {
  throw new Error('Database credentials are not configured.');
}

const urls = [
  ...(process.env.DATABASE_URL ? [process.env.DATABASE_URL] : []),
  ...(password && projectRef ? [
    `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`,
    `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
  ] : []),
];

async function connect(): Promise<Client> {
  let lastError: unknown;
  for (const connectionString of urls) {
    const client = new Client({
      connectionString,
      ssl: getPostgresSslConfig(),
      connectionTimeoutMillis: 10_000,
    });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All database connections failed.');
}

async function main(): Promise<void> {
  const client = await connect();
  try {
    const cohort = await client.query(`
      SELECT cohort_key, state, max_stars, content_opportunities_per_star,
             max_content_attempts, max_generation_concurrency,
             content_attempts, avatar_attempts, resume_count
      FROM private.galx_star_cohorts
      WHERE cohort_key = $1
    `, [cohortKey]);
    const stars = await client.query(`
      SELECT profile.handle, account_profile.display_name, profile.avatar_url,
             actor.account_id, actor.is_enabled,
             identity.account_class,
             EXISTS (
               SELECT 1 FROM private.galx_administrative_entitlements entitlement
               WHERE entitlement.account_id = actor.account_id
                 AND entitlement.entitlement_key = 'pro-v1'
                 AND entitlement.source = 'administrative'
                 AND entitlement.revoked_at IS NULL
             ) AS has_admin_pro
      FROM private.galx_star_profiles profile
      JOIN private.galx_autonomous_actors actor ON actor.actor_id = profile.actor_id
      JOIN private.galx_star_cohort_members member
        ON member.actor_id = actor.actor_id
       AND member.cohort_id = (SELECT cohort_id FROM private.galx_star_cohorts WHERE cohort_key = $1)
      JOIN private.galx_account_identities identity ON identity.account_id = actor.account_id
      JOIN private.galx_account_profiles account_profile ON account_profile.id = profile.account_profile_id
      ORDER BY profile.handle
    `, [cohortKey]);
    const membership = await client.query(`
      SELECT COUNT(*)::BIGINT AS member_count,
             COUNT(*) FILTER (WHERE is_enabled)::BIGINT AS enabled_member_count,
             COUNT(DISTINCT actor_id)::BIGINT AS distinct_actor_count
      FROM private.galx_star_cohort_members
      WHERE cohort_id = (SELECT cohort_id FROM private.galx_star_cohorts WHERE cohort_key = $1)
    `, [cohortKey]);
    const starAdminAuthority = await client.query<{ count: string }>(`
      SELECT COUNT(*)::BIGINT AS count
      FROM private.preview_admin_members
      WHERE user_id = ANY($1::text[])
    `, [stars.rows.map((star) => star.account_id)]);
    const starPaymentRecords = await client.query<{ count: string }>(`
      SELECT (
        (SELECT COUNT(*) FROM public.galx_stripe_customers WHERE user_id LIKE 'star_%')
        + (SELECT COUNT(*) FROM public.galx_stripe_checkout_sessions WHERE user_id LIKE 'star_%')
        + (SELECT COUNT(*) FROM public.galx_stripe_invoices WHERE user_id LIKE 'star_%')
      )::BIGINT AS count
    `);
    const attempts = await client.query(`
      SELECT profile.handle, attempt.opportunity_number, attempt.state,
             attempt.failure_code, attempt.generation_id,
             generation.state AS generation_state,
             generation.account_id AS generation_account_id,
             COUNT(DISTINCT generation_asset.asset_id)::INT AS mapped_asset_count,
             COUNT(DISTINCT library.id)::INT AS library_asset_count,
             COUNT(DISTINCT CASE WHEN library.status = 'completed' AND library.is_public AND library.visibility = 'public' THEN library.id END)::INT AS public_library_asset_count
      FROM private.galx_star_generation_attempts attempt
      JOIN private.galx_star_profiles profile ON profile.actor_id = attempt.actor_id
      LEFT JOIN private.galx_generation_records generation ON generation.id = attempt.generation_id
      LEFT JOIN private.galx_generation_assets generation_asset ON generation_asset.generation_id = generation.id
      LEFT JOIN public.user_image_library library ON library.id = generation_asset.asset_id
      WHERE attempt.cohort_id = (SELECT cohort_id FROM private.galx_star_cohorts WHERE cohort_key = $1)
        AND attempt.kind = 'content'
      GROUP BY profile.handle, attempt.opportunity_number, attempt.state,
               attempt.failure_code, attempt.generation_id,
               generation.state, generation.account_id
      ORDER BY profile.handle, attempt.opportunity_number
    `, [cohortKey]);
    const projection = await client.query(`
      SELECT participant_kind, handle, display_name, avatar_url
      FROM public.community_participant_profiles
      WHERE participant_kind = 'star'
        AND handle IN (
          SELECT profile.handle
          FROM private.galx_star_profiles AS profile
          JOIN private.galx_star_cohort_members AS member ON member.actor_id = profile.actor_id
          WHERE member.cohort_id = (SELECT cohort_id FROM private.galx_star_cohorts WHERE cohort_key = $1)
        )
      ORDER BY handle
    `, [cohortKey]);
    const analytics = await client.query(`
      SELECT participant_kind,
             SUM(generation_attempts)::BIGINT AS generation_attempts,
             SUM(completed_generations)::BIGINT AS completed_generations,
             SUM(failed_generations)::BIGINT AS failed_generations
      FROM private.galx_participant_generation_activity
      GROUP BY participant_kind
      ORDER BY participant_kind
    `);
    const requestStates = await client.query(`
      SELECT state, COUNT(*)::BIGINT AS count
      FROM private.galx_image_requests
      WHERE user_id LIKE 'star_%'
      GROUP BY state
      ORDER BY state
    `);
    const capacity = await client.query(`
      SELECT provider, status, permission_retracted, COUNT(*)::BIGINT AS count
      FROM public.galx_shard_accounts
      GROUP BY provider, status, permission_retracted
      ORDER BY provider, status, permission_retracted
    `);

    console.log(JSON.stringify({
      cohort: cohort.rows,
      stars: stars.rows,
      membership: membership.rows[0] || null,
      starAdminAuthorityRecords: Number(starAdminAuthority.rows[0]?.count || 0),
      starPaymentRecords: Number(starPaymentRecords.rows[0]?.count || 0),
      attempts: attempts.rows,
      projection: projection.rows,
      analytics: analytics.rows,
      requestStates: requestStates.rows,
      capacity: capacity.rows,
      targetCohortKey: cohortKey,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
