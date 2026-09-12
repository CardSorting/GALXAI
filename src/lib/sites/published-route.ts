import { type SitesWorkspaceRepository } from './workspace-repository';
import { siteHostname } from './domains';
import { renderSitePreview } from './site-preview';
import { PUBLISHED_SITE_HEADERS } from './published-proxy';
export function publishedSiteRoute(repository:()=>Pick<SitesWorkspaceRepository,'published'>) {
  return async (request:Request,hostname:string):Promise<Response> => {
    const headers=PUBLISHED_SITE_HEADERS;
    if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers});
    try{siteHostname(hostname);const document=await repository().published(hostname);
      if(document)return new Response(request.method==='HEAD'?null:renderSitePreview(document),{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
    }catch{/* No account or hosting diagnostics cross this public response. */}
    return new Response(request.method==='HEAD'?null:'Site unavailable.',{status:404,headers:{...headers,'Content-Type':'text/plain; charset=utf-8'}});
  };
}
