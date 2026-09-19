import { NextRequest, NextResponse } from 'next/server';
import { requireAccountIdentity, AccountIdentityError } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { StripeEngine } from '@/lib/stripe/stripe';
import { getStripeConfig } from '@/lib/stripe/config';
import { BillingError } from '@/lib/billing/account';
import { checkPaymentOrigin, hostedPaymentUrl, paymentOrigin, readPaymentBody } from '@/lib/billing/payment';
import { createDeveloperCheckout, createProCheckout, proPrice } from '@/lib/billing/plan-subscription';
import { DEVELOPER_ACCESS, PRO_PLAN } from '@/lib/billing/pro-plan';
import { SitesFairStore } from '@/lib/sites/fair-store';
import { requirePaidSitesAccess } from '@/lib/sites/paid-access';
import { FairUsageError } from '@/lib/sites/fair-policy';
import { billingPortalConfiguration } from '@/lib/billing/portal';
import { readSubscriptionSummary } from '@/lib/billing/subscription-summary';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={ 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff' };
async function handle(req:NextRequest) {
  try {
    if(req.method==='POST')checkPaymentOrigin(req);
    const actor=await requireAccountIdentity(req);
    if(req.nextUrl.search)throw new BillingError('Invalid plan request.');
    const body=req.method==='POST'?await readPaymentBody(req):null;
    if (body?.action === 'developer_checkout' && !DEVELOPER_ACCESS.checkoutEnabled) {
      throw new BillingError('Self-service developer access is no longer available.', 410);
    }
    const pool=getPostgresPool(),stripe=StripeEngine.getInstance().getClient(),config=getStripeConfig();
    if(!pool||!stripe||!config.webhookSecrets.length)throw new BillingError('Plans are temporarily unavailable. Try again shortly.',503);
    const customer=(await pool.query('SELECT stripe_customer_id FROM galx_stripe_customers WHERE user_id=$1',[actor.id])).rows[0]?.stripe_customer_id;
    // Cancellation and payment management remain accessible during a Sites pause.
    if(body?.action==='portal'&&Object.keys(body).join()==='action') {
      if(!customer||customer.startsWith('cus_mock_'))throw new BillingError('Your billing profile becomes available when you start a checkout.',404);
      const configuration=await billingPortalConfiguration(stripe);
      const session=await stripe.billingPortal.sessions.create({customer,configuration,return_url:`${paymentOrigin(config.appUrl)}/billing/plan`},{timeout:8000,maxNetworkRetries:0});
      return NextResponse.json({url:hostedPaymentUrl(session.url,'billing.stripe.com')},{headers});
    }
    if (body?.action === 'developer_checkout') {
      if (Object.keys(body).sort().join() !== 'action,requestId' || typeof body.requestId !== 'string') throw new BillingError('Invalid plan request.');
      return NextResponse.json(await createDeveloperCheckout(pool, stripe, { userId: actor.id, requestId: body.requestId, origin: paymentOrigin(config.appUrl) }), { headers });
    }
    const policy=await new SitesFairStore(pool).policy();
    if(req.method==='GET') {
      const summary=readSubscriptionSummary(stripe,customer,policy.paid_price_ids);
      let access:'included'|'paid_plan_required'|'unavailable'='unavailable';
      try { await requirePaidSitesAccess(pool,stripe,actor.id,policy);access='included'; }
      catch(e){if(e instanceof FairUsageError&&e.status===403)access='paid_plan_required';}
      const subscription=await summary;
      let checkoutAvailable=false;
      if(access==='paid_plan_required'&&['none','canceled'].includes(subscription.state)) {
        try{await proPrice(stripe,policy);checkoutAvailable=true;}catch{}
      }
      return NextResponse.json({plan:PRO_PLAN,access,checkoutAvailable,hasPaymentProfile:Boolean(customer&&!customer.startsWith('cus_mock_')),subscription},{headers});
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
