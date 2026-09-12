import { boundedDomainJson } from './cloudflare-dns';
import { type DomainPlan, requireDomain, siteHostname, SiteDomainError } from './domains';
import { renderSitePreview } from './site-preview';
import { type SitesWorkspaceRepository } from './workspace-repository';

export function managedDomainPlan(hostname: string, project: string, target: string): DomainPlan {
  siteHostname(hostname);
  requireDomain(/^[a-z0-9-]+\.vercel-dns(?:-\d+)?\.com$/.test(target), 'domain_unavailable',503);
  return {kind:'managed',domainId:`managed:${project}`,hostname,records:[{type:'CNAME',name:hostname,content:target}]};
}
export class ManagedSitesHosting {
  constructor(private readonly project: string,private readonly team: string,private readonly token: string,private readonly fetcher: typeof fetch=fetch) {
    requireDomain(/^prj_[a-zA-Z0-9]+$/.test(project) && /^team_[a-zA-Z0-9]+$/.test(team) && Boolean(token),'domain_unavailable',503);
  }
  private async call(version: number,path: string,signal: AbortSignal,body?: unknown) {
    const deadline=AbortSignal.any([signal,AbortSignal.timeout(6000)]);
    const response=await this.fetcher(`https://api.vercel.com/v${version}/projects/${this.project}/domains${path}?teamId=${this.team}`,{
      method:body?'POST':'GET',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},
      ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',cache:'no-store',signal:deadline});
    if(response.status===404 && !body){await response.body?.cancel();return null;}
    const data=await boundedDomainJson(response,65536,deadline);
    requireDomain(response.ok,'domain_unavailable',503);return data;
  }
  async ensure(plan: DomainPlan,signal: AbortSignal): Promise<void> {
    siteHostname(plan.hostname); requireDomain(plan.kind==='managed','domain_unavailable',503);
    try {
      let domain=await this.call(9,`/${plan.hostname}`,signal);
      if(!domain){
        try{await this.call(10,'',signal,{name:plan.hostname});}catch{/* An uncertain add is recovered by exact project readback. */}
        domain=await this.call(9,`/${plan.hostname}`,signal);
      }
      requireDomain(Boolean(domain),'domain_unavailable',503);
      requireDomain(domain.name===plan.hostname && domain.projectId===this.project && !domain.redirect && !domain.gitBranch && !domain.customEnvironmentId,'dns_conflict',409);
      requireDomain(domain.verified===true,'domain_unavailable',503);
    } catch(error){if(error instanceof SiteDomainError)throw error;throw new SiteDomainError('domain_unavailable');}
  }
}
export async function verifyManagedSite(hostname:string,repository:Pick<SitesWorkspaceRepository,'published'>,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<boolean>{
  siteHostname(hostname);
  const document=await repository.published(hostname);if(!document)return false;
  try{
    const deadline=AbortSignal.any([signal,AbortSignal.timeout(6000)]);
    const response=await fetcher(`https://${hostname}/`,{redirect:'manual',cache:'no-store',signal:deadline});
    if(response.status!==200){await response.body?.cancel();return false;}
    const reader=response.body?.getReader();if(!reader)return false;
    let size=0;const chunks:Uint8Array[]=[];
    const cancel=()=>{void reader.cancel().catch(()=>{});};deadline.addEventListener('abort',cancel,{once:true});
    try{deadline.throwIfAborted();while(true){const part=await reader.read();deadline.throwIfAborted();if(part.done)break;size+=part.value.byteLength;if(size>65536){await reader.cancel();return false;}chunks.push(part.value);}}
    finally{deadline.removeEventListener('abort',cancel);reader.releaseLock();}
    return Buffer.concat(chunks).toString('utf8')===renderSitePreview(document);
  }catch{return false;}
}
