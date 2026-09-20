import { createHash } from 'node:crypto';
import { executeRelayChat, RelayDispatchError, relayFailure } from './RelayChatTransport';
import { sanitizeImageArtifact, decodeImageBase64 } from '../../../lib/security/image-artifact';
import { relayCandidates, reportRelayFailure, resolveIsolatedRelay } from './RelayEndpointDiscovery';

export const isolatedRelaysEnabled=()=>process.env.GALX_ISOLATED_RELAYS_ENABLED==='1';
/** Images may be cut over independently, without changing text or Sites. */
export const isolatedImagesEnabled=()=>isolatedRelaysEnabled()||process.env.GALX_PREMIUM_IMAGES_ENABLED==='1';
/** Retrieval only: an old accepted job keeps its original configured origin and key. */
export function receiptRelay(origin:string,current:{url:string;key:string},tenant:string) {
  if(new URL(current.url).origin===origin)return {...current,tenant:isolatedRelaysEnabled()?tenant:undefined};
  const url=process.env.VM_RELAY_URL||process.env.GALXAI_RELAY_URL||process.env.RELAY_URL;
  const key=process.env.VM_RELAY_API_KEY||process.env.RELAY_API_KEYS?.split(',')[0]?.trim();
  if(!url||!key||new URL(url).origin!==origin)return null;
  return {url,key,tenant:undefined};
}
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
/** Premium is the only active isolated relay. The retired Standard pool is never selected. */
export function isolatedRelay(workload:'text'|'sites'|'images') {
  if (process.env.GALX_TEXT_RELAY_POOL === 'standard' || process.env.GALX_STANDARD_RELAY_URL || process.env.GALX_STANDARD_RELAY_KEY)
    throw new RelayDispatchError('invalid_configuration');
  const endpoint = relayCandidates('PREMIUM')[0];
  if (!endpoint) throw new RelayDispatchError('invalid_configuration');
  return endpoint;
}
export async function isolatedChat(payload:Record<string,any>,tenant:string,requestKey:string,onUsage:(usage:any)=>void) {
  const result=await executeRelayChat({...await resolveIsolatedRelay('text'),tenant,idempotencyKey:digest(requestKey),payload,ttftTimeoutMs:45000,idleTimeoutMs:45000,wallTimeoutMs:300000});
  if(!payload.stream){const body=await result.response.json();onUsage(body.usage);return Response.json(body);}
  if(!result.response.body)throw new RelayDispatchError('missing_stream');
  // Observe only the final allowlisted usage event; forward existing bytes unchanged.
  const decoder=new TextDecoder();let pending='',recorded=false;
  return new Response(result.response.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){
    pending+=decoder.decode(chunk,{stream:true});let boundary;
    while((boundary=pending.indexOf('\n\n'))>=0){const frame=pending.slice(0,boundary);pending=pending.slice(boundary+2);for(const line of frame.split('\n'))if(line.startsWith('data: ')&&line!=='data: [DONE]'){try{const data=JSON.parse(line.slice(6));if(data.usage&&!recorded){onUsage(data.usage);recorded=true;}}catch{}}}
    if(pending.length>2*1024*1024)throw new RelayDispatchError('stream_event_too_large');controller.enqueue(chunk);
  }})),{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store'}});
}
export async function isolatedImage(payload:Record<string,unknown>,tenant:string,requestKey:string,signal?:AbortSignal) {
  const relay=await resolveIsolatedRelay('images');
  // Publication is a GALX library concern. Never forward it to a relay or
  // upstream provider that does not understand the field.
  const { visibility: _visibility, ...providerPayload } = payload;
  let response: Response;
  try {
    response=await fetch(new URL('/v1/images/generations',relay.url),{method:'POST',redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(300000),...(signal?[signal]:[])]),
      headers:{Authorization:`Bearer ${relay.key}`,'Content-Type':'application/json','x-galx-tenant':digest(tenant),'Idempotency-Key':digest(requestKey)},body:JSON.stringify({...providerPayload,response_format:'b64_json'})});
  } catch (error) {
    reportRelayFailure(relay);
    throw error;
  }
  if(!response.ok) {
    const failure=await relayFailure(response,'image_unavailable');
    // A valid HTTP response proves this endpoint is reachable. Admission,
    // capability and upstream outcomes belong to the worker/relay response;
    // they must not poison endpoint discovery and hide healthy candidates.
    throw failure;
  }
  const reader=response.body?.getReader();if(!reader)throw new RelayDispatchError('invalid_image_response');
  const chunks:Uint8Array[]=[];let bytes=0;
  try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>32*1024*1024)throw new RelayDispatchError('invalid_image_response');chunks.push(part.value);}}
  finally{await reader.cancel().catch(()=>{});}
  const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!Array.isArray(data.data)||data.data.length!==1)throw new RelayDispatchError('invalid_image_response');
  const artifact=await sanitizeImageArtifact(decodeImageBase64(data.data[0]?.b64_json));
  return {created:Math.floor(Date.now()/1000),data:[{b64_json:artifact.bytes.toString('base64')}]};
}
