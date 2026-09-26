import { NextRequest, NextResponse } from 'next/server';
import { requireAccountIdentity, AccountIdentityError } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { StripeEngine } from '@/lib/stripe/stripe';
import { getStripeConfig } from '@/lib/stripe/config';
import { BillingError } from '@/lib/billing/account';
import { checkPaymentOrigin, hostedPaymentUrl, paymentOrigin, readPaymentBody } from '@/lib/billing/payment';
import { createImagePlanCheckout, imagePlanPrice } from '@/lib/billing/plan-subscription';
import { readImagePlanSummary } from '@/lib/billing/image-allowance';
import { PUBLIC_IMAGE_PLAN_OFFERS } from '@/lib/data/image-plan-offers';
import { billingPortalConfiguration } from '@/lib/billing/portal';
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
    if(body && body.action!=='portal' && (body.action!=='checkout'||body.plan!=='foundry')) {
      throw new BillingError('This purchase option has been retired. Public discovery remains available.',410);
    }
    const pool=getPostgresPool(),stripe=StripeEngine.getInstance().getClient(),config=getStripeConfig();
    if(!pool||!stripe||!config.webhookSecrets.length)throw new BillingError('Billing is temporarily unavailable. Try again shortly.',503);
    const customer=(await pool.query('SELECT stripe_customer_id FROM galx_stripe_customers WHERE user_id=$1',[actor.id])).rows[0]?.stripe_customer_id;
    if(body?.action==='portal'&&Object.keys(body).join()==='action') {
      if(!customer||customer.startsWith('cus_mock_'))throw new BillingError('No billing profile was found.',404);
      const configuration=await billingPortalConfiguration(stripe);
      const session=await stripe.billingPortal.sessions.create({customer,configuration,return_url:`${paymentOrigin(config.appUrl)}/billing/plan`},{timeout:8000,maxNetworkRetries:0});
      return NextResponse.json({url:hostedPaymentUrl(session.url,'billing.stripe.com')},{headers});
    }
    if(req.method==='GET') {
      const imageSubscription=await readImagePlanSummary(actor.id,pool);
      let checkoutAvailable=false;
      if(!config.secretKey.includes('_live_')&&['none','canceled'].includes(imageSubscription.state)) {
        try { checkoutAvailable=!(await imagePlanPrice(stripe,'max')).livemode; } catch { /* Unconfigured test checkout remains closed. */ }
      }
      const offers=PUBLIC_IMAGE_PLAN_OFFERS.map(offer=>({id:offer.id,name:offer.name,audience:offer.audience,
        monthlyPriceUsd:offer.monthlyPrice,allowance:offer.allowance,checkoutAvailable}));
      return NextResponse.json({access:'unavailable',checkoutAvailable,offers,
        hasPaymentProfile:Boolean(customer&&!customer.startsWith('cus_mock_')),
        subscription:{state:'none',periodEnd:null,endsAt:null},imageSubscription},{headers});
    }
    if(!body||Object.keys(body).sort().join()!=='action,plan,requestId'||typeof body.requestId!=='string')throw new BillingError('Invalid plan request.');
    if(config.secretKey.includes('_live_'))throw new BillingError('New subscriptions are not available yet.',503);
    return NextResponse.json(await createImagePlanCheckout(pool,stripe,'max',{
      userId:actor.id,requestId:body.requestId,origin:paymentOrigin(config.appUrl),
    }),{headers});
  } catch(error) {
    const known=error instanceof AccountIdentityError||error instanceof BillingError;
    return NextResponse.json({error:known?error.message:'Billing is temporarily unavailable. Try again shortly.'},{status:known?error.status:503,headers});
  }
}
export const GET=handle;
export const POST=handle;
