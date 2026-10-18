/** Read-only actual public HTTP and browser-asset acceptance. No sign-in or generation. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const state='.data/postgres-cutover',origin='https://galx.ai';
const read=async file=>JSON.parse(await fs.readFile(state+'/'+file,'utf8'));
const key=(await read('account-authority.secret.json')).publishableKey;
const configuration=await read('web-runtime.secret.json'),smtp=await read('account-email.secret.json'),auth=await read('auth-environment.secret.json');
const providerSecrets=Object.entries(auth).filter(([name])=>/^GOTRUE_EXTERNAL_(GOOGLE|GITHUB)_SECRET$/.test(name)).map(([,value])=>value);
const secrets=[smtp.password,...providerSecrets,...Object.entries(configuration).filter(([name])=>!/^(NEXT_PUBLIC_|PUBLIC_ASSETS_URL)/.test(name)&&/SECRET|TOKEN|KEY|DATABASE_URL|CERT/.test(name)).map(([,value])=>value)].filter(v=>typeof v==='string'&&v.length>=16);
// The SDK's public gotrue_meta_security protocol key is not an operator setting.
const forbidden=/mazhcjisettrzbqhorvp|prgjcyokylzcsqrjmkaa|host\.docker\.internal|galx-postgres-|pooler\.supabase|postgres(?:ql)?:\/\/|GOTRUE_(?:DB_|SMTP_|JWT_|EXTERNAL_)|PRIVATE_DIAGNOSTIC|Latest verified operating state|INC-20261017-/i;
const assets=new Set(),checks=[];
async function request(path,expected,options={}){
 const response=await fetch(origin+path,{...options,redirect:'manual',signal:AbortSignal.timeout(20000)});assert.equal(response.status,expected,path);
 const bytes=Buffer.from(await response.arrayBuffer());assert(bytes.length<4*1024*1024);const body=bytes.toString('utf8'),surface=body+JSON.stringify([...response.headers]);
 assert(!forbidden.test(surface),'Private marker in public HTTP: '+path+' ('+(surface.match(forbidden)?.[0]||'')+')');assert(!secrets.some(value=>surface.includes(value)),'Configured secret in public HTTP: '+path);
 checks.push({path,status:response.status});return {response,body};
}
try{
 assert.equal((await read('phase.json')).state,'central-local-authority');assert.equal((await read('ingress-cutover.json')).phase,'routed');
 assert(process.argv.length<=3,'Optional argument is the accepted build directory.');
 const acceptedBuild=process.argv[2];
 if(acceptedBuild){
  const chunks=JSON.parse(await fs.readFile(acceptedBuild+'/app/.next/app-build-manifest.json','utf8')).pages['/images/create/page'];
  assert(Array.isArray(chunks)&&chunks.length>5&&chunks.length<30,'Expected bounded Create entry assets.');
  for(const chunk of chunks){assert(typeof chunk==='string'&&/^static\/(?:chunks|css)\/[A-Za-z0-9_./\[\]-]+\.(?:js|css)$/.test(chunk)&&!chunk.split('/').includes('..'),'Expected exact public build assets.');assets.add('/_next/'+chunk);}
 }
 for(const path of ['/','/about','/explore','/stars','/collections','/login','/signup','/pricing/galx-pro','/exhibitions','/editorials','/knowledge-base/getting-started']){
  const {body}=await request(path,200);for(const match of body.matchAll(/(?:src|href)="([^"?#]*\/_next\/static\/[^"?#]+\.(?:js|css))"/g)){const url=new URL(match[1],origin);assert.equal(url.origin,origin);assets.add(url.pathname);}
 }
 assert(assets.size>20);for(const asset of assets)await request(asset,200);
 for(const [path,status]of [['/api/auth/session',401],['/api/relay/status',401],['/auth/v1/admin/users',404],['/auth/v1/health',404],['/rest/v1/galx_account_profiles',404],['/rest/v1/rpc/arbitrary',404],['/post-mortem/CURRENT_STATE.md',404],['/v1/images/assets/invalid-capability',404],['/v1/images/assets/invalid-capability/thumbnail',404]])await request(path,status);
 for(const [path,method,headers,status]of [
  ['/auth/v1/user','GET',{apikey:key,Authorization:'Bearer forged'},403],
  ['/auth/v1/token?grant_type=password','POST',{apikey:key,Origin:'https://hostile.invalid','Content-Type':'application/json'},403],
  ['/v1/images/generations','POST',{'Content-Type':'application/json'},401],
 ]){const {response}=await request(path,status,{method,headers,...(method==='POST'?{body:'{}'}:{})});assert(/no-store/.test(response.headers.get('cache-control')||''));}
 const {body:settings}=await request('/auth/v1/settings',200,{headers:{apikey:key}});const policy=JSON.parse(settings);assert(policy.external.google&&policy.external.github&&policy.external.email);
 for(const provider of ['google','github']){
  const {response}=await request('/auth/v1/authorize?provider='+provider+'&redirect_to=https%3A%2F%2Fgalx.ai%2Fauth%2Fcallback&code_challenge='+'a'.repeat(43)+'&code_challenge_method=s256',302);
  const redirect=new URL(response.headers.get('location'));assert.equal(redirect.hostname,provider==='google'?'accounts.google.com':'github.com');assert.equal(redirect.searchParams.get('redirect_uri'),'https://galx.ai/auth/v1/callback');
 }
 const {response:callback}=await request('/auth/v1/callback?error=server_error&error_description=PRIVATE_DIAGNOSTIC',303);assert(!callback.headers.get('location').includes('PRIVATE_DIAGNOSTIC'));
 const metadata=await fetch('https://nova.galx.ai/.well-known/oauth-protected-resource',{redirect:'manual',signal:AbortSignal.timeout(15000)});assert.equal(metadata.status,200);const resource=await metadata.json();assert.equal(resource.resource,'https://nova.galx.ai');assert.deepEqual(resource.authorization_servers,['https://galx.ai']);
 for(const path of ['/','/login','/auth/callback?error=check']){const response=await fetch('https://www.galx.ai'+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});assert.equal(response.status,308);assert.equal(response.headers.get('location'),origin+path);await response.body?.cancel();}
 const result={observedAt:new Date().toISOString(),result:'pass',checks:checks.length,browserAssets:assets.size,createEntryAssetsVerified:!!acceptedBuild,configuredSecretsCompared:secrets.length,privateMatches:0,canonicalRedirects:true,novaIssuerRetained:true,scope:'Actual public raw HTTP, rendered HTML/browser assets, optional accepted-build Create entry assets, account/provider initiation, origin/admin/forgery/private artifact denials. Social code exchange, signed-in continuity, generation and settlement are separate.'};
 await fs.writeFile(state+'/public-account-cutover-acceptance.json',JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify(result));
}catch(error){await fs.writeFile(state+'/public-account-cutover-error.secret.log',String(error.stack||error.message),{mode:0o600});console.error('Public acceptance failed; inspect the private error before declaring the cutover accepted.');process.exitCode=1;}
