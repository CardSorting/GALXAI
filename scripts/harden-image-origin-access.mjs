// Operational remediation: preserve objects and existing unrelated edge rules.
import fs from 'node:fs';
process.loadEnvFile('.env.local');
const token=process.env.CLOUDFLARE_API_TOKEN;
const api='https://api.cloudflare.com/client/v4';
async function call(path,method='GET',body){
 const response=await fetch(api+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();
 if(!data.success) throw new Error(JSON.stringify({status:response.status,errors:data.errors?.map(e=>({code:e.code,message:e.message}))}));
 return data.result;
}
const zones=await call('/zones?name=galx.ai');
if(zones.length!==1) throw new Error('Expected one zone');
const zone=zones[0].id,account=process.env.R2_ACCOUNT_ID;
const bucket=process.env.R2_IMAGES_BUCKET_NAME||process.env.R2_ASSETS_BUCKET_NAME||'galxai-assets';
const managedPath=`/accounts/${account}/r2/buckets/${bucket}/domains/managed`;
const customPath=`/accounts/${account}/r2/buckets/${bucket}/domains/custom`;
const managed=await call(managedPath),custom=await call(customPath);
const rulesets=await call(`/zones/${zone}/rulesets`);
const existing=rulesets.find(r=>r.phase==='http_response_headers_transform'&&r.kind==='zone');
const previous=existing?await call(`/zones/${zone}/rulesets/${existing.id}`):null;
fs.writeFileSync(`/tmp/galx-origin-access-backup-${Date.now()}.json`,JSON.stringify({zone,account,bucket,managed,custom,ruleset:previous},null,2),{mode:0o600});
const groups=[['x-vercel-id','x-vercel-cache','x-matched-path','x-powered-by','server-timing','x-edge-fastpath','x-galx-router','x-galx-request-id','x-galx-session-affinity','x-galx-route-classification'],['x-galx-transit-latency-ms','x-galx-routing','x-galx-model','x-galx-tier','x-galx-window','x-galx-pool','x-galx-shard-id']];
const rules=groups.map((headers,index)=>({ref:`galx_public_headers_${index}`,description:'Minimize public response diagnostics',expression:'http.host in {"galx.ai" "www.galx.ai" "api.galx.ai" "assets.galx.ai"}',action:'rewrite',action_parameters:{headers:Object.fromEntries(headers.map(header=>[header,{operation:'remove'}]))},enabled:true}));
rules.push({ref:'galx_image_headers',description:'Image contract headers',expression:'http.host in {"galx.ai" "api.galx.ai"} and (starts_with(http.request.uri.path, "/v1/images/") or starts_with(http.request.uri.path, "/api/images/"))',action:'rewrite',action_parameters:{headers:{vary:{operation:'remove'},'content-security-policy':{operation:'remove'},'report-to':{operation:'remove'},nel:{operation:'remove'}}},enabled:true});
const phase=existing?await call(`/zones/${zone}/rulesets/${existing.id}`,'PUT',{name:previous.name,kind:'zone',phase:'http_response_headers_transform',rules:[...previous.rules.filter(r=>!rules.some(n=>n.ref===r.ref)).map(({id,version,last_updated,...r})=>r),...rules]}):await call(`/zones/${zone}/rulesets`,'POST',{name:'Public response headers',kind:'zone',phase:'http_response_headers_transform',rules});
console.log(JSON.stringify({responseHeaderRules:phase.rules.length}));
await call(managedPath,'PUT',{enabled:false});
console.log('Managed public image origin disabled.');
for(const domain of custom.domains||[]){if(!domain.enabled)continue;await call(`${customPath}/${domain.domain}`,'PUT',{enabled:false});console.log('Custom public image origin disabled.');}
// Block old asset hosts before cache lookup, including objects cached before access was disabled.
const firewallSets=await call(`/zones/${zone}/rulesets`);
const firewall=firewallSets.find(r=>r.phase==='http_request_firewall_custom'&&r.kind==='zone');
const deny={ref:'galx_private_image_origins',description:'Private image storage requires authenticated application delivery',expression:'http.host in {"assets.galx.ai" "pub-r2.galx.ai"}',action:'block',enabled:true};
if(firewall){
 const current=await call(`/zones/${zone}/rulesets/${firewall.id}`);
 fs.writeFileSync(`/tmp/galx-origin-firewall-backup-${Date.now()}.json`,JSON.stringify(current),{mode:0o600});
 const prior=current.rules.find(r=>r.ref===deny.ref);
 if(prior)await call(`/zones/${zone}/rulesets/${firewall.id}/rules/${prior.id}`,'PATCH',deny);
 else await call(`/zones/${zone}/rulesets/${firewall.id}/rules`,'POST',deny);
}else await call(`/zones/${zone}/rulesets`,'POST',{name:'Private asset origins',kind:'zone',phase:'http_request_firewall_custom',rules:[deny]});
console.log('Legacy public hosts blocked before cache lookup.');
console.log(JSON.stringify({managedEnabled:(await call(managedPath)).enabled,customEnabled:(await call(customPath)).domains.map(d=>d.enabled)}));
