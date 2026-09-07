import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 10000 });
try {
  const db = await pool.connect();
  try {
    await db.query('BEGIN READ ONLY');
    const result = await db.query(`SELECT table_name, count(*)::int AS columns FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY($1::text[]) GROUP BY table_name ORDER BY table_name`,
      [['galx_organizations', 'galx_organization_members', 'galx_team_invitations', 'galx_governance_audit_events']]);
    await db.query('ROLLBACK');
    console.log(JSON.stringify(result.rows));
    if (result.rows.length !== 4) process.exitCode = 1;
  } finally { db.release(); }
} catch (error) {
  console.error('Team storage verification failed:', (error as { code?: string }).code || 'connection unavailable');
  process.exitCode = 1;
} finally { await pool.end(); }
