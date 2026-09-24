import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp,writeFile,rm,mkdir,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const releaseTag=process.env.GALX_RELAY_SERVICE_TAG ?? 'candidate-20260915';
if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(releaseTag))throw Error('Invalid service image tag');
const pinned=process.env.GALX_RELAY_IMAGE_MANIFEST?JSON.parse(await readFile(process.env.GALX_RELAY_IMAGE_MANIFEST,'utf8')).images:undefined;
if(pinned&&(!Array.isArray(pinned)||pinned.length!==3))throw Error('Invalid image manifest');
const exec=promisify(execFile),directory=await mkdtemp(path.join(tmpdir(),'galx-service-images-'));let checks=0;const images=[];
const run=async(args)=>(await exec('docker',args,{timeout:60000,maxBuffer:2097152})).stdout;
const check=(condition)=>{assert(condition);checks++;};
try{
 for(const [name,component,pool] of [['galxai-relay-central','central'],['galxai-relay-premium','runtime','premium'],['galxai-monitor-premium','monitor','premium']]){
  const pin=pinned?.find(i=>i.component===component&&i.pool===pool);
  if(pinned&&(!pin||!new RegExp('^'+name+':[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$').test(pin.tag)))throw Error('Manifest image mismatch');
  const tag=pin?.tag??name+':'+releaseTag,metadata=JSON.parse(await run(['image','inspect',tag]))[0];if(pin)check(metadata.Id===pin.id);check(metadata.Config.User==='1000:1000');check(metadata.Config.Labels['io.galx.component']===component);if(pool)check(metadata.Config.Labels['io.galx.pool']===pool);
  const output=await run(['run','--rm','--network','none','--read-only','--cap-drop','ALL','--entrypoint','node',tag,'--input-type=module','-e',"import fs from 'node:fs';import sharp from 'sharp';import pg from 'pg';import '/app/service.mjs';const p=JSON.parse(fs.readFileSync('/app/component.json'));if(fs.existsSync('/app/.env.local')||fs.existsSync('/app/post-mortem')||process.getuid()===0)throw Error();await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();console.log(JSON.stringify(p));"]);const policy=JSON.parse(output);check(policy.component===component);if(pool)check(policy.pool===pool);
  let failed=false;try{await run(['run','--rm','--network','none','--read-only','--cap-drop','ALL','--env','DATABASE_URL=synthetic-forbidden',tag]);}catch(e){failed=true;check(!String(e.stdout).includes('synthetic-forbidden')&&!String(e.stderr).includes('synthetic-forbidden'));}check(failed);
  if(pool){const file=path.join(directory,pool+'-'+component+'.json');await writeFile(file,JSON.stringify({pool:'retired',installationId:'11111111-1111-4111-8111-111111111111'}),{mode:0o644});let denied=false;try{await run(['run','--rm','--network','none','--read-only','--cap-drop','ALL','--mount',`type=bind,src=${file},dst=/run/secrets/component-config,readonly`,tag]);}catch{denied=true;}check(denied);}
  images.push({tag,id:metadata.Id,architecture:metadata.Architecture,component,...(pool?{pool}:{})});
 }
 const environment={...process.env,GALX_CENTRAL_CONFIG_FILE:directory+'/central.json',GALX_PREMIUM_RUNTIME_CONFIG_FILE:directory+'/premium-runtime.json',GALX_PREMIUM_MONITOR_CONFIG_FILE:directory+'/premium-monitor.json',GALX_DOCKER_SOCKET_GID:'998'};
 for(const pool of ['central','premium']){const result=JSON.parse((await exec('docker',['compose','--env-file','/dev/null','-f',`docker/relay-pools/services.${pool}.yaml`,'config','--format','json'],{env:environment})).stdout);check(result.name=== (pool==='central'?'galx-relay-authority':'galx-'+pool));for(const service of Object.values(result.services)){check(service.read_only===true);check(service.user==='1000:1000');}}
 await mkdir('.relay',{recursive:true});await writeFile('.relay/service-images-verification.json',JSON.stringify({at:new Date().toISOString(),checks,images,scope:'native image packaging, dependency load, unsafe environment and cross-pool rejection, Compose configuration; no serving or host acceptance'},null,2));
 console.log(`${checks} service image checks passed for ${images.length} images.`);
}finally{await rm(directory,{recursive:true,force:true});}
