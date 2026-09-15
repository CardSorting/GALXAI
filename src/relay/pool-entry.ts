/** Entrypoints contain no credential discovery or environment fallback. Secrets are explicit files. */
import { readFileSync, mkdirSync, lstatSync } from 'node:fs';
import { Pool } from 'pg';
import { assertProjectDatabase, CentralClient, PROJECTS, type PoolId, uuid } from './pool-protocol.js';
import { centralQuery, centralServer } from './pool-central.js';
import { PoolExecution, PostgresExecutionStore } from './pool-execution.js';
import { PoolRuntime } from './pool-runtime.js';
import { poolMonitor } from './pool-monitor-server.js';
import { DesktopManager, DockerDesktopDriver } from './desktop-manager.js';
import { DesktopCredentialError } from './desktop-credentials.js';

export async function poolEntrypoint() {
  const policy=JSON.parse(readFileSync('/app/component.json','utf8'));
  if(!['central','runtime','monitor'].includes(policy.component))throw Error('Invalid component.');
  if(Object.entries(process.env).some(([key,value])=>value&&/^(DATABASE_URL$|POSTGRES|PG(HOST|USER|PASSWORD|DATABASE|SERVICE)|SUPABASE|NEXT_PUBLIC_SUPABASE|GALX_VAULT|GALX_SHARDS|RELAY_ASSIGNED|RELAY_SHARD_ID$|RELAY_API_KEYS$|RELAY_ADMIN_API_KEYS$|RELAY_DISCOVER_HOST_CREDENTIALS$|NODE_OPTIONS$)/.test(key)))throw Error('Unexpected authority in the environment.');
  const filename='/run/secrets/component-config',stat=lstatSync(filename);
  if(!stat.isFile()||stat.size>65536)throw Error('Invalid secret file.');
  const config=JSON.parse(readFileSync(filename,'utf8'));
  const ssl={rejectUnauthorized:true,...(config.databaseCa?{ca:String(config.databaseCa)}:{})};
  let close:()=>Promise<void>;
  if(policy.component==='central') {
    assertProjectDatabase(config.databaseUrl,PROJECTS.central);
    if(!decodeURIComponent(new URL(config.databaseUrl).username).startsWith('galx_control_service'))throw Error('A dedicated central database principal is required.');
    if(!config.vault||Object.keys(config.vault).some(k=>!/^GALX_VAULT_(KEY_V[12]|ACTIVE_KEY_VERSION|MASTER_SECRET)$/.test(k)))throw Error('Invalid vault configuration.');
    Object.assign(process.env,config.vault);
    const db=new Pool({connectionString:config.databaseUrl,ssl,max:8,connectionTimeoutMillis:5000,statement_timeout:10000,query_timeout:12000});
    const server=centralServer({query:centralQuery(db),identitySecret:config.identitySecret});
    const privilege=await db.query('SELECT has_function_privilege(current_user,\'private.relay_control(text,text,jsonb)\',\'EXECUTE\') AS allowed');
    if(privilege.rows[0]?.allowed!==true)throw Error('Central protocol permission is required.');
    server.listen(3000,'0.0.0.0');close=async()=>{server.close();await db.end();};
  } else {
    const pool:PoolId=policy.pool;
    if(!['premium','standard'].includes(pool)||config.pool!==pool||!uuid(config.installationId))throw Error('Pool identity mismatch.');
    const identity={pool,installationId:config.installationId};
    mkdirSync('/state',{recursive:true,mode:0o700});
    if(policy.component==='runtime') {
      assertProjectDatabase(config.databaseUrl,PROJECTS[pool]);
      if(!decodeURIComponent(new URL(config.databaseUrl).username).startsWith('galx_execution_service'))throw Error('A dedicated execution principal is required.');
      if(['operatorToken','viewerToken','registrarToken','vault','identitySecret'].some(k=>config[k]))throw Error('Runtime received management authority.');
      if(!/^[A-Za-z0-9_-]{32,256}$/.test(config.inferenceKey)||!/^[A-Za-z0-9_-]{32,256}$/.test(config.capabilityKey)||new Set([config.inferenceKey,config.capabilityKey,config.runtimeToken]).size!==3)throw Error('Separate inference, capability, and runtime keys are required.');
      const db=new Pool({connectionString:config.databaseUrl,ssl,max:4,connectionTimeoutMillis:5000,statement_timeout:5000,query_timeout:6000});
      const runtime=new PoolRuntime(new PoolExecution(new CentralClient(config.centralOrigin,config.runtimeToken,identity),new PostgresExecutionStore(db,pool,identity.installationId)),config.inferenceKey,'/state',config.capabilityKey);
      await runtime.start();close=async()=>{await runtime.stop();await db.end();};
    } else {
      if(['runtimeToken','databaseUrl','vault','identitySecret','inferenceKey'].some(k=>config[k]))throw Error('Monitor received execution authority.');
      const tokens=[config.operatorToken,config.viewerToken,config.registrarToken];if(new Set(tokens).size!==3)throw Error('Separate service credentials are required.');
      const clients=tokens.map(token=>new CentralClient(config.centralOrigin,token,identity));
      const desktops=new DesktopManager('/state/desktops.json',new DockerDesktopDriver(`pool-${pool}`,config.desktopImage,'/app/desktop/seccomp.json'),Date.now,
        async()=>{throw new DesktopCredentialError('credential_not_allowed');});
      const monitor=poolMonitor({operator:clients[0],viewer:clients[1],registrar:clients[2],operatorToken:tokens[0],viewerToken:tokens[1],desktops});
      monitor.server.listen(pool==='premium'?13311:13312,'127.0.0.1');close=monitor.close;
    }
  }
  let stopping=false;const stop=()=>{if(stopping)return;stopping=true;void close().catch(()=>{process.exitCode=1;});};process.once('SIGTERM',stop);process.once('SIGINT',stop);
  console.log('Service started. Readiness requires its configured authority.');
}
