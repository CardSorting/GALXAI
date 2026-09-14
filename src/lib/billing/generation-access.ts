import { getPostgresPool } from '../db/postgres';
import { StripeEngine } from '../stripe/stripe';
import { SitesFairStore, type FairPolicy } from '../sites/fair-store';
import { requirePaidSitesAccess } from '../sites/paid-access';
import { FairUsageError } from '../sites/fair-policy';
import type { Pool } from 'pg';

/** A confirmed absence of Pro permits free admission; an authority outage does not. */
export async function generationAccess(owner: string, pool = getPostgresPool(), policy?: FairPolicy): Promise<'pro' | 'free'> {
  if (!pool) throw new FairUsageError(503,'authority');
  return (await generationMembership(owner,pool,policy || await new SitesFairStore(pool).policy())).plan;
}
export async function generationMembership(owner: string, pool: Pool, policy: FairPolicy) {
  try {
    const access=await requirePaidSitesAccess(pool,StripeEngine.getInstance().getClient(),owner,policy);
    return {plan:'pro' as const,access};
  } catch(error) {
    if (error instanceof FairUsageError && error.status === 403) return {plan:'free' as const,
      access:{accountId:owner,validUntil:Date.now()+15000,policyRevision:policy.revision,tier:'free' as const}};
    throw error;
  }
}

export const GenerationAccess = { resolve: generationAccess };
