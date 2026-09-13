import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { ImageRequestRepository, ImageRequestConflict } from '../src/lib/images/request-repository';
import { ImageRequestService } from '../src/lib/images/request-service';
import { ImageLibraryRepository } from '../src/lib/supabase/repositories/ImageLibraryRepository';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
const otherPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const repo = new ImageRequestRepository(pool), cold = new ImageRequestRepository(otherPool);
globalThis.__galx_pg_pool=pool;
const owner=randomUUID(), other=randomUUID();
const payload={prompt:'A blue teapot',model:'image',n:1,size:'1024x1024',quality:'standard' as const,response_format:'url' as const,sessionId:'default',idempotencyKey:randomUUID()};
let checks=0;
const asset = async (id:string,user=owner) => {
  await pool.query('SELECT public.fn_batch_upsert_image_library($1::jsonb)',[JSON.stringify([{id,user_id:user,prompt:payload.prompt,model:'image',public_url:'',r2_key:`private/test/${id}`,sha256:'a'.repeat(64)}])]);
};
try {
  const migration=readFileSync(new URL('../supabase/migrations/20260913025900_durable_image_requests.sql',import.meta.url),'utf8');
  await pool.query(migration); await pool.query(migration); checks++;
  const receipts=await Promise.all(Array.from({length:12},()=>repo.create(owner,payload,false)));
  assert.equal(new Set(receipts.map(r=>r.id)).size,1); checks++;
  const id=receipts[0].id;
  assert.equal((await cold.get(owner,id))?.state,'queued'); assert.equal(await cold.get(other,id),null); checks++;
  await assert.rejects(repo.create(owner,{...payload,prompt:'Different'},false),ImageRequestConflict); checks++;
  const isolated=await repo.create(other,payload,false); assert.notEqual(isolated.id,id); checks++;
  assert.equal(await cold.claim(other,id),null); assert.equal(await cold.cancel(other,id),false); checks++;
  const claims=await Promise.all([repo.claim(owner,id),cold.claim(owner,id)]);
  assert.equal(claims.filter(Boolean).length,1); assert.equal(await cold.cancel(owner,id),false); checks++;
  await assert.rejects(repo.complete(owner,id,['missing'])); assert.equal((await cold.get(owner,id))?.state,'generating'); checks++;
  await asset('foreign',other); await assert.rejects(repo.complete(owner,id,['foreign'])); checks++;
  await asset('owned'); await repo.complete(owner,id,['owned']);
  assert.deepEqual((await cold.get(owner,id))?.asset_ids,['owned']); assert.equal((await cold.get(owner,id))?.state,'completed'); checks++;
  await cold.complete(owner,id,['owned']); assert.equal(await repo.claim(owner,id),null); checks++;
  const replay=await repo.create(owner,payload,false); assert.equal(replay.id,id); assert.equal(replay.state,'completed'); assert.equal(replay.response_format,'url'); checks++;
  const library=ImageLibraryRepository.getInstance();
  assert.equal((await library.toggleFavorite(owner,'owned',true))?.isFavorite,true);
  assert.equal((await otherPool.query('SELECT is_favorite FROM public.user_image_library WHERE id=$1',['owned'])).rows[0].is_favorite,true); checks++;
  assert.equal(await library.toggleFavorite(other,'owned',false),null);
  assert.equal((await otherPool.query('SELECT is_favorite FROM public.user_image_library WHERE id=$1',['owned'])).rows[0].is_favorite,true); checks++;
  assert.equal((await library.toggleFavorite(owner,'owned',false))?.isFavorite,false); checks++;
  const cancelled=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false);
  assert(await cold.cancel(owner,cancelled.id)); assert.equal(await repo.claim(owner,cancelled.id),null); checks++;
  const expired=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false);
  await pool.query("UPDATE private.galx_image_requests SET created_at=now()-interval '10 minutes' WHERE id=$1",[expired.id]);
  assert.equal((await cold.get(owner,expired.id))?.state,'failed'); assert.equal(await repo.claim(owner,expired.id),null); checks++;
  const interrupted=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false); await repo.claim(owner,interrupted.id);
  await pool.query("UPDATE private.galx_image_requests SET deadline_at=now()-interval '1 second' WHERE id=$1",[interrupted.id]);
  assert.equal((await cold.get(owner,interrupted.id))?.state,'failed'); assert.equal(await repo.claim(owner,interrupted.id),null); checks++;
  // Two independent workers race on the same durable receipt; only one dispatches.
  const generated=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false); let calls=0;
  const generate=async()=>{calls++;await asset('generated');return {data:[{asset_id:'generated'}]} as any;};
  const worker=new ImageRequestService(repo,generate,()=>{}), worker2=new ImageRequestService(cold,generate,()=>{});
  await Promise.all([worker.run(owner,generated.id),worker2.run(owner,generated.id)]);
  await worker2.run(owner,generated.id); assert.equal(calls,1); assert.equal((await cold.get(owner,generated.id))?.state,'completed'); checks++;
  const failed=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false); let attempts=0;
  const failing=new ImageRequestService(repo,async()=>{attempts++;throw new Error('ambiguous failure');},()=>{});
  await failing.run(owner,failed.id); await failing.run(owner,failed.id);
  assert.equal(attempts,1); assert.equal((await cold.get(owner,failed.id))?.state,'failed'); checks++;
  // No success receipt when image persistence silently fails.
  const unsaved=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false);
  await new ImageRequestService(repo,async()=>({data:[{asset_id:'unsaved'}]} as any),()=>{}).run(owner,unsaved.id);
  assert.equal((await cold.get(owner,unsaved.id))?.state,'failed'); checks++;
  const security=(await pool.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='private.galx_image_requests'::regclass")).rows[0];
  assert(security.relrowsecurity&&security.relforcerowsecurity); checks++;
  for(const role of ['anon','authenticated','service_role']) for(const sql of ['SELECT * FROM private.galx_image_requests',"UPDATE private.galx_image_requests SET user_id='attack'",'INSERT INTO private.galx_image_requests DEFAULT VALUES','DELETE FROM private.galx_image_requests']) {
    const db=await pool.connect();try{await db.query('BEGIN');await db.query(`SET LOCAL ROLE ${role}`);await assert.rejects(db.query(sql),(e:any)=>e.code==='42501');}
    finally{await db.query('ROLLBACK');db.release();} checks++;
  }
  await assert.rejects(pool.query("UPDATE private.galx_image_requests SET state='completed',asset_ids=NULL WHERE id=$1",[failed.id])); checks++;
  const down=readFileSync(new URL('../supabase/rollbacks/20260913025900_durable_image_requests.down.sql',import.meta.url),'utf8');
  await assert.rejects(pool.query(down)); assert.equal((await cold.get(owner,id))?.state,'completed'); checks++;
  await pool.query('DELETE FROM private.galx_image_requests');await pool.query(down);await pool.query(migration); checks++;
  console.log(JSON.stringify({checks,failed:0,scope:'disposable PostgreSQL only'}));
} finally { await Promise.all([pool.end(),otherPool.end()]); }
