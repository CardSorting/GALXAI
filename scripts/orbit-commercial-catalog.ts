/** Operator-only, explicit write modes. Never imported by application/browser code. */
import Stripe from 'stripe';
import { getPostgresPool } from '../src/lib/db/postgres';

const mode=process.argv[2]||'--inspect';
if(!['--inspect','--archive-legacy','--prepare-catalog'].includes(mode))throw new Error('Use --inspect, --archive-legacy, or --prepare-catalog');
const key=process.env.STRIPE_SECRET_KEY||'';
if(!/^(sk|rk)_(live|test)_/.test(key))throw new Error('Stripe configuration unavailable');
const stripe=new Stripe(key,{apiVersion:'2026-07-29.dahlia',maxNetworkRetries:0,timeout:10000});
const live=key.includes('_live_');
const retiredProducts=new Set(['galx_pro_v1','galx_images_creator_v1','galx_images_studio_v1','galx_images_team_v1','galx_nova_developer_access_v1']);
const objectId=(v:unknown):string|undefined=>typeof v==='string'?v:v&&typeof v==='object'&&'id' in v?String(v.id):undefined;
const subscriptions=[];
for await(const sub of stripe.subscriptions.list({status:'all',limit:100})) subscriptions.push(sub);
const schedules=[];
for await(const schedule of stripe.subscriptionSchedules.list({limit:100})) schedules.push(schedule);
const checkouts=[];
for await(const checkout of stripe.checkout.sessions.list({status:'open',limit:100})) checkouts.push(checkout);
const prices=[];
for await(const price of stripe.prices.list({active:true,limit:100})) if(retiredProducts.has(objectId(price.product)||'')) prices.push(price);
const registrations=[];
for await(const registration of stripe.tax.registrations.list({status:'active',limit:100})) registrations.push({country:registration.country,status:registration.status});
const account=await stripe.accounts.retrieve();
const settings=await stripe.tax.settings.retrieve();
console.log(JSON.stringify({mode:live?'live':'test',subscriptions:subscriptions.length,schedules:schedules.length,openCheckouts:checkouts.length,
  obsoleteActivePrices:prices.map(p=>({id:p.id,product:objectId(p.product),currency:p.currency,amount:p.unit_amount,taxBehavior:p.tax_behavior})),
  tax:{registrations,settingsStatus:settings.status,headOfficeCountry:settings.head_office?.address.country||null,
    defaultTaxCode:settings.defaults.tax_code,defaultTaxBehavior:settings.defaults.tax_behavior||null,
    pendingFields:settings.status_details?.pending?.missing_fields||[],accountCountry:account.country,chargesEnabled:account.charges_enabled,
    detailsSubmitted:account.details_submitted,accountRequirements:account.requirements?.currently_due||[],liveLaunchApproved:false}},null,2));

if(mode==='--archive-legacy') {
  // Stop for a new customer or in-flight payment; do not silently reprice/cancel it.
  if(subscriptions.some(s=>!['canceled','incomplete_expired'].includes(s.status))||schedules.some(s=>['active','not_started'].includes(s.status))||checkouts.length) {
    throw new Error('Customer migration review required before retirement');
  }
  for(const price of prices) await stripe.prices.update(price.id,{active:false});
  let linksClosed=0;
  for await(const link of stripe.paymentLinks.list({active:true,limit:100})) {
    let obsolete=false;
    for await(const line of stripe.paymentLinks.listLineItems(link.id,{limit:100})) if(retiredProducts.has(objectId(line.price?.product)||'')) obsolete=true;
    if(obsolete){await stripe.paymentLinks.update(link.id,{active:false});linksClosed++;}
  }
  console.log(JSON.stringify({archivedPrices:prices.length,closedPaymentLinks:linksClosed,subscriptionsChanged:0,historyDeleted:false}));
}

if(mode==='--prepare-catalog') {
  const pool=getPostgresPool();if(!pool)throw new Error('Database unavailable');
  try {
    const actor=(await pool.query("SELECT actor_id FROM private.galx_star_profiles WHERE handle='veyrasol'")).rows[0]?.actor_id;
    if(!actor)throw new Error('Existing canary Star unavailable; never create a replacement');
    const definitions=[
      {id:'galx_orbit_vanta_v1',name:'Orbit VANTA',amount:1000,lookup:'galx_orbit_vanta_monthly_v1',metadata:{galxRelationship:'orbit-v1',starActor:String(actor),catalogStatus:'pending',checkoutEnabled:'false'}},
      {id:'galx_foundry_v1',name:'Foundry',amount:20000,lookup:'galx_foundry_monthly_v1',metadata:{galxPlan:'team-v1',galxPublicPlan:'foundry',galxSurface:'images',catalogStatus:'pending',checkoutEnabled:'false'}},
    ];
    for(const d of definitions) {
      let product;
      try { product=await stripe.products.retrieve(d.id); }
      catch(e) {if(!(e instanceof Stripe.errors.StripeInvalidRequestError)||e.code!=='resource_missing')throw e;}
      if(!product)product=await stripe.products.create({id:d.id,name:d.name,active:false,metadata:d.metadata},{idempotencyKey:`commercial-product:${d.id}`});
      if(product.name!==d.name||product.active)throw new Error('Existing product needs review before preparation');
      const previous=await stripe.prices.list({product:d.id,lookup_keys:[d.lookup],limit:2});
      if(previous.has_more||previous.data.length>1)throw new Error('Price is not unique');
      let price=previous.data[0];
      if(!price)price=await stripe.prices.create({product:d.id,active:false,currency:'usd',unit_amount:d.amount,
        recurring:{interval:'month'},lookup_key:d.lookup,metadata:d.metadata},{idempotencyKey:`commercial-price:${d.lookup}`});
      if(price.active||price.unit_amount!==d.amount||price.currency!=='usd'||price.recurring?.interval!=='month'||price.recurring.interval_count!==1)throw new Error('Prepared price needs review');
      console.log(JSON.stringify({product:d.name,monthlyUsd:d.amount/100,active:false,livemode:price.livemode}));
    }
  } finally {await pool.end();}
}
