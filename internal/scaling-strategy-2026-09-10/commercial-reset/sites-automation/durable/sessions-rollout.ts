/** Private, reversible admission pause for the conversation schema cutover. No secrets in evidence. */
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {getPostgresPool,closePostgresPool} from '../../../../../src/lib/db/postgres';
const record=new URL('./sessions-rollout-verification.json',import.meta.url),action=process.argv[2];
if(!['inspect','pause','resume'].includes(action))throw new Error('Expected inspect, pause or resume');
const signature=(p:any)=>createHash('sha256').update(JSON.stringify([p.pool_id,p.limits,p.paid_price_ids])).digest('hex');
const pool=getPostgresPool();if(!pool)throw new Error('Database unavailable');
try{
 const db=await pool.connect();try{
  await db.query('BEGIN');await db.query("SET LOCAL statement_timeout='5s';SET LOCAL lock_timeout='3s'");
  const policy=(await db.query('SELECT mode,revision,pool_id,limits,paid_price_ids FROM private.galx_sites_fair_policy WHERE singleton FOR UPDATE')).rows[0];
  if(!policy)throw new Error('Policy unavailable');
  const pending=Number((await db.query('SELECT count(*) FROM private.galx_site_workspaces WHERE operation_id IS NOT NULL')).rows[0].count);
  if(action==='inspect')console.log(JSON.stringify({mode:policy.mode,revision:Number(policy.revision),pending,policy_signature:signature(policy),migration_applied:Boolean((await db.query("SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260912060747'")).rowCount)}));
  if(action==='pause'){
    if(existsSync(record)||policy.mode!=='enforce'||pending)throw new Error('Pause preconditions failed; inspect pending state');
    const next=(await db.query("UPDATE private.galx_sites_fair_policy SET mode='disabled',revision=revision+1,updated_at=now() WHERE singleton AND revision=$1 RETURNING revision",[policy.revision])).rows[0];
    if(!next)throw new Error('Policy changed');
    writeFileSync(record,JSON.stringify({phase:'pause_prepared',original_mode:policy.mode,original_revision:Number(policy.revision),paused_revision:Number(next.revision),policy_signature:signature(policy),pending_at_pause:pending,prepared_at:new Date().toISOString()},null,2)+'\n');
    console.log(JSON.stringify({mode:'disabled',revision:Number(next.revision),pending}));
  }
  if(action==='resume'){
    const saved=JSON.parse(readFileSync(record,'utf8'));
    if(saved.phase==='resumed'||policy.mode!=='disabled'||Number(policy.revision)!==saved.paused_revision||signature(policy)!==saved.policy_signature||pending)throw new Error('Resume preconditions failed; inspect current state');
    if(!(await db.query("SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260912060747'")).rowCount)throw new Error('Migration is not recorded');
    const next=(await db.query('UPDATE private.galx_sites_fair_policy SET mode=$1,revision=revision+1,updated_at=now() WHERE singleton AND revision=$2 RETURNING revision',[saved.original_mode,policy.revision])).rows[0];
    if(!next)throw new Error('Policy changed');
    writeFileSync(record,JSON.stringify({...saved,phase:'resume_prepared',resumed_revision:Number(next.revision),resumed_at:new Date().toISOString()},null,2)+'\n');
    console.log(JSON.stringify({mode:saved.original_mode,revision:Number(next.revision),pending,limits_and_prices_unchanged:true}));
  }
  await db.query('COMMIT');
  if(action!=='inspect'){const saved=JSON.parse(readFileSync(record,'utf8'));saved.phase=action==='pause'?'paused':'resumed';writeFileSync(record,JSON.stringify(saved,null,2)+'\n');}
 }catch{await db.query('ROLLBACK');throw new Error('Rollout action failed. Inspect database and private evidence before retrying.');}finally{db.release();}
}finally{await closePostgresPool();}
