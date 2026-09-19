/** Real PostgreSQL connection lifecycle regression; invoked only by isolated harness. */
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import type pg from 'pg';
export async function connectionDatabaseChecks(db: pg.Pool, scopes: any, call: (pool: string, role: string, action: string, body?: object)=>Promise<any>) {
  let checks=0;
  const eq=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);checks++;};
  const denied=async(p:Promise<unknown>)=>{await assert.rejects(p);checks++;};
  const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
  eq((await db.query("SELECT has_schema_privilege('galx_desktop_writer','private','CREATE') AS allowed")).rows[0].allowed,false);
  const accountId='codex_sh_'+hash(randomUUID()).slice(0,24),id=randomUUID(),desktopId=randomUUID(),credentialRevision=hash('initial token');
  const row={id:accountId,user_id:'system_admin',encrypted_ciphertext:'fixture-secret',encrypted_iv:'fixture',encrypted_tag:'fixture',key_version:'v1',credential_expires_at_ms:Date.now()+3600000};
  const ticketSha256=hash('connect ticket'),body={id,purpose:'connect',ticketSha256,fingerprint:hash('same identity'),credentialRevision,accountClass:'paid',models:['fixture-text'],row};
  await call('premium','operator','prepare',{id,desktopId,name:'Connection lifecycle'});
  await call('premium','operator','ticket',{id,purpose:'connect',ticketSha256});
  await denied(call('premium','viewer','connect',body));
  await denied(call('standard','registrar','connect',body));
  await denied(call('premium','registrar','connect',{...body,row:{...row,id:'invalid'}}));
  eq((await call('premium','operator','operation',{id})).state,'prepared');
  eq((await call('premium','registrar','connect',body)).accountId,accountId);
  let account=(await call('premium','viewer','status')).accounts.find((a:any)=>a.id===accountId);
  eq(account.state,'paused');eq(account.connectionState,'connected');assert(account.connectionCheckedAt);checks++;
  const s=scopes.premium,epoch=s.epoch;
  await call('premium','operator','set_account',{id:randomUUID(),accountId,expectedRevision:1,command:'enabled',requestSha256:hash('enable connection')});
  await call('premium','runtime','heartbeat',{epoch});
  const failure={epoch,accountId,revision:2,credentialRevision};
  await denied(call('premium','operator','credential_failed',failure));
  await denied(call('standard','runtime','credential_failed',{...failure,epoch:scopes.standard.epoch}));
  await denied(call('premium','runtime','credential_failed',{...failure,epoch:randomUUID()}));
  eq((await call('premium','runtime','credential_failed',{...failure,credentialRevision:hash('old token')})).recorded,false);
  eq((await call('premium','runtime','credential_failed',failure)).recorded,true);
  eq((await call('premium','runtime','credential_failed',failure)).recorded,false);
  account=(await call('premium','viewer','status')).accounts.find((a:any)=>a.id===accountId);
  eq(account.state,'enabled');eq(account.revision,3);eq(account.connectionState,'sign_in_required');
  const projected=(await call('premium','runtime','projection',{epoch})).accounts.find((a:any)=>a.id===accountId);
  eq(projected.envelope,null);
  await denied(call('premium','runtime','acquire',{...failure,revision:3,workload:'text',requestKey:hash('work'),requestSha256:hash('body'),tenantSha256:hash('tenant'),estimatedTokens:100}));
  await denied(call('premium','runtime','renew',{...failure,revision:3,leaseId:randomUUID(),fencingToken:1}));
  const refresh={...body,purpose:'refresh',ticketSha256:hash('refresh ticket'),expected:row,row:{...row,encrypted_ciphertext:'fresh-secret'}};
  await call('premium','operator','ticket',{id,purpose:'refresh',ticketSha256:refresh.ticketSha256});
  await assert.rejects(call('premium','registrar','refresh',refresh),(e:any)=>e.code==='GR001');checks++;
  const freshRevision=hash('fresh token');
  eq((await call('premium','registrar','refresh',{...refresh,credentialRevision:freshRevision})).state,'updated');
  account=(await call('premium','viewer','status')).accounts.find((a:any)=>a.id===accountId);
  eq(account.id,accountId);eq(account.connectionState,'connected');eq(account.state,'enabled');eq(account.revision,4);
  eq((await call('premium','runtime','credential_failed',failure)).recorded,false);
  eq((await call('premium','runtime','projection',{epoch})).accounts.find((a:any)=>a.id===accountId).envelope.encrypted_ciphertext,'fresh-secret');
  eq((await call('premium','registrar','refresh',{...refresh,credentialRevision:freshRevision})).state,'current');
  await call('premium','operator','set_account',{id:randomUUID(),accountId,expectedRevision:4,command:'revoked',requestSha256:hash('revoke connection')});
  await denied(call('premium','registrar','refresh',{...refresh,credentialRevision:hash('another fresh token')}));

  // Deterministic enrollment IDs can be reused after a row is removed. The
  // append-only journal must advance past the old insert/delete revisions.
  const reusableId='codex_sh_'+hash(randomUUID()).slice(0,24),reusableDesktop=randomUUID();
  await db.query('SELECT private.enroll_desktop_shard($1,$2,NULL)',[reusableDesktop,JSON.stringify({...row,id:reusableId})]);
  const remover=await db.connect();try{await remover.query('SET ROLE galx_desktop_writer');await remover.query('DELETE FROM public.galx_shard_accounts WHERE id=$1',[reusableId]);}finally{await remover.query('RESET ROLE').catch(()=>{});remover.release();}
  eq((await db.query('SELECT private.enroll_desktop_shard($1,$2,NULL) AS id',[randomUUID(),JSON.stringify({...row,id:reusableId})])).rows[0].id,reusableId);
  eq((await db.query('SELECT registry_revision FROM public.galx_shard_accounts WHERE id=$1',[reusableId])).rows[0].registry_revision,'3');

  // Purging legacy material is owner-only, dependency-checked, all-or-nothing and irreversible.
  const legacyIds=Array.from({length:3},()=> 'codex_sh_'+hash(randomUUID()).slice(0,24));
  for(const legacyId of legacyIds) {
    await db.query('SELECT private.enroll_desktop_shard($1,$2,NULL)',[randomUUID(),JSON.stringify({...row,id:legacyId,encrypted_ciphertext:'OLD_SECRET'})]);
    // Simulate a pre-enrollment-policy row without disabling any database guard.
    const c=await db.connect();try{await c.query('SET ROLE galx_desktop_writer');
      await c.query('UPDATE public.galx_shard_accounts SET managed_desktop_id=NULL,desktop_enrolled_at=NULL WHERE id=$1',[legacyId]);
    }finally{await c.query('RESET ROLE');c.release();}
  }
  await denied(db.query('SELECT private.retire_legacy_credentials($1)',[[legacyIds[0],accountId]]));
  eq((await db.query('SELECT encrypted_ciphertext FROM public.galx_shard_accounts WHERE id=$1',[legacyIds[0]])).rows[0].encrypted_ciphertext,'OLD_SECRET');
  for(const role of ['anon','authenticated','service_role','galx_relay_control']) {
    const c=await db.connect();try{await c.query(`SET ROLE ${role}`);
      await denied(c.query('SELECT private.retire_legacy_credentials($1)',[legacyIds]));
      await denied(c.query('SELECT private.retire_legacy_credential_material($1)',[legacyIds]));
      await denied(c.query("SELECT private.relay_control_before_connections($1,'status','{}')",[s.keys.viewer]));
    }finally{await c.query('RESET ROLE');c.release();}
  }
  const leaseId=randomUUID();
  await db.query("INSERT INTO public.galx_shard_leases(id,shard_id,user_id,estimated_tokens,acquired_at_ms,expires_at_ms,fencing_token) VALUES($1,$2,'fixture',1,$3::bigint-30000,$3::bigint,1)",[leaseId,legacyIds[2],Date.now()+30000]);
  await denied(db.query('SELECT private.retire_legacy_credentials($1)',[legacyIds]));
  await db.query('UPDATE public.galx_shard_leases SET is_reclaimed=true WHERE id=$1',[leaseId]);
  eq((await db.query('SELECT private.retire_legacy_credentials($1) n',[legacyIds])).rows[0].n,3);
  eq((await db.query('SELECT private.retire_legacy_credentials($1) n',[legacyIds])).rows[0].n,0);
  const retired=(await db.query('SELECT id,encrypted_ciphertext,encrypted_iv,encrypted_tag,credential_expires_at_ms,permission_retracted,credential_retired_at FROM public.galx_shard_accounts WHERE id=ANY($1)',[legacyIds])).rows;
  eq(retired.length,3);for(const item of retired){eq(item.encrypted_ciphertext,'');eq(item.encrypted_iv,'');eq(item.encrypted_tag,'');eq(Number(item.credential_expires_at_ms),0);eq(item.permission_retracted,true);assert(item.credential_retired_at);checks++;}
  const c=await db.connect();try{await c.query('SET ROLE galx_desktop_writer');
    await denied(c.query("UPDATE public.galx_shard_accounts SET encrypted_ciphertext='RESTORED',permission_retracted=false WHERE id=$1",[legacyIds[0]]));
  }finally{await c.query('RESET ROLE');c.release();}
  const pending=randomUUID(),pendingDesktop=randomUUID(),pendingTicket=hash('context');
  await call('premium','operator','prepare',{id:pending,desktopId:pendingDesktop,name:'After purge'});
  await call('premium','operator','ticket',{id:pending,purpose:'connect',ticketSha256:pendingTicket});
  const context=await call('premium','registrar','registration_context',{id:pending,purpose:'connect',ticketSha256:pendingTicket});
  eq(context.accounts.some((a:any)=>legacyIds.includes(a.id)),false);
  console.log(`Connection lifecycle: ${checks} database checks passed.`);
}
