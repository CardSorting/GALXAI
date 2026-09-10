/** Deployment verification. All test accounts, credits, and receipts roll back. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { readSignupCreditOffer } from '../src/lib/supabase/repositories/SignupCreditRepository';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
const db = await pool.connect();
try {
  await db.query('BEGIN');
  await db.query("SET LOCAL lock_timeout='3s'");
  if (process.argv.includes('--rehearse')) {
    await db.query(readFileSync('supabase/migrations/20260910071450_signup_credit_allowance.sql','utf8'));
  }
  assert.deepEqual(await readSignupCreditOffer(db),{enabled:true,amountUsd:5});
  const security=await db.query(`SELECT relrowsecurity,relforcerowsecurity FROM pg_class
    WHERE oid IN ('private.galx_signup_credit_policy'::regclass,'private.galx_signup_credit_grants'::regclass)`);
  assert.equal(security.rows.length,2);
  assert(security.rows.every(row=>row.relrowsecurity && row.relforcerowsecurity));
  for(const role of ['anon','authenticated','service_role']) {
    const {rows:[access]}=await db.query(`SELECT
      has_table_privilege($1,'private.galx_signup_credit_policy','SELECT,INSERT,UPDATE,DELETE') AS policy,
      has_table_privilege($1,'private.galx_signup_credit_grants','SELECT,INSERT,UPDATE,DELETE') AS receipts,
      has_function_privilege($1,'private.galx_award_signup_credit()','EXECUTE') AS award`,[role]);
    assert.deepEqual(access,{policy:false,receipts:false,award:false});
    const {rows:[schemas]}=await db.query("SELECT has_schema_privilege($1,'public','CREATE') p,has_schema_privilege($1,'extensions','CREATE') e",[role]);
    assert.deepEqual(schemas,{p:false,e:false});
  }
  const id=randomUUID(), duplicate=randomUUID(), email=`release-${randomUUID()}@example.invalid`;
  const create=async(userId:string,address:string,verified:boolean)=>db.query(`INSERT INTO auth.users
    (id,email,email_confirmed_at,is_anonymous,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,aud,role)
    VALUES($1,$2,$3,false,'{"provider":"email","providers":["email"]}','{}',now(),now(),'authenticated','authenticated')`,[userId,address,verified ? new Date() : null]);
  const wallet=async(userId:string)=>(await db.query('SELECT balance_usd,proof_of_deposit_verified FROM public.galx_wallets WHERE user_id=$1',[userId])).rows[0];
  await create(id,email,false);
  assert.equal(Number((await wallet(id)).balance_usd),0);
  await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[id]);
  await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[id]);
  assert.equal(Number((await wallet(id)).balance_usd),5);
  assert.equal((await wallet(id)).proof_of_deposit_verified,false);
  const ledger=await db.query(`SELECT t.amount_usd,t.balance_after_usd,t.ledger_hash,g.status
    FROM public.galx_wallet_transactions t JOIN private.galx_signup_credit_grants g ON g.transaction_id=t.id
    WHERE t.user_id=$1`,[id]);
  assert.equal(ledger.rows.length,1);
  assert.equal(Number(ledger.rows[0].amount_usd),5);
  assert.equal(Number(ledger.rows[0].balance_after_usd),5);
  assert.match(ledger.rows[0].ledger_hash,/^[a-f0-9]{64}$/);
  assert.equal(ledger.rows[0].status,'granted');
  const verified=await db.query('SELECT public.fn_verify_wallet_ledger_integrity($1) AS result',[id]);
  assert.equal(verified.rows[0].result.valid,true);
  await create(duplicate,email.toUpperCase(),true);
  assert.equal(Number((await wallet(duplicate)).balance_usd),0);
  console.log('Production storage canary passed: $5 policy, forced RLS, denied client privileges, verification gate, real ledger write, replay and duplicate-email protection. All fixtures rolled back.');
} finally {
  await db.query('ROLLBACK'); db.release(); await pool.end();
}
