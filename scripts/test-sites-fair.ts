import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { decideFairAdmission,readFairLimits,FairUsageError,type FairCounts,type PoolSnapshot } from '../src/lib/sites/fair-policy';
import { requirePaidSitesAccess } from '../src/lib/sites/paid-access';
import { includedSitesContentRoute } from '../src/lib/sites/included-content-route';
import { sitesWorkspaceRoute } from '../src/lib/sites/workspace-route';
const fixture=JSON.parse(readFileSync(new URL('../GALX_Fair_Usage_Test_Fixture.json',import.meta.url),'utf8'));
const p=readFairLimits(fixture.policy),now=1_000_000;
const snapshot:PoolSnapshot={pool_id:'test',revision:1,observed_at:now,valid_until:now+2000,readiness:'READY',signal_basis:'shared-local-admission',local_concurrency_limit:8};
const zero:FairCounts={messages:0,outstanding:0,accountOutstanding:0,continuationOutstanding:0,accountContinuationOutstanding:0,attempts:0,accountAttempts:0,continuationAttempts:0,accountContinuationAttempts:0,activeDemand:1};
test('T01–T04, T23: threshold is a lane transition, never a token weight or absolute cap',()=>{
  for(const count of [0,2,3,100000])assert.equal(decideFairAdmission(p,snapshot,{...zero,messages:count},now,'test'),count<3?'BASELINE':'CONTINUATION');
  assert(!('upstream_remaining_token_allocation' in snapshot));
});
test('T06,T07,T24: protected capacity, full pools, lower ceilings and untrusted snapshots fail closed',()=>{
  assert.throws(()=>decideFairAdmission(p,snapshot,{...zero,messages:3,continuationOutstanding:6,outstanding:6},now,'test'));
  assert.equal(decideFairAdmission(p,snapshot,{...zero,continuationOutstanding:6,outstanding:6},now,'test'),'BASELINE');
  assert.throws(()=>decideFairAdmission(p,snapshot,{...zero,outstanding:8},now,'test'));
  for(const s of [null,{...snapshot,readiness:'UNKNOWN'}, {...snapshot,valid_until:now}, {...snapshot,observed_at:now+1}, {...snapshot,local_concurrency_limit:2}, {...snapshot,pool_id:'other'}, {...snapshot,signal_basis:'invented token balance'}])assert.throws(()=>decideFairAdmission(p,s as any,{...zero,outstanding:3},now,'test'));
});
test('T14,T15: current demand contracts share and completed work retains rolling attempt protection',()=>{
  assert.equal(decideFairAdmission(p,snapshot,{...zero,messages:3,accountContinuationAttempts:2,activeDemand:1},now,'test'),'CONTINUATION');
  assert.throws(()=>decideFairAdmission(p,snapshot,{...zero,messages:3,accountContinuationAttempts:2,activeDemand:2},now,'test'),(e:any)=>e.status===429);
  assert.throws(()=>decideFairAdmission(p,snapshot,{...zero,attempts:12},now,'test'),(e:any)=>e.reason==='pool_flow');
});
test('No missing/default production policy, extra knobs, or unsupported provider retry loops',()=>{
  for(const v of [undefined,{}, {...p,baseline_protected_slots:8},{...p,provider_max_attempts_per_logical_invocation:2},{...p,refresh_timeout_milliseconds:201},{...p,quotaTokens:999}])assert.throws(()=>readFairLimits(v));
});
const policy={mode:'enforce' as const,pool_id:'test',revision:1,limits:p,paid_price_ids:['price_paid']};
function membership(subscription:any,customer='cus_owner'){
  let network=0;const pool={connect:async()=>({query:async(sql:string,args:unknown[])=>{assert.match(sql,/WHERE user_id=\$1/);assert.deepEqual(args,['alice']);return{rows:customer?[{stripe_customer_id:customer}]:[]};},release:()=>{}})} as any;
  const stripe={subscriptions:{list:async(params:any,options:any)=>{network++;assert.equal(params.customer,'cus_owner');assert.equal(options.maxNetworkRetries,0);return{data:[subscription],has_more:false};}},invoicePayments:{list:async()=>({data:[{amount_paid:2000,payment:{type:'charge',charge:{customer:'cus_owner',amount:2000,paid:true,captured:true,refunded:false,amount_refunded:0,disputed:subscription.refunded||false}}}],has_more:false})}} as any;
  return {run:()=>requirePaidSitesAccess(pool,stripe,'alice',policy,now),network:()=>network};
}
const paid={customer:'cus_owner',status:'active',pause_collection:null,items:{data:[{id:'si_paid',quantity:1,price:{id:'price_paid',recurring:{}},current_period_start:900,current_period_end:2000}]},
  latest_invoice:{id:'in_paid',customer:'cus_owner',status:'paid',amount_paid:2000,lines:{data:[{amount:2000,pricing:{price_details:{price:'price_paid'}},parent:{subscription_item_details:{subscription_item:'si_paid'}},period:{start:900,end:2000}}]}}};
