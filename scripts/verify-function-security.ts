import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

// All fixtures and optional migration rehearsal are rolled back, even on failure.
const rehearsal = process.argv.includes('--rehearse');
const migration = '20260907191200_function_search_path_and_vector_security';
const up = readFileSync(`supabase/migrations/${migration}.sql`, 'utf8');
const down = readFileSync(`supabase/rollbacks/${migration}.down.sql`, 'utf8');
const names = [...up.matchAll(/ALTER FUNCTION public\.(\w+)\(/g)].map(m => m[1]);
assert.equal(names.length, 14);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
const db = await pool.connect();
const functions = () => db.query(`SELECT oid, proname, proacl, prosecdef, proconfig FROM pg_proc
  WHERE pronamespace='public'::regnamespace AND proname=ANY($1::text[]) ORDER BY proname`, [names]);
try {
  await db.query('BEGIN');
  await db.query("SET LOCAL lock_timeout='5s'");
  const before = (await functions()).rows;
  const vectorOid = (await db.query("SELECT oid FROM pg_type WHERE typname='vector'")).rows[0].oid;
  if (rehearsal) { await db.query(up); await db.query(up); }
  const after = (await functions()).rows;
  assert.equal(after.length, 14);
  const authority = (rows: typeof after) => rows.map(({ proconfig, ...row }) => row);
  assert.deepEqual(authority(after), authority(before), 'Function identities, ACLs and execution authority must be unchanged');
  for (const row of after) assert(row.proconfig?.some((c: string) => c === (row.proname.includes('vector_search')
    ? 'search_path=pg_catalog, public, extensions, pg_temp' : 'search_path=pg_catalog, public, pg_temp')));
  assert.equal((await db.query("SELECT 'extensions.vector'::regtype::oid oid")).rows[0].oid, vectorOid);
  assert.equal((await db.query("SELECT extnamespace::regnamespace::text schema FROM pg_extension WHERE extname='vector'")).rows[0].schema, 'extensions');
  for (const role of ['anon', 'authenticated', 'service_role', 'authenticator']) {
    const { rows: [r] } = await db.query("SELECT has_schema_privilege($1,'public','CREATE') p, has_schema_privilege($1,'extensions','CREATE') e", [role]);
    assert.equal(r.p, false); assert.equal(r.e, false);
  }
  // Deliberately shadow the real relations and remove public/extensions from
  // the caller's path. Correct functions must still use application tables.
  for (const table of ['galx_wallets', 'galx_idempotency_keys', 'galx_distributed_locks', 'galx_embeddings_store']) {
    await db.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS) ON COMMIT DROP`);
  }
  await db.query('SET LOCAL search_path = pg_temp, pg_catalog');
  const key = `security-probe-${randomUUID()}`;
  const lock = (await db.query('SELECT public.fn_acquire_distributed_lock($1,$2,30000,NULL) result', [key, key])).rows[0].result;
  assert.equal(lock.acquired, true);
  assert.equal((await db.query('SELECT count(*)::int n FROM public.galx_distributed_locks WHERE lock_key=$1', [key])).rows[0].n, 1);
  assert.equal((await db.query('SELECT public.fn_release_distributed_lock($1,$2,$3) released', [key, key, lock.fencing_token])).rows[0].released, true);
  assert.equal((await db.query('SELECT public.fn_idempotency_begin($1,$2,$3,$4,60000) result', [key, key, '/security-test', key])).rows[0].result.status, 'STARTED');
  await db.query("SELECT public.fn_idempotency_commit($1,200,'{}','{\"ok\":true}')", [key]);
  assert.equal((await db.query('SELECT public.fn_idempotency_begin($1,$2,$3,$4,60000) result', [key, key, '/security-test', key])).rows[0].result.status, 'CACHED');
  assert.equal((await db.query('SELECT public.fn_format_rolling_duration(3600) result')).rows[0].result, '1 hour');
  assert.equal((await db.query('SELECT public.fn_validate_api_key_access_ultra($1) result', [key])).rows[0].result.reason, 'KEY_NOT_FOUND');
  assert.equal((await db.query("SELECT public.fn_batch_record_telemetry_cf('[]') n")).rows[0].n, 0);
  assert.equal((await db.query("SELECT public.fn_batch_commit_task_attempts_cf('[]') n")).rows[0].n, 0);
  assert.deepEqual((await db.query('SELECT public.fn_batch_draw_wallet_tokens_cf($1) result', [JSON.stringify([{ userId: key, costUsd: 1 }])])).rows[0].result[0].reason, 'WALLET_NOT_FOUND');
  const embedding = JSON.stringify([1, ...Array(1535).fill(0)]);
  const { rows: [doc] } = await db.query(`INSERT INTO public.galx_embeddings_store(collection_name,document_id,content,embedding)
    VALUES ($1,$1,'security vector search verification',$2::extensions.vector) RETURNING id`, [key, embedding]);
  const vector = await db.query('SELECT * FROM public.fn_vector_search($1::extensions.vector,NULL,$2,0.9,10)', [embedding, key]);
  assert.equal(vector.rows[0]?.id, doc.id); assert.equal(Number(vector.rows[0].similarity), 1);
  const hybrid = await db.query("SELECT * FROM public.fn_hybrid_vector_search('verification',$1::extensions.vector,NULL,$2,0.5,10)", [embedding, key]);
  assert.equal(hybrid.rows[0]?.id, doc.id);
  // Exercise the existing updated_at trigger as well.
  await db.query('UPDATE public.galx_embeddings_store SET content=content WHERE id=$1', [doc.id]);
  for (const table of ['galx_wallets', 'galx_idempotency_keys', 'galx_distributed_locks', 'galx_embeddings_store']) {
    assert.equal((await db.query(`SELECT count(*)::int n FROM pg_temp.${table}`)).rows[0].n, 0, `${table} shadow table was touched`);
  }
  if (rehearsal) {
    await db.query(down);
    const restored = (await functions()).rows;
    assert.deepEqual(authority(restored), authority(before));
    for (const row of restored) assert.equal(row.proconfig, null, 'Rollback restores the original unset search path');
    assert.equal((await db.query("SELECT 'public.vector'::regtype::oid oid")).rows[0].oid, vectorOid);
  }
  console.log(`Function security ${rehearsal ? 'rehearsal' : 'verification'} passed: 14 fixed paths, preserved function authority/type identity, trusted schemas, shadow-table resistance, lock/idempotency behavior, vector and hybrid search. All fixtures rolled back.`);
} finally {
  await db.query('ROLLBACK'); db.release(); await pool.end();
}
