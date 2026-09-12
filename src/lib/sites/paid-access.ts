import type { Pool } from 'pg';
import type Stripe from 'stripe';
import { FairUsageError } from './fair-policy';
import type { FairPolicy, PaidAccess } from './fair-store';

/** Provider-read evidence only. Claims, customer metadata, wallet deposits and
 * editable organization tiers never grant Sites. No positive process-local cache. */
export async function requirePaidSitesAccess(pool: Pick<Pool,'connect'>, stripe: Stripe | null, account: string, policy: FairPolicy, now=Date.now()):Promise<PaidAccess>{
  if(!stripe)throw new FairUsageError(503,'membership_authority');
  const db=await pool.connect();let customer:string|undefined;
  try { customer=(await db.query('SELECT stripe_customer_id FROM public.galx_stripe_customers WHERE user_id=$1',[account])).rows[0]?.stripe_customer_id; }
  finally {db.release();}
  if(!customer)throw new FairUsageError(403,'paid_plan_required');
  // Bounded read on the existing billing integration, before any admission lock.
  const subscriptions=await stripe.subscriptions.list({customer,status:'active',limit:100,expand:['data.latest_invoice']},{timeout:4000,maxNetworkRetries:0});
  for(const subscription of subscriptions.data){
    const customerId=typeof subscription.customer==='string'?subscription.customer:subscription.customer.id;
    const invoice=subscription.latest_invoice;
    if(customerId!==customer||subscription.status!=='active'||subscription.pause_collection||!invoice||typeof invoice==='string'||invoice.status!=='paid'||invoice.amount_paid<=0)continue;
    const invoiceCustomer=typeof invoice.customer==='string'?invoice.customer:invoice.customer?.id;
    if(invoiceCustomer!==customer)continue;
    for(const item of subscription.items.data){
      if(!policy.paid_price_ids.includes(item.price.id)||!item.price.recurring||!item.quantity||item.quantity<1)continue;
      const paidLine=invoice.lines.data.some(line=>{
        const price=line.pricing?.price_details?.price;
        const priceId=typeof price==='string'?price:price?.id;
        return priceId===item.price.id&&line.parent?.subscription_item_details?.subscription_item===item.id&&
          line.amount>0&&line.period.start*1000<=now&&line.period.end*1000>now;
      });
      if(!paidLine)continue;
      const end=item.current_period_end*1000;
      if(item.current_period_start*1000<=now&&end>now) return {accountId:account,validUntil:Math.min(end,now+15000),policyRevision:policy.revision};
    }
  }
  // An unexpectedly large catalogue cannot turn an incomplete read into a denial
  // or guess a tier. Operations can investigate; the public gets unavailable.
  if(subscriptions.has_more)throw new FairUsageError(503,'membership_incomplete');
  throw new FairUsageError(403,'paid_plan_required');
}
