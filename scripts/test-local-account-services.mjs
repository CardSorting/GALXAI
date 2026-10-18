/** Mutates only the new private local Auth copy, with one explicitly owned canary. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const state='.data/postgres-cutover/';
const setup=await read('post-mortem/releases/2026-10-17-local-postgres-setup.json');
if(setup.boundaries.application_env_changed||setup.boundaries.relay_component_configs_changed||setup.boundaries.hosted_projects_retired)throw Error('This canary is only for the uncoupled local preparation copy.');
if((await read(state+'phase.json')).state!=='preparation')throw Error('Local Auth is no longer a test preparation copy.');
const keys=await read(state+'account-authority.secret.json');
const base='http://127.0.0.1:55110';let userId,email,password;let assertions=0;let completed=false;
const check=(value,message)=>{assert(value,message);assertions++;};
async function call(path,{method='POST',body,token,admin=false}={}){
 const response=await fetch(base+path,{method,headers:{apikey:admin?keys.serviceToken:keys.publishableKey,Authorization:'Bearer '+(token||(admin?keys.serviceToken:keys.anonToken)),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(10000)});
 const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{data=null;}return{status:response.status,data};
}
try{
 email='local-cutover-'+randomBytes(8).toString('hex')+'@example.invalid';password=randomBytes(32).toString('base64url')+'!9aA';
 const created=await call('/auth/v1/admin/users',{admin:true,body:{email,password,email_confirm:true,user_metadata:{name:'Local migration canary',role:'admin'}}});
 check(created.status===200&&created.data?.id,'Canary account creation must succeed on the local copy.');userId=created.data.id;
 const login=await call('/auth/v1/token?grant_type=password',{body:{email,password}});
 check(login.status===200&&login.data?.user?.id===userId&&login.data?.access_token,'Password login must preserve the canonical account UUID.');
 const {access_token:token,refresh_token:refresh}=login.data;
 const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
 check(claims.role==='authenticated'&&claims.sub===userId,'Editable user metadata must never elevate JWT authority.');
 const who=await call('/auth/v1/user',{method:'GET',token});check(who.status===200&&who.data?.id===userId,'User lookup must verify the token locally.');
 const active=await call('/rest/v1/rpc/fn_account_session_active',{token,body:{}});check(active.status===200&&active.data===true,'The database must confirm the owner-bound Auth session.');
 const tampered=token.slice(0,-6)+'AAAAAA';const bad=await call('/rest/v1/rpc/fn_account_session_active',{token:tampered,body:{}});check(bad.status===401,'A forged token must not gain database session authority.');
 const adminDenied=await call('/auth/v1/admin/users',{method:'GET',token});check([401,403].includes(adminDenied.status),'An ordinary authenticated account must not read Auth administration.');
 const wrong=await call('/auth/v1/token?grant_type=password',{body:{email,password:'incorrect-'+password}});check([400,401,422].includes(wrong.status),'Wrong-password login must fail.');
 const renewed=await call('/auth/v1/token?grant_type=refresh_token',{body:{refresh_token:refresh}});check(renewed.status===200&&renewed.data?.user?.id===userId,'Refresh must retain account identity.');
 const logout=await call('/auth/v1/logout?scope=local',{token:renewed.data.access_token,body:{}});check(logout.status===204,'Local signout must complete.');
 const revoked=await call('/rest/v1/rpc/fn_account_session_active',{token:renewed.data.access_token,body:{}});check(revoked.status===200&&revoked.data===false,'Unexpired tokens must lose liveness after session revocation.');
 const rejectedRefresh=await call('/auth/v1/token?grant_type=refresh_token',{body:{refresh_token:renewed.data.refresh_token}});check([400,401,403,422].includes(rejectedRefresh.status),'A revoked refresh token must not restore a session.');
 for(const provider of ['google','github']){
   const response=await fetch(base+'/auth/v1/authorize?provider='+provider+'&redirect_to=https%3A%2F%2Fgalx.ai%2Fauth%2Fcallback&code_challenge='+'a'.repeat(43)+'&code_challenge_method=s256',{headers:{apikey:keys.publishableKey},redirect:'manual',signal:AbortSignal.timeout(10000)});
   check(response.status===302&&new URL(response.headers.get('location')).hostname===(provider==='google'?'accounts.google.com':'github.com'),'OAuth authorization must use the configured provider.');
 }
 completed=true;
}finally{
 // Established account links are intentionally immutable. Retain the audit
 // identity while soft deleting its Auth user, rather than bypassing that rule.
 if(userId){
   const removed=await call('/auth/v1/admin/users/'+encodeURIComponent(userId),{method:'DELETE',admin:true,body:{should_soft_delete:true}});
   check([200,204].includes(removed.status),'Owned canary soft deletion must succeed without disabling retention guards.');
   const user=await call('/auth/v1/admin/users/'+encodeURIComponent(userId),{method:'GET',admin:true});
   check(user.status===200&&user.data?.email!==email,'The owned canary must no longer retain its sign-in email.');
   const denied=await call('/auth/v1/token?grant_type=password',{body:{email,password}});
   check([400,401,422].includes(denied.status),'The deactivated canary must no longer sign in.');
 }
}
if(completed){
 await fs.writeFile(state+'local-account-acceptance.json',JSON.stringify({observedAt:new Date().toISOString(),checks:assertions,result:'pass',canaryCleanup:'Auth soft deletion; immutable operational account link retained.',scope:'Uncoupled local Auth/PostgREST services. Password, identity, JWT role, session liveness, forgery/admin denial, refresh, revoke and OAuth initiation. No real provider callback or email delivery tested.'},null,2),{mode:0o600});
 console.log(`${assertions} local account checks passed, including canary deactivation; actual social callbacks and email delivery remain separate gates.`);
}
