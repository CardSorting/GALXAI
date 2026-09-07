import type { PoolClient } from 'pg';
import { calculateComputeCredit } from '../stripe/config';

export async function readTopUpQuote(db: Pick<PoolClient,'query'>, userId: string, amount: number) {
  const wallet = (await db.query('SELECT proof_of_deposit_verified FROM galx_wallets WHERE user_id=$1', [userId])).rows[0];
  const reserved = (await db.query(`SELECT 1 FROM galx_stripe_checkout_sessions WHERE user_id=$1 AND status='open'
    AND created_at > now()-interval '2 hours' AND (metadata->>'welcomeGrant')::numeric > 0 LIMIT 1`, [userId])).rowCount;
  const quote = calculateComputeCredit(amount);
  const welcomeGrant = wallet?.proof_of_deposit_verified || reserved ? 0 : quote.welcomeGrant;
  const bonusUsd = quote.matchBonus + welcomeGrant;
  return { amountUsd: amount, creditUsd: amount + bonusUsd, bonusUsd, welcomeGrant };
}
