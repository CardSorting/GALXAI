/** Two setup messages to the owner's alias; never a customer or hosted Auth user. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import pg from 'pg';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { fixtureFetch } from './fixtures/self-host-http';
const state='.data/postgres-cutover/',read=(name:string)=>JSON.parse(fs.readFileSync(state+name,'utf8'));
assert.equal(read('phase.json').state,'preparation');
const smtp=read('account-email-transport.json');assert(smtp.verifiedTls&&smtp.authenticated);
const file=state+'account-email-canary.secret.json';assert(!fs.existsSync(file),'Retain the original test receipt; do not resend automatically.');
const keys=read('account-authority.secret.json'),jar=new Map<string,string>(),origin='http://127.0.0.1:17788';
const headers={Host:'galx.ai','X-Forwarded-Proto':'https'};
const client=createServerClient('https://galx.ai',keys.publishableKey,{cookieOptions:{name:'sb-galx-auth-token'},cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>{for(const {name,value}of values)if(value)jar.set(name,value);else jar.delete(name);}},global:{fetch:async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);assert.equal(url.origin,'https://galx.ai');
 return fixtureFetch(origin+url.pathname+url.search,{...init,headers:{...Object.fromEntries(new Headers(init?.headers)),...headers},signal:AbortSignal.timeout(20000)});
}}});
const email='willcruzdesigner+galx-account-setup-'+randomBytes(6).toString('hex')+'@gmail.com',password=randomBytes(32).toString('base64url')+'!9aA';
const record:{[key:string]:unknown}={startedAt:new Date().toISOString(),email,state:'signup-submission-started',messagesRequested:1,scope:'Owner alias only, uncoupled local account copy; no hosted Auth mutation.'};
const save=()=>{fs.writeFileSync(file,JSON.stringify(record,null,2),{mode:0o600});fs.chmodSync(file,0o600);};
const db=new pg.Client({host:path.resolve('.data/local-postgres/central/socket'),port:55432,user:os.userInfo().username,database:'galxai'});
let userId:string|undefined,checks=0;
const check=(value:unknown,label:string)=>{assert(value,label);checks++;};
try{
 save();await db.connect();
 const signup=await client.auth.signUp({email,password,options:{emailRedirectTo:'https://galx.ai/auth/callback'}});
 check(!signup.error&&signup.data.user?.id&&!signup.data.session,'Signup must require confirmation after SMTP acceptance.');userId=signup.data.user!.id;record.userId=userId;
 const pending=(await db.query('SELECT email_confirmed_at,confirmation_token FROM auth.users WHERE id=$1 AND email=$2',[userId,email])).rows[0];
 check(pending&&!pending.email_confirmed_at&&pending.confirmation_token,'A pending confirmation must be stored for only the synthetic owner alias.');
 // The private database supplies this owned canary's test token; inbox delivery
 // and actual message-link metadata require separate provider-dashboard evidence.
 const confirmation=await client.auth.verifyOtp({token_hash:pending.confirmation_token,type:'signup'});
 check(!confirmation.error&&confirmation.data.user?.id===userId&&confirmation.data.session,'The public account route must accept the actual confirmation token.');
 const cookie=[...jar].map(([k,v])=>k+'='+v).join('; ');
 const profile=await fixtureFetch(origin+'/api/auth/session',{headers:{...headers,Cookie:cookie}});check(profile.status===200,'Confirmed identity must pass application session liveness.');
 await client.auth.signOut({scope:'local'});
 record.state='recovery-submission-started';record.messagesRequested=2;save();
 const recovery=await client.auth.resetPasswordForEmail(email,{redirectTo:'https://galx.ai/auth/callback'});check(!recovery.error,'Recovery must use the configured SMTP delivery.');
 const recovering=(await db.query('SELECT recovery_token FROM auth.users WHERE id=$1 AND email=$2',[userId,email])).rows[0];check(recovering?.recovery_token,'The same owned account must have a recovery token.');
 const verified=await client.auth.verifyOtp({token_hash:recovering.recovery_token,type:'recovery'});check(!verified.error&&verified.data.user?.id===userId,'Recovery verification must retain canonical account identity.');
 await client.auth.signOut({scope:'local'});
 record.state='auth-email-accepted';record.confirmationAndRecoveryAccepted=true;record.privateTokenVerification=true;record.providerInboxDeliveryVerified=false;record.checks=checks;record.observedAt=new Date().toISOString();save();
 console.log(JSON.stringify({messagesRequested:2,ownerAliasOnly:true,confirmationRequired:true,confirmationAndRecoveryAccepted:true,privateTokenVerification:true,checks,providerDeliveryStillSeparate:true}));
}catch(error){record.state='unconfirmed';record.failure=String((error as Error).message).slice(0,200);save();console.error('Owned email acceptance is unconfirmed; inspect its private receipt before any further send.');process.exitCode=1;}
finally{
 await db.end().catch(()=>{});
 if(userId){const response=await fetch('http://127.0.0.1:55110/auth/v1/admin/users/'+encodeURIComponent(userId),{method:'DELETE',headers:{apikey:keys.serviceToken,Authorization:'Bearer '+keys.serviceToken,'Content-Type':'application/json'},body:JSON.stringify({should_soft_delete:true}),signal:AbortSignal.timeout(12000)});record.canarySoftDeleted=response.ok;save();if(!response.ok)process.exitCode=1;}
}
