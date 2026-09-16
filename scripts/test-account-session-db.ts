import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { SessionRepository } from '../src/lib/supabase/repositories/SessionRepository';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
globalThis.__galx_pg_pool = pool;
const owner = randomUUID(), other = randomUUID(), session = randomUUID(), second = randomUUID();
const migration = '20260916161120_isolate_account_session_lookup';
let checks = 0;
const active = async (role = 'authenticated', claims: Record<string, unknown> = { sub: owner, session_id: session, role: 'authenticated' }) => {
  const db = await pool.connect();
  try {
    await db.query('BEGIN'); await db.query(`SET LOCAL ROLE ${role}`);
    await db.query("SELECT set_config('request.jwt.claims',$1,true)", [JSON.stringify(claims)]);
    return (await db.query('SELECT public.fn_account_session_active() AS active')).rows[0].active;
  } finally { await db.query('ROLLBACK'); db.release(); }
};
try {
  const up = readFileSync(new URL(`../supabase/migrations/${migration}.sql`, import.meta.url), 'utf8');
  // Exercise the final migration chain before replaying any older migration:
  // replaying the original liveness migration here hid later schema revocations.
  await pool.query('INSERT INTO auth.users(id) VALUES ($1),($2)', [owner, other]);
  await pool.query('INSERT INTO auth.sessions(id,user_id) VALUES ($1,$2),($3,$2)', [session, owner, second]);
  assert.equal(await active(), true); checks++;
  const beforeMove = (await pool.query("SELECT oid,prosrc,proowner FROM pg_proc WHERE oid='galx_account_auth.galx_account_session_active()'::regprocedure")).rows[0];
  const migrate = async (sql: string) => {
    const db = await pool.connect();
    try { await db.query('BEGIN'); await db.query(sql); await db.query('COMMIT'); }
    catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  };
  await migrate(up); await migrate(up); assert.equal(await active(), true); checks++;
  for (const role of ['authenticated', 'anon']) {
    assert.equal((await pool.query("SELECT has_schema_privilege($1,'private','USAGE') AS allowed", [role])).rows[0].allowed, false); checks++;
  }
  for (const role of ['authenticated', 'anon', 'service_role']) {
    assert.equal((await pool.query("SELECT has_schema_privilege($1,'galx_account_auth','CREATE') AS allowed", [role])).rows[0].allowed, false); checks++;
    assert.equal((await pool.query("SELECT has_table_privilege($1,'auth.sessions','SELECT') AS allowed", [role])).rows[0].allowed, false); checks++;
  }
  for (const role of ['anon', 'service_role']) {
    assert.equal((await pool.query("SELECT has_schema_privilege($1,'galx_account_auth','USAGE') AS allowed", [role])).rows[0].allowed, false); checks++;
    assert.equal((await pool.query("SELECT has_function_privilege($1,'galx_account_auth.galx_account_session_active()','EXECUTE') AS allowed", [role])).rows[0].allowed, false); checks++;
  }
  // Later operator hardening may revoke private schema access again.
  await pool.query('REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated');
  assert.equal(await active(), true); checks++;
  for (const claims of [{}, { sub: owner, role: 'authenticated' }, { sub: other, session_id: session, role: 'authenticated' }, { sub: owner, session_id: 'invalid', role: 'authenticated' }, { sub: owner, session_id: session, role: 'service_role' }, { sub: owner, session_id: session, role: 'authenticated', is_anonymous: true }]) {
    assert.equal(await active('authenticated', claims), false); checks++;
  }
  for (const role of ['anon', 'service_role']) { await assert.rejects(active(role), (error: any) => error.code === '42501'); checks++; }
  const db = await pool.connect();
  try {
    await db.query('BEGIN'); await db.query('SET LOCAL ROLE authenticated');
    await assert.rejects(db.query('SELECT * FROM auth.sessions'), (e: any) => e.code === '42501'); checks++;
  } finally { await db.query('ROLLBACK'); db.release(); }
  await pool.query("UPDATE auth.sessions SET not_after=now()-interval '1 second' WHERE id=$1", [session]);
  assert.equal(await active(), false); checks++;
  await pool.query('UPDATE auth.sessions SET not_after=NULL WHERE id=$1', [session]);
  assert.equal(await active(), true); checks++;
  // Models Auth local sign-out: same claims, separate connection, no cached grant.
  await pool.query('DELETE FROM auth.sessions WHERE id=$1', [session]);
  assert.equal(await active(), false); checks++;
  assert.equal(await active('authenticated', { sub: owner, session_id: second, role: 'authenticated' }), true); checks++;
  const functions = (await pool.query("SELECT n.nspname,p.proname,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname IN ('galx_account_session_active','fn_account_session_active')")).rows;
  assert.equal(functions.length, 2); assert(functions.every(r => r.proconfig.includes('search_path=""'))); checks++;
  assert.equal(functions.find(r => r.nspname === 'public').prosecdef, false); checks++;
  assert.equal(functions.find(r => r.nspname === 'galx_account_auth').prosecdef, true); checks++;
  await migrate(readFileSync(new URL(`../supabase/rollbacks/${migration}.down.sql`, import.meta.url), 'utf8'));
  assert.equal((await pool.query('SELECT count(*)::int n FROM auth.sessions WHERE id=$1', [second])).rows[0].n, 1); checks++;
  await assert.rejects(active(), (error: any) => error.code === '42501'); checks++;
  await migrate(up); assert.equal(await active('authenticated', { sub: owner, session_id: second, role: 'authenticated' }), true); checks++;
  assert.deepEqual((await pool.query("SELECT oid,prosrc,proowner FROM pg_proc WHERE oid='galx_account_auth.galx_account_session_active()'::regprocedure")).rows[0], beforeMove); checks++;
  const native = new SessionRepository(), cold = new SessionRepository();
  const now = Date.now(), id = `sess_${randomUUID()}`, family = randomUUID();
  const record = { id, userId: owner, provider: 'openai' as const, tokenHash: 'a'.repeat(64), scopes: ['images:*'], sessionFamilyId: family, isRevoked: false, issuedAtMs: now, expiresAtMs: now + 60000, lastActiveAtMs: now, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() };
  await native.createSession(record);
  assert.deepEqual((await cold.findSessionById(id))?.scopes, ['images:*']); checks++;
  assert.equal((await cold.findSessionByTokenHash(record.tokenHash))?.sessionFamilyId, family); checks++;
  assert.equal((await cold.rotateSessionTokenAtomic(record.tokenHash, 'b'.repeat(64), now + 30000)).success, true); checks++;
  assert.equal((await native.findSessionById(id))?.tokenHash, 'b'.repeat(64)); checks++;
  await native.createSession({ ...record, id: `sess_${randomUUID()}`, tokenHash: 'c'.repeat(64) });
  assert.equal(await native.revokeOtherSessions(owner, id), 1); checks++;
  assert.equal(await native.revokeOtherSessions(owner, id), 0); checks++;
  assert.equal((await cold.getUserSessions(owner)).length, 1); checks++;
  assert.equal(await native.revokeSessionFamily(family), 1); checks++;
  await assert.rejects(native.createSession(record));
  assert.equal((await cold.findSessionById(id))?.isRevoked, true); checks++;
  assert.equal(await native.revokeAllUserSessions(owner), 0); checks++;
  console.log(JSON.stringify({ checks, failed: 0, scope: 'disposable PostgreSQL; owner binding, revocation, permissions, timeout and rollback' }));
} finally { await pool.end(); }
