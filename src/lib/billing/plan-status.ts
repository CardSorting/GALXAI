/** Customer-facing display state. It never grants access or contains provider IDs. */
export type SubscriptionState = 'none' | 'active' | 'ending' | 'payment_required' | 'processing' | 'paused' | 'canceled' | 'unavailable';
export type ConsumerPlanId = 'pro' | 'creator' | 'studio' | 'team';
export interface PlanOffer {
  id: ConsumerPlanId;
  name: string;
  audience: string;
  monthlyPriceUsd: number;
  checkoutAvailable: boolean;
}
export interface SubscriptionSummary {
  state: SubscriptionState;
  periodEnd: string | null;
  endsAt: string | null;
}
export interface PlanStatus {
  access: 'included' | 'paid_plan_required' | 'unavailable';
  checkoutAvailable: boolean;
  hasPaymentProfile: boolean;
  offers: PlanOffer[];
  subscription: SubscriptionSummary;
}

export function parsePlanStatus(value: unknown): PlanStatus | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const subscription = row.subscription as Record<string, unknown> | undefined;
  const offers = row.offers;
  const date = (v: unknown) => v === null || (typeof v === 'string' && Number.isFinite(Date.parse(v)));
  const validOffers = Array.isArray(offers) && offers.every(value => {
    if (!value || typeof value !== 'object') return false;
    const offer = value as Record<string, unknown>;
    return ['pro', 'creator', 'studio', 'team'].includes(String(offer.id)) && typeof offer.name === 'string' &&
      typeof offer.audience === 'string' && typeof offer.monthlyPriceUsd === 'number' && Number.isSafeInteger(offer.monthlyPriceUsd) &&
      offer.monthlyPriceUsd > 0 && offer.monthlyPriceUsd <= 100_000 && typeof offer.checkoutAvailable === 'boolean';
  });
  if (!['included', 'paid_plan_required', 'unavailable'].includes(String(row.access)) ||
      typeof row.checkoutAvailable !== 'boolean' || typeof row.hasPaymentProfile !== 'boolean' ||
      !validOffers ||
      !subscription || !['none', 'active', 'ending', 'payment_required', 'processing', 'paused', 'canceled', 'unavailable'].includes(String(subscription.state)) ||
      !date(subscription.periodEnd) || !date(subscription.endsAt)) return null;
  return {
    access: row.access as PlanStatus['access'], checkoutAvailable: row.checkoutAvailable,
    hasPaymentProfile: row.hasPaymentProfile,
    offers: (offers as PlanOffer[]).map(offer => ({
      id: offer.id, name: offer.name, audience: offer.audience,
      monthlyPriceUsd: offer.monthlyPriceUsd, checkoutAvailable: offer.checkoutAvailable,
    })),
    subscription: { state: subscription.state as SubscriptionState, periodEnd: subscription.periodEnd as string | null, endsAt: subscription.endsAt as string | null },
  };
}
