import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { readFreeGenerationQuota, FreeQuotaError } from '../src/lib/billing/free-generation-quota';
import { SitesWorkspaceRepository } from '../src/lib/sites/workspace-repository';
import { ImageRequestRepository } from '../src/lib/images/request-repository';
import { ImageRequestService } from '../src/lib/images/request-service';
import { ImageCapacityError } from '../src/core/router/ImageCapacityError';
import { settleFreeCapacity } from '../src/lib/billing/free-generation-gate';
import { runFreeGateChecks } from './test-free-generation-gate-db';
import { generationAccess } from '../src/lib/billing/generation-access';
import { StripeEngine } from '../src/lib/stripe/stripe';
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:12});
const sites=new SitesWorkspaceRepository(pool), images=new ImageRequestRepository(pool);
const owner=randomUUID(), other=randomUUID(), pro=randomUUID();
const payload={prompt:'A teapot',model:'image',n:1,size:'1024x1024',quality:'standard' as const};
let checks=0;
const account=async(id:string,email=`${id}@quota.invalid`,confirmed=true)=>pool.query(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,CASE WHEN $3 THEN now() ELSE NULL END)`,[id,email,confirmed]);
try {
  const migration=readFileSync(new URL('../supabase/migrations/20260914030425_free_generation_quota.sql',import.meta.url),'utf8');
  await pool.query(migration);await pool.query(migration);checks++;
  checks+=await runFreeGateChecks(pool);
  await pool.query("UPDATE private.galx_free_generation_policy SET enabled=true,valid_until=now()+interval '1 hour',max_outstanding=100,max_hour_units=1000,max_day_units=10000,max_total_units=100000");
  await account(owner);await account(other);await account(pro);
  const cold=new Pool({connectionString:process.env.DATABASE_URL,max:2});
  try {
    const snapshots=await Promise.all(Array.from({length:8},()=>readFreeGenerationQuota(pool,owner)));
    snapshots.forEach(q=>assert.deepEqual(q,{sites:1,images:5,siteTurns:3}));
    assert.deepEqual(await readFreeGenerationQuota(cold,owner),snapshots[0]);checks++;
    assert.equal(Number((await pool.query('SELECT allowance_usd FROM private.galx_free_generation_grants WHERE user_id=$1',[owner])).rows[0].allowance_usd),5);checks++;
    const creation=await Promise.allSettled(Array.from({length:6},()=>sites.create(owner,randomUUID(),'Free site',true)));
    assert.equal(creation.filter(r=>r.status==='fulfilled').length,1);checks++;
    let site=(creation.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<any>).value;
    assert.equal((await sites.create(owner,site.id,'Retry',true)).id,site.id);
    assert.deepEqual(await readFreeGenerationQuota(pool,owner),{sites:0,images:5,siteTurns:3});checks++;
    await assert.rejects(sites.begin(other,site.id,site.revision,randomUUID(),'Wrong owner','build',true));
    assert.deepEqual(await readFreeGenerationQuota(pool,other),{sites:1,images:5,siteTurns:3});checks++;
    for(let i=0;i<3;i++) {
      const operation=randomUUID();
      await sites.begin(owner,site.id,site.revision,operation,'Build','build',true);
      site=await sites.finish(owner,site.id,operation,null,'Reply');
      await settleFreeCapacity(pool,owner,'site',`${site.id}:${operation}`);
    }
    await assert.rejects(sites.begin(owner,site.id,site.revision,randomUUID(),'Fourth','discuss',true),FreeQuotaError);
    assert.equal((await readFreeGenerationQuota(pool,owner)).siteTurns,0);checks++;
    site=await sites.update(owner,site.id,site.revision,{archived:true});
    await assert.rejects(sites.create(owner,randomUUID(),'Reset',true),FreeQuotaError);checks++;
    const key=randomUUID();
    const duplicates=await Promise.all(Array.from({length:5},()=>images.create(owner,{...payload,n:4,idempotencyKey:key},false,true)));
    assert.equal(new Set(duplicates.map(r=>r.id)).size,1);
    assert.equal((await readFreeGenerationQuota(cold,owner)).images,1);checks++;
    await settleFreeCapacity(pool,owner,'image',duplicates[0].id);
    const fifth=await Promise.allSettled(Array.from({length:5},()=>images.create(owner,{...payload,idempotencyKey:randomUUID()},false,true)));
    assert.equal(fifth.filter(r=>r.status==='fulfilled').length,1);
    assert.equal((await readFreeGenerationQuota(pool,owner)).images,0);checks++;
    assert.equal(Number((await pool.query('SELECT count(*) FROM private.galx_image_requests WHERE user_id=$1',[owner])).rows[0].count),2);checks++;
    await assert.rejects(images.create(owner,{...payload,n:2,idempotencyKey:randomUUID()},false,true),FreeQuotaError);checks++;
    await settleFreeCapacity(pool,owner,'image',(fifth.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<any>).value.id);
    const batch=duplicates[0];
    assert.equal(await images.cancel(other,batch.id),false);
    assert(await images.cancel(owner,batch.id));assert.equal(await images.cancel(owner,batch.id),false);
    assert.equal((await readFreeGenerationQuota(pool,owner)).images,4);checks++;
    assert.equal((await images.create(owner,{...payload,n:4,idempotencyKey:key},false,true)).state,'cancelled');
    assert.equal((await readFreeGenerationQuota(pool,owner)).images,4,'cancelled replay does not deduct again');checks++;
    const deferredKey=randomUUID(),deferred=await images.create(owner,{...payload,idempotencyKey:deferredKey},false,true);
    await new ImageRequestService(images,async()=>{throw new ImageCapacityError();},()=>{}).run(owner,deferred.id);
    assert.equal((await images.get(owner,deferred.id))?.state,'failed');
    assert.equal((await readFreeGenerationQuota(pool,owner)).images,4,'proven non-start returns quota');
    assert.equal((await images.create(owner,{...payload,idempotencyKey:deferredKey},false,true)).state,'failed');checks++;
    const failed=await images.create(owner,{...payload,n:4,idempotencyKey:randomUUID()},false,true);
    await images.claim(owner,failed.id);await images.fail(owner,failed.id);
    assert.equal((await readFreeGenerationQuota(pool,owner)).images,0,'ambiguous failure retains deduction');checks++;
    const proSite=await sites.create(pro,randomUUID(),'Pro');
    let revision=proSite.revision;
    for(let i=0;i<4;i++){const op=randomUUID();await sites.begin(pro,proSite.id,revision,op,'Pro');revision=(await sites.finish(pro,proSite.id,op,null,'Done')).revision;}
    await Promise.all(Array.from({length:6},()=>images.create(pro,{...payload,idempotencyKey:randomUUID()},true)));
    const paidKey=randomUUID(),paidImage=await images.create(pro,{...payload,idempotencyKey:paidKey},true);
    assert.equal((await images.create(pro,{...payload,idempotencyKey:paidKey},false,true)).id,paidImage.id);
    assert.deepEqual(await readFreeGenerationQuota(pool,pro),{sites:1,images:5,siteTurns:3});checks++;
    const refundable=await sites.create(other,randomUUID(),'Deferred site',true),op=randomUUID();
    await sites.begin(other,refundable.id,refundable.revision,op,'Not started','build',true);
    await sites.finish(other,refundable.id,randomUUID(),null,'Wrong operation',null,true,true);
    assert.equal((await readFreeGenerationQuota(pool,other)).siteTurns,2,'unrelated operation cannot refund');
    await sites.finish(other,refundable.id,op,null,'Not started',null,true,true);
    await sites.finish(other,refundable.id,op,null,'Replay',null,true,true);
    assert.equal((await readFreeGenerationQuota(pool,other)).siteTurns,3);checks++;
    await sites.requireFreeSite(other,refundable.id);
    await assert.rejects(sites.requireFreeSite(pro,proSite.id),FreeQuotaError);checks++;
    const expired=await images.create(other,{...payload,idempotencyKey:randomUUID()},false,true);
    await pool.query("UPDATE private.galx_image_requests SET created_at=now()-interval '6 minutes' WHERE id=$1",[expired.id]);
    assert.equal((await readFreeGenerationQuota(pool,other)).images,5);
    assert.equal(await images.claim(other,expired.id),null);
    assert.equal((await images.get(other,expired.id))?.state,'failed');checks++;
    await pool.query("UPDATE auth.users SET raw_app_meta_data='{"+'"galx_pro":true'+"}' WHERE id=$1",[pro]);
    const saved=StripeEngine.getInstance;StripeEngine.getInstance=()=>({getClient:()=>null}) as any;
    try { assert.equal(await generationAccess(pro,pool,{mode:'enforce',pool_id:'fixture',revision:1,limits:{} as any,paid_price_ids:['price_fixture']}),'pro'); }
    finally{StripeEngine.getInstance=saved;} checks++;
    const unverified=randomUUID();await account(unverified,undefined,false);
    await assert.rejects(readFreeGenerationQuota(pool,unverified),FreeQuotaError);checks++;
    for(const condition of ["is_anonymous=true","deleted_at=now()","banned_until=now()+interval '1 hour'"]){
      const denied=randomUUID();await account(denied);
      await pool.query(`UPDATE auth.users SET ${condition} WHERE id=$1`,[denied]);
      await assert.rejects(readFreeGenerationQuota(pool,denied),FreeQuotaError);checks++;
    }
    await pool.query('DELETE FROM auth.users WHERE id=$1',[owner]);
    const replacement=randomUUID();await account(replacement,` ${owner.toUpperCase()}@QUOTA.INVALID `);
    assert.deepEqual(await readFreeGenerationQuota(pool,replacement),{sites:0,images:0,siteTurns:0});
    await assert.rejects(sites.create(replacement,randomUUID(),'Recreated',true),FreeQuotaError);checks++;
    for(const table of ['galx_free_generation_grants','galx_free_generation_usage']) {
      const security=(await pool.query('SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid=$1::regclass',[`private.${table}`])).rows[0];
      assert(security.relrowsecurity&&security.relforcerowsecurity);
      for(const role of ['anon','authenticated','service_role']) for(const sql of [`SELECT * FROM private.${table}`,`DELETE FROM private.${table}`,`INSERT INTO private.${table} DEFAULT VALUES`,`UPDATE private.${table} SET user_id=user_id`]) {
        const db=await pool.connect();try{await db.query('BEGIN');await db.query(`SET LOCAL ROLE ${role}`);await assert.rejects(db.query(sql),(e:any)=>e.code==='42501');}
        finally{await db.query('ROLLBACK');db.release();}checks++;
      }
    }
    await pool.query(readFileSync(new URL('../supabase/rollbacks/20260914030425_free_generation_quota.down.sql',import.meta.url),'utf8'));
    assert.equal((await readFreeGenerationQuota(pool,replacement)).images,0);checks++;
  } finally {await cold.end();}
  console.log(JSON.stringify({checks,failed:0,scope:'disposable PostgreSQL; no generation or payment services'}));
} finally {await pool.end();}
