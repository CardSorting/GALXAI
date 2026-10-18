/** Explicit public DTOs for the local account service; operational responses stay private. */
import type { NextRequest } from 'next/server';
import { canonicalRequestUrl } from '@/lib/security/request-origin';

const methods: Record<string, readonly string[]> = {
  authorize:['GET'],callback:['GET'],verify:['GET','POST'],token:['POST'],signup:['POST'],otp:['POST'],recover:['POST'],resend:['POST'],logout:['POST'],user:['GET','PUT'],settings:['GET'],
  'user/identities/authorize':['GET'],
};
const baseHeaders = { 'Cache-Control':'private, no-store','Pragma':'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff' };
const publicErrors = new Set(['invalid_credentials','email_not_confirmed','user_banned','otp_expired','otp_disabled','user_not_found','signup_disabled','user_already_exists','weak_password','email_address_invalid','over_request_rate_limit','over_email_send_rate_limit','refresh_token_not_found','refresh_token_already_used','session_not_found','validation_failed','bad_jwt','no_authorization','flow_state_not_found','flow_state_expired']);
const object = (value: unknown): Record<string, unknown> => value && typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const strings = (source: Record<string,unknown>, keys: readonly string[]) => Object.fromEntries(keys.flatMap(key=>typeof source[key]==='string'&&String(source[key]).length<=8192?[[key,source[key]]]:[]));
const metadata = (value: unknown) => strings(object(value),['name','full_name','avatar_url','picture','preferred_username']);
function publicRedirect(value:string,base='https://galx.ai'):string {
  const location=new URL(value,base);
  if(location.protocol!=='https:'||location.port||location.username||location.password)throw Error('Invalid sign-in destination.');
  if(['accounts.google.com','github.com'].includes(location.hostname)){
    if(!(location.hostname==='accounts.google.com'&&['/o/oauth2/auth','/o/oauth2/v2/auth'].includes(location.pathname))&&!(location.hostname==='github.com'&&location.pathname==='/login/oauth/authorize'))throw Error('Invalid provider destination.');
    return location.href;
  }
  if(!['galx.ai','www.galx.ai'].includes(location.hostname)||!['/','/auth/callback'].includes(location.pathname))throw Error('Invalid account destination.');
  const query=new URLSearchParams(location.search),fragment=new URLSearchParams(location.hash.slice(1));
  if(query.has('error')||fragment.has('error')){
    location.pathname='/auth/callback';location.search='?error=auth_failed';location.hash='';return location.href;
  }
  for(const key of [...query.keys()])if(!['code','next','flow_id','auth_flow_id'].includes(key))query.delete(key);
  for(const key of [...fragment.keys()])if(!['access_token','refresh_token','token_type','expires_in','expires_at','type'].includes(key))fragment.delete(key);
  location.search=query.toString();location.hash=fragment.toString();return location.href;
}
export function publicAccountUser(value: unknown) {
  const user=object(value);
  if(typeof user.id!=='string')throw Error('Invalid account response.');
  const app=object(user.app_metadata);
  return { ...strings(user,['id','aud','role','email','phone','created_at','updated_at','last_sign_in_at','confirmed_at','email_confirmed_at','phone_confirmed_at','confirmation_sent_at','recovery_sent_at','email_change_sent_at','new_email','new_phone']),
    is_anonymous:user.is_anonymous===true,
    user_metadata:metadata(user.user_metadata),
    app_metadata:{...strings(app,['provider']),...(Array.isArray(app.providers)?{providers:app.providers.filter(p=>typeof p==='string'&&p.length<64)}:{})},
    ...(Array.isArray(user.identities)?{identities:user.identities.slice(0,20).map(value=>{
      const identity=object(value),data=object(identity.identity_data);
      return {...strings(identity,['id','identity_id','user_id','provider','created_at','updated_at','last_sign_in_at']),identity_data:{...metadata(data),...strings(data,['email','sub','provider_id']),...(typeof data.email_verified==='boolean'?{email_verified:data.email_verified}:{})}};
    })}:{}),
  };
}
export function publicAccountResult(value: unknown, operation: string): unknown {
  const body=object(value);
  if(['authorize','user/identities/authorize'].includes(operation)&&typeof body.url==='string')return {url:publicRedirect(body.url)};
  if(operation==='user'||(typeof body.id==='string'&&!body.user&&!body.access_token))return publicAccountUser(body);
  if(operation==='settings')return {disable_signup:body.disable_signup===true,mailer_autoconfirm:body.mailer_autoconfirm===true,phone_autoconfirm:body.phone_autoconfirm===true,external:Object.fromEntries(['email','google','github'].map(key=>[key,object(body.external)[key]===true]))};
  const output:Record<string,unknown>={...strings(body,['access_token','refresh_token','token_type'])};
  for(const key of ['expires_in','expires_at'])if(typeof body[key]==='number'&&Number.isSafeInteger(body[key]))output[key]=body[key];
  if(body.user)output.user=publicAccountUser(body.user);
  if(body.session){const session=object(body.session);output.session={...strings(session,['access_token','refresh_token','token_type']),...(['expires_in','expires_at'].reduce((out,key)=>typeof session[key]==='number'?{...out,[key]:session[key]}:out,{})),...(session.user?{user:publicAccountUser(session.user)}:{})};}
  if(typeof body.message_id==='string')output.message_id=body.message_id;
  return output;
}
async function boundedBody(response:Response,max=262144):Promise<string>{
  if(!response.body)return '';
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let length=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max)throw Error('Account response exceeds limit.');chunks.push(value);}}
  finally{await reader.cancel().catch(()=>{});}
  const output=new Uint8Array(length);let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(output);
}
function errorResponse(status:number,code='account_request_failed') {
  return Response.json({code,error_code:code,message:status>=500?'Sign-in is temporarily unavailable.':'We could not complete that sign-in request.'},{status,headers:{...baseHeaders,...(status===429||status===503?{'Retry-After':'2'}:{})}});
}
export async function publicAccountApi(request:NextRequest,operation:string,transport:typeof fetch=fetch):Promise<Response>{
  const rpc=operation==='rpc/fn_account_session_active';
  if(!(rpc?request.method==='POST':methods[operation]?.includes(request.method)))return errorResponse(404);
  let canonical:URL;
  try{canonical=canonicalRequestUrl(request);}catch{return errorResponse(400);}
  const origin=request.headers.get('origin');
  if(origin&&origin!==canonical.origin)return errorResponse(403);
  const publishable=process.env.NEXT_PUBLIC_ACCOUNT_PUBLISHABLE_KEY;
  const privateOrigin=process.env.ACCOUNT_API_INTERNAL_URL;
  if(!publishable||!privateOrigin)return errorResponse(503);
  // Browser navigations and provider/email callbacks have no API-key header.
  // Only these fixed GET operations may enter without the public key; GoTrue
  // still verifies the provider state or email token before establishing Auth.
  const key=request.headers.get('apikey');
  const navigation=request.method==='GET'&&['authorize','callback','verify'].includes(operation);
  if(key!==publishable&&!(navigation&&key===null))return errorResponse(401);
  let internal:URL;try{internal=new URL(privateOrigin);}catch{return errorResponse(503);}
  if(!['http:','https:'].includes(internal.protocol)||!['127.0.0.1','host.docker.internal'].includes(internal.hostname)||internal.username||internal.password||internal.search||internal.hash||internal.pathname!=='/'||internal.port!=='55110')return errorResponse(503);
  if(canonical.search.length>16384)return errorResponse(400);
  const target=new URL((rpc?'/rest/v1/':'/auth/v1/')+operation+(rpc?'':canonical.search),internal);
  let body:string|undefined;
  try{
    if(!['GET','HEAD'].includes(request.method)){
      const text=await boundedBody(new Response(request.body));
      if(text&&request.headers.get('content-type')?.split(';')[0]!=='application/json')return errorResponse(415);
      if(text)JSON.parse(text);
      if(rpc&&text.trim()!=='{}')return errorResponse(400);
      body=text;
    }
    const headers=new Headers({'Content-Type':'application/json',apikey:publishable});
    const authorization=request.headers.get('authorization');
    if(authorization){if(!/^Bearer [A-Za-z0-9_.-]+$/.test(authorization)||authorization.length>16384)return errorResponse(401);headers.set('Authorization',authorization);}
    const upstream=await transport(target,{method:request.method,headers,body,redirect:'manual',cache:'no-store',signal:AbortSignal.any([request.signal,AbortSignal.timeout(12000)])});
    if(upstream.status>=300&&upstream.status<400){
      const redirect=upstream.headers.get('location');if(!redirect)return errorResponse(503);
      return new Response(null,{status:upstream.status,headers:{...baseHeaders,Location:publicRedirect(redirect,canonical.origin)}});
    }
    if(upstream.status===204)return new Response(null,{status:204,headers:baseHeaders});
    const text=await boundedBody(upstream);
    const value=text?JSON.parse(text):{};
    if(!upstream.ok){const source=object(value),candidate=String(source.error_code||source.code||'');return errorResponse([400,401,403,404,409,422,429].includes(upstream.status)?upstream.status:503,publicErrors.has(candidate)?candidate:'account_request_failed');}
    if(rpc){if(typeof value!=='boolean')return errorResponse(503);return Response.json(value,{headers:baseHeaders});}
    return Response.json(publicAccountResult(value,operation),{status:upstream.status,headers:baseHeaders});
  }catch{return errorResponse(503);}
}
