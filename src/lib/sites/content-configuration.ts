import { isolatedRelay, isolatedRelaysEnabled } from '../../core/router/adapters/IsolatedRelayTransport';
import { getPostgresPool } from '@/lib/db/postgres';
import { requireSitesActivation, requireSitesCohort } from '@/lib/billing/sites-activation';
import { requireSitesRelayPreflight } from '@/lib/billing/sites-relay-preflight';
import { sitesRateCard } from '@/lib/billing/sites-generation';

export function sitesContentConfiguration() {
    const pool = getPostgresPool();
    const rate = sitesRateCard(process.env.GALX_SITES_RATE_CARD);
    const selected = isolatedRelaysEnabled() ? isolatedRelay('sites') : undefined;
    const url = selected?.url || process.env.VM_RELAY_URL || process.env.GALXAI_RELAY_URL || process.env.RELAY_URL;
    const key = selected?.key || process.env.VM_RELAY_API_KEY || process.env.RELAY_API_KEYS?.split(',')[0]?.trim();
    if (!pool || pool.waitingCount >= 25 || !rate || !url || !key) throw new Error('Unavailable');
    return { pool, rate, relay: { url, key }, authorizeGeneration: async (signal: AbortSignal, accountId: string) => {
      requireSitesCohort(process.env.GALX_SITES_COHORT_ACCOUNT_IDS, accountId);
      requireSitesActivation(process.env.GALX_SITES_CONTENT_ENABLED, process.env.GALX_SITES_ACTIVATION_EVIDENCE,
        url, rate, Date.now(), process.env.GALX_SITES_DELIVERY_MODE);
      await requireSitesRelayPreflight({ url, adminKey: process.env.GALX_SITES_RELAY_ADMIN_KEY,
        model: rate.model, maxOutputTokens: rate.maxOutputTokens,
        ...(rate.billingMode === 'fixed' ? { profile: 'sites-local-v1' as const } : {}), signal });
    } };
}
