/** Consistent native snapshot, authenticated encryption, private upload and download/restore proof. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parseEnv,promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createHash,createHmac,createCipheriv,createDecipheriv,hkdfSync,randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import { localPostgresTableManifest } from './local-postgres.mjs';
const state='.data/postgres-cutover',exec=promisify(execFile),schemas=['public','private','auth','galx_account_auth','supabase_migrations','extensions'];
const save=async(file,value)=>{await fs.writeFile(file,JSON.stringify(value,null,2),{mode:0o600});await fs.chmod(file,0o600);};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),hmac=(key,value)=>createHmac('sha256',key).update(value).digest();
const run=async(bin,args,environment)=>(await exec(bin,args,{env:{PATH:process.env.PATH,HOME:os.homedir(),LANG:'en_US.UTF-8',...environment},timeout:180000,maxBuffer:2097152})).stdout;
async function objectRequest(config,key,method,body){
 const host=config.R2_ACCOUNT_ID+'.r2.cloudflarestorage.com',uri='/'+encodeURIComponent(config.R2_PRIVATE_IMAGES_BUCKET_NAME)+'/'+key.split('/').map(encodeURIComponent).join('/');
 const date=new Date().toISOString().replace(/[:-]|\.\d{3}/g,''),day=date.slice(0,8),payload=sha(body||Buffer.alloc(0));
 const headers={host,'x-amz-date':date,'x-amz-content-sha256':payload};if(body)Object.assign(headers,{'content-type':'application/octet-stream','cache-control':'private, no-store','if-none-match':'*'});
 const names=Object.keys(headers).sort(),signed=names.join(';'),request=method+'\n'+uri+'\n\n'+names.map(k=>k+':'+headers[k]+'\n').join('')+'\n'+signed+'\n'+payload,scope=day+'/auto/s3/aws4_request';
 const signing=hmac(hmac(hmac(hmac('AWS4'+config.R2_SECRET_ACCESS_KEY,day),'auto'),'s3'),'aws4_request');
 const signature=createHmac('sha256',signing).update('AWS4-HMAC-SHA256\n'+date+'\n'+scope+'\n'+sha(request)).digest('hex');signing.fill(0);
 return fetch('https://'+host+uri,{method,headers:{...headers,Authorization:'AWS4-HMAC-SHA256 Credential='+config.R2_ACCESS_KEY_ID+'/'+scope+', SignedHeaders='+signed+', Signature='+signature},body:body?new Uint8Array(body):undefined,redirect:'error',signal:AbortSignal.timeout(30000)});
}
async function verifyRestore(archive,manifest,host,port,user,env){
 const checkDatabase='galx_offdevice_'+randomBytes(8).toString('hex'),admin=new pg.Client({host,port,user,database:'postgres'});await admin.connect();let created=false;
 try{
  await admin.query('CREATE DATABASE "'+checkDatabase+'" TEMPLATE template0');created=true;await admin.query('REVOKE ALL ON DATABASE "'+checkDatabase+'" FROM PUBLIC');
  const empty=new pg.Client({host,port,user,database:checkDatabase});await empty.connect();
  try{
   assert.equal(Number((await empty.query("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'")).rows[0].count),0);await empty.query('DROP SCHEMA public');
   await empty.query('CREATE SCHEMA extensions AUTHORIZATION postgres');
   for(const extension of ['pgcrypto','uuid-ossp','vector'])await empty.query('CREATE EXTENSION "'+extension+'" WITH SCHEMA extensions');
  }finally{await empty.end();}
  const toc=await run('/opt/homebrew/opt/postgresql@17/bin/pg_restore',['--list',archive],env),list=archive+'.restore.list';
  await fs.writeFile(list,toc.split('\n').filter(line=>!/; \d+ \d+ SCHEMA - extensions /.test(line)).join('\n'),{mode:0o600});
  await run('/opt/homebrew/opt/postgresql@17/bin/pg_restore',['--dbname',checkDatabase,'--exit-on-error','--single-transaction','--use-list',list,archive],env);
  const check=new pg.Client({host,port,user,database:checkDatabase});await check.connect();
  try{
   const actual=await localPostgresTableManifest(check,manifest.schemas),defaults=Object.fromEntries((await check.query("SELECT rolname,acldefault('r',oid)::text acl FROM pg_roles")).rows.map(r=>[r.rolname,r.acl]));
   const canonical=rows=>rows.map(t=>({...t,acl:pg.types.getTypeParser(1009)(t.acl||defaults[t.owner]).sort()}));assert.deepEqual(canonical(actual),canonical(manifest.tables));
  }finally{await check.end();}
 }finally{if(created)await admin.query('DROP DATABASE "'+checkDatabase+'"');await admin.end();}
}
async function recover(name,directory){
 assert.equal(name,'central');assert.equal(process.argv.length,5);assert(path.resolve(directory).startsWith(path.resolve(state,'recovery')+'/central-'));
 const receiptFile=directory+'/receipt.json',receipt=JSON.parse(await fs.readFile(receiptFile,'utf8')),manifest=JSON.parse(await fs.readFile(directory+'/manifest.json','utf8'));
 assert.equal(receipt.phase,'upload-submitted');assert.equal(receipt.database,'galxai');assert.equal(receipt.encryptedSha256,manifest.encryptedSha256);
 const config=JSON.parse(await fs.readFile(state+'/web-runtime.secret.json','utf8')),response=await objectRequest(config,receipt.key,'GET');assert(response.ok);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(sha(bytes),receipt.encryptedSha256);
 const split=bytes.indexOf(10),{tag,...metadata}=JSON.parse(bytes.subarray(0,split));assert.equal(metadata.database,'galxai');assert.equal(metadata.purpose,'galx-postgres-offdevice-backup-v1');assert.equal(metadata.algorithm,'aes-256-gcm');assert.equal(metadata.kdf,'hkdf-sha256');
 const key=Buffer.from(hkdfSync('sha256',Buffer.from(config.GALX_VAULT_KEY_V1),Buffer.from(metadata.salt,'base64'),Buffer.from(metadata.purpose),32));
 const decrypt=createDecipheriv('aes-256-gcm',key,Buffer.from(metadata.iv,'base64'));decrypt.setAAD(Buffer.from(JSON.stringify(metadata)));decrypt.setAuthTag(Buffer.from(tag,'base64'));const plain=Buffer.concat([decrypt.update(bytes.subarray(split+1)),decrypt.final()]);key.fill(0);assert.equal(sha(plain),metadata.plainSha256);
 const archive=path.resolve(directory,'downloaded.dump');await fs.writeFile(archive,plain,{mode:0o600});plain.fill(0);
 const host=path.resolve('.data/local-postgres/central/socket'),port=55432,user=os.userInfo().username,env={PGHOST:host,PGPORT:String(port),PGUSER:user,PGSSLMODE:'disable'};
 await verifyRestore(archive,manifest,host,port,user,env);
 const manifestBytes=Buffer.from(JSON.stringify(manifest)),manifestKey=receipt.key+'.manifest.json',head=await objectRequest(config,manifestKey,'HEAD');assert.equal(head.status,404);const upload=await objectRequest(config,manifestKey,'PUT',manifestBytes);assert(upload.ok);const readback=await objectRequest(config,manifestKey,'GET');assert(readback.ok);assert.equal(sha(Buffer.from(await readback.arrayBuffer())),sha(manifestBytes));
 Object.assign(receipt,{phase:'recovery-verified',verifiedAt:new Date().toISOString(),uploaded:true,downloadHash:'match',decryptionHash:'match',restoredTables:manifest.tables.length,rows:manifest.tables.reduce((n,t)=>n+Number(t.rows),0),tableHashesOwnersEffectiveAclsRls:'match',offDeviceRecoveryVerified:true,roleGrantRecipeUploaded:true,manifestKey,keyRecovery:'Unchanged vault v1 seed retained in external production configuration; do not retire that key-recovery source.',limits:manifest.limits,restorePrerequisites:['pgcrypto','uuid-ossp','vector'],priorRestoreFailures:'The explicit-schema archive required removal of the empty default public schema and preinstallation of extension dependencies. Only disposable restore targets were changed; the exact uploaded object was reused.'});await save(receiptFile,receipt);await save(state+'/'+name+'-offdevice-recovery.json',{receipt:receiptFile,...receipt});
 console.log(JSON.stringify({database:'galxai',offDeviceRecoveryVerified:true,restoredTables:manifest.tables.length,hashesOwnersEffectiveAclsRls:'match',privateRoleGrantRecipeUploaded:true,existingObjectReused:true,hostedDeletionPerformed:false}));
}
try{
 const name=process.argv[2];assert(['central','premium'].includes(name));
 if(process.argv[3]==='recover'){await recover(name,process.argv[4]);}else{
 assert.equal(process.argv.length,3);
 const database=name==='central'?'galxai':'galx_relay_premium',port=name==='central'?55432:55433;
 if(name==='central')assert.equal(JSON.parse(await fs.readFile(state+'/phase.json','utf8')).state,'central-local-authority');
 const directory=state+'/recovery/'+name+'-'+new Date().toISOString().replaceAll(/[:.]/g,'-');await fs.mkdir(directory,{recursive:true,mode:0o700});
 const receiptFile=directory+'/receipt.json',host=path.resolve('.data/local-postgres/'+name+'/socket'),user=os.userInfo().username;
 const env={PGHOST:host,PGPORT:String(port),PGUSER:user,PGSSLMODE:'disable'},archive=path.resolve(directory,'database.dump');
 const config=JSON.parse(await fs.readFile(state+'/web-runtime.secret.json','utf8')),environment=parseEnv(await fs.readFile('.env.local','utf8'));assert(config.GALX_VAULT_KEY_V1);
 for(const kind of ['managed','custom']){
  const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+config.R2_ACCOUNT_ID+'/r2/buckets/'+config.R2_PRIVATE_IMAGES_BUCKET_NAME+'/domains/'+kind,{headers:{Authorization:'Bearer '+environment.CLOUDFLARE_API_TOKEN},signal:AbortSignal.timeout(15000)});
  const value=await response.json();assert(response.ok&&value.success);if(kind==='managed')assert.equal(value.result.enabled,false);else assert.equal(value.result.domains.length,0);
 }
 const source=new pg.Client({host,port,user,database});await source.connect();let tables,roles,memberships;
 try{
  await source.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;SET LOCAL timezone='UTC';SET LOCAL statement_timeout='120s'");
  const snapshot=(await source.query('SELECT pg_export_snapshot() id')).rows[0].id;
  await run('/opt/homebrew/opt/postgresql@17/bin/pg_dump',['--format=custom','--file',archive,'--snapshot',snapshot,'--dbname',database,'--lock-wait-timeout=10s',...schemas.flatMap(s=>['--schema',s])],env);await fs.chmod(archive,0o600);
  tables=await localPostgresTableManifest(source,schemas);
  roles=(await source.query("SELECT rolname,rolinherit,rolbypassrls FROM pg_roles WHERE rolname !~ '^pg_' ORDER BY 1")).rows;
  memberships=(await source.query("SELECT member::regrole::text member,roleid::regrole::text role,inherit_option,set_option FROM pg_auth_members ORDER BY 1,2")).rows;
  await source.query('COMMIT');
 }finally{await source.end();}
 const plain=await fs.readFile(archive),salt=randomBytes(32),iv=randomBytes(12),purpose='galx-postgres-offdevice-backup-v1';
 const key=Buffer.from(hkdfSync('sha256',Buffer.from(config.GALX_VAULT_KEY_V1),salt,Buffer.from(purpose),32));
 const metadata={version:1,algorithm:'aes-256-gcm',kdf:'hkdf-sha256',purpose,salt:salt.toString('base64'),iv:iv.toString('base64'),database,plainSha256:sha(plain)};
 const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(JSON.stringify(metadata)));const ciphertext=Buffer.concat([cipher.update(plain),cipher.final()]);plain.fill(0);
 const envelope=Buffer.concat([Buffer.from(JSON.stringify({...metadata,tag:cipher.getAuthTag().toString('base64')})+'\n'),ciphertext]);await fs.writeFile(directory+'/database.galxbackup',envelope,{mode:0o600});
 // Keep the nonsecret role/grant recipe beside the encrypted dump for a new machine.
 const manifest={database,schemas,tables,roles,memberships,encryptedSha256:sha(envelope),limits:'Database and nonsecret role/grant recipe only. Passwords, service configuration, queues, VM disks and cryptographic recovery seed are separate.'};await save(directory+'/manifest.json',manifest);
 const object='operations/postgres-backups/'+name+'/'+path.basename(directory)+'-'+sha(envelope)+'.galxbackup';
 const receipt={phase:'upload-submitted',observedAt:new Date().toISOString(),database,encryptedSha256:sha(envelope),bucketPrivate:true,key:object,uploaded:false,offDeviceRecoveryVerified:false};await save(receiptFile,receipt);
 const upload=await objectRequest(config,object,'PUT',envelope);assert(upload.ok,'Upload result is unconfirmed; inspect the receipt/object before retrying.');
 const downloaded=await objectRequest(config,object,'GET');assert(downloaded.ok);const bytes=Buffer.from(await downloaded.arrayBuffer());assert.equal(sha(bytes),sha(envelope));
 const split=bytes.indexOf(10),{tag,...stored}=JSON.parse(bytes.subarray(0,split));assert.deepEqual(stored,metadata);
 const decrypt=createDecipheriv('aes-256-gcm',key,Buffer.from(stored.iv,'base64'));decrypt.setAAD(Buffer.from(JSON.stringify(stored)));decrypt.setAuthTag(Buffer.from(tag,'base64'));const recovered=Buffer.concat([decrypt.update(bytes.subarray(split+1)),decrypt.final()]);key.fill(0);assert.equal(sha(recovered),metadata.plainSha256);
 const downloadArchive=path.resolve(directory,'downloaded.dump');await fs.writeFile(downloadArchive,recovered,{mode:0o600});recovered.fill(0);
 await verifyRestore(downloadArchive,manifest,host,port,user,env);
 // Private companion manifest contains no passwords; upload and read it back too.
 const manifestBytes=Buffer.from(JSON.stringify(manifest)),manifestKey=object+'.manifest.json';const manifestUpload=await objectRequest(config,manifestKey,'PUT',manifestBytes);assert(manifestUpload.ok);const manifestDownload=await objectRequest(config,manifestKey,'GET');assert(manifestDownload.ok);assert.equal(sha(Buffer.from(await manifestDownload.arrayBuffer())),sha(manifestBytes));
 Object.assign(receipt,{phase:'recovery-verified',verifiedAt:new Date().toISOString(),uploaded:true,downloadHash:'match',decryptionHash:'match',restoredTables:tables.length,rows:tables.reduce((n,t)=>n+Number(t.rows),0),tableHashesOwnersEffectiveAclsRls:'match',offDeviceRecoveryVerified:true,roleGrantRecipeUploaded:true,manifestKey,keyRecovery:'Unchanged vault v1 seed retained in external production configuration; do not retire that key-recovery source.',limits:manifest.limits});await save(receiptFile,receipt);await save(state+'/'+name+'-offdevice-recovery.json',{receipt:receiptFile,...receipt});
 console.log(JSON.stringify({database,offDeviceRecoveryVerified:true,restoredTables:tables.length,hashesOwnersEffectiveAclsRls:'match',privateRoleGrantRecipeUploaded:true,hostedDeletionPerformed:false}));
 }
}catch(error){await fs.writeFile(state+'/offdevice-backup-error.secret.log',String(error.stderr||error.stack||error.message),{mode:0o600});console.error('Off-device backup stopped; inspect the private phase/error and object before repeating any upload.');process.exitCode=1;}
