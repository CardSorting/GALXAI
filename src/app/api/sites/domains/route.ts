import type { NextRequest } from 'next/server';
import { requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { requireSitesCohort } from '@/lib/billing/sites-activation';
import { SiteDomainRegistry } from '@/lib/sites/domain-registry';
import { sitesDomainRoute } from '@/lib/sites/domain-route';
import { SiteDomainError } from '@/lib/sites/domains';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;
const handle = sitesDomainRoute({
  authenticate: request => requireAccountIdentity(request as NextRequest),
  registry: () => {
    const pool = getPostgresPool();
    if (!pool || pool.waitingCount >= 25) throw new SiteDomainError('domain_unavailable');
    return new SiteDomainRegistry(pool);
  },
  authorizeMutation: accountId => {
    if (process.env.GALX_SITES_DOMAINS_ENABLED !== '1') throw new SiteDomainError('domain_unavailable');
    requireSitesCohort(process.env.GALX_SITES_COHORT_ACCOUNT_IDS, accountId);
  },
});
export const GET = handle;
export const POST = handle;
