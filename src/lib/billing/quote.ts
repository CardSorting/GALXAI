import type { PoolClient } from 'pg';
import { calculateComputeCredit } from '../stripe/config';

/**
 * Server-side quote for a prepaid compute top-up.
 * Matches the tier match bonus logic in STRIPE_CHECKOUT_PACKS exactly.
 * Welcome grants are $0 for the $10 Developer Tier; match bonuses start at $25.
 */
export async function readTopUpQuote(db: Pick<PoolClient,'query'>, userId: string, amount: number) {
  // Ensure wallet exists before quoting (idempotent, no-op if already created)
  await db.query(`INSERT INTO public.galx_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
  const quote = calculateComputeCredit(amount);
  return {
    amountUsd: amount,
    creditUsd: quote.totalCredit,
    bonusUsd: quote.matchBonus + quote.welcomeGrant,
    welcomeGrant: quote.welcomeGrant,
    matchBonus: quote.matchBonus,
    tierKey: amount >= 500 ? 'hyperscale_500' : amount >= 250 ? 'sovereign_250' : amount >= 100 ? 'fleet_100' : amount >= 50 ? 'growth_50' : amount >= 25 ? 'starter_25' : 'developer_10',
    tierLabel: quote.tier.label,
  };
}
