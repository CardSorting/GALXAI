/** Signature/route boundary checks: no Stripe calls and no account mutations. */
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { POST as standard } from '../src/app/api/stripe/webhook/route';
import { POST as internal } from '../src/app/api/internal/credits/stripe/route';
process.env.STRIPE_SECRET_KEY = 'sk_live_localfixture';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_localfixture';
process.env.STRIPE_WEBHOOK_SECRET_PRODUCTION = '';
process.env.STRIPE_CREDITS_WEBHOOK_SECRET = '';
process.env.STRIPE_WEBHOOK_SECRET_LIVE = '';
const sdk = new Stripe('sk_test_localfixture');
const raw = JSON.stringify({ id: 'evt_localfixture', type: 'checkout.session.completed',livemode:false, data: { object: { id: 'cs_test_fixture' } } });
for (const handler of [standard,internal]) {
  const req = (body: string, signature?: string) => new NextRequest('https://galx.ai/api/stripe/webhook',{ method:'POST',body,headers: signature ? {'stripe-signature':signature} : {} });
  assert.equal((await handler(req(raw))).status,400);
  assert.equal((await handler(req(raw,'invalid'))).status,400);
  const signature = sdk.webhooks.generateTestHeaderString({payload:raw,secret:'whsec_localfixture'});
  assert.equal((await handler(req(raw,signature))).status,400,'Test-mode payments cannot reach a live ledger');
  assert.equal((await handler(req('x'.repeat(1_048_577),'invalid'))).status,413);
}
console.log('Webhook routes reject missing/invalid signatures, wrong payment mode, and oversized bodies.');
