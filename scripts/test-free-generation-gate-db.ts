import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { SitesWorkspaceRepository } from '../src/lib/sites/workspace-repository';
import { SitesFairStore, type PaidAccess, type FairPolicy } from '../src/lib/sites/fair-store';
import { FairUsageError, readFairLimits } from '../src/lib/sites/fair-policy';
import { consumeFreeGeneration, releaseFreeGeneration, FreeQuotaError } from '../src/lib/billing/free-generation-quota';
import { FreeGenerationGateError, freeDispatchOpen, settleFreeCapacity } from '../src/lib/billing/free-generation-gate';
import { changeFreePolicy } from '../src/lib/billing/free-generation-policy';

/** Historical ledger/policy compatibility only; never authorizes public free creation. */
export async function runFreeGateChecks(pool:Pool) {
  let checks=0;
  const cold=new Pool({connectionString:process.env.DATABASE_URL,max:8});
  const sites=new SitesWorkspaceRepository(pool);
  const reserve=async(owner:string,operation:string,quantity=1,database=pool)=>{
    const db=await database.connect();
    try {
      await db.query('BEGIN');
      await consumeFreeGeneration(db,owner,'image',operation,quantity);
      await db.query('COMMIT');return {id:operation};
    } catch(error) {await db.query('ROLLBACK');throw error;} finally {db.release();}
  };
  const users=Array.from({length:20},()=>randomUUID());
  for(const owner of users)await pool.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,now())',[owner,`${owner}@gate.invalid`]);
  const policy=async(kind='image')=>(await pool.query('SELECT * FROM private.galx_free_generation_policy WHERE kind=$1',[kind])).rows[0];
  const configure=async(kind:'site'|'image',limits:Record<string,unknown>={},apply=true)=>{
    const before=await policy(kind);
    return changeFreePolicy(pool,{kind,expectedRevision:Number(before.revision),enabled:true,validUntil:new Date(Date.now()+3600000).toISOString(),maxOutstanding:4,maxHourUnits:12,maxDayUnits:20,maxTotalUnits:100,...limits},apply);
  };
  try {
    await assert.rejects(reserve(users[0],randomUUID()),FreeGenerationGateError);
    assert.equal(Number((await pool.query('SELECT count(*) AS n FROM private.galx_free_generation_grants WHERE user_id=$1',[users[0]])).rows[0].n),0);checks++;
    const before=await policy();await configure('image',{},false);assert.equal((await policy()).revision,before.revision);checks++;
    await pool.query("DELETE FROM private.galx_free_generation_policy WHERE kind='image'");
    await assert.rejects(reserve(users[0],randomUUID()),FreeGenerationGateError);
    await pool.query("INSERT INTO private.galx_free_generation_policy(kind) VALUES('image')");checks++;
    await configure('image',{maxOutstanding:3});
    await assert.rejects(reserve(users[0],randomUUID(),4),FreeGenerationGateError);
    assert.equal(Number((await policy()).admitted_units),0);checks++;
    await configure('image');
    await assert.rejects(configure('image',{validUntil:new Date(Date.now()+172800000).toISOString()}));
    await assert.rejects(changeFreePolicy(pool,{kind:'image',expectedRevision:1,enabled:false,validUntil:null,maxOutstanding:0,maxHourUnits:0,maxDayUnits:0,maxTotalUnits:0},true));checks++;
    const keys=users.map(()=>randomUUID());
    const race=await Promise.allSettled(users.slice(0,12).map((owner,i)=>reserve(owner,keys[i],1,i%2?pool:cold)));
    const winners=race.flatMap((r,i)=>r.status==='fulfilled'?[{owner:users[i],record:r.value,key:keys[i]}]:[]);
    assert.equal(winners.length,4);assert.equal(Number((await policy()).admitted_units),4);
    assert.equal(Number((await pool.query("SELECT sum(quantity) AS n FROM private.galx_free_generation_usage WHERE kind='image' AND NOT capacity_settled")).rows[0].n),4);checks++;
    for(const r of race)if(r.status==='rejected')assert(r.reason instanceof FreeGenerationGateError);
    assert.equal((await reserve(winners[0].owner,winners[0].key)).id,winners[0].record.id);
    assert.equal(Number((await policy()).admitted_units),4);checks++;
    await pool.query("UPDATE private.galx_free_generation_usage SET created_at=now()-interval '2 days' WHERE kind='image'");
    await assert.rejects(reserve(users[15],randomUUID()),FreeGenerationGateError,'elapsed time cannot settle unknown work');checks++;
    await releaseFreeGeneration(pool,winners[1].owner,'image',winners[1].record.id);
    await assert.rejects(reserve(winners[1].owner,winners[1].record.id),FreeQuotaError);
    const resumed=await reserve(users[14],randomUUID());
    assert.equal(Number((await policy()).admitted_units),5,'release never replenishes the aggregate budget');checks++;
    await configure('image',{enabled:false});
    assert.equal(await freeDispatchOpen(pool,'image'),false);
    await assert.rejects(reserve(users[13],randomUUID()),FreeGenerationGateError);checks++;
    // Positive completion clears occupancy; elapsed time and generic failure do not.
    for(const winner of winners)await settleFreeCapacity(pool,winner.owner,'image',winner.record.id);
    await configure('image',{maxTotalUnits:6,maxDayUnits:6,maxHourUnits:6});
    await settleFreeCapacity(pool,users[14],'image',resumed.id);
    const last=await reserve(users[13],randomUUID());await releaseFreeGeneration(pool,users[13],'image',last.id);
    await assert.rejects(reserve(users[12],randomUUID()),FreeGenerationGateError);checks++;
    await configure('image',{maxTotalUnits:100,maxOutstanding:1,maxHourUnits:1,maxDayUnits:10});
    await assert.rejects(reserve(users[12],randomUUID()),FreeGenerationGateError,'rolling attempt limit includes released attempts');checks++;
    await pool.query("UPDATE private.galx_free_generation_usage SET created_at=now()-interval '2 hours' WHERE kind='image' AND created_at>now()-interval '1 hour'");
    await configure('image',{maxOutstanding:1,maxHourUnits:1,maxDayUnits:1});
    await assert.rejects(reserve(users[12],randomUUID()),FreeGenerationGateError,'daily ceiling survives an empty hourly window');checks++;
    await configure('image',{maxHourUnits:20,maxDayUnits:20});
    await pool.query("UPDATE private.galx_free_generation_policy SET valid_until=now()-interval '1 second' WHERE kind='image'");
    await assert.rejects(reserve(users[13],randomUUID()),FreeGenerationGateError);checks++;
    // Retained Site reservations still obey the original bounded fair-use/stop contract.
    const fixture=JSON.parse(readFileSync(new URL('../GALX_Fair_Usage_Test_Fixture.json',import.meta.url),'utf8'));
    const limits=readFairLimits({...fixture.policy,snapshot_ttl_seconds:60,admission_deadline_milliseconds:5000,dispatch_grant_expiry_milliseconds:5000});
    const p:FairPolicy={mode:'enforce',pool_id:'gate-fixture',revision:1,limits,paid_price_ids:['price_fixture']};
    await pool.query("UPDATE private.galx_sites_fair_policy SET mode='enforce',pool_id=$1,revision=1,limits=$2,paid_price_ids=$3",[p.pool_id,p.limits,p.paid_price_ids]);
    // One database timestamp keeps the interval exact and avoids host/DB clock skew.
    const observedAt=Number((await pool.query('SELECT floor(extract(epoch FROM clock_timestamp())*1000)::float8 AS ms')).rows[0].ms);
    await pool.query('INSERT INTO private.galx_sites_fair_pools(pool_id,revision,snapshot) VALUES($1,1,$2)',[p.pool_id,{pool_id:p.pool_id,revision:1,observed_at:observedAt,valid_until:observedAt+60000,readiness:'READY',signal_basis:'shared-local-admission',local_concurrency_limit:8}]);
    const store=new SitesFairStore(pool,undefined,()=>{}),second=new SitesFairStore(cold,undefined,()=>{});
    const authority=(owner:string,tier:'pro'|'free'):PaidAccess=>({accountId:owner,tier,validUntil:Date.now()+15000,policyRevision:1});
    // Fresh identities prevent earlier race winners from retaining a Site allocation.
    await configure('site',{maxOutstanding:10,maxHourUnits:20});
    const operations=await Promise.all(users.slice(16,20).map(async owner=>{
      const row=await sites.create(owner,randomUUID(),'Historical gate'),op=randomUUID();
      await sites.begin(owner,row.id,row.revision,op,'Historical fixture','build');
      await pool.query(`INSERT INTO private.galx_free_generation_grants(user_id,identity_hash)
        VALUES($1,encode(sha256(convert_to($2,'UTF8')),'hex'))`,[owner,`${owner}@gate.invalid`]);
      await pool.query(`INSERT INTO private.galx_free_generation_usage(user_id,kind,operation_id,quantity)
        VALUES($1,'site',$2,1)`,[owner,`${row.id}:${op}`]);
      return{owner,id:`${row.id}:${op}`,row,op};
    }));
    const admissions=await Promise.allSettled(operations.map((op,i)=>(i%2?store:second).admit(p,authority(op.owner,'free'),op.id,'a'.repeat(64),Date.now()+5000)));
    for(const result of admissions)if(result.status==='rejected'){
      assert(result.reason instanceof FairUsageError);assert.equal(result.reason.reason,'free_capacity');
    }
    assert.equal(admissions.filter(r=>r.status==='fulfilled').length,2);checks++;
    for(let i=0;i<6;i++)assert((await store.admit(p,authority(`paid-${i}`,'pro'),randomUUID(),'a'.repeat(64),Date.now()+5000)).dispatch);checks++;
    await assert.rejects(store.admit(p,{...authority('forged','pro'),tier:undefined} as any,randomUUID(),'a'.repeat(64),Date.now()+5000));checks++;
    await configure('site',{enabled:false});
    const admittedIndex=admissions.findIndex(r=>r.status==='fulfilled'),admitted=(admissions[admittedIndex] as PromiseFulfilledResult<any>).value;
    const op=operations[admittedIndex];assert.equal(await store.start(op.owner,op.id,admitted.row.grant_id),false);
    assert.equal((await store.lookup(op.owner,op.id))?.state,'not_started');checks++;
    const security=(await pool.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='private.galx_free_generation_policy'::regclass")).rows[0];assert(security.relrowsecurity&&security.relforcerowsecurity);
    for(const role of ['anon','authenticated','service_role'])for(const sql of ['SELECT *','DELETE','UPDATE','INSERT']) {
      const db=await pool.connect();try{
        await db.query('BEGIN');await db.query(`SET LOCAL ROLE ${role}`);
        const statement=sql==='SELECT *'?'SELECT * FROM private.galx_free_generation_policy':sql==='DELETE'?'DELETE FROM private.galx_free_generation_policy':sql==='UPDATE'?'UPDATE private.galx_free_generation_policy SET enabled=true':"INSERT INTO private.galx_free_generation_policy(kind) VALUES('site')";
        await assert.rejects(db.query(statement),(e:any)=>e.code==='42501');
      }finally{await db.query('ROLLBACK');db.release();}checks++;
    }
    const accumulated=Number((await policy()).admitted_units);
    await pool.query(readFileSync(new URL('../supabase/rollbacks/20260914035003_free_generation_admission_gate.down.sql',import.meta.url),'utf8'));
    assert.equal((await policy()).enabled,false);assert.equal(Number((await policy()).admitted_units),accumulated);checks++;
    console.log(JSON.stringify({historicalGateChecks:checks,failed:0}));return checks;
  }finally{
    await cold.end();
    // Cleanup only this fixture's identities; aggregate attempt counters deliberately remain.
    await pool.query('UPDATE private.galx_free_generation_usage SET capacity_settled=true WHERE user_id=ANY($1::uuid[])',[users]);
  }
}
