/** Preserve Nova's narrow authority while preparing its native database transport. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { validateNovaNativeConfig } from './lib/self-host.mjs';
const state='.data/postgres-cutover',read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
try{
 const sourceFile=state+'/nova-runtime-hosted.secret.json';
 if(!fs.existsSync(sourceFile)){
   const container=JSON.parse(execFileSync('docker',['--context','desktop-linux','inspect','galx-web-nova-web-1'],{encoding:'utf8'}))[0];
   if(container.Config.Labels?.['ai.galx.self-host']!=='v1'||!container.Image.startsWith('sha256:5157984bc065'))throw Error('Retained Nova source identity differs.');
   const mount=container.Mounts.find(m=>m.Destination==='/run/secrets/galx-runtime.json');if(!mount||mount.RW!==false||!mount.Source)throw Error('Retained Nova configuration mount is missing.');
   fs.writeFileSync(sourceFile,fs.readFileSync(mount.Source),{mode:0o600});fs.chmodSync(sourceFile,0o600);
 }
 const original=read(sourceFile),web=read(state+'/web-runtime.secret.json'),inputs=read(state+'/web-build-inputs.secret.json');
 for(const name of ['GALX_VAULT_KEY_V1','GALX_AUDIT_SIGNING_SECRET'])if(!original[name]||original[name]!==web[name])throw Error('Existing Nova signing authority differs; do not replace it.');
 const values={...original};for(const name of Object.keys(values))if(/^(SUPABASE_|NEXT_PUBLIC_SUPABASE_)/.test(name))delete values[name];
 Object.assign(values,inputs.publicEnvironment);
 for(const name of ['DATABASE_URL','POSTGRES_SSL_MODE','POSTGRES_CA_CERT','POSTGRES_POOL_SIZE','GALX_DATABASE_DEPLOYMENT','ACCOUNT_API_INTERNAL_URL'])values[name]=web[name];
 validateNovaNativeConfig(values);
 fs.writeFileSync(state+'/nova-runtime-native.secret.json',JSON.stringify(values,null,2),{mode:0o600});fs.chmodSync(state+'/nova-runtime-native.secret.json',0o600);
 fs.writeFileSync(state+'/nova-database-preparation.json',JSON.stringify({observedAt:new Date().toISOString(),sourceConfigSha256:createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex'),cryptographicAuthorityPreserved:true,unrelatedAdministrationExcluded:true,liveNovaChanged:false},null,2),{mode:0o600});
 console.log('Native Nova configuration prepared; existing signing authority retained and live runtime unchanged.');
}catch(error){fs.writeFileSync(state+'/nova-preparation-error.secret.log',String(error.stderr||error.message),{mode:0o600});console.error('Nova preparation stopped; inspect its private source/authority evidence.');process.exitCode=1;}
