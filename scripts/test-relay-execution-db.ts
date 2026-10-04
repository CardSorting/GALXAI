import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';
import { hash, PROJECTS, type PoolId } from '../src/relay/pool-protocol.js';

export async function executionDatabaseChecks(owner:pg.Pool) {
  let checks=0;
  const directory=new URL('../deploy/relay-execution/supabase/migrations/',import.meta.url);
  const sql=(await Promise.all((await readdir(directory)).filter(f=>f.endsWith('.sql')).sort().map(f=>readFile(new URL(f,directory),'utf8')))).join('\n');
  for(const pool of ['premium'] as PoolId[]) {
    const name='galx_execution_test_'+randomUUID().replaceAll('-','');
    await owner.query(`CREATE DATABASE ${name}`);
    const connection=new URL(process.env.DATABASE_URL!);connection.pathname='/'+name;
    const db=new pg.Pool({connectionString:connection.href,max:2});
    try {
      await db.query(sql);const installation=randomUUID();
      await db.query('INSERT INTO private.relay_identity(pool_id,installation_id,project_ref) VALUES($1,$2,$3)',[pool,installation,PROJECTS[pool]]);
      const c=await db.connect();await c.query('SET ROLE galx_relay_execution');
      const call=async(action:string,body:object={},target=pool)=> (await c.query('SELECT private.relay_execution($1,$2,$3,$4) r',[target,installation,action,body])).rows[0].r;
      const eq=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);checks++;};const deny=async(p:Promise<unknown>)=>{await assert.rejects(p);checks++;};
      try {
        eq((await call('identity')).pool,pool);await deny(call('identity',{},'retired'));
        await deny(c.query('SELECT * FROM private.relay_identity'));await deny(c.query('SELECT * FROM private.relay_executions'));
        eq((await c.query("SELECT to_regclass('public.galx_shard_accounts') x")).rows[0].x,null);
        const request={requestKey:hash('request'),requestSha256:hash('body'),tenantSha256:hash('tenant'),accountId:'codex_sh_'+hash('account').slice(0,24),epoch:randomUUID(),executionId:'job_fixture',workload:'text'};
        eq((await call('reserve',request)).state,'reserved');eq((await call('reserve',{...request,executionId:'job_retry'})).executionId,'job_fixture');
        await deny(call('reserve',{...request,requestSha256:hash('other')}));
        eq(await call('lookup',{requestKey:request.requestKey,tenantSha256:hash('peer')}),null);
        await deny(call('bind',{requestKey:request.requestKey,executionId:'wrong',leaseId:'lease_fixture'}));
        eq((await call('bind',{...request,leaseId:'lease_fixture'})).state,'running');
        await deny(call('bind',{...request,leaseId:'lease_duplicate'}));
        await call('recover',{epoch:randomUUID()});eq((await call('lookup',request)).state,'unknown');
        eq((await call('lookup',request)).success,null);
        eq((await call('reserve',{...request,epoch:randomUUID(),executionId:'job_recovered'})).state,'unknown');
        eq((await call('finish',{...request,success:true,actualTokens:99})).state,'unknown');
        eq((await call('pending')).length,1);await call('settled',{requestKey:request.requestKey,leaseId:'lease_fixture'});eq((await call('pending')).length,0);
        for (const success of [null,false,true]) {
          const r={...request,requestKey:hash('outcome-'+success),executionId:'job_outcome_'+success};
          await call('reserve',r);await call('bind',{...r,leaseId:'lease_outcome_'+success});
          const terminal=await call('finish',{...r,success});
          eq(terminal.state,success===true?'completed':'unknown');eq(terminal.success,success);
          eq((await call('pending')).find((v:any)=>v.requestKey===r.requestKey).success,success);
          // Repeated finish/reserve cannot overwrite a terminal result or authorize replay.
          eq((await call('finish',{...r,success:success!==true})).success,success);
          eq((await call('reserve',{...r,executionId:'new_'+r.executionId})).executionId,r.executionId);
          await call('settled',{requestKey:r.requestKey,leaseId:'lease_outcome_'+success});
        }
        for(const workload of ['sites','images']){const r={...request,requestKey:hash(workload),executionId:'job_'+workload,workload};eq((await call('reserve',r)).workload,workload);}
        await deny(call('recover',{}));
      } finally {await c.query('RESET ROLE');c.release();}
      const before=(await db.query('SELECT request_key,state,success,settled FROM private.relay_executions ORDER BY request_key')).rows;
      const down=await readFile(new URL('../deploy/relay-execution/supabase/rollbacks/20261003195250_relay_execution_neutral_outcomes.down.sql',import.meta.url),'utf8');
      const up=await readFile(new URL('20261003195250_relay_execution_neutral_outcomes.sql',directory),'utf8');
      await db.query(down);
      assert.match((await db.query("SELECT pg_get_functiondef('private.relay_execution(text,uuid,text,jsonb)'::regprocedure) body")).rows[0].body,/state='unknown',success=false/);checks++;
      await db.query(up);
      assert.deepEqual((await db.query('SELECT request_key,state,success,settled FROM private.relay_executions ORDER BY request_key')).rows,before);checks++;
      await assert.rejects(db.query('UPDATE private.relay_identity SET pool_id=pool_id'));checks++;
      await assert.rejects(db.query('TRUNCATE private.relay_executions'));checks++;
      for(const role of ['anon','authenticated','service_role']){const c=await db.connect();try{await c.query(`SET ROLE ${role}`);await assert.rejects(c.query("SELECT private.relay_execution($1,$2,'identity','{}')",[pool,installation]));checks++;}finally{await c.query('RESET ROLE');c.release();}}
    } finally {await db.end();await owner.query(`DROP DATABASE ${name}`);}
  }
  console.log(`Execution projects: ${checks} isolation, recovery and privilege checks passed.`);
}
