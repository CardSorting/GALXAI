import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { readFreeGenerationQuota, FreeQuotaError } from '../src/lib/billing/free-generation-quota';
import { SitesWorkspaceRepository } from '../src/lib/sites/workspace-repository';
import { ImageRequestRepository } from '../src/lib/images/request-repository';
import { ImageAllowanceError } from '../src/lib/billing/image-allowance';
import { runFreeGateChecks } from './test-free-generation-gate-db';

const pool=new Pool({connectionString:process.env.DATABASE_URL,max:12});
const cold=new Pool({connectionString:process.env.DATABASE_URL,max:2});
const sites=new SitesWorkspaceRepository(pool),images=new ImageRequestRepository(pool);
const owner=randomUUID(),fresh=randomUUID(),paid=randomUUID();
const payload={prompt:'Isolated quota fixture',model:'image',n:1,size:'1024x1024',quality:'standard' as const};
const zero={sites:0,images:0,siteTurns:0};
let checks=0;
const snapshot=async()=>({
  grants:(await pool.query('SELECT * FROM private.galx_free_generation_grants ORDER BY user_id')).rows,
  usage:(await pool.query('SELECT * FROM private.galx_free_generation_usage ORDER BY user_id,kind,operation_id')).rows,
});
try {
  // Retained ledger/policy compatibility is separate from current admission.
  checks+=await runFreeGateChecks(pool);
  for(const id of [owner,fresh,paid])await pool.query(
    'INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,now())',[id,`${id}@quota.invalid`]);
  const identityHash=createHash('sha256').update(`${owner}@quota.invalid`).digest('hex');
  await pool.query('INSERT INTO private.galx_free_generation_grants(user_id,identity_hash) VALUES($1,$2)',[owner,identityHash]);
  await pool.query(`INSERT INTO private.galx_free_generation_usage(user_id,kind,operation_id,quantity)
    VALUES($1,'image',$2,2)`,[owner,randomUUID()]);
  const history=await snapshot();

  // The retired read contract neither creates a grant nor spends/prunes history.
  const reads=await Promise.all(Array.from({length:8},()=>readFreeGenerationQuota(pool,owner)));
  reads.forEach(quota=>assert.deepEqual(quota,zero));
  for(const id of [owner,fresh,randomUUID()])assert.deepEqual(await readFreeGenerationQuota(cold,id),zero);
  assert.deepEqual(await snapshot(),history);checks++;

  // Reopening a historical policy cannot restore retired Site entry points.
  await pool.query(`UPDATE private.galx_free_generation_policy SET enabled=true,
    valid_until=now()+interval '1 hour',max_outstanding=100,max_hour_units=1000,
    max_day_units=10000,max_total_units=100000`);
  for(const id of [owner,fresh]){
    const requested=randomUUID();
    await assert.rejects(sites.create(id,requested,'Retired free Site',true),
      (error:unknown)=>error instanceof FreeQuotaError&&error.code==='free_site_limit');
    assert.equal(Number((await pool.query('SELECT count(*) AS n FROM private.galx_site_workspaces WHERE id=$1',[requested])).rows[0].n),0);
    const existing=await sites.create(id,randomUUID(),'Retained workspace');
    await assert.rejects(sites.requireFreeSite(id,existing.id),FreeQuotaError);
    await assert.rejects(sites.begin(id,existing.id,existing.revision,randomUUID(),'Retired turn','build',true),
      (error:unknown)=>error instanceof FreeQuotaError&&error.code==='free_quota_exhausted');
    const unchanged=await sites.get(id,existing.id);
    assert.equal(unchanged.operation_id,null);assert.equal(unchanged.revision,existing.revision);
    assert.equal(Number((await pool.query('SELECT count(*) AS n FROM private.galx_site_turns WHERE site_id=$1',[existing.id])).rows[0].n),0);checks++;
  }

  // A legacy balance or Sites Pro grant is not a private image allowance.
  await pool.query('UPDATE auth.users SET raw_app_meta_data=$2::jsonb WHERE id=$1',[owner,JSON.stringify({galx_pro:true})]);
  for(const id of [owner,fresh])for(const priority of [false,true]){
    const key=randomUUID();
    await assert.rejects(images.create(id,{...payload,idempotencyKey:key},priority,'private'),
      (error:unknown)=>error instanceof ImageAllowanceError&&error.code==='image_plan_required');
    assert.equal(Number((await pool.query('SELECT count(*) AS n FROM private.galx_image_requests WHERE user_id=$1 AND idempotency_key=$2',[id,key])).rows[0].n),0);
    assert.equal(Number((await pool.query('SELECT count(*) AS n FROM private.galx_image_usage_reservations WHERE user_id=$1',[id])).rows[0].n),0);checks++;
  }
  assert.deepEqual(await snapshot(),history);checks++;

  // Current purchased admission progresses with the legacy policy row locked.
  await pool.query(`INSERT INTO private.galx_plan_subscriptions
    (subscription_id,user_id,customer_id,price_id,plan_key,status,period_end,event_created)
    VALUES($1,$2,$3,'price_fixture','team-v1','active',now()+interval '30 days',1)`,
    [`sub_${paid}`,paid,`cus_${paid}`]);
  const locked=await pool.connect();
  const independent=new Pool({connectionString:process.env.DATABASE_URL,statement_timeout:500});
  try {
    await locked.query('BEGIN');
    await locked.query("SELECT 1 FROM private.galx_free_generation_policy WHERE kind='image' FOR UPDATE");
    const key=randomUUID(),repo=new ImageRequestRepository(independent);
    const receipt=await repo.create(paid,{...payload,idempotencyKey:key},true,'private');
    assert.equal(receipt.work_class,'private');
    assert.equal((await repo.create(paid,{...payload,idempotencyKey:key},true,'private')).id,receipt.id);
    assert.equal(Number((await independent.query('SELECT count(*) AS n FROM private.galx_image_usage_reservations WHERE operation_id=$1',[receipt.id])).rows[0].n),1);
    assert.equal((await repo.claim(paid,receipt.id))?.state,'generating');checks++;
  } finally {await locked.query('ROLLBACK');locked.release();await independent.end();}
  assert.deepEqual(await snapshot(),history);checks++;

  // Current canonical ownership retains the established Auth link. Neither an
  // unavailable old identity nor a fresh account can revive a retired benefit.
  await assert.rejects(pool.query('DELETE FROM auth.users WHERE id=$1',[owner]),
    (error:unknown)=>(error as {code:string}).code==='55000');
  await pool.query('UPDATE auth.users SET deleted_at=now() WHERE id=$1',[owner]);
  assert.deepEqual(await readFreeGenerationQuota(pool,owner),zero);
  const replacement=randomUUID();
  await pool.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,now())',
    [replacement,`${replacement}@quota.invalid`]);
  assert.deepEqual(await readFreeGenerationQuota(pool,replacement),zero);
  await assert.rejects(sites.create(replacement,randomUUID(),'Recreated free Site',true),FreeQuotaError);
  await assert.rejects(images.create(replacement,payload,false,'private'),ImageAllowanceError);
  assert.deepEqual(await snapshot(),history);checks++;

  for(const table of ['galx_free_generation_grants','galx_free_generation_usage']){
    const security=(await pool.query('SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid=$1::regclass',
      [`private.${table}`])).rows[0];assert(security.relrowsecurity&&security.relforcerowsecurity);
    for(const role of ['anon','authenticated','service_role'])for(const sql of [
      `SELECT * FROM private.${table}`,`DELETE FROM private.${table}`,
      `INSERT INTO private.${table} DEFAULT VALUES`,`UPDATE private.${table} SET user_id=user_id`,
    ]){
      const db=await pool.connect();
      try {await db.query('BEGIN');await db.query(`SET LOCAL ROLE ${role}`);
        await assert.rejects(db.query(sql),(error:unknown)=>(error as {code:string}).code==='42501');
      } finally {await db.query('ROLLBACK');db.release();}checks++;
    }
  }
  await pool.query(readFileSync(new URL('../supabase/rollbacks/20260914030425_free_generation_quota.down.sql',import.meta.url),'utf8'));
  assert.deepEqual(await readFreeGenerationQuota(pool,replacement),zero);
  assert.deepEqual(await snapshot(),history);checks++;
  console.log(JSON.stringify({checks,failed:0,scope:'Retired free entry points, preserved ledger, current purchased image admission and historical gate compatibility; disposable PostgreSQL, no generation/payment services'}));
} finally {await cold.end();await pool.end();}
