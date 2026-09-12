import { createHash } from 'node:crypto';
import { executeRelayChat,readRelayReceipt,RelayDispatchError } from '../../core/router/adapters/RelayChatTransport';
import type { SitesGenerationInput } from '../billing/sites-generation';
import { FairUsageError } from './fair-policy';
import { SitesFairStore,type FairInvocation,type FairPolicy,type PaidAccess } from './fair-store';

export interface IncludedGenerationReply { text:string; completed:boolean; }
const view=(row:FairInvocation):IncludedGenerationReply=>({text:row.output||'',completed:['completed','not_started','failed'].includes(row.state)});
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export async function recoverIncludedGeneration(store:SitesFairStore,account:string,operation:string,relay:{url:string;key:string},signal:AbortSignal,
  reader=readRelayReceipt):Promise<IncludedGenerationReply>{
  let row=await store.lookup(account,operation);
  if(!row)throw new FairUsageError(404,'invocation_missing');
  if(row.state==='reserved'){
    // Recovery never takes ownership of a dispatch. Cancellation races the same
    // shared CAS as the original worker; only a never-started grant rolls back.
    await store.cancelReserved(account,operation,true);row=(await store.lookup(account,operation))!;
  }
  if(!row.job_id||!row.origin||view(row).completed)return view(row);
  if(new URL(relay.url).origin!==row.origin)return view(row);
  try {
    const receipt=await reader({...relay,jobId:row.job_id,signal});
    if(receipt.id!==row.job_id)return view(row);
    if(receipt.status==='completed'&&receipt.output!==null)row=await store.terminal(account,operation,receipt.id,'completed',receipt.output);
    else if(receipt.status==='not_started')row=await store.terminal(account,operation,receipt.id,'not_started',null);
    // Failed/unknown receipts do not prove execution ended on all supported
    // workers. Quarantine occupancy until an authoritative terminal receipt.
  }catch { /* Read-only retry on the next recovery request. Never dispatch here. */ }
  return view(row);
}
export function createIncludedGenerator(options:{store:SitesFairStore;policy:FairPolicy;access:PaidAccess;relay:{url:string;key:string};refresh:(signal:AbortSignal)=>Promise<void>},
  transport=executeRelayChat,reader=readRelayReceipt){
  return async(input:SitesGenerationInput):Promise<IncludedGenerationReply>=>{
    const {store,policy,access,relay}=options;
    if(input.messages.length>4||Buffer.byteLength(JSON.stringify(input.messages))>12000||!input.messages.every(m=>['system','user'].includes(m.role)&&typeof m.content==='string'))throw new FairUsageError(400,'invalid_request');
    const url=new URL(relay.url);
    if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||!(url.protocol==='https:'||(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))))throw new FairUsageError(503,'configuration');
    const digest=hash([input.requestedModel,input.messages]);
    const existing=await store.lookup(access.accountId,input.operationId);
    if(existing){if(existing.digest!==digest)throw new FairUsageError(409,'invocation_conflict');return recoverIncludedGeneration(store,access.accountId,input.operationId,relay,input.signal,reader);}
    await store.accountCooldown(access.accountId); // Do not probe during a known account cooldown.
    const deadline=Date.now()+policy.limits.admission_deadline_milliseconds;
    await store.snapshot(policy,input.signal,options.refresh,deadline);
    const admission=await store.admit(policy,access,input.operationId,digest,deadline);
    if(!admission.dispatch)return view(admission.row);
    if(input.signal.aborted){await store.cancelReserved(access.accountId,input.operationId);return recoverIncludedGeneration(store,access.accountId,input.operationId,relay,AbortSignal.timeout(3000),reader);}
    // Only the CAS winner can call the provider. An ambiguous CAS acknowledgement
    // must leave a recoverable reservation and must never retry the dispatch.
    if(!await store.start(access.accountId,input.operationId,admission.row.grant_id))return recoverIncludedGeneration(store,access.accountId,input.operationId,relay,input.signal,reader);
    const operation=hash(['sites-included-v1',access.accountId,input.operationId]);
    const signal=AbortSignal.any([input.signal,AbortSignal.timeout(policy.limits.request_deadline_seconds*1000)]);
    let accepted=false;
    try {
      await transport({...relay,signal,taskId:operation,idempotencyKey:operation,
        onAccepted:job=>{accepted=true;return store.accepted(access.accountId,input.operationId,job,url.origin);},
        payload:{model:input.requestedModel,messages:structuredClone(input.messages),stream:false,durable_receipt:true,reasoning_effort:'none',sites_profile:'local-v1'},
        ttftTimeoutMs:Math.min(45000,policy.limits.request_deadline_seconds*1000),idleTimeoutMs:20000,wallTimeoutMs:policy.limits.request_deadline_seconds*1000});
    }catch(error) {
      if(error instanceof RelayDispatchError && [429,503].includes(error.status||0)){
        const delay=Number.isFinite(error.retryAfterMs)?Math.max(1000,Math.min(86400000,error.retryAfterMs!)):policy.limits.snapshot_ttl_seconds*1000;
        // The relay credential is shared by Sites accounts: an unattributed
        // provider/gateway rejection applies to the shared pool, not one user.
        await store.cooldown(policy.pool_id,Date.now()+delay);
        const preDispatchCodes=['model_capacity_exhausted','model_temporarily_unavailable','federation_unavailable','admission_capacity_exhausted','relay_reconciling','service_unavailable'];
        if(!accepted&&error.executionState==='not_accepted'&&error.requestId&&/^[a-zA-Z0-9_.:-]{1,128}$/.test(error.requestId)&&preDispatchCodes.includes(error.upstreamCode||'')){
          await store.notAccepted(access.accountId,input.operationId,admission.row.grant_id,{requestId:error.requestId,code:error.upstreamCode!});
          throw new FairUsageError(503,'delivery_cooldown',Math.ceil(delay/1000));
        }
      }
      // All other errors/disconnects preserve the reservation and never repeat inference.
    }
    return recoverIncludedGeneration(store,access.accountId,input.operationId,relay,signal,reader);
  };
}
