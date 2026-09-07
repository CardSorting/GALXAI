import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { ensureWallet } from '../src/lib/billing/wallet';
import { WalletRepository } from '../src/lib/supabase/repositories/WalletRepository';

// Isolated disposable database; never uses the application's DATABASE_URL.
const config = { host: '127.0.0.1', port: 55439, user: 'seats_test' };
const admin = new Pool({ ...config, database: 'postgres' });
const database = `wallet_lifecycle_${Date.now()}`;
await admin.query(`CREATE DATABASE ${database}`);
const pool = new Pool({ ...config, database, max: 20 });
const migration = readFileSync('supabase/migrations/20260907190322_wallet_account_lifecycle.sql', 'utf8');
const rollback = readFileSync('supabase/rollbacks/20260907190322_wallet_account_lifecycle.down.sql', 'utf8');
const db = await pool.connect();
try {
  for (const role of ['anon', 'authenticated', 'service_role', 'wallet_auth_test']) {
    if (!(await db.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [role])).rowCount) await db.query(`CREATE ROLE ${role}`);
  }
  await db.query('CREATE SCHEMA auth; CREATE SCHEMA private; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE TABLE public.galx_workspaces(id uuid PRIMARY KEY)');
  const core = readFileSync('supabase/migrations/20260822000001_galxai_schema_core.sql', 'utf8');
  const start = core.indexOf('CREATE TABLE IF NOT EXISTS galx_wallets (');
  await db.query(core.slice(start, core.indexOf('\n);', start) + 3));
  await db.query('ALTER TABLE public.galx_wallets ENABLE ROW LEVEL SECURITY; ALTER TABLE public.galx_wallets FORCE ROW LEVEL SECURITY');
  const legacy = randomUUID(), funded = randomUUID(), fresh = randomUUID();
  await db.query('INSERT INTO auth.users VALUES ($1),($2)', [legacy, funded]);
  await db.query('INSERT INTO public.galx_wallets(user_id,balance_usd) VALUES ($1,30000)', [funded]);
  await db.query(`BEGIN; ${migration} COMMIT;`);
  assert.equal((await ensureWallet(db, legacy)).balance_usd, '0.000000');
  assert.equal((await ensureWallet(db, funded)).balance_usd, '30000.000000');
  await db.query('GRANT USAGE ON SCHEMA auth TO wallet_auth_test; GRANT INSERT ON auth.users TO wallet_auth_test');
  await db.query('SET ROLE wallet_auth_test');
  await db.query('INSERT INTO auth.users VALUES ($1)', [fresh]);
  await db.query('RESET ROLE');
  const wallet = await ensureWallet(db, fresh);
  assert.match(wallet.id, /^[0-9a-f-]{36}$/);
  assert.equal(wallet.balance_usd, '0.000000');
  assert.equal(wallet.proof_of_deposit_verified, false);
  const aborted = randomUUID();
  await db.query('BEGIN');
  await db.query('INSERT INTO auth.users VALUES ($1)', [aborted]);
  await db.query('ROLLBACK');
  assert.equal((await db.query('SELECT 1 FROM public.galx_wallets WHERE user_id=$1', [aborted])).rowCount, 0);
  const concurrent = randomUUID();
  const wallets = await Promise.all(Array.from({ length: 40 }, () => ensureWallet(pool, concurrent)));
  assert.equal(new Set(wallets.map(w => w.id)).size, 1);
  await db.query('UPDATE public.galx_wallets SET balance_usd=123.456789 WHERE user_id=$1', [concurrent]);
  assert.equal((await ensureWallet(pool, concurrent)).balance_usd, '123.456789');
  const previousUrl = process.env.DATABASE_URL;
  const previousPool = globalThis.__galx_pg_pool;
  try {
    process.env.DATABASE_URL = 'postgresql://unused';
    globalThis.__galx_pg_pool = pool;
    const repo = WalletRepository.getInstance();
    const account = randomUUID();
    const records = await Promise.all(Array.from({ length: 10 }, () => repo.createOrGetWallet(account)));
    assert.equal(new Set(records.map(w => w.id)).size, 1);
    assert.equal(typeof records[0].createdAt, 'string');
    assert.equal((await db.query('SELECT id FROM public.galx_wallets WHERE user_id=$1', [account])).rows[0].id, records[0].id);
    delete process.env.DATABASE_URL;
    await assert.rejects(repo.createOrGetWallet(account), /Wallet storage unavailable/);
  } finally {
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    globalThis.__galx_pg_pool = previousPool;
  }
  for (const userId of ['', ' ', ' x', 'x'.repeat(256)]) await assert.rejects(ensureWallet(pool, userId), /Invalid wallet/);
  await assert.rejects(ensureWallet({ query: async () => { throw new Error('database offline'); } } as any, fresh), /database offline/);
  await db.query('SET ROLE authenticated');
  await assert.rejects(db.query('INSERT INTO public.galx_wallets(user_id) VALUES ($1)', [randomUUID()]), /permission denied/);
  await assert.rejects(db.query('SELECT private.galx_provision_user_wallet()'), /permission denied/);
  await db.query('RESET ROLE');
  await db.query(`BEGIN; ${migration} COMMIT;`);
  assert.equal((await ensureWallet(db, funded)).balance_usd, '30000.000000');
  await db.query(`BEGIN; ${rollback} COMMIT;`);
  assert.equal((await ensureWallet(db, funded)).balance_usd, '30000.000000');
  assert.equal((await db.query("SELECT 1 FROM pg_trigger WHERE tgname='galx_provision_user_wallet'")).rowCount, 0);
  console.log('Wallet lifecycle passed: signup under restricted role, backfill, rollback, 40 concurrent requests, balance preservation, access control, and storage failure.');
} finally {
  db.release(); await pool.end();
  await admin.query(`DROP DATABASE ${database}`); await admin.end();
}
