import assert from 'node:assert/strict';
import test from 'node:test';
import type Stripe from 'stripe';
import { matchesOrbitSubscription,readOrbitAccess,cancelOrbit,type OrbitRecord } from '../src/lib/billing/orbit';
import { requireTestSubscriptionCheckout } from '../src/lib/billing/commercial-launch';
import { publicStarHandle,historicalStarHandle,publicStarIdentity } from '../src/lib/community/star-public-identity';
import { getAllStarRoster } from '../src/lib/stars/star-cohort';
import { IMAGE_PLAN_CATALOG } from '../src/lib/billing/image-plan-catalog';
import { PUBLIC_IMAGE_PLAN_OFFERS } from '../src/lib/data/image-plan-offers';
import { createProCheckout } from '../src/lib/billing/plan-subscription';
import { NextRequest } from 'next/server';
import { GET as getOrbit,POST as postOrbit } from '../src/app/api/billing/orbit/route';
import { isPublicProductPath } from '../src/lib/security/preview-policy';

const row:OrbitRecord={subscription_id:'sub_orbit',checkout_id:'attempt',user_id:'owner',actor_id:'star',customer_id:'cus_orbit',price_id:'price_orbit',livemode:false,revoked:false};
const now=Date.now(),start=Math.floor(now/1000)-3600,end=Math.floor(now/1000)+3600;
function fixture() {
  const sub={id:'sub_orbit',customer:'cus_orbit',livemode:false,status:'active',pause_collection:null,cancel_at_period_end:false,
    metadata:{galxRelationship:'orbit-v1',orbitCheckout:'attempt',starActor:'star'},
    items:{data:[{quantity:1,price:{id:'price_orbit',currency:'usd',unit_amount:1000,recurring:{interval:'month',interval_count:1}}}]},
    latest_invoice:{id:'in_orbit',status:'paid',livemode:false,currency:'usd',subtotal:1000,amount_paid:1000,total:1000,customer:'cus_orbit',parent:{subscription_details:{subscription:'sub_orbit'}}}};
  const line={pricing:{price_details:{price:'price_orbit'}},parent:{subscription_item_details:{subscription:'sub_orbit',proration:false}},period:{start,end}};
  const intent={status:'succeeded',livemode:false,customer:'cus_orbit',latest_charge:{paid:true,disputed:false,amount_refunded:0}};
  const writes:unknown[]=[];
  const stripe={subscriptions:{retrieve:async()=>sub,update:async(...args:unknown[])=>{writes.push(args);return sub;}},
    invoices:{listLineItems:async function*(){yield line;}},
    invoicePayments:{list:async function*(){yield {amount_paid:1000,payment:{payment_intent:'pi_orbit'}};}},
    paymentIntents:{retrieve:async()=>intent}} as unknown as Stripe;
  return {sub,line,intent,stripe,writes};
}
test('VANTA alias is reversible and preserves all twelve real practices',()=>{
  assert.equal(publicStarHandle('VeyraSol'),'vanta');assert.equal(historicalStarHandle('vanta'),'veyrasol');
  const original={handle:'veyrasol',displayName:'Veyra Sol',id:'immutable'};
  assert.deepEqual(publicStarIdentity(original),{handle:'vanta',displayName:'VANTA',id:'immutable'});
  assert.equal(original.handle,'veyrasol');
  assert.equal(getAllStarRoster().length,12);assert(!getAllStarRoster().some(s=>s.handle==='astra'));
});
test('Foundry is the only new creation offer; live recurring checkout remains denied',()=>{
  assert.deepEqual(PUBLIC_IMAGE_PLAN_OFFERS.map(p=>[p.id,p.monthlyPrice]),[['foundry',200]]);
  assert.deepEqual(IMAGE_PLAN_CATALOG.filter(p=>p.checkoutEnabled).map(p=>p.publicId),['foundry']);
  assert.throws(()=>requireTestSubscriptionCheckout(true));assert.doesNotThrow(()=>requireTestSubscriptionCheckout(false));
});
test('Sites checkout is retired without any provider or database call',async()=>{
  await assert.rejects(createProCheckout(null as never,null as never,null as never,null as never),/closed/);
});
test('Orbit management requires account verification, not developer enrollment, and has no namespace wildcard',()=>{
  assert.equal(isPublicProductPath('/api/billing/orbit'),true);
  assert.equal(isPublicProductPath('/api/billing/orbit/admin'),false);
});
test('paid current invoice with matching identity grants only Orbit access',async()=>{
  const f=fixture();assert.equal(matchesOrbitSubscription(f.sub as unknown as Stripe.Subscription,row),true);
  assert.deepEqual(await readOrbitAccess(f.stripe,row,now),{active:true,paidThrough:new Date(end*1000).toISOString(),cancelAtPeriodEnd:false,state:'active'});
  assert.equal(f.writes.length,0);
});
for(const [field,value] of [['customer_id','other'],['actor_id','other'],['checkout_id','other'],['price_id','other'],['livemode',true],['subscription_id','other']] as const) {
  test(`cannot reuse Orbit for a different ${field}`,async()=>{
    const f=fixture();await assert.rejects(readOrbitAccess(f.stripe,{...row,[field]:value},now));
  });
}
for(const state of ['trialing','past_due','unpaid','canceled','incomplete','incomplete_expired','paused']) {
  test(`${state} cannot read patron work`,async()=>{const f=fixture();f.sub.status=state;assert.equal((await readOrbitAccess(f.stripe,row,now)).active,false);});
}
test('expiry, refund, dispute, revocation and unpaid invoices deny access',async()=>{
  let f=fixture();f.line.period.end=start;assert.equal((await readOrbitAccess(f.stripe,row,now)).active,false);
  f=fixture();f.intent.latest_charge.amount_refunded=1;assert.equal((await readOrbitAccess(f.stripe,row,now)).active,false);
  f=fixture();f.intent.latest_charge.disputed=true;assert.equal((await readOrbitAccess(f.stripe,row,now)).active,false);
  f=fixture();assert.equal((await readOrbitAccess(f.stripe,{...row,revoked:true},now)).active,false);
  f=fixture();f.sub.latest_invoice.status='open';assert.equal((await readOrbitAccess(f.stripe,row,now)).active,false);
});
test('period-end cancellation retains paid access and never immediately deletes subscription',async()=>{
  const f=fixture();await cancelOrbit(f.stripe,row);
  assert.deepEqual((f.writes[0] as unknown[])[1],{cancel_at_period_end:true});
  f.sub.cancel_at_period_end=true;assert.equal((await readOrbitAccess(f.stripe,row,now)).state,'ending');
  await cancelOrbit(f.stripe,row);assert.equal(f.writes.length,1);
});
test('provider outages fail closed and issue no mutations',async()=>{
  const f=fixture();f.stripe.subscriptions.retrieve=async()=>{throw new Error('offline');};
  await assert.rejects(readOrbitAccess(f.stripe,row,now));assert.equal(f.writes.length,0);
});
test('anonymous Orbit requests and cross-origin writes fail before provider access',async()=>{
  const read=await getOrbit(new NextRequest('https://galx.ai/api/billing/orbit?handle=vanta'));
  assert.equal(read.status,401);assert.equal(read.headers.get('cache-control'),'private, no-store');
  const write=await postOrbit(new NextRequest('https://galx.ai/api/billing/orbit',{method:'POST',headers:{'content-type':'application/json',origin:'https://attacker.example'},body:JSON.stringify({action:'cancel',handle:'vanta'})}));
  assert.equal(write.status,403);
  assert.deepEqual(Object.keys(await write.json()),['error']);
});
