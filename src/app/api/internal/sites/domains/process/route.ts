import { getPostgresPool } from '@/lib/db/postgres';
import { SiteDomainRegistry } from '@/lib/sites/domain-registry';
import { domainWorkerRoute } from '@/lib/sites/domain-worker';
import { SitesCloudflareDns, verifySitesHttps } from '@/lib/sites/cloudflare-dns';
import { SiteDomainError } from '@/lib/sites/domains';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;
const handle = domainWorkerRoute({
  token: () => process.env.GALX_SITES_WORKER_TOKEN,
  enabled: () => process.env.GALX_SITES_DOMAINS_ENABLED === '1' && process.env.GALX_SITES_DOMAINS_WORKER_ENABLED === '1',
  accounts: () => process.env.GALX_SITES_COHORT_ACCOUNT_IDS,
  registry: () => {
    const pool = getPostgresPool();
    if (!pool || pool.waitingCount >= 25) throw new SiteDomainError('domain_unavailable');
    return new SiteDomainRegistry(pool);
  },
  dns: () => new SitesCloudflareDns(process.env.GALX_SITES_DNS_ZONE_ID || '', process.env.GALX_SITES_DNS_API_TOKEN || ''),
  verifyHttps: verifySitesHttps,
});
export const POST = handle;
export const GET = handle;
