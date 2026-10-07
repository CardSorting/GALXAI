import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { REGISTRY_COLUMNS, REGISTRY_DELTA_SQL, ShardRegistrySync, readRegistryApiDelta, type RegistryRow, type RegistryDelta } from '../src/relay/shard-registry-sync';
import { readShardRegistry } from '../src/relay/shard-registry';
import { REGISTRY_MAX_RESPONSE_BYTES } from '../src/relay/registry-egress-guard';

const run = promisify(execFile);
let directory: string;
let pool: pg.Pool;
let started = false;
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'galx-registry-egress-'));
  await run('initdb', ['-D', path.join(directory, 'data'), '-A', 'trust', '-U', 'registry_test', '--no-locale']);
  await run('pg_ctl', ['-D', path.join(directory, 'data'), '-l', path.join(directory, 'postgres.log'), '-o', `-k ${directory} -c listen_addresses=''`, '-w', 'start']);
  started = true;
  pool = new pg.Pool({ host: directory, database: 'postgres', user: 'registry_test' });
  await pool.query(`CREATE TABLE public.galx_shard_accounts (
    id text PRIMARY KEY, user_id text DEFAULT 'owner', provider text DEFAULT 'openai',
    status text DEFAULT 'healthy', permission_retracted boolean DEFAULT false,
    managed_desktop_id text, desktop_enrolled_at bigint, relay_pool_id text,
    encrypted_ciphertext text, encrypted_iv text DEFAULT 'iv', encrypted_tag text DEFAULT 'tag',
    key_version text DEFAULT 'v1', credential_expires_at_ms bigint, cooldown_until_ms bigint,
    registry_revision bigint DEFAULT 1, created_at timestamptz DEFAULT now(),
    private_extra text DEFAULT 'never-in-projection'
  )`);
});
after(async () => {
  await pool?.end();
  if (started) await run('pg_ctl', ['-D', path.join(directory, 'data'), '-m', 'fast', '-w', 'stop']);
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});

test('real SQL transfers only changes, detects revocation/rotation/deletion/recreation, and bounds idle egress', async () => {
  await pool.query(`INSERT INTO public.galx_shard_accounts (id,encrypted_ciphertext)
    SELECT 'shard-' || n, repeat('encrypted-payload-', 200) FROM generate_series(1,56) AS n`);
  await pool.query(`INSERT INTO public.galx_shard_accounts (id,encrypted_ciphertext,relay_pool_id)
    VALUES ('pooled','never-in-application-registry','private-pool')`);
  const responses: RegistryDelta[] = [];
  const sync = new ShardRegistrySync(async known => {
    const result = await pool.query(REGISTRY_DELTA_SQL, [JSON.stringify(Object.fromEntries([...known].map(([id, entry]) => [id, entry.fingerprint]))), REGISTRY_MAX_RESPONSE_BYTES]);
    responses.push(result.rows[0]);
    return result.rows[0];
  });
  const first = await sync.read();
  assert.equal(first.length, 56);
  assert(first.every(row => Object.keys(row).sort().join() === [...REGISTRY_COLUMNS].sort().join()));
  const burst = await Promise.all(Array.from({ length: 50 }, () => sync.read()));
  assert.equal(responses.length, 2, 'concurrent callers share one authority check');
  assert.deepEqual(responses[1], { changed: [], removed: [], limit_exceeded: false });
  assert.deepEqual(burst[0], first);
  burst[0][0].encrypted_ciphertext = 'caller-mutation';
  assert.notEqual(burst[1][0].encrypted_ciphertext, 'caller-mutation');
  const fullBytes = Buffer.byteLength(JSON.stringify(first));
  const idleBytes = Buffer.byteLength(JSON.stringify(responses[1]));
  assert(idleBytes / fullBytes < 0.001);
  const denied = (await pool.query(REGISTRY_DELTA_SQL, ['{}', 1024])).rows[0];
  assert.deepEqual(denied, { changed: [], removed: [], limit_exceeded: true }, 'oversized data must stay in PostgreSQL');
  assert(Buffer.byteLength(JSON.stringify(denied)) < 100);
  await pool.query("UPDATE public.galx_shard_accounts SET permission_retracted=true,status='revoked' WHERE id='shard-1'");
  let rows = await sync.read();
  assert.equal(rows.find(row => row.id === 'shard-1')?.permission_retracted, true);
  assert.equal(responses.at(-1)!.changed.length, 1);
  await pool.query("UPDATE public.galx_shard_accounts SET encrypted_ciphertext='rotated',key_version='v2',cooldown_until_ms=123 WHERE id='shard-2'");
  rows = await sync.read();
  assert.equal(rows.find(row => row.id === 'shard-2')?.encrypted_ciphertext, 'rotated');
  assert.equal(responses.at(-1)!.changed.length, 1);
  await pool.query("DELETE FROM public.galx_shard_accounts WHERE id='shard-3'");
  rows = await sync.read();
  assert.equal(rows.length, 55);
  assert.deepEqual(responses.at(-1)!.removed, ['shard-3']);
  // A delete/recreate between polls may reuse a revision; projection hashing still detects it.
  await pool.query("DELETE FROM public.galx_shard_accounts WHERE id='shard-4'");
  await pool.query("INSERT INTO public.galx_shard_accounts(id,encrypted_ciphertext) VALUES ('shard-4','replacement'),('new-shard','new')");
  rows = await sync.read();
  assert.equal(rows.find(row => row.id === 'shard-4')?.encrypted_ciphertext, 'replacement');
  assert.equal(rows.length, 56);
  await pool.query('TRUNCATE public.galx_shard_accounts');
  assert.deepEqual(await sync.read(), []);
  assert.deepEqual(await sync.read(), []);
});

