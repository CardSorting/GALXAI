/** Read-only provider configuration check. No customer or payment operations. */
import { StripeEngine } from '../src/lib/stripe/stripe';
import { getStripeConfig } from '../src/lib/stripe/config';
import { paymentOrigin } from '../src/lib/billing/payment';
import { BILLING_WEBHOOK_EVENTS } from '../src/lib/billing/webhookEvents';
const config = getStripeConfig();
try {
  const origin = paymentOrigin(process.argv[2] || config.appUrl);
  if (!config.isConfigured || !config.webhookSecrets.length) throw new Error('Stripe credentials or webhook secrets missing');
  const stripe = StripeEngine.getInstance().getClient()!;
  const account = await stripe.accounts.retrieve();
  if (!account.charges_enabled) throw new Error('Stripe has not enabled payments on this account');
  const portals = await stripe.billingPortal.configurations.list({ is_default: true, active: true, limit: 1 });
  if (!portals.data.length) throw new Error('No active default billing portal configuration');
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const required = BILLING_WEBHOOK_EVENTS;
  const enabled = endpoints.data.filter(endpoint => endpoint.status === 'enabled' && [`${origin}/api/stripe/webhook`,`${origin}/api/internal/credits/stripe`].includes(endpoint.url));
  const covered = new Set(enabled.flatMap(endpoint => endpoint.enabled_events));
  const missing = required.filter(type => !covered.has('*') && !covered.has(type as never));
  console.log(JSON.stringify({ mode: config.secretKey.includes('_live_') ? 'live' : 'test', configuredOrigin: origin, chargesEnabled: account.charges_enabled, billingPortalConfigured: true,
    enabledBillingEndpoints: enabled.map(endpoint => ({ url: endpoint.url, apiVersion: endpoint.api_version, allEvents: endpoint.enabled_events.includes('*') })), missingEvents: missing }, null, 2));
  if (!enabled.length || missing.length) throw new Error('Billing webhook configuration needs an update before deployment');
} catch (e) { console.error('Stripe readiness:', (e as { code?: string }).code || (e as Error).message); process.exitCode = 1; }