test('Membership uses verified customer, eligible recurring price, active paid invoice and current period',async()=>{
  assert.deepEqual(await membership(paid).run(),{accountId:'alice',policyRevision:1,validUntil:now+15000});
  for(const subscription of [{...paid,refunded:true},{...paid,status:'trialing'},{...paid,status:'past_due'},{...paid,customer:'cus_other'}, {...paid,pause_collection:{}}, {...paid,latest_invoice:{...paid.latest_invoice,amount_paid:0}}, {...paid,items:{data:[{...paid.items.data[0],price:{id:'price_other',recurring:{}}}]}}, {...paid,latest_invoice:{...paid.latest_invoice,lines:{data:[]}}}, {...paid,items:{data:[{...paid.items.data[0],current_period_end:999}]}}])await assert.rejects(membership(subscription).run(),(e:any)=>e.status===403);
  const missing=membership(paid,'');await assert.rejects(missing.run());assert.equal(missing.network(),0);
});
const request=(body?:any,query='',auth='Bearer alice')=>new Request('https://galx.ai/api/sites/content'+query,{method:body?'POST':'GET',headers:{authorization:auth,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('Included content HTTP excludes costs, quota internals, headers and caller-selected authority',async()=>{
  let calls=0;const doc={schema_version:1,title:'Test',summary:'Summary',sections:[{heading:'Hi',body:'Hello'}]};
  const handle=includedSitesContentRoute({authenticate:async()=>({id:'alice'}),access:async()=>{},generate:async(owner,op)=>{assert.equal(owner,'alice');calls++;return{text:JSON.stringify(doc),completed:true,private:'secret',cost:{units:50000}} as any;},recover:async()=>null,legacy:async()=>new Response('legacy')});
  const setup=await handle(request());assert.deepEqual(await setup.json(),{access:'included'});
  const valid={operationId:'one',brief:'A page',repair:false};
  for(const body of [{...valid,maxChargeMicroUsd:50000},{...valid,tier:'apex'},{...valid,pool_id:'anything'},{...valid,owner:'other'},{...valid,usage:1}])assert.equal((await handle(request(body))).status,400);
  assert.equal(calls,0);const response=await handle(request(valid));assert.deepEqual(await response.json(),{operationId:'one',status:'completed',text:JSON.stringify(doc)});
  assert.deepEqual([...response.headers.keys()].sort(),['cache-control','content-type','x-content-type-options']);
  assert.equal((await handle(request(valid,'',''))).status,401);
});
test('Paid denial applies to create, generate and publish; saved Sites remain accessible',async()=>{
  let mutations=0;const id='e6581c35-7a8d-4c01-a630-a3c8e6f9531b';
  const denial=async()=>{throw new FairUsageError(403,'secret-plan-diagnostic');};
  const handle=sitesWorkspaceRoute({authenticate:async()=>({id:'alice'}),requireAccess:denial,prepare:denial,recover:async()=>{throw Error();},canPublish:()=>true,publish:async()=>{mutations++;throw Error();},repository:()=>({list:async()=>[],username:async()=>null,get:async()=>({}),create:async()=>{mutations++;}} as any)});
  for(const body of [{action:'create',id,title:'Test'},{action:'generate',id,revision:0,operationId:id,brief:'A page'},{action:'publish',id,revision:0,username:'alice',audience:'public'}]){
    const response=await handle(request(body));assert.equal(response.status,403);assert.deepEqual(await response.json(),{error:{code:'paid_plan_required'}});
  }
  assert.equal(mutations,0);assert.deepEqual(await (await handle(request())).json(),{sites:[]});
  assert.deepEqual(await (await handle(request(undefined,'?view=setup'))).json(),{access:'paid_plan_required',publishing:'unavailable',username:null});
});
