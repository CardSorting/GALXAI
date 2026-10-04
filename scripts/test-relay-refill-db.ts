import './lib/require-isolated-integration-env.js';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

// Final-chain, disposable PostgreSQL. No provider or shared database access.
const database = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 12 });
type SQL = pg.Pool | pg.PoolClient;
const t0 = 1_700_000_000_000, denominator = 3_000_000_000n;
let checks = 0;
const equal = (a: unknown, b: unknown, label: string) => { assert.deepEqual(a,b,label); checks++; };
const up = new URL('../supabase/migrations/20261003202702_relay_refill_integer_credit.sql', import.meta.url);
const down = new URL('../supabase/rollbacks/20261003202702_relay_refill_integer_credit.down.sql', import.meta.url);
const snapshot = async (id: string, sql: SQL = database) => (await sql.query(`SELECT
  remaining_tokens::text AS tokens, remaining_requests::text AS requests,
  token_refill_numerator::text AS token_fraction, request_refill_numerator::text AS request_fraction,
  last_refill_timestamp_ms::text AS at FROM public.galx_shard_accounts WHERE id=$1`, [id])).rows[0];
const acquire = async (id: string, now: number, tokens = 1, job: string = randomUUID(), sql: SQL = database) =>
  (await sql.query('SELECT private.relay_base_acquire($1,$2,$3,60000,$4,$5) AS result',
    [id,'refill-fixture',tokens,job,now])).rows[0].result;
if (process.argv[2] === '--restart-worker') {
  const input = JSON.parse(process.argv[3]);
  try { await acquire(input.id,input.time); console.log(JSON.stringify(await snapshot(input.id))); }
  finally { await database.end(); }
  process.exit(0);
}
const defaults = {tokens:'0',tokenCap:'100',rate:'40',requests:'0',requestCap:'40',
  tokenFraction:'0',requestFraction:'0',at:t0,status:'paused'};
type Options = typeof defaults;
async function account(options: Partial<Options> = {}, sql: SQL = database) {
  const o = {...defaults,...options};
  const id = 'codex_sh_'+createHash('sha256').update(randomUUID()).digest('hex').slice(0,24);
  await sql.query('SELECT private.enroll_desktop_shard($1,$2,NULL)',[randomUUID(),JSON.stringify({
    id,user_id:'system_admin',encrypted_ciphertext:'fixture',encrypted_iv:'fixture',encrypted_tag:'fixture',
    key_version:'v1',credential_expires_at_ms:Date.now()+3_600_000})]);
  await sql.query(`UPDATE public.galx_shard_accounts SET remaining_tokens=$2,max_tokens=$3,
    refill_rate_per_minute=$4,remaining_requests=$5,max_requests=$6,token_refill_remainder=$7,
    request_refill_remainder=$8,last_refill_timestamp_ms=$9,token_refill_numerator=NULL,
    request_refill_numerator=NULL,status=$10,max_concurrency_ceiling=32 WHERE id=$1`,
    [id,o.tokens,o.tokenCap,o.rate,o.requests,o.requestCap,o.tokenFraction,o.requestFraction,o.at,o.status]);
  return {id,o};
}
// Oracle uses the original state and whole interval, never prior SQL results.
const fraction = (v: string) => BigInt((v.split('.')[1]??'').padEnd(9,'0'))*3n;
function expected(o: Options, now: number) {
  const elapsed = o.at<=0 || now<o.at ? 0n : BigInt(now)-BigInt(o.at);
  const bucket = (balance: string, cap: string, rate: string, carry: string) => {
    const credit = fraction(carry)+elapsed*BigInt(rate)*50_000n;
    const total = BigInt(balance)+credit/denominator;
    return total>=BigInt(cap) ? [cap,'0'] : [String(total),String(credit%denominator)];
  };
  const [tokens,token_fraction]=bucket(o.tokens,o.tokenCap,o.rate,o.tokenFraction);
  const [requests,request_fraction]=bucket(o.requests,o.requestCap,o.requestCap,o.requestFraction);
  return {tokens,requests,token_fraction,request_fraction,at:String(Math.max(o.at,now))};
}
const restart = async (id: string,time: number) => JSON.parse((await promisify(execFile)(process.execPath,
  [...process.execArgv,fileURLToPath(import.meta.url),'--restart-worker',JSON.stringify({id,time})],
  {env:process.env,timeout:30000})).stdout.trim());
