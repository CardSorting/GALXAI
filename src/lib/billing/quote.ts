import type { PoolClient } from 'pg';
import { calculateComputeCredit } from '../stripe/config';
import { resolveTierKey } from '../stripe/products';
import type { ComputeTierKey } from '../supabase/types';

/**
 * Server-side quote for a prepaid compute top-up.
 * Matches the tier match bonus logic in STRIPE_CHECKOUT_PACKS exactly.
 * Welcome grants are $0 for the $10 Developer Tier; match bonuses start at $25.
 */
export async function readTopUpQuote(db: Pick<PoolClient,'query'>, userId: string, amount: number): Promise<{
  amountUsd: number;
  creditUsd: number;
  bonusUsd: number;
  welcomeGrant: number;
  matchBonus: number;
  tierKey: ComputeTierKey;
  tierLabel: string;
}> {
  // Ensure wallet exists before quoting (idempotent, no-op if already created)
  await db.query(`INSERT INTO public.galx_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
  const quote = calculateComputeCredit(amount);
  return {
    amountUsd: amount,
    creditUsd: quote.totalCredit,
    bonusUsd: quote.matchBonus + quote.welcomeGrant,
    welcomeGrant: quote.welcomeGrant,
    matchBonus: quote.matchBonus,
    tierKey: resolveTierKey(amount),
    tierLabel: quote.tier.label,
  };
}
