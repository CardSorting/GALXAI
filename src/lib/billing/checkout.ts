import { createHash, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type Stripe from 'stripe';
import { BillingError } from './account';
import { checkoutReturnPath, hostedPaymentUrl } from './payment';
import { readTopUpQuote } from './quote';

export async function createAccountCheckout(pool: Pool, stripe: Stripe, input: {
  userId: string; email: string; amount: number; requestId: string; surface: unknown; origin: string;
}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) throw new BillingError('Refresh this page and try again.');
  const returnPath = checkoutReturnPath(input.surface);
  const key = createHash('sha256').update(`${input.userId}:${input.requestId}`).digest('hex');
  const db = await pool.connect();
  try {
    // Persist the quote before contacting Stripe. Retrying after a timeout uses
    // the same provider parameters, even if the account or pricing has changed.
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='5s'");
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`checkout:${input.userId}`]);
    let row = (await db.query(`SELECT * FROM galx_stripe_checkout_sessions WHERE user_id=$1 AND metadata->>'requestId'=$2 FOR UPDATE`, [input.userId, input.requestId])).rows[0];
    if (!row) {
      const count = await db.query(`SELECT count(*) FROM galx_stripe_checkout_sessions WHERE user_id=$1 AND created_at > now()-interval '10 minutes'`, [input.userId]);
      if (Number(count.rows[0].count) >= 5) throw new BillingError('Too many checkout attempts. Please wait a few minutes.', 429);
      const quote = await readTopUpQuote(db, input.userId, input.amount);
      row = (await db.query(`INSERT INTO galx_stripe_checkout_sessions
        (session_id,user_id,amount_usd,match_grant_usd,total_credited_usd,metadata)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [`pending_${key}`, input.userId, input.amount, quote.bonusUsd, quote.creditUsd,
        JSON.stringify({ requestId: input.requestId, returnPath, origin: input.origin, email: input.email, key, welcomeGrant: quote.welcomeGrant, fulfillmentVersion: 2 })])).rows[0];
    }
    if (Number(row.amount_usd) !== input.amount || row.metadata.returnPath !== returnPath) throw new BillingError('This checkout attempt already has a different amount. Refresh to start again.', 409);
    await db.query('COMMIT');

    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='5s'");
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`checkout:${input.userId}`]);
    row = (await db.query(`SELECT * FROM galx_stripe_checkout_sessions WHERE user_id=$1 AND metadata->>'requestId'=$2 FOR UPDATE`, [input.userId, input.requestId])).rows[0];
    if (row.payment_status === 'paid' || row.status !== 'open' || Date.now() - new Date(row.created_at).getTime() > 90 * 60_000) throw new BillingError('This checkout is complete or has expired. Refresh to start a new top-up.', 409);
    let customer = (await db.query('SELECT stripe_customer_id FROM galx_stripe_customers WHERE user_id=$1', [input.userId])).rows[0]?.stripe_customer_id;
    if (!customer || customer.startsWith('cus_mock_')) {
      const result = await stripe.customers.create({ email: row.metadata.email, metadata: { userId: input.userId } }, { idempotencyKey: `customer:${key}` });
      customer = result.id;
      await db.query(`INSERT INTO galx_stripe_customers (id,user_id,stripe_customer_id,email) VALUES ($1,$2,$3,$4)
        ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id=EXCLUDED.stripe_customer_id,email=EXCLUDED.email,updated_at=now()`, [randomUUID(), input.userId, customer, row.metadata.email]);
    }
    // Commit customer ownership before creating a payable session. Another
    // attempt cannot change its Stripe parameters after an uncertain response.
    await db.query('UPDATE galx_stripe_checkout_sessions SET customer_id=$2 WHERE session_id=$1', [row.session_id, customer]);
    await db.query('COMMIT');
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='5s'");
    row = (await db.query(`SELECT * FROM galx_stripe_checkout_sessions WHERE user_id=$1 AND metadata->>'requestId'=$2 FOR UPDATE`, [input.userId, input.requestId])).rows[0];
    if (row.payment_status === 'paid' || row.status !== 'open') throw new BillingError('This checkout is complete or has expired. Refresh to start a new top-up.', 409);
    customer = row.customer_id;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', customer, client_reference_id: input.userId,
      integration_identifier: `galx_topup_${key.slice(0,8).split('').map(char => String.fromCharCode(97 + parseInt(char,16))).join('')}`,
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: Math.round(input.amount * 100), product_data: {
        name: 'GALXAI compute credit', description: `$${Number(row.total_credited_usd).toFixed(2)} compute credit added after payment. One-time payment.`,
      } } }],
      // Discounts change the collected amount and cannot silently change credit terms.
      allow_promotion_codes: false,
      invoice_creation: { enabled: true, invoice_data: { metadata: { userId: input.userId } } },
      metadata: { userId: input.userId, requestId: input.requestId },
      payment_intent_data: { metadata: { userId: input.userId, requestId: input.requestId } },
      success_url: `${row.metadata.origin}${returnPath}?checkout=returned&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${row.metadata.origin}${returnPath}?checkout=canceled`,
      expires_at: Math.floor(new Date(row.created_at).getTime() / 1000) + 7200,
    }, { idempotencyKey: `checkout:${key}` });
    const url = hostedPaymentUrl(session.url, 'checkout.stripe.com');
    await db.query(`UPDATE galx_stripe_checkout_sessions SET session_id=$1,customer_id=$2,updated_at=now() WHERE session_id=$3`, [session.id, customer, row.session_id]);
    await db.query('COMMIT');
    return { url, sessionId: session.id, creditUsd: Number(row.total_credited_usd) };
  } catch (error) { await db.query('ROLLBACK').catch(() => {}); throw error; }
  finally { db.release(); }
}
