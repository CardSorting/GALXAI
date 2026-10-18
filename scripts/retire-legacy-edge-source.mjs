/** Remove only the unconfigured legacy worker's obsolete source and schedule. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile),root=process.cwd(),state='.data/postgres-cutover',account='33f8b2564698c222880cbad3e42decad';
const staging=process.argv[2]==='staging';assert(process.argv.length===2||staging&&process.argv.length===3);
const suffix=staging?'-staging':'',worker='galxai-edge-gateway'+suffix,record='edge-worker-cleanup'+suffix+'.json';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const save=async(file,value)=>{await fs.writeFile(state+'/'+file,JSON.stringify(value,null,2),{mode:0o600});await fs.chmod(state+'/'+file,0o600);};
const env=parseEnv(await fs.readFile('.env.local','utf8'));
async function api(suffix){const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+worker+suffix,{headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN},signal:AbortSignal.timeout(20000)});const v=await r.json();assert(r.ok&&v.success,'Worker inventory unavailable.');return v.result;}
const sorted=bindings=>[...bindings].sort((a,b)=>a.name.localeCompare(b.name));
try{
 try{await fs.access(state+'/'+record);throw Error('A cleanup phase exists; inspect it before any new deployment.');}catch(error){if(error.code!=='ENOENT')throw error;}
 assert.equal((await read(state+'/central-hosted-cost-stop.json')).phase,'free-and-paused-verified');
 const before=await api('/settings'),schedules=await api('/schedules');
 assert.deepEqual(before.bindings.map(b=>b.name).sort(),['ASSET_BUCKET','EDGE_CACHE','ENVIRONMENT','PUBLIC_ASSETS_URL','RATE_LIMIT_KV',...(!staging?['STRIPE_SECRET_KEY']:[]),'SUPABASE_URL','TRAINING_DATASET_BUCKET'].sort());
 assert.equal(before.bindings.find(b=>b.name==='SUPABASE_URL').text,'https://mazhcjisettrzbqhorvp.supabase.co');assert(!before.bindings.some(b=>b.name==='SUPABASE_SERVICE_ROLE_KEY'));
 assert.deepEqual(schedules.schedules.map(s=>s.cron),['* * * * *']);
 await save('edge-worker-before'+suffix+'.secret.json',{observedAt:new Date().toISOString(),settings:before,schedules});
 const content=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+worker,{headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN},signal:AbortSignal.timeout(20000)});assert(content.ok);const old=Buffer.from(await content.arrayBuffer());await fs.writeFile(state+'/edge-worker-before'+suffix+'.multipart',old,{mode:0o600});
 const config=await fs.readFile('wrangler.toml','utf8');assert(config.includes('crons = []')&&!config.includes('SUPABASE_URL'));
 const directory=path.resolve(state+'/edge-worker-cleanup-config'+suffix);await fs.mkdir(directory,{mode:0o700});
 // Avoid importing this application's dotenv files into Worker tooling/types.
 const isolated=config.replace('main = "src/workers/cloudflare/index.ts"','main = '+JSON.stringify(path.join(root,'src/workers/cloudflare/index.ts')));assert.notEqual(config,isolated);await fs.writeFile(directory+'/wrangler.toml',isolated,{mode:0o600});
 const receipt={phase:'deployment-submitted',submittedAt:new Date().toISOString(),account,worker,previousContentSha256:createHash('sha256').update(old).digest('hex'),configurationSha256:createHash('sha256').update(config).digest('hex'),previousDatabaseCredentialPresent:false,privateApiActivated:false,nativeApplicationChanged:false,paymentCredentialChanged:false,objectStorageChanged:false};await save(record,receipt);
 const result=await run(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'deploy','--env',staging?'staging':''],{cwd:directory,env:{PATH:process.env.PATH,HOME:process.env.HOME,CLOUDFLARE_API_TOKEN:env.CLOUDFLARE_API_TOKEN,CLOUDFLARE_ACCOUNT_ID:account,WRANGLER_SEND_METRICS:'false'},timeout:180000,maxBuffer:2097152});
 await fs.writeFile(state+'/edge-worker-deployment'+suffix+'.private.log',result.stdout+'\n'+result.stderr,{mode:0o600});receipt.phase='deployment-acknowledged';await save(record,receipt);
 const after=await api('/settings'),actualSchedules=await api('/schedules');assert.deepEqual(sorted(after.bindings),sorted(before.bindings.filter(b=>b.name!=='SUPABASE_URL')));assert.deepEqual(actualSchedules.schedules,[]);
 receipt.phase='verified';receipt.verifiedAt=new Date().toISOString();receipt.hostedSourceBindingRemoved=true;receipt.cronSchedules=0;receipt.otherBindingsPreserved=true;await save(record,receipt);
 console.log('Legacy worker source binding and schedule removed; existing unavailable API state, storage and payment binding preserved. Native application unchanged.');
}catch(error){await fs.writeFile(state+'/edge-worker-cleanup-error.secret.log',String(error.stderr||error.stack||error.message),{mode:0o600});console.error('Worker cleanup stopped; inspect its private phase and actual settings before another mutation. No deployment was automatically replayed.');process.exitCode=1;}
