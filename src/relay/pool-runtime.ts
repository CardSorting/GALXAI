import http from 'node:http';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { once } from 'node:events';
import { GalxaiRelayServer } from './relay-server.js';
import { PoolExecution, type AssignedAccount, type ExecutionRecord } from './pool-execution.js';
import { bearer, equalSecret, failure, hash, json, requestWorkload } from './pool-protocol.js';
import { RequestError, readJsonBody } from './request-policy.js';
import { sanitizeImageArtifact } from '../lib/security/image-artifact.js';
import { CODEX_IMAGE_ALIAS } from './image-compatibility.js';
import { publicJob, publicUsage, boundedJson } from './pool-public-response.js';
import { sitesContractRequest, sitesContractReply } from './sites-contract.js';

type Worker = {account:AssignedAccount;engine:GalxaiRelayServer;key:string;port:number};
export class PoolRuntime {
  readonly server: http.Server;
  private workers = new Map<string,Worker>();
  private refreshedAt = 0; private stopped = false; private timer?: NodeJS.Timeout;
  private cursor = 0; private syncing?: Promise<void>; private pending = new Set<string>();
  constructor(readonly execution: PoolExecution, private readonly inferenceKey: string, private readonly stateDirectory: string, private readonly capabilityKey?: string) {
    this.server = http.createServer((req,res)=>void this.route(req,res).catch(error=>{ if (!res.headersSent) failure(res,error); else res.destroy(); }));
    this.server.requestTimeout=15000; this.server.maxHeadersCount=40;
  }
  async start(port=3001, host='0.0.0.0') {
    await this.execution.store.call('identity');
    await this.execution.central.call('/runtime/claim',{epoch:this.execution.epoch});
    await this.execution.store.call('recover',{epoch:this.execution.epoch});
    await this.sync();
    const schedule=()=>{ if (this.stopped) return; this.timer=setTimeout(async()=>{await this.sync().catch(()=>{this.refreshedAt=0;});schedule();},10000);this.timer.unref();}; schedule();
    this.server.listen(port,host); await once(this.server,'listening');
  }
  async sync() {
    if (this.syncing) return this.syncing;
    this.syncing=this.reconcile().finally(()=>{this.syncing=undefined;}); return this.syncing;
  }
  private async reconcile() {
    const central=this.execution.central;
    await central.call('/runtime/heartbeat',{epoch:this.execution.epoch});
    const projection=await central.call('/runtime/projection',{epoch:this.execution.epoch});
    if (projection.pool!==central.identity.pool || projection.installationId!==central.identity.installationId || projection.epoch!==this.execution.epoch || !Array.isArray(projection.accounts) || projection.accounts.length>128) throw Error('Invalid projection.');
    const next=new Map<string,AssignedAccount>(projection.accounts.map((a:AssignedAccount)=>[a.id,a]));
    for (const [id,worker] of this.workers) {
      const a=next.get(id);
      if (!projection.executionAllowed || !a?.credential || a.state!=='enabled' || a.revision!==worker.account.revision || a.credentialRevision!==worker.account.credentialRevision || a.expiresAtMs<=Date.now()+30000) {
        this.workers.delete(id); await worker.engine.stop();
      }
    }
    for (const a of next.values()) {
      if (!/^codex_sh_[a-f0-9]{24}$/.test(a.id) || !Number.isSafeInteger(a.revision) || !/^[a-f0-9]{64}$/.test(a.credentialRevision)) throw Error('Invalid account projection.');
      if (projection.executionAllowed && a.credential && a.state==='enabled' && a.expiresAtMs>Date.now()+30000 && !this.workers.has(a.id)) {
        const key=randomBytes(32).toString('base64url');
        const engine=new GalxaiRelayServer({assignedShardId:a.id,assignedShard:{id:a.id,...a.credential},
          executionPolicy:this.execution.policy(a),host:'127.0.0.1',port:0,apiKeys:[key],adminApiKeys:[randomBytes(32).toString('base64url')],
          registryEnabled:false,discoverHostCredentials:false,masterSecret:undefined,shardsJsonPath:undefined,testOnlyMultiShard:false,
          relayId:central.identity.installationId,generation:this.execution.epoch,allowedOrigins:[],maxUpstreamRetries:0,
          codexImageToolAlias:central.identity.pool==='premium',forwardOutputTokenLimit:true,drainTimeoutMs:100,
          stateSnapshotPath:path.join(this.stateDirectory,a.id,'relay.json')});
        try { await engine.start(); this.workers.set(a.id,{account:a,engine,key,port:engine.listeningPort()}); }
        catch { await engine.stop().catch(()=>{}); throw Error('Worker unavailable.'); }
      }
      // Disabled accounts are acknowledged only once the old engine is stopped. Enabled accounts require a running engine.
      if (a.state!=='enabled' && !this.workers.has(a.id) || this.workers.get(a.id)?.account.revision===a.revision) {
        await central.call('/runtime/acknowledge',{epoch:this.execution.epoch,accountId:a.id,revision:a.revision,credentialRevision:a.credentialRevision});
      }
    }
    this.refreshedAt=Date.now(); await this.execution.settlePending();
  }
  private async route(req:http.IncomingMessage,res:http.ServerResponse) {
    const pathname=new URL(req.url ?? '/','http://local').pathname;
    const ready=!this.stopped && this.refreshedAt>Date.now()-20000 && this.workers.size>0;
    if (req.method==='GET' && ['/health/live','/health/ready','/health'].includes(pathname)) return json(res,pathname==='/health/ready'&&!ready?503:200,{ok:pathname==='/health/ready'?ready:true});
    if (pathname==='/api/sites/contract' && req.method==='GET') {
      if(req.headers.origin || !this.capabilityKey || !equalSecret(bearer(req),this.capabilityKey))throw new RequestError(401,'unauthorized','Provide valid authorization.');
      if(this.execution.central.identity.pool!=='premium')throw new RequestError(403,'capability_unavailable','This request is not supported.');
      const requested=sitesContractRequest(new URL(req.url!,'http://local').searchParams);
      if(!ready||![...this.workers.values()].some(w=>w.account.models.includes(requested.model)))throw new RequestError(503,'service_unavailable','This service is temporarily unavailable.');
      return json(res,200,sitesContractReply(requested));
    }
    if (req.headers.origin || !equalSecret(bearer(req),this.inferenceKey)) throw new RequestError(401,'unauthorized','Provide valid authorization.');
    if(pathname==='/v1/images/availability' && req.method==='GET') {
      let available=false;
      if(this.execution.central.identity.pool==='premium'&&ready) {
        const checks=await Promise.all([...this.workers.values()].map(async w=>{
          try{const result=await fetch(`http://127.0.0.1:${w.port}/v1/images/availability?model=${CODEX_IMAGE_ALIAS.requestedModel}`,{headers:{Authorization:`Bearer ${w.key}`},redirect:'error',signal:AbortSignal.timeout(3000)});return result.ok&&(await boundedJson(result,1024)).available===true;}catch{return false;}
        }));available=checks.some(Boolean);
      }
      return json(res,200,{available});
    }
    const delegated=req.headers['x-galx-tenant'];
    if (typeof delegated!=='string' || !/^[a-f0-9]{64}$/.test(delegated)) throw new RequestError(400,'invalid_request','Invalid request identity.');
    const tenantSha256=hash(delegated);
    if (pathname==='/v1/models' && req.method==='GET') {
      if (!ready) throw new RequestError(503,'service_unavailable','This service is temporarily unavailable.');
      const models=[...new Set([...this.workers.values()].flatMap(w=>w.account.models).filter(m=>!m.startsWith('image:')))];
      return json(res,200,{object:'list',data:models.map(id=>({id,object:'model',owned_by:'galx'}))});
    }
    const generation=req.method==='POST' && ['/v1/chat/completions','/v1/images/generations'].includes(pathname);
    const job=/^\/v1\/jobs\/([\w-]{1,96})(?:\/(stream|receipt|cancel))?$/.exec(pathname);
    if (!generation && !(job && (req.method==='GET' || req.method==='POST' && job[2]==='cancel'))) throw new RequestError(404,'not_found','Not found.');
    let worker:Worker|undefined, body:Record<string,any>|undefined, lock:string|undefined;
    try {
      if (generation) {
        body=await readJsonBody(req,1024*1024,10000); const workload=requestWorkload(this.execution.central.identity.pool,pathname,body);
        if (!ready) throw new RequestError(503,'service_unavailable','This service is temporarily unavailable.');
        const key=req.headers['idempotency-key'];
        if (typeof key!=='string'||!/^[\x21-\x7e]{1,128}$/.test(key)) throw new RequestError(400,'request_key_required','Supply an Idempotency-Key.');
        lock=hash(JSON.stringify([tenantSha256,workload,key]));
        if (this.pending.has(lock)) throw new RequestError(409,'request_in_progress','Check the existing request.');
        if (this.pending.size>=128) throw new RequestError(429,'busy','Try again shortly.');
        this.pending.add(lock);
        const previous:ExecutionRecord|null=await this.execution.store.call('lookup',{requestKey:lock,tenantSha256});
        if (previous) {
          if (previous.requestSha256!==hash(JSON.stringify(body))) throw new RequestError(409,'idempotency_conflict','This request key was already used.');
          if (previous.epoch!==this.execution.epoch || previous.workload==='images' || !this.workers.has(previous.accountId)) throw new RequestError(409,'result_unconfirmed','The original result is unavailable. Do not repeat this request.');
          return json(res,202,{id:previous.executionId,status:previous.state==='running'?'running':previous.state==='completed'?'completed':'failed',statusUrl:`/v1/jobs/${previous.executionId}`,streamUrl:`/v1/jobs/${previous.executionId}/stream`});
        }
        const model=body.model ?? 'gpt-5.6-terra'; const capability=workload==='images'?`image:${model}`:model;
        const candidates=[...this.workers.values()].filter(w=>w.account.models.includes(capability) || workload==='images' && this.execution.central.identity.pool==='premium' && model===CODEX_IMAGE_ALIAS.requestedModel);
        worker=candidates[this.cursor++%candidates.length];
      } else {
        const saved:ExecutionRecord|null=await this.execution.store.call('lookup',{executionId:job![1],tenantSha256});
        if (!saved) throw new RequestError(404,'not_found','Request not found.');
        if (saved.epoch!==this.execution.epoch) throw new RequestError(409,'result_unconfirmed','The original result is unavailable. Do not repeat this request.');
        worker=this.workers.get(saved.accountId);
      }
      if (!worker) throw new RequestError(503,'service_unavailable','This service is temporarily unavailable.');
      const response=await fetch(`http://127.0.0.1:${worker.port}${pathname}`,{method:req.method,redirect:'error',signal:AbortSignal.timeout(310000),
        headers:{Authorization:`Bearer ${worker.key}`,'Content-Type':'application/json','x-galx-tenant':delegated,
          ...(typeof req.headers['idempotency-key']==='string'?{'idempotency-key':req.headers['idempotency-key']}:{}),
          ...(typeof req.headers['last-event-id']==='string'?{'last-event-id':req.headers['last-event-id']}: {})},body:body?JSON.stringify(body):req.method==='POST'?'{}':undefined});
      if (!response.ok) { await response.body?.cancel(); throw new RequestError([400,403,404,409,429].includes(response.status)?response.status:503,'request_unavailable','The request could not be completed. Check its status before retrying.'); }
      if (response.headers.get('content-type')?.includes('text/event-stream')) return await this.stream(response,res);
      const data=await boundedJson(response,pathname.includes('/images/')?32*1024*1024:18*1024*1024);
      if (pathname.includes('/images/')) {
        const artifact=await sanitizeImageArtifact(Buffer.from(data.data?.[0]?.b64_json ?? '','base64'));
        if (body?.response_format==='b64_json') return json(res,200,{created:Math.floor(Date.now()/1000),data:[{b64_json:artifact.bytes.toString('base64')}]});
        res.writeHead(200,{'Content-Type':artifact.contentType,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(artifact.bytes);return;
      }
      return json(res,response.status,publicJob(data));
    } finally { if (lock) this.pending.delete(lock); }
  }
  private async stream(response:Response,res:http.ServerResponse) {
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    const reader=response.body!.getReader(), decoder=new TextDecoder();let buffer='';
    const closed=new AbortController();const close=()=>{closed.abort();void reader.cancel().catch(()=>{});};res.once('close',close);
    try { for (;;) { const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});if(buffer.length>2*1024*1024)throw Error('Frame too large.');
      let boundary;while((boundary=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);const raw=frame.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('\n');
        if(raw==='[DONE]'){res.write('data: [DONE]\n\n');continue;}if(!raw)continue;
        const d=JSON.parse(raw);if(d.error){res.write('data: {"error":{"code":"request_failed","message":"The request could not complete."}}\n\n');continue;}
        const safe={id:typeof d.id==='string'&&/^[-\w.:]{1,128}$/.test(d.id)?d.id:undefined,object:'chat.completion.chunk',choices:Array.isArray(d.choices)?d.choices.slice(0,16).map((c:any,index:number)=>({index,delta:{...(typeof c.delta?.content==='string'?{content:c.delta.content}:{}),...(c.delta?.role==='assistant'?{role:'assistant'}:{})},finish_reason:['stop','length','content_filter'].includes(c.finish_reason)?c.finish_reason:null})):[],
          ...(publicUsage(d.usage)?{usage:publicUsage(d.usage)}:{})};
        const id=/^id: (\d{1,16})$/m.exec(frame)?.[1];if(!res.write(`${id?`id: ${id}\n`:''}data: ${JSON.stringify(safe)}\n\n`))await once(res,'drain',{signal:AbortSignal.any([closed.signal,AbortSignal.timeout(10000)])});
      }}res.end();
    } finally {res.off('close',close);await reader.cancel().catch(()=>{});}
  }
  async stop(){this.stopped=true;clearTimeout(this.timer);this.refreshedAt=0;this.server.close();await this.syncing?.catch(()=>{});await Promise.all([...this.workers.values()].map(w=>w.engine.stop()));this.workers.clear();this.execution.stop();await this.execution.settlePending().catch(()=>{});}
}
