/**
 * GALXAI: Stripe Product Tier Packages & Price Catalog
 * Authoritative definitions for Prepaid Compute Tiers with 50% Match Grants,
 * Tax Codes, Metadata, and Instant Activation Badges.
 */

export interface StripeProductTier {
  id: string; // Internal key e.g. 'starter_25'
  name: string;
  statementDescriptor: string;
  description: string;
  depositAmountUsd: number;
  welcomeGrantUsd: number;
  matchBonusUsd: number;
  totalCreditUsd: number;
  multiplier: number;
  badge: string;
  isPopular?: boolean;
  taxCode: string; // txcd_10000000 (Software as a Service / Cloud API Compute)
  features: string[];
  metadata: {
    galxai_tier_key: string;
    deposit_amount_usd: string;
    total_credit_usd: string;
    match_percentage: string;
    rate_lock: string;
    sla_priority: string;
  };
}

export const STRIPE_PRODUCT_TIERS: Record<string, StripeProductTier> = {
  starter_25: {
    id: 'starter_25',
    name: 'GALXAI Prepaid Compute — Starter Builder Pack',
    statementDescriptor: 'GALXAI COMPUTE $25',
    description: 'Includes $25 USD base deposit + $5.00 welcome grant + $2.50 match ($32.50 total compute credit). Micro-billed per token with zero markups.',
    depositAmountUsd: 25,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 2.50,
    totalCreditUsd: 32.50,
    multiplier: 1.10,
    badge: '10% Bonus Match',
    taxCode: 'txcd_10000000',
    features: [
      '$32.50 Total Usable Compute Credit',
      'Standard 60 RPM Concurrency Limit',
      'Non-Expiring Balance & Standard Rate Lock',
      '75% Prompt Cache Cost Savings'
    ],
    metadata: {
      galxai_tier_key: 'starter_25',
      deposit_amount_usd: '25.00',
      total_credit_usd: '32.50',
      match_percentage: '10%',
      rate_lock: 'guaranteed',
      sla_priority: 'standard'
    }
  },
  growth_50: {
    id: 'growth_50',
    name: 'GALXAI Prepaid Compute — Growth VIP Priority Pack',
    statementDescriptor: 'GALXAI COMPUTE $50',
    description: 'Includes $50 USD base deposit + $5.00 welcome grant + $12.50 match ($67.50 total compute credit). Sub-15ms VIP priority routing included.',
    depositAmountUsd: 50,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 12.50,
    totalCreditUsd: 67.50,
    multiplier: 1.25,
    badge: '25% Match Bonus 🔓',
    isPopular: true,
    taxCode: 'txcd_10000000',
    features: [
      '$67.50 Total Usable Compute Credit',
      'Sub-15ms VIP Priority Routing Lane',
      '180 RPM Concurrency Burst Capacity',
      '75% Prompt Cache Pass-Through'
    ],
    metadata: {
      galxai_tier_key: 'growth_50',
      deposit_amount_usd: '50.00',
      total_credit_usd: '67.50',
      match_percentage: '25%',
      rate_lock: 'guaranteed',
      sla_priority: 'vip'
    }
  },
  fleet_100: {
    id: 'fleet_100',
    name: 'GALXAI Prepaid Compute — Fleet Scale Pack',
    statementDescriptor: 'GALXAI COMPUTE $100',
    description: 'Includes $100 USD base deposit + $5.00 welcome grant + $50.00 match ($155.00 total compute credit). Maximum 50% match grant applied.',
    depositAmountUsd: 100,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 50.00,
    totalCreditUsd: 155.00,
    multiplier: 1.50,
    badge: '50% Match Grant 🔓',
    isPopular: true,
    taxCode: 'txcd_10000000',
    features: [
      '$155.00 Total Usable Compute Credit (50% Match)',
      '600 RPM Concurrency Burst for Autonomous Agents',
      'Priority Global Anycast Routing & Failover',
      'Direct Discord Architect Support Channel'
    ],
    metadata: {
      galxai_tier_key: 'fleet_100',
      deposit_amount_usd: '100.00',
      total_credit_usd: '155.00',
      match_percentage: '50%',
      rate_lock: 'guaranteed',
      sla_priority: 'fleet'
    }
  },
  sovereign_250: {
    id: 'sovereign_250',
    name: 'GALXAI Prepaid Compute — Enterprise Sovereign Pack',
    statementDescriptor: 'GALXAI COMPUTE $250',
    description: 'Includes $250 USD base deposit + $5.00 welcome grant + $125.00 match ($380.00 total compute credit). Dedicated VPC private lane access.',
    depositAmountUsd: 250,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 125.00,
    totalCreditUsd: 380.00,
    multiplier: 1.50,
    badge: '50% Match Grant 🔓',
    taxCode: 'txcd_10000000',
    features: [
      '$380.00 Total Usable Compute Credit (50% Match)',
      'Dedicated VPC Private Lane & Zero-Data-Retention Vault',
      '1,200 RPM High-Concurrency Pipeline',
      'Custom Corporate Invoicing & ACH Net-30 Terms'
    ],
    metadata: {
      galxai_tier_key: 'sovereign_250',
      deposit_amount_usd: '250.00',
      total_credit_usd: '380.00',
      match_percentage: '50%',
      rate_lock: 'guaranteed',
      sla_priority: 'enterprise'
    }
  },
  hyperscale_500: {
    id: 'hyperscale_500',
    name: 'GALXAI Prepaid Compute — Hyperscale Infrastructure Pack',
    statementDescriptor: 'GALXAI COMPUTE $500',
    description: 'Includes $500 USD base deposit + $5.00 welcome grant + $250.00 match ($755.00 total compute credit). Custom Enterprise SLA and dedicated engineer.',
    depositAmountUsd: 500,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 250.00,
    totalCreditUsd: 755.00,
    multiplier: 1.50,
    badge: '50% Apex Match 🔓',
    taxCode: 'txcd_10000000',
    features: [
      '$755.00 Total Usable Compute Credit (50% Match)',
      'Unlimited Concurrency Burst & Dedicated Account Architect',
      '99.99% Availability Custom Enterprise SLA Guarantee',
      'Direct Private Slack Channel with Core Infrastructure Team'
    ],
    metadata: {
      galxai_tier_key: 'hyperscale_500',
      deposit_amount_usd: '500.00',
      total_credit_usd: '755.00',
      match_percentage: '50%',
      rate_lock: 'guaranteed',
      sla_priority: 'hyperscale'
    }
  }
};

export function getTierByAmount(amount: number): StripeProductTier | undefined {
  const match = Object.values(STRIPE_PRODUCT_TIERS).find(t => t.depositAmountUsd === amount);
  return match;
}
