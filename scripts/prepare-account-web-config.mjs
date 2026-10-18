/** Retain current web authority, changing only the explicitly prepared data transport. */
import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { validateAccountMigrationConfig } from './lib/self-host.mjs';
const require=createRequire(import.meta.url);
const {allowed,validateConfig}=require('../deploy/self-host/runtime-config.cjs');
const state='.data/postgres-cutover',read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hostedFile=path.join(state,'hosted-web-production.secret.env');fs.chmodSync(hostedFile,0o600);
const text=fs.readFileSync(hostedFile,'utf8'),hosted=parseEnv(text);
// Retain the complete quoted value, including JSON embedded in the registry.
// The CLI can emit either JSON-escaped or literal inner quotes.
for(const line of text.split('\n')){
 const match=line.match(/^([A-Z][A-Z0-9_]*)=(".*")\s*$/);if(!match)continue;
 try{hosted[match[1]]=JSON.parse(match[2]);}catch{hosted[match[1]]=match[2].slice(1,-1);}
}
const values=Object.fromEntries(Object.entries(hosted).filter(([key,value])=>allowed.has(key)&&value&&!/^(SUPABASE_|NEXT_PUBLIC_SUPABASE_)/.test(key)));
const keys=read(path.join(state,'account-authority.secret.json'));
const credentials=read('.data/local-postgres/central/credentials.secret.json');
const vault=hosted.GALX_VAULT_KEY_V1||hosted.GALX_VAULT_MASTER_SECRET||hosted.GALX_VAULT_KEY;
const signing=hosted.GALX_AUDIT_SIGNING_SECRET||hosted.GALX_VAULT_MASTER_SECRET;
if(!vault||!signing||!credentials.postgres)throw Error('Existing cryptographic authority or local owner credential is missing.');
Object.assign(values,{
 ...read(path.join(state,'public-build-inputs.secret.json')),
 DATABASE_URL:`postgresql://postgres:${encodeURIComponent(credentials.postgres)}@host.docker.internal:55432/galxai`,
 POSTGRES_SSL_MODE:'verify-full',POSTGRES_CA_CERT:fs.readFileSync('.data/local-postgres/central/server.crt','utf8').trim().replaceAll('\n','\\n'),
 POSTGRES_POOL_SIZE:hosted.SUPABASE_POOL_SIZE||'15',SUPABASE_TIMEOUT_MS:undefined,
 GALX_DATABASE_DEPLOYMENT:'native-postgres-v1',ACCOUNT_API_INTERNAL_URL:'http://host.docker.internal:55110',ACCOUNT_API_SERVICE_KEY:keys.serviceToken,
 GALX_VAULT_KEY_V1:vault,GALX_AUDIT_SIGNING_SECRET:signing,
});
delete values.SUPABASE_TIMEOUT_MS;
// Moving to a Mac changes execution placement, not the accepted key material.
validateAccountMigrationConfig(validateConfig(values));
fs.writeFileSync(path.join(state,'web-runtime.secret.json'),JSON.stringify(values,null,2),{mode:0o600});
const build=read(path.join(state,'web-build-inputs.secret.json'));
const publicNames=['NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_GALX_EDGE_URL','PUBLIC_ASSETS_URL','NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY','NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION','NEXT_PUBLIC_BING_SITE_VERIFICATION','NEXT_PUBLIC_YANDEX_SITE_VERIFICATION','NEXT_PUBLIC_BAIDU_SITE_VERIFICATION'];
build.publicEnvironment=Object.fromEntries(publicNames.filter(k=>values[k]).map(k=>[k,values[k]]));
Object.assign(build.publicEnvironment,read(path.join(state,'public-build-inputs.secret.json')));
fs.writeFileSync(path.join(state,'web-build-inputs.secret.json'),JSON.stringify(build,null,2),{mode:0o600});
fs.writeFileSync(path.join(state,'web-configuration-preparation.json'),JSON.stringify({observedAt:new Date().toISOString(),hostedConfigSha256:createHash('sha256').update(fs.readFileSync(hostedFile)).digest('hex'),vaultSeedPreserved:values.GALX_VAULT_KEY_V1===vault,signingSeedPreserved:values.GALX_AUDIT_SIGNING_SECRET===signing,selectedNames:Object.keys(values).sort(),excludedNames:Object.keys(hosted).filter(k=>!allowed.has(k)).sort(),liveConfigurationChanged:false},null,2),{mode:0o600});
console.log(JSON.stringify({prepared:true,vaultAndSigningAuthorityPreserved:true,selectedNames:Object.keys(values).length,publicBuildNames:Object.keys(build.publicEnvironment),liveConfigurationChanged:false}));
