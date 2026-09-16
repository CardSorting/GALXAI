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
  perks: string[];
}

export const STRIPE_CHECKOUT_PACKS: Record<number, StripeTierConfig> = {
  10: {
    amount: 10,
    label: 'Developer Tier (Pay-As-You-Go API & Images)',
    badge: 'DEV TIER ⚡',
    multiplier: 1.50,
    welcomeGrant: 5.0,
    perks: ['Instant Developer Tier & API Keys Unlock', 'Pay-as-you-go for Images & Frontier OpenAI Models', 'Zero waitlist application required']
  },
  25: {
    amount: 25,
    label: 'Starter Builder Pack',
    badge: '50% Match Bonus',
    multiplier: 1.50,
    welcomeGrant: 5.0,
    perks: ['50% Instant Compute Match', '$5 Free Welcome Credit', 'Standard Rate Lock Guarantee']
  },
  50: {
    amount: 50,
    label: 'Growth VIP Priority Pack',
    badge: 'VIP High-Roller 🔓',
    multiplier: 1.60,
    welcomeGrant: 5.0,
    perks: ['Sub-15ms VIP Priority Routing', '+$30 Free Matched Compute', '75% Prompt Cache Pass-Through']
  },
  100: {
    amount: 100,
    label: 'Fleet Scale Pack',
    badge: '600 RPM Fleet 🔓',
    multiplier: 1.75,
    welcomeGrant: 5.0,
    perks: ['600 RPM Concurrency Burst', '+$75 Free Matched Compute', 'Priority Anycast Failover']
  },
  250: {
    amount: 250,
    label: 'Enterprise Sovereign Pack',
    badge: 'Unlimited VPC 🔓',
    multiplier: 2.00,
    welcomeGrant: 5.0,
    perks: ['2.00x Double Compute Match', 'Dedicated VPC Private Lane', 'Unlimited Concurrency Burst']
  },
  500: {
    amount: 500,
    label: 'Hyperscale Infrastructure Pack',
    badge: '100% Double Match 🔓',
    multiplier: 2.00,
    welcomeGrant: 5.0,
    perks: ['100% Hyperscale Match ($1,000 Credit)', 'Dedicated Account Architect', 'Custom Enterprise SLA']
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
  const tier = STRIPE_CHECKOUT_PACKS[deposit] || {
    amount: deposit,
    label: `${deposit.toFixed(0)} Compute Pack`,
    badge: deposit >= 250 ? '100% Double Match' : deposit >= 100 ? '75% Match' : deposit >= 50 ? '60% Match' : deposit >= 25 ? '50% Match' : 'Standard',
    multiplier: deposit >= 250 ? 2.00 : deposit >= 100 ? 1.75 : deposit >= 50 ? 1.60 : deposit >= 25 ? 1.50 : 1.0,
    welcomeGrant: 5.0,
    perks: ['Instant micro-metered token credit', '75% prompt caching pass-through']
  };

  const welcomeGrant = 5.0;
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
