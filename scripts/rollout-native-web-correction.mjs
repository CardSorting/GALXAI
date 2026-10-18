/** Reviewed immutable web/Nova replacement on the same native authority. No database/DNS change. */
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
const exec=promisify(execFile),state='.data/postgres-cutover';
const correction=process.argv[2]||'web';
const corrections={
 web:{role:'web',previous:'web-plan-final',next:'web-plan-cookie-fix',receipt:'web-cookie-correction.json'},
 nova:{role:'nova',previous:'nova-plan-final',next:'nova-plan-terminal-fix',receipt:'nova-terminal-correction.json'},
 'web-notice':{role:'web',previous:'web-plan-cookie-fix',next:'web-plan-no-busy-notice',receipt:'web-notice-correction.json'},
 'web-create-asset':{role:'web',previous:'web-plan-no-busy-notice',next:'web-plan-create-asset',receipt:'web-create-asset-correction.json'},
 'web-image-viewer':{role:'web',previous:'web-plan-create-asset',next:'web-plan-image-viewer',receipt:'web-image-viewer-correction.json'},
};
assert(Object.hasOwn(corrections,correction)&&process.argv.length<4,'Choose only a reviewed web, nova, web-notice, web-create-asset or web-image-viewer correction.');
const selected=corrections[correction],role=selected.role,nova=role==='nova';
const previousPlan=state+'/'+selected.previous,nextPlan=state+'/'+selected.next,receiptFile=state+'/'+selected.receipt;
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const save=async value=>{await fs.writeFile(receiptFile,JSON.stringify(value,null,2),{mode:0o600});await fs.chmod(receiptFile,0o600);};
const run=async(bin,args,timeout=120000)=>(await exec(bin,args,{timeout,maxBuffer:2097152,encoding:'utf8'})).stdout;
const docker=args=>run('docker',['--context','desktop-linux',...args]);
try{
 assert.equal((await read(state+'/phase.json')).state,'central-local-authority');assert.equal((await read(state+'/central-cutover.json')).phase,'local-running');assert.equal((await read(state+'/ingress-cutover.json')).phase,'routed');
 try{await fs.access(receiptFile);throw Error('A correction phase already exists; inspect it before any new mutation.');}catch(error){if(error.code!=='ENOENT')throw error;}
 const old=await read(previousPlan+'/plan.json'),next=await read(nextPlan+'/plan.json');
 assert.equal(old.project,next.project);assert.equal(next.project,nova?'galx-web-nova-native':'galx-web-account-migration');assert.equal(next.port,nova?17789:17788);assert.equal(old.configFile,next.configFile);assert.equal(old.configSha256,next.configSha256);assert.notEqual(old.image,next.image);
 const name=next.project+'-web-1',before=JSON.parse(await docker(['inspect',name]))[0];assert.equal(before.Image,old.image);assert.equal(before.Config.Labels['ai.galx.self-host'],'v1');assert.equal(before.Config.Labels['com.docker.compose.project'],next.project);assert(before.State.Running&&before.HostConfig.ReadonlyRootfs);
 assert(before.Mounts.every(m=>m.Type==='tmpfs'||m.Destination==='/run/secrets/galx-runtime.json'&&m.Type==='bind'&&!m.RW),'No persistent data volume may be removed.');
 const receipt={role,phase:'draining',startedAt:new Date().toISOString(),previousContainerId:before.Id,previousImage:old.image,nextImage:next.image,previousPlan,nextPlan,databaseChanged:false,publicRoutingChanged:false,previousPackageRetained:true};await save(receipt);
 await run(process.execPath,['scripts/self-host.mjs','stop',previousPlan],520000);
 const stopped=JSON.parse(await docker(['inspect',before.Id]))[0];assert(!stopped.State.Running&&!stopped.State.OOMKilled&&stopped.State.ExitCode===0&&stopped.State.Error==='');receipt.phase='cleanly-stopped';await save(receipt);
 // Accepted state lives in native PostgreSQL/R2, never this read-only image or tmpfs.
 await docker(['rm',before.Id]);receipt.phase='disposable-container-removed';await save(receipt);
 await run(process.execPath,['scripts/self-host.mjs','stage',nextPlan]);
 const after=JSON.parse(await docker(['inspect',name]))[0];assert.equal(after.Image,next.image);assert.equal(after.State.Health.Status,'healthy');assert(after.State.Running);
 receipt.phase='corrected-running';receipt.containerId=after.Id;receipt.startedAt=new Date().toISOString();await save(receipt);
 console.log('Reviewed '+role+' correction is healthy on the same native authority; previous package/configuration retained and no database or public route changed.');
}catch(error){await fs.writeFile(state+'/'+correction+'-correction-error.secret.log',String(error.stderr||error.stack||error.message),{mode:0o600});console.error('Correction stopped; inspect its private phase before retrying. No request, database rollback or mutation was replayed.');process.exitCode=1;}
