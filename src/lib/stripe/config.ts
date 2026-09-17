/**
 * GALXAI: Stripe Core Infrastructure Configuration
 * Type-safe configuration loader with environment variable validation,
 * fallback mock detection, currency settings, and tier matching helpers.
 */

export interface StripeTierConfig {
  amount: number;
  label: string;
  badge: string;
  multiplier: number;
  welcomeGrant: number;
  matchBonus: number;
  totalCredit: number;
  concurrency: string;
  concurrencyRpm: number | 'Unlimited';
  tpmLimit: string;
  routingLane: string;
  supportTier: string;
  promptCacheDiscount: string;
  perks: string[];
}

export const STRIPE_CHECKOUT_PACKS: Record<number, StripeTierConfig> = {
  10: {
    amount: 10,
    label: 'Developer Tier (Instant API Access Pass)',
    badge: 'INSTANT UNLOCK ⚡',
    multiplier: 1.00,
    welcomeGrant: 0.0,
    matchBonus: 0.0,
    totalCredit: 10.0,
    concurrency: '60 RPM / 40k TPM',
    concurrencyRpm: 60,
    tpmLimit: '40k TPM',
    routingLane: 'Standard Edge Routing',
    supportTier: 'Community Discord Support',
    promptCacheDiscount: 'Standard',
    perks: [
      'Instant API Key minting (/keys) with zero waitlist',
      'Drop-in OpenAI SDK & Cursor/Windsurf compatibility',
      'Full $10.00 Pay-As-You-Go compute balance',
      'Images API generation (/v1/images/generations)',
      'Standard Tier 1 throughput with safety spend caps'
    ]
  },
  25: {
    amount: 25,
    label: 'Starter Builder (50% Compute Match)',
    badge: '50% MATCH',
    multiplier: 1.50,
    welcomeGrant: 5.0,
    matchBonus: 12.50,
    totalCredit: 42.50,
    concurrency: '120 RPM Concurrency',
    concurrencyRpm: 120,
    tpmLimit: '80k TPM',
    routingLane: 'Standard Edge Routing',
    supportTier: 'Standard Email & Community Discord Support',
    promptCacheDiscount: '75% Prompt Cache pass-through discount',
    perks: [
      'All Developer Tier capabilities included',
      '$42.50 total usable compute credit',
      '75% Prompt Cache pass-through discount',
      'Standard Rate Lock Guarantee',
      'Standard Email & Community Discord Support'
    ]
  },
  50: {
    amount: 50,
    label: 'Growth VIP (Sub-15ms VIP Priority Lane)',
    badge: 'VIP HIGH-ROLLER 🔓',
    multiplier: 1.60,
    welcomeGrant: 5.0,
    matchBonus: 30.00,
    totalCredit: 85.00,
    concurrency: '300 RPM Concurrency',
    concurrencyRpm: 300,
    tpmLimit: '200k TPM',
    routingLane: 'Sub-15ms VIP Priority Routing Lane',
    supportTier: 'Priority Technical Support Lane',
    promptCacheDiscount: '75% Prompt Cache pass-through discount',
    perks: [
      'Sub-15ms VIP Priority Routing Lane',
      '300 RPM Burst Concurrency Capacity',
      '$85.00 total usable compute credit (60% Match)',
      'High-Availability Automated Failover',
      'Priority Technical Support Lane'
    ]
  },
  100: {
    amount: 100,
    label: 'Fleet Scale (600 RPM Autonomous Swarms)',
    badge: '75% SCALE MATCH 🚀',
    multiplier: 1.75,
    welcomeGrant: 5.0,
    matchBonus: 75.00,
    totalCredit: 180.00,
    concurrency: '600 RPM Concurrency',
    concurrencyRpm: 600,
    tpmLimit: '500k TPM',
    routingLane: 'Priority Global Edge Ingestion',
    supportTier: 'Direct Discord Architect Support Channel',
    promptCacheDiscount: 'Prompt Caching multi-turn persistence',
    perks: [
      '600 RPM High-Concurrency Pipeline',
      '$180.00 total compute credit (75% match)',
      'Priority Global Edge Ingestion',
      'Prompt Caching multi-turn persistence',
      'Direct Discord Architect Support Channel'
    ]
  },
  250: {
    amount: 250,
    label: 'Enterprise Sovereign (Dedicated VPC & Double Match)',
    badge: '100% DOUBLE MATCH 👑',
    multiplier: 2.00,
    welcomeGrant: 5.0,
    matchBonus: 250.00,
    totalCredit: 505.00,
    concurrency: '1,200 RPM Concurrency',
    concurrencyRpm: 1200,
    tpmLimit: '1,000k TPM',
    routingLane: 'Dedicated VPC Private Lane & Vault',
    supportTier: 'Dedicated Account Infrastructure Engineer',
    promptCacheDiscount: '75% Prompt Cache pass-through discount',
    perks: [
      '2.00x 100% Double Match ($505 Total Usable Credit)',
      'Dedicated VPC Private Lane & Vault',
      '1,200 RPM Concurrency Capacity',
      'Custom Corporate Invoicing & ACH Terms',
      'Dedicated Account Infrastructure Engineer'
    ]
  },
  500: {
    amount: 500,
    label: 'Hyperscale Infra (Unlimited Burst & Custom SLA)',
    badge: '100% DOUBLE MATCH ✨',
    multiplier: 2.00,
    welcomeGrant: 5.0,
    matchBonus: 500.00,
    totalCredit: 1005.00,
    concurrency: 'Unlimited Burst',
    concurrencyRpm: 'Unlimited',
    tpmLimit: 'Unlimited',
    routingLane: 'Unlimited Concurrency Burst & Dedicated Route',
    supportTier: 'Direct Private Slack Channel with Core Team',
    promptCacheDiscount: 'Custom Fine-Tuning & Model Weight Cache',
    perks: [
      '$1,005.00 total usable compute credit',
      'Unlimited Concurrency Burst & Dedicated Route',
      '99.99% Availability Custom SLA Guarantee',
      'Direct Private Slack Channel with Core Team',
      'Custom Fine-Tuning & Model Weight Cache'
    ]
  }
};

