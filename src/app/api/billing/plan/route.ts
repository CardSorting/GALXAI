import { NextRequest, NextResponse } from 'next/server';
import { requireAccountIdentity, AccountIdentityError } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { StripeEngine } from '@/lib/stripe/stripe';
import { getStripeConfig } from '@/lib/stripe/config';
import { BillingError } from '@/lib/billing/account';
import { checkPaymentOrigin, hostedPaymentUrl, paymentOrigin, readPaymentBody } from '@/lib/billing/payment';
import { createDeveloperCheckout, createImagePlanCheckout, createProCheckout, imagePlanPrice, proPrice } from '@/lib/billing/plan-subscription';
import { DEVELOPER_ACCESS, PRO_PLAN } from '@/lib/billing/pro-plan';
import { IMAGE_PLAN_BY_ID, IMAGE_PLAN_CATALOG, type ImagePlanId } from '@/lib/billing/image-plan-catalog';
import { readImagePlanSummary } from '@/lib/billing/image-allowance';
import { approvedAllowanceFor, IMAGE_ALLOWANCE_CONFIGURATION } from '@/lib/billing/image-allowance-config';
import { SitesFairStore } from '@/lib/sites/fair-store';
import { requirePaidSitesAccess } from '@/lib/sites/paid-access';
import { FairUsageError } from '@/lib/sites/fair-policy';
import { billingPortalConfiguration } from '@/lib/billing/portal';
import { readSubscriptionSummary } from '@/lib/billing/subscription-summary';
import type { SubscriptionSummary } from '@/lib/billing/plan-status';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={ 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff' };
const publicOffers = [
  { id: 'pro' as const, name: PRO_PLAN.name, audience: 'For the GALX Sites workspace.', monthlyPriceUsd: PRO_PLAN.monthlyPriceUsd, allowance: null },
  ...IMAGE_PLAN_CATALOG.map(plan => {
    const allowance = approvedAllowanceFor(IMAGE_ALLOWANCE_CONFIGURATION, plan.planKey);
    return { id: plan.publicId, name: plan.name.replace('GALX Images — ', ''), audience: plan.audience,
      monthlyPriceUsd: plan.monthlyPriceUsd, allowance: allowance ? {
        monthlyUnits: allowance.monthlyUnits, standardOutputUnits: allowance.standardOutputUnits,
        hdOutputUnits: allowance.hdOutputUnits,
      } : null };
  }),
];
const imagePlanByPublicId = new Map<string, (typeof IMAGE_PLAN_CATALOG)[number]>(IMAGE_PLAN_CATALOG.map(plan => [plan.publicId, plan]));
function hasConfiguredImageAllowance(planId: ImagePlanId): boolean {
  return approvedAllowanceFor(IMAGE_ALLOWANCE_CONFIGURATION, IMAGE_PLAN_BY_ID[planId].planKey) !== null;
}
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
    if(req.method==='GET') {
      let access:'included'|'paid_plan_required'|'unavailable'='unavailable';
      let policy;
      try { policy=await new SitesFairStore(pool).policy(); }
      catch { /* Sites policy availability does not disable private Image plans. */ }
      let subscription: SubscriptionSummary = { state: 'unavailable', periodEnd: null, endsAt: null };
      let proOfferAvailable = false;
      if (policy) {
        try {
          await requirePaidSitesAccess(pool,stripe,actor.id,policy);
          access='included';
        } catch(e) { if(e instanceof FairUsageError&&e.status===403) access='paid_plan_required'; }
        try {
          const currentProPrice = await proPrice(stripe, policy);
          subscription = await readSubscriptionSummary(stripe,customer,[currentProPrice.id]);
          proOfferAvailable = access !== 'unavailable' && ['none','canceled'].includes(subscription.state);
        } catch { /* Keep the Sites plan unavailable without hiding Image offers. */ }
      }
      const imageSubscription = await readImagePlanSummary(actor.id,pool);
      const checks = await Promise.all(publicOffers.map(async offer => {
        try {
          if (offer.id === 'pro') return proOfferAvailable;
          if (!['none','canceled'].includes(imageSubscription.state)) return false;
          const imagePlan = imagePlanByPublicId.get(offer.id);
          if (!imagePlan || !hasConfiguredImageAllowance(imagePlan.id)) return false;
          await imagePlanPrice(stripe,imagePlan.id);
          return true;
        } catch { return false; }
      }));
      const offers = publicOffers.map((offer,index) => ({ ...offer, checkoutAvailable: checks[index] }));
      return NextResponse.json({plan:PRO_PLAN,access,checkoutAvailable:offers.some(offer=>offer.checkoutAvailable),offers,hasPaymentProfile:Boolean(customer&&!customer.startsWith('cus_mock_')),subscription,imageSubscription},{headers});
    }
    if(!body||!['action,requestId','action,plan,requestId'].includes(Object.keys(body).sort().join())||body.action!=='checkout'||typeof body.requestId!=='string')throw new BillingError('Invalid plan request.');
    const requestedPlan = body.plan === undefined ? 'pro' : body.plan;
    if (typeof requestedPlan !== 'string' || (requestedPlan !== 'pro' && !imagePlanByPublicId.has(requestedPlan))) throw new BillingError('Invalid plan request.');
    if (requestedPlan !== 'pro' && !hasConfiguredImageAllowance(imagePlanByPublicId.get(requestedPlan)!.id)) {
      throw new BillingError('Private creation plans are temporarily unavailable. Try again shortly.', 503);
    }
    const input={userId:actor.id,requestId:body.requestId,origin:paymentOrigin(config.appUrl)};
    let checkout;
    if (requestedPlan === 'pro') {
      const policy = await new SitesFairStore(pool).policy();
      checkout = createProCheckout(pool,stripe,policy,input);
    } else {
      checkout = createImagePlanCheckout(pool,stripe,imagePlanByPublicId.get(requestedPlan)!.id,input);
    }
    return NextResponse.json(await checkout,{headers});
  } catch(e) {
    const known=e instanceof AccountIdentityError||e instanceof BillingError;
    return NextResponse.json({error:known?e.message:'Plans are temporarily unavailable. Try again shortly.'},{status:known?e.status:503,headers});
  }
}
export const GET=handle;
export const POST=handle;
