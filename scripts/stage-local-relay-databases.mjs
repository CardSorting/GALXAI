/** Prepare private relay configs and narrowly scoped VM connectivity. No runtime cutover. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root=process.cwd(),state=path.join(root,'.data/postgres-cutover');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const run=(bin,args,input)=>execFileSync(bin,args,{cwd:root,input,encoding:'utf8',timeout:120000,maxBuffer:1048576,stdio:['pipe','pipe','pipe']}).trim();
const write=(file,body)=>{fs.writeFileSync(file,body,{mode:0o600});fs.chmodSync(file,0o600);};
const action=process.argv[2];
try{
 if(action==='prepare'){
  const records=[];
  for(const [name,component,role,host,port,database] of [
   ['central','central','galx_control_service','host.docker.internal',55432,'galxai'],
   ['premium','premium-runtime','galx_execution_service','galx-postgres-premium.internal',55433,'galx_relay_premium'],
  ]){
   const source=fs.readFileSync(`.relay/service-deployment/components/${component}.json`,'utf8'),config=JSON.parse(source);
   const credentials=read(`.data/local-postgres/${name}/credentials.secret.json`);
   if(!credentials[role])throw Error('Missing local scoped service credential.');
   config.databaseDeployment='native-postgres-v1';
   config.databaseUrl=`postgresql://${role}:${encodeURIComponent(credentials[role])}@${host}:${port}/${database}`;
   config.databaseCa=fs.readFileSync(`.data/local-postgres/${name}/server.crt`,'utf8');
   const bytes=JSON.stringify(config,null,2)+'\n';write(path.join(state,`${component}-native.secret.json`),bytes);
   records.push({component,sourceConfigSha256:hash(source),preparedConfigSha256:hash(bytes)});
  }
  write(path.join(state,'relay-database-preparation.json'),JSON.stringify({observedAt:new Date().toISOString(),liveComponentsChanged:false,records},null,2));
  console.log('Scoped central and Premium configurations prepared; running components unchanged.');
 }else if(action==='central-transport'){
  const script=`const fs=require('fs'),pg=require('pg'),assert=require('assert/strict');const c=JSON.parse(fs.readFileSync('/run/secrets/candidate'));(async()=>{const db=new pg.Client({connectionString:c.databaseUrl,ssl:{rejectUnauthorized:true,ca:c.databaseCa},connectionTimeoutMillis:4000});await db.connect();try{const row=(await db.query("SELECT current_database() database,current_user principal,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) tls,has_function_privilege(current_user,'private.relay_control(text,text,jsonb)','EXECUTE') protocol")).rows[0];assert.deepEqual(row,{database:'galxai',principal:'galx_control_service',tls:true,protocol:true});let denied=false;try{await db.query('SELECT * FROM private.galx_account_profiles LIMIT 0');}catch(error){denied=error.code==='42501';}assert(denied);}finally{await db.end();}const bad=new pg.Client({connectionString:c.databaseUrl,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:3000});let denied=false;try{await bad.connect();}catch{denied=true;}finally{await bad.end().catch(()=>{});}assert(denied);console.log(JSON.stringify({ownDatabaseTls:true,scopedPrincipal:true,protocolExecute:true,privateTableDenied:true,untrustedCertificateDenied:true,liveAuthorityChanged:false}));})().catch(()=>{console.error('Private central database transport probe failed');process.exitCode=1});`;
  const result=JSON.parse(run('docker',['--context','desktop-linux','run','--rm','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','128m','--user','1000:1000','--entrypoint','node','--mount',`type=bind,src=${path.join(state,'central-native.secret.json')},dst=/run/secrets/candidate,readonly`,'galxai-relay-central:native-postgres-20261017','-e',script]));
  write(path.join(state,'central-database-transport.json'),JSON.stringify({observedAt:new Date().toISOString(),...result},null,2));console.log(JSON.stringify(result));
 }else if(action==='vm-transport'){
  const sshFile=path.join(state,'premium-ssh.secret.conf');write(sshFile,run('colima',['ssh-config','premium']));
  const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
  const guest=(args,input)=>run('ssh',['-F',sshFile,'-T','-o','ConnectTimeout=8','colima-premium',args.map(quote).join(' ')],input);
  if(guest(['systemctl','is-active','galx-local-isolation.service'])!=='active'||guest(['sh','-c','findmnt -rn -t virtiofs,9p,fuse.sshfs || true']))throw Error('Existing VM isolation is unavailable.');
  console.log(guest(['sudo','-n','python3','-','premium','--native-database'],fs.readFileSync('scripts/install-relay-local-isolation.py')));
  const config=fs.readFileSync(path.join(state,'premium-runtime-native.secret.json'),'utf8');
  guest(['sudo','-n','install','-m','0600','-o','1000','-g','1000','/dev/stdin','/opt/galx/config/premium-runtime-native.json'],config);
  const image=read('docker/relay-pools/local/images.json').images.find(v=>v.component==='runtime'&&v.pool==='premium').id;
  const probe=`const fs=require('fs'),pg=require('pg'),net=require('net'),assert=require('assert/strict');
   const c=JSON.parse(fs.readFileSync('/run/secrets/candidate'));const db=new pg.Client({connectionString:c.databaseUrl,ssl:{rejectUnauthorized:true,ca:c.databaseCa},connectionTimeoutMillis:4000});
   (async()=>{await db.connect();const row=(await db.query('SELECT current_database() database,current_user principal,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) tls')).rows[0];assert.deepEqual(row,{database:'galx_relay_premium',principal:'galx_execution_service',tls:true});await db.end();
   const denied=new pg.Client({connectionString:c.databaseUrl,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:3000});let failed=false;try{await denied.connect();}catch{failed=true;}finally{await denied.end().catch(()=>{});}assert(failed,'Untrusted TLS must fail');
   for(const port of [55432,22,13300]){const allowed=await new Promise(resolve=>{const s=net.connect({host:'galx-postgres-premium.internal',port});s.setTimeout(1200);s.once('connect',()=>{s.destroy();resolve(true)});s.once('error',()=>{s.destroy();resolve(false)});s.once('timeout',()=>{s.destroy();resolve(false)});});assert(!allowed,'Other Mac services must remain unreachable');}
   console.log(JSON.stringify({ownDatabaseTls:true,scopedPrincipal:true,untrustedCertificateDenied:true,centralDatabaseDenied:true,macSshDenied:true,directCentralServiceDenied:true,liveRuntimeChanged:false}));})().catch(()=>{console.error('Private database transport probe failed');process.exitCode=1});`;
  const result=JSON.parse(run('docker',['--context','colima-premium','run','--rm','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','128m','--user','1000:1000','--entrypoint','node','--add-host','galx-postgres-premium.internal:192.168.105.2','--mount','type=bind,src=/opt/galx/config/premium-runtime-native.json,dst=/run/secrets/candidate,readonly',image,'-e',probe]));
  write(path.join(state,'premium-database-transport.json'),JSON.stringify({observedAt:new Date().toISOString(),...result},null,2));console.log(JSON.stringify(result));
 }else throw Error('Use prepare, central-transport or vm-transport.');
}catch(error){
 write(path.join(state,'relay-stage-error.secret.log'),String(error.stderr||error.message));
 console.error('Relay preparation failed; inspect the owner-only relay-stage-error.secret.log.');process.exitCode=1;
}
