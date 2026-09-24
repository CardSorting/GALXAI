import './lib/require-isolated-integration-env.js';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { connectionDatabaseChecks } from './test-relay-connections-db.js';
import { executionDatabaseChecks } from './test-relay-execution-db.js';

const database = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
let checks = 0;
const equal = (a: unknown,b: unknown) => { assert.deepEqual(a,b); checks++; };
const denied = async (f: Promise<unknown>) => { await assert.rejects(f); checks++; };
const scopes = Object.fromEntries(['premium'].map(pool => [pool, {
  pool, installation: randomUUID(), epoch: randomUUID(), actor: randomUUID(),
  keys: Object.fromEntries(['operator','viewer','runtime','registrar'].map(role => [role,hash(randomUUID())])),
}]));
async function call(pool: string,role: string,action: string,body: object = {}) {
  const c = await database.connect();
  try {
    await c.query('SET ROLE galx_relay_control');
    return (await c.query('SELECT private.relay_control($1,$2,$3) AS result',[scopes[pool].keys[role],action,JSON.stringify(body)])).rows[0].result;
  } finally { await c.query('RESET ROLE'); c.release(); }
}
try {
  // Forward compatibility: unassigned manual accounts still use the legacy
  // wrapper; assigned accounts below must be denied through the same functions.
  const legacyDesktop=randomUUID(),legacyId='codex_sh_'+hash(randomUUID()).slice(0,24);
  const legacyRow={id:legacyId,user_id:'system_admin',encrypted_ciphertext:'fixture-old',encrypted_iv:'fixture',encrypted_tag:'fixture',key_version:'v1',credential_expires_at_ms:Date.now()+3600000};
  equal((await database.query('SELECT private.enroll_desktop_shard($1,$2,NULL) AS id',[legacyDesktop,JSON.stringify(legacyRow)])).rows[0].id,legacyId);
  equal((await database.query('SELECT private.refresh_desktop_shard($1,$2,$3,$4) AS saved',[legacyDesktop,legacyId,JSON.stringify(legacyRow),JSON.stringify({...legacyRow,encrypted_ciphertext:'fixture-new'})])).rows[0].saved,true);
  for (const pool of ['premium']) {
    const s=scopes[pool];
    const principals=Object.entries(s.keys).map(([kind,tokenSha256])=>({id:randomUUID(),actorId:s.actor,kind,tokenSha256}));
    await database.query('SELECT private.relay_configure_installation($1,$2,$3,$4,true,true,$5)',[pool,s.installation,randomUUID(),JSON.stringify(principals),hash('synthetic isolation evidence')]);
    equal((await call(pool,'viewer','authenticate')).pool,pool);
    await denied(call(pool,'viewer','prepare',{id:randomUUID(),desktopId:randomUUID(),name:'forbidden'}));
    await denied(call(pool,'runtime','status'));
    await denied(call(pool,'operator','claim',{epoch:s.epoch}));
    equal((await call(pool,'runtime','claim',{epoch:s.epoch})).epoch,s.epoch);
    await denied(call(pool,'runtime','claim',{epoch:randomUUID()}));
    await denied(call(pool,'runtime','heartbeat',{epoch:randomUUID()}));
    equal((await call(pool,'runtime','heartbeat',{epoch:s.epoch})).executionAllowed,true);
  }
  async function register(pool: string,accountId='codex_sh_'+hash(randomUUID()).slice(0,24)) {
    const id=randomUUID(),desktopId=randomUUID(),fingerprint=hash(id),credentialRevision=hash(desktopId),accountClass='paid';
    const prepared={id,desktopId,name:pool+' fixture'};
    equal((await call(pool,'operator','prepare',prepared)).id,id);
    equal((await call(pool,'operator','prepare',prepared)).id,id);
    await denied(call(pool,'operator','prepare',{...prepared,name:'changed'}));
    let ticketSha256=hash('review'+id);
    await call(pool,'operator','ticket',{id,purpose:'review',ticketSha256});
    const reviewed={id,purpose:'review',ticketSha256,fingerprint,credentialRevision,accountClass,models:['fixture-text']};
    await denied(call(pool,'registrar','review',{...reviewed,accountClass:accountClass==='paid'?'free':'paid'}));
    equal((await call(pool,'registrar','review',reviewed)).state,'reviewed');
    await denied(call(pool,'registrar','review',reviewed));
    ticketSha256=hash('register'+id);
    await call(pool,'operator','ticket',{id,purpose:'register',ticketSha256});
    const row={id:accountId,user_id:'system_admin',encrypted_ciphertext:'fixture',encrypted_iv:'fixture',encrypted_tag:'fixture',key_version:'v1',credential_expires_at_ms:Date.now()+3600000};
    const request={...reviewed,purpose:'register',ticketSha256,row};
    equal((await call(pool,'registrar','register',request)).accountId,accountId);
    equal((await call(pool,'registrar','register',request)).replayed,true);
    await denied(call(pool,'registrar','register',{...request,fingerprint:hash('changed')}));
    return {id,desktopId,accountId,credentialRevision};
  }
  const premium=await register('premium');
  for(const [pool,account] of [['premium',premium]] as const) {
    const s=scopes[pool];
    const status=await call(pool,'viewer','status');
    equal(status.accounts.length,1);equal(status.accounts[0].id,account.accountId);
    equal(JSON.stringify(status).includes('encrypted_'),false);
    await denied(database.query('SELECT private.enroll_desktop_shard($1,$2,NULL)',[account.desktopId,JSON.stringify({id:account.accountId})]));
    await denied(database.query('SELECT private.refresh_desktop_shard($1,$2,$3,$4)',[account.desktopId,account.accountId,'{}','{}']));
    const operation={id:randomUUID(),accountId:account.accountId,command:'enabled',expectedRevision:1,requestSha256:hash('enable'+pool)};
    equal((await call(pool,'operator','set_account',operation)).savedRevision,2);
    equal((await call(pool,'operator','set_account',operation)).replayed,true);
    await denied(call(pool,'operator','set_account',{...operation,id:randomUUID(),expectedRevision:0}));
    await denied(call(pool,'operator','set_account',{...operation,id:randomUUID(),expectedRevision:undefined}));
    await denied(call(pool,'viewer','set_account',operation));
    const projection=await call(pool,'runtime','projection',{epoch:s.epoch});
    equal(projection.accounts.length,1);equal(projection.accounts[0].id,account.accountId);
    const acquire={epoch:s.epoch,accountId:account.accountId,credentialRevision:account.credentialRevision,revision:2,
      workload:'text',requestKey:hash('request'+pool),requestSha256:hash('body'),tenantSha256:hash('caller'),estimatedTokens:100};
    await denied(call(pool,'runtime','acquire',{...acquire,revision:undefined}));
    await denied(call(pool,'runtime','acquire',{...acquire,workload:undefined}));
    const lease=await call(pool,'runtime','acquire',acquire);
    assert(lease.leaseId);checks++;
    equal((await call(pool,'runtime','acquire',acquire)).leaseId,lease.leaseId);
    await denied(call(pool,'runtime','acquire',{...acquire,requestSha256:hash('different')}));
    equal((await database.query('SELECT public.fn_acquire_shard_lease($1,$2,100,30000,$3,NULL) x',[account.accountId,hash('caller'),hash('legacy')])).rows[0].x.reason,'SCOPED_RELAY_REQUIRED');
    equal((await database.query('SELECT public.fn_extend_shard_lease($1,$2) x',[lease.leaseId,lease.fencingToken])).rows[0].x.reason,'SCOPED_RELAY_REQUIRED');
    equal((await database.query('SELECT public.fn_release_shard_lease($1) x',[lease.leaseId])).rows[0].x.reason,'SCOPED_RELAY_REQUIRED');
    equal((await call(pool,'runtime','renew',{...acquire,...lease})).leaseId,lease.leaseId);
    await call(pool,'runtime','acknowledge',{...acquire});
    await denied(call(pool,'runtime','acknowledge',{...acquire,revision:1}));
    const pause={id:randomUUID(),accountId:account.accountId,command:'paused',expectedRevision:2,requestSha256:hash('pause'+pool)};
    equal((await call(pool,'operator','set_account',pause)).savedRevision,3);
    await denied(call(pool,'runtime','renew',{...acquire,...lease}));
    await denied(call(pool,'runtime','acquire',acquire));
    equal((await call(pool,'runtime','settle',{epoch:s.epoch,leaseId:lease.leaseId,actualTokens:50,success:true})).success,true);
    equal((await call(pool,'runtime','settle',{epoch:s.epoch,leaseId:lease.leaseId,actualTokens:50,success:true})).replayed,true);
    equal((await call(pool,'viewer','status')).accounts[0].acknowledgedRevision,2);
    equal((await call(pool,'runtime','projection',{epoch:s.epoch})).accounts[0].envelope,null);
  }

  // Management keeps identities/history and serializes every registration edit.
  const managedId=randomUUID(), managedDesktop=randomUUID();
  await call('premium','operator','prepare',{id:managedId,desktopId:managedDesktop,name:'Draft'});
  const edit={id:randomUUID(),registrationId:managedId,expectedRevision:1,command:'rename',name:'Renamed draft',requestSha256:hash('rename draft')};
  equal((await call('premium','operator','manage_registration',edit)).savedRevision,2);
  equal((await call('premium','operator','manage_registration',edit)).replayed,true);
  await denied(call('premium','viewer','manage_registration',edit));
  await denied(call('premium','runtime','manage_registration',edit));
  await denied(call('premium','operator','manage_registration',{...edit,id:randomUUID(),name:'Stale'}));
  const ticketSha256=hash('removed pending ticket');
  await call('premium','operator','ticket',{id:managedId,purpose:'review',ticketSha256});
  const revision=(await call('premium','operator','operation',{id:managedId})).revision;
  const removal={id:randomUUID(),registrationId:managedId,expectedRevision:revision,command:'remove',requestSha256:hash('remove draft')};
  const removed=await call('premium','operator','manage_registration',removal);
  equal(!!removed.removedAt,true);
  equal((await call('premium','operator','manage_registration',removal)).replayed,true);
  await denied(call('premium','operator','ticket',{id:managedId,purpose:'review',ticketSha256}));
  await denied(call('premium','registrar','registration_context',{id:managedId,purpose:'review',ticketSha256}));
  await denied(call('premium','operator','prepare',{id:managedId,desktopId:managedDesktop,name:'Renamed draft'}));
  const restored=await call('premium','operator','manage_registration',{id:randomUUID(),registrationId:managedId,expectedRevision:removed.savedRevision,command:'restore',requestSha256:hash('restore draft')});
  equal(restored.removedAt,null);
  await denied(call('premium','registrar','registration_context',{id:managedId,purpose:'review',ticketSha256}));
  const races=await Promise.allSettled(['A','B'].map(name=>call('premium','operator','manage_registration',{id:randomUUID(),registrationId:managedId,expectedRevision:restored.savedRevision,command:'rename',name,requestSha256:hash(name)})));
  equal(races.filter(r=>r.status==='fulfilled').length,1);
  const accountRename={id:randomUUID(),accountId:premium.accountId,expectedRevision:3,command:'rename',name:'Renamed account',requestSha256:hash('rename account')};
  equal((await call('premium','operator','set_account',accountRename)).savedRevision,4);
  equal((await call('premium','operator','operation',{id:premium.id})).name,'Renamed account');
  const accountRemove={id:randomUUID(),accountId:premium.accountId,expectedRevision:4,command:'remove',requestSha256:hash('remove account')};
  equal((await call('premium','operator','set_account',accountRemove)).savedRevision,5);
  equal((await call('premium','operator','set_account',accountRemove)).replayed,true);
  const removedAccount=(await call('premium','viewer','status')).accounts.find((a:any)=>a.id===premium.accountId);
  equal(removedAccount.state,'revoked');equal(!!removedAccount.removedAt,true);
  equal(!!(await call('premium','operator','operation',{id:premium.id})).removedAt,true);
  await denied(call('premium','operator','set_account',{...accountRemove,id:randomUUID(),command:'enabled',expectedRevision:5}));
  await denied(call('premium','operator','manage_registration',{...removal,id:randomUUID(),registrationId:premium.id,expectedRevision:(await call('premium','operator','operation',{id:premium.id})).revision,command:'restore'}));
  const health=(await call('premium','viewer','status')).accounts[0];
  equal(['none','cooldown','unavailable'].includes(health.healthSignal),true);
  await denied(database.query('DELETE FROM private.galx_relay_management_operations'));

  for(const role of ['anon','authenticated','service_role','galx_relay_control']) {
    const c=await database.connect();try {
      await c.query(`SET ROLE ${role}`);
      await denied(c.query('SELECT * FROM private.galx_relay_principals'));
      await denied(c.query('SELECT * FROM private.galx_relay_account_control'));
      await denied(c.query('SELECT * FROM private.galx_relay_management_operations'));
      await denied(c.query("SELECT private.relay_configure_installation('premium',$1,$2,'[]')",[randomUUID(),randomUUID()]));
      if(role!=='galx_relay_control') await denied(c.query("SELECT private.relay_control($1,'authenticate','{}')",[scopes.premium.keys.runtime]));
    }finally{await c.query('RESET ROLE');c.release();}
  }
  await connectionDatabaseChecks(database,scopes,call);
  await database.query(await readFile(new URL('../supabase/rollbacks/20260916040459_relay_automatic_activation.down.sql',import.meta.url),'utf8'));
  const before=(await database.query('SELECT count(*)::integer n FROM private.galx_relay_account_assignments')).rows[0].n;
  await executionDatabaseChecks(database);
  await database.query(await readFile(new URL('../supabase/rollbacks/20260916013944_relay_connection_lifecycle.down.sql',import.meta.url),'utf8'));
  await denied(call('premium','operator','status'));
  await database.query(await readFile(new URL('../supabase/rollbacks/20260915191404_relay_account_management.down.sql',import.meta.url),'utf8'));
  equal((await database.query('SELECT count(*)::integer n FROM private.galx_relay_management_operations')).rows[0].n,4);
  await denied(call('premium','operator','status'));
  await database.query(await readFile(new URL('../supabase/rollbacks/20260915081527_central_relay_authorization.down.sql',import.meta.url),'utf8'));
  equal((await database.query('SELECT count(*)::integer n FROM private.galx_relay_account_assignments')).rows[0].n,before);
  await denied(call('premium','operator','status'));
  console.log(`Relay authorization: ${checks} database checks passed.`);
} finally { await database.end(); }
