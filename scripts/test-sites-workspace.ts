import assert from 'node:assert/strict';
import test from 'node:test';
import { sitesWorkspaceRoute } from '../src/lib/sites/workspace-route';
import { workspaceView, WorkspaceError, type WorkspaceRow } from '../src/lib/sites/workspace-repository';
import { readSiteDocument, readWorkspaceSite } from '../src/lib/sites/workspace-contract';
import { renderSitePreview } from '../src/lib/sites/site-preview';
import { publishedSiteRoute } from '../src/lib/sites/published-route';
import { ManagedSitesHosting, managedDomainPlan, verifyManagedSite } from '../src/lib/sites/managed-hosting';
import { FairUsageError } from '../src/lib/sites/fair-policy';
import { SiteDomainError } from '../src/lib/sites/domains';
import { publishedSiteProxy, PUBLISHED_SITE_HEADERS } from '../src/lib/sites/published-proxy';
const id='e6581c35-7a8d-4c01-a630-a3c8e6f9531b',operation='93cf1b29-93f8-4a1c-84d4-a39fe9534d43';
const document={schema_version:1 as const,title:'Daylight',summary:'A calmer week.',sections:[{heading:'Plan together',body:'Make room for focused work.'}]};
const row=():WorkspaceRow=>({id,user_id:'alice',title:'Daylight',revision:0,document:null,messages:[],archived:false,updated_at:new Date(),operation_id:null,operation_brief:null,operation_started_at:null});
function fixture(){
  let current=row(),dispatches=0,reads=0,mode='ok';
  const repo={get:async(owner:string,site:string)=>{reads++;if(owner!==current.user_id||site!==id)throw new WorkspaceError(404);return current;},
    list:async(owner:string)=>owner===current.user_id?[current]:[],username:async()=>null,
    begin:async(owner:string,site:string,revision:number,op:string,brief:string)=>{await repo.get(owner,site);if(current.operation_id||revision!==current.revision)throw new WorkspaceError(409);current={...current,operation_id:op,operation_brief:brief,operation_started_at:new Date()};return current;},
    finish:async(_owner:string,_id:string,op:string,doc:any,message:string)=>{if(current.operation_id===op)current={...current,document:doc||current.document,operation_id:null,operation_brief:null,operation_started_at:null,revision:current.revision+1,messages:[{id:op,role:'assistant',text:message}]};return current;},
    create:async()=>current,update:async()=>current};
  const handle=sitesWorkspaceRoute({authenticate:async request=>{const bearer=request.headers.get('authorization');if(bearer!=='Bearer alice'&&bearer!=='Bearer bob')throw new Error('private credentials');return{id:bearer.slice(7)};},repository:()=>repo as any,
    requireAccess:async()=>{},prepare:async()=>({generate:async(op,brief,previous)=>{dispatches++;assert.equal(op,`${id}:${operation}`);assert.equal(brief,'Build a page');assert.equal(previous,current.document);
      if(mode==='uncertain')throw new Error('upstream private diagnostics');if(mode==='funds')throw new FairUsageError(429,'account_share',10);
      return{text:JSON.stringify(mode==='invalid'?{...document,internal:'private'}:document),completed:true};}}),
    recover:async()=>({text:JSON.stringify(document),completed:true})});
  return{handle,repo,current:()=>current,dispatches:()=>dispatches,reads:()=>reads,setMode:(next:string)=>mode=next};
}
function request(body?:unknown,authorization='Bearer alice',query=''){return new Request('https://galx.ai/api/sites/workspace'+query,{method:body?'POST':'GET',headers:{authorization,'Content-Type':'application/json',cookie:'admin=true'},...(body?{body:JSON.stringify(body)}:{})});}
const generate={action:'generate',id,operationId:operation,revision:0,brief:'Build a page'};
test('workspace rejects anonymous, customer API keys and forged admin cookies before storage',async()=>{const f=fixture();for(const auth of['','Bearer api-key','Bearer admin']){const response=await f.handle(request(undefined,auth));assert.equal(response.status,401);assert.deepEqual(await response.json(),{error:{code:'sign_in_required'}});}assert.equal(f.reads(),0);});
test('workspace enforces ownership before membership checks or dispatching and emits an explicit DTO',async()=>{const f=fixture();assert.equal((await f.handle(request(generate,'Bearer bob'))).status,404);assert.equal(f.dispatches(),0);
  const value=workspaceView({...row(),private_secret:'sentinel',operation_brief:'private',user_id:'private-account'} as any);assert(!JSON.stringify(value).includes('private'));assert.deepEqual(Object.keys(value).sort(),['address','archived','document','generating','id','messages','published','revision','title','updatedAt']);assert.deepEqual(readWorkspaceSite(value),value);});
