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
  concurrency: string;
  concurrencyRpm: number | 'Unlimited';
  tpmLimit: string;
  routingLane: string;
  supportTier: string;
  promptCacheDiscount: string;
  isPopular?: boolean;
  taxCode: string; // txcd_10000000 (Software as a Service / Cloud API Compute)
  features: string[];
  metadata: {
    galxai_tier_key: string;
    deposit_amount_usd: string;
    total_credit_usd: string;
    match_percentage: string;
    concurrency_rpm: string;
    tpm_limit: string;
    routing_lane: string;
    sla_priority: string;
    prompt_cache_discount: string;
    support_tier: string;
    rate_lock: string;
  };
}

export const STRIPE_PRODUCT_TIERS: Record<string, StripeProductTier> = {
  developer_10: {
    id: 'developer_10',
    name: 'GALXAI Developer Tier — Images & Frontier OpenAI Models Pass',
    statementDescriptor: 'GALXAI DEV $10',
    description: 'Instant Developer Tier activation. 100% pay-as-you-go prepaid credit for Images & Frontier models without waitlist delay.',
    depositAmountUsd: 10,
    welcomeGrantUsd: 0.0,
    matchBonusUsd: 0.00,
    totalCreditUsd: 10.00,
    multiplier: 1.00,
    badge: 'INSTANT UNLOCK ⚡',
    concurrency: '60 RPM / 40k TPM',
    concurrencyRpm: 60,
    tpmLimit: '40k TPM',
    routingLane: 'Standard Anycast Routing',
    supportTier: 'Community Discord Support',
    promptCacheDiscount: 'Standard',
    taxCode: 'txcd_10000000',
    features: [
      'Instant API Key minting (/keys) with zero waitlist',
      'Drop-in OpenAI SDK & Cursor/Windsurf compatibility',
      'Full $10.00 Pay-As-You-Go compute balance',
      'Images API generation (/v1/images/generations)',
      'Standard Tier 1 throughput with safety spend caps'
    ],
    metadata: {
      galxai_tier_key: 'developer_10',
      deposit_amount_usd: '10.00',
      total_credit_usd: '10.00',
      match_percentage: '0%',
      concurrency_rpm: '60',
      tpm_limit: '40000',
      routing_lane: 'standard_anycast',
      sla_priority: 'developer_standard',
      prompt_cache_discount: 'standard',
      support_tier: 'community_discord',
      rate_lock: 'guaranteed'
    }
  },
  lumi_10: {
    id: 'lumi_10',
    name: 'GALXAI Developer Tier — Images & Frontier OpenAI Models Pass',
    statementDescriptor: 'GALXAI DEV $10',
    description: 'Instant Developer Tier activation. 100% pay-as-you-go prepaid credit for Images & Frontier models without waitlist delay.',
    depositAmountUsd: 10,
    welcomeGrantUsd: 0.0,
    matchBonusUsd: 0.00,
    totalCreditUsd: 10.00,
    multiplier: 1.00,
    badge: 'INSTANT UNLOCK ⚡',
    concurrency: '60 RPM / 40k TPM',
    concurrencyRpm: 60,
    tpmLimit: '40k TPM',
    routingLane: 'Standard Anycast Routing',
    supportTier: 'Community Discord Support',
    promptCacheDiscount: 'Standard',
    taxCode: 'txcd_10000000',
    features: [
      'Instant API Key minting (/keys) with zero waitlist',
      'Drop-in OpenAI SDK & Cursor/Windsurf compatibility',
      'Full $10.00 Pay-As-You-Go compute balance',
      'Images API generation (/v1/images/generations)',
      'Standard Tier 1 throughput with safety spend caps'
    ],
    metadata: {
      galxai_tier_key: 'developer_10',
      deposit_amount_usd: '10.00',
      total_credit_usd: '10.00',
      match_percentage: '0%',
      concurrency_rpm: '60',
      tpm_limit: '40000',
      routing_lane: 'standard_anycast',
      sla_priority: 'developer_standard',
      prompt_cache_discount: 'standard',
      support_tier: 'community_discord',
      rate_lock: 'guaranteed'
    }
  },
  starter_25: {
    id: 'starter_25',
    name: 'GALXAI Prepaid Compute — Starter Builder Pack',
    statementDescriptor: 'GALXAI COMPUTE $25',
    description: 'Ideal for early-stage builders deploying production prototypes and agentic workflows.',
    depositAmountUsd: 25,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 12.50,
    totalCreditUsd: 42.50,
    multiplier: 1.50,
    badge: '50% MATCH',
    concurrency: '120 RPM Concurrency',
    concurrencyRpm: 120,
    tpmLimit: '80k TPM',
    routingLane: 'Standard Anycast Routing',
    supportTier: 'Standard Email & Community Discord Support',
    promptCacheDiscount: '75% Prompt Cache pass-through discount',
    taxCode: 'txcd_10000000',
    features: [
      'All Developer Tier capabilities included',
      '$42.50 total usable compute credit',
      '75% Prompt Cache pass-through discount',
      'Standard Rate Lock Guarantee',
      'Standard Email & Community Discord Support'
    ],
    metadata: {
      galxai_tier_key: 'starter_25',
      deposit_amount_usd: '25.00',
      total_credit_usd: '42.50',
      match_percentage: '50%',
      concurrency_rpm: '120',
      tpm_limit: '80000',
      routing_lane: 'standard_anycast',
      sla_priority: 'builder_standard',
      prompt_cache_discount: '75%',
      support_tier: 'email_and_discord',
      rate_lock: 'guaranteed'
    }
  },
  growth_50: {
    id: 'growth_50',
    name: 'GALXAI Prepaid Compute — Growth VIP Priority Pack',
    statementDescriptor: 'GALXAI COMPUTE $50',
    description: 'Engineered for scaling agentic fleets requiring dedicated high-throughput concurrency lanes.',
    depositAmountUsd: 50,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 30.00,
    totalCreditUsd: 85.00,
    multiplier: 1.60,
    badge: 'VIP HIGH-ROLLER 🔓',
    isPopular: true,
    concurrency: '300 RPM Concurrency',
    concurrencyRpm: 300,
    tpmLimit: '200k TPM',
    routingLane: 'Sub-15ms VIP Priority Routing Lane',
    supportTier: 'Priority Technical Support Lane',
    promptCacheDiscount: '75% Prompt Cache pass-through discount',
    taxCode: 'txcd_10000000',
    features: [
      'Sub-15ms VIP Priority Routing Lane',
      '300 RPM Burst Concurrency Capacity',
      '$85.00 total usable compute credit (60% Match)',
      'Automatic Failover Anycast Routing',
      'Priority Technical Support Lane'
    ],
    metadata: {
      galxai_tier_key: 'growth_50',
      deposit_amount_usd: '50.00',
      total_credit_usd: '85.00',
      match_percentage: '60%',
      concurrency_rpm: '300',
      tpm_limit: '200000',
      routing_lane: 'sub_15ms_vip_priority',
      sla_priority: 'vip_sub15ms',
      prompt_cache_discount: '75%',
      support_tier: 'priority_support',
      rate_lock: 'guaranteed'
    }
  },
  fleet_100: {
    id: 'fleet_100',
    name: 'GALXAI Prepaid Compute — Fleet Scale Pack',
    statementDescriptor: 'GALXAI COMPUTE $100',
    description: 'Built for high-velocity teams running automated multi-agent code analysis & bulk image pipelines.',
    depositAmountUsd: 100,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 75.00,
    totalCreditUsd: 180.00,
    multiplier: 1.75,
    badge: '75% SCALE MATCH 🚀',
    isPopular: true,
    concurrency: '600 RPM Concurrency',
    concurrencyRpm: 600,
    tpmLimit: '500k TPM',
    routingLane: 'Priority Global Edge Ingestion',
    supportTier: 'Direct Discord Architect Support Channel',
    promptCacheDiscount: 'Prompt Caching multi-turn persistence',
    taxCode: 'txcd_10000000',
    features: [
      '600 RPM High-Concurrency Pipeline',
      '$180.00 total compute credit (75% match)',
      'Priority Global Edge Ingestion',
      'Prompt Caching multi-turn persistence',
      'Direct Discord Architect Support Channel'
    ],
    metadata: {
      galxai_tier_key: 'fleet_100',
      deposit_amount_usd: '100.00',
      total_credit_usd: '180.00',
      match_percentage: '75%',
      concurrency_rpm: '600',
      tpm_limit: '500000',
      routing_lane: 'priority_global_edge',
      sla_priority: 'fleet_high_throughput',
      prompt_cache_discount: '75%',
      support_tier: 'discord_architect',
      rate_lock: 'guaranteed'
    }
  },
  sovereign_250: {
    id: 'sovereign_250',
    name: 'GALXAI Prepaid Compute — Enterprise Sovereign Pack',
    statementDescriptor: 'GALXAI COMPUTE $250',
    description: 'Maximum 100% double compute match with dedicated isolated VPC compute lanes.',
    depositAmountUsd: 250,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 250.00,
    totalCreditUsd: 505.00,
    multiplier: 2.00,
    badge: '100% DOUBLE MATCH 👑',
    concurrency: '1,200 RPM Concurrency',
    concurrencyRpm: 1200,
    tpmLimit: '1,000k TPM',
    routingLane: 'Dedicated VPC Private Lane & Vault',
    supportTier: 'Dedicated Account Infrastructure Engineer',
    promptCacheDiscount: '75% Prompt Cache pass-through discount',
    taxCode: 'txcd_10000000',
    features: [
      '2.00x 100% Double Match ($505 Total Usable Credit)',
      'Dedicated VPC Private Lane & Vault',
      '1,200 RPM Concurrency Capacity',
      'Custom Corporate Invoicing & ACH Terms',
      'Dedicated Account Infrastructure Engineer'
    ],
    metadata: {
      galxai_tier_key: 'sovereign_250',
      deposit_amount_usd: '250.00',
      total_credit_usd: '505.00',
      match_percentage: '100%',
      concurrency_rpm: '1200',
      tpm_limit: '1000000',
      routing_lane: 'dedicated_vpc_private_lane',
      sla_priority: 'enterprise_vpc',
      prompt_cache_discount: '75%',
      support_tier: 'dedicated_account_engineer',
      rate_lock: 'guaranteed'
    }
  },
  hyperscale_500: {
    id: 'hyperscale_500',
    name: 'GALXAI Prepaid Compute — Hyperscale Infrastructure Pack',
    statementDescriptor: 'GALXAI COMPUTE $500',
    description: 'Enterprise-grade SLA guarantee with unlimited burst and dedicated Slack bridge.',
    depositAmountUsd: 500,
    welcomeGrantUsd: 5.0,
    matchBonusUsd: 500.00,
    totalCreditUsd: 1005.00,
    multiplier: 2.00,
    badge: '100% DOUBLE MATCH ✨',
    concurrency: 'Unlimited Burst',
    concurrencyRpm: 'Unlimited',
    tpmLimit: 'Unlimited',
    routingLane: 'Unlimited Concurrency Burst & Dedicated Route',
    supportTier: 'Direct Private Slack Channel with Core Team',
    promptCacheDiscount: 'Custom Fine-Tuning & Model Weight Cache',
    taxCode: 'txcd_10000000',
    features: [
      '$1,005.00 total usable compute credit',
      'Unlimited Concurrency Burst & Dedicated Route',
      '99.99% Availability Custom SLA Guarantee',
      'Direct Private Slack Channel with Core Team',
      'Custom Fine-Tuning & Model Weight Cache'
    ],
    metadata: {
      galxai_tier_key: 'hyperscale_500',
      deposit_amount_usd: '500.00',
      total_credit_usd: '1005.00',
      match_percentage: '100%',
      concurrency_rpm: 'unlimited',
      tpm_limit: 'unlimited',
      routing_lane: 'dedicated_unlimited_route',
      sla_priority: 'hyperscale_custom_sla',
      prompt_cache_discount: '75%',
      support_tier: 'private_slack_channel',
      rate_lock: 'guaranteed'
    }
  }
};

