/** Account and publication invariants on the disposable PostgreSQL fixture only. */
import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { SitesWorkspaceRepository } from '../src/lib/sites/workspace-repository';
import { SiteDomainRegistry } from '../src/lib/sites/domain-registry';
import { managedDomainPlan } from '../src/lib/sites/managed-hosting';
const pool=new Pool({connectionString:process.env.GALX_INTEGRATION_DATABASE_URL,max:12,connectionTimeoutMillis:2000});
const repo=new SitesWorkspaceRepository(pool),domains=new SiteDomainRegistry(pool),owner=randomUUID(),other=randomUUID(),id=randomUUID();
const document={schema_version:1 as const,title:'Daylight',summary:'A calmer week.',sections:[{heading:'Plan together',body:'Room for your best work.'}]};
let checks=0;
try{
  const migration=readFileSync(new URL('../supabase/migrations/20260912003002_sites_workspace.sql',import.meta.url),'utf8');
  await pool.query(migration);await pool.query(migration);checks++;
  const row=await repo.create(owner,id,'Daylight');assert.equal((await repo.create(owner,id,'Retry')).id,id);assert.equal((await repo.list(owner)).length,1);checks++;
  assert.deepEqual(await repo.list(other),[]);await assert.rejects(repo.get(other,id));await assert.rejects(repo.update(other,id,0,{title:'Taken'}));checks++;
  const ops=Array.from({length:8},()=>randomUUID());
  const results=await Promise.allSettled(ops.map(op=>repo.begin(owner,id,0,op,'Make a page')));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);checks++;
  const pending=await repo.get(owner,id);assert(pending.operation_id);await assert.rejects(repo.update(owner,id,0,{archived:true}));checks++;
  const before=await repo.finish(owner,id,randomUUID(),document,'stale');assert.equal(before.document,null);checks++;
  let saved=await repo.finish(owner,id,pending.operation_id,document,'Ready');assert.equal(saved.revision,1);assert.deepEqual(saved.document,document);checks++;
  await assert.rejects(repo.begin(owner,id,saved.revision,pending.operation_id,'Reused'));checks++;
  await assert.rejects(repo.update(owner,id,0,{title:'Stale'}));checks++;
  const reserved=await domains.reserve(owner,id,'workspace-test','Daylight');
  const plan=managedDomainPlan(reserved.hostname,id,'example.vercel-dns-017.com');
  saved=await repo.publish(owner,id,saved.revision,plan);assert.deepEqual(await repo.published(reserved.hostname),document);assert.equal((await domains.get(owner,id)).plan?.kind,'managed');checks++;
  await assert.rejects(repo.publish(other,id,saved.revision,plan));await assert.rejects(repo.publish(owner,id,saved.revision-1,plan));checks++;
  const edit=randomUUID();await repo.begin(owner,id,saved.revision,edit,'Change the summary');
  const updated={...document,summary:'A newly edited private summary.'};saved=await repo.finish(owner,id,edit,updated,'Updated');
  assert.deepEqual(await repo.published(reserved.hostname),document);assert.deepEqual(saved.document,updated);assert.equal(saved.hostname,reserved.hostname);checks++;
  // Losing the commit acknowledgement leaves one published snapshot and its queued intent.
  let lost=true;
  const uncertain=new SitesWorkspaceRepository({connect:async()=>{const db=await pool.connect();return new Proxy(db,{get(target,key){if(key==='query')return async(...args:any[])=>{const result=await (target.query as any)(...args);if(args[0]==='COMMIT'&&lost){lost=false;throw new Error('lost commit acknowledgement');}return result;};const value=(target as any)[key];return typeof value==='function'?value.bind(target):value;}});}});
  await assert.rejects(uncertain.publish(owner,id,saved.revision,plan));assert.deepEqual(await repo.published(reserved.hostname),updated);checks++;
  saved=await repo.get(owner,id);await repo.unpublish(owner,id,saved.revision);assert.equal(await repo.published(reserved.hostname),null);assert.equal((await domains.get(owner,id)).hostname,reserved.hostname);checks++;
  await assert.rejects(repo.publish(owner,id,saved.revision,plan));checks++;
  saved=await repo.get(owner,id);await repo.update(owner,id,saved.revision,{archived:true});await assert.rejects(repo.begin(owner,id,saved.revision+1,randomUUID(),'Archived edit'));checks++;
  for(const role of ['anon','authenticated','service_role']){
    for(const sql of ['SELECT * FROM private.galx_site_workspaces',"INSERT INTO private.galx_site_workspaces(id,user_id,title) VALUES(gen_random_uuid(),'attack','Attack')","UPDATE private.galx_site_workspaces SET title='Attack'",'DELETE FROM private.galx_site_workspaces']){
      const db=await pool.connect();try{await db.query('BEGIN');await db.query(`SET LOCAL ROLE ${role}`);await assert.rejects(db.query(sql),e=>(e as any).code==='42501');}finally{await db.query('ROLLBACK');db.release();}checks++;
    }
  }
  const security=(await pool.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='private.galx_site_workspaces'::regclass")).rows[0];assert(security.relrowsecurity&&security.relforcerowsecurity);checks++;
  const rollback=readFileSync(new URL('../supabase/rollbacks/20260912003002_sites_workspace.down.sql',import.meta.url),'utf8');await pool.query(rollback);assert.equal((await repo.get(owner,id)).document?.summary,updated.summary);checks++;
  console.log(JSON.stringify({checks,failed:0,scope:'disposable PostgreSQL only'}));
}finally{await pool.end();}
