/** Private operator provisioning. Creates a catalog and portal, never a customer,
 * subscription, invoice, payment or tax registration. Activation is separate. */
import { writeFile } from 'node:fs/promises';
import Stripe from 'stripe';
import { PRO_LOOKUP_KEY } from '../src/lib/billing/plan-subscription';
import { PRO_PLAN } from '../src/lib/billing/pro-plan';
import { readFairLimits } from '../src/lib/sites/fair-policy';
import { requireSitesRelayPreflight } from '../src/lib/billing/sites-relay-preflight';
const [action,file,...extra]=process.argv.slice(2);
if(action!=='--prepare'||!file||extra.length||!file.startsWith('/'))throw Error('Use --prepare /absolute/private/policy.json');
if(!/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY||''))throw Error('Existing live billing authority required');
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY!,{apiVersion:'2026-07-29.dahlia',maxNetworkRetries:0,timeout:10000});
const adminKey=process.env.GALX_SITES_RELAY_ADMIN_KEY||process.env.RELAY_ADMIN_API_KEYS?.split(',').map(s=>s.trim()).find(Boolean);
await requireSitesRelayPreflight({url:'https://relay.galx.ai',adminKey,model:'gpt-5.6-luna',maxOutputTokens:2048,profile:'sites-local-v1'});
const endpoints=await stripe.webhookEndpoints.list({limit:100});
const needed=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired','invoice.paid','invoice.payment_failed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','charge.refunded'];
if(!endpoints.data.some(e=>e.url==='https://galx.ai/api/stripe/webhook'&&e.status==='enabled'&&e.livemode&&needed.every(t=>e.enabled_events.includes('*')||e.enabled_events.includes(t as any))))throw Error('Required production webhook is not ready');
let product:Stripe.Product;
try{product=await stripe.products.retrieve('galx_pro_v1');}
catch(e){if((e as any).statusCode!==404)throw e;product=await stripe.products.create({id:'galx_pro_v1',name:PRO_PLAN.name,
  description:'Sites creation and publishing for one account, with fair usage included. API and image usage billed separately.',metadata:{galxPlan:'pro-v1'}},{idempotencyKey:'galx-pro-product-v1'});}
if(!product.active||product.name!==PRO_PLAN.name||product.metadata.galxPlan!=='pro-v1')throw Error('Existing Pro product needs review');
const prices=await stripe.prices.list({lookup_keys:[PRO_LOOKUP_KEY],limit:2});
if(prices.has_more||prices.data.length>1)throw Error('Ambiguous Pro price');
const price=prices.data[0]||await stripe.prices.create({product:product.id,unit_amount:PRO_PLAN.monthlyPriceUsd*100,currency:'usd',recurring:{interval:'month'},lookup_key:PRO_LOOKUP_KEY,metadata:{galxPlan:'pro-v1'}},{idempotencyKey:'galx-pro-price-v1'});
if(!price.active||!price.livemode||price.product!==product.id||price.unit_amount!==2000||price.currency!=='usd'||price.recurring?.interval!=='month'||price.recurring.interval_count!==1)throw Error('Existing Pro price does not match approved launch terms');
const portals=await stripe.billingPortal.configurations.list({active:true,limit:100});
if(portals.has_more)throw Error('Portal catalogue needs review');
let portal=portals.data.find(p=>p.metadata?.galxPlan==='pro-v1');
if(!portal)portal=await stripe.billingPortal.configurations.create({business_profile:{headline:'Manage your GALX Pro subscription',privacy_policy_url:'https://galx.ai/privacy',terms_of_service_url:'https://galx.ai/terms'},
  features:{invoice_history:{enabled:true},payment_method_update:{enabled:true},subscription_cancel:{enabled:true,mode:'at_period_end'},subscription_update:{enabled:false}},metadata:{galxPlan:'pro-v1'},default_return_url:'https://galx.ai/billing/plan'},
  {idempotencyKey:'galx-pro-portal-v1'});
if(!portal.features.subscription_cancel.enabled||portal.features.subscription_cancel.mode!=='at_period_end'||portal.features.subscription_update.enabled)throw Error('Portal does not preserve launch terms');
const limits=readFairLimits({
  baseline_message_threshold:20,allowance_window_seconds:86400,pool_max_outstanding:2,baseline_protected_slots:1,
  account_max_outstanding:1,account_max_continuation_outstanding:1,flow_window_seconds:60,pool_max_attempts_per_flow_window:6,
  continuation_max_attempts_per_flow_window:3,account_max_attempts_per_flow_window:2,active_continuation_demand_ttl_seconds:120,
  snapshot_ttl_seconds:5,refresh_timeout_milliseconds:2000,admission_deadline_milliseconds:4000,dispatch_grant_expiry_milliseconds:3000,
  provider_max_attempts_per_logical_invocation:1,request_deadline_seconds:45,
});
await writeFile(file,JSON.stringify({mode:'enforce',pool_id:'sites-shared-delivery',paid_price_ids:[price.id],limits},null,2)+'\n',{mode:0o600});
const tax=await stripe.tax.registrations.list({status:'active',limit:100});
console.log(JSON.stringify({product:product.id,price:price.id,monthlyUsd:20,portal:portal.id,webhookReady:true,contractReady:true,policyFile:file,
  productionPolicyActivated:false,customersCreated:0,paymentsCreated:0,activeTaxRegistrations:tax.data.length,automaticTaxEnabled:false}));
