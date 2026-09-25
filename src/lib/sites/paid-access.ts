import type { Pool } from 'pg';
import type Stripe from 'stripe';
import { FairUsageError } from './fair-policy';
import type { FairPolicy, PaidAccess } from './fair-store';
import { PRO_PRODUCT_ID } from '../billing/plan-subscription';

const stripeObjectId = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : (value as { id?: string } | null)?.id;

/** Explicit operator grants are read from current server-managed account data.
 * JWT claims, user metadata, staff roles and editable tiers are not authority. */
export async function hasComplimentaryProAccess(pool: Pick<Pool,'connect'>, account: string): Promise<boolean> {
  const db = await pool.connect();
  try {
    const isAuthAccount = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(account);
    if (isAuthAccount) {
      const result = await db.query(`SELECT EXISTS(SELECT 1 FROM auth.users WHERE id=$1::uuid
        AND raw_app_meta_data->'galx_pro'='true'::jsonb AND email_confirmed_at IS NOT NULL AND is_anonymous=false
        AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<=statement_timestamp())) AS granted`, [account]);
      if (result.rows[0]?.granted === true) return true;
    }

    // Autonomous Stars do not require an auth.users row. Their Pro access is
    // an explicit administrative entitlement, never a purchase or Stripe row.
    const administrative = await db.query(`SELECT EXISTS(
      SELECT 1
      FROM private.galx_administrative_entitlements AS entitlement
      JOIN private.galx_account_identities AS identity_row
        ON identity_row.account_id = entitlement.account_id
      WHERE entitlement.account_id = $1
        AND entitlement.entitlement_key = 'pro-v1'
        AND entitlement.source = 'administrative'
        AND identity_row.account_class = 'autonomous'
        AND entitlement.revoked_at IS NULL
        AND entitlement.starts_at <= statement_timestamp()
        AND (entitlement.ends_at IS NULL OR entitlement.ends_at > statement_timestamp())
    ) AS granted`, [account]);
    return administrative.rows[0]?.granted === true;
  } finally { db.release(); }
}

/** Current complimentary grant or verified paid coverage; no positive cache. */
export async function requirePaidSitesAccess(pool: Pick<Pool,'connect'>, stripe: Stripe | null, account: string, policy: FairPolicy, now=Date.now()):Promise<PaidAccess>{
  if(await hasComplimentaryProAccess(pool,account)) return {accountId:account,validUntil:now+15000,policyRevision:policy.revision,tier:'pro'};
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
      // The Sites fair-use price list may contain other GALX consumer prices
      // for checkout validation. Only the GALX Pro product grants Sites access.
      if(stripeObjectId(item.price.product)!==PRO_PRODUCT_ID||!policy.paid_price_ids.includes(item.price.id)||!item.price.recurring||!item.quantity||item.quantity<1)continue;
      const paidLine=invoice.lines.data.some(line=>{
        const price=line.pricing?.price_details?.price;
        const priceId=typeof price==='string'?price:price?.id;
        return priceId===item.price.id&&line.parent?.subscription_item_details?.subscription_item===item.id&&
          line.amount>0&&line.period.start*1000<=now&&line.period.end*1000>now;
      });
      if(!paidLine)continue;
      // A paid invoice can remain 'paid' after a refund or dispute. Verify its
      // settled payment as well; never convert returned money into entitlement.
      const payments=await stripe.invoicePayments.list({invoice:invoice.id,status:'paid',limit:100,
        expand:['data.payment.payment_intent.latest_charge','data.payment.charge']},{timeout:4000,maxNetworkRetries:0});
      if(payments.has_more)throw new FairUsageError(503,'membership_incomplete');
      let settled=0;
      for(const payment of payments.data){
        const intent=payment.payment.payment_intent;
        const charge=payment.payment.type==='charge'?payment.payment.charge:
          intent&&typeof intent!=='string'?intent.latest_charge:null;
        if(!charge||typeof charge==='string')throw new FairUsageError(503,'membership_payment_evidence');
        const chargeCustomer=typeof charge.customer==='string'?charge.customer:charge.customer?.id;
        if(chargeCustomer!==customer||!charge.paid||!charge.captured||charge.disputed||charge.refunded||charge.amount_refunded>0)continue;
        settled+=Math.min(payment.amount_paid||0,charge.amount);
      }
      if(settled<invoice.amount_paid)continue;
      const end=item.current_period_end*1000;
      if(item.current_period_start*1000<=now&&end>now) return {accountId:account,validUntil:Math.min(end,now+15000),policyRevision:policy.revision,tier:'pro'};
    }
  }
  // An unexpectedly large catalogue cannot turn an incomplete read into a denial
  // or guess a tier. Operations can investigate; the public gets unavailable.
  if(subscriptions.has_more)throw new FairUsageError(503,'membership_incomplete');
  throw new FairUsageError(403,'paid_plan_required');
}
