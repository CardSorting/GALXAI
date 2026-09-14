/** Public quota DTO. Dollar bookkeeping and grant identity stay server-side. */
export interface FreeGenerationQuota { sites: number; images: number; siteTurns: number; }
export type GenerationAllowance = { plan: 'pro'; quota: null } | { plan: 'free'; quota: FreeGenerationQuota };
export const GENERATION_QUOTA_CHANGED = 'galx:generation-quota-changed';

export function readGenerationAllowance(input: unknown): GenerationAllowance | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  if (value.plan === 'pro') return value.quota === null ? {plan:'pro',quota:null} : null;
  if (value.plan !== 'free' || !value.quota || typeof value.quota !== 'object') return null;
  const quota = value.quota as FreeGenerationQuota;
  if (!Number.isSafeInteger(quota.sites) || quota.sites < 0 || quota.sites > 1 ||
      !Number.isSafeInteger(quota.images) || quota.images < 0 || quota.images > 5 ||
      !Number.isSafeInteger(quota.siteTurns) || quota.siteTurns < 0 || quota.siteTurns > 3) return null;
  return {plan:'free',quota:{sites:quota.sites,images:quota.images,siteTurns:quota.siteTurns}};
}
