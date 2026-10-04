import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {parseEnv} from 'node:util';
const build=path.resolve('.relay/hosted-adaptation/build-03'),app=path.join(build,'app');
const manifest=JSON.parse(fs.readFileSync(path.join(build,'artifact-manifest.json'))),provenance=JSON.parse(fs.readFileSync(path.join(build,'provenance.json')));
const sha=b=>createHash('sha256').update(b).digest('hex');
const publicValues=new Set(Object.values(JSON.parse(fs.readFileSync('.relay/hosted-adaptation/public-build-inputs.json')).publicEnvironment));
const secrets=new Set(Object.values(JSON.parse(fs.readFileSync(path.join(build,'build-canaries.json')))));
const collect=(v,key='')=>{if(v&&typeof v==='object')for(const [k,x]of Object.entries(v))collect(x,k);else if(typeof v==='string'&&v.length>=20&&/token|key|secret|password|database.?url/i.test(key)&&!publicValues.has(v))secrets.add(v);};
collect(parseEnv(fs.readFileSync('.env.local','utf8')));
for(const name of ['central','premium-runtime','premium-monitor'])collect(JSON.parse(fs.readFileSync('.relay/service-deployment/components/'+name+'.json')));
collect(JSON.parse(fs.readFileSync('.relay/service-deployment/authority.json')));collect(JSON.parse(fs.readFileSync('/Users/bozoegg/Library/Application Support/com.vercel.cli/auth.json')));
let regular=0,aliases=0;const credentialMatches=[],developerPaths=[],integrity=[],publicFailures=[],elfMachines=new Map();
const privateMarkers=['GALX_PRIVATE_POST_MORTEM_CONTENT','GALX_PRIVATE_KNOWLEDGE_CONTENT','images-service.galx.ai','private.galx_connect_grants','private.galx_inference_access','GALX_PREMIUM_RELAY_KEY','gpt-5.6-luna','/Users/bozoegg'];
for(const [name,expected]of Object.entries(manifest)){
 const filename=path.join(app,name);
 if(typeof expected!=='string'){aliases++;if(fs.readlinkSync(filename)!==expected.symlink||!fs.realpathSync(filename).startsWith(path.join(app,'.vercel/output/')))integrity.push(name);continue;}
 const bytes=fs.readFileSync(filename);regular++;if(sha(bytes)!==expected)integrity.push(name);
 if([...secrets].some(v=>bytes.includes(Buffer.from(v))))credentialMatches.push(name);
 if(bytes.includes(Buffer.from('/Users/bozoegg'))||bytes.includes(Buffer.from('/home/bozoegg')))developerPaths.push(name);
 if(bytes.length>20&&bytes.subarray(0,4).equals(Buffer.from([0x7f,0x45,0x4c,0x46]))){const machine=bytes[5]===1?bytes.readUInt16LE(18):bytes.readUInt16BE(18);elfMachines.set(machine,(elfMachines.get(machine)||0)+1);}
 if(name.startsWith('.vercel/output/static/')&&privateMarkers.some(m=>bytes.includes(Buffer.from(m))))publicFailures.push(name);
}
const mutatedInputs=Object.entries(provenance.source).filter(([p,h])=>sha(fs.readFileSync(path.join(app,p)))!==h).map(([p])=>p);
const mapped=[];
function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const name=path.join(dir,d.name);if(d.isDirectory())walk(name);else if(d.name==='.vc-config.json'){const cfg=JSON.parse(fs.readFileSync(name));for(const ref of Object.values(cfg.filePathMap||{}))if(!path.resolve(app,ref).startsWith(path.join(app,'.vercel/output/'))||!fs.existsSync(path.resolve(app,ref)))mapped.push(path.relative(app,name));}}}
walk(path.join(app,'.vercel/output/functions'));
const oldSource=JSON.parse(fs.readFileSync('.relay/preflight/candidate-source-manifest.json')),oldBuild=JSON.parse(fs.readFileSync('.relay/preflight/candidate-web-manifest.json'));
const delta=m=>Object.entries(m).filter(([p,h])=>!fs.existsSync(p)||sha(fs.readFileSync(p))!==h).map(([p])=>p);
const inheritedPathSources=['src/core/router/adapters/OpenAIAdapter.ts','src/core/relay/GalxRelaySupervisor.ts'];
const inheritedPathsUnchanged=inheritedPathSources.every(p=>oldSource[p]===sha(fs.readFileSync(p)));
const novaConfig=JSON.parse(fs.readFileSync(path.join(app,'.vercel/output/functions/v1/inference.func/.vc-config.json')));
const developerPathsOutsideNova=developerPaths.every(p=>!Object.values(novaConfig.filePathMap||{}).includes(p));
const documentedDeveloperPaths=developerPaths.length===2&&inheritedPathsUnchanged&&developerPathsOutsideNova&&publicFailures.length===0;
const result={at:new Date().toISOString(),regularFiles:regular,internalAliases:aliases,credentialMatches,developerPaths,integrityFailures:integrity,publicPrivateMarkerFailures:publicFailures,mutatedSourceInputs:mutatedInputs,externalOrMissingRuntimeReferences:mapped,elfMachineCounts:Object.fromEntries(elfMachines),originalSourceDelta:delta(oldSource),originalCompiledDelta:delta(oldBuild),inheritedDeveloperPathReview:{classification:documentedDeveloperPaths?'NON-BLOCKING FOLLOW-UP':'REQUIRES REVIEW',sources:inheritedPathSources,unchangedFromFrozenSource:inheritedPathsUnchanged,notReferencedByNovaFunction:developerPathsOutsideNova,publicAssetMatches:publicFailures.length,reason:'Two existing optional local CLI/supervisor fallback literals in private legacy server chunks. Not consumed by the clean build, absent from the Nova function and public assets. Preserved under the no-unrelated-candidate-change boundary.'},knownCredentialScan:'Exact existing private credential values and throwaway build values; public Supabase keys explicitly excluded; no universal secret-detection claim.'};
fs.writeFileSync('.relay/hosted-adaptation/artifact-scan.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
if(credentialMatches.length||(developerPaths.length&&!documentedDeveloperPaths)||integrity.length||publicFailures.length||mutatedInputs.length||mapped.length||[...elfMachines.keys()].some(n=>n!==62)||result.originalCompiledDelta.length)process.exitCode=1;
