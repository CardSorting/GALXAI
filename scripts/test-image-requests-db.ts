import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { ImageRequestRepository, ImageRequestConflict } from '../src/lib/images/request-repository';
import { ImageRequestService } from '../src/lib/images/request-service';
import { ImageAllowanceError, readImageAllowance } from '../src/lib/billing/image-allowance';
import { IMAGE_ALLOWANCE_CONFIGURATION, type ImageAllowanceConfiguration } from '../src/lib/billing/image-allowance-config';
import { RelayDispatchError } from '../src/core/router/adapters/RelayChatTransport';
import { ImageLibraryRepository } from '../src/lib/supabase/repositories/ImageLibraryRepository';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
const otherPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const approvedFixture = IMAGE_ALLOWANCE_CONFIGURATION;
const unapprovedFixture = {
  ...IMAGE_ALLOWANCE_CONFIGURATION,
  plans: { ...IMAGE_ALLOWANCE_CONFIGURATION.plans, 'creator-v1': { status: 'UNAPPROVED' as const } },
} satisfies ImageAllowanceConfiguration;
const repo = new ImageRequestRepository(pool, approvedFixture), cold = new ImageRequestRepository(otherPool, approvedFixture);
globalThis.__galx_pg_pool=pool;
const owner=randomUUID(), other=randomUUID();
const budgetOwner=randomUUID();
const payload={prompt:'A blue teapot',model:'image',n:1,size:'1024x1024',quality:'standard' as const,response_format:'url' as const,sessionId:'default',idempotencyKey:randomUUID()};
let checks=0;
const asset = async (id:string,user=owner,generationId?:string,workClass:'private'|'star_published'='private') => {
  await pool.query('SELECT public.fn_batch_upsert_image_library($1::jsonb)',[JSON.stringify([{id,user_id:user,generation_id:generationId,
    prompt:payload.prompt,model:'image',public_url:'https://galx.ai/v1/images/assets/fixture',r2_key:`${workClass==='star_published'?'published':'private'}/test/${id}`,
    sha256:'a'.repeat(64),size_bytes:2048,metadata:generationId?{requestId:generationId}:{}}])]);
};
try {
  const migration=readFileSync(new URL('../supabase/migrations/20260913025900_durable_image_requests.sql',import.meta.url),'utf8');
  await pool.query(migration); await pool.query(migration); checks++;
  const workBoundary=readFileSync(new URL('../supabase/migrations/20260924020000_private_human_works_star_publication_boundary.sql',import.meta.url),'utf8');
  const allowanceMigration=readFileSync(new URL('../supabase/migrations/20260924030000_private_image_allowance_accounting.sql',import.meta.url),'utf8');
  await pool.query(workBoundary); await pool.query(workBoundary);
  await pool.query(allowanceMigration); await pool.query(allowanceMigration); checks++;
  assert.equal(Number((await pool.query(`SELECT count(*)::int AS count FROM pg_proc
    WHERE pronamespace='public'::regnamespace AND proname='fn_batch_mutate_image_library'`)).rows[0].count),1);
  assert.equal((await pool.query("SELECT to_regprocedure('public.fn_batch_mutate_image_library(text,text[],text,boolean)') IS NULL AS removed")).rows[0].removed,true); checks++;
  for (const [id,planKey] of [[owner,'creator-v1'],[other,'creator-v1'],[budgetOwner,'creator-v1']] as const) {
    await pool.query(`INSERT INTO private.galx_plan_subscriptions(subscription_id,user_id,customer_id,price_id,plan_key,status,period_end,event_created)
      VALUES($1,$2,$3,'price_fixture',$4,'active',now()+interval '30 days',1)
      ON CONFLICT(subscription_id) DO NOTHING`,[`sub_${id}`,id,`cus_${id}`,planKey]);
  }
  const unapprovedRepo = new ImageRequestRepository(pool, unapprovedFixture);
  const deniedPayload = { ...payload, idempotencyKey: randomUUID() };
  await assert.rejects(unapprovedRepo.create(owner,deniedPayload,false,'private'),
    (error: any) => error instanceof ImageAllowanceError && error.code === 'image_allowance_unavailable');
  assert.equal(Number((await pool.query('SELECT count(*)::int AS count FROM private.galx_image_requests WHERE user_id=$1 AND idempotency_key=$2',[owner,deniedPayload.idempotencyKey])).rows[0].count),0);
  checks++;
  const receipts=await Promise.all(Array.from({length:12},()=>repo.create(owner,payload,false,'private')));
  assert.equal(new Set(receipts.map(r=>r.id)).size,1);
  assert.equal(Number((await pool.query('SELECT count(*)::int AS count FROM private.galx_image_usage_reservations WHERE operation_id=$1',[receipts[0].id])).rows[0].count),1); checks++;
  const id=receipts[0].id;
  assert.deepEqual((await pool.query('SELECT state,units FROM private.galx_image_usage_reservations WHERE operation_id=$1',[id])).rows[0],
    { state: 'reserved', units: 1 });
  const allowanceAfterReservation = await readImageAllowance(owner,pool,approvedFixture);
  assert.equal(allowanceAfterReservation?.totalUnits,100);
  assert.equal(allowanceAfterReservation?.usedUnits,1);
  assert.equal(allowanceAfterReservation?.remainingUnits,99); checks++;
  assert.equal((await cold.get(owner,id))?.state,'queued'); assert.equal(await cold.get(other,id),null); checks++;
  await assert.rejects(repo.create(owner,{...payload,prompt:'Different'},false,'private'),ImageRequestConflict); checks++;
  const isolated=await repo.create(other,payload,false,'private'); assert.notEqual(isolated.id,id); checks++;
  assert.equal(await cold.claim(other,id),null); assert.equal(await cold.cancel(other,id),false); checks++;
  const claims=await Promise.all([repo.claim(owner,id),cold.claim(owner,id)]);
  assert.equal(claims.filter(Boolean).length,1); assert.equal(await cold.cancel(owner,id),false); checks++;
  await assert.rejects(repo.complete(owner,id,['missing'])); assert.equal((await cold.get(owner,id))?.state,'generating'); checks++;
  await asset('foreign',other); await assert.rejects(repo.complete(owner,id,['foreign'])); checks++;
  await asset('owned',owner,id); await repo.complete(owner,id,['owned']);
  assert.deepEqual((await cold.get(owner,id))?.asset_ids,['owned']); assert.equal((await cold.get(owner,id))?.state,'completed');
  assert.equal((await pool.query('SELECT state FROM private.galx_image_usage_reservations WHERE operation_id=$1',[id])).rows[0].state,'settled');
  assert.deepEqual((await pool.query('SELECT work_class,is_public,visibility,is_explore_visible FROM public.user_image_library WHERE id=$1',['owned'])).rows[0],
    { work_class: 'private', is_public: false, visibility: 'private', is_explore_visible: false }); checks++;
  await cold.complete(owner,id,['owned']); assert.equal(await repo.claim(owner,id),null); checks++;
  const replay=await repo.create(owner,payload,false); assert.equal(replay.id,id); assert.equal(replay.state,'completed'); assert.equal(replay.response_format,'url'); checks++;
  assert.equal(Number((await pool.query('SELECT used_units FROM private.galx_image_plan_period_usage WHERE user_id=$1 AND subscription_id=$2',[owner,`sub_${owner}`])).rows[0].used_units),1);
  assert.equal(Number((await pool.query('SELECT count(*)::int AS count FROM private.galx_image_usage_reservations WHERE operation_id=$1',[id])).rows[0].count),1); checks++;
  const library=ImageLibraryRepository.getInstance();
  assert.equal((await library.toggleFavorite(owner,'owned',true))?.isFavorite,true);
  assert.equal((await otherPool.query('SELECT is_favorite FROM public.user_image_library WHERE id=$1',['owned'])).rows[0].is_favorite,true); checks++;
  assert.equal(await library.toggleFavorite(other,'owned',false),null);
  assert.equal((await otherPool.query('SELECT is_favorite FROM public.user_image_library WHERE id=$1',['owned'])).rows[0].is_favorite,true); checks++;
  assert.equal((await library.toggleFavorite(owner,'owned',false))?.isFavorite,false); checks++;
  const cancelled=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false,'private');
  assert(await cold.cancel(owner,cancelled.id)); assert.equal(await repo.claim(owner,cancelled.id),null); checks++;
  assert.equal((await pool.query('SELECT state FROM private.galx_image_usage_reservations WHERE operation_id=$1',[cancelled.id])).rows[0].state,'released'); checks++;
  const usageAfterCancel=Number((await pool.query('SELECT used_units FROM private.galx_image_plan_period_usage WHERE user_id=$1 AND subscription_id=$2',[owner,`sub_${owner}`])).rows[0].used_units);
  assert.equal(await repo.cancel(owner,cancelled.id),false);
  assert.equal((await pool.query('SELECT state FROM private.galx_image_usage_reservations WHERE operation_id=$1',[cancelled.id])).rows[0].state,'released');
  assert.equal(Number((await pool.query('SELECT used_units FROM private.galx_image_plan_period_usage WHERE user_id=$1 AND subscription_id=$2',[owner,`sub_${owner}`])).rows[0].used_units),usageAfterCancel); checks++;
  const expired=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false,'private');
  await pool.query("UPDATE private.galx_image_requests SET created_at=now()-interval '10 minutes' WHERE id=$1",[expired.id]);
  const usedBeforeExpiry=Number((await pool.query('SELECT used_units FROM private.galx_image_plan_period_usage WHERE user_id=$1 AND subscription_id=$2',[owner,`sub_${owner}`])).rows[0].used_units);
  assert.equal((await cold.get(owner,expired.id))?.failure_code,'generation_not_started');
  assert.equal((await pool.query('SELECT state FROM private.galx_image_usage_reservations WHERE operation_id=$1',[expired.id])).rows[0].state,'released');
  const usedAfterExpiry=Number((await pool.query('SELECT used_units FROM private.galx_image_plan_period_usage WHERE user_id=$1 AND subscription_id=$2',[owner,`sub_${owner}`])).rows[0].used_units);
  assert.equal(usedAfterExpiry,usedBeforeExpiry-1); assert.equal((await cold.get(owner,expired.id))?.state,'failed');
  assert.equal(await repo.claim(owner,expired.id),null); assert.equal(Number((await pool.query('SELECT used_units FROM private.galx_image_plan_period_usage WHERE user_id=$1 AND subscription_id=$2',[owner,`sub_${owner}`])).rows[0].used_units),usedAfterExpiry); checks++;
  const interrupted=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false,'private'); await repo.claim(owner,interrupted.id);
  await pool.query("UPDATE private.galx_image_requests SET deadline_at=now()-interval '1 second' WHERE id=$1",[interrupted.id]);
  assert.equal((await cold.get(owner,interrupted.id))?.state,'failed'); assert.equal(await repo.claim(owner,interrupted.id),null); checks++;
  assert.equal((await pool.query('SELECT state FROM private.galx_image_usage_reservations WHERE operation_id=$1',[interrupted.id])).rows[0].state,'reserved'); checks++;
  // Two independent workers race on the same durable receipt; only one dispatches.
  const generated=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false,'private'); let calls=0;
  const generate=async(input:any)=>{calls++;await asset('generated',owner,input.requestId);return {data:[{asset_id:'generated'}]} as any;};
  const worker=new ImageRequestService(repo,generate,()=>{}), worker2=new ImageRequestService(cold,generate,()=>{});
  await Promise.all([worker.run(owner,generated.id),worker2.run(owner,generated.id)]);
  await worker2.run(owner,generated.id); assert.equal(calls,1); assert.equal((await cold.get(owner,generated.id))?.state,'completed'); checks++;
  assert.equal((await pool.query('SELECT state FROM private.galx_image_usage_reservations WHERE operation_id=$1',[generated.id])).rows[0].state,'settled'); checks++;
  const failed=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false,'private'); let attempts=0;
  const failing=new ImageRequestService(repo,async()=>{attempts++;throw new Error('ambiguous failure');},()=>{});
  await failing.run(owner,failed.id); await failing.run(owner,failed.id);
  assert.equal(attempts,1); assert.equal((await cold.get(owner,failed.id))?.state,'failed');
  assert.equal((await pool.query('SELECT state FROM private.galx_image_usage_reservations WHERE operation_id=$1',[failed.id])).rows[0].state,'reserved'); checks++;
  const busy=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false,'private');
  await repo.claim(owner,busy.id); await repo.fail(owner,busy.id,true);
  assert.equal((await cold.get(owner,busy.id))?.failure_code,'generation_not_started');
  assert.equal((await pool.query('SELECT state FROM private.galx_image_usage_reservations WHERE operation_id=$1',[busy.id])).rows[0].state,'released');
  const usageAfterPreDispatchRelease=Number((await pool.query('SELECT used_units FROM private.galx_image_plan_period_usage WHERE user_id=$1 AND subscription_id=$2',[owner,`sub_${owner}`])).rows[0].used_units);
  await repo.fail(owner,busy.id,true);
  assert.equal(Number((await pool.query('SELECT used_units FROM private.galx_image_plan_period_usage WHERE user_id=$1 AND subscription_id=$2',[owner,`sub_${owner}`])).rows[0].used_units),usageAfterPreDispatchRelease);
  assert.equal(await cold.claim(owner,busy.id),null);
  assert.equal((await cold.get(owner,failed.id))?.failure_code,null); checks++;
  for (const [state, code, status, expected] of [
    ['not_accepted','model_temporarily_unavailable',503,'generation_not_started'],
    ['unknown','model_temporarily_unavailable',503,null],
    ['accepted','model_temporarily_unavailable',503,null],
    ['not_accepted','unrecognized',503,null],
    ['not_accepted','model_temporarily_unavailable',502,null],
  ] as const) {
    const receipt=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false,'private');
    let dispatches=0;
    const service=new ImageRequestService(repo,async()=>{dispatches++;throw new RelayDispatchError('image_http_error',
      {status,executionState:state,upstreamCode:code});},()=>{});
    await service.run(owner,receipt.id); await service.run(owner,receipt.id);
    assert.equal(dispatches,1); assert.equal((await cold.get(owner,receipt.id))?.failure_code,expected); checks++;
    assert.equal((await pool.query('SELECT state FROM private.galx_image_usage_reservations WHERE operation_id=$1',[receipt.id])).rows[0].state,
      expected === 'generation_not_started' ? 'released' : 'reserved'); checks++;
  }
  // No success receipt when image persistence silently fails.
  const unsaved=await repo.create(owner,{...payload,idempotencyKey:randomUUID()},false,'private');
  await new ImageRequestService(repo,async()=>({data:[{asset_id:'unsaved'}]} as any),()=>{}).run(owner,unsaved.id);
  assert.equal((await cold.get(owner,unsaved.id))?.state,'failed'); checks++;
  const concurrentHdAttempts = await Promise.allSettled(Array.from({ length: 51 }, () =>
    repo.create(budgetOwner, { ...payload, quality: 'hd', idempotencyKey: randomUUID() }, false, 'private')));
  assert.equal(concurrentHdAttempts.filter(item => item.status === 'fulfilled').length, 50);
  assert.equal(concurrentHdAttempts.filter(item => item.status === 'rejected' && item.reason instanceof ImageAllowanceError &&
    item.reason.code === 'image_allowance_exhausted').length, 1);
  assert.equal(Number((await pool.query("SELECT used_units FROM private.galx_image_plan_period_usage WHERE user_id=$1 AND plan_key='creator-v1'",[budgetOwner])).rows[0].used_units),100);
  assert.equal(Number((await pool.query("SELECT count(*)::int AS count FROM private.galx_image_usage_reservations WHERE user_id=$1 AND units=2 AND state='reserved'",[budgetOwner])).rows[0].count),50); checks++;
  await assert.rejects(repo.create(owner,{...payload,idempotencyKey:randomUUID()},false,'star_published'));
  checks++;
  const humanPublishAttempt = `human-publish-${randomUUID()}`;
  await assert.rejects(pool.query(`INSERT INTO public.user_image_library
    (id,user_id,session_id,status,prompt,model,public_url,r2_key,size_bytes,sha256,work_class,is_public,visibility,is_explore_visible)
    VALUES($1,$2,'default','completed','forged','image','https://galx.ai/forged',$3,2048,$4,'star_published',true,'public',true)`,
  [humanPublishAttempt,owner,`published/forged/${humanPublishAttempt}`,'c'.repeat(64)]),(error:any)=>error.code==='23514');
  await assert.rejects(pool.query("UPDATE public.user_image_library SET work_class='star_published' WHERE id='owned'"),
    (error:any)=>error.code==='23514');
  await assert.rejects(pool.query("UPDATE public.user_image_library SET is_public=true,visibility='public',is_explore_visible=true WHERE id='owned'"),
    (error:any)=>error.code==='23514');
  await assert.rejects(pool.query("SELECT public.fn_batch_mutate_image_library($1,ARRAY['owned'],'visibility',true,'public')",[owner]),
    (error:any)=>error.code==='42501'); checks++;

  // Build one controlled Star identity, then exercise the same internal image
  // request and durable asset pipeline used by authorized Star publishing.
  const starAccount=`galx_star_${randomUUID()}`;
  await pool.query("INSERT INTO private.galx_account_identities(account_id,account_class) VALUES($1,'autonomous')",[starAccount]);
  const runId=(await pool.query(`INSERT INTO private.galx_autonomous_actor_runs(run_key,control_owner_account_id,state)
    VALUES($1,$2,'active') RETURNING run_id`,[`phase4-${randomUUID()}`,owner])).rows[0].run_id as string;
  const cohortId=(await pool.query(`INSERT INTO private.galx_star_cohorts(run_id,cohort_key,label,state,activated_at)
    VALUES($1,$2,'Phase 4 fixture','active',now()) RETURNING cohort_id`,[runId,`phase4-${randomUUID()}`])).rows[0].cohort_id as string;
  const actorId=(await pool.query(`INSERT INTO private.galx_autonomous_actors(account_id,run_id,cohort_id,control_owner_account_id,provisioning_source,is_enabled)
    VALUES($1,$2,$3,$4,'test',true) RETURNING actor_id`,[starAccount,runId,cohortId,owner])).rows[0].actor_id as string;
  const starProfileId=(await pool.query('SELECT profile_id FROM private.galx_account_identities WHERE account_id=$1',[starAccount])).rows[0].profile_id as string;
  const handle=`phase4-${randomUUID().slice(0,8)}`;
  await pool.query(`INSERT INTO private.galx_star_profiles(actor_id,account_profile_id,cohort_id,handle,bio,interests)
    VALUES($1,$2,$3,$4,'A controlled publishing fixture.',$5)`,[actorId,starProfileId,cohortId,handle,['fixture']]);
  const starRepo=new ImageRequestRepository(pool,IMAGE_ALLOWANCE_CONFIGURATION);
  const starRequest=await starRepo.create(starAccount,{...payload,idempotencyKey:randomUUID()},false,'star_published');
  assert.equal((await starRepo.claim(starAccount,starRequest.id))?.work_class,'star_published');
  await asset('published-work',starAccount,starRequest.id,'star_published');
  await starRepo.complete(starAccount,starRequest.id,['published-work']);
  assert.deepEqual((await pool.query('SELECT work_class,is_public,visibility,is_explore_visible FROM public.user_image_library WHERE id=$1',['published-work'])).rows[0],
    { work_class: 'star_published', is_public: true, visibility: 'public', is_explore_visible: true });
  const feedIds=(await pool.query('SELECT id FROM public.community_creations_feed')).rows.map(row=>row.id);
  const archiveIds=(await pool.query('SELECT id FROM public.community_star_profile_creations WHERE user_id=$1',[starAccount])).rows.map(row=>row.id);
  assert(feedIds.includes('published-work')); assert(archiveIds.includes('published-work'));
  assert(!feedIds.includes('owned')); assert(!archiveIds.includes('owned'));
  const participant=(await pool.query('SELECT * FROM public.community_participant_profiles WHERE handle=$1',[handle])).rows[0];
  assert.equal(participant.participant_kind,'star');
  assert.deepEqual(Object.keys(participant).sort(),['avatar_url','bio','created_at','creation_count','display_name','handle','interests','participant_kind'].sort());
  const grants=(await pool.query(`SELECT has_table_privilege('anon','public.user_image_library','SELECT') AS anon_select,
      has_table_privilege('authenticated','public.user_image_library','SELECT') AS auth_select,
      has_table_privilege('anon','public.user_image_library','INSERT') AS anon_insert,
      has_table_privilege('anon','public.user_image_library','UPDATE') AS anon_update,
      has_table_privilege('anon','public.user_image_library','DELETE') AS anon_delete,
      has_table_privilege('authenticated','public.user_image_library','INSERT') AS auth_insert,
      has_table_privilege('authenticated','public.user_image_library','UPDATE') AS auth_update,
      has_table_privilege('authenticated','public.user_image_library','DELETE') AS auth_delete,
      has_table_privilege('anon','public.community_creations_feed','SELECT') AS anon_feed,
      has_table_privilege('authenticated','public.community_creations_feed','SELECT') AS auth_feed,
      has_table_privilege('anon','public.community_star_profile_creations','SELECT') AS anon_archive,
      has_table_privilege('authenticated','public.community_star_profile_creations','SELECT') AS auth_archive,
      has_table_privilege('service_role','public.community_creations_feed','SELECT') AS service_feed,
      has_table_privilege('service_role','public.community_star_profile_creations','SELECT') AS service_archive,
      has_table_privilege('anon','public.community_participant_profiles','SELECT') AS anon_profiles,
      has_table_privilege('authenticated','public.community_participant_profiles','SELECT') AS auth_profiles,
      has_table_privilege('service_role','public.community_participant_profiles','SELECT') AS service_profiles`)).rows[0];
  assert.deepEqual(grants,{anon_select:false,auth_select:false,anon_insert:false,anon_update:false,anon_delete:false,
    auth_insert:false,auth_update:false,auth_delete:false,anon_feed:false,auth_feed:false,anon_archive:false,auth_archive:false,
    service_feed:true,service_archive:true,anon_profiles:true,auth_profiles:true,service_profiles:true});
  const databaseGrants = (await pool.query(`SELECT
    COALESCE(bool_or(has_table_privilege(role_name,to_regclass(relation_name),privilege))
      FILTER (WHERE relation_name LIKE 'private.%'),false) AS browser_or_postgrest_private_access,
    COALESCE(bool_or(has_table_privilege(role_name,to_regclass(relation_name),privilege))
      FILTER (WHERE relation_name LIKE 'public.community_%' AND role_name IN ('anon','authenticated')),false) AS browser_view_write
    FROM (VALUES ('anon'),('authenticated'),('service_role')) AS roles(role_name)
    CROSS JOIN (VALUES ('public.community_creations_feed'),('public.community_star_profile_creations'),
      ('public.community_participant_profiles'),('private.galx_image_requests'),('private.galx_generation_records'),
      ('private.galx_generation_assets'),('private.galx_image_plan_period_usage'),
      ('private.galx_image_usage_reservations')) AS relations(relation_name)
    CROSS JOIN (VALUES ('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS privileges(privilege)`)).rows[0];
  const browserViewWritePrivileges = (await pool.query(`SELECT role_name, relation_name, privilege
    FROM (VALUES ('anon'),('authenticated')) AS roles(role_name)
    CROSS JOIN (VALUES ('public.community_creations_feed'),('public.community_star_profile_creations'),
      ('public.community_participant_profiles')) AS relations(relation_name)
    CROSS JOIN (VALUES ('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS privileges(privilege)
    WHERE has_table_privilege(role_name,to_regclass(relation_name),privilege)
    ORDER BY role_name,relation_name,privilege`)).rows;
  assert.deepEqual(browserViewWritePrivileges, [], `Unexpected browser write privileges: ${JSON.stringify(browserViewWritePrivileges)}`);
  assert.deepEqual(databaseGrants,{browser_or_postgrest_private_access:false,browser_view_write:false}); checks++;
  const viewRules=(await pool.query(`SELECT
    position('star_published' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_star,
    position('is_public' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_public,
    position('visibility' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_visibility,
    position('is_explore_visible' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_explore,
    position('account_class' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_autonomous,
    position('is_discoverable' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_discoverable,
    position('is_enabled' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_enabled,
    position('profile.status' in pg_get_viewdef('public.community_creations_feed'::regclass,true)) > 0 AS feed_active,
    position('star_published' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_star,
    position('is_public' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_public,
    position('visibility' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_visibility,
    position('account_class' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_autonomous,
    position('is_discoverable' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_discoverable,
    position('is_enabled' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_enabled,
    position('profile.status' in pg_get_viewdef('public.community_star_profile_creations'::regclass,true)) > 0 AS archive_active,
    position('account_class' in pg_get_viewdef('public.community_participant_profiles'::regclass,true)) > 0 AS profile_autonomous,
    position('is_discoverable' in pg_get_viewdef('public.community_participant_profiles'::regclass,true)) > 0 AS profile_discoverable,
    position('is_enabled' in pg_get_viewdef('public.community_participant_profiles'::regclass,true)) > 0 AS profile_enabled,
    position('profile.status' in pg_get_viewdef('public.community_participant_profiles'::regclass,true)) > 0 AS profile_active`)).rows[0];
  assert(Object.values(viewRules).every(Boolean)); checks++;
  for (const sql of [
    "INSERT INTO public.user_image_library(id,user_id,session_id,status,prompt,model,public_url,r2_key,size_bytes,sha256) VALUES('auth-forged',current_setting('request.jwt.claim.sub'),'default','completed','forged','image','https://galx.ai/forged','private/forged',2048,repeat('d',64))",
    "UPDATE public.user_image_library SET work_class='star_published',is_public=true,visibility='public',is_explore_visible=true WHERE id='owned'",
    "DELETE FROM public.user_image_library WHERE id='owned'",
    "SELECT public.fn_batch_mutate_image_library(current_setting('request.jwt.claim.sub'),ARRAY['owned'],'visibility',true,'public')",
  ]) {
    const client=await pool.connect();
    try { await client.query('BEGIN'); await client.query('SET LOCAL ROLE authenticated');
      await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[owner]);
      await assert.rejects(client.query(sql),(error:any)=>error.code==='42501');
    } finally { await client.query('ROLLBACK'); client.release(); }
    checks++;
  }
  const ownerLibrary = async (userId:string) => {
    const client=await pool.connect();
    try { await client.query('BEGIN'); await client.query('SET LOCAL ROLE service_role');
      return (await client.query('SELECT public.fn_query_user_image_library($1,48) AS result',[userId])).rows[0].result.records.map((row:any)=>row.id);
    } finally { await client.query('ROLLBACK'); client.release(); }
  };
  const ownerAssets=await ownerLibrary(owner), otherAssets=await ownerLibrary(other);
  assert(ownerAssets.includes('owned')); assert(!ownerAssets.includes('foreign'));
  assert(otherAssets.includes('foreign')); assert(!otherAssets.includes('owned'));
  const serviceViewClient=await pool.connect();
  try {
    await serviceViewClient.query('BEGIN'); await serviceViewClient.query('SET LOCAL ROLE service_role');
    const serviceFeed=(await serviceViewClient.query('SELECT id FROM public.community_creations_feed')).rows.map(row=>row.id);
    const serviceArchive=(await serviceViewClient.query('SELECT id FROM public.community_star_profile_creations WHERE user_id=$1',[starAccount])).rows.map(row=>row.id);
    assert(serviceFeed.includes('published-work')); assert(!serviceFeed.includes('owned'));
    assert(serviceArchive.includes('published-work')); assert(!serviceArchive.includes('owned'));
  } finally { await serviceViewClient.query('ROLLBACK'); serviceViewClient.release(); }
  checks++;
  for (const [role,claim] of [['anon',null],['authenticated',owner],['authenticated',other]] as const) {
    const client=await pool.connect();
    try {
      await client.query('BEGIN'); await client.query('GRANT SELECT ON public.user_image_library TO anon,authenticated');
      await client.query(`SET LOCAL ROLE ${role}`);
      if(role==='authenticated') await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[claim]);
      const expectDenied = async (sql: string) => {
        await client.query('SAVEPOINT permission_probe');
        try {
          await assert.rejects(client.query(sql),(error:any)=>error.code==='42501');
        } finally {
          await client.query('ROLLBACK TO SAVEPOINT permission_probe');
          await client.query('RELEASE SAVEPOINT permission_probe');
        }
      };
      const visible=(await client.query('SELECT id FROM public.user_image_library')).rows.map(row=>row.id);
      assert(visible.includes('published-work'));
      if(role==='anon') { assert(!visible.includes('owned')); assert(!visible.includes('foreign')); }
      if(role==='authenticated'&&claim===owner) { assert(visible.includes('owned')); assert(!visible.includes('foreign')); }
      if(role==='authenticated'&&claim===other) { assert(visible.includes('foreign')); assert(!visible.includes('owned')); }
      if(role==='anon') {
        const profiles=(await client.query('SELECT handle,participant_kind FROM public.community_participant_profiles')).rows;
        assert(profiles.some(row=>row.handle===handle&&row.participant_kind==='star'));
        await expectDenied('SELECT id FROM public.community_creations_feed');
      }
      await expectDenied('SELECT id FROM public.community_star_profile_creations');
    } finally { await client.query('ROLLBACK'); client.release(); }
    checks++;
  }
  assert.equal(Number((await pool.query("SELECT count(*)::int AS count FROM public.community_creations_feed WHERE id IN ('owned','foreign')")).rows[0].count),0);
  assert.equal(Number((await pool.query("SELECT count(*)::int AS count FROM private.galx_image_usage_reservations WHERE operation_id=$1",[starRequest.id])).rows[0].count),0); checks++;

  const legacyId=randomUUID();
  await pool.query(`INSERT INTO private.galx_image_requests(id,user_id,idempotency_key,payload_hash,payload,work_class)
    VALUES($1,$2,$3,$4,$5::jsonb,'private')`,[legacyId,owner,randomUUID(),'b'.repeat(64),JSON.stringify(payload)]);
  assert.equal(await repo.claim(owner,legacyId),null);
  assert.equal((await cold.get(owner,legacyId))?.failure_code,'generation_not_started'); checks++;
  const security=(await pool.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='private.galx_image_requests'::regclass")).rows[0];
  assert(security.relrowsecurity&&security.relforcerowsecurity); checks++;
  for(const role of ['anon','authenticated','service_role']) for(const sql of ['SELECT * FROM private.galx_image_requests',"UPDATE private.galx_image_requests SET user_id='attack'",'INSERT INTO private.galx_image_requests DEFAULT VALUES','DELETE FROM private.galx_image_requests']) {
    const db=await pool.connect();try{await db.query('BEGIN');await db.query(`SET LOCAL ROLE ${role}`);await assert.rejects(db.query(sql),(e:any)=>e.code==='42501');}
    finally{await db.query('ROLLBACK');db.release();} checks++;
  }
  await assert.rejects(pool.query("UPDATE private.galx_image_requests SET state='completed',asset_ids=NULL WHERE id=$1",[failed.id])); checks++;
  const down=readFileSync(new URL('../supabase/rollbacks/20260913025900_durable_image_requests.down.sql',import.meta.url),'utf8');
  await assert.rejects(pool.query(down)); assert.equal((await cold.get(owner,id))?.state,'completed'); checks++;
  const workBoundaryDown=readFileSync(new URL('../supabase/rollbacks/20260924020000_private_human_works_star_publication_boundary.down.sql',import.meta.url),'utf8');
  const allowanceDown=readFileSync(new URL('../supabase/rollbacks/20260924030000_private_image_allowance_accounting.down.sql',import.meta.url),'utf8');
  assert.match(workBoundaryDown,/Intentionally non-reversible/); assert.match(allowanceDown,/Intentionally non-reversible/);
  await pool.query(workBoundaryDown); await pool.query(allowanceDown);
  assert.equal((await pool.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.user_image_library'::regclass")).rows[0].relrowsecurity,true);
  assert.equal((await pool.query("SELECT work_class FROM public.user_image_library WHERE id='published-work'")).rows[0].work_class,'star_published'); checks++;
  console.log(JSON.stringify({checks,failed:0,scope:'disposable PostgreSQL only'}));
} finally { await Promise.all([pool.end(),otherPool.end()]); }
