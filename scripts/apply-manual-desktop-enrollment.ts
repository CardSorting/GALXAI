/** Exact, reviewed policy migration. Default is read-only inventory; no credentials are printed. */
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { getPostgresSslConfig } from '../src/lib/db/postgres';
const version='20260914231914', name='manual_desktop_shard_enrollment';
const args=process.argv.slice(2);
if(args.length>1 || args.some(a=>!['--apply','--dry-run'].includes(a))) throw Error('Use no flag, --dry-run or --apply.');
if(!process.env.DATABASE_URL) throw Error('Configure the administrator database connection privately.');
const client=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:getPostgresSslConfig(),connectionTimeoutMillis:5000,statement_timeout:30000});
try{
  await client.connect();
  const before=(await client.query('SELECT count(*)::int AS retained, count(*) FILTER (WHERE NOT permission_retracted)::int AS not_revoked FROM public.galx_shard_accounts')).rows[0];
  const applied=(await client.query('SELECT version FROM supabase_migrations.schema_migrations WHERE version=$1',[version])).rowCount===1;
  console.log(JSON.stringify({version,applied,...before}));
  if (applied) {
    const policy=(await client.query(`SELECT
      count(*) FILTER (WHERE managed_desktop_id IS NOT NULL AND desktop_enrolled_at IS NOT NULL)::int AS confirmed,
      count(*) FILTER (WHERE managed_desktop_id IS NULL)::int AS awaiting_manual_confirmation,
      has_table_privilege('service_role','public.galx_shard_accounts','INSERT') AS external_insert,
      has_function_privilege('service_role','private.enroll_desktop_shard(uuid,jsonb,jsonb)','EXECUTE') AS external_enroll,
      has_function_privilege('service_role','private.refresh_desktop_shard(uuid,text,jsonb,jsonb)','EXECUTE') AS external_refresh,
      pg_has_role('service_role','galx_desktop_writer','MEMBER') AS external_writer_membership
      FROM public.galx_shard_accounts`)).rows[0];
    console.log(JSON.stringify({policy}));
    if(policy.external_insert || policy.external_enroll || policy.external_refresh || policy.external_writer_membership) throw Error('Privilege verification failed');
  }
  if(args.length && !applied){
    const sql=await readFile(new URL(`../supabase/migrations/${version}_${name}.sql`,import.meta.url),'utf8');
    await client.query('BEGIN');
    try{
      await client.query(sql);
      const permissions=(await client.query(`SELECT
        has_table_privilege('service_role','public.galx_shard_accounts','INSERT') AS external_insert,
        has_function_privilege('service_role','private.enroll_desktop_shard(uuid,jsonb,jsonb)','EXECUTE') AS external_enroll,
        has_function_privilege('service_role','private.refresh_desktop_shard(uuid,text,jsonb,jsonb)','EXECUTE') AS external_refresh,
        has_function_privilege('anon','public.fn_upsert_shard_registry(jsonb)','EXECUTE') AS anonymous_upsert`)).rows[0];
      if(Object.values(permissions).some(Boolean)) throw Error('Privilege verification failed');
      const after=(await client.query('SELECT count(*)::int AS retained FROM public.galx_shard_accounts')).rows[0];
      if(before.retained!==after.retained) throw Error('Retained row count changed');
      if(args[0]==='--apply'){
        await client.query('INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES($1,$2,$3)',[version,name,[sql]]);
        await client.query('COMMIT');
      }else await client.query('ROLLBACK');
      console.log(JSON.stringify({result:args[0]==='--apply'?'applied':'validated_and_rolled_back',permissions,retained:after.retained}));
    }catch(e){await client.query('ROLLBACK');throw e;}
  }
}catch(error:any){console.error(JSON.stringify({error:'Manual enrollment migration failed',code:error.code||'verification_failed'}));process.exitCode=1;}
finally{await client.end();}
