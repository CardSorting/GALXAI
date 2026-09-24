/** Export private, component-specific files. Never pass root environment to a pool host. */
import { readFile,writeFile,mkdir,stat } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { PROJECTS,serviceOrigin,assertProjectDatabase } from '../src/relay/pool-protocol.js';
import { DESKTOP_PROFILES,parseDesktopProfile } from '../src/relay/desktop-capacity.js';
const [file]=process.argv.slice(2);if(!file)throw Error('Provide a private deployment-input.json path.');
const root=path.resolve('.relay/service-deployment');
const input=JSON.parse(await readFile(file,'utf8')),authorityFile=path.join(root,'authority.json');
if((await stat(authorityFile)).mode&0o077)throw Error('Authority file permissions must be private.');
const authority=JSON.parse(await readFile(authorityFile,'utf8'));
const centralOrigin=serviceOrigin(input.centralOrigin);if(!centralOrigin.startsWith('https:'))throw Error('Production authority requires HTTPS.');
const desktopProfile=parseDesktopProfile(input.desktopProfile ?? 'one-desktop');
const env=parseEnv(await readFile('.env.local','utf8'));
const vault=Object.fromEntries(Object.entries(env).filter(([k])=>/^GALX_VAULT_(KEY_V[12]|ACTIVE_KEY_VERSION|MASTER_SECRET)$/.test(k)));
if(!vault.GALX_VAULT_MASTER_SECRET&&!vault.GALX_VAULT_KEY_V1&&!vault.GALX_VAULT_KEY_V2)throw Error('The central vault is not configured.');
const token=()=>randomBytes(32).toString('base64url');
authority.identitySecret??=token();for(const p of Object.values(authority.pools) as any[])p.capabilityKey??=token();
await writeFile(authorityFile,JSON.stringify(authority,null,2),{mode:0o600});
async function database(component:'central'|'premium',password:string){
 const supplied=input.databases?.[component];if(!supplied?.url||!supplied.caFile)throw Error('Provide the actual database connection URL and downloaded project CA file for each project.');
 assertProjectDatabase(supplied.url,PROJECTS[component]);const url=new URL(supplied.url);
 const role=component==='central'?'galx_control_service':'galx_execution_service';
 url.username=role+(url.hostname.endsWith('.pooler.supabase.com')?'.'+PROJECTS[component]:'');url.password=password;
 // TLS is configured by pg with rejectUnauthorized; URL sslmode must not override it.
 if(url.search)throw Error('Remove query options from the database URL.');
 return {databaseUrl:url.toString(),databaseCa:await readFile(supplied.caFile,'utf8')};
}
const configurations:Record<string,unknown>={central:{...await database('central',authority.centralDatabasePassword),identitySecret:authority.identitySecret,vault}};
for(const pool of ['premium'] as const){const p=authority.pools[pool],identity={pool,installationId:p.installationId,centralOrigin};
 if(typeof input.desktopImage!=='string'||!/^[-\w./:]+@sha256:[a-f0-9]{64}$/.test(input.desktopImage))throw Error('Provide the verified desktop image digest.');
 configurations[pool+'-runtime']={...identity,...await database(pool,p.databasePassword),runtimeToken:p.principals.runtime.token,inferenceKey:p.inferenceKey,capabilityKey:p.capabilityKey};
  configurations[pool+'-monitor']={...identity,operatorToken:p.principals.operator.token,viewerToken:p.principals.viewer.token,registrarToken:p.principals.registrar.token,desktopImage:input.desktopImage,desktopProfile,desktopLimits:{maxDesktops:DESKTOP_PROFILES[desktopProfile].maxDesktops,maxRunning:DESKTOP_PROFILES[desktopProfile].maxRunning}};
}
const destination=path.join(root,'components');await mkdir(destination,{recursive:true,mode:0o700});
for(const [name,value] of Object.entries(configurations))await writeFile(path.join(destination,name+'.json'),JSON.stringify(value,null,2),{mode:0o600});
console.log('Three private component files exported. Deliver the Premium files to the dedicated host; no gates were changed.');
