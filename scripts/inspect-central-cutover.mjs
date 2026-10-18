/** Read-only inventory and rolled-back writer-fence capability checks. */
import fs from 'node:fs/promises';
import { parseEnv } from 'node:util';
import pg from 'pg';
import assert from 'node:assert/strict';
const state='.data/postgres-cutover';let client;
try{
 const env=parseEnv(await fs.readFile('.env.local','utf8')),url=new URL(env.DATABASE_URL);
 assert(decodeURIComponent(url.username).endsWith('.mazhcjisettrzbqhorvp')&&url.hostname.endsWith('.pooler.supabase.com'));
 const config=JSON.parse(await fs.readFile('.relay/service-deployment/components/central.json','utf8'));
 client=new pg.Client({host:url.hostname,port:5432,user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),ssl:{rejectUnauthorized:true,ca:config.databaseCa},connectionTimeoutMillis:10000});await client.connect();
 await client.query('BEGIN READ ONLY');
 const identities=(await client.query('SELECT current_database() database,current_user principal')).rows[0];assert.equal(identities.database,'postgres');assert.equal(identities.principal,'postgres');
 const connections=(await client.query("SELECT usename,state,backend_type,count(*)::int connections FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() GROUP BY 1,2,3 ORDER BY 1,2,3")).rows;
 const roles=(await client.query("SELECT rolname,rolcanlogin,rolsuper,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolcanlogin OR rolname IN ('postgres','authenticator','supabase_auth_admin','galx_control_service') ORDER BY 1")).rows;
 const cron=await client.query("SELECT to_regclass('cron.job') IS NOT NULL present");
 const jobs=cron.rows[0].present?(await client.query('SELECT jobid,active FROM cron.job ORDER BY jobid')).rows:[];
 const authUsers=Number((await client.query('SELECT count(*) FROM auth.users')).rows[0].count);
 const triggerPermissions=(await client.query("SELECT n.nspname schema,count(*)::int tables,bool_and(has_table_privilege(current_user,c.oid,'TRIGGER')) trigger_privilege FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=ANY($1) AND c.relkind IN ('r','p') GROUP BY 1 ORDER BY 1",[['public','private','auth','galx_account_auth','supabase_migrations','extensions']])).rows;
 const authTablePermissions=(await client.query("SELECT c.relname name,pg_get_userbyid(c.relowner) owner,has_table_privilege(current_user,c.oid,'TRIGGER') trigger_privilege FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='auth' AND c.relkind IN ('r','p') ORDER BY 1")).rows;
 const pendingLeases=(await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='private' AND table_name ILIKE '%lease%' ORDER BY 1")).rows.map(v=>v.table_name);
 await client.query('COMMIT');
 const fenceChecks=[];
 for(const role of ['postgres','authenticator','supabase_auth_admin','galx_control_service']){
   if(!roles.some(r=>r.rolname===role))continue;
   await client.query('BEGIN');let permitted=false,code;
   try{await client.query('ALTER ROLE "'+role+'" NOLOGIN');permitted=true;}catch(error){code=error.code;}
   finally{await client.query('ROLLBACK');}
   fenceChecks.push({role,permitted,code});
 }
 let authTriggerDryRun=false,authTriggerCode;
 await client.query('BEGIN');
 try{await client.query("SET LOCAL lock_timeout='1s'; SET LOCAL statement_timeout='5s'");await client.query('CREATE TRIGGER galx_cutover_permission_probe BEFORE UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION pg_catalog.suppress_redundant_updates_trigger()');authTriggerDryRun=true;}
 catch(error){authTriggerCode=error.code;}
 finally{await client.query('ROLLBACK');}
 const result={observedAt:new Date().toISOString(),sourceProject:'mazhcjisettrzbqhorvp',identities,connections,roles,scheduledJobs:jobs,authUsers,pendingLeaseTables:pendingLeases,fenceChecks,triggerPermissions,authTablePermissions,authTriggerDryRun,authTriggerCode,sourceDataChanged:false,sourceRoleChangesRolledBack:true};
 await fs.writeFile(state+'/central-source-inspection.json',JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify(result));
}catch(error){await fs.writeFile(state+'/central-inspection-error.secret.log',String(error.message),{mode:0o600});console.error('Central read-only inspection failed; no writer fence was retained.');process.exitCode=1;}
finally{await client?.end().catch(()=>{});}
