import type { NextRequest } from 'next/server';
import { requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { SitesWorkspaceRepository, WorkspaceError } from '@/lib/sites/workspace-repository';
import { sitesWorkspaceRoute } from '@/lib/sites/workspace-route';
import { sitesContentConfiguration } from '@/lib/sites/content-configuration';
import { PostgresSitesBilling, reconcileBilledRelayGeneration } from '@/lib/billing/sites-generation';
import { conversationMessages } from '@/lib/sites/conversation-context';
import { SiteDomainRegistry } from '@/lib/sites/domain-registry';
import { managedDomainPlan } from '@/lib/sites/managed-hosting';
import { includedSitesConfiguration } from '@/lib/sites/included-configuration';
import { recoverIncludedGeneration } from '@/lib/sites/included-generation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;
const handle = sitesWorkspaceRoute({
  requireAccess: async owner => { await includedSitesConfiguration().membership(owner); },
  canPublish: owner => {
      return process.env.GALX_SITES_MANAGED_PUBLISH_ENABLED==='1' && process.env.GALX_SITES_DOMAINS_ENABLED==='1' &&
        Boolean(process.env.GALX_SITES_HOSTING_PROJECT && process.env.GALX_SITES_HOSTING_TEAM && process.env.GALX_SITES_HOSTING_TOKEN && process.env.GALX_SITES_HOSTING_CNAME);
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
    const config = includedSitesConfiguration();
    const generate = await config.prepare(owner);
    return { generate: (operation,brief,document,context) => generate({ operationId: operation,requestedModel: config.model,signal,
        messages: conversationMessages(brief,context || {document,notes:'',summary:'',messages:[],intent:'build'}) }) };
  },
  recover: async (owner, operation, signal, mode) => {
    if(mode==='included'){const c=includedSitesConfiguration();return recoverIncludedGeneration(c.store,owner,operation,c.relay,signal);}
    const config = sitesContentConfiguration();
    return reconcileBilledRelayGeneration(new PostgresSitesBilling(config.pool,owner,config.rate),operation,config.relay,signal); },
});
export const GET = handle;
export const POST = handle;
