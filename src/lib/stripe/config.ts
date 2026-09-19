/**
 * GALX Stripe configuration.
 *
 * Active commercial terms are deliberately small: GALX Pro is the consumer
 * subscription and Nova Developer Access is a separate recurring access
 * subscription. Historical wallet settlement lives in
 * billing/legacy-wallet-pricing.ts and is not exposed as a current catalog.
 */

import { DEVELOPER_ACCESS, PREPAID_DEVELOPER_CHECKOUT_ENABLED, PRO_PLAN } from '../billing/pro-plan';
import { publicUsagePricing } from '../billing/usage-pricing';

export const STRIPE_PRICING_STRATEGY = {
  consumerPlan: {
    id: PRO_PLAN.id,
    lookupKey: 'galx_pro_monthly_v1',
    monthlyPriceUsd: PRO_PLAN.monthlyPriceUsd,
    currency: PRO_PLAN.currency.toLowerCase(),
    interval: PRO_PLAN.interval,
  },
  developerAccess: {
    id: DEVELOPER_ACCESS.id,
    lookupKey: DEVELOPER_ACCESS.lookupKey,
    planKey: DEVELOPER_ACCESS.planKey,
    monthlyPriceUsd: DEVELOPER_ACCESS.monthlyPriceUsd,
    currency: DEVELOPER_ACCESS.currency.toLowerCase(),
    interval: DEVELOPER_ACCESS.interval,
    checkoutEnabled: DEVELOPER_ACCESS.checkoutEnabled,
    automaticActivation: DEVELOPER_ACCESS.automaticActivation,
    usageBilledSeparately: DEVELOPER_ACCESS.usageBilledSeparately,
    includedUsageCreditsUsd: DEVELOPER_ACCESS.includedUsageCreditsUsd,
  },
  usagePricing: publicUsagePricing(),
  prepaidDeveloperCheckoutEnabled: PREPAID_DEVELOPER_CHECKOUT_ENABLED,
} as const;

function loadEnvLocalIfNode() {
  if (typeof window === 'undefined' && !process.env.STRIPE_SECRET_KEY) {
    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (!fs.existsSync(envPath)) return;
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const index = trimmed.indexOf('=');
          const key = trimmed.slice(0, index).trim();
          const value = trimmed.slice(index + 1).trim();
          if (key && !process.env[key]) process.env[key] = value;
        }
      }
    } catch {
      // Environment loading is best-effort in local and bundled contexts.
    }
  }
}

export function getStripeConfig() {
  loadEnvLocalIfNode();

  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '';
  const candidateSecretSources = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_PRODUCTION,
    process.env.STRIPE_CREDITS_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_LIVE,
  ];
  const webhookSecrets = candidateSecretSources
    .filter((secret): secret is string => Boolean(secret && typeof secret === 'string'))
    .flatMap(secret => secret.split(','))
    .map(secret => secret.trim())
    .filter(secret => /^whsec_[A-Za-z0-9]+$/.test(secret) && !/placeholder|your_stripe/i.test(secret));
  const webhookSecret = webhookSecrets[0] || process.env.STRIPE_WEBHOOK_SECRET || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://galx.ai';
  const isConfigured = Boolean(
    /^(sk|rk)_(live|test)_[A-Za-z0-9]+$/.test(secretKey) &&
    !secretKey.includes('MockStripeSecretKey') &&
    !secretKey.includes('your_stripe_secret_key'),
  );

  return {
    secretKey,
    publishableKey,
    webhookSecret,
    webhookSecrets,
    appUrl,
    isConfigured,
    currency: 'usd',
  } as const;
}
