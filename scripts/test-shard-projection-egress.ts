import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { ShardProjectionReader, SHARD_PROJECTION_COLUMNS, SHARD_PROJECTION_DELTA_SQL, SHARD_API_DELTA_OPTIONS } from '../src/lib/supabase/repositories/ShardProjectionReader';
import { RegistryEgressGuard, RegistryEgressLimitError } from '../src/relay/registry-egress-guard';
import { ShardRegistrySync, readRegistryApiDelta, type RegistryRow } from '../src/relay/shard-registry-sync';
import { GalxCredentialSubstrate } from '../src/core/substrate/GalxCredentialSubstrate';
import type { GalxPersistence } from '../src/lib/storage/GalxPersistence';
import type { executePostgresQuery } from '../src/lib/db/postgres';

const run = promisify(execFile);
let directory: string;
let pool: pg.Pool;
let started = false;
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'galx-shard-projection-'));
  await run('initdb', ['-D', path.join(directory, 'data'), '-A', 'trust', '-U', 'projection_test', '--no-locale']);
  await run('pg_ctl', ['-D', path.join(directory, 'data'), '-l', path.join(directory, 'postgres.log'), '-o', `-k ${directory} -c listen_addresses=''`, '-w', 'start']);
  started = true;
  pool = new pg.Pool({ host: directory, database: 'postgres', user: 'projection_test' });
  const types: Record<string, string> = { id: 'text PRIMARY KEY', user_id: 'text', priority: 'integer',
    registry_revision: 'bigint', reserved_tokens: 'bigint', fencing_token: 'bigint',
    permission_retracted: 'boolean', privacy_capabilities: 'jsonb', created_at: 'timestamptz DEFAULT now()' };
  await pool.query(`CREATE TABLE public.galx_shard_accounts (${SHARD_PROJECTION_COLUMNS.map(column => `${column} ${types[column] ?? 'text'}`).join(',')})`);
});
after(async () => {
  await pool?.end();
  if (started) await run('pg_ctl', ['-D', path.join(directory, 'data'), '-m', 'fast', '-w', 'stop']);
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});

const config = () => ({ databaseUrl: 'local-fixture', supabaseUrl: 'https://fixture.invalid',
  supabaseAnonKey: '', supabaseServiceRoleKey: '', hasAdminCredential: false,
  hasDataApiCredential: false, isConfigured: true, poolSize: 1, requestTimeoutMs: 5000 });

test('constructor does no authority I/O; explicit first use is single-flight and retry is cooled down', async t => {
  let calls = 0, now = 10_000, fail = false;
  t.mock.method(Date, 'now', () => now);
  const persistence = { isShardAuthorityConfigured: () => true,
    getShardsAsync: async () => { calls++; if (fail) throw new Error('fixture unavailable'); return []; },
  } as unknown as GalxPersistence;
  const substrate = new GalxCredentialSubstrate(persistence);
  await Promise.resolve();
  assert.equal(calls, 0, 'construction must not perform a registry read');
  await Promise.all(Array.from({ length: 40 }, () => substrate.ready()));
  assert.equal(calls, 1);
  await substrate.ensureFreshFromAuthority();
  assert.equal(calls, 1, 'first dispatch must not double-load');
  fail = true;
  const unavailable = new GalxCredentialSubstrate(persistence);
  await assert.rejects(unavailable.ready(), /fixture unavailable/);
  const failedCalls = calls;
  await assert.rejects(unavailable.ready(), /temporarily unavailable/);
  assert.equal(calls, failedCalls);
  now += 5000; fail = false;
  await unavailable.ready();
  assert.equal(calls, failedCalls + 1, 'an initial outage must not poison the process forever');
});

test('credential maintenance explicitly awaits fresh authority and fails closed before reading a cold projection', async t => {
  const { galxRouter } = await import('../src/core/router/GalxModelRouter');
  const { GalxAuthEngine } = await import('../src/core/auth/GalxAuthEngine');
  const { GalxPersistence } = await import('../src/lib/storage/GalxPersistence');
  const engine = GalxAuthEngine.getInstance();
  let release!: () => void, reads = 0;
  t.mock.method(galxRouter.substrate, 'ensureFreshFromAuthority', () => new Promise<void>(done => { release = done; }));
  t.mock.method(galxRouter.substrate, 'getAccount', () => { reads++; return undefined; });
  t.mock.method(galxRouter.substrate, 'listAccounts', () => { reads++; return []; });
  t.mock.method(GalxPersistence.getInstance(), 'logAudit', () => {});
  const refresh = engine.refreshProviderShardTokens('not-present');
  assert.equal(reads, 0); release();
  assert.equal(await refresh, false); assert.equal(reads, 1);
  const rewrap = engine.reencryptVaultShards();
  assert.equal(reads, 1); release();
  assert.deepEqual(await rewrap, { total: 0, reencrypted: 0 }); assert.equal(reads, 2);
  t.mock.method(galxRouter.substrate, 'ensureFreshFromAuthority', async () => { throw new Error('authority unavailable'); });
  assert.equal(await engine.refreshProviderShardTokens('not-present'), false);
  await assert.rejects(engine.reencryptVaultShards(), /authority unavailable/);
  assert.equal(reads, 2, 'an authority failure must not be reported as an empty successful rewrap');
});

