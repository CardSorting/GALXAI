import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DesktopCredentialError, parseDesktopCredential } from '../src/relay/desktop-credentials.js';
import { createDesktopCredentialRefresh } from '../src/relay/desktop-credential-refresh.js';
import { CapabilityDiscoveryError } from '../src/relay/capability-discovery.js';
import { encryptRegistryShard, decryptRegistryShard, replaceRegistryCredential } from '../src/relay/shard-registry.js';

const now = 1800000000000;
const token = (account = 'account-1', iat = now / 1000 - 10, exp = now / 1000 + 3600) => 'eyJhbGciOiJub25lIn0.' + Buffer.from(JSON.stringify({ iat, exp, 'https://api.openai.com/auth': { chatgpt_account_id: account } })).toString('base64url') + '.PRIVATE_SIGNATURE';
const file = (access = token(), refresh = 'PRIVATE_REFRESH') => ({ source: 'codex' as const, modifiedAt: now, data: { tokens: { account_id: 'account-1', access_token: access, refresh_token: refresh }, secret: 'PRIVATE_UNRELATED' } });
const errorCode = (expected: string) => (error: unknown) => error instanceof DesktopCredentialError && error.code === expected;

test('saved login parsing supports Codex and manual setup while excluding unrelated content', () => {
  const candidate = parseDesktopCredential([file()], now);
  assert.equal(candidate.accountId, 'account-1'); assert.equal(candidate.refreshToken, 'PRIVATE_REFRESH');
  assert.equal(candidate.expiresAtMs, now + 3600000); assert(!JSON.stringify(candidate).includes('PRIVATE_UNRELATED'));
  const manual = parseDesktopCredential([{ source: 'manual', modifiedAt: now, data: { accessToken: token(), accountId: 'account-1', refreshToken: 'PRIVATE_REFRESH' } }], now);
  assert.equal(manual.fingerprint, candidate.fingerprint);
  assert.equal(candidate.fingerprint.length, 64);
});

test('missing, partial, expired, mismatched and unsupported logins fail before use', () => {
  assert.throws(() => parseDesktopCredential([], now), errorCode('credential_missing'));
  for (const data of [null, {}, { OPENAI_API_KEY: 'sk-private' }, { tokens: { access_token: 'partial' } }]) assert.throws(() => parseDesktopCredential([{ ...file(), data }], now));
  assert.throws(() => parseDesktopCredential([file(token('wrong-account'))], now), errorCode('credential_account_mismatch'));
  assert.throws(() => parseDesktopCredential([file(token('account-1', now / 1000 - 10, now / 1000 + 20))], now), errorCode('credential_expired'));
  assert.throws(() => parseDesktopCredential([file(token('account-1', now / 1000 + 120))], now), errorCode('credential_invalid'));
  assert.throws(() => parseDesktopCredential([file(token(), 'a'.repeat(32769))], now), errorCode('credential_invalid'));
  assert.throws(() => parseDesktopCredential([file(), { source: 'manual', modifiedAt: now + 1, data: null }], now), errorCode('credential_invalid'));
});

function refreshFixture() {
  const row = { id: 'shard-1', user_id: 'owner-1', provider: 'openai', permission_retracted: false, status: 'healthy' };
  let previous: any = { accessToken: token('account-1', now / 1000 - 100), accountId: 'account-1', refreshToken: 'OLD_REFRESH', apiKey: 'OLD_API_KEY' };
  let writes = 0, checks = 0, saved: any;
  const deps = { read: async () => [row], decrypt: () => previous,
    encrypt: (_row: any, secret: any) => { saved = secret; return { encrypted_ciphertext: 'cipher', encrypted_iv: 'iv', encrypted_tag: 'tag', key_version: 'v1' }; },
    replace: async () => { writes++; return true; }, validate: async () => { checks++; } };
  return { row, deps, setPrevious: (value: any) => { previous = value; }, stats: () => ({ writes, checks, saved }) };
}

