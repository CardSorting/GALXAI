/** Public plan terms only. Provider identifiers and operating limits stay server-side. */
export const PRO_PLAN = { id: 'pro', name: 'GALX Pro', monthlyPriceUsd: 10, currency: 'USD', interval: 'month' } as const;

/** Retained for fulfillment and historical subscription reconciliation. Never expose as a public offer. */
export const DEVELOPER_ACCESS = {
  id: 'nova-developer-access',
  name: 'GALX Nova — Developer Access',
  monthlyPriceUsd: 50,
  currency: 'USD',
  interval: 'month',
  lookupKey: 'galx_nova_developer_monthly_v1',
  planKey: 'nova-developer-v1',
  checkoutEnabled: false,
  automaticActivation: true,
  usageBilledSeparately: true,
  includedUsageCreditsUsd: 0,
} as const;

/** No new prepaid Developer or compute-pack checkout may be created. */
export const PREPAID_DEVELOPER_CHECKOUT_ENABLED = false as const;
