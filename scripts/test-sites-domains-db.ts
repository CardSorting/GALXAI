/** Real transaction/concurrency tests in a newly created localhost database. No dotenv. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { SiteDomainRegistry } from '../src/lib/sites/domain-registry';
import { domainPlan } from '../src/lib/sites/domains';
const local = { host: '127.0.0.1', port: 55439, user: 'seats_test', connectionTimeoutMillis: 2000 };
const admin = new Pool({ ...local, database: 'postgres' });
const database = `sites_domains_${Date.now()}`;
await admin.query(`CREATE DATABASE ${database}`);
const pool = new Pool({ ...local, database, max: 12 }); let checks = 0;
try {
  const migration = readFileSync('supabase/migrations/20260911153205_sites_custom_domains.sql', 'utf8');
  await pool.query(`BEGIN; ${migration} COMMIT;`); await pool.query(`BEGIN; ${migration} COMMIT;`); checks++;
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
  const rollback=readFileSync('supabase/rollbacks/20260911153205_sites_custom_domains.down.sql','utf8');
  await pool.query(`BEGIN; ${rollback} COMMIT;`); assert.equal((await registry.get(owner,'project-1')).id,original.id); checks++;
  console.log(JSON.stringify({checks,failed:0,scope:'disposable localhost only'}));
} finally {
  await pool.end(); await admin.query(`DROP DATABASE ${database} WITH (FORCE)`); await admin.end();
}
