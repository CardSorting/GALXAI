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
  developer_10: {
    id: 'developer_10',
    name: 'GALXAI Developer Tier — Images & Frontier OpenAI Models Pass',
    statementDescriptor: 'GALXAI DEV $10',
    description: 'Instant Developer Tier activation with $10 base deposit + $5.00 welcome grant + $5.00 match ($20.00 total compute credit). Pay-as-you-go API access for image generation and frontier OpenAI models.',
    depositAmountUsd: 10,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 5.00,
    totalCreditUsd: 20.00,
    multiplier: 1.50,
    badge: 'DEV TIER ⚡',
    taxCode: 'txcd_10000000',
    features: [
      'Instant Developer Tier & API Key Unlock (No waitlist application needed)',
      'Pay-As-You-Go API access for Images & Frontier OpenAI Models',
      'OpenAI Flagship Curated Lineup (GPT-6 Astra, GPT-5.6 Sol, Terra, Luna, GPT-5.5)',
      'Zero Data Retention (ZDR) Enclave Protection & Universal SDK'
    ],
    metadata: {
      galxai_tier_key: 'developer_10',
      deposit_amount_usd: '10.00',
      total_credit_usd: '20.00',
      match_percentage: '50%',
      rate_lock: 'guaranteed',
      sla_priority: 'developer_standard'
    }
  },
  lumi_10: {
    id: 'lumi_10',
    name: 'GALXAI Developer Tier — Images & Frontier OpenAI Models Pass',
    statementDescriptor: 'GALXAI DEV $10',
    description: 'Instant Developer Tier activation with $10 base deposit + $5.00 welcome grant + $5.00 match ($20.00 total compute credit). Pay-as-you-go API access for image generation and frontier OpenAI models.',
    depositAmountUsd: 10,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 5.00,
    totalCreditUsd: 20.00,
    multiplier: 1.50,
    badge: 'DEV TIER ⚡',
    taxCode: 'txcd_10000000',
    features: [
      'Instant Developer Tier & API Key Unlock (No waitlist application needed)',
      'Pay-As-You-Go API access for Images & Frontier OpenAI Models',
      'OpenAI Flagship Curated Lineup (GPT-6 Astra, GPT-5.6 Sol, Terra, Luna, GPT-5.5)',
      'Zero Data Retention (ZDR) Enclave Protection & Universal SDK'
    ],
    metadata: {
      galxai_tier_key: 'developer_10',
      deposit_amount_usd: '10.00',
      total_credit_usd: '20.00',
      match_percentage: '50%',
      rate_lock: 'guaranteed',
      sla_priority: 'developer_standard'
    }
  },
  starter_25: {
    id: 'starter_25',
    name: 'GALXAI Prepaid Compute — Starter Builder Pack',
    statementDescriptor: 'GALXAI COMPUTE $25',
    description: 'Includes $25 USD base deposit + $5.00 welcome grant + $12.50 match ($42.50 total compute credit). Micro-billed per token with zero markups.',
    depositAmountUsd: 25,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 12.50,
    totalCreditUsd: 42.50,
    multiplier: 1.50,
    badge: '50% Match Bonus',
    taxCode: 'txcd_10000000',
    features: [
      '$42.50 Total Usable Compute Credit (50% Match)',
      'Standard 120 RPM Concurrency Limit',
      'Non-Expiring Balance & Standard Rate Lock',
      '75% Prompt Cache Cost Savings'
    ],
    metadata: {
      galxai_tier_key: 'starter_25',
      deposit_amount_usd: '25.00',
      total_credit_usd: '42.50',
      match_percentage: '50%',
      rate_lock: 'guaranteed',
      sla_priority: 'standard'
    }
  },
  growth_50: {
    id: 'growth_50',
    name: 'GALXAI Prepaid Compute — Growth VIP Priority Pack',
    statementDescriptor: 'GALXAI COMPUTE $50',
    description: 'Includes $50 USD base deposit + $5.00 welcome grant + $30.00 match ($85.00 total compute credit). Sub-15ms VIP priority routing included.',
    depositAmountUsd: 50,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 30.00,
    totalCreditUsd: 85.00,
    multiplier: 1.60,
    badge: 'VIP High-Roller 🔓',
    isPopular: true,
    taxCode: 'txcd_10000000',
    features: [
      '$85.00 Total Usable Compute Credit (60% Match)',
      'Sub-15ms VIP Priority Routing Lane',
      '300 RPM Concurrency Burst Capacity',
      '75% Prompt Cache Pass-Through'
    ],
    metadata: {
      galxai_tier_key: 'growth_50',
      deposit_amount_usd: '50.00',
      total_credit_usd: '85.00',
      match_percentage: '60%',
      rate_lock: 'guaranteed',
      sla_priority: 'vip'
    }
  },
  fleet_100: {
    id: 'fleet_100',
    name: 'GALXAI Prepaid Compute — Fleet Scale Pack',
    statementDescriptor: 'GALXAI COMPUTE $100',
    description: 'Includes $100 USD base deposit + $5.00 welcome grant + $75.00 match ($180.00 total compute credit). Maximum 75% scale match applied.',
    depositAmountUsd: 100,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 75.00,
    totalCreditUsd: 180.00,
    multiplier: 1.75,
    badge: '600 RPM Fleet 🔓',
    isPopular: true,
    taxCode: 'txcd_10000000',
    features: [
      '$180.00 Total Usable Compute Credit (75% Match)',
      '600 RPM Concurrency Burst for Autonomous Agents',
      'Priority Global Anycast Routing & Failover',
      'Direct Discord Architect Support Channel'
    ],
    metadata: {
      galxai_tier_key: 'fleet_100',
      deposit_amount_usd: '100.00',
      total_credit_usd: '180.00',
      match_percentage: '75%',
      rate_lock: 'guaranteed',
      sla_priority: 'fleet'
    }
  },
  sovereign_250: {
    id: 'sovereign_250',
    name: 'GALXAI Prepaid Compute — Enterprise Sovereign Pack',
    statementDescriptor: 'GALXAI COMPUTE $250',
    description: 'Includes $250 USD base deposit + $5.00 welcome grant + $250.00 match ($505.00 total compute credit). Dedicated VPC private lane access with 100% double match.',
    depositAmountUsd: 250,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 250.00,
    totalCreditUsd: 505.00,
    multiplier: 2.00,
    badge: 'Unlimited VPC 🔓',
    taxCode: 'txcd_10000000',
    features: [
      '$505.00 Total Usable Compute Credit (100% Double Match)',
      'Dedicated VPC Private Lane & Zero-Data-Retention Vault',
      '1,200 RPM High-Concurrency Pipeline',
      'Custom Corporate Invoicing & ACH Net-30 Terms'
    ],
    metadata: {
      galxai_tier_key: 'sovereign_250',
      deposit_amount_usd: '250.00',
      total_credit_usd: '505.00',
      match_percentage: '100%',
      rate_lock: 'guaranteed',
      sla_priority: 'enterprise'
    }
  },
  hyperscale_500: {
    id: 'hyperscale_500',
    name: 'GALXAI Prepaid Compute — Hyperscale Infrastructure Pack',
    statementDescriptor: 'GALXAI COMPUTE $500',
    description: 'Includes $500 USD base deposit + $5.00 welcome grant + $500.00 match ($1,005.00 total compute credit). Custom Enterprise SLA and dedicated engineer.',
    depositAmountUsd: 500,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 500.00,
    totalCreditUsd: 1005.00,
    multiplier: 2.00,
    badge: '100% Double Match 🔓',
    taxCode: 'txcd_10000000',
    features: [
      '$1,005.00 Total Usable Compute Credit (100% Double Match)',
      'Unlimited Concurrency Burst & Dedicated Account Architect',
      '99.99% Availability Custom Enterprise SLA Guarantee',
      'Direct Private Slack Channel with Core Infrastructure Team'
    ],
    metadata: {
      galxai_tier_key: 'hyperscale_500',
      deposit_amount_usd: '500.00',
      total_credit_usd: '1005.00',
      match_percentage: '100%',
      rate_lock: 'guaranteed',
      sla_priority: 'hyperscale'
    }
  }
};

export function getTierByAmount(amount: number): StripeProductTier | undefined {
  const match = Object.values(STRIPE_PRODUCT_TIERS).find(t => t.depositAmountUsd === amount);
  return match;
}
