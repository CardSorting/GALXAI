import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { clearExpiredCredentials } from '../src/relay/shard-registry.js';

const run = promisify(execFile);
let directory: string;
let pool: pg.Pool;
let started = false;
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'galx-expired-'));
  await run('initdb', ['-D', path.join(directory, 'data'), '-A', 'trust', '-U', 'cleanup_test', '--no-locale']);
  await run('pg_ctl', ['-D', path.join(directory, 'data'), '-l', path.join(directory, 'postgres.log'), '-o', `-k ${directory} -c listen_addresses=''`, '-w', 'start']);
  started = true;
  pool = new pg.Pool({ host: directory, database: 'postgres', user: 'cleanup_test' });
  await pool.query(`CREATE TABLE public.galx_shard_accounts (
    id text PRIMARY KEY, user_id text NOT NULL, credential_expires_at_ms bigint,
    permission_retracted boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'healthy',
    active_in_flight_count integer DEFAULT 0, encrypted_ciphertext text DEFAULT 'preserved-ciphertext',
    updated_at_ms bigint, updated_at timestamptz
  )`);
});
after(async () => {
  await pool?.end();
  if (started) await run('pg_ctl', ['-D', path.join(directory, 'data'), '-m', 'fast', '-w', 'stop']);
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});

async function seed() {
  await pool.query('TRUNCATE public.galx_shard_accounts');
  const now = Date.now();
  await pool.query(`INSERT INTO public.galx_shard_accounts (id,user_id,credential_expires_at_ms,active_in_flight_count,permission_retracted,status) VALUES
    ('expired','owner-a',$1,0,false,'healthy'),
    ('fresh','owner-a',$2,0,false,'healthy'),
    ('unknown','owner-a',NULL,0,false,'healthy'),
    ('invalid','owner-a',0,0,false,'healthy'),
    ('busy','owner-a',$1,1,false,'healthy'),
    ('revoked','owner-a',$1,0,true,'revoked'),
    ('other-owner','owner-b',$1,0,false,'healthy'),
    ('local-busy','owner-a',$1,0,false,'healthy')`, [now - 60_000, now + 60_000]);
}

test('dry run does not change rows; cleanup revokes only expired eligible rows and is idempotent', async () => {
  await seed();
  const options = { userId: 'owner-a', excludeShardIds: ['local-busy'] };
  assert.deepEqual(await clearExpiredCredentials({ ...options, dryRun: true }, pool), { dryRun: true, matchedCount: 1, clearedCount: 0 });
  assert.equal((await pool.query("SELECT status FROM public.galx_shard_accounts WHERE id='expired'")).rows[0].status, 'healthy');
  assert.deepEqual(await clearExpiredCredentials(options, pool), { dryRun: false, matchedCount: 1, clearedCount: 1 });
  const { rows } = await pool.query('SELECT * FROM public.galx_shard_accounts ORDER BY id');
  assert.equal(rows.length, 8);
  for (const row of rows) {
    assert.equal(row.encrypted_ciphertext, 'preserved-ciphertext');
    assert.equal(row.permission_retracted, ['expired', 'revoked'].includes(row.id));
  }
  assert.equal((await clearExpiredCredentials(options, pool)).clearedCount, 0);
});

test('a concurrent token refresh prevents stale cleanup', async () => {
  await seed();
  const refresh = await pool.connect();
  try {
    await refresh.query('BEGIN');
    await refresh.query("UPDATE public.galx_shard_accounts SET credential_expires_at_ms=$1 WHERE id='expired'", [Date.now() + 3_600_000]);
    const cleanup = clearExpiredCredentials({ userId: 'owner-a', excludeShardIds: ['local-busy'] }, pool);
    await refresh.query('COMMIT');
    assert.equal((await cleanup).clearedCount, 0);
    assert.equal((await pool.query("SELECT status FROM public.galx_shard_accounts WHERE id='expired'")).rows[0].status, 'healthy');
  } finally { await refresh.query('ROLLBACK'); refresh.release(); }
});

test('invalid scopes are rejected and database failures propagate', async () => {
  await assert.rejects(clearExpiredCredentials({ userId: '' }, pool), /nonempty/);
  await assert.rejects(clearExpiredCredentials({ dryRun: 'false' as any }, pool), /boolean/);
  const failed = { query: async () => { throw new Error('database offline'); } } as any;
  await assert.rejects(clearExpiredCredentials({}, failed), /database offline/);
});
