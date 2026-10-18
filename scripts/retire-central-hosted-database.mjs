/** Exact hosted-source cost stop, or separately approved permanent retirement. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';
import pg from 'pg';
import { localPostgresTableManifest } from './local-postgres.mjs';
const state='.data/postgres-cutover',project='mazhcjisettrzbqhorvp',premium='prgjcyokylzcsqrjmkaa';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const save=async(file,value)=>{await fs.writeFile(state+'/'+file,JSON.stringify(value,null,2),{mode:0o600});await fs.chmod(state+'/'+file,0o600);};
const token=(await fs.readFile(state+'/management-token.secret','utf8')).trim();
async function api(method,endpoint){const response=await fetch('https://api.supabase.com/v1'+endpoint,{method,headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Management request failed with status '+response.status);return {status:response.status,body:await response.text()};}
async function inspect(){
 const cutover=await read(state+'/central-cutover.json'),phase=await read(state+'/phase.json'),recovery=await read(state+'/central-offdevice-recovery.json'),publicChecks=await read(state+'/public-account-cutover-acceptance.json'),owner=await read(state+'/native-owner-acceptance.json'),library=await read(state+'/native-library-correction.json');
 assert.equal(cutover.phase,'local-running');assert(cutover.sourceHashVerified&&cutover.guardsRemoved);assert.equal(phase.state,'central-local-authority');assert.equal(phase.publicTraffic,true);
 assert(recovery.offDeviceRecoveryVerified&&recovery.bucketPrivate&&recovery.uploaded&&recovery.roleGrantRecipeUploaded&&recovery.restoredTables===196);assert(Date.now()-Date.parse(recovery.verifiedAt)<86400000);
 assert.equal(publicChecks.result,'pass');assert(publicChecks.browserAssets>=30&&publicChecks.privateMatches===0);assert(owner.actualGithubProviderReturn&&owner.existingAccountUuidPreserved&&owner.nativeActiveSession);assert.equal(library.result,'pass');
 const projects=JSON.parse((await api('GET','/projects')).body),target=projects.find(p=>(p.ref||p.id)===project);assert.equal(target?.name,'GALXAI');assert.equal(target.region,'us-west-2');assert(!projects.some(p=>(p.ref||p.id)===premium));
 const organization=target.organization_slug||target.organization_id;assert.equal(organization,'jklmauhrqxjkpcurpmwz','Original organization identity changed; inspect before retirement.');
 const organizationProjects=projects.filter(p=>(p.organization_slug||p.organization_id)===organization);assert.equal(organizationProjects.length,1,'Other organization projects require separate billing scope review.');
 const functions=JSON.parse((await api('GET','/projects/'+project+'/functions')).body);assert(Array.isArray(functions)&&functions.length===0,'Unexpected hosted functions require separate inventory.');
 const env=parseEnv(await fs.readFile(state+'/central-source.secret.env','utf8')),url=new URL(env.DATABASE_URL),retained=await read(state+'/central-hosted.secret.json');assert(decodeURIComponent(url.username).endsWith('.'+project)&&url.hostname.endsWith('.pooler.supabase.com')&&retained.databaseCa&&!retained.databaseDeployment);
 const source=new pg.Client({host:url.hostname,port:5432,user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:'postgres',ssl:{rejectUnauthorized:true,ca:retained.databaseCa},connectionTimeoutMillis:10000});await source.connect();let sourceIds,platform;
 try{
  assert.equal((await source.query("SELECT count(*)::int count FROM pg_trigger WHERE tgname='galx_source_retired_20261017' AND tgenabled='O'")).rows[0].count,195);
  for(const table of ['auth.users','auth.sessions','private.galx_relay_installation_runtime']){
   await source.query('BEGIN');let code;try{await source.query('DELETE FROM '+table+' WHERE false');}catch(error){code=error.code;}finally{await source.query('ROLLBACK');}assert.equal(code,'25006');
  }
  const finalManifest=await read(cutover.finalSource+'/manifest.json');
  await source.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL timezone='UTC'; SET LOCAL statement_timeout='120s'");
  try{assert.deepEqual(await localPostgresTableManifest(source,finalManifest.included),finalManifest.tables,'Hosted snapshot changed after its guard; reconcile before retirement.');}finally{await source.query('ROLLBACK');}
  sourceIds=(await source.query('SELECT id FROM auth.users ORDER BY id')).rows.map(r=>r.id);platform={};
  for(const table of ['storage.objects','storage.buckets','vault.secrets']){
   const present=(await source.query('SELECT to_regclass($1) IS NOT NULL present',[table])).rows[0].present;const count=present?Number((await source.query('SELECT count(*) FROM '+table)).rows[0].count):0;assert.equal(count,0,'Unexpected source platform data requires separate recovery review.');platform[table]=count;
  }
  const cron=(await source.query("SELECT to_regclass('cron.job') IS NOT NULL present")).rows[0].present;assert(!cron||Number((await source.query('SELECT count(*) FROM cron.job WHERE active')).rows[0].count)===0);
 }finally{await source.end();}
 const native=new pg.Client({host:path.resolve('.data/local-postgres/central/socket'),port:55432,user:os.userInfo().username,database:'galxai'});await native.connect();let nativeCount;
 try{const ids=new Set((await native.query('SELECT id FROM auth.users')).rows.map(r=>r.id));assert(sourceIds.every(id=>ids.has(id)));nativeCount=ids.size;}finally{await native.end();}
 const review={observedAt:new Date().toISOString(),project,name:target.name,region:target.region,organization,organizationProjectsBeforeDeletion:organizationProjects.length,sourceUsersPreserved:sourceIds.length,nativeUsers:nativeCount,sourceGuardTables:195,platformDataCounts:platform,hostedFunctions:0,activeScheduledJobs:0,offDeviceRecoverySha256:recovery.encryptedSha256,offDeviceRecoveryVerified:true,nativePublicAndLibraryAccepted:true,actualGithubReturn:true,googleCredentialHandoffPending:!await fs.access(state+'/google-provider-acceptance.json').then(()=>true,()=>false),premiumHostedAlreadyDeleted:true,proposedAction:'Permanently delete only hosted GALXAI and verify project absence. Preserve native clusters, R2, external vault-seed recovery, OAuth clients and billing/invoice records.',limits:'Database/role recipe recovery is accepted; VM/queue/full-secret recovery is separate. Google credential replacement and Premium sign-in renewal remain separate if still pending. Paid organization subscription is a separate cancellation after project removal.'};
 await save('central-retirement-review.json',review);return review;
}
async function finishPause(receipt){
 assert.equal(receipt.project,project);assert.equal(receipt.organizationPlan,'Free');assert(receipt.proSubscriptionCancelled);assert(['pause-submitted','free-and-paused-verified'].includes(receipt.phase));
 for(let attempt=0;attempt<30;attempt++){
  const target=JSON.parse((await api('GET','/projects')).body).find(p=>(p.ref||p.id)===project);assert.equal(target?.name,'GALXAI');
  receipt.lastObservedStatus=target.status;await save('central-hosted-cost-stop.json',receipt);
  if(target.status==='INACTIVE'){
   receipt.phase='free-and-paused-verified';receipt.pausedAt=new Date().toISOString();receipt.hostedProjectDeleted=false;await save('central-hosted-cost-stop.json',receipt);
   const cutover=await read(state+'/central-cutover.json');await save('central-cutover.json',{...cutover,hostedProjectPaused:true,hostedPausedAt:receipt.pausedAt});
   console.log('Original organization is Free and hosted GALXAI is INACTIVE. Premium remains deleted. Native authority is unchanged; historical invoices are retained.');return;
  }
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
 throw Error('Pause acknowledgement is still pending. Use inspect-pause; never repeat the POST.');
}
try{
 if(process.argv[2]==='review'&&process.argv.length===3){const review=await inspect();console.log(JSON.stringify(review));}
 else if(process.argv[2]==='pause'&&process.argv.length===3){
  const receipt=await read(state+'/central-hosted-cost-stop.json');assert.equal(receipt.phase,'free-plan-verified');assert.equal(receipt.organizationPlan,'Free');assert(receipt.proSubscriptionCancelled);
  await inspect();const target=JSON.parse((await api('GET','/projects')).body).find(p=>(p.ref||p.id)===project);assert.equal(target?.status,'ACTIVE_HEALTHY','Reconcile existing source status before submitting any pause.');
  receipt.nativeAcceptanceAndRecoveryReviewSha256=(await import('node:crypto')).createHash('sha256').update(await fs.readFile(state+'/central-retirement-review.json')).digest('hex');
  receipt.phase='pause-submitted';receipt.pauseSubmittedAt=new Date().toISOString();await save('central-hosted-cost-stop.json',receipt);
  const result=await api('POST','/projects/'+project+'/pause');receipt.pauseResponseStatus=result.status;await save('central-hosted-cost-stop.json',receipt);assert.equal(result.status,200);await finishPause(receipt);
 }
 else if(process.argv[2]==='inspect-pause'&&process.argv.length===3){await finishPause(await read(state+'/central-hosted-cost-stop.json'));}
 else if(process.argv[2]==='retire'){
  assert.equal(process.argv[3],'--approved-project');assert.equal(process.argv[4],project);assert.equal(process.argv.length,5);
  const review=await inspect(),file='central-hosted-retirement.json';try{await fs.access(state+'/'+file);throw Error('Deletion phase exists; inspect instead of resubmitting.');}catch(error){if(error.code!=='ENOENT')throw error;}
  const receipt={project,name:'GALXAI',authorized:true,phase:'deletion-submitted',submittedAt:new Date().toISOString(),recoverySha256:review.offDeviceRecoverySha256};await save(file,receipt);
  const result=await api('DELETE','/projects/'+project);receipt.responseStatus=result.status;await save(file,receipt);assert.equal(result.status,200);
  const after=JSON.parse((await api('GET','/projects')).body);assert(!after.some(p=>[project,premium].includes(p.ref||p.id)));receipt.phase='deleted-verified';receipt.verifiedAt=new Date().toISOString();await save(file,receipt);
  const phase=await read(state+'/central-cutover.json');await save('central-cutover.json',{...phase,hostedProjectRetired:true,hostedRetiredAt:receipt.verifiedAt});
  console.log('Both hosted database projects are absent. Native authority and recovery artifacts are retained; organization subscription cancellation is separate.');
 }else throw Error('Use review, pause, inspect-pause, or retire --approved-project <exact approved central project>.');
}catch(error){await fs.writeFile(state+'/central-retirement-error.secret.log',String(error.stack||error.message),{mode:0o600});console.error('Hosted source operation stopped; inspect its private review/phase before continuing. No mutation was automatically retried.');process.exitCode=1;}