try {
  const contract=(await database.query(`SELECT pg_get_functiondef('private.relay_base_acquire(varchar,varchar,bigint,bigint,varchar,bigint)'::regprocedure) definition`)).rows[0].definition;
  const history=await readFile(new URL('../supabase/migrations/20260914231914_manual_desktop_shard_enrollment.sql',import.meta.url),'utf8');
  const start=history.indexOf('CREATE OR REPLACE FUNCTION public.fn_acquire_shard_lease(');
  const original=history.slice(start,history.indexOf('\n$$;',start)+4).replace('public.fn_acquire_shard_lease(','private.relay_base_acquire(');
  const body=(v:string)=>v.slice(v.indexOf('BEGIN\n'),v.lastIndexOf('END'));
  const oldBody=body(original),newBody=body(contract);
  equal(newBody.slice(0,newBody.indexOf('  -- Exact credit:')),oldBody.slice(0,oldBody.indexOf('  -- Continuous refill')),'pre-refill locking/identity/reclamation unchanged');
  equal(newBody.slice(newBody.indexOf('  -- Recovery is admitted')),oldBody.slice(oldBody.indexOf('  -- Recovery is admitted')),'post-refill health/permission/capacity/lease rules unchanged');
  // The historical defect remains reproducible in a rolled-back transaction.
  const legacy=await database.connect();
  try {
    await legacy.query('BEGIN'); await legacy.query(original);
    for(const shape of [
      {rate:'10000000',tokenCap:'10000000',requestCap:'10000',first:2,total:3,want:500},
      {rate:'50000',tokenCap:'500000',requestCap:'40',first:1,total:6,want:5},
    ]) {
      const {id}=await account({...shape,requests:shape.requestCap,status:'healthy'},legacy);
      equal((await acquire(id,t0+shape.first,shape.want,randomUUID(),legacy)).reason,'SHARD_TOKEN_QUOTA_EXHAUSTED','old partial interval');
      const stored=(await legacy.query(`SELECT remaining_tokens::text,token_refill_remainder::text,last_refill_timestamp_ms::text FROM public.galx_shard_accounts WHERE id=$1`,[id])).rows[0];
      await legacy.query('SAVEPOINT original_failure');
      await assert.rejects(acquire(id,t0+shape.total,shape.want,randomUUID(),legacy),
        (e:any)=>e.code==='23514' && e.constraint==='galx_shards_refill_remainders_valid'); checks++;
      await legacy.query('ROLLBACK TO SAVEPOINT original_failure');
      console.log(JSON.stringify({old_failure:shape,stored,expected_tokens:shape.want,actual:'23514, no new lease'}));
    }
  } finally {await legacy.query('ROLLBACK');legacy.release();}
  const cases: Array<[string,number,Partial<Options>]> = [
    ['zero elapsed',0,{}],['sub interval',1,{}],['just below',1499,{}],['exact boundary',1500,{}],
    ['just above',1501,{}],['multiple intervals',10500,{}],['long idle',86400000,{}],
    ['already full',1501,{tokens:'100',requests:'40'}],['nearly full',1501,{tokens:'99',requests:'39'}],
    ['complete exhaustion',0,{}],['zero rate',60000,{rate:'0'}],
    ['legacy fractions',0,{tokenFraction:'0.999999999',requestFraction:'0.333333333'}],
    ['legacy fraction plus refill',1,{tokenFraction:'0.999999999',requestFraction:'0.333333333'}],
    ['uninitialized timestamp',60000,{at:0}],
    ['huge idle and rate',1000000000000,{rate:'9223372036854775807',tokenCap:'9223372036854775807'}],
  ];
  for(const [label,elapsed,options] of cases) {
    const {id,o}=await account(options),now=o.at+elapsed;
    equal((await acquire(id,now)).reason,'SHARD_NOT_HEALTHY',label+' preserves pause');
    equal(await snapshot(id),expected(o,now),label+' exact state');
    const saved=await snapshot(id);
    for(let i=0;i<3;i++) await acquire(id,now);
    equal(await snapshot(id),saved,label+' repeated observation creates no credit');
  }
  for(const rate of ['1','50000','10000000']) {
    const many=await account({rate,tokenCap:'20000000'}),once=await account({rate,tokenCap:'20000000'});
    const count=(await database.query(`SELECT count(result)::integer AS n FROM
      (SELECT private.relay_base_acquire($1,'refill-fixture',1,60000,'step-'||i,$2::bigint+i*10) AS result
       FROM generate_series(1,6000) s(i) ORDER BY i) x`,[many.id,t0])).rows[0].n;
    equal(count,6000,'all repeated evaluations executed');
    await acquire(once.id,t0+60000);
    equal(await snapshot(many.id),expected(many.o,t0+60000),'frequent evaluations exact oracle '+rate);
    equal(await snapshot(many.id),await snapshot(once.id),'partition independent credit '+rate);
  }
  const backwards=await account({rate:'50000',tokenCap:'500000'});
  await acquire(backwards.id,t0+1);const beforeClockChange=await snapshot(backwards.id);
  await acquire(backwards.id,t0-1000);
  equal(await snapshot(backwards.id),beforeClockChange,'clock rollback cannot rewind anchor');
  await acquire(backwards.id,t0+6);
  equal(await snapshot(backwards.id),expected(backwards.o,t0+6),'clock catch-up counts once');
  for(const elapsed of [6,86400000]) {
    const partial=await account({rate:'50000',tokenCap:'500000'});
    await acquire(partial.id,t0+1);
    equal(await restart(partial.id,t0+elapsed),expected(partial.o,t0+elapsed),'fresh process reconstructs credit '+elapsed);
  }
  for(const shape of [
    {rate:'50000',tokenCap:'500000',first:1,total:6,want:5},
    {rate:'10000000',tokenCap:'10000000',first:2,total:3,want:500},
  ]) {
    const a=await account({...shape,requests:'40',status:'healthy'});
    equal((await acquire(a.id,t0+shape.first,shape.want)).reason,'SHARD_TOKEN_QUOTA_EXHAUSTED','partial denied');
    equal((await acquire(a.id,t0+shape.total,shape.want)).success,true,'former failing boundary now admits');
    equal((await snapshot(a.id)).tokens,String(shape.want),'correct boundary credit');
  }
  const race=await account({rate:'1000',tokenCap:'100',requests:'40',status:'healthy'});
  const jobs=Array.from({length:12},()=>randomUUID());
  const results=await Promise.all(jobs.map(job=>acquire(race.id,t0+60,1,job)));
  equal(results.filter(r=>r.success).length,1,'concurrent requests share one refilled unit');
  equal(results.filter(r=>!r.success).map(r=>r.reason),Array(11).fill('SHARD_TOKEN_QUOTA_EXHAUSTED'),'others denied');
  const winner=results.findIndex(r=>r.success),state=await snapshot(race.id);
  equal((await acquire(race.id,t0+60,1,jobs[winner])).lease_id,results[winner].lease_id,'duplicate retains lease');
  equal(await snapshot(race.id),state,'duplicate has no extra refill');
  equal((await database.query(`SELECT reserved_tokens::text,active_in_flight_count FROM public.galx_shard_accounts WHERE id=$1`,[race.id])).rows[0],
    {reserved_tokens:'1',active_in_flight_count:1},'concurrent counters bounded');
  const roles=(await database.query(`SELECT p.prosecdef,p.proconfig,
    has_function_privilege('anon',p.oid,'EXECUTE') AS anon,has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated,
    has_function_privilege('service_role',p.oid,'EXECUTE') AS service,has_function_privilege('galx_relay_control',p.oid,'EXECUTE') AS control
    FROM pg_proc p WHERE p.oid='private.relay_base_acquire(varchar,varchar,bigint,bigint,varchar,bigint)'::regprocedure`)).rows[0];
  equal(roles,{prosecdef:false,proconfig:['search_path=public, pg_temp'],anon:false,authenticated:false,service:false,control:false},'private function boundary retained');
  for(const role of ['anon','authenticated']) {
    const c=await database.connect();try{
      await c.query(`SET ROLE ${role}`);
      await assert.rejects(c.query('SELECT token_refill_numerator,request_refill_numerator FROM public.galx_shard_accounts')); checks++;
    }finally{await c.query('RESET ROLE');c.release();}
  }
  const retained=await account({rate:'50000',tokenCap:'500000',requests:'40',status:'healthy'});
  await acquire(retained.id,t0+1,100);const exact=await snapshot(retained.id);
  const c=await database.connect();try{
    await c.query('BEGIN');await c.query(await readFile(down,'utf8'));await c.query('COMMIT');
    equal((await acquire(retained.id,t0+6)).reason,'SHARD_NOT_AVAILABLE','rollback closes new admission');
    equal(await snapshot(retained.id),exact,'rollback preserves exact state');
    await c.query('BEGIN');await c.query(await readFile(up,'utf8'));await c.query('COMMIT');
    equal(await snapshot(retained.id),exact,'reapply retains exact state');
    equal((await acquire(retained.id,t0+6,5)).success,true,'reapply resumes exact credit');
  }finally{c.release();}
  console.log(`Refill correctness: ${checks} checks passed; original failures, boundaries/caps, 18000 partitioned evaluations, fresh processes, concurrency, privileges and retained rollback.`);
} finally {await database.end();}
