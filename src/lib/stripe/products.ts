/**
 * Historical account-tier compatibility only.
 *
 * GALX provisions recurring Pro and Nova Developer subscription Prices through
 * billing/plan-subscription.ts. The legacy keys below are retained as private
 * protocol identifiers so existing wallet rows and key records can still be
 * read without renaming customer data; they do not create new access tiers.
 */

import type { ComputeTierKey } from '../supabase/types';

export type { ComputeTierKey };
export const STRIPE_PRODUCT_CATALOG_MODE = 'subscriptions-with-legacy-reconciliation' as const;

/** Thresholds used only to interpret historical deposited-total snapshots. */
export const COMPUTE_TIER_THRESHOLDS: ReadonlyArray<{ minUsd: number; key: ComputeTierKey }> = [
  { minUsd: 500, key: 'hyperscale_500' },
  { minUsd: 250, key: 'sovereign_250' },
  { minUsd: 100, key: 'fleet_100' },
  { minUsd: 50, key: 'growth_50' },
  { minUsd: 25, key: 'starter_25' },
  { minUsd: 10, key: 'developer_10' },
  { minUsd: 0, key: 'free' },
] as const;

export function resolveTierKey(depositedTotalUsd: number): ComputeTierKey {
  for (const { minUsd, key } of COMPUTE_TIER_THRESHOLDS) {
    if (depositedTotalUsd >= minUsd) return key;
  }
  return 'free';
}

/**
 * Kept as a structural type for old operator imports. The active catalog is
 * intentionally empty; no new Stripe product or price is derived from it.
 */
export type StripeProductTier = any;
export const STRIPE_PRODUCT_TIERS: Record<string, StripeProductTier> = {};

export function getTierByAmount(_amount: number): StripeProductTier | undefined {
  return undefined;
}

export interface AccountTierLimits {
  tierKey: ComputeTierKey;
  rpm: number;
  tpmNum: number;
  tpm: string;
  name: string;
  routingLane: string;
  supportTier: string;
  promptCacheDiscount: string;
}

const HISTORICAL_LIMITS: Record<ComputeTierKey, Omit<AccountTierLimits, 'tierKey'>> = {
  free: { rpm: 20, tpmNum: 20_000, tpm: '20k TPM', name: 'Free Tier', routingLane: 'Historical account policy', supportTier: 'Account support', promptCacheDiscount: 'Standard' },
  developer_10: { rpm: 60, tpmNum: 40_000, tpm: '40k TPM', name: 'Historical Developer account', routingLane: 'Historical account policy', supportTier: 'Account support', promptCacheDiscount: 'Standard' },
  starter_25: { rpm: 120, tpmNum: 80_000, tpm: '80k TPM', name: 'Historical account', routingLane: 'Historical account policy', supportTier: 'Account support', promptCacheDiscount: 'Historical' },
  growth_50: { rpm: 300, tpmNum: 200_000, tpm: '200k TPM', name: 'Historical account', routingLane: 'Historical account policy', supportTier: 'Account support', promptCacheDiscount: 'Historical' },
  fleet_100: { rpm: 600, tpmNum: 500_000, tpm: '500k TPM', name: 'Historical account', routingLane: 'Historical account policy', supportTier: 'Account support', promptCacheDiscount: 'Historical' },
  sovereign_250: { rpm: 1_200, tpmNum: 1_000_000, tpm: '1,000k TPM', name: 'Historical account', routingLane: 'Historical account policy', supportTier: 'Account support', promptCacheDiscount: 'Historical' },
  hyperscale_500: { rpm: 10_000, tpmNum: Number.POSITIVE_INFINITY, tpm: 'Historical', name: 'Historical account', routingLane: 'Historical account policy', supportTier: 'Account support', promptCacheDiscount: 'Historical' },
};

/** Resolve a private historical limit snapshot; it is not an access grant. */
export function getTierLimitsForDeposit(depositTotalUsd: number): AccountTierLimits {
  const tierKey = resolveTierKey(depositTotalUsd);
  return { tierKey, ...HISTORICAL_LIMITS[tierKey] };
}
