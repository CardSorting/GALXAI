import { NextRequest, NextResponse } from 'next/server';
import { requireAccountIdentity, AccountIdentityError } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { StripeEngine } from '@/lib/stripe/stripe';
import { getStripeConfig } from '@/lib/stripe/config';
import { BillingError } from '@/lib/billing/account';
import { checkPaymentOrigin, hostedPaymentUrl, paymentOrigin, readPaymentBody } from '@/lib/billing/payment';
import { createProCheckout, proPrice } from '@/lib/billing/plan-subscription';
import { PRO_PLAN } from '@/lib/billing/pro-plan';
import { SitesFairStore } from '@/lib/sites/fair-store';
import { requirePaidSitesAccess } from '@/lib/sites/paid-access';
import { FairUsageError } from '@/lib/sites/fair-policy';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={ 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff' };
async function handle(req:NextRequest) {
  try {
    if(req.method==='POST')checkPaymentOrigin(req);
    const actor=await requireAccountIdentity(req);
    if(req.nextUrl.search)throw new BillingError('Invalid plan request.');
    const pool=getPostgresPool(),stripe=StripeEngine.getInstance().getClient(),config=getStripeConfig();
    if(!pool||!stripe||!config.webhookSecrets.length)throw new BillingError('Plans are temporarily unavailable. Try again shortly.',503);
    const customer=(await pool.query('SELECT stripe_customer_id FROM galx_stripe_customers WHERE user_id=$1',[actor.id])).rows[0]?.stripe_customer_id;
    // Cancellation and payment management remain accessible during a Sites pause.
    const body=req.method==='POST'?await readPaymentBody(req):null;
    if(body?.action==='portal'&&Object.keys(body).join()==='action') {
      if(!customer)throw new BillingError('No subscription to manage yet.',404);
      const configurations=await stripe.billingPortal.configurations.list({active:true,limit:100},{timeout:4000,maxNetworkRetries:0});
      const portal=configurations.data.find(p=>p.metadata?.galxPlan==='pro-v1');
      if(!portal||!portal.features.subscription_cancel.enabled)throw new BillingError('Subscription management is temporarily unavailable.',503);
      const session=await stripe.billingPortal.sessions.create({customer,configuration:portal.id,return_url:`${paymentOrigin(config.appUrl)}/billing#plan`},{timeout:8000,maxNetworkRetries:0});
      return NextResponse.json({url:hostedPaymentUrl(session.url,'billing.stripe.com')},{headers});
    }
    const policy=await new SitesFairStore(pool).policy();
    if(req.method==='GET') {
      let access:'included'|'paid_plan_required'|'unavailable'='unavailable';
      try { await requirePaidSitesAccess(pool,stripe,actor.id,policy);access='included'; }
      catch(e){if(e instanceof FairUsageError&&e.status===403)access='paid_plan_required';}
      let checkoutAvailable=false;try{await proPrice(stripe,policy);checkoutAvailable=true;}catch{}
      return NextResponse.json({plan:PRO_PLAN,access,checkoutAvailable,hasPaymentProfile:Boolean(customer)},{headers});
    }
    if(!body||Object.keys(body).sort().join()!=='action,requestId'||body.action!=='checkout'||typeof body.requestId!=='string')throw new BillingError('Invalid plan request.');
    return NextResponse.json(await createProCheckout(pool,stripe,policy,{userId:actor.id,requestId:body.requestId,origin:paymentOrigin(config.appUrl)}),{headers});
  } catch(e) {
    const known=e instanceof AccountIdentityError||e instanceof BillingError;
    return NextResponse.json({error:known?e.message:'Plans are temporarily unavailable. Try again shortly.'},{status:known?e.status:503,headers});
  }
}
export const GET=handle;
export const POST=handle;
