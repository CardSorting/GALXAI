/** Public quota DTO. Dollar bookkeeping and grant identity stay server-side. */
/** Kept as an internal compatibility shape while historical image ledger rows age out. */
export interface FreeGenerationQuota { sites: number; images: number; siteTurns: number; }
export type FreeGenerationAvailability = 'available' | 'busy' | 'paused';
export type GenerationAllowance = { plan: 'pro'; quota: null } | { plan: 'free'; quota: { sites: number; siteTurns: number }; availability: { sites: FreeGenerationAvailability } };
export const GENERATION_QUOTA_CHANGED = 'galx:generation-quota-changed';

export function readGenerationAllowance(input: unknown): GenerationAllowance | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  if (value.plan === 'pro') return value.quota === null ? {plan:'pro',quota:null} : null;
  if (value.plan !== 'free' || !value.quota || typeof value.quota !== 'object') return null;
  const quota = value.quota as FreeGenerationQuota;
  if (!Number.isSafeInteger(quota.sites) || quota.sites < 0 || quota.sites > 1 ||
      !Number.isSafeInteger(quota.siteTurns) || quota.siteTurns < 0 || quota.siteTurns > 3) return null;
  const availability=value.availability as {sites:FreeGenerationAvailability};
  if(!availability || !['available','busy','paused'].includes(availability.sites))return null;
  return {plan:'free',quota:{sites:quota.sites,siteTurns:quota.siteTurns},availability:{sites:availability.sites}};
}
