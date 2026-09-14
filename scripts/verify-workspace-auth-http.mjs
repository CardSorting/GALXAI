/** Local compiled Auth fixture. See workspace-auth operations; no real credentials. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const origin=process.argv[2] || 'http://localhost:3427';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const forbidden=/PRIVATE_AUTH_SENTINEL|GALX_VAULT_|verifyWorkspaceSession|GALX_PRIVATE_POST_MORTEM_CONTENT|shardId|relayId|executionModel|routingMode|VM_RELAY_URL/;
const session=(suffix)=>{const jwt=`${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:'attacker',exp:4102444800})).toString('base64url')}.${suffix}`; return `sb-supabase-auth-token=base64-${Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:4102444800,user:{id:'attacker'}})).toString('base64url')}`};
let checks=0; const assets=new Set();
for(const path of ['/images','/images/library','/images/favorites','/sites','/sites/00000000-0000-4000-8000-000000000000','/%69mages','/%73ites','/sites/draft.js','/images/future','/sites/nested/page']) {
 for(const extra of [{},{rsc:'1','next-router-prefetch':'1'},{'x-middleware-subrequest':'src/middleware:src/middleware:src/middleware:src/middleware:src/middleware'},{cookie:'admin=true; sb-pretend=true'}]) {
  const response=await fetch(origin+path,{headers:extra,redirect:'manual'}); assert.equal(response.status,307,path); assert.equal(new URL(response.headers.get('location'),origin).pathname,'/login'); assert.equal(response.headers.get('cache-control'),'private, no-store'); const body=await response.text(); assert(!body.includes('image-studio-page'));assert(!body.includes('sites-workspace'));assert.doesNotMatch(body,forbidden);checks++;
 }
}
for(const path of ['/images','/images/library','/images/favorites','/sites','/sites/00000000-0000-4000-8000-000000000000']) {
 for(const [suffix,status] of [['forged',307],['unavailable',503],['revoked',307],['lookup-unavailable',503],['valid',200]]) {
  const response=await fetch(origin+path,{headers:{cookie:session(suffix)},redirect:'manual'});assert.equal(response.status,status,`${path} ${suffix}`); assert.match(response.headers.get('cache-control'),/private.*no-store/);const body=await response.text();assert.doesNotMatch(body,forbidden);
  if(suffix==='valid') {assert(/data-workspace-loading="(?:Images|Sites)"/.test(body));for(const m of body.matchAll(/(?:src|href)="([^"?#]*\/_next\/static\/[^"?#]+\.(?:js|css))"/g)) assets.add(new URL(m[1],origin).href);}
  checks++;
 }
 for(const method of ['HEAD','POST','OPTIONS']) {const response=await fetch(origin+path,{method,redirect:'manual'});assert.equal(response.status,method==='HEAD'?307:401);checks++;}
}
for(const path of ['/','/login','/images/studio/desert.webp','/images/studio/glass.webp','/images/studio/paper.webp']) {const r=await fetch(origin+path);assert.equal(r.status,200,path);checks++;}
for(const [next,destination] of [['/images?view=library','/images/library'],['/sites/owned','/sites/owned'],['//evil.test','/images'],['/auth/signin?next=/auth/signin','/images']]) {
 const r=await fetch(origin+'/login?'+new URLSearchParams({next}),{headers:{cookie:session('valid')},redirect:'manual'});
 const body=await r.text();assert([200,307].includes(r.status));
 // Next.js may already have streamed the layout when a server page redirects.
 const location=r.headers.get('location') || body.match(/content="[01];url=([^"]+)"/)?.[1]?.replaceAll('&amp;','&');
 assert(location,'verified sign-in must redirect');assert(!body.includes('<form'));assert.doesNotMatch(body,forbidden);
 assert.equal(new URL(location,origin).pathname+new URL(location,origin).search,destination);checks++;
}
for(const [suffix,status] of [[undefined,401],['forged',401],['unavailable',503],['revoked',401],['lookup-unavailable',503],['valid',200]]) {
 const r=await fetch(origin+'/api/auth/session',{headers:suffix?{cookie:session(suffix)}:{},redirect:'manual'});
 assert.equal(r.status,status);assert.match(r.headers.get('cache-control'),/private.*no-store/);
 const raw=await r.text();assert.doesNotMatch(raw,forbidden);const body=JSON.parse(raw);
 if(status===200){assert.deepEqual(Object.keys(body).sort(),['user','valid']);assert.equal(body.user.id,'00000000-0000-4000-8000-000000000001');assert.equal(body.user.token,undefined);assert.equal(body.user.role,undefined);}
 checks++;
}
for(const [source,status] of [['https://evil.test',403],[origin,200]]) {
 const r=await fetch(origin+'/api/auth/session',{method:'DELETE',headers:{cookie:session('valid'),origin:source},redirect:'manual'});
 assert.equal(r.status,status);assert.match(r.headers.get('cache-control'),/private.*no-store/);assert.doesNotMatch(await r.text(),forbidden);
 if(status===200)assert.match(r.headers.get('set-cookie')||'',/sb-supabase-auth-token=;/);checks++;
}
for (const path of ['/api/auth/session','/images','/sites']) {
 const r=await fetch(origin+path,{headers:{cookie:session('valid')},redirect:'manual'});
 assert.equal(r.status,path.startsWith('/api/')?401:307);assert.doesNotMatch(await r.text(),forbidden);checks++;
}
const legacy=await fetch(origin+'/login?next=%2Fsites',{headers:{cookie:'galx_session=galx_sess_retired'},redirect:'manual'});
assert.equal(legacy.status,200);assert.match(await legacy.text(),/For your security, sign in again/);checks++;
for(const url of assets) {const r=await fetch(url);assert.equal(r.status,200,url);assert.doesNotMatch(await r.text(),forbidden,url);checks++;}
writeFileSync(process.env.GALX_AUTH_HTTP_RESULT || '/private/tmp/galx-workspace-auth-http-result.json',JSON.stringify({checks,assets:assets.size,scope:'Isolated compiled Next.js HTTP; synthetic Auth service; no live credentials or data; no generation or publishing'},null,2));
console.log(`PASS ${checks} HTTP/asset checks, ${assets.size} browser assets`);
