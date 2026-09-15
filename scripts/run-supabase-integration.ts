/** Disposable PostgreSQL fixture. Never loads dotenv or borrows production credentials. */
import { execFile, spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Pool } from 'pg';
import { isolatedIntegrationEnvironment } from './lib/integration-test-environment';

const root = fileURLToPath(new URL('../', import.meta.url));
// Official pgvector 0.8.6 / PostgreSQL 17 bookworm, pinned to the inspected multi-platform digest.
const image = 'pgvector/pgvector@sha256:cf134a767f474095eeba57e0117be8e568e011a63f33fbf252f14c9b760f8e6f';
const execute = promisify(execFile);
const docker = (...args: string[]) => execute('docker', args, { timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const runId = randomUUID();
const container = `galx-integration-${runId}`;
const controller = new AbortController();
const cancel = () => controller.abort(new Error('Integration test cancelled'));
process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
let ownedContainer = false, pool: Pool | undefined;
const workspace = await mkdtemp(path.join(tmpdir(), 'galx-integration-'));
try {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 1 || !['--manual-shards', '--free-quota', '--billing', '--domains', '--workspace', '--fair', '--plans', '--preview', '--admin', '--admin-ui', '--images', '--image-library', '--image-assets', '--auth-sessions'].includes(args[0]))) throw new Error('Supported options: --free-quota, --billing, --domains, --workspace, --fair, --plans, --preview, --admin, --admin-ui, --images, --image-library, --image-assets');
  let url = process.env.GALX_INTEGRATION_DATABASE_URL;
  if (url) isolatedIntegrationEnvironment({ GALX_INTEGRATION_DATABASE_URL: url });
  else {
    const password = randomBytes(24).toString('hex');
    console.log('Starting disposable PostgreSQL 17 / pgvector fixture...');
    // Unique ownership label makes cleanup safe even if the create acknowledgement is lost.
    ownedContainer = true;
    await execute('docker', ['run', '--detach', '--rm', '--name', container,
      '--label', `galx.integration.run=${runId}`, '--publish', '127.0.0.1::5432',
      '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,noexec,size=536870912', '--memory', '768m',
      '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_DB=galx_integration_test', image],
    { env: { ...process.env, POSTGRES_PASSWORD: password }, timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
    const published = (await docker('port', container, '5432/tcp')).stdout.trim();
    if (!/^127\.0\.0\.1:\d+$/.test(published)) throw new Error('Fixture did not bind exclusively to loopback');
    url = `postgresql://postgres:${password}@${published}/galx_integration_test`;
    controller.signal.throwIfAborted();
    pool = new Pool({ connectionString: url, connectionTimeoutMillis: 1000, statement_timeout: 30000, max: 2 });
    let ready = false;
    for (let i = 0; i < 40; i++) {
      controller.signal.throwIfAborted();
      try { await pool.query('SELECT 1'); ready = true; break; } catch { await sleep(250); }
    }
    if (!ready) throw new Error('Disposable PostgreSQL did not become ready');
    await pool.query(await readFile(path.join(root, 'scripts/fixtures/integration-bootstrap.sql'), 'utf8'));
    const migrations = (await readdir(path.join(root, 'supabase/migrations'))).filter(f => /^\d+_.+\.sql$/.test(f)).sort();
    for (const filename of migrations) {
      controller.signal.throwIfAborted();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(await readFile(path.join(root, 'supabase/migrations', filename), 'utf8'));
        await client.query('COMMIT');
      } catch (error: any) {
        await client.query('ROLLBACK');
        throw new Error(`Fixture migration ${filename}: ${error.message}`);
      } finally { client.release(); }
    }
    console.log(`Applied ${migrations.length} migrations to the disposable fixture.`);
    await pool.end(); pool = undefined;
  }
  const env = isolatedIntegrationEnvironment({
    PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
    LANG: process.env.LANG, GALX_INTEGRATION_DATABASE_URL: url,
    TSX_TSCONFIG_PATH: path.join(root, 'tsconfig.json'),
  });
  if (args[0] === '--admin-ui') for (const key of ['GALX_BROWSER_MODULE', 'GALX_AXE_MODULE']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  controller.signal.throwIfAborted();
  const status = await new Promise<number>((resolve, reject) => {
    let spawnError: Error | undefined;
    const child = spawn(process.execPath, ['--import', import.meta.resolve('tsx'),
      '--import', path.join(root, 'scripts/lib/integration-no-network.ts'),
      path.join(root, args[0] === '--manual-shards' ? 'scripts/test-manual-desktop-shards-db.ts' : args[0] === '--free-quota' ? 'scripts/test-free-generation-quota-db.ts' : args[0] === '--auth-sessions' ? 'scripts/test-account-session-db.ts' : args[0] === '--image-assets' ? 'scripts/test-relay-image-generation.ts' : args[0] === '--image-library' ? 'scripts/test-image-library-scale-db.ts' : args[0] === '--images' ? 'scripts/test-image-requests-db.ts' : args[0] === '--admin-ui' ? 'scripts/verify-preview-admin-ui.ts' : args[0] === '--admin' ? 'scripts/test-preview-admin-db.ts' : args[0] === '--preview' ? 'scripts/test-developer-preview-db.ts' : args[0] === '--plans' ? 'scripts/test-sites-plans-db.ts' : args[0] === '--fair' ? 'scripts/test-sites-fair-db.ts' : args[0] === '--domains' ? 'scripts/test-sites-domains-db.ts' : args[0] === '--workspace' ? 'scripts/test-sites-workspace-db.ts' : 'scripts/test-supabase-integration.ts'),
      ...(['--manual-shards', '--free-quota','--domains','--workspace', '--fair', '--plans', '--preview', '--admin', '--admin-ui', '--images', '--image-library', '--image-assets', '--auth-sessions'].includes(args[0]) ? [] : args)],
    { cwd: workspace, env, stdio: 'inherit', timeout: args[0] === '--admin-ui' ? 300000 : 180000, signal: controller.signal });
    child.on('error', error => { spawnError = error; });
    child.on('close', code => spawnError ? reject(spawnError) : resolve(code ?? 1));
  });
  process.exitCode = status;
} catch (error: any) {
  console.error(error.message); process.exitCode = 1;
} finally {
  await pool?.end();
  if (ownedContainer) {
    try {
      const record = JSON.parse((await docker('inspect', container)).stdout)[0];
      if (record.Config.Labels['galx.integration.run'] !== runId) throw new Error('Fixture ownership mismatch');
      await docker('stop', '--time', '2', record.Id);
      console.log('Removed disposable PostgreSQL fixture.');
    } catch (error: any) {
      if (!String(error.stderr).includes('No such object')) { console.error('Fixture cleanup failed:', error.message); process.exitCode = 1; }
    }
  }
  await rm(workspace, { recursive: true, force: true });
  process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
}
