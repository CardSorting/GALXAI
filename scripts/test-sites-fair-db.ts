/** Synthetic acceptance fixture; isolatedIntegrationEnvironment forbids production/network credentials. */
import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Pool } from 'pg';
import { SitesFairStore,type FairPolicy } from '../src/lib/sites/fair-store';
import { FairUsageError,readFairLimits } from '../src/lib/sites/fair-policy';
import { createIncludedGenerator,recoverIncludedGeneration } from '../src/lib/sites/included-generation';
import { RelayDispatchError } from '../src/core/router/adapters/RelayChatTransport';
const fixture=JSON.parse(readFileSync(new URL('../GALX_Fair_Usage_Test_Fixture.json',import.meta.url),'utf8'));
const pool=new Pool({connectionString:process.env.GALX_INTEGRATION_DATABASE_URL,max:16,connectionTimeoutMillis:1000});
let now=1_000_000;const events:Record<string,unknown>[]=[];
const store=new SitesFairStore(pool,()=>now,event=>events.push(event)),other=new SitesFairStore(pool,()=>now,event=>events.push(event));
let policy:FairPolicy={mode:'enforce',pool_id:fixture.initial_snapshot.pool_id,revision:1,limits:readFairLimits(fixture.policy),paid_price_ids:['price_fixture']};
const digest=createHash('sha256').update('synthetic').digest('hex');
const access=(accountId:string)=>({accountId,policyRevision:policy.revision,validUntil:now+15000});
const admit=(account:string,invocation=randomUUID(),authority=store)=>authority.admit(policy,access(account),invocation,digest,Date.now()+policy.limits.admission_deadline_milliseconds);
async function fresh(readiness='READY',ceiling=8){
  await pool.query(`INSERT INTO private.galx_sites_fair_pools(pool_id,revision,snapshot) VALUES($1,1,$2)
    ON CONFLICT(pool_id) DO UPDATE SET revision=galx_sites_fair_pools.revision+1,snapshot=jsonb_set($2::jsonb,'{revision}',to_jsonb(galx_sites_fair_pools.revision+1)),refresh_token=NULL,refresh_until=NULL,cooldown_until=NULL`,
    [policy.pool_id,{pool_id:policy.pool_id,revision:1,observed_at:now,valid_until:now+2000,readiness,signal_basis:'shared-local-admission',local_concurrency_limit:ceiling}]);
}
async function reset(){
  now=1_000_000;events.length=0;policy={...policy,pool_id:fixture.initial_snapshot.pool_id,revision:1,limits:readFairLimits(fixture.policy)};
  await pool.query('DELETE FROM private.galx_sites_fair_demand; DELETE FROM private.galx_sites_fair_invocations; DELETE FROM private.galx_sites_fair_pools; DELETE FROM private.galx_sites_fair_cooldowns');
  await pool.query("UPDATE private.galx_sites_fair_policy SET mode='enforce',pool_id=$1,revision=1,limits=$2,paid_price_ids=$3 WHERE singleton",[policy.pool_id,policy.limits,policy.paid_price_ids]);await fresh();
}
async function seed(account:string,count:number,state='completed',lane='BASELINE',when=now-11000){
  for(let i=0;i<count;i++)await pool.query(`INSERT INTO private.galx_sites_fair_invocations
    (account_id,invocation_id,pool_id,digest,allowance_window,policy_revision,snapshot_revision,lane,state,admitted_at,grant_id,grant_expires_at)
    VALUES($1,$2,$3,$4,$5,1,1,$6,$7,$8,$9,$10)`,[account,randomUUID(),policy.pool_id,digest,Math.floor(now/60000),lane,state,new Date(when),randomUUID(),new Date(now+200)]);
}
async function complete(account:string,id:string){const row=(await store.lookup(account,id))!;await store.start(account,id,row.grant_id);await store.accepted(account,id,`receipt:${id}`,'https://example.test');return store.terminal(account,id,`receipt:${id}`,'completed','{}');}
const usage=async(account:string)=>Number((await pool.query('SELECT count(*) FROM private.galx_sites_fair_invocations WHERE account_id=$1 AND counted',[account])).rows[0].count);
const passed:string[]=[];
async function check(id:string,run:()=>Promise<void>){await reset();await run();passed.push(id);console.log(`${id} passed`);}
try{
  if(process.argv[2]==='--contender'){
    const [account,id]=process.argv.slice(3);try{const result=await admit(account,id);console.log(JSON.stringify({dispatch:result.dispatch,lane:result.row.lane}));}catch(e){console.log(JSON.stringify({denied:true,status:(e as any).status}));}
  }else{
    await check('T01',async()=>{await seed('a',2);assert.equal((await admit('a')).row.lane,'BASELINE');assert.equal((await admit('a')).row.lane,'CONTINUATION');assert.equal(await usage('a'),4);});
    await check('T02',async()=>{await seed('a',3);assert.equal((await admit('a')).row.lane,'CONTINUATION');});
    await check('T03',async()=>{await seed('a',100);assert.equal((await admit('a')).row.lane,'CONTINUATION');});
    await check('T04',async()=>{
      let calls=0;const relay={url:'https://example.test',key:'synthetic'};
      const transport=async(options:any)=>{calls++;await options.onAccepted('job:'+calls);return {response:Response.json({})};};
      const reader=async(options:any)=>({id:options.jobId,status:'completed' as const,output:'{}',retainedUntil:null,usage:null});
      for(const size of [1,9000]){
        const generate=createIncludedGenerator({store,policy,access:access('a'),relay,refresh:async()=>{}},transport as any,reader as any);
        await generate({operationId:randomUUID(),requestedModel:'fixture',messages:[{role:'user',content:'x'.repeat(size)}],signal:new AbortController().signal});
      }
      assert.equal(calls,2);assert.equal(await usage('a'),2);
    });
    await check('T05',async()=>{await seed('a',3);await fresh('CONSTRAINED');const id=randomUUID();await assert.rejects(admit('a',id));await fresh();assert.equal((await admit('a',id)).row.lane,'CONTINUATION');assert.equal(Math.floor(now/60000),16);});
    await check('T06',async()=>{await seed('busy',6,'dispatching','CONTINUATION');await seed('a',3);await assert.rejects(admit('a'));assert.equal((await admit('baseline')).row.lane,'BASELINE');});
    await check('T07',async()=>{await seed('busy',8,'dispatching');await assert.rejects(admit('baseline'));assert.equal(await usage('baseline'),0);});
    await check('T08',async()=>{
      await seed('busy',5,'dispatching','CONTINUATION');await seed('a',3);await seed('b',3);
      const execute=promisify(execFile);
      const results=await Promise.all(['a','b'].map(account=>execute(process.execPath,['--import',import.meta.resolve('tsx'),'--import',new URL('./lib/integration-no-network.ts',import.meta.url).pathname,new URL(import.meta.url).pathname,'--contender',account,randomUUID()],{env:process.env,timeout:15000})));
      const outcomes=results.map(r=>JSON.parse(r.stdout.trim()));assert.equal(outcomes.filter(r=>r.dispatch).length,1);assert.equal(outcomes.filter(r=>r.denied).length,1);
    });
    await check('T09',async()=>{await seed('a',2);const r=await Promise.all([admit('a',randomUUID(),store),admit('a',randomUUID(),other)]);assert.deepEqual(r.map(r=>r.row.lane).sort(),['BASELINE','CONTINUATION']);assert.equal(await usage('a'),4);});
    await check('T10',async()=>{const id=randomUUID();const results=await Promise.all([admit('a',id),admit('a',id,other)]);assert.equal(results.filter(r=>r.dispatch).length,1);assert.equal(await usage('a'),1);
      const started=await Promise.all([store.start('a',id,results[0].row.grant_id),other.start('a',id,results[0].row.grant_id)]);assert.equal(started.filter(Boolean).length,1);
      await assert.rejects(store.admit(policy,access('a'),id,'a'.repeat(64),Date.now()+200),(e:any)=>e.status===409);
    });
    await check('T11',async()=>{await seed('a',3);policy={...policy,pool_id:'test-second-physical-pool',revision:2};await pool.query('UPDATE private.galx_sites_fair_policy SET pool_id=$1,revision=2',[policy.pool_id]);await fresh();assert.equal((await admit('a')).row.lane,'CONTINUATION');assert.equal(await usage('a'),4);});
    await check('T12',async()=>{await pool.query('UPDATE private.galx_sites_fair_pools SET snapshot=NULL');let probes=0,inProgress=0,max=0;
      const refresh=async()=>{probes++;max=Math.max(max,++inProgress);await new Promise(r=>setTimeout(r,25));inProgress--;};
      const results=await Promise.allSettled(Array.from({length:8},(_,i)=>(i%2?store:other).snapshot(policy,new AbortController().signal,refresh,Date.now()+200)));
      assert.equal(probes,1);assert.equal(max,1);assert(results.some(r=>r.status==='fulfilled'));assert.equal(await usage('a'),0);
    });
    await check('T13',async()=>{
      await pool.query('UPDATE private.galx_sites_fair_pools SET snapshot=NULL');await store.snapshot(policy,new AbortController().signal,async()=>{throw Error('probe failed');},Date.now()+200);await assert.rejects(admit('a'));
      await pool.query('UPDATE private.galx_sites_fair_pools SET snapshot=NULL');await store.snapshot(policy,new AbortController().signal,async()=>{await other.cooldown(policy.pool_id,now+20000);},Date.now()+200);
      const row=(await pool.query('SELECT * FROM private.galx_sites_fair_pools')).rows[0];assert.equal(row.snapshot,null);assert(row.cooldown_until.getTime()>now);await assert.rejects(admit('a'));
    });
    await check('T14',async()=>{await seed('a',3);await seed('b',3);for(let i=0;i<2;i++){const r=await admit('a');await complete('a',r.row.invocation_id);}await fresh('CONSTRAINED');await assert.rejects(admit('b'));await fresh();await assert.rejects(admit('a'),(e:any)=>e.reason==='account_share');assert.equal(await usage('a'),5);});
    await check('T15',async()=>{let admitted=0;for(let i=0;i<20;i++){try{const r=await admit('fast'+i);admitted++;await complete('fast'+i,r.row.invocation_id);}catch(e){assert.equal((e as any).reason,'pool_flow');}}assert.equal(admitted,12);});
    await check('T16',async()=>{now=1019500;await fresh();const r=await admit('a');await store.start('a',r.row.invocation_id,r.row.grant_id);now=1020100;await fresh();const next=await admit('a');assert.equal(next.row.lane,'BASELINE');assert.equal(await usage('a'),2);assert.equal((await store.lookup('a',r.row.invocation_id))!.state,'dispatching');assert.equal((events.at(-1)!.counts as any).accountAttempts,1);});
    await check('T17',async()=>{await fresh('UNKNOWN');const id=randomUUID();for(let i=0;i<3;i++)await assert.rejects(admit('a',id));assert.equal(await usage('a'),0);await fresh();assert((await admit('a',id)).dispatch);assert.equal(await usage('a'),1);});
    await check('T18',async()=>{const r=await admit('a');await Promise.all([store.cancelReserved('a',r.row.invocation_id),other.cancelReserved('a',r.row.invocation_id)]);assert.equal(await usage('a'),0);assert.equal(await store.start('a',r.row.invocation_id,r.row.grant_id),false);
      const id=randomUUID();const generate=createIncludedGenerator({store,policy,access:access('a'),relay:{url:'https://example.test',key:'synthetic'},refresh:async()=>{}},async()=>{throw new RelayDispatchError('admission',{status:503,executionState:'not_accepted',requestId:'request-one',upstreamCode:'model_capacity_exhausted',retryAfterMs:5000});});
      await assert.rejects(generate({operationId:id,requestedModel:'fixture',messages:[{role:'user',content:'x'}],signal:new AbortController().signal}),(e:any)=>e.status===503&&e.beforeAdmission);
      assert.equal(await usage('a'),0);assert.equal((await store.lookup('a',id))!.state,'not_started');
    });
    await check('T19',async()=>{const r=await admit('a');await store.start('a',r.row.invocation_id,r.row.grant_id);now+=30000;await store.cancelReserved('a',r.row.invocation_id);assert.equal(await usage('a'),1);assert.equal((await store.lookup('a',r.row.invocation_id))!.state,'dispatching');assert.deepEqual(await recoverIncludedGeneration(store,'a',r.row.invocation_id,{url:'https://example.test',key:'synthetic'},new AbortController().signal),{text:'',completed:false});});
    await check('T20',async()=>{
      let lose=true;const uncertain=new SitesFairStore({connect:async()=>{const db=await pool.connect();return new Proxy(db,{get(target,key){if(key==='query')return async(...args:any[])=>{const result=await (target.query as any)(...args);if(args[0]==='COMMIT'&&lose){lose=false;throw Error('lost acknowledgement');}return result;};const v=(target as any)[key];return typeof v==='function'?v.bind(target):v;}});}},()=>now,()=>{});
      const id=randomUUID();await assert.rejects(admit('a',id,uncertain),(e:any)=>e.beforeAdmission===false);assert.equal(await usage('a'),1);assert.equal((await admit('a',id)).dispatch,false);now+=201;await fresh();await admit('b');assert.equal((await store.lookup('a',id))!.state,'not_started');assert.equal(await usage('a'),0);
    });
    await check('T21',async()=>{let calls=0;const relay={url:'https://example.test',key:'synthetic'};const transport=async(options:any)=>{calls++;await options.onAccepted('job'+calls);throw Error('disconnected');};
      const reader=async(options:any)=>({id:options.jobId,status:'completed' as const,output:'{}',retainedUntil:null,usage:null});
      const generate=createIncludedGenerator({store,policy,access:access('a'),relay,refresh:async()=>{}},transport as any,reader as any);
      const input={operationId:randomUUID(),requestedModel:'fixture',messages:[{role:'user' as const,content:'x'}],signal:new AbortController().signal};
      await generate(input);await generate(input);assert.equal(calls,1);assert.equal(await usage('a'),1);await generate({...input,operationId:randomUUID()});assert.equal(calls,2);assert.equal(await usage('a'),2);
    });
    await check('T22',async()=>{const down=new SitesFairStore({connect:async()=>{throw Error('database private secret');}},()=>now,()=>{});await assert.rejects(admit('a',randomUUID(),down));assert.equal(await usage('a'),0);});
    await check('T23',async()=>{assert((await admit('a')).dispatch);const row=(await pool.query('SELECT snapshot FROM private.galx_sites_fair_pools')).rows[0];assert.equal(row.snapshot.signal_basis,'shared-local-admission');assert(!JSON.stringify(row).includes('token'));});
    await check('T24',async()=>{await seed('busy',6,'dispatching');await fresh('READY',3);await assert.rejects(admit('a'));assert.equal((await pool.query("SELECT count(*) FROM private.galx_sites_fair_invocations WHERE state='dispatching'")).rows[0].count,'6');});
    await check('T25',async()=>{let probes=0;await store.cooldown(policy.pool_id,now+20000,'a');const generate=createIncludedGenerator({store,policy,access:access('a'),relay:{url:'https://example.test',key:'synthetic'},refresh:async()=>{probes++;}});
      for(let i=0;i<5;i++)await assert.rejects(generate({operationId:randomUUID(),requestedModel:'fixture',messages:[{role:'user',content:'x'}],signal:new AbortController().signal}),(e:any)=>e.status===429);assert.equal(probes,0);assert.equal(await usage('a'),0);
    });
    await check('T26',async()=>{
      const timings:number[]=[],admissions:Record<string,number>={};let denied=0;
      for(let i=0;i<12;i++){await seed('load'+i,3);admissions['load'+i]=0;}
      for(let round=0;round<6;round++){
        for(let i=0;i<12;i++){
          const account='load'+i,start=performance.now();try{const r=await admit(account,randomUUID(),i%2?store:other);admissions[account]=(admissions[account]||0)+1;await complete(account,r.row.invocation_id);}catch(e){assert(e instanceof FairUsageError);denied++;}timings.push(performance.now()-start);
        }
        now+=2500;await fresh();
      }
      const total=Object.values(admissions).reduce((a,b)=>a+b,0);assert.equal(total,8);assert(denied>0);timings.sort((a,b)=>a-b);
      const gate=events.map(e=>Number(e.duration_ms)).filter(Number.isFinite).sort((a,b)=>a-b);
      const percentiles=(values:number[])=>({p50:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)],p99:values[Math.floor(values.length*.99)]});
      console.log(JSON.stringify({synthetic_overload:{requests:72,admissions:total,denied,per_account:admissions,gate_ms:percentiles(gate),request_including_terminal_ms:percentiles(timings),limitation:'Fixed ordered arrivals leave eight accounts unserved in this short trace. No starvation-free scheduling guarantee.'}}));
    });
    // Public and ordinary account roles cannot read, write or impersonate the private authority.
    for(const role of ['anon','authenticated','service_role'])for(const table of ['policy','pools','invocations','demand','cooldowns']){
      const name=`private.galx_sites_fair_${table}`,column=table==='policy'?'singleton':table==='cooldowns'?'account_id':'pool_id';
      for(const sql of [`SELECT * FROM ${name}`,`INSERT INTO ${name} DEFAULT VALUES`,`UPDATE ${name} SET ${column}=${column}`,`DELETE FROM ${name}`]){
        const db=await pool.connect();try{await db.query('BEGIN');await db.query(`SET LOCAL ROLE ${role}`);await assert.rejects(db.query(sql),(e:any)=>e.code==='42501');}finally{await db.query('ROLLBACK');db.release();}
      }
    }
    const before=Number((await pool.query('SELECT count(*) FROM private.galx_sites_fair_invocations')).rows[0].count);
    await pool.query(readFileSync(new URL('../supabase/rollbacks/20260912030611_sites_paid_fair_usage.down.sql',import.meta.url),'utf8'));await assert.rejects(store.policy());assert.equal(Number((await pool.query('SELECT count(*) FROM private.galx_sites_fair_invocations')).rows[0].count),before);
    assert.deepEqual(passed,fixture.acceptance_case_ids);console.log(JSON.stringify({acceptance_cases:passed.length,role_denials:60,rollback_preserves_receipts:true}));
  }
}finally{await pool.end();}
