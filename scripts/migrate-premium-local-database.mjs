/** Explicitly scoped Premium migration inspection. No ambient DB fallback. */
import fs from 'node:fs/promises';
import pg from 'pg';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { localPostgresSource,snapshotLocalPostgresSource,restoreLocalPostgres,verifyLocalPostgres } from './local-postgres.mjs';
const state='.data/postgres-cutover';
const write=async(file,value)=>{await fs.writeFile(`${state}/${file}`,JSON.stringify(value,null,2),{mode:0o600});await fs.chmod(`${state}/${file}`,0o600);};
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const root=process.cwd();
const run=(bin,args,input,timeout=120000)=>new Promise((resolve,reject)=>{
 const child=execFile(bin,args,{encoding:'utf8',timeout,maxBuffer:2097152},(error,stdout,stderr)=>{
  if(error){error.stderr=stderr;reject(error);}else resolve(stdout.trim());
 });
 child.stdin.on('error',()=>{});child.stdin.end(input);
});
const docker=(args,timeout)=>run('docker',['--context','colima-premium',...args],undefined,timeout);
const phaseFile=state+'/premium-cutover.json',runtimeFile='.relay/service-deployment/components/premium-runtime.json',imagesFile='docker/relay-pools/local/images.json';
const hash=value=>createHash('sha256').update(value).digest('hex');
const current=async()=>JSON.parse(await docker(['inspect','galx-premium-relay-1']));
const save=async value=>write('premium-cutover.json',{...value,updatedAt:new Date().toISOString()});
async function sourceClient(callback){
 const retained=await read(state+'/premium-runtime-hosted.secret.json');
 if(!retained.databaseCa||!retained.databaseUrl.includes('prgjcyokylzcsqrjmkaa'))throw Error('Original hosted TLS identity is missing.');
 const c=new pg.Client({...await localPostgresSource('premium'),ssl:{rejectUnauthorized:true,ca:retained.databaseCa},connectionTimeoutMillis:10000});
 await c.connect();try{await c.query('SET ROLE postgres');return await callback(c);}finally{await c.end();}
}
async function guest(args,input){
 const file=path.resolve(state,'premium-ssh.secret.conf');
 const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
 return run('ssh',['-F',file,'-T','-o','ConnectTimeout=8','colima-premium',args.map(quote).join(' ')],input);
}
try{
 const action=process.argv[2];
 if(action==='drain'){
  try{await fs.access(phaseFile);throw Error('Existing cutover state requires inspection.');}catch(error){if(error.code!=='ENOENT')throw error;}
  const inspection=await read(state+'/premium-source-inspection.json'),transport=await read(state+'/premium-database-transport.json');
  if(inspection.authUsers!==0||inspection.activeScheduledJobs!==0||!inspection.serviceLoginFenceDryRun||Date.now()-Date.parse(inspection.observedAt)>30*60000||!transport.ownDatabaseTls||!transport.centralDatabaseDenied)throw Error('Independent Premium prerequisites are not accepted.');
  const manifest=await read(imagesFile),old=manifest.images.find(v=>v.component==='runtime'&&v.pool==='premium');
  const candidate=JSON.parse(await docker(['image','inspect','galxai-relay-premium:native-postgres-20261017']))[0];
  const running=(await current())[0];
  if(running.Image!==old.id||candidate.Architecture!=='arm64'||running.Config.Labels?.['io.galx.component']!=='runtime'||running.Config.Labels?.['io.galx.pool']!=='premium')throw Error('Premium image or ownership differs.');
  const component=await fs.readFile(runtimeFile,'utf8');if(JSON.parse(component).databaseDeployment)throw Error('Premium is already selecting another placement.');
  await fs.copyFile(runtimeFile,state+'/premium-runtime-hosted.secret.json');await fs.chmod(state+'/premium-runtime-hosted.secret.json',0o600);
  await write('premium-images-before.json',manifest);
  const agent=path.join(os.homedir(),'Library/LaunchAgents/ai.galx.relay-local.plist');
  await run('/bin/launchctl',['print',`gui/${os.userInfo().uid}/ai.galx.relay-local`]);
  const record={phase:'draining',startedAt:new Date().toISOString(),oldContainerId:running.Id,oldImage:old.id,candidateImage:candidate.Id,sourceConfigSha256:hash(component),sourceImagesSha256:hash(await fs.readFile(imagesFile)),supervisorAgent:agent};
  await save(record);
  await run('/bin/launchctl',['bootout',`gui/${os.userInfo().uid}`,agent]);
  console.log('Premium restart supervisor suspended; draining only its execution runtime.');
  await docker(['stop','--time','480','galx-premium-relay-1'],510000);
  const stopped=(await current())[0];
  if(stopped.Id!==running.Id||stopped.State.Running||stopped.State.ExitCode!==0||stopped.State.OOMKilled)throw Error('Premium drain was not a clean stop; preserve uncertain work.');
  await save({...record,phase:'drained',cleanExit:true});console.log('Premium stopped cleanly; existing queue/volume retained.');
 }else if(action==='fence'){
  const p=await read(phaseFile),stopped=(await current())[0];
  if(p.phase!=='drained'||stopped.Id!==p.oldContainerId||stopped.State.Running)throw Error('A confirmed drained runtime is required.');
  await sourceClient(async c=>{
   await c.query('ALTER ROLE galx_execution_service NOLOGIN');
   // Retire idle server connections retained by the hosted pooler after its
   // sole application runtime disconnected. No active runtime is terminated.
   await c.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename='galx_execution_service' AND pid<>pg_backend_pid()");
   const result=await c.query("SELECT NOT rolcanlogin fenced,(SELECT count(*)::int FROM pg_stat_activity WHERE usename='galx_execution_service') connections FROM pg_roles WHERE rolname='galx_execution_service'");
   if(!result.rows[0]?.fenced||result.rows[0]?.connections!==0)throw Error('The source service writer is not fenced.');
  });
  await save({...p,phase:'fenced',sourceServiceLogin:false,sourceServiceConnections:0});console.log('Hosted Premium execution login disabled; no execution writer remains there.');
 }else if(action==='copy'){
  const p=await read(phaseFile);if(p.phase!=='fenced')throw Error('Copy requires the fenced source phase.');
  await sourceClient(async c=>{if((await c.query("SELECT rolcanlogin FROM pg_roles WHERE rolname='galx_execution_service'")).rows[0]?.rolcanlogin!==false)throw Error('Source fence changed.');});
  await snapshotLocalPostgresSource('premium');
  const latest=await read('.data/local-postgres/premium/latest-source.json');
  const local=new pg.Client({host:path.resolve('.data/local-postgres/premium/socket'),port:55433,user:os.userInfo().username,database:'postgres'});
  await local.connect();let archived;
  try{
   if(Number((await local.query("SELECT count(*) FROM pg_stat_activity WHERE datname='galx_relay_premium'")).rows[0].count)!==0)throw Error('The preparation copy still has connected clients.');
   archived='galx_relay_premium_preparation_'+Date.now();
   await save({...p,phase:'copying',finalSource:latest.path,retainedPreparationDatabase:archived});
   await local.query('ALTER DATABASE galx_relay_premium RENAME TO "'+archived+'"');
  }finally{await local.end();}
  await restoreLocalPostgres('premium');await verifyLocalPostgres('premium');
  await run(process.execPath,['scripts/local-postgres.mjs','audit','premium']);
  await run(process.execPath,['scripts/stage-local-relay-databases.mjs','prepare']);
  await run(process.execPath,['scripts/stage-local-relay-databases.mjs','vm-transport']);
  await save({...p,phase:'copied',finalSource:latest.path,retainedPreparationDatabase:archived,sourceHashVerified:true,restrictedRoleAudit:true,finalTlsTransport:true});
  console.log('Fresh fenced source restored and verified; preparation database retained separately.');
 }else if(action==='activate'){
  const p=await read(phaseFile);if(!['copied','activation-started'].includes(p.phase))throw Error('Activation requires the verified fresh copy or its interrupted configuration delivery.');
  const candidate=await fs.readFile(state+'/premium-runtime-native.secret.json','utf8');
  const existingConfigHash=hash(await fs.readFile(runtimeFile));
  if(![p.sourceConfigSha256,hash(candidate)].includes(existingConfigHash))throw Error('The component configuration changed during migration.');
  const existingManifest=await read(imagesFile),expectedManifest=await read(state+'/premium-images-before.json');
  const expectedRow=expectedManifest.images.find(v=>v.component==='runtime'&&v.pool==='premium');
  expectedRow.tag='galxai-relay-premium:native-postgres-20261017';expectedRow.id=p.candidateImage;expectedRow.architecture='arm64';
  if(hash(await fs.readFile(imagesFile))!==p.sourceImagesSha256&&JSON.stringify(existingManifest)!==JSON.stringify(expectedManifest))throw Error('The release manifest changed during migration.');
  const existing=(await current())[0];
  if(existing.State.Running&&existing.Image!==p.candidateImage)throw Error('An unexpected runtime resumed during migration.');
  await save({...p,phase:'activation-started'});
  await guest(['sudo','-n','install','-m','0600','-o','1000','-g','1000','/dev/stdin','/opt/galx/config/runtime.json'],candidate);
  await fs.writeFile(runtimeFile,candidate,{mode:0o600});
  const manifest=await read(imagesFile),row=manifest.images.find(v=>v.component==='runtime'&&v.pool==='premium');
  row.tag='galxai-relay-premium:native-postgres-20261017';row.id=p.candidateImage;row.architecture='arm64';
  await fs.writeFile(imagesFile,JSON.stringify(manifest,null,2)+'\n');
  console.log('Starting the reviewed native-database runtime through the existing ownership handoff.');
  await run(process.execPath,['scripts/relay-local.mjs','up'],undefined,240000);
  const running=(await current())[0];if(!running.State.Running||running.Image!==p.candidateImage)throw Error('Native Premium runtime not confirmed.');
  await save({...p,phase:'local-running',newContainerId:running.Id,localStartedAt:new Date().toISOString()});
  await run('/bin/launchctl',['bootstrap',`gui/${os.userInfo().uid}`,p.supervisorAgent]);
  console.log('Premium is running against local PostgreSQL; its restart supervisor is restored.');
 }else if(action==='verify'){
  const p=await read(phaseFile);if(p.phase!=='local-running')throw Error('Local running phase required.');
  const result=await run(process.execPath,['scripts/relay-local.mjs','verify'],undefined,240000);console.log(result);
  await sourceClient(async c=>{
   const row=(await c.query("SELECT NOT rolcanlogin fenced,(SELECT count(*)::int FROM pg_stat_activity WHERE usename='galx_execution_service') connections FROM pg_roles WHERE rolname='galx_execution_service'")).rows[0];
   if(!row?.fenced||row.connections!==0)throw Error('Hosted execution writer resumed.');
  });
  await save({...p,phase:'verified-local',runtimeTlsAndMonitorVerified:true,oldSourceWriterFenced:true,hostedProjectRetired:false});
  console.log('Local Premium runtime, monitor, database TLS and source writer retirement verified.');
 }else if(action==='inspect'){
 const source=await localPostgresSource('premium'),client=new pg.Client({...source,connectionTimeoutMillis:10000});
 await client.connect();
 try{
  await client.query('SET ROLE postgres');
  await client.query('BEGIN READ ONLY');
  const users=Number((await client.query('SELECT count(*) FROM auth.users')).rows[0].count);
  const roles=(await client.query("SELECT rolname,rolcanlogin FROM pg_roles WHERE rolname IN ('galx_execution_service','postgres') ORDER BY 1")).rows;
  const connections=(await client.query("SELECT usename,count(*)::int connections FROM pg_stat_activity WHERE datname=current_database() AND backend_type='client backend' AND pid<>pg_backend_pid() GROUP BY 1 ORDER BY 1")).rows;
  const cron=await client.query("SELECT to_regclass('cron.job') IS NOT NULL present");
  const scheduled=cron.rows[0].present?Number((await client.query('SELECT count(*) FROM cron.job WHERE active')).rows[0].count):0;
  const columns=(await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='private' AND table_name='relay_executions' ORDER BY ordinal_position")).rows.map(v=>v.column_name);
  const executionRows=Number((await client.query('SELECT count(*) FROM private.relay_executions')).rows[0].count);
  await client.query('COMMIT');
  // This temporary role change is not visible to other sessions and is rolled
  // back. It checks whether the existing owner can fence its own service login.
  let canFence=false;
  await client.query('BEGIN');
  try{await client.query('ALTER ROLE galx_execution_service NOLOGIN');canFence=true;}catch{}
  finally{await client.query('ROLLBACK');}
  const result={observedAt:new Date().toISOString(),project:'prgjcyokylzcsqrjmkaa',authUsers:users,activeScheduledJobs:scheduled,roles,connections,executionRows,executionColumns:columns,serviceLoginFenceDryRun:canFence,sourceDataChanged:false};
  await write('premium-source-inspection.json',result);console.log(JSON.stringify(result));
 }finally{await client.end();}
 }else throw Error('Use inspect, drain, fence, copy, activate or verify.');
}catch(error){await fs.writeFile(`${state}/premium-inspection-error.secret.log`,String(error.stderr||error.message),{mode:0o600});console.error('Premium operation failed; inspect the private error log and recorded phase before continuing.');process.exitCode=1;}
