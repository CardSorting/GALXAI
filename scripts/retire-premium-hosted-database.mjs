/** Explicit approved Premium-only retirement. Recovery must precede deletion. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { parseEnv } from 'node:util';
import { createHash,createHmac,createDecipheriv,hkdfSync,randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import { localPostgresSource,localPostgresTableManifest } from './local-postgres.mjs';
const state='.data/postgres-cutover',directory=state+'/retirement';
const project='prgjcyokylzcsqrjmkaa',central='mazhcjisettrzbqhorvp';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const save=async(file,value)=>{await fs.writeFile(file,JSON.stringify(value,null,2),{mode:0o600});await fs.chmod(file,0o600);};
const sha=value=>createHash('sha256').update(value).digest('hex');
const hmac=(key,value)=>createHmac('sha256',key).update(value).digest();
const exec=promisify(execFile);
const receiptFile=directory+'/premium-offdevice-recovery.json';
const run=async(bin,args,env={})=>(await exec(bin,args,{env:{PATH:process.env.PATH,HOME:os.homedir(),LANG:'en_US.UTF-8',...env},timeout:180000,maxBuffer:2097152})).stdout;
async function privateBucket(config,environment){
  const base='https://api.cloudflare.com/client/v4/accounts/'+config.R2_ACCOUNT_ID+'/r2/buckets/'+encodeURIComponent(config.R2_PRIVATE_IMAGES_BUCKET_NAME)+'/domains/';
  for(const kind of ['managed','custom']){
    const response=await fetch(base+kind,{headers:{Authorization:'Bearer '+environment.CLOUDFLARE_API_TOKEN},signal:AbortSignal.timeout(15000)});
    const body=await response.json();assert(response.ok&&body.success,'Bucket privacy could not be verified.');
    if(kind==='managed')assert.equal(body.result.enabled,false,'The destination has public access enabled.');
    else assert.equal(body.result.domains.length,0,'The destination has custom public domains.');
  }
}
async function objectRequest(config,key,method,body){
  const host=config.R2_ACCOUNT_ID+'.r2.cloudflarestorage.com',uri='/'+encodeURIComponent(config.R2_PRIVATE_IMAGES_BUCKET_NAME)+'/'+key.split('/').map(encodeURIComponent).join('/');
  const date=new Date().toISOString().replace(/[:-]|\.\d{3}/g,''),day=date.slice(0,8),payload=sha(body||Buffer.alloc(0));
  const headers={host,'x-amz-date':date,'x-amz-content-sha256':payload};
  if(body){headers['content-type']='application/octet-stream';headers['cache-control']='private, no-store';headers['if-none-match']='*';}
  const names=Object.keys(headers).sort(),signed=names.join(';');
  const request=method+'\n'+uri+'\n\n'+names.map(k=>k+':'+headers[k]+'\n').join('')+'\n'+signed+'\n'+payload;
  const scope=day+'/auto/s3/aws4_request';
  const keyBytes=hmac(hmac(hmac(hmac('AWS4'+config.R2_SECRET_ACCESS_KEY,day),'auto'),'s3'),'aws4_request');
  const signature=createHmac('sha256',keyBytes).update('AWS4-HMAC-SHA256\n'+date+'\n'+scope+'\n'+sha(request)).digest('hex');keyBytes.fill(0);
  return fetch('https://'+host+uri,{method,headers:{...headers,Authorization:'AWS4-HMAC-SHA256 Credential='+config.R2_ACCESS_KEY_ID+'/'+scope+', SignedHeaders='+signed+', Signature='+signature},body:body?new Uint8Array(body):undefined,redirect:'error',signal:AbortSignal.timeout(30000)});
}
async function backup(){
  const phase=await read(state+'/premium-cutover.json'),prepared=await read(directory+'/premium-retirement-review.json');
  assert.equal(phase.phase,'verified-local');assert.equal(prepared.project,project);
  const config=await read(state+'/web-runtime.secret.json'),environment=parseEnv(await fs.readFile('.env.local','utf8'));
  await privateBucket(config,environment);
  const envelope=await fs.readFile(prepared.encryptedArtifact);assert.equal(sha(envelope),prepared.encryptedSha256);
  const key='operations/postgres-backups/premium/2026-10-17-'+prepared.encryptedSha256+'.galxbackup';
  const record={observedAt:new Date().toISOString(),project,encryptedSha256:sha(envelope),bytes:envelope.length,bucket:config.R2_PRIVATE_IMAGES_BUCKET_NAME,key,bucketPrivate:true,uploaded:false,offDeviceRecoveryVerified:false,hostedProjectDeleted:false};
  const head=await objectRequest(config,key,'HEAD');assert([200,404].includes(head.status),'Unexpected recovery-object status.');
  if(head.status===404){await save(receiptFile,{...record,phase:'upload-submitted'});const upload=await objectRequest(config,key,'PUT',envelope);assert(upload.ok,'Upload unconfirmed; inspect the retained object before retrying.');}
  const response=await objectRequest(config,key,'GET');assert(response.ok,'Recovery download failed.');
  const downloaded=Buffer.from(await response.arrayBuffer());assert.equal(sha(downloaded),prepared.encryptedSha256);
  record.uploaded=true;record.downloadHash='match';await save(receiptFile,{...record,phase:'download-verified'});
  const split=downloaded.indexOf(10);assert(split>0&&split<8192);
  const header=JSON.parse(downloaded.subarray(0,split)),{tag,...metadata}=header;
  assert.equal(header.database,'galx_relay_premium');assert.equal(header.algorithm,'aes-256-gcm');assert.equal(header.kdf,'hkdf-sha256');assert.equal(header.purpose,'galx-postgres-offdevice-backup-v1');
  const encryptionKey=Buffer.from(hkdfSync('sha256',Buffer.from(config.GALX_VAULT_KEY_V1),Buffer.from(header.salt,'base64'),Buffer.from(header.purpose),32));
  const cipher=createDecipheriv('aes-256-gcm',encryptionKey,Buffer.from(header.iv,'base64'));cipher.setAAD(Buffer.from(JSON.stringify(metadata)));cipher.setAuthTag(Buffer.from(tag,'base64'));
  const plain=Buffer.concat([cipher.update(downloaded.subarray(split+1)),cipher.final()]);encryptionKey.fill(0);assert.equal(sha(plain),header.plainSha256);
  const archive=path.resolve(directory,'premium-downloaded-recovery.dump');await fs.writeFile(archive,plain,{mode:0o600});await fs.chmod(archive,0o600);plain.fill(0);
  const source=await read((await read('.data/local-postgres/premium/latest-source.json')).path+'/manifest.json');
  const database='galx_offdevice_check_'+randomBytes(8).toString('hex'),host=path.resolve('.data/local-postgres/premium/socket');
  const admin=new pg.Client({host,port:55433,user:os.userInfo().username,database:'postgres'});let created=false;
  await admin.connect();
  try{
    await admin.query('CREATE DATABASE "'+database+'" TEMPLATE template0');created=true;
    await admin.query('REVOKE ALL ON DATABASE "'+database+'" FROM PUBLIC');
    await run('/opt/homebrew/opt/postgresql@17/bin/pg_restore',['--dbname',database,'--exit-on-error','--single-transaction',archive],{PGHOST:host,PGPORT:'55433',PGUSER:os.userInfo().username,PGSSLMODE:'disable'});
    const client=new pg.Client({host,port:55433,user:os.userInfo().username,database});await client.connect();
    try{const actual=await localPostgresTableManifest(client,source.included);assert.deepEqual(actual.map(({acl,...row})=>row),source.tables.map(({acl,...row})=>row));record.restoredTables=actual.length;record.rowHashesOwnersRls='match';}
    finally{await client.end();}
  }finally{if(created)await admin.query('DROP DATABASE "'+database+'"');await admin.end();}
  record.offDeviceRecoveryVerified=true;record.decryptionHash='match';record.phase='recovery-verified';record.verifiedAt=new Date().toISOString();await save(receiptFile,record);
  console.log(JSON.stringify({uploaded:true,bucketPrivate:true,downloadHash:'match',restoredTables:record.restoredTables,offDeviceRecoveryVerified:true,hostedProjectDeleted:false}));
}
async function retire(){
  assert.equal(process.argv[3],'--approved-project');assert.equal(process.argv[4],project);assert.equal(process.argv.length,5);
  const receipt=await read(receiptFile);assert.equal(receipt.project,project);assert(receipt.bucketPrivate&&receipt.uploaded&&receipt.offDeviceRecoveryVerified&&receipt.restoredTables===30);
  assert(Date.now()-Date.parse(receipt.verifiedAt)<3600000,'Recovery evidence is stale.');
  const phase=await read(state+'/premium-cutover.json');assert.equal(phase.phase,'verified-local');assert(phase.oldSourceWriterFenced);
  const config=await read('.relay/service-deployment/components/premium-runtime.json');assert.equal(config.databaseDeployment,'native-postgres-v1');
  await run(process.execPath,['scripts/relay-local.mjs','verify']);
  const retained=await read(state+'/premium-runtime-hosted.secret.json');
  const source=new pg.Client({...await localPostgresSource('premium'),ssl:{rejectUnauthorized:true,ca:retained.databaseCa}});await source.connect();
  try{await source.query('SET ROLE postgres');const row=(await source.query("SELECT NOT rolcanlogin fenced,(SELECT count(*)::int FROM pg_stat_activity WHERE usename='galx_execution_service') connections,(SELECT count(*)::int FROM auth.users) users FROM pg_roles WHERE rolname='galx_execution_service'")).rows[0];assert(row.fenced&&row.connections===0&&row.users===0);}
  finally{await source.end();}
  const token=(await fs.readFile(state+'/management-token.secret','utf8')).trim();
  const api=async(method,endpoint)=>fetch('https://api.supabase.com/v1'+endpoint,{method,headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});
  const list=await api('GET','/projects');assert(list.ok);const before=await list.json();
  const target=before.find(p=>(p.ref||p.id)===project);assert.equal(target?.name,'GALX Relay Premium');assert(before.some(p=>(p.ref||p.id)===central));
  const deletionFile=directory+'/premium-hosted-retirement.json';
  try{await fs.access(deletionFile);throw Error('A deletion receipt already exists; inspect it instead of resubmitting.');}catch(error){if(error.code!=='ENOENT')throw error;}
  const deletion={project,name:target.name,authorized:true,phase:'deletion-submitted',submittedAt:new Date().toISOString(),recoverySha256:receipt.encryptedSha256};await save(deletionFile,deletion);
  const response=await api('DELETE','/projects/'+project);deletion.responseStatus=response.status;await save(deletionFile,deletion);assert.equal(response.status,200,'Deletion is unconfirmed; inspect before any further mutation.');
  const afterResponse=await api('GET','/projects');assert(afterResponse.ok);const after=await afterResponse.json();
  assert(!after.some(p=>(p.ref||p.id)===project),'Project removal is not yet confirmed.');assert(after.some(p=>(p.ref||p.id)===central),'Central identity must remain present.');
  deletion.phase='deleted-verified';deletion.verifiedAt=new Date().toISOString();deletion.centralRetained=true;await save(deletionFile,deletion);
  await save(state+'/premium-cutover.json',{...phase,hostedProjectRetired:true,hostedRetiredAt:deletion.verifiedAt});
  console.log(JSON.stringify({premiumHostedProjectDeleted:true,centralHostedProjectRetained:true,localPremiumDatabaseRetained:true}));
}
try{if(process.argv[2]==='backup'&&process.argv.length===3)await backup();else if(process.argv[2]==='retire')await retire();else throw Error('Use backup or retire --approved-project <exact approved Premium project>.');}
catch(error){await fs.writeFile(directory+'/retirement-error.secret.log',String(error.stderr||error.message),{mode:0o600});console.error('Premium retirement stopped. Inspect private phase/error evidence; no automatic retry was made.');process.exitCode=1;}
