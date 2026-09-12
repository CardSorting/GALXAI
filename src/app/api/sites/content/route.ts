import type { NextRequest } from 'next/server';
import { requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { sitesContentRoute } from '@/lib/billing/sites-content-route';
import { sitesContentConfiguration } from '@/lib/sites/content-configuration';
import { includedSitesContentRoute } from '@/lib/sites/included-content-route';
import { includedSitesConfiguration } from '@/lib/sites/included-configuration';
import { recoverIncludedGeneration } from '@/lib/sites/included-generation';
import { SITE_CONTENT_PROMPT } from '@/lib/billing/sites-content-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const legacy = sitesContentRoute({
  authenticate: request => requireAccountIdentity(request as NextRequest),
  configuration: sitesContentConfiguration,
});
const handle=includedSitesContentRoute({
  authenticate:request=>requireAccountIdentity(request as NextRequest),
  access:async owner=>{await includedSitesConfiguration().prepare(owner);},
  generate:async(owner,operation,brief,repair,signal)=>{
    const config=includedSitesConfiguration(),generate=await config.prepare(owner);
    return generate({operationId:operation,requestedModel:config.model,signal,messages:[{role:'system',content:SITE_CONTENT_PROMPT},{role:'user',content:brief},
      ...(repair?[{role:'user' as const,content:'Return only the exact schema and limits above.'}]:[])]});
  },
  recover:async(owner,operation,signal)=>{
    const config=includedSitesConfiguration();
    if(!await config.store.lookup(owner,operation))return null;
    return recoverIncludedGeneration(config.store,owner,operation,config.relay,signal);
  },
  legacy,
});
export const GET = handle;
export const POST = handle;
