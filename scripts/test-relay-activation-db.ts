import './lib/require-isolated-integration-env.js';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import pg from 'pg';
import {readFile} from 'node:fs/promises';

/** All identities, credentials and evidence here are disposable fixture values. */
export async function activationDatabaseChecks(db:pg.Pool) {
 let checks=0;
 const eq=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);checks++;};
 const denied=async(p:Promise<unknown>)=>{await assert.rejects(p);checks++;};
 const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
 const scopes=Object.fromEntries(['premium','standard'].map(pool=>[pool,{pool,id:randomUUID(),host:randomUUID(),epoch:randomUUID(),actor:randomUUID(),keys:Object.fromEntries(['operator','viewer','registrar','runtime'].map(role=>[role,hash(randomUUID())]))}]));
 const call=async(pool:string,role:string,action:string,body:object={})=>{
  const c=await db.connect();try{await c.query('SET ROLE galx_relay_control');
   return (await c.query('SELECT private.relay_control($1,$2,$3) r',[scopes[pool].keys[role],action,JSON.stringify(body)])).rows[0].r;
  }finally{await c.query('RESET ROLE');c.release();}
 };
 const status=(pool='premium')=>call(pool,'viewer','status');
 const configure=async(pool:string,automatic=true)=>{
  const s=scopes[pool];
  if(automatic)await db.query('SELECT private.relay_configure_automatic_activation($1,$2,$3,$4)',[pool,s.id,s.host,hash('verified fixture')]);
  else await db.query("SELECT private.relay_configure_installation($1,$2,$3,'[]',true,false,NULL)",[pool,s.id,s.host]);
 };
 const connect=async(pool='premium',expiry=Date.now()+3600000)=>{
  const id=randomUUID(),desktopId=randomUUID(),accountId='codex_sh_'+hash(id).slice(0,24),ticketSha256=hash(id+'ticket');
  const row={id:accountId,user_id:'system_admin',encrypted_ciphertext:'fixture',encrypted_iv:'fixture',encrypted_tag:'fixture',key_version:'v1',credential_expires_at_ms:expiry};
  const body={id,purpose:'connect',ticketSha256,fingerprint:hash(id+'identity'),credentialRevision:hash(id+'credential'),accountClass:pool==='premium'?'paid':'free',models:['fixture-text'],row};
  await call(pool,'operator','prepare',{id,desktopId,name:'Automatic fixture'});
  await call(pool,'operator','ticket',{id,purpose:'connect',ticketSha256});
  return {id,accountId,body};
 };
 const change=async(accountId:string,command:string)=>{
  const a=(await status()).accounts.find((a:any)=>a.id===accountId);
  await call('premium','operator','set_account',{id:randomUUID(),accountId,command,expectedRevision:a.revision,requestSha256:hash(randomUUID())});
 };
 for(const [pool,s] of Object.entries(scopes)){
  const principals=Object.entries(s.keys).map(([kind,tokenSha256])=>({id:randomUUID(),actorId:s.actor,kind,tokenSha256}));
  await db.query('SELECT private.relay_configure_installation($1,$2,$3,$4,true,false,NULL)',[pool,s.id,s.host,JSON.stringify(principals)]);
  eq((await status(pool)).automaticActivation,false);
  await denied(db.query('SELECT private.relay_configure_automatic_activation($1,$2,$3,NULL)',[pool,s.id,s.host]));
  await denied(db.query('SELECT private.relay_configure_automatic_activation($1,$2,$3,$4)',[pool,s.id,randomUUID(),hash('fixture')]));
  await configure(pool);eq((await status(pool)).automaticActivation,true);eq((await status(pool)).executionAllowed,false);
 }
 // Arming requires owner authority; helpers and raw policy cannot be reached by service/app roles.
 for(const role of ['anon','authenticated','service_role','galx_relay_control','galx_desktop_writer']){
  const c=await db.connect();try{await c.query(`SET ROLE ${role}`);
   await denied(c.query('SELECT private.relay_configure_automatic_activation($1,$2,$3,$4)',['premium',scopes.premium.id,scopes.premium.host,hash('forged')]));
   await denied(c.query('SELECT private.relay_reconcile_activation($1)',[scopes.premium.id]));
   await denied(c.query("UPDATE private.galx_relay_installation_runtime SET automatic_activation=true"));
   await denied(c.query("SELECT private.relay_control_before_automatic($1,'status','{}')",[scopes.premium.keys.viewer]));
  }finally{await c.query('RESET ROLE');c.release();}
 }
 const p=await connect();
 await denied(call('premium','viewer','connect',p.body));await denied(call('standard','registrar','connect',p.body));
 await denied(call('premium','registrar','connect',{...p.body,accountClass:'free'}));
 eq((await status()).accounts.length,0);
 await call('premium','registrar','connect',p.body);
 let a=(await status()).accounts[0];eq(a.state,'enabled');eq(a.revision,2);eq(a.connectionState,'connected');
 eq((await status()).executionAllowed,false); // No runtime owner yet.
 eq((await call('premium','runtime','claim',{epoch:scopes.premium.epoch})).executionAllowed,true);
 eq((await status()).executionAllowed,true);eq((await status('standard')).executionAllowed,false);
 eq((await call('premium','runtime','projection',{epoch:scopes.premium.epoch})).accounts[0].envelope.encrypted_ciphertext,'fixture');
 eq((await status()).activity.filter((v:any)=>v.accountId===p.accountId&&v.command==='enabled').length,1);
 // An intentional pause survives re-arming, heartbeats, replay and a fresh same-account sign-in.
 await change(p.accountId,'paused');await configure('premium');
 await call('premium','runtime','heartbeat',{epoch:scopes.premium.epoch});eq((await status()).accounts[0].state,'paused');
 await denied(call('premium','registrar','connect',p.body));eq((await status()).accounts[0].state,'paused');
 const fresh={...p.body,purpose:'refresh',ticketSha256:hash(randomUUID()),credentialRevision:hash(randomUUID()),expected:p.body.row,row:{...p.body.row,encrypted_ciphertext:'fresh-fixture'}};
 await call('premium','operator','ticket',{id:p.id,purpose:'refresh',ticketSha256:fresh.ticketSha256});
 await call('premium','registrar','refresh',fresh);eq((await status()).accounts[0].state,'paused');
 // Manual closure wins permanently until a verified installer deliberately rearms.
 await configure('premium',false);eq((await status()).automaticActivation,false);
 await change(p.accountId,'enabled');await call('premium','runtime','heartbeat',{epoch:scopes.premium.epoch});
 eq((await status()).executionAllowed,false);
 const held=await connect();await call('premium','registrar','connect',held.body);
 eq((await status()).accounts.find((v:any)=>v.id===held.accountId).state,'paused');
 await configure('premium');eq((await status()).executionAllowed,true);
 eq((await status()).accounts.find((v:any)=>v.id===held.accountId).state,'paused');
 // A stale or future heartbeat cannot open execution. The owning runtime reconciles on recovery.
 await configure('standard');
 await call('standard','runtime','claim',{epoch:scopes.standard.epoch});
 await db.query("UPDATE private.galx_relay_installation_runtime SET last_seen_at=clock_timestamp()-interval '46 seconds' WHERE installation_id=$1",[scopes.standard.id]);
 const st=await connect('standard');await call('standard','registrar','connect',st.body);
 eq((await status('standard')).executionAllowed,false);
 await db.query("UPDATE private.galx_relay_installation_runtime SET last_seen_at=clock_timestamp()+interval '1 minute' WHERE installation_id=$1",[scopes.standard.id]);
 await configure('standard');eq((await status('standard')).executionAllowed,false);
 eq((await call('standard','runtime','claim',{epoch:scopes.standard.epoch})).executionAllowed,true);
 // Rejected, removed, expired and revoked accounts cannot activate a closed automatic installation.
 await change(p.accountId,'revoked');await change(held.accountId,'revoked');
 await configure('premium',false);await configure('premium');eq((await status()).executionAllowed,false);
 await db.query("UPDATE private.galx_relay_installation_runtime SET last_seen_at=clock_timestamp()-interval '46 seconds' WHERE installation_id=$1",[scopes.premium.id]);
 const exp=await connect();await call('premium','registrar','connect',exp.body);eq((await status()).executionAllowed,false);
 const writer=await db.connect();try{await writer.query('SET ROLE galx_desktop_writer');
  await writer.query('UPDATE public.galx_shard_accounts SET credential_expires_at_ms=$1 WHERE id=$2',[Date.now()+20000,exp.accountId]);
 }finally{await writer.query('RESET ROLE');writer.release();}
 eq((await call('premium','runtime','claim',{epoch:scopes.premium.epoch})).executionAllowed,false);
 await db.query('UPDATE private.galx_relay_account_control SET connection_state=$1 WHERE account_id=$2',['sign_in_required',exp.accountId]);
 await call('premium','runtime','heartbeat',{epoch:scopes.premium.epoch});eq((await status()).executionAllowed,false);
 const count=Number((await db.query('SELECT count(*) n FROM private.galx_relay_control_operations WHERE installation_id=$1',[scopes.premium.id])).rows[0].n);
 await call('premium','runtime','heartbeat',{epoch:scopes.premium.epoch});
 eq(Number((await db.query('SELECT count(*) n FROM private.galx_relay_control_operations WHERE installation_id=$1',[scopes.premium.id])).rows[0].n),count);
 // Closing while a connection commits never leaves the installation automatically reopened.
 const racing=await connect();
 await Promise.all([call('premium','registrar','connect',racing.body),configure('premium',false)]);
 eq((await status()).automaticActivation,false);eq((await status()).executionAllowed,false);
 await call('premium','runtime','heartbeat',{epoch:scopes.premium.epoch});eq((await status()).executionAllowed,false);
 const removal=(await status()).accounts.find((v:any)=>v.id===racing.accountId);
 await call('premium','operator','set_account',{id:randomUUID(),accountId:racing.accountId,expectedRevision:removal.revision,command:'remove',requestSha256:hash(randomUUID())});
 await configure('premium');eq((await status()).executionAllowed,false);
 // Legacy review/register replay also retains paused intent and emits one automatic enable.
 const legacy=await connect();
 const reviewed={...legacy.body,purpose:'review'};
 await call('premium','registrar','review',reviewed);
 const legacyTicket=hash(randomUUID());await call('premium','operator','ticket',{id:legacy.id,purpose:'register',ticketSha256:legacyTicket});
 const registered={...legacy.body,purpose:'register',ticketSha256:legacyTicket};
 await call('premium','registrar','register',registered);
 await change(legacy.accountId,'paused');
 eq((await call('premium','registrar','register',registered)).replayed,true);
 eq((await status()).accounts.find((v:any)=>v.id===legacy.accountId).state,'paused');
 eq((await status()).activity.filter((v:any)=>v.accountId===legacy.accountId&&v.command==='enabled').length,1);
 console.log(`Automatic activation: ${checks} database checks passed.`);
}
const db=new pg.Pool({connectionString:process.env.DATABASE_URL,max:4});
try{
 await activationDatabaseChecks(db);
 await db.query(await readFile(new URL('../supabase/rollbacks/20260916040459_relay_automatic_activation.down.sql',import.meta.url),'utf8'));
 const closed=(await db.query('SELECT bool_and(NOT automatic_activation AND NOT execution_allowed AND NOT registration_allowed) closed FROM private.galx_relay_installation_runtime')).rows[0];
 assert.equal(closed.closed,true);
 assert.equal((await db.query("SELECT has_function_privilege('galx_relay_control','private.relay_control(text,text,jsonb)','EXECUTE') allowed")).rows[0].allowed,false);
 console.log('Automatic activation rollback: retained records and closed protocol verified.');
}finally{await db.end();}