test('verified refresh preserves identity and replaces only the encrypted login contract', async () => {
  const f = refreshFixture(), candidate = parseDesktopCredential([file()], now), refresh = createDesktopCredentialRefresh(f.deps);
  assert.deepEqual(await refresh('shard-1', candidate, () => true), { outcome: 'updated' });
  assert.equal(f.stats().writes, 1); assert.equal(f.stats().checks, 1);
  assert.deepEqual(f.stats().saved, { accountId: 'account-1', accessToken: candidate.accessToken, refreshToken: 'PRIVATE_REFRESH', expiresAtMs: candidate.expiresAtMs });
  assert.equal(f.row.user_id, 'owner-1'); assert.equal(f.row.status, 'healthy');
});

test('identity, permission, stale login, provider validation and compare-and-swap block unsafe refreshes', async () => {
  const candidate = parseDesktopCredential([file()], now);
  for (const scenario of ['owner', 'revoked', 'retracted', 'older', 'rejected', 'outage', 'changed', 'cas'] as const) {
    const f = refreshFixture(); let code = 'credential_not_allowed';
    if (scenario === 'owner') { f.setPrevious({ accountId: 'other', accessToken: token() }); code = 'credential_account_mismatch'; }
    if (scenario === 'revoked') f.row.status = 'revoked';
    if (scenario === 'retracted') f.row.permission_retracted = true;
    if (scenario === 'older') { f.setPrevious({ accountId: 'account-1', accessToken: token('account-1', now / 1000) }); code = 'credential_older'; }
    if (scenario === 'rejected') { f.deps.validate = async () => { throw new CapabilityDiscoveryError('invalid_credential', 401); }; code = 'credential_rejected'; }
    if (scenario === 'outage') { f.deps.validate = async () => { throw Error('PRIVATE_PROVIDER_EXCEPTION'); }; code = 'credential_check_unavailable'; }
    if (scenario === 'cas') f.deps.replace = async () => false;
    if (['changed', 'cas'].includes(scenario)) code = 'credential_conflict';
    await assert.rejects(createDesktopCredentialRefresh(f.deps)('shard-1', candidate, () => scenario !== 'changed'), errorCode(code));
    assert.equal(f.stats().writes, 0, scenario);
  }
});

test('current login is a no-op and a rotated refresh token is saved without retaining an old token family', async () => {
  const f = refreshFixture(), candidate = parseDesktopCredential([file()], now);
  f.setPrevious({ accountId: candidate.accountId, accessToken: candidate.accessToken, refreshToken: candidate.refreshToken });
  assert.deepEqual(await createDesktopCredentialRefresh(f.deps)('shard-1', candidate, () => true), { outcome: 'current' });
  assert.equal(f.stats().writes, 0); assert.equal(f.stats().checks, 0);
  const next = { ...candidate, refreshToken: 'ROTATED_REFRESH' };
  await createDesktopCredentialRefresh(f.deps)('shard-1', next, () => true); assert.equal(f.stats().saved.refreshToken, 'ROTATED_REFRESH');
  const noRefresh = { ...candidate, accessToken: token('account-1', now / 1000), refreshToken: undefined };
  await createDesktopCredentialRefresh(f.deps)('shard-1', noRefresh, () => true); assert.equal(f.stats().saved.refreshToken, undefined);
});

test('authority rechecks never restore a previously applied token or refresh-token family', async () => {
  const f = refreshFixture(), candidate = parseDesktopCredential([file()], now), refresh = createDesktopCredentialRefresh(f.deps);
  for (const previous of [
    { accountId: candidate.accountId, accessToken: token('account-1', now / 1000), refreshToken: 'NEW_FAMILY' },
    { accountId: candidate.accountId, accessToken: candidate.accessToken, refreshToken: 'NEW_FAMILY' },
  ]) {
    f.setPrevious(previous);
    await assert.rejects(refresh('shard-1', candidate, () => true, true), errorCode('credential_superseded'));
  }
  assert.equal(f.stats().writes, 0); assert.equal(f.stats().checks, 0);
  f.setPrevious({ accountId: candidate.accountId, accessToken: candidate.accessToken, refreshToken: candidate.refreshToken });
  assert.deepEqual(await refresh('shard-1', candidate, () => true, true), { outcome: 'current' });
});

