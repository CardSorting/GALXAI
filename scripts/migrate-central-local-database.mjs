/** Explicit final central migration. Private receipts; no DNS or hosted deletion. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parseEnv } from 'node:util';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import { localPostgresSource,snapshotLocalPostgresSource,restoreLocalPostgres,verifyLocalPostgres,localPostgresTableManifest } from './local-postgres.mjs';
import { accountProviderEnvironment } from './lib/account-providers.mjs';

const state='.data/postgres-cutover',phaseFile=state+'/central-cutover.json';
const imagesFile='docker/relay-pools/local/images.json',componentFile='.relay/service-deployment/components/central.json';
const yamlFile='docker/relay-pools/local/central.yaml',candidateTag='galxai-relay-central:native-postgres-20261017';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const write=async(file,value)=>{await fs.writeFile(file,JSON.stringify(value,null,2)+'\n',{mode:0o600});await fs.chmod(file,0o600);};
const save=async value=>write(phaseFile,{...value,updatedAt:new Date().toISOString()});
const run=(bin,args,timeout=120000,includeStderr=false)=>new Promise((resolve,reject)=>{
 execFile(bin,args,{encoding:'utf8',timeout,maxBuffer:2097152},(error,stdout,stderr)=>{
  if(error){error.privateOutput=stderr+'\n'+stdout;reject(error);}else resolve((stdout+(includeStderr?'\n'+stderr:'')).trim());
 });
});
const command=async(args,timeout)=>{const output=await run(process.execPath,args,timeout);console.log(output);};
const docker=(context,args,timeout)=>run('docker',['--context',context,...args],timeout);
const inspect=async(context,name)=>JSON.parse(await docker(context,['inspect',name]))[0];
async function source(callback){
 let sourceEnv;try{sourceEnv=await fs.readFile(state+'/central-source.secret.env','utf8');}catch(error){if(error.code!=='ENOENT')throw error;sourceEnv=await fs.readFile('.env.local','utf8');}
 const env=parseEnv(sourceEnv);
 const previous=process.env.DATABASE_URL;process.env.DATABASE_URL=env.DATABASE_URL;
 let config;try{config=await localPostgresSource('central');}finally{if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;}
 const client=new pg.Client({...config,connectionTimeoutMillis:10000,application_name:'galx-final-central-cutover'});await client.connect();
 try{assert.deepEqual((await client.query('SELECT current_database() database,current_user principal')).rows[0],{database:'postgres',principal:'postgres'});return await callback(client);}finally{await client.end();}
}
const native=database=>new pg.Client({host:path.resolve('.data/local-postgres/central/socket'),port:55432,user:os.userInfo().username,database,application_name:'galx-final-central-cutover'});
async function stopped(context,name,expected){
 const current=await inspect(context,name);assert.equal(current.Id,expected);
 assert.equal(current.State.Running,false);assert.equal(current.State.OOMKilled,false);assert.equal(current.State.Error,'');
 if(name==='galx-local-account-rest'&&current.State.ExitCode===255){
  assert.equal(current.Image,'sha256:c7cd7e265a85b05248abf53f4473fcec7e327c282d0bd0cf60f1551996d09fcf');
  const logs=await run('docker',['--context',context,'logs','--tail','12',name],120000,true);assert(logs.includes('Received termination unix signal SIGTERM'));
 }else assert.equal(current.State.ExitCode,0);
}
async function assertFence(client){
 assert.equal((await client.query("SELECT count(*)::int count FROM pg_trigger WHERE tgname='galx_source_retired_20261017' AND tgenabled='O'")).rows[0].count,195);
 for(const table of ['auth.users','auth.sessions','public.galx_shard_accounts','private.galx_relay_installation_runtime']){
  await client.query('BEGIN');let code;
  try{await client.query('DELETE FROM '+table+' WHERE false');}catch(error){code=error.code;}
  finally{await client.query('ROLLBACK');}
  assert.equal(code,'25006');
 }
}
async function prereqs(){
 assert.equal((await read(state+'/phase.json')).state,'preparation');
 await accountProviderEnvironment(state,await read(state+'/hosted-central-auth.secret.json'),{requireAll:true});
 const [email,callbacks,web,runtime,probe,cleanup]=await Promise.all([
  read(state+'/account-email-acceptance.json'),read(state+'/oauth-callback-registration.json'),read(state+'/local-account-web-acceptance.json'),
  read(state+'/web-package-03/acceptance.json'),read(state+'/central-source-freeze-probe.json'),read(state+'/native-guard-cleanup-probe.json')]);
 assert.equal(email.confirmationEmail,'delivered');assert.equal(email.recoveryEmail,'delivered');assert(email.smtpTlsVerified&&email.domainRestrictedSendingKey);
 assert.equal(callbacks.callback,'https://galx.ai/auth/v1/callback');assert.equal(callbacks.github,'Application updated successfully');assert.equal(callbacks.google,'OAuth client saved');
 assert.equal(web.result,'pass');assert.equal(web.checks,33);assert.equal(runtime.status,'PASSED');
 const up=await fs.readFile('deploy/postgres-cutover/central-source-freeze.sql'),down=await fs.readFile('deploy/postgres-cutover/central-source-freeze.down.sql');
 assert.equal(probe.upSha256,hash(up));assert.equal(probe.downSha256,hash(down));assert.equal(cleanup.sourceSqlSha256,hash(up));assert.equal(cleanup.cleanupSqlSha256,hash(down));assert.equal(cleanup.cleanup,'pass');
 assert(Date.now()-Date.parse(probe.observedAt)<2*3600000&&Date.now()-Date.parse(cleanup.observedAt)<2*3600000);
 return {upSha256:hash(up),downSha256:hash(down)};
}
async function drain(){
 try{await fs.access(phaseFile);throw Error('Existing central phase must be inspected.');}catch(error){if(error.code!=='ENOENT')throw error;}
 const probes=await prereqs(),manifest=await read(imagesFile),row=manifest.images.find(v=>v.component==='central');assert(row);
 const candidate=JSON.parse(await docker('desktop-linux',['image','inspect',candidateTag]))[0];assert.equal(candidate.Architecture,'arm64');
 const central=await inspect('desktop-linux','galx-local-authority-authority-1');assert.equal(central.Image,row.id);assert.equal(central.Config.Labels['io.galx.component'],'central');
 assert.equal(central.Config.Labels['com.docker.compose.project'],'galx-local-authority');
 const files=[[componentFile,'central-hosted.secret.json'],[imagesFile,'central-images-before.json'],[yamlFile,'central-compose-before.yaml']];
 for(const [sourceFile,destination]of files){await fs.copyFile(sourceFile,state+'/'+destination);await fs.chmod(state+'/'+destination,0o600);}
 const supervisorAgent=path.join(os.homedir(),'Library/LaunchAgents/ai.galx.relay-local.plist');
 await run('/bin/launchctl',['print',`gui/${os.userInfo().uid}/ai.galx.relay-local`]);
 const owned=[['colima-premium','galx-premium-relay-1','io.galx.component','runtime',480],['desktop-linux','galx-web-nova-web-1','com.docker.compose.project','galx-web-nova',480],['desktop-linux','galx-web-account-migration-web-1','com.docker.compose.project','galx-web-account-migration',480],['desktop-linux','galx-local-account-auth','ai.galx.account-services','local-postgres-v1',30],['desktop-linux','galx-local-account-rest','ai.galx.account-services','local-postgres-v1',30],['desktop-linux','galx-local-authority-authority-1','com.docker.compose.project','galx-local-authority',60]];
 const containers=[];
 for(const [context,name,label,value,seconds]of owned){const c=await inspect(context,name);assert.equal(c.Config.Labels[label],value);assert(c.State.Running);containers.push({context,name,id:c.Id,image:c.Image,seconds});}
 const record={phase:'draining',startedAt:new Date().toISOString(),...probes,sourceConfigSha256:hash(await fs.readFile(componentFile)),sourceImagesSha256:hash(await fs.readFile(imagesFile)),sourceYamlSha256:hash(await fs.readFile(yamlFile)),candidateImage:candidate.Id,supervisorAgent,containers,drained:[]};await save(record);
 await run('/bin/launchctl',['bootout',`gui/${os.userInfo().uid}`,supervisorAgent]);
 for(const c of containers){console.log('Draining '+c.name);await docker(c.context,['stop','--time',String(c.seconds),c.name],(c.seconds+30)*1000);await stopped(c.context,c.name,c.id);record.drained.push(c.name);await save(record);}
 await save({...record,phase:'drained',cleanExit:true});console.log('Owned central clients stopped cleanly; source public calls remain subject to the next atomic write guard.');
}
async function fence(){
 const p=await read(phaseFile);assert.equal(p.phase,'drained');
 for(const c of p.containers)await stopped(c.context,c.name,c.id);
 const up=await fs.readFile('deploy/postgres-cutover/central-source-freeze.sql','utf8');assert.equal(hash(up),p.upSha256);
 await save({...p,phase:'fence-started'});
 await source(async c=>{
  const active=Number((await c.query("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend' AND state<>'idle'")).rows[0].count);assert.equal(active,0,'Active source transactions require inspection before the fence.');
  await c.query('BEGIN');try{await c.query(up);await c.query('COMMIT');}catch(error){await c.query('ROLLBACK');throw error;}
  await assertFence(c);
 });
 await save({...p,phase:'fenced',sourceGuardTables:195,metadataException:'auth.schema_migrations platform version marker only',fencedAt:new Date().toISOString()});console.log('Central application and Auth data writes are durably guarded on the source.');
}
async function finishDrain(){
 const p=await read(phaseFile);assert.equal(p.phase,'draining');assert.equal(p.drained.length,4);
 for(const c of p.containers){
  const current=await inspect(c.context,c.name);assert.equal(current.Id,c.id);
  if(current.State.Running){assert.equal(c.name,'galx-local-authority-authority-1');await docker(c.context,['stop','--time',String(c.seconds),c.name],(c.seconds+30)*1000);}
  await stopped(c.context,c.name,c.id);
 }
 const local=native('galxai');await local.connect();try{assert.equal(Number((await local.query("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()")).rows[0].count),0);}finally{await local.end();}
 await save({...p,phase:'drained',cleanExit:true,drained:p.containers.map(c=>c.name),restTermination:{exitCode:255,signalLogged:'SIGTERM',remainingPreparationConnections:0},interruptedDrainResolvedAt:new Date().toISOString()});
 console.log('Interrupted drain inspected: exact private REST image logged SIGTERM, all preparation clients disconnected; remaining authority stopped cleanly.');
}
async function copy(){
 const p=await read(phaseFile);assert.equal(p.phase,'fenced');await source(assertFence);
 let sourceEnv;try{sourceEnv=await fs.readFile(state+'/central-source.secret.env','utf8');}catch(error){if(error.code!=='ENOENT')throw error;sourceEnv=await fs.readFile('.env.local','utf8');}
 process.env.DATABASE_URL=parseEnv(sourceEnv).DATABASE_URL;
 await snapshotLocalPostgresSource('central');const latest=await read('.data/local-postgres/central/latest-source.json');
 const admin=native('postgres');await admin.connect();const archived='galxai_preparation_'+Date.now();
 try{
  assert.equal(Number((await admin.query("SELECT count(*) FROM pg_stat_activity WHERE datname='galxai'")).rows[0].count),0,'The local preparation database still has a client.');
  await save({...p,phase:'copying',finalSource:latest.path,retainedPreparationDatabase:archived});
  await admin.query('ALTER DATABASE galxai RENAME TO "'+archived+'"');
 }finally{await admin.end();}
 await restoreLocalPostgres('central');await verifyLocalPostgres('central');
 const local=native('galxai');await local.connect();
 try{
  const schemas=(await read(latest.path+'/manifest.json')).included,before=await localPostgresTableManifest(local,schemas);
  const down=await fs.readFile('deploy/postgres-cutover/central-source-freeze.down.sql','utf8');assert.equal(hash(down),p.downSha256);
  await local.query('BEGIN');try{await local.query(down);assert.deepEqual(await localPostgresTableManifest(local,schemas),before);await local.query('COMMIT');}catch(error){await local.query('ROLLBACK');throw error;}
 }finally{await local.end();}
 await command(['scripts/local-postgres.mjs','audit','central']);
 await command(['scripts/stage-local-account-services.mjs','prepare']);
 await command(['scripts/prepare-account-web-config.mjs']);
 await command(['scripts/stage-local-relay-databases.mjs','prepare']);
 await command(['scripts/stage-local-relay-databases.mjs','central-transport']);
 await command(['scripts/prepare-nova-database-config.mjs']);
 await command(['scripts/self-host.mjs','plan-account-migration',state+'/web-package-03',state+'/web-runtime.secret.json',state+'/web-plan-final']);
 await command(['scripts/self-host.mjs','plan-nova-native',state+'/web-package-03',state+'/nova-runtime-native.secret.json',state+'/nova-plan-final']);
 await save({...p,phase:'copied',finalSource:latest.path,retainedPreparationDatabase:archived,sourceHashVerified:true,guardsRemoved:true,restrictedRoleAudit:true,finalTlsTransport:true});
 console.log('Fresh fenced central source restored and verified; preparation database retained.');
}
async function activate(){
 const p=await read(phaseFile);assert.equal(p.phase,'copied');await source(assertFence);
 assert.equal(hash(await fs.readFile(componentFile)),p.sourceConfigSha256);assert.equal(hash(await fs.readFile(imagesFile)),p.sourceImagesSha256);assert.equal(hash(await fs.readFile(yamlFile)),p.sourceYamlSha256);
 const manifest=await read(imagesFile),row=manifest.images.find(v=>v.component==='central');
 const yaml=await fs.readFile(yamlFile,'utf8');assert.equal(yaml.split(row.tag).length,3);
 const config=await read(state+'/central-native.secret.json');assert.equal(config.databaseDeployment,'native-postgres-v1');
 await save({...p,phase:'activation-started',localAuthorityStartedAt:new Date().toISOString()});
 // Once any authority starts, source thaw and preparation mutation commands are forbidden.
 await write(state+'/phase.json',{state:'central-local-authority',createdAt:new Date().toISOString(),publicTraffic:false,sourceGuarded:true,finalSource:p.finalSource});
 await fs.copyFile(state+'/central-native.secret.json',componentFile);await fs.chmod(componentFile,0o600);
 await fs.writeFile(yamlFile,yaml.replaceAll(row.tag,candidateTag));row.tag=candidateTag;row.id=p.candidateImage;row.architecture='arm64';await fs.writeFile(imagesFile,JSON.stringify(manifest,null,2)+'\n');
 await command(['scripts/stage-local-account-services.mjs','start-final']);
 await command(['scripts/relay-local.mjs','up'],240000);
 await command(['scripts/self-host.mjs','resume',state+'/web-plan-final']);
 await command(['scripts/self-host.mjs','stage',state+'/nova-plan-final']);
 await run('/bin/launchctl',['bootstrap',`gui/${os.userInfo().uid}`,p.supervisorAgent]);
 await save({...p,phase:'local-running',localAuthorityStartedAt:new Date().toISOString(),publicTraffic:false,sourceWriteGuardRetained:true});
 console.log('Central, Auth, web and Nova are running against the final local database; public routing is not switched.');
}
try{
 const action=process.argv[2];if(action==='drain')await drain();else if(action==='finish-drain')await finishDrain();else if(action==='fence')await fence();else if(action==='copy')await copy();else if(action==='activate')await activate();else throw Error('Use drain, fence, copy or activate. Inspect the phase before continuing an interrupted action.');
}catch(error){await fs.writeFile(state+'/central-cutover-error.secret.log',String(error.privateOutput||error.stack||error.message),{mode:0o600});console.error('Central migration stopped; inspect its private error and phase before continuing. No automatic rollback or replay was attempted.');process.exitCode=1;}
