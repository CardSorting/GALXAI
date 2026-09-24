/** Read-only acceptance on the dedicated Premium Linux host. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const exec=promisify(execFile),hash=(v:string)=>createHash('sha256').update(v).digest('hex');
export async function verifyHosts(file:string) {
 const input=JSON.parse(await readFile(file,'utf8')),authority=JSON.parse(await readFile('.relay/service-deployment/authority.json','utf8'));const records:any[]=[];
 for(const pool of ['premium'] as const){
  const own=input[pool];
  if(!/^[\w.-]+@[\w.-]+$/.test(own?.ssh)||!Array.isArray(own.addresses)||!own.addresses.length||!own.addresses.every((ip:string)=>isIP(ip)&&!['127.0.0.1','::1','0.0.0.0','::'].includes(ip)))throw Error('Provide the Premium SSH target and every public/private IPv4/IPv6 address.');
  const run=async(command:string)=>(await exec('ssh',['-o','BatchMode=yes','-o','ConnectTimeout=10',own.ssh,command],{timeout:45000,maxBuffer:2097152})).stdout.trim();
  const machine=await run('cat /etc/machine-id'),daemon=await run("docker info --format '{{.ID}}'");
  if(!/^[a-f0-9]{32}$/.test(machine)||!daemon||daemon.length>128)throw Error('Invalid host identity.');
  if(await run('systemctl is-enabled galx-pool-isolation.service')!=='enabled'||await run('systemctl is-active galx-pool-isolation.service')!=='active')throw Error('Persistent host isolation is required.');
  const firewall=JSON.parse(await run('sudo -n nft -j list table inet galx_pool_isolation'));
  const chains=firewall.nftables.map((v:any)=>v.chain).filter(Boolean);
  for(const chain of ['input','output','forward']) if(!chains.some((c:any)=>c.name===chain&&c.hook===chain&&c.prio===-200&&c.type==='filter'))throw Error('Host firewall hook is missing.');
  const ids=await run(`docker ps --filter label=com.docker.compose.project=galx-${pool} --format '{{.ID}}'`);
  if(ids.split('\n').filter(Boolean).length!==2||!ids.split('\n').every((id:string)=>/^[a-f0-9]{12}$/.test(id)))throw Error('Both isolated services must be running on this host.');
  const containers=JSON.parse(await run('docker inspect '+ids.split('\n').join(' ')));
  for(const c of containers){const component=c.Config.Labels['io.galx.component'];if(!['runtime','monitor'].includes(component)||c.Config.Labels['io.galx.pool']!==pool||c.Config.User!=='1000:1000'||c.HostConfig.Privileged||!c.HostConfig.ReadonlyRootfs||!c.HostConfig.CapDrop?.includes('ALL'))throw Error('Container policy mismatch.');
    const mounts=c.Mounts.map((m:any)=>m.Destination);if(mounts.some((p:string)=>!['/state','/run/secrets/component-config',...(component==='monitor'?['/var/run/docker.sock']:[])].includes(p)))throw Error('Unexpected host authority mount.');
    if(component==='runtime'&&(c.HostConfig.NetworkMode==='host'||mounts.includes('/var/run/docker.sock')))throw Error('Runtime has host authority.');
    if(component==='monitor'&&c.HostConfig.NetworkMode!=='host')throw Error('Monitor must bind the host loopback only.');
    const expected=input.images?.[pool+'-'+component];if(!/^sha256:[a-f0-9]{64}$/.test(expected)||c.Image!==expected)throw Error('Running image differs from reviewed image ID.');
  }
  records.push({pool,installationId:authority.pools[pool].installationId,machineSha256:hash(machine),daemonSha256:hash(daemon),addresses:own.addresses,firewallSha256:hash(JSON.stringify(firewall)),images:containers.map((c:any)=>({component:c.Config.Labels['io.galx.component'],id:c.Image}))});
 }
 const proof={version:1,at:new Date().toISOString(),records,scope:'Premium host and daemon identity, persistent firewall hooks, matching running images; no provider qualification'};
 const bytes=JSON.stringify(proof,null,2);await writeFile('.relay/service-deployment/host-acceptance.json',bytes,{mode:0o600});return hash(bytes);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){if(!process.argv[2])throw Error('Provide a private host-input.json path.');await verifyHosts(process.argv[2]);console.log('The Premium execution host passed the recorded checks. Provider qualification remains separate.');}
