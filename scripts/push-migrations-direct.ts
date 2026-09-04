import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.resolve(ROOT_DIR, 'supabase/migrations');

const PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;

if (!process.env.DATABASE_URL && (!PASSWORD || !PROJECT_REF)) {
  throw new Error(
    'Database credentials are not configured. Set DATABASE_URL, or both SUPABASE_DB_PASSWORD and SUPABASE_PROJECT_REF.'
  );
}

// Candidate connection strings for Supabase Oregon (us-west-2)
const CANDIDATE_URLS: string[] = process.env.DATABASE_URL
  ? [process.env.DATABASE_URL]
  : [
      // Session Pooler (port 5432)
      `postgresql://postgres.${PROJECT_REF!}:${PASSWORD!}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`,
      // Transaction Pooler (port 6543)
      `postgresql://postgres.${PROJECT_REF!}:${PASSWORD!}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`,
      // Direct (if reachable)
      `postgresql://postgres:${PASSWORD!}@db.${PROJECT_REF!}.supabase.co:5432/postgres`,
      // Pooler us-west-1
      `postgresql://postgres.${PROJECT_REF!}:${PASSWORD!}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
    ];

async function connectToDatabase(): Promise<Client> {
  for (const connStr of CANDIDATE_URLS) {
    const masked = connStr.replace(/:[^:@]+@/, ':***@');
    try {
      console.log(`[Connecting] Attempting ${masked}...`);
      const client = new Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });
      await client.connect();
      console.log(`[Connected] Successfully connected via ${masked}`);
      return client;
    } catch (err: any) {
      console.warn(`[Warning] Connection failed for ${masked}: ${err.message}`);
    }
  }
  throw new Error('All connection candidate URLs failed.');
}

async function run() {
  const client = await connectToDatabase();

  try {
    // 1. Ensure supabase_migrations schema and table exist
    await client.query(`CREATE SCHEMA IF NOT EXISTS supabase_migrations;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        statements TEXT[],
        name VARCHAR(255)
      );
    `);

    // 2. Fetch applied migrations
    const { rows: appliedRows } = await client.query<{ version: string }>(
      `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version ASC;`
    );
    const appliedVersions = new Set(appliedRows.map((r) => r.version));
    console.log(`[Status] Already applied migrations:`, Array.from(appliedVersions));

    // 3. Read local migration files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`[Migrations] Found ${files.length} total local migration files.`);

    const force = process.argv.includes('--force');
    const verIndex = process.argv.indexOf('--version');
    const targetVersion = verIndex !== -1 ? process.argv[verIndex + 1] : null;

    for (const file of files) {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) continue;

      const version = match[1];
      const name = match[2];

      if (targetVersion && version !== targetVersion) {
        continue;
      }

      if (appliedVersions.has(version) && !force && !targetVersion) {
        console.log(`[Skip] Migration already recorded: ${file} (v${version})`);
        continue;
      }

      console.log(`\n==================================================`);
      console.log(`[Applying] Migration: ${file} (v${version})`);
      console.log(`==================================================`);

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      // Execute in transaction
      await client.query('BEGIN;');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO supabase_migrations.schema_migrations (version, name, statements) 
           VALUES ($1, $2, $3)
           ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name, statements = EXCLUDED.statements;`,
          [version, name, [sql]]
        );
        await client.query('COMMIT;');
        console.log(`[Success] Applied and recorded: ${file}`);
      } catch (err: any) {
        await client.query('ROLLBACK;');
        console.error(`[Error] Failed applying ${file}:`, err);
        throw err;
      }
    }

    console.log(`\n==================================================`);
    console.log(`✨ ALL MIGRATIONS PUSHED TO SUPABASE SUCCESSFULLY!`);
    console.log(`==================================================`);

    // Query tables in public schema to verify
    const { rows: tableRows } = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
    );
    console.log(`\nVerified Public Tables (${tableRows.length} total):`);
    tableRows.forEach((t) => console.log(`  - ${t.table_name}`));

  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
