import { BillingError } from './account';

/** Release acceptance gate: provider end-to-end payment testing remains outstanding.
 * The owner deferred tax readiness on 2026-09-26; it is not this gate's prerequisite.
 * No environment variable or Stripe metadata bypasses release acceptance. */
export const LIVE_RECURRING_SALES_APPROVED = false;

export function requireTestSubscriptionCheckout(livemode: boolean): void {
  if (livemode) throw new BillingError('New subscriptions are not available yet.', 503);
}
