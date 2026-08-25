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
  25: {
    amount: 25,
    label: 'Starter Builder Pack',
    badge: '10% Bonus Match',
    multiplier: 1.10,
    welcomeGrant: 5.0,
    perks: ['10% Instant Compute Match', '$5 Free Welcome Credit', 'Standard Rate Lock Guarantee']
  },
  50: {
    amount: 50,
    label: 'Growth VIP Priority Pack',
    badge: '25% Match Bonus 🔓',
    multiplier: 1.25,
    welcomeGrant: 5.0,
    perks: ['Sub-15ms VIP Priority Routing', '+$12.50 Matched Compute', '75% Prompt Cache Pass-Through']
  },
  100: {
    amount: 100,
    label: 'Fleet Scale Pack',
    badge: '50% Match Grant 🔓',
    multiplier: 1.50,
    welcomeGrant: 5.0,
    perks: ['50% Double Match Compute', '600 RPM Concurrency Burst', 'Priority Anycast Failover']
  },
  250: {
    amount: 250,
    label: 'Enterprise Sovereign Pack',
    badge: '50% Match Grant 🔓',
    multiplier: 1.50,
    welcomeGrant: 5.0,
    perks: ['50% Scale Match Compute', 'Dedicated VPC Private Lane', 'Unlimited Concurrency Burst']
  },
  500: {
    amount: 500,
    label: 'Hyperscale Infrastructure Pack',
    badge: '50% Apex Match 🔓',
    multiplier: 1.50,
    welcomeGrant: 5.0,
    perks: ['50% Hyperscale Match ($750 Credit)', 'Dedicated Account Architect', 'Custom Enterprise SLA']
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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const isConfigured = Boolean(
    secretKey &&
    !secretKey.includes('MockStripeSecretKey') &&
    !secretKey.includes('your_stripe_secret_key')
  );

  return {
    secretKey,
    publishableKey,
    webhookSecret,
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
    badge: deposit >= 100 ? '50% Match' : deposit >= 50 ? '25% Bonus' : deposit >= 25 ? '10% Bonus' : 'Standard',
    multiplier: deposit >= 100 ? 1.50 : deposit >= 50 ? 1.25 : deposit >= 25 ? 1.10 : (deposit >= 10 ? 1.50 : 1.0),
    welcomeGrant: 5.0,
    perks: ['Instant micro-metered token credit', '75% prompt caching pass-through']
  };

  const welcomeGrant = 5.0;
  let matchBonus = 0;
  if (deposit >= 10 && deposit < 25) {
    matchBonus = 5.0; // $10 deposit gets $5 bonus -> $15 total credit
  } else {
    matchBonus = Number((deposit * (tier.multiplier - 1)).toFixed(2));
  }

  const totalCredit = Number((deposit + welcomeGrant + matchBonus).toFixed(2));

  return {
    depositAmount: deposit,
    welcomeGrant,
    matchBonus,
    totalCredit,
    tier
  };
}
