import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function checkBoundary(admin,a) {
  let checks=0;
  const eq=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
  const deny=async(actor,sql,params=[],code='42501')=>{
    await assert.rejects(actor.query(sql,params),error=>error.code===code);checks++;
  };
  const registration='SELECT pool_lab.register_account($1,$2,$3,$4,$5,$6) result';
  const enroll=(actor,id,kind,op=randomUUID(),desktop=randomUUID(),label='Demo account')=>actor.query(registration,[op,id,desktop,kind,label,`fixture:${id}`]);
  const acquire='SELECT pool_lab.acquire($1,$2,$3,$4,$5) id';
  const digest='a'.repeat(64);
  const standardInstance='20000000-0000-4000-8000-000000000002';
  const premiumInstance='10000000-0000-4000-8000-000000000001';

  for(const [actor,kind] of [[a.premium_controller,'premium'],[a.standard_controller,'standard']]) {
    const context=(await actor.query('SELECT * FROM pool_lab.scope()')).rows[0];
    eq(context.pool_id,kind,'database login binds pool');
    // Caller-chosen settings cannot become an authorization source.
    const client=await actor.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.pool_id',$1,true),set_config('request.jwt.claims',$2,true)",[kind==='premium'?'standard':'premium',JSON.stringify({pool_id:kind==='premium'?'standard':'premium',role:'service_role'})]);
      eq((await client.query('SELECT pool_id FROM pool_lab.scope()')).rows[0].pool_id,kind,'forged settings do not change authority');
    } finally {await client.query('ROLLBACK');client.release();}
    await deny(actor,`SET ROLE pool_lab_${kind==='premium'?'standard':'premium'}_controller`);
    await deny(actor,'SET ROLE pool_lab_owner');
    await deny(actor,'SET SESSION AUTHORIZATION postgres');
  }
  for(const actor of [a.outsider,a.service]) {
    await deny(actor,'SELECT * FROM pool_lab.accounts');
    await deny(actor,registration,[randomUUID(),'fixture-forged',randomUUID(),'paid','forged','fixture:fake']);
  }
  await deny(a.standard_operator,registration,[randomUUID(),'fixture-class',randomUUID(),'paid','wrong class','fixture:fake'],'22023');
  const op=randomUUID(),desktop=randomUUID();
  const first=await enroll(a.premium_operator,'fixture-premium','paid',op,desktop);
  const replay=await enroll(a.premium_operator,'fixture-premium','paid',op,desktop);
  eq(first.rows,replay.rows,'same registration operation returns same result');
  eq(Object.keys(first.rows[0].result).sort(),['account_id','status'],'registration response allowlist');
  await deny(a.premium_operator,registration,[op,'fixture-other',desktop,'paid','changed','fixture:fake'],'40001');
  await enroll(a.standard_operator,'fixture-standard','free');
  eq((await a.premium_operator.query('SELECT pool_lab.registration_result($1) result',[op])).rows[0].result.status,'registered','lost acknowledgement recoverable');
  eq((await a.standard_operator.query('SELECT pool_lab.registration_result($1) result',[op])).rows[0].result.status,'unknown','foreign operation hidden');
  eq((await a.premium_controller.query('SELECT id FROM pool_lab.accounts')).rows.map(r=>r.id),['fixture-premium'],'unfiltered query remains scoped');
  eq((await a.standard_controller.query('SELECT * FROM pool_lab.credentials')).rows.map(r=>r.account_id),['fixture-standard'],'credentials scoped independently');
  eq((await a.standard_controller.query('SELECT * FROM pool_lab.credentials WHERE account_id=$1',['fixture-premium'])).rowCount,0,'foreign id invisible');
  eq((await a.standard_monitor.query('SELECT * FROM relay_standard.accounts')).rows.map(r=>r.id),['fixture-standard'],'monitor facade scoped');
  await deny(a.standard_monitor,'SELECT * FROM relay_premium.accounts');
  await deny(a.premium_monitor,'SELECT * FROM pool_lab.credentials');
  await deny(a.premium_operator,'SELECT * FROM pool_lab.credentials');
  await deny(a.premium_monitor,registration,[randomUUID(),'fixture-monitor',randomUUID(),'paid','monitor','fixture:fake']);
  await deny(a.premium_controller,registration,[randomUUID(),'fixture-controller',randomUUID(),'paid','controller','fixture:fake']);
  await deny(a.standard_controller,"UPDATE pool_lab.accounts SET pool_id='premium'");
  await deny(a.standard_controller,"UPDATE pool_lab.principals SET pool_id='premium'");
  await deny(a.standard_controller,"ALTER TABLE pool_lab.accounts DISABLE ROW LEVEL SECURITY");
  await deny(a.standard_controller,'TRUNCATE pool_lab.accounts');
  const noRls=await a.standard_controller.connect();
  try {
    await noRls.query('BEGIN');await noRls.query('SET LOCAL row_security=off');
    await deny(noRls,'SELECT id FROM pool_lab.accounts');
  } finally {await noRls.query('ROLLBACK');noRls.release();}
  await deny(a.standard_controller,'CREATE FUNCTION relay_standard.forbidden() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$');

  // A global unique identity survives pool filtering. Race two independent connections.
  const contenders=await Promise.allSettled([
    enroll(a.premium_operator,'fixture-race','paid'),enroll(a.standard_operator,'fixture-race','free')]);
  eq(contenders.filter(r=>r.status==='fulfilled').length,1,'one owner wins simultaneous cross-pool registration');
  const conflict=contenders.find(r=>r.status==='rejected').reason;
  eq(conflict.code,'23505','global uniqueness conflict');
  eq(conflict.message,'Account cannot be registered here','no foreign owner details in conflict');
  eq(conflict.detail,undefined,'raw unique detail removed');
  await deny(a.standard_operator,registration,[randomUUID(),'fixture-desktop',desktop,'free','duplicate desktop','fixture:fake'],'23505');

  // Constraints protect relationships even when an administrator bypasses RLS.
  await deny(admin,'INSERT INTO pool_lab.pool_workloads VALUES($1,$2)',['standard','images'],'23514');
  await deny(admin,'INSERT INTO pool_lab.credentials VALUES($1,$2,$3,$4,$5)',
    ['fixture-missing','standard',standardInstance,1,'fixture:fake'],'23503');
  await deny(admin,'INSERT INTO pool_lab.capabilities VALUES($1,$2,$3,$4,$5,now())',
    ['standard',standardInstance,'fixture-premium',1,'text'],'23503');
  await deny(admin,'INSERT INTO pool_lab.principals VALUES($1,$2,$3,$4,true)',
    ['pool_lab_forged','standard',premiumInstance,'controller'],'23503');

  await deny(a.standard_controller,acquire,[randomUUID(),'fixture-standard','images',digest,1]);
  await deny(a.standard_controller,acquire,[randomUUID(),'fixture-standard','sites',digest,1]);
  await deny(a.standard_controller,'SELECT pool_lab.record_fixture_verification($1,$2)',['fixture-standard','images']);
  eq((await admin.query('SELECT count(*)::int n FROM pool_lab.leases')).rows[0].n,0,'forbidden work does not create leases');
  await deny(a.standard_controller,acquire,[randomUUID(),'fixture-premium','text',digest,1]);
  await deny(a.premium_controller,acquire,[randomUUID(),'fixture-premium','images',digest,1],'55000');
  for(const workload of ['text','sites','images']) await a.premium_controller.query('SELECT pool_lab.record_fixture_verification($1,$2)',['fixture-premium',workload]);
  await a.standard_controller.query('SELECT pool_lab.record_fixture_verification($1,$2)',['fixture-standard','text']);
  await deny(a.standard_controller,acquire,[randomUUID(),'fixture-standard','text',digest,0],'40001');
  const request=randomUUID();
  const accepted=await a.premium_controller.query(acquire,[request,'fixture-premium','images',digest,1]);
  await admin.query("UPDATE pool_lab.leases SET state='unknown' WHERE id=$1",[accepted.rows[0].id]);
  const repeat=await a.premium_controller.query(acquire,[request,'fixture-premium','images',digest,1]);
  eq(repeat.rows[0].id,accepted.rows[0].id,'uncertain work keeps original lease');
  await deny(a.premium_controller,acquire,[request,'fixture-premium','text',digest,1],'40001');
  eq((await a.standard_controller.query('SELECT * FROM pool_lab.leases WHERE id=$1',[accepted.rows[0].id])).rowCount,0,'foreign lease hidden');
  const revision=(await a.premium_operator.query('SELECT pool_lab.set_paused($1,true,$2) revision',['fixture-premium',1])).rows[0].revision;
  await deny(a.premium_operator,'SELECT pool_lab.set_paused($1,false,$2)',['fixture-premium',1],'40001');
  await deny(a.premium_controller,acquire,[randomUUID(),'fixture-premium','images',digest,revision],'55000');
  eq((await a.premium_controller.query(acquire,[request,'fixture-premium','images',digest,1])).rows[0].id,accepted.rows[0].id,'pause preserves earlier recovery');
  await deny(admin,"UPDATE pool_lab.accounts SET pool_id='standard',instance_id=$1,account_class='free' WHERE id='fixture-premium'",[standardInstance],'23503');
  await admin.query("UPDATE pool_lab.capabilities SET verified_at=now()-interval '10 minutes' WHERE account_id='fixture-standard'");
  await deny(a.standard_controller,acquire,[randomUUID(),'fixture-standard','text',digest,1],'55000');
  await a.standard_controller.query('SELECT pool_lab.record_fixture_verification($1,$2)',['fixture-standard','text']);
  await a.standard_controller.query(acquire,[randomUUID(),'fixture-standard','text',digest,1]);checks++;

  // Defense in depth: accidentally granting writes still cannot insert/update foreign rows.
  await admin.query('GRANT INSERT,UPDATE,SELECT ON pool_lab.accounts TO pool_lab_standard_controller');
  try {
    await deny(a.standard_controller,'INSERT INTO pool_lab.accounts(id,pool_id,instance_id,desktop_id,account_class,label) VALUES($1,$2,$3,$4,$5,$6)',
      ['fixture-cross-write','premium',premiumInstance,randomUUID(),'paid','foreign']);
    eq((await a.standard_controller.query("UPDATE pool_lab.accounts SET label='forged' WHERE id='fixture-premium'")).rowCount,0,'RLS hides foreign updates');
    await deny(a.standard_controller,"UPDATE pool_lab.accounts SET pool_id='premium',instance_id=$1,account_class='paid' WHERE id='fixture-standard'",[premiumInstance]);
  } finally {await admin.query('REVOKE INSERT,UPDATE ON pool_lab.accounts FROM pool_lab_standard_controller');}
  await admin.query("UPDATE pool_lab.principals SET enabled=false WHERE role_name='pool_lab_standard_controller'");
  await deny(a.standard_controller,'SELECT account_id FROM pool_lab.credentials');
  await deny(a.standard_controller,acquire,[randomUUID(),'fixture-standard','text',digest,1]);
  eq((await a.premium_controller.query('SELECT pool_id FROM pool_lab.scope()')).rows[0].pool_id,'premium','revocation does not disable the other pool');
  const audit=await admin.query(`SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='pool_lab' AND c.relkind='r' AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)`);
  eq(audit.rows[0].n,0,'all lab tables have forced RLS');
  eq((await admin.query("SELECT rolbypassrls OR rolsuper AS unsafe FROM pg_roles WHERE rolname='pool_lab_owner'")).rows[0].unsafe,false,'definer owner does not bypass RLS');
  eq((await admin.query(`SELECT count(*)::int n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='pool_lab' AND has_function_privilege('pool_lab_outsider',p.oid,'EXECUTE')`)).rows[0].n,0,'no accidental PUBLIC function execution');
  console.log(`${checks} pool-boundary checks passed: real logins, RLS, grants, global uniqueness, composite ownership, capabilities, replay, freshness and revocation.`);
  console.log('Isolated schema proof only. Existing production tables, providers and controllers were not exercised.');
}