function loadEnvLocalIfNode() {
  if (typeof window === 'undefined' && !process.env.STRIPE_SECRET_KEY) {
    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim();
            if (key && !process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch {
      // Ignore in browser/bundled contexts
    }
  }
}

export function getStripeConfig() {
  loadEnvLocalIfNode();

  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '';
  
  // Aggregate all candidate webhook secrets for zero-downtime secret rotation and multi-endpoint setups
  const candidateSecretSources = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_PRODUCTION,
    process.env.STRIPE_CREDITS_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_LIVE
  ];

  const webhookSecrets = candidateSecretSources
    .filter((s): s is string => Boolean(s && typeof s === 'string'))
    .flatMap(s => s.split(','))
    .map(s => s.trim())
    .filter(s => /^whsec_[A-Za-z0-9]+$/.test(s) && !/placeholder|your_stripe/i.test(s));

  const webhookSecret = webhookSecrets[0] || process.env.STRIPE_WEBHOOK_SECRET || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://galx.ai';

  const isConfigured = Boolean(
    /^(sk|rk)_(live|test)_[A-Za-z0-9]+$/.test(secretKey) &&
    !secretKey.includes('MockStripeSecretKey') &&
    !secretKey.includes('your_stripe_secret_key')
  );

  return {
    secretKey,
    publishableKey,
    webhookSecret,
    webhookSecrets,
    appUrl,
    isConfigured,
    currency: 'usd'
  };
}

export function calculateComputeCredit(amountUsd: number) {
  const deposit = Math.max(0, Number(amountUsd) || 0);
  const tier: StripeTierConfig = STRIPE_CHECKOUT_PACKS[deposit] || {
    amount: deposit,
    label: `${deposit.toFixed(0)} Compute Pack`,
    badge: deposit >= 250 ? '100% Double Match' : deposit >= 100 ? '75% Match' : deposit >= 50 ? '60% Match' : deposit >= 25 ? '50% Match' : 'Standard',
    multiplier: deposit >= 250 ? 2.00 : deposit >= 100 ? 1.75 : deposit >= 50 ? 1.60 : deposit >= 25 ? 1.50 : 1.0,
    welcomeGrant: deposit >= 25 ? 5.0 : 0.0,
    matchBonus: deposit >= 25 ? Number((deposit * (deposit >= 250 ? 1.0 : deposit >= 100 ? 0.75 : deposit >= 50 ? 0.60 : 0.50)).toFixed(2)) : 0,
    totalCredit: Number((deposit + (deposit >= 25 ? 5.0 : 0.0) + (deposit >= 25 ? deposit * (deposit >= 250 ? 1.0 : deposit >= 100 ? 0.75 : deposit >= 50 ? 0.60 : 0.50) : 0)).toFixed(2)),
    concurrency: deposit >= 500 ? 'Unlimited Burst' : deposit >= 250 ? '1,200 RPM Concurrency' : deposit >= 100 ? '600 RPM Concurrency' : deposit >= 50 ? '300 RPM Concurrency' : deposit >= 25 ? '120 RPM Concurrency' : '60 RPM / 40k TPM',
    concurrencyRpm: deposit >= 500 ? 'Unlimited' : deposit >= 250 ? 1200 : deposit >= 100 ? 600 : deposit >= 50 ? 300 : deposit >= 25 ? 120 : 60,
    tpmLimit: deposit >= 500 ? 'Unlimited' : deposit >= 250 ? '1,000k TPM' : deposit >= 100 ? '500k TPM' : deposit >= 50 ? '200k TPM' : deposit >= 25 ? '80k TPM' : '40k TPM',
    routingLane: deposit >= 500 ? 'Unlimited Concurrency Burst & Dedicated Route' : deposit >= 250 ? 'Dedicated VPC Private Lane & Vault' : deposit >= 100 ? 'Priority Global Edge Ingestion' : deposit >= 50 ? 'Sub-15ms VIP Priority Routing Lane' : 'Standard Edge Routing',
    supportTier: deposit >= 500 ? 'Direct Private Slack Channel with Core Team' : deposit >= 250 ? 'Dedicated Account Infrastructure Engineer' : deposit >= 100 ? 'Direct Discord Architect Support Channel' : deposit >= 50 ? 'Priority Technical Support Lane' : 'Standard Email & Community Discord Support',
    promptCacheDiscount: deposit >= 10 ? '75% Prompt Cache pass-through discount' : 'Standard',
    perks: ['Instant micro-metered token credit', '75% prompt caching pass-through']
  };

  const welcomeGrant = deposit >= 25 ? 5.0 : 0.0;
  const matchBonus = deposit >= 25 ? Number((deposit * (tier.multiplier - 1)).toFixed(2)) : 0;
  const totalCredit = Number((deposit + welcomeGrant + matchBonus).toFixed(2));

  return {
    depositAmount: deposit,
    welcomeGrant,
    matchBonus,
    totalCredit,
    tier
  };
}
