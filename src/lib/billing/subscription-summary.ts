import type Stripe from 'stripe';
import type { SubscriptionSummary } from './plan-status';

const empty = (state: SubscriptionSummary['state']): SubscriptionSummary => ({ state, periodEnd: null, endsAt: null });
const timestamp = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value < 8_640_000_000_000
  ? new Date(value * 1000).toISOString() : null;

/** Bounded, current, account-scoped display evidence. Paid access is checked separately. */
export async function readSubscriptionSummary(stripe: Stripe, customer: string | undefined, priceIds: string[]): Promise<SubscriptionSummary> {
  if (!customer || customer.startsWith('cus_mock_')) return empty('none');
  if (!priceIds.length) return empty('unavailable');
  try {
    const result = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 }, { timeout: 4000, maxNetworkRetries: 0 });
    if (result.has_more) return empty('unavailable');
    // A cross-account or truncated object is incomplete evidence, never an empty plan.
    if (result.data.some(row => (typeof row.customer === 'string' ? row.customer : row.customer.id) !== customer || row.items.has_more)) return empty('unavailable');
    const matching = result.data.filter(row => row.items.data.some(item => priceIds.includes(item.price.id)));
    const current = matching.filter(row => !['canceled', 'incomplete_expired'].includes(row.status));
    if (current.length > 1) return empty('unavailable');
    const subscription = current[0];
    if (!subscription) return empty(matching.length ? 'canceled' : 'none');
    const items = subscription.items.data.filter(item => priceIds.includes(item.price.id));
    if (items.length !== 1) return empty('unavailable');
    const periodEnd = timestamp(items[0].current_period_end);
    if (['past_due', 'unpaid', 'incomplete'].includes(subscription.status)) return empty('payment_required');
    if (subscription.status === 'paused' || subscription.pause_collection) return empty('paused');
    if (subscription.status === 'trialing') return empty('processing');
    if (subscription.status !== 'active' || !periodEnd) return empty('unavailable');
    const cancelAt = timestamp(subscription.cancel_at);
    const ending = Boolean(subscription.cancel_at_period_end || cancelAt);
    return { state: ending ? 'ending' : 'active', periodEnd,
      endsAt: ending ? cancelAt || periodEnd : null };
  } catch { return empty('unavailable'); }
}
