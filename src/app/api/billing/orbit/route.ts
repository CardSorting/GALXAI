import { NextRequest,NextResponse } from 'next/server';
import { requireAccountIdentity,AccountIdentityError } from '@/lib/auth/accountIdentity';
import { normalizePublicParticipantHandle } from '@/lib/community/participant-handle';
import { getPostgresPool } from '@/lib/db/postgres';
import { getStripeConfig } from '@/lib/stripe/config';
import { StripeEngine } from '@/lib/stripe/stripe';
import { BillingError } from '@/lib/billing/account';
import { checkPaymentOrigin,readPaymentBody,paymentOrigin,hostedPaymentUrl } from '@/lib/billing/payment';
import { cancelOrbit,createOrbitCheckout,orbitOffer,orbitRecords,readOrbitAccess } from '@/lib/billing/orbit';
import { readOrbitWorks } from '@/lib/images/orbit-works';
import { billingPortalConfiguration } from '@/lib/billing/portal';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={ 'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff' };
async function handle(req:NextRequest) {
  try {
    if(req.method==='POST') checkPaymentOrigin(req);
    const user=await requireAccountIdentity(req);
    const pool=getPostgresPool(),stripe=StripeEngine.getInstance().getClient(),config=getStripeConfig();
    if(!pool||!stripe||!config.webhookSecrets.length) throw new BillingError('Orbit is temporarily unavailable. Try again shortly.',503);
    const live=config.secretKey.includes('_live_');
    const body=req.method==='POST'?await readPaymentBody(req):null;
    const rawHandle=body?.handle ?? req.nextUrl.searchParams.get('handle');
    const star=normalizePublicParticipantHandle(rawHandle);
    if(!star) throw new BillingError('Choose a Star to view its Orbit.');
    if(req.method==='GET' && [...req.nextUrl.searchParams.keys()].some(key=>key!=='handle')) throw new BillingError('Invalid Orbit request.');
    const offer=await orbitOffer(pool,star);
    if(!offer) throw new BillingError('This Star does not offer Orbit.',404);
    const records=await orbitRecords(pool,user.id,live,offer.actor_id);
    const statuses=await Promise.all(records.map(async row=>({ row,access:await readOrbitAccess(stripe,row) })));
    const current=statuses.find(item=>item.access.active)||statuses.find(item=>item.access.state!=='canceled')||statuses[0];
    if(req.method==='GET') {
      const active=current?.access.active||false;
      const works=active?await readOrbitWorks(pool,offer.actor_id):[];
      return NextResponse.json({ name:offer.display_name,handle:offer.handle,monthlyUsd:10,testMode:!live,
        checkoutAvailable:!live&&offer.enabled&&offer.livemode===live&&!statuses.some(s=>s.access.state!=='canceled'),
        state:current?.access.state||'none',paidThrough:current?.access.paidThrough||null,
        canManage:Boolean(current),canCancel:Boolean(current&&current.access.state!=='canceled'&&!current.access.cancelAtPeriodEnd),works },{headers});
    }
    if(!body || Object.keys(body).sort().join()!=='action,handle' || typeof body.action!=='string') throw new BillingError('Invalid Orbit request.');
    if(body.action==='checkout') return NextResponse.json(await createOrbitCheckout(pool,stripe,{userId:user.id,handle:star,origin:paymentOrigin(config.appUrl)}),{headers});
    // Management is account + Star scoped. The client never chooses a provider subscription/customer ID.
    const row=current?.row;
    if(!row) throw new BillingError('No Orbit subscription was found.',404);
    if(body.action==='cancel') return NextResponse.json(await cancelOrbit(stripe,row),{headers});
    if(body.action==='portal') {
      await readOrbitAccess(stripe,row);
      const configuration=await billingPortalConfiguration(stripe);
      const session=await stripe.billingPortal.sessions.create({ customer:row.customer_id,configuration,
        return_url:`${paymentOrigin(config.appUrl)}/profile/${offer.handle}` },{timeout:8000,maxNetworkRetries:0});
      return NextResponse.json({url:hostedPaymentUrl(session.url,'billing.stripe.com')},{headers});
    }
    throw new BillingError('Invalid Orbit action.');
  } catch(error) {
    const known=error instanceof BillingError||error instanceof AccountIdentityError;
    return NextResponse.json({error:known?error.message:'Orbit is temporarily unavailable. Try again shortly.'},
      {status:known?error.status:503,headers});
  }
}
export const GET=handle;
export const POST=handle;
