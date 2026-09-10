/** Disposable local PostgreSQL only. No real signups, emails, or account balances. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { readBillingSummary, readBillingTransactions } from '../src/lib/billing/account';
import { readSignupCreditOffer } from '../src/lib/supabase/repositories/SignupCreditRepository';

const config = { host: '127.0.0.1', port: 55439, user: 'seats_test', connectionTimeoutMillis: 5000 };
const admin = new Pool({ ...config, database: 'postgres' });
const database = `signup_credit_${Date.now()}`;
await admin.query(`CREATE DATABASE ${database}`);
const pool = new Pool({ ...config, database, max: 20 });
const db = await pool.connect();
const migrationName = '20260910071450_signup_credit_allowance';
const up = readFileSync(`supabase/migrations/${migrationName}.sql`, 'utf8');
const down = readFileSync(`supabase/rollbacks/${migrationName}.down.sql`, 'utf8');
const migrate = async (sql: string) => { await db.query('BEGIN'); try { await db.query(sql); await db.query('COMMIT'); } catch (e) { await db.query('ROLLBACK'); throw e; } };
const createUser = async (email: string | null, confirmed = false, anonymous = false, id = randomUUID()) => {
  await pool.query('INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous) VALUES($1,$2,$3,$4)', [id,email,confirmed ? new Date() : null,anonymous]);
  return id;
};
const balance = async (userId: string) => Number((await pool.query('SELECT balance_usd FROM public.galx_wallets WHERE user_id=$1',[userId])).rows[0]?.balance_usd ?? 0);
const confirm = (id: string) => pool.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[id]);
let checks = 0;
try {
  for (const role of ['anon','authenticated','service_role','wallet_auth_test']) {
    if (!(await db.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rowCount) await db.query(`CREATE ROLE ${role}`);
  }
  await db.query(`CREATE SCHEMA auth; CREATE SCHEMA private; CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,is_anonymous boolean DEFAULT false,raw_user_meta_data jsonb DEFAULT '{}');
    CREATE TABLE public.galx_workspaces(id uuid PRIMARY KEY);
    CREATE TYPE public.galx_wallet_transaction_type AS ENUM ('deposit','auto_reload','usage_draw','match_grant','refund','adjustment');`);
  const core = readFileSync('supabase/migrations/20260822000001_galxai_schema_core.sql','utf8');
  for (const table of ['galx_wallets','galx_wallet_transactions']) {
    const start = core.indexOf(`CREATE TABLE IF NOT EXISTS ${table} (`);
    await db.query(core.slice(start,core.indexOf('\n);',start)+3));
    await db.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY; ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY`);
  }
  await db.query('ALTER TABLE public.galx_wallets ADD COLUMN payment_debt_usd numeric(14,6) NOT NULL DEFAULT 0; ALTER TABLE public.galx_wallet_transactions ADD COLUMN prev_ledger_hash varchar(128), ADD COLUMN ledger_hash varchar(128), ADD COLUMN sequence_number bigint DEFAULT 1');
  const ledger = readFileSync('supabase/migrations/20260822000028_galxai_postgresql_ledger_hash_width_expansion.sql','utf8');
  const functionStart = ledger.indexOf('CREATE OR REPLACE FUNCTION fn_record_tamper_proof_transaction(');
  await db.query(ledger.slice(functionStart,ledger.indexOf('\n$$;',functionStart)+4));
  const verifierStart = ledger.indexOf('CREATE OR REPLACE FUNCTION fn_verify_wallet_ledger_integrity(');
  await db.query(ledger.slice(verifierStart,ledger.indexOf('\n$$;',verifierStart)+4));
  const debit = readFileSync('supabase/migrations/20260822000026_galxai_postgresql_security_definer_core_procedures.sql','utf8');
  const debitStart = debit.indexOf('CREATE OR REPLACE FUNCTION fn_draw_wallet_tokens(');
  await db.query(debit.slice(debitStart,debit.indexOf('\n$$;',debitStart)+4));
  await db.query('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC,anon,authenticated');
  await migrate(readFileSync('supabase/migrations/20260907190322_wallet_account_lifecycle.sql','utf8'));
  const legacy = await createUser('legacy@example.test',true);
  await db.query('UPDATE public.galx_wallets SET balance_usd=123 WHERE user_id=$1',[legacy]);
  await migrate(up);
  assert.deepEqual(await readSignupCreditOffer(db),{enabled:true,amountUsd:5}); checks++;
  await confirm(legacy);
  assert.equal(await balance(legacy),123);
  assert.equal((await db.query('SELECT 1 FROM private.galx_signup_credit_grants WHERE user_id=$1',[legacy])).rowCount,0); checks++;

  const pending = await createUser('pending@example.test');
  assert.equal(await balance(pending),0);
  // Untrusted metadata never proves verification or selects the award.
  await db.query(`UPDATE auth.users SET raw_user_meta_data='{"email_verified":true,"signupCredit":999999,"role":"admin"}' WHERE id=$1`,[pending]);
  assert.equal(await balance(pending),0); checks++;
  await Promise.all(Array.from({length:30},()=>confirm(pending)));
  assert.equal(await balance(pending),5);
  assert.equal((await db.query('SELECT count(*) FROM public.galx_wallet_transactions WHERE user_id=$1',[pending])).rows[0].count,'1'); checks++;
  const summary = await readBillingSummary(db,pending);
  assert.equal(summary.balanceUsd,5); assert.equal(summary.proofOfDepositVerified,false); assert.equal(summary.depositedTotalUsd,0);
  const history = await readBillingTransactions(db,pending,new URLSearchParams({type:'grant',userId:legacy}));
  assert.equal(history.transactions.length,1); assert.equal(history.transactions[0].description,'Welcome credit');
  assert.equal(history.transactions[0].amountUsd,5);
  assert(!/identity_hash|signup_credit|ledger_hash|private/.test(JSON.stringify(history))); checks++;
  const receipt = (await db.query('SELECT * FROM public.galx_wallet_transactions WHERE user_id=$1',[pending])).rows[0];
  assert.match(receipt.ledger_hash,/^[a-f0-9]{64}$/); assert.equal(receipt.metadata.category,'signup_credit'); checks++;
  assert.equal((await db.query('SELECT public.fn_verify_wallet_ledger_integrity($1) AS result',[pending])).rows[0].result.valid,true);
  const oauth = await createUser('oauth@example.test',true);
  assert.equal(await balance(oauth),5); checks++;
  await db.query('UPDATE auth.users SET email=$2,email_confirmed_at=now() WHERE id=$1',[oauth,'changed@example.test']);
  assert.equal(await balance(oauth),5); checks++;

  const anon = await createUser('anon@example.test',true,true);
  const phone = await createUser(null,true);
  await db.query('UPDATE auth.users SET is_anonymous=false WHERE id=$1',[anon]);
  assert.equal(await balance(anon),0); assert.equal(await balance(phone),0); checks++;
  await db.query('DELETE FROM auth.users WHERE id=$1',[pending]);
  const recreated = await createUser(' PENDING@EXAMPLE.TEST ',true);
  assert.equal(await balance(recreated),0); checks++;
  const duplicates = await Promise.all(Array.from({length:12},()=>createUser('concurrent@example.test',true)));
  assert.equal((await Promise.all(duplicates.map(balance))).reduce((a,b)=>a+b,0),5); checks++;

  const promised = await createUser('promised@example.test');
  await db.query('UPDATE private.galx_signup_credit_policy SET amount_usd=7.50,updated_at=now()');
  assert.deepEqual(await readSignupCreditOffer(db),{enabled:true,amountUsd:7.5});
  await confirm(promised); assert.equal(await balance(promised),5);
  const changed = await createUser('new-offer@example.test',true);
  assert.equal(await balance(changed),7.5); checks++;
  await db.query('UPDATE private.galx_signup_credit_policy SET enabled=false');
  assert.deepEqual(await readSignupCreditOffer(db),{enabled:false,amountUsd:null});
  const paused = await createUser('paused@example.test');
  await db.query('UPDATE private.galx_signup_credit_policy SET enabled=true');
  await confirm(paused); assert.equal(await balance(paused),0); checks++;

  // A failed ledger write must roll back confirmation, wallet and receipt together.
  const retry = await createUser('retry@example.test');
  await db.query(`CREATE FUNCTION public.fail_credit_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced ledger failure'; END $$;
    CREATE TRIGGER fail_credit_test BEFORE INSERT ON public.galx_wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.fail_credit_test()`);
  await assert.rejects(confirm(retry),/forced ledger failure/);
  assert.equal(await balance(retry),0);
  assert.equal((await db.query('SELECT email_confirmed_at FROM auth.users WHERE id=$1',[retry])).rows[0].email_confirmed_at,null);
  assert.equal((await db.query('SELECT status FROM private.galx_signup_credit_grants WHERE user_id=$1',[retry])).rows[0].status,'pending');
  const failedSignup = randomUUID();
  await assert.rejects(createUser('failed@example.test',true,false,failedSignup),/forced ledger failure/);
  assert.equal((await db.query('SELECT 1 FROM auth.users WHERE id=$1',[failedSignup])).rowCount,0);
  assert.equal((await db.query('SELECT 1 FROM public.galx_wallets WHERE user_id=$1',[failedSignup])).rowCount,0);
  await db.query('DROP TRIGGER fail_credit_test ON public.galx_wallet_transactions');
  await confirm(retry); assert.equal(await balance(retry),7.5); checks++;

  await db.query('GRANT USAGE ON SCHEMA auth TO wallet_auth_test; GRANT INSERT,UPDATE ON auth.users TO wallet_auth_test');
  await db.query('SET ROLE wallet_auth_test');
  const restricted = randomUUID();
  await db.query("INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,'restricted@example.test',now())",[restricted]);
  await db.query('RESET ROLE');
  assert.equal(await balance(restricted),7.5); checks++;
  for (const role of ['anon','authenticated','service_role']) {
    await db.query(`SET ROLE ${role}`);
    for (const sql of ['SELECT * FROM private.galx_signup_credit_grants','UPDATE private.galx_signup_credit_policy SET amount_usd=1000','SELECT private.galx_award_signup_credit()']) {
      await assert.rejects(db.query(sql),/permission denied/);
    }
    await db.query('RESET ROLE');
  } checks++;
  await assert.rejects(db.query('UPDATE private.galx_signup_credit_grants SET amount_usd=100 WHERE user_id=$1',[oauth]),/immutable/);
  await assert.rejects(db.query('DELETE FROM private.galx_signup_credit_grants WHERE user_id=$1',[oauth]),/immutable/);
  for (const invalid of [0,-5,1001,1.001,'NaN','Infinity']) await assert.rejects(db.query('UPDATE private.galx_signup_credit_policy SET amount_usd=$1',[invalid])); checks++;
  await migrate(up); assert.equal(await balance(oauth),5);
  assert.equal((await readSignupCreditOffer(db)).amountUsd,7.5);
  const spent = (await db.query("SELECT public.fn_draw_wallet_tokens($1,0.25,'Image generation') AS result",[restricted])).rows[0].result;
  assert.equal(spent.success,true); assert.equal(await balance(restricted),7.25);
  await confirm(restricted); assert.equal(await balance(restricted),7.25); checks++;
  await migrate(down);
  const rolledBack = await createUser('rollback@example.test',true);
  assert.equal(await balance(rolledBack),0); assert.equal(await balance(changed),7.5);
  await migrate(up); await confirm(rolledBack);
  assert.equal(await balance(rolledBack),0); assert.equal(await balance(oauth),5); checks++;
  const rls = await db.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid IN ('private.galx_signup_credit_policy'::regclass,'private.galx_signup_credit_grants'::regclass)");
  assert(rls.rows.every(row=>row.relrowsecurity && row.relforcerowsecurity)); checks++;
  console.log(`Signup credit database: ${checks} scenario groups passed, including 30 concurrent confirmations and 12 concurrent email claims.`);
} finally {
  db.release(); await pool.end();
  await admin.query(`DROP DATABASE ${database}`); await admin.end();
}
