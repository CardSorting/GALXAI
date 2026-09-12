/** Account and publication invariants on the disposable PostgreSQL fixture only. */
import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { SitesWorkspaceRepository } from '../src/lib/sites/workspace-repository';
import { SitesContextCache } from '../src/lib/sites/hybrid-context';
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
  const sessions=readFileSync(new URL('../supabase/migrations/20260912060747_sites_conversation_sessions.sql',import.meta.url),'utf8');
  const legacy=randomUUID(),legacyOp=randomUUID(),inFlight=randomUUID();
  await pool.query(`INSERT INTO private.galx_site_workspaces(id,user_id,title,document,published_document,published_revision,messages,operation_id,operation_brief,operation_started_at)
    VALUES($1,$2,'Legacy',$3,$4,1,$5,$6,'Pending request',now())`,[legacy,owner,updated,document,JSON.stringify([{id:legacyOp+':user',role:'user',text:'First request'},{id:legacyOp+':assistant',role:'assistant',text:'First reply'}]),inFlight]);
  await pool.query(sessions);await pool.query(sessions);let migrated=await repo.get(owner,legacy);
  assert.equal(migrated.turn_count,2);assert.equal(migrated.messages.length,3);assert.equal(migrated.messages[2].status,'pending');assert.equal(migrated.document_version,2);assert.equal(migrated.published_version,1);checks++;
  migrated=await repo.finish(owner,legacy,inFlight,null,'Recovered discussion','Keep the original audience.');assert.equal(migrated.messages.length,4);checks++;
  const longId=randomUUID();let long=await repo.create(owner,longId,'Long conversation');long=await repo.update(owner,longId,0,{notes:'Audience: neighborhood families.'});
  const firstOp=randomUUID();
  for(let i=1;i<=105;i++){
    const op=i===1?firstOp:randomUUID();await repo.begin(owner,longId,long.revision,op,`Request ${i}`,i%2?'build':'discuss');
    const pending=await repo.get(owner,longId);assert.equal(pending.messages.at(-1)?.text,`Request ${i}`);assert.equal(pending.messages.at(-1)?.status,'pending');
    long=await repo.finish(owner,longId,op,i%2?{...document,summary:`Revision ${i}`} : null,`Reply ${i}`,`Rolling decision ${i}`);
  }
  checks++;assert.equal(long.turn_count,105);assert.equal(long.messages.length,80);assert.equal(long.history_cursor,66);assert.equal(long.context_summary,'Rolling decision 105');assert.equal(long.project_notes,'Audience: neighborhood families.');checks++;
  const all=[];let cursor:number|undefined;do{const page=await repo.history(owner,longId,cursor);all.unshift(...page.messages);cursor=page.cursor || undefined;}while(cursor);
  assert.equal(all.length,210);assert.equal(all[0].text,'Request 1');assert.equal(all.at(-1)?.text,'Reply 105');assert.equal(new Set(all.map(m=>m.id)).size,210);checks++;
  const hybridMigration=readFileSync(new URL('../supabase/migrations/20260912071633_sites_hybrid_context_search.sql',import.meta.url),'utf8');
  await pool.query(hybridMigration);await pool.query(hybridMigration);checks++;
  await pool.query("UPDATE private.galx_site_turns SET user_text='Cedar launch budget is 100. Keep this decision.' WHERE user_id=$1 AND site_id=$2 AND sequence=1",[owner,longId]);
  const recalled=await repo.recall(owner,longId,long.revision,'What was the Cedar budget?');assert.equal(recalled[0].turn,1);assert.equal(recalled.length,2);checks++;
  await assert.rejects(repo.recall(other,longId,long.revision,'Cedar'));await assert.rejects(repo.recall(owner,longId,long.revision-1,'Cedar'));checks++;
  const copied=await repo.recall(owner,longId,long.revision,'Cedar');copied[0].text='Poisoned';assert.match((await repo.recall(owner,longId,long.revision,'Cedar'))[0].text,/Cedar launch/);checks++;
  // Warm reads still verify ownership in SQL; only the committed history page is cached.
  let historyReads=0;const countingPool={connect:async()=>{const db=await pool.connect();return new Proxy(db,{get(target,key){if(key==='query')return async(...args:any[])=>{
    if(typeof args[0]==='string'&&args[0].includes('ORDER BY sequence DESC LIMIT 41'))historyReads++;
    return (target.query as any)(...args);};const value=(target as any)[key];return typeof value==='function'?value.bind(target):value;}});}};
  const cached=new SitesWorkspaceRepository(countingPool,new SitesContextCache());const cold=await cached.get(owner,longId);const reads=historyReads;
  assert.deepEqual(await cached.get(owner,longId),cold);assert.equal(historyReads,reads);await assert.rejects(cached.get(other,longId));checks++;
  const unavailableCache=new SitesContextCache();unavailableCache.get=()=>{throw new Error('L1 unavailable');};unavailableCache.put=()=>{throw new Error('L1 unavailable');};
  assert.deepEqual((await new SitesWorkspaceRepository(pool,unavailableCache).get(owner,longId)).messages,long.messages);checks++;
  const pendingRecall=randomUUID();await repo.begin(owner,longId,long.revision,pendingRecall,'Cedar pending proposal','discuss');await assert.rejects(repo.recall(owner,longId,long.revision,'Cedar'));checks++;
  long=await repo.finish(owner,longId,pendingRecall,null,'Cedar failed proposal',null,true);assert(!(await repo.recall(owner,longId,long.revision,'Cedar')).some(m=>m.text.includes('failed proposal')));checks++;
  // Keep the original long-session counts for the established restoration assertions below.
  const restoreTurnCount=long.turn_count || 0;
  await assert.rejects(repo.begin(owner,longId,long.revision,firstOp,'Replayed after truncation'));assert.equal((await repo.turn(owner,longId,firstOp))?.user_text,'Cedar launch budget is 100. Keep this decision.');checks++;
  const versions=await repo.versions(owner,longId);assert.equal(versions.versions.length,20);assert(versions.cursor);assert.equal(versions.versions[0].version,53);checks++;
  const domain=await domains.reserve(owner,longId,'workspace-test','Long conversation');const domainPlan=managedDomainPlan(domain.hostname,longId,'example.vercel-dns-017.com');
  long=await repo.publish(owner,longId,long.revision,domainPlan);const live=await repo.published(domain.hostname);assert.equal(long.published_version,53);checks++;
  long=await repo.restore(owner,longId,long.revision,1);assert.equal(long.document_version,54);assert.equal(long.document?.summary,'Revision 1');assert.equal(long.context_summary,'Rolling decision 1');assert.equal(long.context_start_turn,restoreTurnCount+1);assert.equal(long.turn_count,restoreTurnCount+1);assert.equal(long.published_version,53);assert.deepEqual(await repo.published(domain.hostname),live);assert.equal(long.project_notes,'Audience: neighborhood families.');checks++;
  assert.deepEqual(await repo.recall(owner,longId,long.revision,'Cedar'),[]);assert.equal((await cached.get(owner,longId)).context_start_turn,long.context_start_turn);checks++;
  const restored=await repo.version(owner,longId,54);assert.deepEqual(restored.document,(await repo.version(owner,longId,1)).document);checks++;
  const discuss=randomUUID();await repo.begin(owner,longId,long.revision,discuss,'Explain the restored decision','discuss');
  await assert.rejects(repo.restore(owner,longId,long.revision,2));await assert.rejects(repo.update(owner,longId,long.revision,{notes:'While pending'}));checks++;
  long=await repo.finish(owner,longId,discuss,null,'A discussion only.','Rolling restored context');assert.equal(long.document_version,54);checks++;
  const same=randomUUID();await repo.begin(owner,longId,long.revision,same,'Keep it');long=await repo.finish(owner,longId,same,long.document,'Already matches.','Same context');assert.equal(long.document_version,54);checks++;
  for(const action of [()=>repo.history(other,longId),()=>repo.versions(other,longId),()=>repo.version(other,longId,1),()=>repo.restore(other,longId,long.revision,1),()=>repo.update(other,longId,long.revision,{notes:'Stolen'})]){await assert.rejects(action);checks++;}
  for(const table of ['galx_site_turns','galx_site_versions']){
    const security=(await pool.query('SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid=$1::regclass',['private.'+table])).rows[0];assert(security.relrowsecurity&&security.relforcerowsecurity);checks++;
    for(const role of ['anon','authenticated','service_role'])for(const sql of [`SELECT * FROM private.${table}`,`INSERT INTO private.${table} DEFAULT VALUES`,`UPDATE private.${table} SET user_id='attack'`,`DELETE FROM private.${table}`]){
      const db=await pool.connect();try{await db.query('BEGIN');await db.query(`SET LOCAL ROLE ${role}`);await assert.rejects(db.query(sql),e=>(e as any).code==='42501');}finally{await db.query('ROLLBACK');db.release();}checks++;
    }
  }
  await pool.query(sessions);assert.equal((await repo.get(owner,longId)).document_version,54);assert.equal((await repo.get(owner,longId)).context_summary,'Same context');checks++;
  const down=readFileSync(new URL('../supabase/rollbacks/20260912060747_sites_conversation_sessions.down.sql',import.meta.url),'utf8');await pool.query(down);
  assert.deepEqual((await repo.get(owner,longId)).document,long.document);assert.equal((await repo.versions(owner,longId)).versions[0].version,54);checks++;
  await pool.query(readFileSync(new URL('../supabase/rollbacks/20260912071633_sites_hybrid_context_search.down.sql',import.meta.url),'utf8'));
  assert.equal((await repo.get(owner,longId)).document_version,54);assert.deepEqual(await repo.recall(owner,longId,long.revision,'Cedar'),[]);checks++;
  console.log(JSON.stringify({checks,failed:0,scope:'disposable PostgreSQL only'}));
}finally{await pool.end();}
