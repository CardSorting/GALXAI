import { Pool } from 'pg';
import { readKeyActivity } from '../src/lib/keys/activity';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 10000 });
try {
  const db = await pool.connect();
  try {
    await db.query('BEGIN READ ONLY');
    const result = await readKeyActivity(db, '__activity_schema_check_no_account__', new URLSearchParams());
    await db.query('ROLLBACK');
    console.log(`Activity storage query passed (${result.records.length} records, ${result.keys.length} keys for the nonexistent test account).`);
  } finally { db.release(); }
} catch (error) {
  console.error('Activity storage verification failed:', (error as { code?: string }).code || 'connection unavailable');
  process.exitCode = 1;
} finally { await pool.end(); }
