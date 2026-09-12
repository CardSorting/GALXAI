import { boundedDomainJson } from './cloudflare-dns';
import { FairUsageError } from './fair-policy';
import { readSiteDocument } from './workspace-contract';
import type { IncludedGenerationReply } from './included-generation';

interface Dependencies {
  authenticate(request:Request):Promise<{id:string}>;
  access(owner:string):Promise<void>;
  generate(owner:string,operation:string,brief:string,repair:boolean,signal:AbortSignal):Promise<IncludedGenerationReply>;
  recover(owner:string,operation:string,signal:AbortSignal):Promise<IncludedGenerationReply|null>;
  legacy(request:Request):Promise<Response>;
}
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export function includedSitesContentRoute(deps:Dependencies){return async(request:Request):Promise<Response>=>{
  const fail=(status:number,code:string,retry?:number)=>Response.json({error:{code}},{status,headers:{...headers,...(retry?{'Retry-After':String(retry)}:{})}});
  if(!/^Bearer [^\s]{1,8192}$/.test(request.headers.get('authorization')||''))return fail(401,'sign_in_required');
  let owner:string;try{owner=(await deps.authenticate(request)).id;}catch{return fail(401,'sign_in_required');}
  const validId=(s:unknown):s is string=>typeof s==='string'&&/^[a-zA-Z0-9_.:-]{1,120}$/.test(s);
  const reply=(operationId:string,result:IncludedGenerationReply)=>{
    let document=null;try{document=readSiteDocument(JSON.parse(result.text));}catch{}
    return Response.json({operationId,status:result.completed?'completed':'pending',text:document?JSON.stringify(document):''},{headers});
  };
  try{
    const url=new URL(request.url);
    if(request.method==='GET'){
      if(!url.search){await deps.access(owner);return Response.json({access:'included'},{headers});}
      const operation=url.searchParams.get('operationId');
      if(url.searchParams.size!==1||!validId(operation))return fail(400,'invalid_request');
      const result=await deps.recover(owner,operation,request.signal);
      return result?reply(operation,result):deps.legacy(request); // Historical receipts only, never new billed work.
    }
    if(request.method!=='POST')return fail(405,'method_not_allowed');
    if(url.search||!request.headers.get('content-type')?.startsWith('application/json'))return fail(400,'invalid_request');
    const body=await boundedDomainJson(new Response(request.body),8192,AbortSignal.any([request.signal,AbortSignal.timeout(5000)])) as any;
    if(!body||Array.isArray(body)||Object.keys(body).sort().join()!=='brief,operationId,repair'||!validId(body.operationId)||
      typeof body.brief!=='string'||!body.brief.trim()||Buffer.byteLength(body.brief)>2000||/[\u0000-\u001f\u007f]/.test(body.brief)||typeof body.repair!=='boolean')return fail(400,'invalid_request');
    return reply(body.operationId,await deps.generate(owner,body.operationId,body.brief.trim(),body.repair,request.signal));
  }catch(error){
    if(error instanceof FairUsageError)return fail(error.status,error.status===403?'paid_plan_required':error.status===429?'rate_limited':error.status===409?'operation_conflict':'content_unavailable',error.retryAfter);
    return fail(503,'content_unavailable');
  }
};}