test('a changed login source after provider validation blocks the final credential write', async () => {
  const f = refreshFixture(), candidate = parseDesktopCredential([file()], now);
  await assert.rejects(createDesktopCredentialRefresh(f.deps)('shard-1', candidate, async () => false), errorCode('credential_conflict'));
  assert.equal(f.stats().checks, 1); assert.equal(f.stats().writes, 0);
});

test('credential encryption uses the existing tenant envelope and the update touches no quota or traffic columns', async t => {
  const oldSeed = process.env.GALX_VAULT_KEY_V1, oldVersion = process.env.GALX_VAULT_ACTIVE_KEY_VERSION;
  process.env.GALX_VAULT_KEY_V1 = 'fixture-vault-key'; process.env.GALX_VAULT_ACTIVE_KEY_VERSION = 'v1';
  t.after(() => { if (oldSeed === undefined) delete process.env.GALX_VAULT_KEY_V1; else process.env.GALX_VAULT_KEY_V1 = oldSeed; if (oldVersion === undefined) delete process.env.GALX_VAULT_ACTIVE_KEY_VERSION; else process.env.GALX_VAULT_ACTIVE_KEY_VERSION = oldVersion; });
  const row = { id: 'shard-1', user_id: 'owner-1', provider: 'openai', encrypted_iv: 'old-iv', encrypted_tag: 'old-tag', key_version: 'v1' };
  const secret = { accessToken: 'PRIVATE_ACCESS', refreshToken: 'PRIVATE_REFRESH', accountId: 'account-1' }, encrypted = encryptRegistryShard(row, secret);
  assert(!JSON.stringify(encrypted).includes('PRIVATE_')); assert.deepEqual(decryptRegistryShard({ ...row, ...encrypted }), secret);
  assert.equal(decryptRegistryShard({ ...row, ...encrypted, user_id: 'other-owner' }), null);
  let sql = '', params: any[] = [];
  const db: any = { query: async (statement: string, values: any[]) => { sql = statement; params = values; return { rows: [{ id: row.id }] }; } };
  assert(await replaceRegistryCredential(row, encrypted, now, db));
  assert(!sql.split('WHERE')[0].match(/status\s*=|permission_retracted\s*=|remaining_tokens\s*=|fencing_token\s*=/));
  assert(sql.includes('encrypted_tag = $10')); assert(sql.includes('permission_retracted = false'));
  assert.deepEqual(params.slice(5), ['shard-1', 'owner-1', 'openai', 'old-iv', 'old-tag', 'v1']);
  assert(!JSON.stringify(params).includes('PRIVATE_'));
});

test('admin API fallback retains the same compare-and-swap after an uncertain SQL write', async t => {
  const names = ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; for (const name of names) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]; } });
  process.env.SUPABASE_URL = 'https://fixture.supabase.test'; process.env.SUPABASE_SECRET_KEY = 'PRIVATE_ADMIN_KEY';
  const row = { id: 'shard-1', user_id: 'owner-1', provider: 'openai', encrypted_iv: 'old-iv', encrypted_tag: 'old-tag', key_version: null };
  const encrypted = { encrypted_ciphertext: 'cipher', encrypted_iv: 'iv', encrypted_tag: 'tag', key_version: 'v1' };
  let calls = 0;
  globalThis.fetch = (async (input, init) => {
    calls++; const url = new URL(String(input)); assert.equal(url.hostname, 'fixture.supabase.test');
    assert.equal(url.searchParams.get('encrypted_tag'), 'eq.old-tag'); assert.equal(url.searchParams.get('key_version'), 'is.null');
    assert.equal(url.searchParams.get('permission_retracted'), 'eq.false'); assert.equal(url.searchParams.get('user_id'), 'eq.owner-1');
    assert.equal(url.searchParams.get('select'), 'id'); assert.equal(init?.redirect, 'error');
    assert.deepEqual(Object.keys(JSON.parse(init!.body as string)).sort(), ['credential_expires_at_ms','encrypted_ciphertext','encrypted_iv','encrypted_tag','key_version','updated_at']);
    return Response.json([]); // The SQL write may already have changed the envelope.
  }) as typeof fetch;
  const database: any = { query: async () => { throw Error('PRIVATE_DATABASE_FAILURE'); } };
  assert.equal(await replaceRegistryCredential(row, encrypted, now, database), false); assert.equal(calls, 1);
});