export function getTierByAmount(amount: number): StripeProductTier | undefined {
  const match = Object.values(STRIPE_PRODUCT_TIERS).find(t => t.depositAmountUsd === amount);
  return match;
}

export interface AccountTierLimits {
  tierKey: string;
  rpm: number;
  tpm: string;
  name: string;
  routingLane: string;
  supportTier: string;
  promptCacheDiscount: string;
}

export function getTierLimitsForDeposit(depositTotalUsd: number): AccountTierLimits {
  if (depositTotalUsd >= 500) {
    return {
      tierKey: 'hyperscale_500',
      rpm: 10000,
      tpm: 'Unlimited',
      name: 'Hyperscale Infra',
      routingLane: 'Unlimited Concurrency Burst & Dedicated Route',
      supportTier: 'Direct Private Slack Channel with Core Team',
      promptCacheDiscount: 'Custom Fine-Tuning & Model Weight Cache'
    };
  }
  if (depositTotalUsd >= 250) {
    return {
      tierKey: 'sovereign_250',
      rpm: 1200,
      tpm: '1,000k TPM',
      name: 'Enterprise Sovereign',
      routingLane: 'Dedicated VPC Private Lane & Vault',
      supportTier: 'Dedicated Account Infrastructure Engineer',
      promptCacheDiscount: '75% Prompt Cache pass-through discount'
    };
  }
  if (depositTotalUsd >= 100) {
    return {
      tierKey: 'fleet_100',
      rpm: 600,
      tpm: '500k TPM',
      name: 'Fleet Scale',
      routingLane: 'Priority Global Edge Ingestion',
      supportTier: 'Direct Discord Architect Support Channel',
      promptCacheDiscount: 'Prompt Caching multi-turn persistence'
    };
  }
  if (depositTotalUsd >= 50) {
    return {
      tierKey: 'growth_50',
      rpm: 300,
      tpm: '200k TPM',
      name: 'Growth VIP',
      routingLane: 'Sub-15ms VIP Priority Routing Lane',
      supportTier: 'Priority Technical Support Lane',
      promptCacheDiscount: '75% Prompt Cache pass-through discount'
    };
  }
  if (depositTotalUsd >= 25) {
    return {
      tierKey: 'starter_25',
      rpm: 120,
      tpm: '80k TPM',
      name: 'Starter Builder',
      routingLane: 'Standard Anycast Routing',
      supportTier: 'Standard Email & Community Discord Support',
      promptCacheDiscount: '75% Prompt Cache pass-through discount'
    };
  }
  if (depositTotalUsd >= 10) {
    return {
      tierKey: 'developer_10',
      rpm: 60,
      tpm: '40k TPM',
      name: 'Developer Tier',
      routingLane: 'Standard Anycast Routing',
      supportTier: 'Community Discord Support',
      promptCacheDiscount: 'Standard'
    };
  }
  return {
    tierKey: 'free',
    rpm: 60,
    tpm: '20k TPM',
    name: 'Free Tier',
    routingLane: 'Shared Community Pool',
    supportTier: 'Community Discord Support',
    promptCacheDiscount: 'Standard'
  };
}
