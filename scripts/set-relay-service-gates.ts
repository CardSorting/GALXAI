/** Verified installer policy. Runtime/registration events reconcile activation without owner credentials. */
import { readFile,writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { verifyHosts } from './verify-relay-hosts.js';
import { PROJECTS,uuid } from '../src/relay/pool-protocol.js';
const [mode,hostFile]=process.argv.slice(2);if(!['registration','serve','serve-local','close'].includes(mode)||mode==='serve'&&!hostFile)throw Error('Use registration, serve /private/host-input.json, serve-local, or close.');
const authority=JSON.parse(await readFile('.relay/service-deployment/authority.json','utf8'));
let evidence=mode==='serve'?await verifyHosts(hostFile):null;
if(mode==='serve-local'){
  await promisify(execFile)(process.execPath,['scripts/relay-local.mjs','verify'],{timeout:120000,maxBuffer:1048576});
  const bytes=await readFile('.relay/service-deployment/local-acceptance.json','utf8'),proof=JSON.parse(bytes);
  const age=Date.now()-Date.parse(proof.at);
  if(!Number.isFinite(age)||age<0||age>30000||proof.records?.length!==2||!['premium','standard'].every(pool=>proof.records.some((r:any)=>r.pool===pool&&r.installationId===authority.pools[pool].installationId)))throw Error('Fresh installation verification is required for automatic activation. No gates were changed.');
  evidence=createHash('sha256').update(bytes).digest('hex');
}
const execution=mode==='serve'||mode==='serve-local';
const sql=['BEGIN;'];
for(const pool of ['premium','standard']){const p=authority.pools[pool];if(!uuid(p.installationId)||!uuid(p.hostId))throw Error('Invalid deployment identity.');sql.push(execution
  ? `SELECT private.relay_configure_automatic_activation('${pool}','${p.installationId}','${p.hostId}','${evidence}');`
  : `SELECT private.relay_configure_installation('${pool}','${p.installationId}','${p.hostId}','[]'::jsonb,${mode!=='close'},false,NULL);`);}
sql.push('COMMIT;');const file='.relay/service-deployment/gates.sql';await writeFile(file,sql.join('\n'),{mode:0o600});
try{await promisify(execFile)('supabase',['db','query','--linked','--project-ref',PROJECTS.central,'--file',file,'--output','json'],{timeout:60000,maxBuffer:1048576});}
catch{throw Error('Gate transition unconfirmed. Read central status before retrying.');}
console.log(execution ? 'Automatic activation configured. New verified connections enable automatically; each relay activates when ready. Existing pauses are preserved.' : `Central transition confirmed: ${mode}. Automatic activation is disabled; this hold survives heartbeats and restarts.`);
