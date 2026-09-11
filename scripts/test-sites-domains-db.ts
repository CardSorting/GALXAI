/** Real concurrency tests in the guarded disposable PostgreSQL fixture. No dotenv. */
import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { SiteDomainRegistry } from '../src/lib/sites/domain-registry';
import { domainPlan } from '../src/lib/sites/domains';
const pool = new Pool({ connectionString: process.env.GALX_INTEGRATION_DATABASE_URL, connectionTimeoutMillis: 2000, max: 12 }); let checks = 0;
const sql = (filename: string) => readFileSync(new URL('../supabase/' + filename, import.meta.url), 'utf8');
try {
  const migration = sql('migrations/20260911153205_sites_custom_domains.sql');
  await pool.query(`BEGIN; ${migration} COMMIT;`); await pool.query(`BEGIN; ${migration} COMMIT;`); checks++;
  const automation = sql('migrations/20260911163542_sites_domain_automation.sql');
  await pool.query(`BEGIN; ${automation} COMMIT;`); await pool.query(`BEGIN; ${automation} COMMIT;`); checks++;
  for (const role of ['anon', 'authenticated', 'service_role']) {
    const c = await pool.connect(); try { await c.query('BEGIN'); await c.query(`SET LOCAL ROLE ${role}`);
      await assert.rejects(c.query('SELECT * FROM private.galx_site_domains'), e => (e as any).code === '42501');
    } finally { await c.query('ROLLBACK'); c.release(); } checks++;
  }
  assert((await pool.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid IN ('private.galx_site_domains'::regclass,'private.galx_site_namespaces'::regclass)")).rows.every(r=>r.relrowsecurity && r.relforcerowsecurity)); checks++;
  const registry = new SiteDomainRegistry(pool), owner = randomUUID();
  const attempts = await Promise.all(Array.from({ length: 12 }, () => registry.reserve(owner, 'project-1', 'alice', 'My product')));
  assert(attempts.every(r => r.id === attempts[0].id)); assert.equal(attempts[0].hostname, 'my-product.alice.galx.ai'); checks++;
  assert.equal((await registry.reserve(owner, 'project-1', 'alice', 'Changed title')).id, attempts[0].id); checks++;
  await assert.rejects(registry.reserve(owner, 'project-2', 'bob', 'App'), /username_conflict/); checks++;
  await assert.rejects(registry.get(randomUUID(), 'project-1'), /domain_not_found/); checks++;
  const taken = await Promise.allSettled(Array.from({ length: 8 }, () => registry.reserve(randomUUID(), randomUUID(), 'alice', 'Other')));
  assert(taken.every(r=>r.status==='rejected')); checks++;
  const collisions = await Promise.all(Array.from({ length: 8 }, (_,i) => registry.reserve(owner, `duplicate-${i}`, 'alice', 'My product')));
  assert.equal(new Set(collisions.map(r=>r.hostname)).size,8); assert(collisions.some(r=>r.hostname==='my-product-2.alice.galx.ai')); checks++;
  const attaches = await Promise.all(Array.from({length:10},()=>registry.startAttachment(owner,'project-1')));
  assert.equal(attaches.filter(Boolean).length,1); checks++;
  await assert.rejects(registry.startAttachment(randomUUID(),'project-1'),/domain_not_found/); checks++;
  const original=attempts[0], plan=domainPlan({domainId:'domain-1',hostname:original.hostname,cnameTarget:'custom-domains.chatgpt.site.',
    validationRecords:[{name:`_openai-site-verification.${original.hostname}`,record_type:'TXT',value:'openai-site-verification='+'a'.repeat(40)}]},original.hostname);
  const claims=await Promise.allSettled(Array.from({length:8},()=>registry.claim(owner,'project-1',plan)));
  assert.equal(claims.filter(r=>r.status==='fulfilled').length,1); checks++;
  const claimed=(claims.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<any>).value;
  await registry.finish(claimed,false,'dns_unavailable');
  await assert.rejects(registry.claim(owner,'project-1',plan),/check_later/); checks++;
  await pool.query('UPDATE private.galx_site_domains SET next_check_at=now()-interval \'1 minute\' WHERE id=$1',[original.id]);
  const resumed=await registry.claim(owner,'project-1',plan); assert.deepEqual(resumed.plan,plan); checks++;
  await assert.rejects(registry.finish(claimed,true,null),/domain_pending/); checks++;
  const ready=await registry.finish(resumed,true,null); assert.equal(ready.status,'active'); checks++;
  await pool.query('UPDATE private.galx_site_domains SET next_check_at=null WHERE id=$1',[original.id]);
  await assert.rejects(registry.claim(owner,'project-1',{...plan,domainId:'another'}),/domain_conflict/); checks++;
  for(let i=9;i<20;i++) await registry.reserve(owner,`capacity-${i}`,'alice',`App ${i}`);
  await assert.rejects(registry.reserve(owner,'too-many','alice','Too many'),/domain_limit_reached/); checks++;
  let lose = true;
  const uncertain = new SiteDomainRegistry({connect:async()=>{
    const c=await pool.connect(); return {query:async(sql:any,args?:any)=>{const result=await c.query(sql,args);
      if(sql==='COMMIT' && lose){lose=false;throw new Error('lost acknowledgement');}return result;},release:(broken:boolean)=>c.release(broken)} as any;
  }});
  const uncertainOwner=randomUUID(); await assert.rejects(uncertain.reserve(uncertainOwner,'uncertain','carol','App'),/domain_unavailable/);
  assert.equal((await registry.get(uncertainOwner,'uncertain')).hostname,'app.carol.galx.ai'); checks++;
  // Automatic outbox: committed intent survives a lost caller acknowledgement.
  const queuedOwner = randomUUID(); const queued = await registry.reserve(queuedOwner, 'queued', 'doris', 'Queued');
  const queuedPlan = domainPlan({ ...{domainId:'queued-domain', hostname:queued.hostname,cnameTarget:'custom-domains.chatgpt.site'},
    validationRecords:[{name:`_openai-site-verification.${queued.hostname}`,record_type:'TXT',value:'openai-site-verification='+'b'.repeat(40)}]},queued.hostname);
  lose = true; await assert.rejects(uncertain.enqueue(queuedOwner,'queued',queuedPlan),/domain_unavailable/);
  assert.deepEqual((await registry.get(queuedOwner,'queued')).plan,queuedPlan); checks++;
  await assert.rejects(registry.enqueue(randomUUID(),'queued',queuedPlan),/domain_not_found/); checks++;
  await assert.rejects(registry.enqueue(queuedOwner,'queued',{...queuedPlan,domainId:'other'}),/domain_conflict/); checks++;
  assert.deepEqual(await registry.claimDue([owner]),[]); checks++;
  const batches=await Promise.all(Array.from({length:8},()=>registry.claimDue([queuedOwner])));
  assert.equal(batches.flat().length,1); const first=batches.flat()[0]; checks++;
  // Repeated delivery cannot reset a lease or backoff.
  assert.equal((await registry.enqueue(queuedOwner,'queued',queuedPlan)).lease_id,first.lease_id); checks++;
  const pending=await registry.finish(first,false,'https_pending'); assert.equal(pending.retry_count,1);
  const replay=await registry.enqueue(queuedOwner,'queued',queuedPlan);
  assert.equal(replay.next_check_at?.getTime(),pending.next_check_at?.getTime()); assert.deepEqual(await registry.claimDue([queuedOwner]),[]); checks++;
  await pool.query('UPDATE private.galx_site_domains SET next_check_at=now() WHERE id=$1',[queued.id]);
  const lost=(await registry.claimDue([queuedOwner]))[0];
  await pool.query("UPDATE private.galx_site_domains SET lease_until=now()-interval '1 second' WHERE id=$1",[queued.id]);
  await assert.rejects(registry.finish(lost,true,null),/domain_pending/); checks++;
  const recovered=(await registry.claimDue([queuedOwner]))[0]; assert.notEqual(lost.lease_id,recovered.lease_id); checks++;
  await registry.finish(recovered,false,'dns_conflict');
  const stopped=await registry.enqueue(queuedOwner,'queued',queuedPlan); assert.equal(stopped.automation_stopped,true);
  await pool.query('UPDATE private.galx_site_domains SET next_check_at=now() WHERE id=$1',[queued.id]);
  assert.deepEqual(await registry.claimDue([queuedOwner]),[]); await assert.rejects(registry.claim(queuedOwner,'queued'),/domain_conflict/); checks++;
  // Independent jobs progress while a row is locked, and completed rows leave the queue.
  const more = [];
  for (let i=0;i<5;i++) {
    const r=await registry.reserve(queuedOwner,`queued-${i}`,'doris','Queued');
    const p={...queuedPlan,hostname:r.hostname,records:queuedPlan.records.map(record=>({...record,name:record.name.replace(queued.hostname,r.hostname)}))};
    await registry.enqueue(queuedOwner,r.project_id,p); more.push(r);
  }
  const blocker=await pool.connect(); await blocker.query('BEGIN');
  await blocker.query('SELECT id FROM private.galx_site_domains WHERE id=$1 FOR UPDATE',[more[0].id]);
  try { const batch=await registry.claimDue([queuedOwner]); assert.equal(batch.length,4); assert(!batch.some(r=>r.id===more[0].id));
    for (const r of batch) await registry.finish(r,true,null);
  } finally { await blocker.query('ROLLBACK'); blocker.release(); } checks++;
  const last=(await registry.claimDue([queuedOwner]))[0]; assert.equal(last.id,more[0].id);
  await registry.finish(last,true,null); assert.deepEqual(await registry.claimDue([queuedOwner]),[]); checks++;
  await pool.query(`BEGIN; ${sql('rollbacks/20260911163542_sites_domain_automation.down.sql')} COMMIT;`);
  assert.equal((await registry.get(queuedOwner,'queued')).automation_stopped,true); checks++;
  const rollback=sql('rollbacks/20260911153205_sites_custom_domains.down.sql');
  await pool.query(`BEGIN; ${rollback} COMMIT;`); assert.equal((await registry.get(owner,'project-1')).id,original.id); checks++;
  console.log(JSON.stringify({checks,failed:0,scope:'disposable localhost only'}));
} finally {
  await pool.end();
}