test('scoped real SQL coalesces reads, sends only deltas, preserves counters and omits unchanged envelopes', async () => {
  await pool.query(`INSERT INTO public.galx_shard_accounts(id,user_id,priority,registry_revision,reserved_tokens,fencing_token,encrypted_ciphertext,encrypted_iv,encrypted_tag)
    VALUES ('a','alice',20,1,4,1,repeat('cipher',1000),'iv','tag'),('b','bob',10,1,2,1,'b-secret','iv','tag')`);
  let calls = 0, now = 0, offline = false;
  const responses: Record<string, any>[] = [];
  const reader = new ShardProjectionReader({ config,
    guard: new RegistryEgressGuard({ now: () => now }),
    query: (async (sql, params) => {
      calls++; now += 10_000;
      assert.equal(sql, SHARD_PROJECTION_DELTA_SQL);
      if (offline) return null;
      const response = await pool.query(sql, params); responses.push(response.rows[0]); return response;
    }) as typeof executePostgresQuery,
  });
  const all = await reader.read();
  assert.equal(all.length, 2);
  assert.deepEqual(Object.keys(all[0]).sort(), [...SHARD_PROJECTION_COLUMNS].sort());
  const before = calls;
  const burst = await Promise.all(Array.from({ length: 40 }, () => reader.read()));
  assert.equal(calls, before + 1);
  assert.deepEqual(responses.at(-1), { changed: [], removed: [], limit_exceeded: false });
  burst[0][0].encrypted_ciphertext = 'caller mutation';
  assert.notEqual(burst[1][0].encrypted_ciphertext, 'caller mutation');
  const scoped = await reader.read('alice');
  assert.deepEqual(scoped.map(row => row.id), ['a']);
  assert.equal(responses.at(-1)!.changed.length, 1, 'owner cache is not populated from an unscoped read');
  await pool.query("UPDATE public.galx_shard_accounts SET reserved_tokens=999,fencing_token=7 WHERE id='a'");
  const updated = await reader.read('alice');
  assert.equal(updated[0].reserved_tokens, 999);
  assert.equal(updated[0].fencing_token, 7);
  assert.equal(updated[0].registry_revision, 1);
  assert.equal(updated[0].encrypted_ciphertext, 'cipher'.repeat(1000));
  assert(!Object.hasOwn(responses.at(-1)!.changed[0].row, 'encrypted_ciphertext'), 'counter updates must not retransmit encrypted payloads');
  await pool.query("UPDATE public.galx_shard_accounts SET encrypted_ciphertext='rotated',permission_retracted=true WHERE id='a'");
  const revoked = await reader.read('alice');
  assert.equal(revoked[0].permission_retracted, true);
  assert.equal(revoked[0].encrypted_ciphertext, 'rotated', 'SQL detects rotation even without a revision bump');
  await pool.query("UPDATE public.galx_shard_accounts SET user_id='bob' WHERE id='a'");
  assert.deepEqual(await reader.read('alice'), [], 'ownership transfer removes the old scope');
  assert.equal((await reader.read('bob')).length, 2);
  await pool.query("DELETE FROM public.galx_shard_accounts WHERE id='b'");
  assert.deepEqual((await reader.read('bob')).map(row => row.id), ['a']);
  offline = true;
  await assert.rejects(reader.read('bob'), /authority unavailable/);
  const beforeInvalid = calls;
  await assert.rejects(reader.read(''), /Invalid shard owner/);
  assert.equal(calls, beforeInvalid);
});

test('SQL caps oversized projections before transfer; authority changes cannot relabel cached rows', async () => {
  await pool.query("UPDATE public.galx_shard_accounts SET encrypted_ciphertext=repeat('huge',5000) WHERE id='a'");
  assert.deepEqual((await pool.query(SHARD_PROJECTION_DELTA_SQL, ['{}', 4096, null])).rows[0],
    { changed: [], removed: [], limit_exceeded: true });
  let authority = config(), calls = 0;
  const reader = new ShardProjectionReader({ config: () => authority,
    query: (async (sql, params) => { calls++; return pool.query(sql, params); }) as typeof executePostgresQuery,
    guard: new RegistryEgressGuard(),
  });
  await reader.read('bob');
  authority = { ...authority, databaseUrl: 'different-authority' };
  await assert.rejects(reader.read('bob'), /restart required/);
  assert.equal(calls, 1);
});

