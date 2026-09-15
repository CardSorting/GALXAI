/** Read-only acceptance on actual dedicated Linux hosts; never accepts two local Compose projects as isolation. */
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
 for(const pool of ['premium','standard'] as const){
  const own=input[pool],peer=input[pool==='premium'?'standard':'premium'];
  if(!/^[\w.-]+@[\w.-]+$/.test(own?.ssh)||own.ssh===peer?.ssh||!Array.isArray(own.addresses)||!own.addresses.length||!own.addresses.every((ip:string)=>isIP(ip)&&!['127.0.0.1','::1','0.0.0.0','::'].includes(ip)))throw Error('Provide distinct SSH targets and every public/private IPv4/IPv6 address.');
  const run=async(command:string)=>(await exec('ssh',['-o','BatchMode=yes','-o','ConnectTimeout=10',own.ssh,command],{timeout:45000,maxBuffer:2097152})).stdout.trim();
  const machine=await run('cat /etc/machine-id'),daemon=await run("docker info --format '{{.ID}}'");
  if(!/^[a-f0-9]{32}$/.test(machine)||!daemon||daemon.length>128)throw Error('Invalid host identity.');
  if(await run('systemctl is-enabled galx-pool-isolation.service')!=='enabled'||await run('systemctl is-active galx-pool-isolation.service')!=='active')throw Error('Persistent peer denial is required.');
  const firewall=JSON.parse(await run('sudo -n nft -j list table inet galx_pool_isolation'));
  const rules=firewall.nftables.map((v:any)=>v.rule).filter(Boolean),chains=firewall.nftables.map((v:any)=>v.chain).filter(Boolean);
  for(const chain of ['input','output','forward']){
   if(!chains.some((c:any)=>c.name===chain&&c.hook===chain&&c.prio===-200&&c.type==='filter'))throw Error('Peer firewall hook is missing.');
   for(const ip of peer.addresses){if(!isIP(ip))throw Error('Invalid peer address.');for(const direction of chain==='input'?['saddr']:chain==='output'?['daddr']:['saddr','daddr']){
    if(!rules.some((r:any)=>r.chain===chain&&r.expr.some((e:any)=>e.drop!==undefined)&&r.expr.some((e:any)=>e.match?.op==='=='&&e.match.right===ip&&e.match.left?.payload?.field===direction&&e.match.left.payload.protocol===(isIP(ip)===4?'ip':'ip6'))))throw Error('Peer address is not blocked in every required direction.');
   }}
  }
  const ids=await run(`docker ps --filter label=com.docker.compose.project=galx-${pool} --format '{{.ID}}'`);
  if(ids.split('\n').filter(Boolean).length!==2||!ids.split('\n').every((id:string)=>/^[a-f0-9]{12}$/.test(id)))throw Error('Both isolated services must be running on this host.');
  const containers=JSON.parse(await run('docker inspect '+ids.split('\n').join(' ')));
  for(const c of containers){const component=c.Config.Labels['io.galx.component'];if(!['runtime','monitor'].includes(component)||c.Config.Labels['io.galx.pool']!==pool||c.Config.User!=='1000:1000'||c.HostConfig.Privileged||!c.HostConfig.ReadonlyRootfs||!c.HostConfig.CapDrop?.includes('ALL'))throw Error('Container policy mismatch.');
    const mounts=c.Mounts.map((m:any)=>m.Destination);if(mounts.some((p:string)=>!['/state','/run/secrets/component-config',...(component==='monitor'?['/var/run/docker.sock']:[])].includes(p)))throw Error('Unexpected host authority mount.');
    if(component==='runtime'&&(c.HostConfig.NetworkMode==='host'||mounts.includes('/var/run/docker.sock')))throw Error('Runtime has host authority.');
    if(component==='monitor'&&c.HostConfig.NetworkMode!=='host')throw Error('Monitor must bind the host loopback only.');
    const expected=input.images?.[pool+'-'+component];if(!/^sha256:[a-f0-9]{64}$/.test(expected)||c.Image!==expected)throw Error('Running image differs from reviewed image ID.');
  }
  // Check actual host and bridge-container paths in addition to rule inspection.
  const runtime=containers.find((c:any)=>c.Config.Labels['io.galx.component']==='runtime');
  for(const ip of peer.addresses){const url=`https://${isIP(ip)===6?'['+ip+']':ip}:443/`;
   const probe=await exec('ssh',['-o','BatchMode=yes',own.ssh,'curl --noproxy "*" --insecure --connect-timeout 3 --max-time 4 --silent --output /dev/null '+url],{timeout:10000}).then(()=>true,()=>false);if(probe)throw Error('Peer HTTPS is reachable from the host.');
   const code=`const net=require('node:net');const s=net.connect({host:${JSON.stringify(ip)},port:443});s.on('connect',()=>process.exit(1));s.on('error',()=>process.exit(0));setTimeout(()=>process.exit(0),3000);`;
   const quoted="'"+code.replaceAll("'","'\\''")+"'";
   await run(`docker exec ${runtime.Id} node -e ${quoted}`);
  }
  records.push({pool,installationId:authority.pools[pool].installationId,machineSha256:hash(machine),daemonSha256:hash(daemon),addresses:own.addresses,firewallSha256:hash(JSON.stringify(firewall)),images:containers.map((c:any)=>({component:c.Config.Labels['io.galx.component'],id:c.Image}))});
 }
 if(records[0].machineSha256===records[1].machineSha256||records[0].daemonSha256===records[1].daemonSha256||records[0].addresses.some((ip:string)=>records[1].addresses.includes(ip)))throw Error('Shared execution host or daemon is forbidden.');
 const proof={version:1,at:new Date().toISOString(),records,scope:'distinct host and daemon identities, persistent rules, matching running images, peer HTTPS denial; no provider qualification'};
 const bytes=JSON.stringify(proof,null,2);await writeFile('.relay/service-deployment/host-acceptance.json',bytes,{mode:0o600});return hash(bytes);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){if(!process.argv[2])throw Error('Provide a private host-input.json path.');await verifyHosts(process.argv[2]);console.log('Both execution hosts passed the recorded checks. Provider qualification remains separate.');}
