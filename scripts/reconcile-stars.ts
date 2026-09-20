import { Pool } from 'pg';
import { getPostgresSslConfig } from '../src/lib/db/postgres';
import { STAR_COHORT_KEY, STAR_REFRESH_COHORT_KEY, STAR_REFRESH_V2_COHORT_KEY, STAR_RETRY_COHORT_KEY } from '../src/lib/stars/star-cohort';

const refresh = process.argv.includes('--refresh');
const refreshV2 = process.argv.includes('--refresh-v2');
const retry = process.argv.includes('--retry');
if ([refresh, refreshV2, retry].filter(Boolean).length > 1) throw new Error('--refresh, --refresh-v2, and --retry are mutually exclusive');
const cohortKey = retry ? STAR_RETRY_COHORT_KEY : refreshV2 ? STAR_REFRESH_V2_COHORT_KEY : refresh ? STAR_REFRESH_COHORT_KEY : STAR_COHORT_KEY;
const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = process.env.SUPABASE_PROJECT_REF;
const urls = [
  ...(process.env.DATABASE_URL ? [process.env.DATABASE_URL] : []),
  ...(password && projectRef ? [
    `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`,
    `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
  ] : []),
];

let pool: Pool | undefined;
for (const connectionString of urls) {
  const candidate = new Pool({ connectionString, ssl: getPostgresSslConfig(), max: 2, connectionTimeoutMillis: 10_000, statement_timeout: 15_000, query_timeout: 15_000 });
  try {
    await candidate.query('SELECT 1');
    pool = candidate;
    break;
  } catch {
    await candidate.end().catch(() => undefined);
  }
}
if (!pool) throw new Error('All database connections failed.');

try {
  await pool.query('BEGIN');
  const result = await pool.query(`
    UPDATE private.galx_image_requests AS request
    SET state = 'failed',
        payload = jsonb_build_object('failureCode', 'generation_not_started'),
        updated_at = now()
    WHERE EXISTS (
      SELECT 1
      FROM private.galx_star_generation_attempts AS attempt
      JOIN private.galx_star_cohorts AS cohort ON cohort.cohort_id = attempt.cohort_id
      WHERE cohort.cohort_key = $1
        AND attempt.kind = 'content'
        AND attempt.state = 'failed'
        AND attempt.generation_id = request.id::text
    )
      AND request.state IN ('queued', 'generating')
    RETURNING request.id
  `, [cohortKey]);
  await pool.query('COMMIT');
  console.log(JSON.stringify({ cohortKey, reconciledRequests: result.rowCount || 0 }));
} catch (error) {
  await pool.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await pool.end();
}
