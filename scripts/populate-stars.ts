import { Pool } from 'pg';
import { getPostgresSslConfig } from '../src/lib/db/postgres';
const mode = process.argv.includes('--execute') ? 'execute' : 'plan';
const allowRecovery = process.argv.includes('--resume');
const refresh = process.argv.includes('--refresh');
const refreshV2 = process.argv.includes('--refresh-v2');
const retry = process.argv.includes('--retry');
const qualification = process.argv.includes('--qualification');

if ([refresh, refreshV2, retry, qualification].filter(Boolean).length > 1) throw new Error('--refresh, --refresh-v2, --retry, and --qualification are mutually exclusive');

const populationMode = qualification ? 'qualification' : retry ? 'retry' : refreshV2 ? 'refresh-v2' : refresh ? 'refresh' : 'initial';

function candidateDatabaseUrls(): string[] {
  if (process.env.DATABASE_URL) return [process.env.DATABASE_URL];
  const password = process.env.SUPABASE_DB_PASSWORD;
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!password || !projectRef) return [];
  return [
    `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`,
    `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
  ];
}

async function connectPopulationPool(): Promise<Pool> {
  const failures: string[] = [];
  for (const connectionString of candidateDatabaseUrls()) {
    const pool = new Pool({
      connectionString,
      ssl: getPostgresSslConfig(),
      max: 3,
      connectionTimeoutMillis: 10000,
      statement_timeout: 15000,
      query_timeout: 15000,
      keepAlive: true,
    });
    try {
      await pool.query('SELECT 1');
      return pool;
    } catch (error) {
      const typed = error as { code?: unknown; name?: unknown };
      failures.push(`${String(typed?.code || 'unknown')}/${String(typed?.name || 'Error')}`);
      await pool.end().catch(() => undefined);
    }
  }
  throw new Error(`Unable to connect to the population database (${failures.join(', ') || 'no configured candidates'})`);
}

async function main(): Promise<void> {
  if (mode === 'plan') {
    const { formatStarPlanForHuman } = await import('../src/lib/stars/StarPopulationController');
    console.log(formatStarPlanForHuman(populationMode));
    return;
  }

  if (allowRecovery && (refresh || refreshV2 || retry || qualification)) {
    throw new Error('--resume cannot be combined with --refresh, --refresh-v2, --retry, or --qualification');
  }

  const pool = await connectPopulationPool();
  try {
    const { executeStarPopulation } = await import('../src/lib/stars/StarPopulationController');
    const report = await executeStarPopulation(pool, {
      allowRecovery,
      mode: populationMode,
    });
    console.log(JSON.stringify(report, null, 2));
    if (report.stoppedReason) process.exitCode = 2;
  } finally {
    await pool.end();
  }
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ error: error instanceof Error ? error.message : 'Star population failed' }, null, 2));
    process.exitCode = 1;
  });