test('REST counter-only changes reuse envelopes, recheck snapshots and retain owner scope', async () => {
  let source: RegistryRow = Object.fromEntries(SHARD_PROJECTION_COLUMNS.map(column => [column, null])) as RegistryRow;
  source = { ...source, id: 'api-a', user_id: 'alice', registry_revision: 1, created_at: '2026-09-09',
    encrypted_ciphertext: 'cipher', encrypted_iv: 'iv', encrypted_tag: 'tag', reserved_tokens: 0 };
  let payloadReads = 0;
  const page = async (columns: string, offset: number, ids?: string[]) => {
    if (offset) return [];
    if (ids) payloadReads++;
    return [Object.fromEntries(columns.split(',').map(column => [column, source[column]])) as RegistryRow];
  };
  const sync = new ShardRegistrySync(known => readRegistryApiDelta(known, page, SHARD_API_DELTA_OPTIONS), SHARD_PROJECTION_COLUMNS);
  await sync.read();
  source = { ...source, reserved_tokens: 100, fencing_token: 2 };
  const fresh = (await sync.read())[0];
  assert.equal(fresh.reserved_tokens, 100); assert.equal(fresh.fencing_token, 2);
  assert.equal(fresh.encrypted_ciphertext, 'cipher'); assert.equal(payloadReads, 1);
  source = { ...source, registry_revision: 2, encrypted_ciphertext: 'new' };
  assert.equal((await sync.read())[0].encrypted_ciphertext, 'new'); assert.equal(payloadReads, 2);
  let mutate = false;
  const racing = new ShardRegistrySync(known => readRegistryApiDelta(known, async (...args) => {
    const result = await page(...args);
    if (!mutate) { mutate = true; source = { ...source, reserved_tokens: 900 }; }
    return result;
  }, SHARD_API_DELTA_OPTIONS), SHARD_PROJECTION_COLUMNS);
  await assert.rejects(racing.read(), /changed during API/);
});

test('REST uses bounded same-project authenticated reads and refuses oversized responses', async () => {
  let requests = 0, bodyCancelled = false;
  const reader = new ShardProjectionReader({ config: () => ({ ...config(), databaseUrl: undefined,
    hasAdminCredential: true, supabaseServiceRoleKey: 'sb_secret_fixture' }),
    guard: new RegistryEgressGuard(),
    fetch: async (input, init) => {
      requests++;
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://fixture.invalid');
      assert.equal(url.searchParams.get('user_id'), 'eq.alice');
      assert.equal(url.searchParams.get('limit'), '64');
      assert.equal(init?.redirect, 'error');
      assert.equal(new Headers(init?.headers).get('apikey'), 'sb_secret_fixture');
      return new Response(new ReadableStream({ cancel() { bodyCancelled = true; } }), { headers: { 'content-length': '99999999' } });
    },
  });
  await assert.rejects(reader.read('alice'), /budget exceeded/);
  assert.equal(requests, 1); assert.equal(bodyCancelled, true);
});

test('SQL failover cooldown preserves the budget for confirmed REST reads', async t => {
  let now = 100000; t.mock.method(Date, 'now', () => now);
  const source = { ...Object.fromEntries(SHARD_PROJECTION_COLUMNS.map(column => [column, null])),
    id: 'fallback', user_id: 'alice', priority: 1, registry_revision: 1, created_at: '2026-09-09',
    encrypted_ciphertext: 'cipher', encrypted_iv: 'iv', encrypted_tag: 'tag' } as RegistryRow;
  let sqlReads = 0, httpReads = 0;
  const reader = new ShardProjectionReader({ config: () => ({ ...config(),
    hasAdminCredential: true, supabaseServiceRoleKey: 'sb_secret_fixture' }),
    guard: new RegistryEgressGuard({ policy: { requestBurst: 12 } }),
    query: (async () => { sqlReads++; return null; }) as typeof executePostgresQuery,
    fetch: async input => {
      httpReads++;
      const url = new URL(String(input));
      const rows = url.searchParams.get('offset') === '0'
        ? [Object.fromEntries(url.searchParams.get('select')!.split(',').map(column => [column, source[column]]))] : [];
      return Response.json(rows, { headers: { 'content-range': rows.length ? '0-0/1' : '*/1' } });
    },
  });
  await assert.rejects(reader.read('alice'), RegistryEgressLimitError);
  assert.equal(httpReads,0,'failed SQL retains its reservation; REST waits for full room');
  now += 10000;
  assert.equal((await reader.read('alice'))[0].encrypted_ciphertext, 'cipher');
  assert.equal((await reader.read('alice'))[0].encrypted_ciphertext, 'cipher');
  assert.equal(sqlReads, 1); assert.equal(httpReads, 5);
});
