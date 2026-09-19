/**
 * Public usage-pricing boundary.
 *
 * Developer Access is a recurring admission subscription. This module is
 * deliberately not a rate card: until an approved consumption contract is
 * published, public surfaces may describe the unit boundary but must not
 * expose model prices, discounts, credits, balances, or inferred estimates.
 */
export const USAGE_PRICING = {
  status: 'published',
  ratesPublished: true,
  basis: 'message',
  unit: 'message',
  unitAmountUsd: 0.02,
  monthlySpendCapUsd: 25,
  maxInputTokens: 16_000,
  maxOutputTokens: 4_000,
  path: '/pricing/usage',
  notice: 'Usage is billed separately from Developer Access at $0.02 per completed message. No usage credits are included. A $25 monthly usage cap applies by default.',
} as const;

export type PublicUsagePricing = Pick<typeof USAGE_PRICING, 'status' | 'ratesPublished' | 'basis' | 'unit' | 'unitAmountUsd' | 'monthlySpendCapUsd' | 'maxInputTokens' | 'maxOutputTokens' | 'path'>;

/** Explicit allowlist for browser/API responses. Never spread the source object. */
export function publicUsagePricing(): PublicUsagePricing {
  return {
    status: USAGE_PRICING.status,
    ratesPublished: USAGE_PRICING.ratesPublished,
    basis: USAGE_PRICING.basis,
    unit: USAGE_PRICING.unit,
    unitAmountUsd: USAGE_PRICING.unitAmountUsd,
    monthlySpendCapUsd: USAGE_PRICING.monthlySpendCapUsd,
    maxInputTokens: USAGE_PRICING.maxInputTokens,
    maxOutputTokens: USAGE_PRICING.maxOutputTokens,
    path: USAGE_PRICING.path,
  };
}
