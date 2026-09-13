import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { SessionRepository } from '../src/lib/supabase/repositories/SessionRepository';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
globalThis.__galx_pg_pool = pool;
const owner = randomUUID(), other = randomUUID(), session = randomUUID(), second = randomUUID();
const migration = '20260913201023_account_session_liveness';
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
  await pool.query(up); await pool.query(up); checks++;
  await pool.query('INSERT INTO auth.users(id) VALUES ($1),($2)', [owner, other]);
  await pool.query('INSERT INTO auth.sessions(id,user_id) VALUES ($1,$2),($3,$2)', [session, owner, second]);
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
  await pool.query(readFileSync(new URL(`../supabase/rollbacks/${migration}.down.sql`, import.meta.url), 'utf8'));
  assert.equal((await pool.query('SELECT count(*)::int n FROM auth.sessions WHERE id=$1', [second])).rows[0].n, 1); checks++;
  await pool.query(up); assert.equal(await active('authenticated', { sub: owner, session_id: second, role: 'authenticated' }), true); checks++;
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
