/** Targeted configuration update. Preview by default; --apply is explicit. */
import { StripeEngine } from '../src/lib/stripe/stripe';
import { BILLING_WEBHOOK_EVENTS } from '../src/lib/billing/webhookEvents';
const stripe = StripeEngine.getInstance().getClient();
if (!stripe) throw new Error('Stripe is not configured');
const apply = process.argv.includes('--apply');
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
const targets = endpoints.data.filter(endpoint => endpoint.status === 'enabled' && [
  'https://galx.ai/api/stripe/webhook', 'https://galx.ai/api/internal/credits/stripe',
].includes(endpoint.url));
if (!targets.length) throw new Error('No existing production billing webhook endpoints found');
for (const endpoint of targets) {
  const missing = BILLING_WEBHOOK_EVENTS.filter(event => !endpoint.enabled_events.includes('*') && !endpoint.enabled_events.includes(event));
  console.log(JSON.stringify({ url: endpoint.url, addEvents: missing, apply }));
  if (apply && missing.length) await stripe.webhookEndpoints.update(endpoint.id, { enabled_events: [...new Set([...endpoint.enabled_events, ...missing])] });
}
