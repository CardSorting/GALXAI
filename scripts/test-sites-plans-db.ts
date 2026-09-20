/** Disposable database and fake Stripe only; the runner forbids external network. */
import './lib/require-isolated-integration-env.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { createDeveloperCheckout, createProCheckout, developerPrice, fulfillPlanStripeEvent, isProPaymentAdjustment, proPrice } from '../src/lib/billing/plan-subscription';
import { DEVELOPER_ACCESS, PRO_PLAN } from '../src/lib/billing/pro-plan';
import { fulfillStripeEvent } from '../src/lib/billing/fulfillment';
import type { FairPolicy } from '../src/lib/sites/fair-store';
import { SiteDomainRegistry } from '../src/lib/sites/domain-registry';
import { hasComplimentaryProAccess, requirePaidSitesAccess } from '../src/lib/sites/paid-access';
import { DeveloperAccessRepository } from '../src/lib/supabase/repositories/DeveloperAccessRepository';
const pool=new Pool({connectionString:process.env.GALX_INTEGRATION_DATABASE_URL,max:8});
const fixture=JSON.parse(await readFile(new URL('../GALX_Fair_Usage_Test_Fixture.json',import.meta.url),'utf8'));
const policy:FairPolicy={mode:'enforce',pool_id:'test-plans',revision:1,limits:fixture.policy,paid_price_ids:['price_pro']};
let checks=0;
const check=async(name:string,run:()=>Promise<void>)=>{await run();checks++;console.log(`PASS ${name}`);};
function fake(){
  const sessions=new Map<string,any>(),params=new Map<string,any>();let calls=0,customerCalls=0,lost=false,delay=0;
  let subscription:any[]=[];let beforeReply:((session:any)=>Promise<void>)|undefined;
  const stripe:any={prices:{list:async(input:any)=>{const developer=input?.lookup_keys?.[0] === DEVELOPER_ACCESS.lookupKey;return {data:[{id:developer?'price_developer':'price_pro',product:developer?'galx_nova_developer_access_v1':'galx_pro_v1',metadata:developer?{galxPlan:'nova-developer-v1'}:{galxPlan:'pro-v1'},currency:'usd',unit_amount:(developer?DEVELOPER_ACCESS.monthlyPriceUsd:PRO_PLAN.monthlyPriceUsd)*100,recurring:{interval:'month',interval_count:1,usage_type:'licensed'}}]};}},
    customers:{create:async()=>{customerCalls++;return{id:'cus_'+randomUUID().replaceAll('-','')};}},
    subscriptions:{list:async()=>({data:subscription,has_more:false})},checkout:{sessions:{
      retrieve:async(id:string)=>sessions.get(id),
      create:async(input:any,options:any)=>{
        calls++;assert.equal(input.mode,'subscription');assert.equal(input.line_items.length,1);assert.equal(input.line_items[0].quantity,1);assert(input.line_items[0].price === 'price_pro' || input.line_items[0].price === 'price_developer');assert.equal(input.allow_promotion_codes,false);
        if(input.line_items[0].price === 'price_developer') {
          assert.equal(input.custom_text?.submit?.message,'This is a recurring API access subscription at $50/month. Usage is billed separately. No usage credits are included.');
          assert.equal(input.metadata?.usagePricingStatus,'not_published');
          assert.equal(input.metadata?.includedUsageCreditsUsd,'0');
          assert.equal(input.subscription_data?.metadata?.usagePricingStatus,'not_published');
        } else assert.equal(input.custom_text,undefined);
        assert.equal(input.payment_method_types,undefined);assert.equal(input.automatic_tax,undefined);assert.equal(options.maxNetworkRetries,0);
        assert.equal(new URL(input.success_url).origin,'https://galx.ai');
        if(params.has(options.idempotencyKey))assert.deepEqual(input,params.get(options.idempotencyKey));else params.set(options.idempotencyKey,structuredClone(input));
        const id='cs_test_'+options.idempotencyKey.replaceAll(':','');
        let session=sessions.get(id);if(!session){session={id,status:'open',mode:'subscription',customer:input.customer,client_reference_id:input.client_reference_id,
          metadata:input.metadata,currency:'usd',amount_subtotal:input.line_items[0].price === 'price_developer' ? DEVELOPER_ACCESS.monthlyPriceUsd*100 : PRO_PLAN.monthlyPriceUsd*100,payment_status:'unpaid',url:'https://checkout.stripe.com/c/pay/'+id};sessions.set(id,session);}
        if(delay)await new Promise(r=>setTimeout(r,delay));if(beforeReply)await beforeReply(session);
        if(lost){lost=false;throw Error('Lost provider acknowledgement');}return session;
      }}}};
  return{stripe,sessions,params,counts:()=>({calls,customerCalls}),lose:()=>{lost=true;},delay:(ms:number)=>{delay=ms;},subscriptions:(s:any[])=>{subscription=s;},before:(f:(s:any)=>Promise<void>)=>{beforeReply=f;}};
}
const input=(userId=randomUUID(),requestId=randomUUID())=>({userId,requestId,origin:'https://galx.ai'});
const event=(type:string,object:any,created=100)=>({id:'evt_'+randomUUID(),type,created,data:{object}} as any);
try{
  await check('complimentary Pro requires a current server grant and verified active account',async()=>{
    const owner=randomUUID(),other=randomUUID();
    await pool.query(`INSERT INTO auth.users(id,email_confirmed_at,raw_user_meta_data) VALUES($1,now(),'{"galx_pro":true}')`,[owner]);
    assert.equal(await hasComplimentaryProAccess(pool,owner),false);
    for(const value of ['"true"','1','{}','false','null']) {
      await pool.query(`UPDATE auth.users SET raw_app_meta_data=jsonb_build_object('galx_pro',$2::jsonb) WHERE id=$1`,[owner,value]);
      assert.equal(await hasComplimentaryProAccess(pool,owner),false);
    }
    await pool.query(`UPDATE auth.users SET raw_app_meta_data='{"galx_pro":true}' WHERE id=$1`,[owner]);
    assert.deepEqual(await requirePaidSitesAccess(pool,null,owner,policy,1000),{tier:'pro',accountId:owner,policyRevision:1,validUntil:16000});
    assert.equal(await hasComplimentaryProAccess(pool,other),false);
    await pool.query('UPDATE auth.users SET is_anonymous=true WHERE id=$1',[owner]);
    assert.equal(await hasComplimentaryProAccess(pool,owner),false);
    await pool.query('UPDATE auth.users SET is_anonymous=false WHERE id=$1',[owner]);
    for(const field of ['banned_until','deleted_at']) {
      await pool.query(`UPDATE auth.users SET ${field}=now()+interval '1 hour' WHERE id=$1`,[owner]);
      assert.equal(await hasComplimentaryProAccess(pool,owner),false);
      await pool.query(`UPDATE auth.users SET ${field}=NULL WHERE id=$1`,[owner]);
    }
    await pool.query('UPDATE auth.users SET email_confirmed_at=NULL WHERE id=$1',[owner]);
    assert.equal(await hasComplimentaryProAccess(pool,owner),false);
    await pool.query(`UPDATE auth.users SET email_confirmed_at=now(),raw_app_meta_data='{}' WHERE id=$1`,[owner]);
    assert.equal(await hasComplimentaryProAccess(pool,owner),false);
    const operator=randomUUID(),autonomous=`star-${randomUUID()}`;
    await pool.query(
      `INSERT INTO private.galx_account_identities(account_id, account_class)
       VALUES ($1, 'human'), ($2, 'autonomous')`,
      [operator,autonomous],
    );
    const entitlement=(await pool.query(
      `INSERT INTO private.galx_administrative_entitlements
        (account_id, entitlement_key, granted_by_account_id, reason)
       VALUES ($1, 'pro-v1', $2, 'Sites plan verification') RETURNING id`,
      [autonomous,operator],
    )).rows[0].id;
    assert.deepEqual(await requirePaidSitesAccess(pool,null,autonomous,policy,1000),
      {tier:'pro',accountId:autonomous,policyRevision:1,validUntil:16000});
    await pool.query(
      `UPDATE private.galx_administrative_entitlements
       SET revoked_at=now(), revoked_by_account_id=$2 WHERE id=$1`,
      [entitlement,operator],
    );
    assert.equal(await hasComplimentaryProAccess(pool,autonomous),false);
    for(const role of ['anon','authenticated']) {
      const db=await pool.connect();
      try {
        await db.query('BEGIN');await db.query('SET LOCAL ROLE '+role);
        await assert.rejects(db.query(`UPDATE auth.users SET raw_app_meta_data='{"galx_pro":true}' WHERE id=$1`,[owner]),(e:any)=>e.code==='42501');
      } finally {await db.query('ROLLBACK');db.release();}
    }
    const failedPool={connect:async()=>{throw new Error('Authority unavailable');}} as any;
    await assert.rejects(requirePaidSitesAccess(failedPool,null,owner,policy));
  });
  await check('fresh checkout uses owned customer, one plan, hosted URL and short transactions',async()=>{
    const f=fake(),i=input();f.before(async()=>{const idle=await pool.query("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND state='idle in transaction'");assert.equal(Number(idle.rows[0].count),0);});
    const r=await createProCheckout(pool,f.stripe,policy,i);assert.deepEqual(Object.keys(r),['url']);assert(r.url.startsWith('https://checkout.stripe.com/'));
    assert.equal([...f.params.values()][0].success_url,'https://galx.ai/billing/plan?plan_checkout=returned');
    assert.equal([...f.params.values()][0].cancel_url,'https://galx.ai/billing/plan?plan_checkout=canceled');
    assert.equal((await pool.query('SELECT return_path FROM private.galx_plan_checkouts WHERE user_id=$1',[i.userId])).rows[0].return_path,'/billing/plan');
    assert.deepEqual(f.counts(),{calls:1,customerCalls:1});assert.equal((await pool.query('SELECT count(*) FROM galx_wallet_transactions WHERE user_id=$1',[i.userId])).rows[0].count,'0');
  });
  await check('same and new browser identities resume the one open checkout',async()=>{
    const f=fake(),i=input();const original=await createProCheckout(pool,f.stripe,policy,i);
    assert.deepEqual(await createProCheckout(pool,f.stripe,policy,i),original);assert.deepEqual(await createProCheckout(pool,f.stripe,policy,{...i,requestId:randomUUID()}),original);assert.equal(f.counts().calls,1);
  });
  await check('concurrent workers cannot create two subscriptions',async()=>{
    const f=fake(),i=input();f.delay(100);const results=await Promise.allSettled([createProCheckout(pool,f.stripe,policy,i),createProCheckout(pool,f.stripe,policy,{...i,requestId:randomUUID()})]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.sessions.size,1);const rejected=results.find(r=>r.status==='rejected') as PromiseRejectedResult;assert.equal(rejected.reason.status,429);
  });
  await check('uncertain provider acknowledgement replays identical terms and idempotency key',async()=>{
    const f=fake(),i=input();f.lose();await assert.rejects(createProCheckout(pool,f.stripe,policy,i));
    await createProCheckout(pool,f.stripe,policy,{...i,requestId:randomUUID()});assert.equal(f.counts().calls,2);assert.equal(f.sessions.size,1);assert.equal(f.params.size,1);
  });
  await check('webhook before checkout acknowledgement commits ownership without wallet credit',async()=>{
    const f=fake(),i=input();f.before(async session=>{const e=event('checkout.session.completed',{...session,status:'complete',payment_status:'paid'});await fulfillStripeEvent(pool,e,JSON.stringify(e));assert.equal((await fulfillStripeEvent(pool,e,JSON.stringify(e))).duplicate,true);});
    await createProCheckout(pool,f.stripe,policy,i);assert.equal((await pool.query('SELECT state FROM private.galx_plan_checkouts WHERE user_id=$1',[i.userId])).rows[0].state,'complete');
    assert.equal((await pool.query('SELECT count(*) FROM galx_wallet_transactions WHERE user_id=$1',[i.userId])).rows[0].count,'0');
  });
  await check('pre-migration attempts retain old provider parameters across an uncertain acknowledgement',async()=>{
    const f=fake(),i=input();
    // Older application inserts omit the additive column. NULL is the old contract.
    await pool.query('INSERT INTO private.galx_plan_checkouts(user_id,request_id,price_id) VALUES($1,$2,$3)',[i.userId,i.requestId,'price_pro']);
    f.lose();await assert.rejects(createProCheckout(pool,f.stripe,policy,i),/Lost provider acknowledgement/);
    assert.equal([...f.params.values()][0].success_url,'https://galx.ai/billing?plan_checkout=returned#plan');
    assert.equal([...f.params.values()][0].cancel_url,'https://galx.ai/billing?plan_checkout=canceled#plan');
    await createProCheckout(pool,f.stripe,policy,{...i,requestId:randomUUID()});
    assert.equal(f.sessions.size,1);assert.equal(f.params.size,1);assert.equal(f.counts().calls,2);
    await assert.rejects(pool.query("UPDATE private.galx_plan_checkouts SET return_path='https://evil.test' WHERE user_id=$1",[i.userId]),(e:any)=>e.code==='23514');
  });
  await check('checkout ownership and amount mismatch roll back',async()=>{
    const f=fake(),i=input();await createProCheckout(pool,f.stripe,policy,i);const session=[...f.sessions.values()][0];
    for(const change of [{customer:'cus_other'},{amount_subtotal:1},{client_reference_id:randomUUID()}]){const e=event('checkout.session.completed',{...session,...change});await assert.rejects(fulfillStripeEvent(pool,e,JSON.stringify(e)));}
    assert.equal((await pool.query('SELECT state FROM private.galx_plan_checkouts WHERE user_id=$1',[i.userId])).rows[0].state,'open');
  });
  await check('subscription lifecycle is durable, idempotent and terminal cancellation wins',async()=>{
    const f=fake(),i=input();await createProCheckout(pool,f.stripe,policy,i);const session=[...f.sessions.values()][0];
    const sub={id:'sub_'+randomUUID(),customer:session.customer,status:'active',metadata:{galxPlan:'pro-v1',userId:i.userId},items:{data:[{price:{id:'price_pro'},current_period_end:2000}]}};
    for(const [type,status,created] of [['created','active',100],['updated','past_due',102],['deleted','canceled',103],['updated','active',101],['updated','active',104]] as const){const e=event('customer.subscription.'+type,{...sub,status},created);await fulfillStripeEvent(pool,e,JSON.stringify(e));}
    const row=(await pool.query('SELECT status FROM private.galx_plan_subscriptions WHERE subscription_id=$1',[sub.id])).rows[0];assert.equal(row.status,'canceled');
    const bad=event('customer.subscription.updated',{...sub,metadata:{...sub.metadata,userId:randomUUID()}});await assert.rejects(fulfillStripeEvent(pool,bad,JSON.stringify(bad)));
  });
  await check('Retired Developer Access stays non-purchasable while historical subscriptions reconcile',async()=>{
    const f=fake(),i=input(),customer='cus_historical_'+randomUUID().replaceAll('-','');
    const price=await developerPrice(f.stripe);
    assert.equal(price.id,'price_developer'); assert.equal(price.unit_amount,DEVELOPER_ACCESS.monthlyPriceUsd*100);
    await assert.rejects(createDeveloperCheckout(pool,f.stripe,i),(e:any)=>e.status===410);
    assert.equal(f.counts().calls,0,'retired checkout must not call Stripe checkout');
    await pool.query('INSERT INTO galx_stripe_customers(id,user_id,stripe_customer_id) VALUES($1,$2,$3)',[randomUUID(),i.userId,customer]);
    const periodEnd=Math.floor(Date.now()/1000)+3600;
    const sub={id:'sub_'+randomUUID(),customer,status:'active',cancel_at_period_end:false,
      metadata:{galxPlan:'nova-developer-v1',userId:i.userId},items:{data:[{price:{id:'price_developer'},current_period_end:periodEnd}]}};
    const createdEvent=event('customer.subscription.created',sub);
    await fulfillStripeEvent(pool,createdEvent,JSON.stringify(createdEvent),{developerPriceId:'price_developer'});
    const stored=(await pool.query('SELECT plan_key,status,price_id FROM private.galx_plan_subscriptions WHERE subscription_id=$1',[sub.id])).rows[0];
    assert.deepEqual(stored,{plan_key:'nova-developer-v1',status:'active',price_id:'price_developer'});
    assert.equal((await pool.query('SELECT count(*) FROM galx_wallet_transactions WHERE user_id=$1',[i.userId])).rows[0].count,'0');
    assert.equal((await new DeveloperAccessRepository(pool).isApproved(i.userId)),true);
    const ending={...sub,cancel_at_period_end:true};
    const endingEvent=event('customer.subscription.updated',ending,101);
    await fulfillStripeEvent(pool,endingEvent,JSON.stringify(endingEvent),{developerPriceId:'price_developer'});
    assert.equal(await new DeveloperAccessRepository(pool).isApproved(i.userId),true);
    // Lifecycle reconciliation uses the stored subscription Price identity;
    // it must still work without a live Price lookup or subscription metadata
    // after a provider-side Price rotation/archive.
    const pastDue={...sub,status:'past_due',metadata:undefined};
    const pastDueEvent=event('customer.subscription.updated',pastDue,102);
    await fulfillStripeEvent(pool,pastDueEvent,JSON.stringify(pastDueEvent));
    assert.equal(await new DeveloperAccessRepository(pool).isApproved(i.userId),false);
    const activeAgain={...sub,status:'active',metadata:undefined};
    const activeAgainEvent=event('customer.subscription.updated',activeAgain,103);
    await fulfillStripeEvent(pool,activeAgainEvent,JSON.stringify(activeAgainEvent));
    assert.equal(await new DeveloperAccessRepository(pool).isApproved(i.userId),true);
    const canceled={...sub,status:'canceled',cancel_at_period_end:false,metadata:undefined};
    const canceledEvent=event('customer.subscription.deleted',canceled,104);
    await fulfillStripeEvent(pool,canceledEvent,JSON.stringify(canceledEvent));
    assert.equal(await new DeveloperAccessRepository(pool).isApproved(i.userId),false);
  });
  await check('retired checkout evidence cannot create Developer entitlement',async()=>{
    const i=input();
    await pool.query('INSERT INTO private.galx_plan_checkouts(user_id,request_id,price_id,state,return_path) VALUES($1,$2,$3,$4,$5)',[i.userId,i.requestId,'price_retired','complete','/billing/plan']);
    assert.equal(await new DeveloperAccessRepository(pool).isApproved(i.userId),false);
  });
  await check('verified subscription adjustments never debit a prepaid wallet',async()=>{
    const f=fake(),i=input();await createProCheckout(pool,f.stripe,policy,i);const session=[...f.sessions.values()][0];
    f.stripe.invoicePayments={list:async()=>({data:[{invoice:{id:'in_pro',customer:session.customer,parent:{subscription_details:{metadata:{galxPlan:'pro-v1',userId:i.userId}}}}}],has_more:false})};
    const e=event('charge.refunded',{payment_intent:'pi_pro',amount_refunded:PRO_PLAN.monthlyPriceUsd*100,customer:session.customer});assert.equal(await isProPaymentAdjustment(pool,f.stripe,e),true);
    await fulfillStripeEvent(pool,e,JSON.stringify(e),{planAdjustment:true});assert.equal((await pool.query('SELECT count(*) FROM galx_wallet_transactions WHERE user_id=$1',[i.userId])).rows[0].count,'0');
  });
  await check('active, unpaid and incomplete existing plans prevent another checkout',async()=>{
    const f=fake(),i=input();await createProCheckout(pool,f.stripe,policy,i);
    for(const status of ['active','past_due','unpaid','incomplete','paused']){f.subscriptions([{status,items:{data:[{price:{id:'price_pro'}}]}}]);await assert.rejects(createProCheckout(pool,f.stripe,policy,i),(e:any)=>e.status===409);}
    assert.equal(f.counts().calls,1);
  });
  await check('expired hosted checkout requires an explicit new attempt',async()=>{
    const f=fake(),i=input();await createProCheckout(pool,f.stripe,policy,i);[...f.sessions.values()][0].status='expired';
    await assert.rejects(createProCheckout(pool,f.stripe,policy,i),(e:any)=>e.status===409);await createProCheckout(pool,f.stripe,policy,{...i,requestId:randomUUID()});assert.equal(f.sessions.size,2);
  });
  await check('price mismatch or disabled policy creates no payable session',async()=>{
    const f=fake();await assert.rejects(proPrice(f.stripe,{...policy,mode:'disabled'}));await assert.rejects(proPrice(f.stripe,{...policy,paid_price_ids:['price_other']}));
    f.stripe.prices.list=async()=>({data:[{id:'price_pro',currency:'usd',unit_amount:1}]});await assert.rejects(createProCheckout(pool,f.stripe,policy,input()));assert.equal(f.counts().calls,0);
  });
  await check('customer races retain the canonical account mapping',async()=>{
    const f=fake(),i=input();f.stripe.customers.create=async()=>{await pool.query('INSERT INTO galx_stripe_customers(id,user_id,stripe_customer_id) VALUES($1,$2,$3)',[randomUUID(),i.userId,'cus_canonical']);return{id:'cus_unused'};};
    await createProCheckout(pool,f.stripe,policy,i);assert.equal([...f.sessions.values()][0].customer,'cus_canonical');
  });
  await check('private checkout and subscription tables deny all browser roles',async()=>{
    let denials=0;for(const role of ['anon','authenticated','service_role'])for(const table of ['galx_plan_checkouts','galx_plan_subscriptions'])for(const sql of [`SELECT * FROM private.${table}`,`DELETE FROM private.${table}`,`UPDATE private.${table} SET user_id=user_id`,`INSERT INTO private.${table} DEFAULT VALUES`]){
      const db=await pool.connect();try{await db.query('BEGIN');await db.query('SET LOCAL ROLE '+role);await assert.rejects(db.query(sql),(e:any)=>e.code==='42501');denials++;}finally{await db.query('ROLLBACK');db.release();}}
    assert.equal(denials,24);
  });
  await check('managed DNS discovery requires an owned published snapshot, without a cohort',async()=>{
    const registry=new SiteDomainRegistry(pool),owner=randomUUID(),other=randomUUID(),username='pro'+randomUUID().replaceAll('-','').slice(0,12);
    const valid=randomUUID(),unpublished=randomUUID(),native=randomUUID(),wrongOwner=randomUUID();
    for(const [id,published,kind,user] of [[valid,true,'managed',owner],[unpublished,false,'managed',owner],[native,true,'native',owner],[wrongOwner,true,'managed',other]] as const){
      await pool.query('INSERT INTO private.galx_site_workspaces(id,user_id,title,document,published_document,published_revision) VALUES($1,$2,$3,$4,$5,$6)',[id,user,'Fixture',{},published?{}:null,published?0:null]);
      const row=await registry.reserve(owner,id,username,'Fixture '+id.slice(0,5));
      await pool.query("UPDATE private.galx_site_domains SET status='pending',plan=$2 WHERE id=$1",[row.id,{kind}]);
    }
    assert.deepEqual((await registry.claimDue([],4,true)).map(r=>r.project_id),[valid]);
    assert.equal((await registry.claimDue([owner],4,false)).length,3);
  });
  await check('rollback preserves checkout and subscription evidence',async()=>{
    const paths=(await pool.query('SELECT user_id,request_id,return_path FROM private.galx_plan_checkouts ORDER BY user_id,request_id')).rows;
    await pool.query(await readFile(new URL('../supabase/rollbacks/20260916003207_billing_canonical_returns.down.sql',import.meta.url),'utf8'));
    assert.deepEqual((await pool.query('SELECT user_id,request_id,return_path FROM private.galx_plan_checkouts ORDER BY user_id,request_id')).rows,paths);
    const before=(await pool.query('SELECT count(*) FROM private.galx_plan_checkouts')).rows[0].count;await pool.query(await readFile(new URL('../supabase/rollbacks/20260912041351_sites_pro_subscription.down.sql',import.meta.url),'utf8'));
    assert.equal((await pool.query('SELECT count(*) FROM private.galx_plan_checkouts')).rows[0].count,before);
  });
  console.log(JSON.stringify({checks,roleDenials:24,externalProviderCalls:0}));
}finally{await pool.end();}
