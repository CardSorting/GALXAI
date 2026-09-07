/** Production transport probe: creates an unpaid checkout, then expires it.
 * Never confirms a PaymentIntent, submits card details, or grants credit. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { getPostgresPool, closePostgresPool } from '../src/lib/db/postgres';
import { StripeEngine } from '../src/lib/stripe/stripe';
import { createAccountCheckout } from '../src/lib/billing/checkout';
const path = '/tmp/galx-live-checkout-probe.json';
const pool = getPostgresPool();
const stripe = StripeEngine.getInstance().getClient();
assert(pool && stripe,'Billing configuration is required');
try {
  if (process.argv.includes('--create')) {
    const userId = `billing_release_probe_${randomUUID()}`;
    const result = await createAccountCheckout(pool,stripe,{userId,email:'billing-release-probe@example.invalid',amount:1,requestId:randomUUID(),surface:'keys',origin:'https://galx.ai'});
    writeFileSync(path,JSON.stringify({userId,...result}),{mode:0o600});
    const checkout = await stripe.checkout.sessions.retrieve(result.sessionId);
    const customer = typeof checkout.customer === 'string' ? checkout.customer : checkout.customer?.id;
    assert(customer);
    const portal = await stripe.billingPortal.sessions.create({ customer, return_url: 'https://galx.ai/billing' });
    assert.equal(new URL(portal.url).hostname,'billing.stripe.com');
    console.log('Real Stripe checkout and customer portal sessions created successfully.');
    console.log('Created an unpaid $1 checkout for an isolated release probe. No payment was submitted.');
  } else if (process.argv.includes('--expire')) {
    const state = JSON.parse(readFileSync(path,'utf8'));
    assert(state.userId.startsWith('billing_release_probe_'));
    const session = await stripe.checkout.sessions.retrieve(state.sessionId);
    assert.equal(session.client_reference_id,state.userId);
    assert.equal(session.payment_status,'unpaid');
    if (session.status === 'open') await stripe.checkout.sessions.expire(session.id);
    const started = Date.now();
    let observed = false;
    while (Date.now()-started < 90000) {
      const row = (await pool.query('SELECT status FROM galx_stripe_checkout_sessions WHERE session_id=$1 AND user_id=$2',[session.id,state.userId])).rows[0];
      if (row?.status === 'expired') { observed=true; break; }
      await new Promise(resolve=>setTimeout(resolve,3000));
    }
    assert(observed,'Stripe expiration webhook was not recorded within 90 seconds');
    const events = await stripe.events.list({type:'checkout.session.expired',limit:20});
    const event = events.data.find(item => item.data.object.id === session.id);
    assert(event,'Expiration event missing');
    const receipt = await pool.query('SELECT status FROM galx_stripe_events WHERE event_id=$1',[event.id]);
    assert.equal(receipt.rows[0]?.status,'processed');
    assert.equal(Number((await pool.query('SELECT count(*) FROM galx_wallet_transactions WHERE user_id=$1',[state.userId])).rows[0].count),0);
    const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    if (customer) await stripe.customers.del(customer);
    console.log(JSON.stringify({checkoutCreated:true,checkoutExpired:true,realStripeWebhookRecorded:true,ledgerEntries:0,eventId:event.id,pendingWebhookDeliveries:event.pending_webhooks}));
  } else throw new Error('Use --create or --expire');
} finally { await closePostgresPool(); }
