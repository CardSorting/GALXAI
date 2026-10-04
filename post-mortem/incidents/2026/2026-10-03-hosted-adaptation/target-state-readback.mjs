import fs from 'node:fs';
import pg from 'pg';
import {execFileSync} from 'node:child_process';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {write,vercel,link,cf,tunnel} from './api.mjs';
const env=parseEnv(fs.readFileSync('.env.local','utf8'));
const central=JSON.parse(fs.readFileSync('.relay/service-deployment/components/central.json'));
const input=JSON.parse(fs.readFileSync('.relay/service-deployment/local-input.json'));
const result={at:new Date().toISOString(),mode:'repeatable-read read-only SQL and GET API inventory; no routines invoked'};
async function read(url,ca,queries){const c=new pg.Client({connectionString:url,ssl:{ca,rejectUnauthorized:true},connectionTimeoutMillis:10000});try{await c.connect();await c.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');await c.query("SET LOCAL statement_timeout='8s'");const out={};for(const [key,sql] of queries)out[key]=(await c.query(sql)).rows;await c.query('ROLLBACK');return out;}finally{await c.end();}}
result.primary=await read(env.DATABASE_URL,central.databaseCa,[
 ['cohort',`SELECT a.user_id,a.enabled,a.valid_until,EXISTS(SELECT FROM auth.users u WHERE u.id=a.user_id) account_intact,(SELECT count(*)::int FROM private.galx_connect_grants g WHERE g.user_id=a.user_id AND g.revoked_at IS NULL) active_grants FROM private.galx_inference_access a`],
 ['connections',`SELECT client_id,resource,scope,count(*)::int records,count(*) FILTER (WHERE revoked_at IS NULL)::int active FROM private.galx_connect_grants GROUP BY client_id,resource,scope`],
 ['nova',`SELECT state,count(*)::int records FROM private.galx_nova_requests GROUP BY state`],
 ['migrations',`SELECT version FROM supabase_migrations.schema_migrations ORDER BY version`]
]);
result.primary.cohort=result.primary.cohort.map(({user_id,...row})=>({...row,existingAccountSha256:createHash('sha256').update(user_id).digest('hex')}));
const runtime=JSON.parse(fs.readFileSync('.relay/service-deployment/components/premium-runtime.json'));
const projectRef=new URL(runtime.databaseUrl).username.split('.').at(-1);
if(!/^[a-z]{20}$/.test(projectRef))throw new Error('Unrecognized execution project');
const sql=`BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout='8s'; SELECT jsonb_build_object('records',(SELECT jsonb_agg(x) FROM (SELECT state,success,settled,count(*)::int records FROM private.relay_executions GROUP BY state,success,settled) x),'retained_digest',(SELECT md5(string_agg(row_to_json(e)::text,E'\\n' ORDER BY request_key)) FROM private.relay_executions e)) inventory; ROLLBACK;`;
result.execution=JSON.parse(execFileSync('supabase',['db','query','--linked','--project-ref',projectRef,sql,'--output','json'],{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']}));

const project=await vercel('/v9/projects/'+link.projectId),team=await vercel('/v2/teams/'+link.orgId),transport=(await cf(tunnel)).result;
result.target={productionId:project.targets.production.id,readyState:project.targets.production.readyState,nodeVersion:project.nodeVersion,plan:team.billing.plan,planStatus:team.billing.status,resourceConfig:project.resourceConfig,transportVersion:transport.version,ingress:transport.config.ingress};
write('target-state-readback.json',result);
console.log(JSON.stringify({cohort:result.primary.cohort.map(({existingAccountSha256,...r})=>r),primaryMigrations:result.primary.migrations.length,retainedExecution:result.execution,target:result.target},null,2));
