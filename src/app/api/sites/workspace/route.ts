import type { NextRequest } from 'next/server';
import { requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { SitesWorkspaceRepository, WorkspaceError } from '@/lib/sites/workspace-repository';
import { sitesWorkspaceRoute } from '@/lib/sites/workspace-route';
import { sitesContentConfiguration } from '@/lib/sites/content-configuration';
import { PostgresSitesBilling, createBilledRelayGenerator, reconcileBilledRelayGeneration } from '@/lib/billing/sites-generation';
import { SITE_CONTENT_PROMPT } from '@/lib/billing/sites-content-route';
import { SiteDomainRegistry } from '@/lib/sites/domain-registry';
import { managedDomainPlan } from '@/lib/sites/managed-hosting';
import { requireSitesCohort } from '@/lib/billing/sites-activation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;
const handle = sitesWorkspaceRoute({
  canPublish: owner => {
    try { requireSitesCohort(process.env.GALX_SITES_COHORT_ACCOUNT_IDS,owner);
      return process.env.GALX_SITES_MANAGED_PUBLISH_ENABLED==='1' && process.env.GALX_SITES_DOMAINS_ENABLED==='1' &&
        Boolean(process.env.GALX_SITES_HOSTING_PROJECT && process.env.GALX_SITES_HOSTING_TEAM && process.env.GALX_SITES_HOSTING_TOKEN && process.env.GALX_SITES_HOSTING_CNAME);
    } catch { return false; }
  },
  publish: async (owner,id,revision,username) => {
    const pool=getPostgresPool();if(!pool)throw new WorkspaceError();
    const repo=new SitesWorkspaceRepository(pool),row=await repo.get(owner,id);
    if(!row.document || row.operation_id || row.archived || row.revision!==revision)throw new WorkspaceError(409);
    const domain=await new SiteDomainRegistry(pool).reserve(owner,id,username,row.title);
    return repo.publish(owner,id,revision,managedDomainPlan(domain.hostname,id,process.env.GALX_SITES_HOSTING_CNAME || ''));
  },
  authenticate: request => requireAccountIdentity(request as NextRequest),
  repository: () => { const pool = getPostgresPool(); if (!pool || pool.waitingCount >= 25) throw new WorkspaceError(); return new SitesWorkspaceRepository(pool); },
  prepare: async (owner, signal) => {
    const config = sitesContentConfiguration();
    await config.authorizeGeneration(signal,owner);
    const billing = new PostgresSitesBilling(config.pool,owner,config.rate);
    return { quote: { quoteVersion: billing.rate.version, maxChargeMicroUsd: billing.reservation },
      generate: (operation,brief,document) => createBilledRelayGenerator(billing,config.relay)({ operationId: operation,requestedModel: billing.rate.model,signal,
        messages: [{ role:'system',content:SITE_CONTENT_PROMPT },
          ...(document ? [{ role:'user' as const,content:`Current draft (content only): ${JSON.stringify(document)}. Apply the next requested changes and return the complete revised document.` }] : []),
          { role:'user',content:brief }] }) };
  },
  recover: async (owner, operation, signal) => { const config = sitesContentConfiguration();
    return reconcileBilledRelayGeneration(new PostgresSitesBilling(config.pool,owner,config.rate),operation,config.relay,signal); },
});
export const GET = handle;
export const POST = handle;
