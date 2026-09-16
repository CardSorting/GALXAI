import type Stripe from 'stripe';
import { BillingError } from './account';

/** Every account billing entry uses the same deliberately restricted portal. */
export async function billingPortalConfiguration(stripe: Stripe) {
  const configurations = await stripe.billingPortal.configurations.list(
    { active: true, limit: 100 }, { timeout: 4000, maxNetworkRetries: 0 },
  );
  const matches = configurations.data.filter(item => item.metadata?.galxPlan === 'pro-v1');
  const portal = matches[0];
  if (configurations.has_more || matches.length !== 1 || !portal?.active ||
      !portal.features.invoice_history.enabled || !portal.features.payment_method_update.enabled ||
      !portal.features.subscription_cancel.enabled || portal.features.subscription_cancel.mode !== 'at_period_end' ||
      portal.features.subscription_update.enabled) {
    throw new BillingError('Billing management is temporarily unavailable. Please try again shortly.', 503);
  }
  return portal.id;
}