test('chat generation is included, account-bound, persisted and previewed without granting model authority',async()=>{const f=fixture();assert.equal((await f.handle(request({...generate,maxChargeMicroUsd:1}))).status,400);assert.equal(f.dispatches(),0);const response=await f.handle(request(generate));assert.equal(response.status,200);const result=await response.json();assert.deepEqual(result.site.document,document);assert.equal(result.site.generating,false);assert.equal(f.dispatches(),1);assert(!JSON.stringify(result).includes('public-receipt'));});
test('uncertain generation recovers the original operation without dispatching another request',async()=>{const f=fixture();f.setMode('uncertain');const response=await f.handle(request(generate));assert.equal((await response.json()).site.generating,true);assert.equal((await f.handle(request(generate))).status,409);const recovered=await f.handle(request({action:'recover',id}));assert.deepEqual((await recovered.json()).site.document,document);assert.equal(f.dispatches(),1);});
test('invalid completed draft preserves prior content and fair-use deferral allows recovery',async()=>{const f=fixture();f.setMode('invalid');let result=await f.handle(request(generate));assert.equal((await result.json()).site.document,null);assert.equal(f.current().operation_id,null);const g=fixture();g.setMode('funds');result=await g.handle(request(generate));assert.equal(result.status,429);assert.equal(g.current().operation_id,null);});
test('request fields, methods, size and caller-supplied host authority fail closed',async()=>{const f=fixture();for(const body of [{...generate,provider:'private'}, {...generate,brief:'x'.repeat(2001)}, {...generate,id:'../../admin'}, {action:'publish',id,revision:0,username:'alice',audience:'private'}, {action:'publish',id,revision:0,username:'alice',audience:'public',hostname:'evil.test'}]){assert.equal((await f.handle(request(body))).status,400);}assert.equal(f.dispatches(),0);assert.equal((await f.handle(request(undefined,'Bearer alice','?id='+id+'&id='+id))).status,400);});
test('preview escapes hostile text and rejects executable/extra document fields',()=>{const hostile={...document,title:'</title><script>alert(1)</script>',summary:'<img src="https://evil.test/?secret=1" onerror="alert(1)">'};const html=renderSitePreview(hostile);assert(!html.includes('<script>'));assert(!html.includes('<img '));assert(html.includes('&lt;script&gt;'));assert(html.includes("default-src 'none'"));assert.equal(readSiteDocument({...document,html:'<script>'}),null);assert.throws(()=>renderSitePreview({...document,sections:[]}));});
test('published responses contain only approved escaped content and never draft, chat or error records',async()=>{const handle=publishedSiteRoute(()=>({published:async()=>document}));const r=await handle(new Request('https://app.alice.galx.ai'), 'app.alice.galx.ai');assert.equal(r.status,200);assert.equal(await r.text(),renderSitePreview(document));assert.match(r.headers.get('content-security-policy')!,/sandbox/);assert.equal(r.headers.get('set-cookie'),null);const denied=publishedSiteRoute(()=>({published:async()=>{throw new Error('database-password');}}));const missing=await denied(new Request('https://galx.ai'),'app.alice.galx.ai');assert.equal(missing.status,404);assert.equal(await missing.text(),'Site unavailable.');});
test('managed host provisioning reads back uncertain adds and refuses foreign project or redirect configurations',async()=>{const plan=managedDomainPlan('app.alice.galx.ai',id,'example.vercel-dns-017.com');let calls=0;
  const host=new ManagedSitesHosting('prj_example','team_example','secret',async(url,init)=>{calls++;assert(new URL(String(url)).origin==='https://api.vercel.com');assert.equal(init?.redirect,'error');if(calls===1)return new Response('{}',{status:404});if(calls===2)throw new Error('lost acknowledgement');return Response.json({name:plan.hostname,projectId:'prj_example',verified:true});});await host.ensure(plan,AbortSignal.timeout(1000));assert.equal(calls,3);
  for(const extra of [{projectId:'prj_other'},{redirect:'evil.test'},{gitBranch:'preview'}])await assert.rejects(new ManagedSitesHosting('prj_example','team_example','secret',async()=>Response.json({name:plan.hostname,projectId:'prj_example',verified:true,...extra})).ensure(plan,AbortSignal.timeout(1000)),/dns_conflict/);
  assert.throws(()=>managedDomainPlan('app.alice.galx.ai',id,'attacker.example'));
});
test('managed TLS readiness requires the exact published body and never follows or authenticates redirects',async()=>{const repository={published:async()=>document};let calls=0;assert(await verifyManagedSite('app.alice.galx.ai',repository,AbortSignal.timeout(1000),async(url,init)=>{calls++;assert.equal(url,'https://app.alice.galx.ai/');assert.equal(init?.redirect,'manual');assert.equal(init?.headers,undefined);return new Response(renderSitePreview(document));}));assert.equal(calls,1);assert.equal(await verifyManagedSite('app.alice.galx.ai',repository,AbortSignal.timeout(1000),async()=>new Response('GALX dashboard')),false);assert.equal(await verifyManagedSite('app.alice.galx.ai',repository,AbortSignal.timeout(1000),async()=>new Response(null,{status:302,headers:{location:'https://evil.test'}})),false);});
test('publishing exposes only actionable username errors, never hosting diagnostics',async()=>{
  for(const code of ['invalid_username','username_conflict','dns_conflict']){
    const f=fixture();const handle=sitesWorkspaceRoute({authenticate:async()=>({id:'alice'}),repository:()=>f.repo as any,requireAccess:async()=>{},prepare:async()=>{throw new Error();},recover:async()=>{throw new Error();},canPublish:()=>true,publish:async()=>{throw new SiteDomainError(code);}});
    const response=await handle(request({action:'publish',id,revision:0,username:'alice',audience:'public'}));
    assert.deepEqual(await response.json(),{error:{code:code==='invalid_username'?'invalid_username':code==='username_conflict'?'username_unavailable':'site_unavailable'}});
  }
});
test('public hostname delivery strips caller authority and routing headers, and bounds artifacts',async()=>{
  const request=new Request('https://app.alice.galx.ai/?private=1',{headers:{authorization:'Bearer private',cookie:'private=1'}});
  const response=await publishedSiteProxy(request,'app.alice.galx.ai',async(url,init)=>{
    assert.equal(url,'https://galx.ai/api/sites/published/app.alice.galx.ai');assert.equal(init?.headers,undefined);assert.equal(init?.redirect,'error');
    return new Response(renderSitePreview(document),{headers:{'Content-Type':'text/html; charset=utf-8','Set-Cookie':'private=1','X-Middleware-Rewrite':'private-route','X-Provider':'private'}});
  });
  assert.equal(response.status,200);assert.equal(await response.text(),renderSitePreview(document));
  assert.deepEqual([...response.headers.keys()].sort(),[...Object.keys(PUBLISHED_SITE_HEADERS).map(k=>k.toLowerCase()),'content-type'].sort());
  for(const bad of [()=>new Response('private failure',{status:500}),()=>new Response('x'.repeat(65537),{headers:{'Content-Type':'text/html; charset=utf-8'}}),()=>new Response('private',{headers:{'Content-Type':'application/json'}})]){
    const denied=await publishedSiteProxy(request,'app.alice.galx.ai',async()=>bad());assert.equal(denied.status,404);assert.equal(await denied.text(),'Site unavailable.');
  }
});
