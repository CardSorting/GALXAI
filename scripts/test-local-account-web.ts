/** Real SDK + raw HTTP acceptance of the private migration candidate only. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { fixtureFetch } from './fixtures/self-host-http';
const state='.data/postgres-cutover/',read=(file:string)=>JSON.parse(fs.readFileSync(state+file,'utf8'));
assert.equal(read('phase.json').state,'preparation','Never run this synthetic workflow after local authority is live.');
const keys=read('account-authority.secret.json');
const origin='http://127.0.0.1:17788',internal='http://127.0.0.1:55110';
const headers={Host:'galx.ai','X-Forwarded-Proto':'https'};
let checks=0,userId:string|undefined;
const check=(value:unknown,message:string)=>{assert(value,message);checks++;};
const privateCall=async(path:string,method='POST',body?:unknown)=>{
 const response=await fetch(internal+'/auth/v1/'+path,{method,headers:{apikey:keys.serviceToken,Authorization:'Bearer '+keys.serviceToken,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 return {status:response.status,body:await response.json()};
};
const safe=(response:Response,text:string)=>{
 const raw=text+JSON.stringify([...response.headers]);
 check(!raw.includes(keys.serviceToken)&&!raw.includes(keys.jwtSecret)&&!/PRIVATE_DIAGNOSTIC|pooler\.supabase|mazhcjisettrzbqhorvp|prgjcyokylzcsqrjmkaa|postgres(?:ql)?:\/\/|host\.docker\.internal|galx-postgres-/.test(raw),'HTTP must not disclose private destinations or credentials.');
 check(/no-store/.test(response.headers.get('cache-control')||''),'Account HTTP must remain uncached.');
};
const cookieJar=new Map<string,string>();
const client=createServerClient('https://galx.ai',keys.publishableKey,{
 cookieOptions:{name:'sb-galx-auth-token'},
 cookies:{getAll:()=>[...cookieJar].map(([name,value])=>({name,value})),setAll:values=>{for(const {name,value}of values)if(value)cookieJar.set(name,value);else cookieJar.delete(name);}},
 global:{fetch:async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  assert.equal(url.origin,'https://galx.ai');
  const response=await fixtureFetch(origin+url.pathname+url.search,{...init,headers:{...Object.fromEntries(new Headers(init?.headers)),...headers},signal:AbortSignal.timeout(15000)});
  safe(response,await response.clone().text());return response;
 }},
});
const email='local-web-cutover-'+randomBytes(8).toString('hex')+'@example.invalid',password=randomBytes(32).toString('base64url')+'!9aA';
try{
 const created=await privateCall('admin/users','POST',{email,password,email_confirm:true,user_metadata:{name:'Migration HTTP canary',role:'admin'}});
 check(created.status===200&&created.body.id,'The explicitly owned local canary must be created.');userId=created.body.id;
 const login=await client.auth.signInWithPassword({email,password});
 check(!login.error&&login.data.user?.id===userId,'The actual SDK must sign in through the candidate HTTP route.');
 check([...cookieJar.keys()].some(name=>/^sb-galx-auth-token(?:\.\d+)?$/.test(name)),'Public and server clients must share the canonical cookie.');
 const cookies=[...cookieJar].map(([k,v])=>`${k}=${v}`).join('; ');
 const profile=await fixtureFetch(origin+'/api/auth/session',{headers:{...headers,Cookie:cookies}}),profileBody=await profile.text();safe(profile,profileBody);
 check(profile.status===200&&profileBody.includes(userId!), 'The application must verify the cookie and local database session together.');
 const workspace=await fixtureFetch(origin+'/images/create',{headers:{...headers,Cookie:cookies}}),workspaceBody=await workspace.text();
 check(workspace.status===200,'A verified local account must pass protected workspace admission.');
 check(!/PRIVATE_DIAGNOSTIC|host\.docker\.internal|postgres(?:ql)?:\/\//.test(workspaceBody),'Rendered workspace HTTP must keep private implementation data out.');
 const forged=await fixtureFetch(origin+'/auth/v1/admin/users',{headers:{...headers,apikey:keys.publishableKey,Authorization:'Bearer '+login.data.session!.access_token}});safe(forged,await forged.text());check(forged.status===404,'The public account API must not publish administration.');
 const foreign=await fixtureFetch(origin+'/auth/v1/token?grant_type=password',{method:'POST',headers:{...headers,apikey:keys.publishableKey,Origin:'https://hostile.invalid','Content-Type':'application/json'},body:'{}'});safe(foreign,await foreign.text());check(foreign.status===403,'Foreign origins must not use the account mutation transport.');
 for(const provider of ['google','github']){
  const response=await fixtureFetch(origin+'/auth/v1/authorize?provider='+provider+'&redirect_to=https%3A%2F%2Fgalx.ai%2Fauth%2Fcallback&code_challenge='+'a'.repeat(43)+'&code_challenge_method=s256',{headers});
  check(response.status===302,'Browser OAuth must work without API-key navigation headers.');
  check(new URL(response.headers.get('location')!).hostname===(provider==='google'?'accounts.google.com':'github.com'),'OAuth must retain the intended provider.');
 }
 const badCallback=await fixtureFetch(origin+'/auth/v1/callback?error=server_error&error_description=PRIVATE_DIAGNOSTIC',{headers});
 safe(badCallback,await badCallback.text());check([302,303].includes(badCallback.status)&&!badCallback.headers.get('location')?.includes('PRIVATE_DIAGNOSTIC'),'Provider callback failures must be sanitized redirects.');
 const refreshed=await client.auth.refreshSession();check(!refreshed.error&&refreshed.data.user?.id===userId,'SDK refresh must retain canonical identity.');
 const logout=await client.auth.signOut({scope:'local'});check(!logout.error,'SDK signout must revoke locally.');
 const replay=await fixtureFetch(origin+'/api/auth/session',{headers:{...headers,Cookie:cookies}});safe(replay,await replay.text());check(replay.status===401,'A saved old cookie must not survive authoritative revocation.');
}finally{
 if(userId){const removed=await privateCall('admin/users/'+encodeURIComponent(userId),'DELETE',{should_soft_delete:true});check(removed.status===200,'Canary deactivation must preserve immutable account retention.');}
}
fs.writeFileSync(state+'local-account-web-acceptance.json',JSON.stringify({observedAt:new Date().toISOString(),result:'pass',checks,scope:'Private candidate HTTP, actual Auth SDK/cookies, local Auth and database liveness, workspace entry, privilege/origin denial, OAuth initiation and sanitized callback failure, refresh and logout. No real email delivery or social callback exchange.'},null,2),{mode:0o600});
console.log(`${checks} account SDK and HTTP checks passed; email and actual provider callbacks remain separate.`);
