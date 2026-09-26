/** Customer-facing display state. It never grants access or contains provider IDs. */
export type SubscriptionState = 'none' | 'active' | 'ending' | 'payment_required' | 'processing' | 'paused' | 'canceled' | 'unavailable';
export type ConsumerPlanId = 'pro' | 'workshop' | 'studio' | 'foundry';
export interface ImageAllowanceOfferDisplay {
  monthlyUnits: number;
  standardOutputUnits: number;
  hdOutputUnits: number;
}
export interface PlanOffer {
  id: ConsumerPlanId;
  name: string;
  audience: string;
  monthlyPriceUsd: number;
  checkoutAvailable: boolean;
  allowance: ImageAllowanceOfferDisplay | null;
}
export interface SubscriptionSummary {
  state: SubscriptionState;
  periodEnd: string | null;
  endsAt: string | null;
}
export interface ImageSubscriptionSummary extends SubscriptionSummary {
  plan: Exclude<ConsumerPlanId, 'pro'> | null;
  planName: string | null;
  allowanceConfigured: boolean;
}
export interface PlanStatus {
  access: 'included' | 'paid_plan_required' | 'unavailable';
  checkoutAvailable: boolean;
  hasPaymentProfile: boolean;
  offers: PlanOffer[];
  subscription: SubscriptionSummary;
  imageSubscription: ImageSubscriptionSummary;
}

export function parsePlanStatus(value: unknown): PlanStatus | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const subscription = row.subscription as Record<string, unknown> | undefined;
  const imageSubscription = row.imageSubscription as Record<string, unknown> | undefined;
  const offers = row.offers;
  const date = (v: unknown) => v === null || (typeof v === 'string' && Number.isFinite(Date.parse(v)));
  const validOffers = Array.isArray(offers) && offers.every(value => {
    if (!value || typeof value !== 'object') return false;
    const offer = value as Record<string, unknown>;
    const allowance = offer.allowance;
    const validAllowance = allowance === null || Boolean(allowance && typeof allowance === 'object' &&
      Number.isSafeInteger((allowance as Record<string, unknown>).monthlyUnits) && Number((allowance as Record<string, unknown>).monthlyUnits) > 0 &&
      Number.isSafeInteger((allowance as Record<string, unknown>).standardOutputUnits) && Number((allowance as Record<string, unknown>).standardOutputUnits) > 0 &&
      Number.isSafeInteger((allowance as Record<string, unknown>).hdOutputUnits) &&
      Number((allowance as Record<string, unknown>).hdOutputUnits) >= Number((allowance as Record<string, unknown>).standardOutputUnits));
    return ['foundry'].includes(String(offer.id)) && typeof offer.name === 'string' &&
      typeof offer.audience === 'string' && typeof offer.monthlyPriceUsd === 'number' && Number.isSafeInteger(offer.monthlyPriceUsd) &&
      offer.monthlyPriceUsd > 0 && offer.monthlyPriceUsd <= 100_000 && typeof offer.checkoutAvailable === 'boolean' && validAllowance &&
      (offer.id === 'pro' ? allowance === null : allowance !== null);
  });
  if (!['included', 'paid_plan_required', 'unavailable'].includes(String(row.access)) ||
      typeof row.checkoutAvailable !== 'boolean' || typeof row.hasPaymentProfile !== 'boolean' ||
      !validOffers ||
      !subscription || !['none', 'active', 'ending', 'payment_required', 'processing', 'paused', 'canceled', 'unavailable'].includes(String(subscription.state)) ||
      !date(subscription.periodEnd) || !date(subscription.endsAt) ||
      !imageSubscription || !['none', 'active', 'ending', 'payment_required', 'processing', 'paused', 'canceled', 'unavailable'].includes(String(imageSubscription.state)) ||
      !(imageSubscription.plan === null || ['workshop', 'studio', 'foundry'].includes(String(imageSubscription.plan))) ||
      !(imageSubscription.planName === null || typeof imageSubscription.planName === 'string') ||
      typeof imageSubscription.allowanceConfigured !== 'boolean' ||
      !date(imageSubscription.periodEnd) || !date(imageSubscription.endsAt)) return null;
  return {
    access: row.access as PlanStatus['access'], checkoutAvailable: row.checkoutAvailable,
    hasPaymentProfile: row.hasPaymentProfile,
    offers: (offers as PlanOffer[]).map(offer => ({
      id: offer.id, name: offer.name, audience: offer.audience,
      monthlyPriceUsd: offer.monthlyPriceUsd, checkoutAvailable: offer.checkoutAvailable,
      allowance: offer.allowance ? { monthlyUnits: offer.allowance.monthlyUnits,
        standardOutputUnits: offer.allowance.standardOutputUnits, hdOutputUnits: offer.allowance.hdOutputUnits } : null,
    })),
    subscription: { state: subscription.state as SubscriptionState, periodEnd: subscription.periodEnd as string | null, endsAt: subscription.endsAt as string | null },
    imageSubscription: {
      state: imageSubscription.state as SubscriptionState,
      plan: imageSubscription.plan as ImageSubscriptionSummary['plan'],
      planName: imageSubscription.planName as string | null,
      allowanceConfigured: imageSubscription.allowanceConfigured as boolean,
      periodEnd: imageSubscription.periodEnd as string | null,
      endsAt: imageSubscription.endsAt as string | null,
    },
  };
}
