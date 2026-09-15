#!/usr/bin/env node
/** Local operations only. Colima owns separate Linux/Docker guests; no cloud provisioning. */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync, rmdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { monitorOrigin, monitorTicket, monitorAvailable, runtimeAvailable, monitorHandoff } from './lib/relay-local-access.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const state = path.join(root, '.relay/service-deployment');
const pki = path.join(state, 'local-tls');
const components = path.join(state, 'components');
const pools = ['premium', 'standard'];
const gateway = '192.168.105.2';
const [action, selected] = process.argv.slice(2);
const reviewedImages = JSON.parse(readFileSync('docker/relay-pools/local/images.json')).images;
function run(bin, args, input) {
  return execFileSync(bin, args, { cwd: root, encoding: 'utf8', input, timeout: 120000, maxBuffer: 4 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
const sshConfigs = new Map();
function guest(pool, args, input) {
  if (!sshConfigs.has(pool)) {
    const filename = path.join(state, `ssh-${pool}.conf`);
    writeFileSync(filename, run('colima', ['ssh-config', pool]), { mode: 0o600 });
    sshConfigs.set(pool, filename);
  }
  const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
  return run('ssh', ['-F', sshConfigs.get(pool), '-T', '-o', 'ConnectTimeout=8', `colima-${pool}`, args.map(quote).join(' ')], input);
}
function docker(pool, args) { return run('docker', ['--context', pool === 'central' ? 'desktop-linux' : `colima-${pool}`, ...args]); }
function checkImages(pool) {
  for (const image of reviewedImages.filter(image => !pool || !image.pool || image.pool === pool)) {
    if (docker(image.pool ?? 'central', ['image', 'inspect', image.tag, '--format', '{{.Id}}']) !== image.id) throw Error('A local image differs from the reviewed service release.');
  }
}
async function waitFor(check, seconds) {
  const until = Date.now() + seconds * 1000;
  do { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 1000)); } while (Date.now() < until);
  throw Error('Startup is taking longer than expected. Try opening the monitor again shortly.');
}
async function wakeMonitor(pool, repair = false) {
  monitorOrigin(pool);
  if (!repair && await monitorAvailable(pool) && await runtimeAvailable(pool)) return;
  // A shared startup lock serializes central Compose changes across launcher processes.
  const lock = path.join(state, 'launcher.lock');
  let acquired = false;
  try {
    await waitFor(() => {
      try { mkdirSync(lock, { mode: 0o700 }); writeFileSync(path.join(lock, 'pid'), String(process.pid), { mode: 0o600 }); acquired = true; return true; }
      catch (e) {
        if (e.code !== 'EEXIST') throw e;
        try {
          const pid = Number(readFileSync(path.join(lock, 'pid'), 'utf8'));
          if (!Number.isSafeInteger(pid) || pid < 1) throw Error('Invalid launcher lock.');
          try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') { unlinkSync(path.join(lock, 'pid')); rmdirSync(lock); } }
        } catch (error) { if (!['ENOENT', 'ENOTEMPTY'].includes(error.code)) throw error; }
        return false;
      }
    }, 240);
    if (!repair && await monitorAvailable(pool) && await runtimeAvailable(pool)) return;
    console.log(`Starting ${pool === 'premium' ? 'Premium' : 'Standard'}…`);
    if (!existsSync(path.join(homedir(), '.colima', pool, 'colima.yaml'))) throw Error('This monitor has not been installed on this Mac.');
    const desktopReady = () => { try { docker('central', ['info', '--format', '{{.ID}}']); return true; } catch { return false; } };
    if (!desktopReady()) { run('open', ['-gj', '-a', 'Docker']); await waitFor(desktopReady, 90); }
    run('colima', ['start', pool, '--activate=false', '--ssh-config=false']);
    // Verify this installation against the previously accepted local VM identity.
    const proof = JSON.parse(readFileSync(path.join(state, 'local-acceptance.json')));
    const saved = proof.records?.find(record => record.pool === pool);
    const digest = value => createHash('sha256').update(value).digest('hex');
    if (!saved || saved.machineSha256 !== digest(guest(pool, ['cat', '/etc/machine-id'])) || saved.daemonSha256 !== digest(docker(pool, ['info', '--format', '{{.ID}}']))) throw Error('The local installation changed. Verify it before opening the monitor.');
    if (guest(pool, ['sh', '-c', 'findmnt -rn -t virtiofs,9p,fuse.sshfs || true']) || guest(pool, ['systemctl', 'is-active', 'galx-local-isolation.service']) !== 'active') throw Error('Local isolation is unavailable. Service startup was stopped.');
    checkImages(pool);
    centralCompose(['up', '-d', '--no-build', '--pull', 'never']);
    await startPool(pool);
  } finally {
    if (acquired) { unlinkSync(path.join(lock, 'pid')); rmdirSync(lock); }
  }
}
async function startPool(pool) {
  poolCompose(pool, ['up', '-d', '--no-build', '--pull', 'never', 'monitor']);
  await waitFor(() => monitorAvailable(pool), 45);
  if (await runtimeAvailable(pool)) return;
  const config = JSON.parse(readFileSync(path.join(components, `${pool}-monitor.json`)));
  const deadline = await monitorHandoff(pool, config);
  if (deadline > Date.now()) console.log('Waiting for the previous runtime to release ownership…');
  await waitFor(() => Date.now() >= deadline, 67);
  poolCompose(pool, ['up', '-d', '--no-build', '--pull', 'never', 'relay']);
  await waitFor(() => runtimeAvailable(pool), 45);
}
function installFile(pool, filename, bytes, mode = 0o600) {
  if (!/^\/opt\/galx\/[a-zA-Z0-9/_.-]+$/.test(filename)) throw Error('Invalid guest destination.');
  guest(pool, ['sudo', 'python3', '-c',
    'import sys,pathlib,os; p=pathlib.Path(sys.argv[1]); p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(sys.stdin.buffer.read()); os.chown(p,1000,1000); os.chmod(p,int(sys.argv[2]));',
    filename, String(mode)], bytes);
}
function centralEnv() {
  return { ...process.env, GALX_CENTRAL_CONFIG_FILE: path.join(components, 'central.json'),
    GALX_LOCAL_TLS_KEY: path.join(pki, 'server.key'), GALX_LOCAL_TLS_CERT: path.join(pki, 'server.crt') };
}
function centralCompose(args) {
  const r = spawnSync('docker', ['--context', 'desktop-linux', 'compose', '--env-file', '/dev/null', '-f', 'docker/relay-pools/local/central.yaml', ...args],
    { cwd: root, env: centralEnv(), encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0) throw Error(r.stderr || 'Local central Compose failed.');
  return r.stdout.trim();
}
function poolCompose(pool, args) {
  const upper = pool.toUpperCase();
  const gid = guest(pool, ['stat', '-c', '%g', '/var/run/docker.sock']);
  if (!/^\d+$/.test(gid)) throw Error('Invalid Docker group.');
  return guest(pool, ['sudo', '-n', 'env', `GALX_${upper}_RUNTIME_CONFIG_FILE=/opt/galx/config/runtime.json`,
    `GALX_${upper}_MONITOR_CONFIG_FILE=/opt/galx/config/monitor.json`, `GALX_DOCKER_SOCKET_GID=${gid}`, `GALX_LOCAL_GATEWAY=${gateway}`,
    `GALX_LOCAL_MONITOR_IMAGE=${reviewedImages.find(image => image.component === 'monitor' && image.pool === pool).tag}`,
    `GALX_LOCAL_RUNTIME_IMAGE=${reviewedImages.find(image => image.component === 'runtime' && image.pool === pool).tag}`,
    'docker', 'compose', '--env-file', '/dev/null', '-f', '/opt/galx/services.yaml', '-f', '/opt/galx/local.yaml', ...args]);
}
function certificates() {
  mkdirSync(pki, { recursive: true, mode: 0o700 }); chmodSync(pki, 0o700);
  if (existsSync(path.join(pki, 'server.key')) && existsSync(path.join(pki, 'server.crt')) && existsSync(path.join(pki, 'ca.crt'))) return;
  if (['ca.key', 'server.key', 'ca.crt', 'server.crt'].some(f => existsSync(path.join(pki, f)))) throw Error('Inspect the incomplete local TLS directory.');
  run('openssl', ['req', '-x509', '-newkey', 'rsa:3072', '-nodes', '-keyout', `${pki}/ca.key`, '-out', `${pki}/ca.crt`, '-days', '3650',
    '-subj', '/CN=GALX Local Relay Authority', '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign']);
  run('openssl', ['req', '-newkey', 'rsa:2048', '-nodes', '-keyout', `${pki}/server.key`, '-out', `${pki}/server.csr`, '-subj', '/CN=host.lima.internal']);
  writeFileSync(`${pki}/server.ext`, 'subjectAltName=DNS:host.lima.internal,DNS:localhost,IP:127.0.0.1\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n', { mode: 0o600 });
  run('openssl', ['x509', '-req', '-in', `${pki}/server.csr`, '-CA', `${pki}/ca.crt`, '-CAkey', `${pki}/ca.key`, '-CAcreateserial', '-out', `${pki}/server.crt`, '-days', '365', '-extfile', `${pki}/server.ext`]);
  for (const f of ['ca.key', 'ca.crt', 'server.key', 'server.crt', 'server.csr']) chmodSync(`${pki}/${f}`, 0o600);
}
function identities() {
  const records = pools.map(pool => {
    const machine = guest(pool, ['cat', '/etc/machine-id']);
    const daemon = docker(pool, ['info', '--format', '{{.ID}}']);
    const interfaces = JSON.parse(guest(pool, ['ip', '-j', '-4', 'addr']));
    const address = interfaces.find(i => i.ifname === 'eth0')?.addr_info.find(a => a.scope === 'global')?.local;
    if (!/^[a-f0-9]{32}$/.test(machine) || !daemon || !/^192\.168\.105\.\d+$/.test(address ?? '') || address === gateway) throw Error('Unexpected local VM identity/network.');
    const mounts = guest(pool, ['sh', '-c', 'findmnt -rn -t virtiofs,9p,fuse.sshfs || true']);
    if (mounts) throw Error('Mac file sharing is not allowed in a relay VM.');
    return { pool, machine, daemon, address };
  });
  for (const key of ['machine', 'daemon', 'address']) if (records[0][key] === records[1][key]) throw Error(`Shared ${key} identity.`);
  return records;
}
async function verify() {
  const records = identities();
  checkImages();
  let checks = 0;
  const check = (value, message) => { assert(value, message); checks++; };
  const cookies = {};
  for (const record of records) {
    const pool = record.pool, other = pool === 'premium' ? 'standard' : 'premium';
    check(guest(pool, ['systemctl', 'is-active', 'galx-local-isolation.service']) === 'active', 'Firewall inactive.');
    check(guest(pool, ['systemctl', 'is-enabled', 'galx-local-isolation.service']) === 'enabled', 'Firewall not persistent.');
    const firewall = JSON.parse(guest(pool, ['sudo', '-n', 'nft', '-j', 'list', 'table', 'inet', 'galx_local_isolation']));
    const chains = firewall.nftables.filter(x => x.chain).map(x => x.chain);
    for (const name of ['input', 'output', 'forward']) check(chains.some(c => c.name === name && c.hook === name && c.prio === -150), 'Firewall ordering mismatch.');
    const ids = docker(pool, ['ps', '--filter', `label=com.docker.compose.project=galx-${pool}`, '--format', '{{.ID}}']).split('\n').filter(Boolean);
    check(ids.length === 2, 'Both own-pool services must be running.');
    const containers = JSON.parse(docker(pool, ['inspect', ...ids]));
    for (const c of containers) {
      check(c.Config.Labels['io.galx.pool'] === pool && c.Config.User === '1000:1000' && c.HostConfig.ReadonlyRootfs && !c.HostConfig.Privileged && c.HostConfig.CapDrop.includes('ALL'), 'Unexpected container authority.');
      const kind = c.Config.Labels['io.galx.component'];
      const mounts = c.Mounts.map(m => m.Destination);
      check(mounts.every(m => ['/state', '/run/secrets/component-config', '/run/secrets/local-ca', ...(kind === 'monitor' ? ['/var/run/docker.sock'] : [])].includes(m)), 'Unexpected mount.');
      check(c.Image === reviewedImages.find(image => image.pool === pool && image.component === kind)?.id, 'Image changed.');
    }
    const runtime = containers.find(c => c.Config.Labels['io.galx.component'] === 'runtime');
    const origin = `http://127.0.0.1:${pool === 'premium' ? 13311 : 13312}`;
    const config = JSON.parse(readFileSync(path.join(components, `${pool}-monitor.json`)));
    const authority = JSON.parse(readFileSync(path.join(state, 'authority.json')));
    check(config.installationId === authority.pools[pool].installationId, 'Unexpected local installation identity.');
    record.installationId = config.installationId;
    const denied = await fetch(`${origin}/api/status`); check(denied.status === 401, 'Anonymous monitor access.');
    for (const role of ['operator', 'viewer']) {
      const ticketReply = await fetch(`${origin}/session/ticket`, { method: 'POST', headers: { Authorization: `Bearer ${config[`${role}Token`]}` }, signal: AbortSignal.timeout(15000) });
      check(ticketReply.ok, 'Central monitor authorization unavailable.');
      const ticket = (await ticketReply.json()).ticket;
      const session = await fetch(`${origin}/session`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket, role }) });
      check(session.ok, 'Monitor sign-in failed.');
      const cookie = session.headers.get('set-cookie')?.split(';')[0]; check(cookie, 'Missing session cookie.');
      const statusReply = await fetch(`${origin}/api/status`, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(15000) });
      check(statusReply.ok, 'Monitor status unavailable.');
      const status = await statusReply.json(); check(status.pool === pool && status.installationId === config.installationId && status.role === role && status.desktopAvailable, 'Monitor or desktop destination mismatch.');
      if (role === 'operator') { cookies[pool] = cookie; record.registrationAllowed = status.registrationAllowed; record.executionAllowed = status.executionAllowed; record.accounts = status.accounts?.length ?? 0; }
      else {
        const write = await fetch(`${origin}/api/registrations/prepare`, { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: '{}' });
        check(write.status === 403, 'Viewer can mutate registrations.');
        await fetch(`${origin}/session`, { method: 'DELETE', headers: { Cookie: cookie, Origin: origin } });
      }
    }
    // Verify database TLS at the client/pooler boundary (pg_stat_ssl describes
    // the pooler's separate backend socket and cannot prove client-side TLS).
    const tls = docker(pool, ['exec', runtime.Id, 'node', '--input-type=module', '-e',
      `import fs from 'node:fs';import pg from 'pg';const c=JSON.parse(fs.readFileSync('/run/secrets/component-config'));const db=new pg.Client({connectionString:c.databaseUrl,ssl:{ca:c.databaseCa,rejectUnauthorized:true},connectionTimeoutMillis:8000});await db.connect();if(!db.connection.stream.encrypted||!db.connection.stream.authorized)throw Error('TLS');await db.query('select 1');await db.end();console.log('verified');`]);
    check(tls === 'verified', 'Database TLS unverified.');
    const peer = records.find(x => x.pool === other);
    const endpoints = [[peer.address, 15444], [gateway, other === 'premium' ? 13311 : 13312], [gateway, other === 'premium' ? 13301 : 13302]];
    for (const [host, port] of endpoints) {
      const code = `const net=require('node:net');const s=net.connect({host:${JSON.stringify(host)},port:${port}});s.on('connect',()=>process.exit(1));s.on('error',()=>process.exit(0));setTimeout(()=>process.exit(0),1200);`;
      docker(pool, ['exec', runtime.Id, 'node', '-e', code]); checks++;
      // curl error alone isn't a success condition: the direct peer canary
      // is separately proven alive from the owning guest before these probes.
      const hostProbe = guest(pool, ['python3', '-c', 'import socket,sys; s=socket.socket(); s.settimeout(1.2)\ntry: s.connect((sys.argv[1],int(sys.argv[2])))\nexcept OSError: sys.exit(0)\nsys.exit(1)', host, String(port)]);
      check(hostProbe === '', 'Peer path reachable.');
    }
    console.log(`${pool}: authenticated monitor, scoped services, TLS and peer denial verified.`);
  }
  for (const pool of pools) {
    const other = pool === 'premium' ? 'standard' : 'premium';
    const origin = `http://127.0.0.1:${pool === 'premium' ? 13311 : 13312}`;
    check((await fetch(`${origin}/api/status`, { headers: { Cookie: cookies[other] } })).status === 401, 'Cross-pool session accepted.');
    await fetch(`${origin}/session`, { method: 'DELETE', headers: { Cookie: cookies[pool], Origin: origin } });
  }
  const standard = JSON.parse(readFileSync(path.join(components, 'standard-runtime.json')));
  for (const [endpoint, body] of [
    ['/v1/images/generations', { model: 'gpt-image-1', prompt: 'boundary check' }],
    ['/v1/chat/completions', { model: 'gpt-5', sites_profile: 'standard', messages: [{ role: 'user', content: 'boundary check' }] }],
    ['/v1/chat/completions', { model: 'gpt-5', tools: [{ type: 'image_generation' }], messages: [{ role: 'user', content: 'boundary check' }] }],
  ]) {
    const rejected = await fetch(`http://127.0.0.1:13302${endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${standard.inferenceKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': 'local-capability-denial', 'x-galx-tenant': 'a'.repeat(64) }, body: JSON.stringify(body) });
    check(rejected.status === 403, 'Standard unsupported workload admission was not denied.');
  }
  const hash = value => createHash('sha256').update(value).digest('hex');
  const proof = { at: new Date().toISOString(), checks, scope: 'local VM separation on one trusted Mac; no provider generation or cloud deployment',
    records: records.map(({ machine, daemon, ...record }) => ({ ...record, machineSha256: hash(machine), daemonSha256: hash(daemon) })) };
  writeFileSync(path.join(state, 'local-acceptance.json'), JSON.stringify(proof, null, 2), { mode: 0o600 });
  console.log(`${checks} local checks passed. Provider sign-in and generation are separate.`);
}
try {
  if (action === 'install') {
    // Existing local images and exported narrow configs are required. No account imports.
    for (const name of ['central', ...pools.flatMap(p => [`${p}-runtime`, `${p}-monitor`])]) {
      if (!existsSync(path.join(components, `${name}.json`))) throw Error('Export the five service configurations first.');
    }
    identities(); checkImages(); certificates();
    for (const pool of pools) {
      const runtime = JSON.parse(readFileSync(path.join(components, `${pool}-runtime.json`)));
      const monitor = JSON.parse(readFileSync(path.join(components, `${pool}-monitor.json`)));
      if (runtime.pool !== pool || monitor.pool !== pool || runtime.centralOrigin !== 'https://host.lima.internal:13443' || monitor.centralOrigin !== runtime.centralOrigin) throw Error('Local config identity/origin mismatch.');
      const desktop = JSON.parse(docker(pool, ['image', 'inspect', monitor.desktopImage]));
      if (desktop[0]?.Architecture !== 'arm64') throw Error('This local installation requires the verified ARM64 desktop.');
      console.log(guest(pool, ['sudo', 'python3', '-', pool], readFileSync('scripts/install-relay-local-isolation.py')));
      guest(pool, ['sudo', 'install', '-d', '-m', '0700', '-o', '1000', '-g', '1000', '/opt/galx/config']);
      for (const kind of ['runtime', 'monitor']) installFile(pool, `/opt/galx/config/${kind}.json`, readFileSync(path.join(components, `${pool}-${kind}.json`)));
      installFile(pool, '/opt/galx/config/local-ca.crt', readFileSync(`${pki}/ca.crt`));
      installFile(pool, '/opt/galx/services.yaml', readFileSync(`docker/relay-pools/services.${pool}.yaml`));
      installFile(pool, '/opt/galx/local.yaml', readFileSync('docker/relay-pools/local/pool.yaml'));
    }
    console.log('Local installation files prepared. Run: node scripts/relay-local.mjs up');
  } else if (action === 'up') {
    for (const pool of pools) {
      if (!existsSync(path.join(homedir(), '.colima', pool, 'colima.yaml'))) throw Error('Install the separate local VM profiles first.');
      console.log(`Starting ${pool} Docker VM…`);
      run('colima', ['start', pool, '--activate=false', '--ssh-config=false']);
    }
    identities(); checkImages();
    for (const pool of pools) {
      if (guest(pool, ['systemctl', 'is-active', 'galx-local-isolation.service']) !== 'active') throw Error('Local isolation must be active before service startup.');
    }
    console.log(centralCompose(['up', '-d', '--no-build', '--pull', 'never']));
    for (const pool of pools) await startPool(pool);
    console.log('Premium monitor: http://127.0.0.1:13311\nStandard monitor: http://127.0.0.1:13312');
  } else if (action === 'stop') {
    for (const pool of pools) console.log(poolCompose(pool, ['stop', '--timeout', '35']));
    console.log(centralCompose(['stop', '--timeout', '35']));
    for (const pool of pools) run('colima', ['stop', pool]);
    console.log('Local services and VMs stopped; accounts, desktops, disks and database records retained.');
  } else if (action === 'verify') {
    // Real, temporary peer listeners distinguish firewall denial from an
    // unavailable target. They contain no keys and are always removed.
    const names = [];
    try {
      for (const pool of pools) {
        const name = `galx-${pool}-isolation-probe`;
        docker(pool, ['run', '-d', '--name', name, '--network', 'host', '--user', '1000:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--read-only', '--entrypoint', 'node', `galxai-relay-${pool}:candidate-20260915`, '-e', 'require("node:http").createServer((q,s)=>s.end("probe")).listen(15444,"0.0.0.0")']);
        names.push([pool, name]);
        assert.equal(guest(pool, ['curl', '--fail', '--silent', '--retry', '3', '--retry-connrefused', '--max-time', '5', 'http://127.0.0.1:15444']), 'probe');
      }
      await verify();
    } finally { for (const [pool, name] of names) docker(pool, ['rm', '-f', name]); }
  } else if (action === 'status') {
    console.log(centralCompose(['ps']));
    for (const pool of pools) console.log(poolCompose(pool, ['ps']));
  } else if (action === 'open' && pools.includes(selected)) {
    await wakeMonitor(selected);
    const config = JSON.parse(readFileSync(path.join(components, `${selected}-monitor.json`)));
    let destination;
    try { destination = await monitorTicket(selected, config); }
    catch (error) {
      if (error.status !== 503) throw error;
      await wakeMonitor(selected, true);
      destination = await monitorTicket(selected, config);
    }
    run('open', [destination]);
    writeFileSync(path.join(state, `${selected}-last-open.json`), JSON.stringify({ pool: selected, at: new Date().toISOString(), browserLaunchRequested: true }), { mode: 0o600 });
    console.log(`Opened ${selected === 'premium' ? 'Premium' : 'Standard'}.`);
  } else throw Error('Usage: node scripts/relay-local.mjs install|up|stop|status|verify|open premium|standard');
} catch (error) {
  // Subprocess input can contain a secret; never forward execFile error objects or arguments.
  console.error(error instanceof Error && !('cmd' in error) ? error.message : 'Local operation failed. Inspect the owning service; no automatic retry was performed.');
  process.exitCode = 1;
}
