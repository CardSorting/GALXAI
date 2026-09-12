import { getPostgresPool } from '@/lib/db/postgres';
import { SiteDomainRegistry } from '@/lib/sites/domain-registry';
import { domainWorkerRoute } from '@/lib/sites/domain-worker';
import { SitesCloudflareDns, verifySitesHttps } from '@/lib/sites/cloudflare-dns';
import { SiteDomainError } from '@/lib/sites/domains';
import { ManagedSitesHosting, verifyManagedSite } from '@/lib/sites/managed-hosting';
import { SitesWorkspaceRepository } from '@/lib/sites/workspace-repository';

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
  prepareManagedHost: (plan,signal) => {
    if(process.env.GALX_SITES_MANAGED_PUBLISH_ENABLED!=='1')throw new SiteDomainError('domain_unavailable');
    return new ManagedSitesHosting(process.env.GALX_SITES_HOSTING_PROJECT || '',process.env.GALX_SITES_HOSTING_TEAM || '',process.env.GALX_SITES_HOSTING_TOKEN || '').ensure(plan,signal);
  },
  verifyManagedHttps: (hostname,signal) => { const pool=getPostgresPool();if(!pool)throw new SiteDomainError('domain_unavailable');return verifyManagedSite(hostname,new SitesWorkspaceRepository(pool),signal); },
});
export const POST = handle;
export const GET = handle;
