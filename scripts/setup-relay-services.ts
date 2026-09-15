/** Closed-gate provisioning. Fixed projects, retained migrations, no account import or activation. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes,randomUUID } from 'node:crypto';
import { mkdir,readFile,writeFile,stat } from 'node:fs/promises';
import path from 'node:path';
import { hash,PROJECTS,type PoolId } from '../src/relay/pool-protocol.js';
const exec=promisify(execFile),root=path.resolve('.relay/service-deployment');
const quote=(s:string)=>"'"+s.replaceAll("'","''")+"'";
const token=()=>randomBytes(32).toString('base64url');
const args=process.argv.slice(2);if(args.length!==1||!['--prepare','--apply-databases'].includes(args[0]))throw Error('Use --prepare or --apply-databases.');
await mkdir(root,{recursive:true,mode:0o700});const file=path.join(root,'authority.json');let state:any;
try{if((await stat(file)).mode&0o077)throw Error('Deployment authority file must be private.');state=JSON.parse(await readFile(file,'utf8'));}
catch(e:any){if(e.code!=='ENOENT')throw e;state={version:1,createdAt:new Date().toISOString(),centralDatabasePassword:token(),pools:Object.fromEntries((['premium','standard'] as PoolId[]).map(pool=>[pool,{installationId:randomUUID(),hostId:randomUUID(),actorId:randomUUID(),databasePassword:token(),inferenceKey:token(),principals:Object.fromEntries(['runtime','registrar','operator','viewer'].map(kind=>[kind,{id:randomUUID(),token:token()}]))}]))};await writeFile(file,JSON.stringify(state,null,2),{mode:0o600,flag:'wx'});}
if(state.version!==1)throw Error('Unsupported deployment record.');
async function query(project:string,sql:string,label:string){const sqlFile=path.join(root,label+'.sql');await writeFile(sqlFile,sql,{mode:0o600});try{
  const result=await exec('supabase',['db','query','--linked','--project-ref',project,'--file',sqlFile,'--output','json'],{timeout:60000,maxBuffer:1048576});
  const start=result.stdout.indexOf('{'),parsed=JSON.parse(result.stdout.slice(start));return parsed.rows;
}catch{throw Error(`${label} was not confirmed. Inspect the project status before retrying.`);}}
if(args[0]==='--apply-databases'){
  const migration=await readFile('deploy/relay-execution/supabase/migrations/20260915082628_relay_execution.sql','utf8');
  for(const pool of ['premium','standard'] as PoolId[]){const p=state.pools[pool];
    const existing=await query(PROJECTS[pool],"SELECT count(*)::integer AS count FROM information_schema.tables WHERE table_schema='private'",pool+'-preflight');
    if(existing[0].count!==0){const rows=await query(PROJECTS[pool],"SELECT pool_id,installation_id,project_ref FROM private.relay_identity",pool+'-identity');if(rows.length!==1||rows[0].installation_id!==p.installationId||rows[0].pool_id!==pool)throw Error('Existing execution identity differs.');}
    else{
      await query(PROJECTS[pool],`BEGIN; ${migration}
        INSERT INTO private.relay_identity(pool_id,installation_id,project_ref) VALUES(${quote(pool)},${quote(p.installationId)},${quote(PROJECTS[pool])});
        CREATE SCHEMA IF NOT EXISTS supabase_migrations;
        CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations(version text PRIMARY KEY,statements text[],name text);
        INSERT INTO supabase_migrations.schema_migrations VALUES('20260915082628',ARRAY[${quote(migration)}],'relay_execution');
        COMMIT; SELECT 'applied' AS result;`,pool+'-migration');
    }
    await query(PROJECTS[pool],`DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='galx_execution_service') THEN CREATE ROLE galx_execution_service LOGIN INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS; END IF; END $$;
      ALTER ROLE galx_execution_service PASSWORD ${quote(p.databasePassword)}; GRANT galx_relay_execution TO galx_execution_service;
      SELECT has_function_privilege('galx_execution_service','private.relay_execution(text,uuid,text,jsonb)','EXECUTE') AS execute,
        has_table_privilege('galx_execution_service','private.relay_executions','SELECT') AS direct_read;`,pool+'-principal');
    console.log(`${pool}: execution schema and restricted database principal configured.`);
  }
  const principles=(pool:PoolId)=>Object.entries(state.pools[pool].principals).map(([kind,p]:any)=>({id:p.id,actorId:state.pools[pool].actorId,kind,tokenSha256:hash(p.token)}));
  const calls=(['premium','standard'] as PoolId[]).map(pool=>`SELECT private.relay_configure_installation(${quote(pool)},${quote(state.pools[pool].installationId)},${quote(state.pools[pool].hostId)},${quote(JSON.stringify(principles(pool)))}::jsonb,false,false,NULL);`).join('\n');
  await query(PROJECTS.central,`BEGIN;
    DO $$ BEGIN IF EXISTS(SELECT FROM private.galx_relay_installation_runtime WHERE registration_allowed OR execution_allowed) THEN RAISE EXCEPTION 'Activated installation requires its operational runbook'; END IF; END $$;
    ${calls}
    DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='galx_control_service') THEN CREATE ROLE galx_control_service LOGIN INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS; END IF; END $$;
    ALTER ROLE galx_control_service PASSWORD ${quote(state.centralDatabasePassword)};GRANT galx_relay_control TO galx_control_service;
    COMMIT; SELECT count(*)::integer AS installations FROM private.galx_relay_installation_runtime WHERE NOT registration_allowed AND NOT execution_allowed;`,'central-principals');
  console.log('Central principals reserved; both registration and execution gates remain closed.');
  await writeFile(path.join(root,'database-result.json'),JSON.stringify({at:new Date().toISOString(),central:PROJECTS.central,premium:PROJECTS.premium,standard:PROJECTS.standard,registration:false,execution:false,accountImports:0},null,2),{mode:0o600});
}else console.log('Private deployment identities prepared. No database or runtime was changed.');
