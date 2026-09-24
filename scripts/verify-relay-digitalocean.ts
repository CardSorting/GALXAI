/** Read-only acceptance for the colocated DigitalOcean central/Premium host. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { serviceOrigin, uuid } from '../src/relay/pool-protocol.js';
import { resolveDesktopCapacity, parseDesktopProfile } from '../src/relay/desktop-capacity.js';

const exec = promisify(execFile);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const digest = (value: unknown): value is string => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
const imageRef = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9._/:@-]+@sha256:[a-f0-9]{64}$/.test(value);
const sshTarget = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9._-]+@[A-Za-z0-9.[\]:_-]+$/.test(value);
const shellQuote = (value: string) => "'" + value.replace(/'/g, "'\"'\"'") + "'";
const imageMatches = (actual: unknown, expectedRef: string, expectedDigest: string) => typeof actual === 'string' && (actual === expectedRef || actual.endsWith(`@${expectedDigest}`));

export function validateDigitalOceanInput(input: any) {
  if (!input || input.provider !== 'digitalocean' || input.region !== 'sfo3') throw Error('DigitalOcean sfo3 is the selected relay region.');
  const profile = parseDesktopProfile(input.profile);
  if (!sshTarget(input.host?.ssh) || !Array.isArray(input.host.addresses) || !input.host.addresses.length || !input.host.addresses.every((value: unknown) => typeof value === 'string' && isIP(value) && !['127.0.0.1', '::1', '0.0.0.0', '::'].includes(value))) throw Error('Provide the Premium Droplet SSH target and every non-loopback address.');
  const origins = { central: serviceOrigin(input.origins?.central), premium: serviceOrigin(input.origins?.premium) };
  if (!origins.central.startsWith('https:') || !origins.premium.startsWith('https:')) throw Error('DigitalOcean relay origins require HTTPS.');
  const expected = input.imageDigests;
  const refs = input.imageRefs;
  for (const name of ['central', 'premium-runtime', 'premium-monitor', 'desktop', 'caddy']) {
    if (!digest(expected?.[name]) || !imageRef(refs?.[name]) || !refs[name].endsWith(`@${expected[name]}`)) throw Error(`Provide the reviewed amd64 image reference and digest for ${name}.`);
  }
  if (!refs.caddy.startsWith('caddy:2.11.4-alpine@')) throw Error('Use the reviewed Caddy 2.11.4 Alpine image reference.');
  const capacity = resolveDesktopCapacity(profile, input.desktopLimits);
  return { profile, capacity, origins, addresses: input.host.addresses as string[], images: expected as Record<string, string>, refs: refs as Record<string, string> };
}

export async function verifyDigitalOceanHost(file: string) {
  const input = JSON.parse(await readFile(file, 'utf8'));
  const parsed = validateDigitalOceanInput(input);
  const authority = JSON.parse(await readFile('.relay/service-deployment/authority.json', 'utf8'));
  if (!uuid(authority.pools?.premium?.installationId)) throw Error('Invalid Premium deployment identity.');
  const host = input.host;
  const sshArgs = ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10'];
  if (typeof host.knownHostsFile === 'string' && host.knownHostsFile) sshArgs.push('-o', `UserKnownHostsFile=${host.knownHostsFile}`);
  sshArgs.push(host.ssh);
  const run = async (command: string) => (await exec('ssh', [...sshArgs, command], { timeout: 60000, maxBuffer: 4 * 1024 * 1024 })).stdout.trim();
  const machine = await run('cat /etc/machine-id');
  const daemon = await run("docker info --format '{{.ID}}'");
  if (!/^[a-f0-9]{32}$/.test(machine) || !daemon || daemon.length > 128) throw Error('Invalid DigitalOcean host identity.');
  if (await run('systemctl is-enabled galx-pool-isolation.service') !== 'enabled' || await run('systemctl is-active galx-pool-isolation.service') !== 'active' || await run('systemctl is-enabled galx-relay-stack.service') !== 'enabled' || await run('systemctl is-active galx-relay-stack.service') !== 'active') throw Error('Persistent DigitalOcean host isolation and relay stack are required.');
  const firewall = JSON.parse(await run('sudo -n nft -j list table inet galx_pool_isolation'));
  const chains = firewall.nftables.map((value: any) => value.chain).filter(Boolean);
  for (const name of ['input', 'output', 'forward']) if (!chains.some((chain: any) => chain.name === name && chain.hook === name && chain.prio === -200 && chain.type === 'filter')) throw Error('DigitalOcean host firewall hook is missing.');
  const firewallText = await run('sudo -n nft list table inet galx_pool_isolation');
  if (!/policy drop/.test(firewallText) || !/tcp dport \{ 80, 443 \} accept/.test(firewallText) || /dport (13300|13301|13311)/.test(firewallText)) throw Error('DigitalOcean host firewall does not enforce the reviewed ingress boundary.');

  const services = (await run("docker ps --filter label=com.docker.compose.project=galx-relay-do --format '{{.ID}} {{.Label \"com.docker.compose.service\"}}'"))
    .split('\n').filter(Boolean).map(line => { const [id, name] = line.split(' '); if (!/^[a-f0-9]{12,64}$/.test(id) || !/^(authority|relay|monitor)$/.test(name)) throw Error('Invalid relay service inventory.'); return { id, name }; });
  if (new Set(services.map(service => service.name)).size !== 3) throw Error('Central, Premium runtime and Premium monitor must all be running.');
  const inspected: Record<string, any> = {};
  for (const service of services) inspected[service.name] = JSON.parse(await run(`docker inspect ${service.id}`))[0];
  const expectedComponents = { authority: 'central', relay: 'runtime', monitor: 'monitor' } as const;
  for (const [service, container] of Object.entries(inspected)) {
    const component = container.Config?.Labels?.['io.galx.component'];
    if (component !== expectedComponents[service as keyof typeof expectedComponents] || container.Config?.Labels?.['io.galx.pool'] && container.Config.Labels['io.galx.pool'] !== 'premium') throw Error('Relay component labels do not match the Premium installation.');
    if (container.Config?.User !== '1000:1000' || container.HostConfig?.Privileged || container.HostConfig?.ReadonlyRootfs !== true || !container.HostConfig?.CapDrop?.includes('ALL')) throw Error('Relay container hardening does not match the reviewed policy.');
    const expectedImage = service === 'authority' ? parsed.images.central : service === 'relay' ? parsed.images['premium-runtime'] : parsed.images['premium-monitor'];
    const expectedRef = service === 'authority' ? parsed.refs.central : service === 'relay' ? parsed.refs['premium-runtime'] : parsed.refs['premium-monitor'];
    if (!imageMatches(container.Config?.Image, expectedRef, expectedImage)) throw Error(`Running ${service} image differs from the reviewed amd64 digest.`);
    const mounts = (container.Mounts ?? []).map((mount: any) => mount.Destination);
    const required = service === 'monitor' ? ['/state', '/run/secrets/component-config', '/var/run/docker.sock'] : service === 'relay' ? ['/state', '/run/secrets/component-config'] : ['/run/secrets/component-config'];
    if (mounts.some((mount: string) => !required.includes(mount)) || required.some(mount => !mounts.includes(mount))) throw Error(`Unexpected ${service} host authority mount.`);
    if (service === 'relay' && (container.HostConfig?.NetworkMode === 'host' || mounts.includes('/var/run/docker.sock'))) throw Error('Premium runtime has host authority.');
    if (service === 'monitor' && container.HostConfig?.NetworkMode !== 'host') throw Error('Premium monitor must bind only to host loopback.');
    if (service === 'authority' && JSON.stringify(container.HostConfig?.PortBindings) !== JSON.stringify({ '3000/tcp': [{ HostIp: '127.0.0.1', HostPort: '13300' }] })) throw Error('Central service is not bound to host loopback.');
    if (service === 'relay' && JSON.stringify(container.HostConfig?.PortBindings) !== JSON.stringify({ '3001/tcp': [{ HostIp: '127.0.0.1', HostPort: '13301' }] })) throw Error('Premium runtime is not bound to host loopback.');
  }
  const edgeRows = (await run("docker ps --filter label=com.docker.compose.project=galx-relay-edge --format '{{.ID}} {{.Label \"com.docker.compose.service\"}}'"))
    .split('\n').filter(Boolean).map(line => { const [id, name] = line.split(' '); if (!/^[a-f0-9]{12,64}$/.test(id) || name !== 'edge') throw Error('Invalid TLS edge inventory.'); return { id, name }; });
  if (edgeRows.length !== 1) throw Error('Exactly one TLS edge must be running.');
  const edge = JSON.parse(await run(`docker inspect ${edgeRows[0].id}`))[0];
  if (!imageMatches(edge.Config?.Image, parsed.refs.caddy, parsed.images.caddy) || edge.HostConfig?.NetworkMode !== 'host' || edge.HostConfig?.Privileged || edge.HostConfig?.ReadonlyRootfs !== true || !edge.HostConfig?.CapDrop?.includes('ALL') || !edge.HostConfig?.CapAdd?.includes('NET_BIND_SERVICE')) throw Error('TLS edge hardening or image does not match the reviewed policy.');
  const edgeMounts = (edge.Mounts ?? []).map((mount: any) => mount.Destination);
  if (!edgeMounts.includes('/etc/caddy/Caddyfile') || !edgeMounts.includes('/data') || !edgeMounts.includes('/config')) throw Error('TLS edge mounts do not match the reviewed policy.');
  const caddyConfig = await run(`docker exec ${edgeRows[0].id} caddy adapt --config /etc/caddy/Caddyfile --adapter caddyfile --pretty`);
  if (!caddyConfig.includes('127.0.0.1:13300') || !caddyConfig.includes('127.0.0.1:13301') || caddyConfig.includes('13311')) throw Error('TLS edge routes do not match the central/Premium-only policy.');
  const desktop = JSON.parse(await run(`docker image inspect ${shellQuote(parsed.refs.desktop)}`));
  if (!desktop[0] || !Array.isArray(desktop[0].RepoDigests) || !desktop[0].RepoDigests.some((value: unknown) => typeof value === 'string' && value.endsWith(`@${parsed.images.desktop}`))) throw Error('The reviewed amd64 desktop image is not loaded by immutable digest.');

  const curl = async (origin: string, route: string, method = 'GET') => {
    const url = new URL(origin + route), status = await run(`curl --silent --show-error --max-time 15 --resolve ${shellQuote(url.hostname + ':443:127.0.0.1')} -X ${method} -o /tmp/galx-health-body -w '%{http_code}' ${shellQuote(url.toString())}`);
    return Number(status);
  };
  if (await curl(parsed.origins.central, '/health/live') !== 200 || await curl(parsed.origins.premium, '/health/live') !== 200 || await curl(parsed.origins.premium, '/v1/models') !== 401) throw Error('Valid HTTPS edge or relay authentication was not observed.');
  const proof = { version: 1, at: new Date().toISOString(), provider: 'digitalocean', region: 'sfo3', profile: parsed.profile, capacity: parsed.capacity, installationId: authority.pools.premium.installationId, machineSha256: hash(machine), daemonSha256: hash(daemon), addresses: parsed.addresses, origins: parsed.origins, images: parsed.images, imageRefs: parsed.refs, scope: 'Colocated central/Premium Docker host, TLS edge, persistent firewall and amd64 image identity; no provider qualification' };
  const bytes = JSON.stringify(proof, null, 2);
  await writeFile('.relay/service-deployment/digitalocean-acceptance.json', bytes, { mode: 0o600 });
  return hash(bytes);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw Error('Provide a private DigitalOcean host-input.json path.');
  await verifyDigitalOceanHost(process.argv[2]);
  console.log('The colocated DigitalOcean central/Premium host passed the recorded checks. Provider qualification remains separate.');
}
