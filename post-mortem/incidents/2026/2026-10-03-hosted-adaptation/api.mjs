import fs from 'node:fs';
import {parseEnv} from 'node:util';
const env=parseEnv(fs.readFileSync('.env.local','utf8'));
export const link=JSON.parse(fs.readFileSync('.vercel/project.json'));
const {token}=JSON.parse(fs.readFileSync('/Users/bozoegg/Library/Application Support/com.vercel.cli/auth.json'));
async function call(base, key, path, method='GET', body) {
 const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(20000)});
 const v=await r.json(); if(!r.ok || v.success===false) throw new Error(method+' '+path.split('?')[0]+' status '+r.status+' code '+(v.error?.code || v.errors?.[0]?.code || 'unknown')); return v;
}
export const vercel=(path,method,body)=>call('https://api.vercel.com',token,path+(path.includes('?')?'&':'?')+'teamId='+link.orgId,method,body);
export const cf=(path,method,body)=>call('https://api.cloudflare.com/client/v4',env.CLOUDFLARE_API_TOKEN,path,method,body);
export const zone='/zones/8b826c42c2f1962c695bc74f48289885';
export const tunnel='/accounts/33f8b2564698c222880cbad3e42decad/cfd_tunnel/3df90220-304b-4771-8be8-4569bc147b4e/configurations';
export const write=(name,value)=>fs.writeFileSync('.relay/hosted-adaptation/'+name,JSON.stringify(value,null,2)+'\n',{mode:0o600});