function row(id: string, revision = 1): RegistryRow {
  return { id, user_id: 'owner', provider: 'openai', status: 'healthy', permission_retracted: false,
    managed_desktop_id: null, desktop_enrolled_at: null,
    encrypted_ciphertext: 'ciphertext', encrypted_iv: 'iv', encrypted_tag: 'tag', key_version: 'v1',
    credential_expires_at_ms: null, cooldown_until_ms: null, registry_revision: revision, created_at: '2026-09-08T00:00:00Z' };
}

test('failed or malformed synchronization never serves cached credentials or partially commits', async () => {
  let result: RegistryDelta | Error = { changed: [{ fingerprint: 'first', row: row('a') }], removed: [] };
  const sync = new ShardRegistrySync(async () => { if (result instanceof Error) throw result; return result; });
  await sync.read();
  result = new Error('authority offline');
  await assert.rejects(sync.read(), /authority offline/);
  result = { changed: [{ fingerprint: 'bad', row: { id: 'broken' } }], removed: ['a'] };
  await assert.rejects(sync.read(), /Invalid registry change/);
  result = { changed: [], removed: [] };
  assert.equal((await sync.read())[0].id, 'a', 'invalid response did not partially remove a');
});

test('API fallback polls only metadata, handles small page caps and fetches only changed credentials', async () => {
  let source = [row('a'), row('b'), row('c')];
  const credentialReads: string[][] = [];
  const sync = new ShardRegistrySync(known => readRegistryApiDelta(known, async (columns, offset, ids) => {
    if (ids && offset === 0) credentialReads.push(ids);
    return source.filter(row => !ids || ids.includes(row.id)).slice(offset, offset + 1)
      .map(row => Object.fromEntries(columns.split(',').map(column => [column, row[column]])) as RegistryRow);
  }));
  assert.equal((await sync.read()).length, 3);
  assert.deepEqual(credentialReads, [['a', 'b', 'c']]);
  await sync.read();
  assert.equal(credentialReads.length, 1);
  source = [row('a'), { ...row('b', 2), permission_retracted: true }];
  const fresh = await sync.read();
  assert.equal(fresh.length, 2);
  assert.equal(fresh[1].permission_retracted, true);
  assert.deepEqual(credentialReads[1], ['b']);
});

test('API fallback rejects mutations between manifest and credential fetch', async () => {
  let reads = 0;
  const sync = new ShardRegistrySync(known => readRegistryApiDelta(known, async (columns, offset) => {
    if (offset) return [];
    reads++;
    const value = row('a', reads > 1 ? 2 : 1);
    return [Object.fromEntries(columns.split(',').map(column => [column, value[column]])) as RegistryRow];
  }));
  await assert.rejects(sync.read(), /Registry changed during API synchronization/);
});

test('API fallback stops repeated pages before downloading an unbounded registry', async () => {
  let calls = 0;
  await assert.rejects(readRegistryApiDelta(new Map(), async () => { calls++; return [row('repeated')]; }), /pagination/);
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(readRegistryApiDelta(new Map(), async () => [row(`page-${calls++}`)]), /pagination limit/);
  assert.equal(calls, 64);
});

test('SQL-to-API failover does not download unchanged credentials again', async () => {
  const cached = row('a');
  const known = new Map([['a', { fingerprint: 'sql-fingerprint', row: cached }]]);
  const delta = await readRegistryApiDelta(known, async (columns, offset, ids) => {
    assert.equal(ids, undefined, 'no credential read is needed');
    return offset ? [] : [Object.fromEntries(columns.split(',').map(column => [column, cached[column]])) as RegistryRow];
  });
  assert.deepEqual(delta, { changed: [], removed: [] });
});

test('runtime cache is isolated by project and administrator credential; invalid authority cannot reuse it', async t => {
  let now = Date.now(); t.mock.method(Date, 'now', () => now);
  const names = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  const saved = names.map(name => [name, process.env[name]] as const);
  const previousFetch = globalThis.fetch;
  let requests = 0;
  try {
    delete process.env.DATABASE_URL;
    process.env.SUPABASE_URL = 'https://project-a.invalid';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test_a';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    globalThis.fetch = async (input, init) => {
      requests++;
      const url = new URL(String(input));
      assert.equal(new Headers(init?.headers).get('apikey'), process.env.SUPABASE_SECRET_KEY);
      assert.equal(init?.redirect, 'error');
      const record = { ...row('same-id'), encrypted_ciphertext: url.hostname };
      const values = url.searchParams.get('offset') === '0'
        ? [Object.fromEntries(url.searchParams.get('select')!.split(',').map(column => [column, record[column as keyof typeof record]]))] : [];
      return Response.json(values, { headers: { 'content-range': values.length ? '0-0/1' : '*/1' } });
    };
    assert.equal((await readShardRegistry())[0].encrypted_ciphertext, 'project-a.invalid');
    now += 6000;
    process.env.SUPABASE_URL = 'https://project-b.invalid';
    assert.equal((await readShardRegistry())[0].encrypted_ciphertext, 'project-b.invalid');
    process.env.SUPABASE_SECRET_KEY = 'publishable-not-admin';
    const priorRequests = requests;
    await assert.rejects(readShardRegistry(), /backend admin credential/);
    assert.equal(requests, priorRequests, 'invalid authority rejected before HTTP');
    now += 6000;
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test_b';
    assert.equal((await readShardRegistry())[0].encrypted_ciphertext, 'project-b.invalid');
  } finally {
    globalThis.fetch = previousFetch;
    for (const [name, value] of saved) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});
