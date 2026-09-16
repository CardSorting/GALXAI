/** Customer-facing display state. It never grants access or contains provider IDs. */
export type SubscriptionState = 'none' | 'active' | 'ending' | 'payment_required' | 'processing' | 'paused' | 'canceled' | 'unavailable';
export interface SubscriptionSummary {
  state: SubscriptionState;
  periodEnd: string | null;
  endsAt: string | null;
}
export interface PlanStatus {
  access: 'included' | 'paid_plan_required' | 'unavailable';
  checkoutAvailable: boolean;
  hasPaymentProfile: boolean;
  subscription: SubscriptionSummary;
}

export function parsePlanStatus(value: unknown): PlanStatus | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const subscription = row.subscription as Record<string, unknown> | undefined;
  const date = (v: unknown) => v === null || (typeof v === 'string' && Number.isFinite(Date.parse(v)));
  if (!['included', 'paid_plan_required', 'unavailable'].includes(String(row.access)) ||
      typeof row.checkoutAvailable !== 'boolean' || typeof row.hasPaymentProfile !== 'boolean' ||
      !subscription || !['none', 'active', 'ending', 'payment_required', 'processing', 'paused', 'canceled', 'unavailable'].includes(String(subscription.state)) ||
      !date(subscription.periodEnd) || !date(subscription.endsAt)) return null;
  return {
    access: row.access as PlanStatus['access'], checkoutAvailable: row.checkoutAvailable,
    hasPaymentProfile: row.hasPaymentProfile,
    subscription: { state: subscription.state as SubscriptionState, periodEnd: subscription.periodEnd as string | null, endsAt: subscription.endsAt as string | null },
  };
}
