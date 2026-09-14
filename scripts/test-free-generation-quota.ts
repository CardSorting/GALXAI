import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountIdentityError } from '../src/lib/auth/accountIdentity';
import { generationQuotaRoute } from '../src/lib/billing/generation-quota-route';
import { readGenerationAllowance } from '../src/lib/billing/free-generation-contract';
import { generationMembership } from '../src/lib/billing/generation-access';
import { StripeEngine } from '../src/lib/stripe/stripe';
import { FairUsageError } from '../src/lib/sites/fair-policy';

const owner='00000000-0000-4000-8000-000000000001';
const secret='PRIVATE_CANARY_database_grant_identity';
test('quota endpoint derives ownership from verified identity and projects a no-store DTO',async()=>{
  let reads=0,pro=false;
  const handle=generationQuotaRoute({authenticate:async request=>{
    if(request.headers.get('authorization')!=='Bearer verified') throw Object.assign(new AccountIdentityError(),{message:secret});
    return{id:owner,private:secret};
  },plan:async id=>{assert.equal(id,owner);return pro?'pro':'free';},quota:async id=>{
    assert.equal(id,owner);reads++;return{sites:1,images:5,siteTurns:3,identity_hash:secret,allowance_usd:5};
  }});
  const send=(query='',headers:Record<string,string>={authorization:'Bearer verified'},method='GET')=>handle(new Request('https://galx.ai/api/billing/generation-quota'+query,{headers,method}));
  for(const headers of [{},{authorization:'Bearer forged'},{cookie:'admin=true', 'x-user-id':owner}]){
    const response=await send('',headers);assert.equal(response.status,401);assert.doesNotMatch(await response.text(),/PRIVATE_CANARY/);
  }
  assert.equal(reads,0);
  for(const query of ['?owner=someone','?images=5&images=5'])assert.equal((await send(query)).status,400);
  assert.equal((await send('',undefined,'POST')).status,405);
  const response=await send();assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.deepEqual([...response.headers.keys()].sort(),['cache-control','content-type','x-content-type-options']);
  assert.deepEqual(await response.json(),{plan:'free',quota:{sites:1,images:5,siteTurns:3}});
  pro=true;assert.deepEqual(await (await send()).json(),{plan:'pro',quota:null});assert.equal(reads,1);
});
test('invalid quota data and authority outages cannot become free access or leak diagnostics',async()=>{
  for(const quota of [null,{}, {sites:2,images:5,siteTurns:3},{sites:1,images:6,siteTurns:3},{sites:1,images:5,siteTurns:4},{sites:1,images:-1,siteTurns:3},{sites:1,images:1.5,siteTurns:3}]){
    assert.equal(readGenerationAllowance({plan:'free',quota}),null);
    const response=await generationQuotaRoute({authenticate:async()=>({id:owner}),plan:async()=>'free',quota:async()=>quota as any})(new Request('https://galx.ai/quota'));
    assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/PRIVATE_CANARY|TypeError|stack/);
  }
  assert.equal(readGenerationAllowance({plan:'pro',quota:{images:5}}),null);
  let quotaCalls=0;
  const response=await generationQuotaRoute({authenticate:async()=>({id:owner}),plan:async()=>{throw new Error(secret);},quota:async()=>{quotaCalls++;throw new Error();}})(new Request('https://galx.ai/quota'));
  assert.equal(response.status,503);assert.equal(quotaCalls,0);assert.doesNotMatch(await response.text(),/PRIVATE_CANARY/);
});
test('only authoritative absence of Pro permits free membership; grants and outages stay distinct',async()=>{
  const saved=StripeEngine.getInstance;
  let granted=false,customer=false,unavailable=false,reads=0;
  const pool={connect:async()=>({query:async(sql:string,args:unknown[])=>{
    assert.deepEqual(args,[owner]);if(unavailable)throw new Error(secret);
    return{rows:sql.includes('raw_app_meta_data')?[{granted}]:customer?[{stripe_customer_id:'cus_fixture'}]:[]};
  },release:()=>{}})} as any;
  const policy={revision:1,paid_price_ids:[]} as any;
  try {
    StripeEngine.getInstance=()=>({getClient:()=>({subscriptions:{list:async()=>{reads++;throw new Error(secret);}}})}) as any;
    assert.equal((await generationMembership(owner,pool,policy)).plan,'free');assert.equal(reads,0);
    customer=true;await assert.rejects(generationMembership(owner,pool,policy));assert.equal(reads,1);
    granted=true;assert.equal((await generationMembership(owner,pool,policy)).plan,'pro');assert.equal(reads,1);
    unavailable=true;await assert.rejects(generationMembership(owner,pool,policy));
    unavailable=false;granted=false;StripeEngine.getInstance=()=>({getClient:()=>null}) as any;
    await assert.rejects(generationMembership(owner,pool,policy),FairUsageError);
  } finally {StripeEngine.getInstance=saved;}
});
