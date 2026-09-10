import type { Pool } from 'pg';
import type { Database } from '../types';
import { parseSignupCreditOffer, type SignupCreditOffer } from '../../billing/signup-offer';

/** Private policy storage. No browser-writeable RPC or credit claim endpoint. */
export async function readSignupCreditOffer(db: Pick<Pool, 'query'>): Promise<SignupCreditOffer> {
  type Policy = Database['private']['Tables']['galx_signup_credit_policy']['Row'];
  const { rows } = await db.query<Pick<Policy, 'enabled' | 'amount_usd'>>(
    'SELECT enabled, amount_usd FROM private.galx_signup_credit_policy WHERE singleton = true',
  );
  const row = rows[0];
  const offer = row && parseSignupCreditOffer({ enabled: row.enabled, amountUsd: row.enabled ? Number(row.amount_usd) : null });
  if (!offer) throw new Error('Signup offer unavailable');
  return offer;
}
