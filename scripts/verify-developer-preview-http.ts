import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.argv[2]||'http://127.0.0.1:3419';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const results:unknown[]=[];
for(const path of ['/v1/chat/completions','/v1/messages','/v1/completions','/v1/embeddings','/v1/models','/v1/models/model.png','/api/chat','/api/generate','/api/run','/api/keys','/api/keys/verify','/api/auth/tokens/restricted','/api/new-endpoint']) {
  for(const method of ['GET','POST']) {
    const response=await fetch(base+path,{method,redirect:'manual',headers:{'x-user-id':'invented','x-galx-approved':'true','x-middleware-subrequest':'middleware:middleware:middleware:middleware:middleware'}});
    assert.equal(response.status,401,`${method} ${path}`);assert.match(response.headers.get('cache-control')||'',/no-store/);
    const data=await response.json();assert.equal(data.error.code,'authentication_required');
    results.push({method,path,status:response.status});
  }
}
for(const path of ['/models','/docs','/playground','/keys','/tools/api-request-builder','/models/opengraph-image','/llms-full.txt']) {
  const response=await fetch(base+path,{redirect:'manual'});assert.equal(response.status,404,path);assert.equal(response.headers.get('location'),null);
}
const scripts=new Set<string>();
const forbidden=/GALX_VAULT_|SUPABASE_SERVICE_ROLE_KEY|VM_RELAY_URL|galx_shard|private\.developer|upstreamId|executionModel|P-AHT|GALXAI delivers identical upstream|Upstream Enterprise Contracts|High-Concurrency Fleet Routing/;
for(const path of ['/','/images','/sites','/auth/signup?next=%2Fimages','/pricing']) {
  const response=await fetch(base+path);assert.equal(response.status,200,path);const html=await response.text();assert.doesNotMatch(html,forbidden,path);
  for(const match of html.matchAll(/<script[^>]+src="([^"]+)"/g))scripts.add(match[1].replaceAll('&amp;','&'));
  results.push({path,status:response.status});
}
for(const script of scripts){const response=await fetch(new URL(script,base));assert.equal(response.status,200,script);assert.doesNotMatch(await response.text(),forbidden,script);}
const schema=await (await fetch(base+'/api/openapi.json')).json();assert.deepEqual(Object.keys(schema.paths),['/images/generations']);
const image=await fetch(base+'/v1/images/generations',{method:'POST'});assert.equal(image.status,401);assert.equal((await image.json()).error.code,'unauthorized');
const site=await fetch(base+'/api/sites/workspace');assert.equal(site.status,401);assert.doesNotMatch(await site.text(),/developer_preview_required/);
await fs.mkdir('.impeccable/review/developer-preview',{recursive:true});
await fs.writeFile('.impeccable/review/developer-preview/http.json',JSON.stringify({results,scriptsScanned:scripts.size},null,2));
console.log(`PASS: raw API denial, legacy page redirects, Images/Sites reachability and scoped public HTML / ${scripts.size} browser-script scan.`);
