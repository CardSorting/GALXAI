#!/usr/bin/env node
/** Local operations only. Colima owns separate Linux/Docker guests; no cloud provisioning. */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync, rmdirSync, unlinkSync, renameSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { composeHealth, firstFailedCause, poolServiceRecoveryAction, retryDelayMs, supervisorCauses } from './lib/relay-local-supervisor.mjs';
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { monitorOrigin, monitorTicket, monitorAvailable, runtimeAvailable, monitorHandoff } from './lib/relay-local-access.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const state = path.join(root, '.relay/service-deployment');
const pki = path.join(state, 'local-tls');
const components = path.join(state, 'components');
const supervisorStateFile = path.join(state, 'supervisor-state.json');
const keepOnlineAgentFile = path.join(homedir(), 'Library/LaunchAgents/ai.galx.relay-local.plist');
const pools = ['premium'];
const gateway = '192.168.105.2';
const [action, selected] = process.argv.slice(2);
function reviewedImages() {
  const manifest = JSON.parse(readFileSync('docker/relay-pools/local/images.json', 'utf8'));
  if (!Array.isArray(manifest.images)) throw Error('The local service image manifest is invalid.');
  return manifest.images;
}
function reviewedImage(pool, service) {
  const component = service === 'relay' ? 'runtime' : service;
  const image = reviewedImages().find(entry => entry.component === component && (!entry.pool || entry.pool === pool));
  if (!image) throw Error('The local service image manifest is incomplete.');
  return image;
}
let sleepAssertion = 'not-requested';
let expectedCentralServices;
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
  for (const image of reviewedImages().filter(image => !pool || !image.pool || image.pool === pool)) {
    if (docker(image.pool ?? 'central', ['image', 'inspect', image.tag, '--format', '{{.Id}}']) !== image.id) throw Error('A local image differs from the reviewed service release.');
  }
}
async function waitFor(check, seconds) {
  const until = Date.now() + seconds * 1000;
  do { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 1000)); } while (Date.now() < until);
  throw Error('Startup is taking longer than expected. Try opening the monitor again shortly.');
}
function hostPower() {
  try {
    const details = run('pmset', ['-g', 'batt']);
    const source = details.includes("Now drawing from 'AC Power'") ? 'ac'
      : details.includes("Now drawing from 'Battery Power'") ? 'battery' : 'unknown';
    const match = details.match(/\b(\d{1,3})%;/);
    const percent = match ? Number(match[1]) : null;
    return { source, percent: Number.isInteger(percent) && percent >= 0 && percent <= 100 ? percent : null };
  } catch { return { source: 'unknown', percent: null }; }
}
function keepOnlineEnabled() { return existsSync(keepOnlineAgentFile); }
function colimaProfileStatus(pool) {
  const listing = run('colima', ['list']);
  const row = listing.split('\n').find(line => line.trim().startsWith(`${pool} `));
  return row ? row.trim().split(/\s+/)[1] : 'Not found';
}
function saveSupervisorState(status, attempt = 0, nextRetryAt = null, cause = null) {
  mkdirSync(state, { recursive: true, mode: 0o700 });
  const power = hostPower();
  const value = { status, attempt, nextRetryAt, cause, sleepAssertion, checkedAt: new Date().toISOString(), power };
  const temporary = `${supervisorStateFile}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
  chmodSync(temporary, 0o600);
  renameSync(temporary, supervisorStateFile);
}
async function supervise() {
  mkdirSync(state, { recursive: true, mode: 0o700 }); chmodSync(state, 0o700);
  saveSupervisorState('starting');
  let stopping = false;
  let wakeDelay;
  const stop = () => { stopping = true; wakeDelay?.(); };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  // macOS honors this idle-sleep assertion on AC power. It does not keep a
  // closed laptop awake or override a low-battery/system sleep decision.
  try {
    const assertion = spawn('caffeinate', ['-s', '-w', String(process.pid)], { stdio: 'ignore' });
    sleepAssertion = assertion.pid ? 'active' : 'unavailable';
    assertion.on('error', () => {
      sleepAssertion = 'unavailable';
      try { saveSupervisorState(reportedStatus, attempt, nextRetryAt, currentCause); } catch { }
    });
    assertion.on('exit', () => {
      if (!stopping) {
        sleepAssertion = 'unavailable';
        try { saveSupervisorState(reportedStatus, attempt, nextRetryAt, currentCause); } catch { }
      }
    });
    assertion.unref();
  } catch { sleepAssertion = 'unavailable'; }
  let currentCause = null;
  try { saveSupervisorState('starting', 0, null, currentCause); } catch { }
  let attempt = 0;
  let reportedStatus = 'starting';
  let nextRetryAt = null;
  const pause = milliseconds => new Promise(resolve => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearInterval(heartbeat);
      wakeDelay = undefined;
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    // Keep the local menu's liveness signal current during bounded backoff.
    // The file is private to this Mac and contains only a fixed state enum,
    // timestamps, attempt count and power summary.
    const heartbeat = setInterval(() => {
      if (!stopping) {
        try { saveSupervisorState(reportedStatus, attempt, nextRetryAt, currentCause); } catch { }
      }
    }, 15000);
    wakeDelay = finish;
  });
  while (!stopping) {
    try {
      const failedCause = firstFailedCause({
        central: centralAvailable(),
        monitor: await monitorAvailable('premium') && poolServiceImageMatches('premium', 'monitor'),
        relay: await runtimeAvailable('premium') && poolServiceImageMatches('premium', 'relay'),
      });
      if (failedCause) {
        currentCause = failedCause;
        await wakeMonitor('premium');
      }
      currentCause = 'central';
      if (!(await centralAvailable())) throw Error('Central service is not healthy.');
      currentCause = 'monitor';
      if (!(await monitorAvailable('premium'))) throw Error('Monitor is not healthy.');
      currentCause = 'relay';
      if (!(await runtimeAvailable('premium'))) throw Error('Relay is not healthy.');
      attempt = 0;
      reportedStatus = 'running';
      currentCause = null;
      nextRetryAt = null;
      saveSupervisorState(reportedStatus, attempt, nextRetryAt, currentCause);
    } catch {
      attempt++;
      if (!supervisorCauses.includes(currentCause)) currentCause = 'recovery';
      const wait = retryDelayMs(attempt);
      reportedStatus = 'recovering';
      nextRetryAt = new Date(Date.now() + wait).toISOString();
      saveSupervisorState(reportedStatus, attempt, nextRetryAt, currentCause);
      await pause(wait);
      continue;
    }
    await pause(20000);
  }
  saveSupervisorState('stopped');
}
async function status() {
  const power = hostPower();
  const powerLabel = power.source === 'ac' ? `AC power${power.percent === null ? '' : ` · ${power.percent}%`}`
    : power.source === 'battery' ? `On battery${power.percent === null ? '' : ` · ${power.percent}%`}` : 'Power status unavailable';
  console.log(`Power: ${powerLabel}`);
  console.log(`Keep Premium online: ${keepOnlineEnabled() ? 'On' : 'Off'}`);
  try { docker('central', ['info', '--format', '{{.ID}}']); console.log('Docker Desktop: Running'); }
  catch { console.log('Docker Desktop: Stopped or unavailable'); }
  let profileState = 'Status unavailable';
  try { profileState = colimaProfileStatus('premium'); console.log(`Premium VM: ${profileState}`); }
  catch { console.log(`Premium VM: ${profileState}`); }
  try {
    const central = centralCompose(['ps']).split('\n').filter(line => line.trim());
    console.log(central.length > 1 ? `Central services:\n${central.join('\n')}` : 'Central services: Stopped');
    console.log(`Central readiness: ${centralAvailable() ? 'Healthy' : 'Not ready'}`);
  }
  catch { console.log('Central services: Docker Desktop is unavailable'); }
  const vmReady = profileState.toLowerCase() === 'running';
  if (vmReady) {
    try {
      const premium = poolCompose('premium', ['ps']).split('\n').filter(line => line.trim());
      console.log(premium.length > 1 ? `Premium services:\n${premium.join('\n')}` : 'Premium services: Stopped');
    }
    catch { console.log('Premium services: VM is running but its service status is unavailable'); }
  } else console.log('Premium services: VM is stopped');
  console.log(`Premium monitor: ${await monitorAvailable('premium') ? 'Healthy' : 'Not responding'}`);
  console.log(`Premium relay: ${await runtimeAvailable('premium') ? 'Healthy' : 'Not responding'}`);
  if (keepOnlineEnabled()) {
    try {
    const current = JSON.parse(readFileSync(supervisorStateFile, 'utf8'));
      const allowed = ['starting', 'running', 'recovering', 'stopped'];
      const checkedAt = Date.parse(current.checkedAt);
      const fresh = Number.isFinite(checkedAt) && checkedAt <= Date.now() + 5000 && Date.now() - checkedAt <= 60000;
      const cause = supervisorCauses.includes(current.cause) ? ` · ${current.cause}` : '';
      console.log(`Supervisor: ${fresh && allowed.includes(current.status) ? `${current.status}${current.status === 'recovering' ? cause : ''}` : 'Not updating'}`);
    } catch { console.log('Supervisor: Starting'); }
  }
}
function centralHealth() {
  try {
    expectedCentralServices ??= centralCompose(['config', '--services']).split('\n').filter(Boolean);
    const rows = docker('central', ['ps', '--filter', 'label=com.docker.compose.project=galx-local-authority', '--format', '{{.Label "com.docker.compose.service"}}\t{{.Status}}']).split('\n').filter(Boolean);
    return composeHealth(expectedCentralServices, rows);
  } catch { return { ready: false, unhealthy: [] }; }
}
function centralAvailable() {
  return centralHealth().ready;
}
async function ensureCentralReady() {
  centralCompose(['up', '-d', '--no-build', '--pull', 'never']);
  try { await waitFor(centralAvailable, 45); }
  catch {
    const unhealthy = centralHealth().unhealthy;
    if (unhealthy.length === 0) throw Error('Local services are taking longer than expected to become healthy.');
    // Docker reports health failures but does not restart an otherwise-running
    // unhealthy container. Restart only the failed local Compose services.
    centralCompose(['restart', ...unhealthy]);
    await waitFor(centralAvailable, 60);
  }
}
async function withLauncherLock(operation) {
  mkdirSync(state, { recursive: true, mode: 0o700 });
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
    return await operation();
  } finally {
    if (acquired) { unlinkSync(path.join(lock, 'pid')); rmdirSync(lock); }
  }
}
async function wakeMonitor(pool, repair = false) {
  monitorOrigin(pool);
  return withLauncherLock(async () => {
    if (!repair && centralAvailable() && await monitorAvailable(pool) && await runtimeAvailable(pool)
      && poolServiceImageMatches(pool, 'monitor') && poolServiceImageMatches(pool, 'relay')) return;
    console.log('Starting Premium…');
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
    installFile(pool, '/opt/galx/local.yaml', readFileSync('docker/relay-pools/local/pool.yaml'));
    await ensureCentralReady();
    await startPool(pool);
  });
}
async function startPool(pool) {
  poolCompose(pool, ['up', '-d', '--no-build', '--pull', 'never', 'monitor']);
  try { await waitFor(() => monitorAvailable(pool) && poolServiceImageMatches(pool, 'monitor'), 45); }
  catch {
    if (!(await monitorAvailable(pool))) {
      recoverPoolService(pool, 'monitor');
      await waitFor(() => monitorAvailable(pool) && poolServiceImageMatches(pool, 'monitor'), 45);
    } else if (!poolServiceImageMatches(pool, 'monitor')) throw Error('The Premium monitor does not match its reviewed image.');
  }
  const replacingImage = !poolServiceImageMatches(pool, 'relay');
  if (await runtimeAvailable(pool) && !replacingImage) return;
  if (replacingImage && poolServiceState(pool, 'relay') === 'running') {
    console.log('Draining the previous Premium runtime before replacing its image…');
    poolCompose(pool, ['stop', '--timeout', '480', 'relay']);
  }
  const config = JSON.parse(readFileSync(path.join(components, `${pool}-monitor.json`)));
  const deadline = await monitorHandoff(pool, config);
  if (deadline > Date.now()) console.log('Waiting for the previous runtime to release ownership…');
  await waitFor(() => Date.now() >= deadline, 67);
  if (!centralAvailable()) throw Error('Central service health changed during runtime handoff.');
  if (await runtimeAvailable(pool) && poolServiceImageMatches(pool, 'relay')) return;
  if (replacingImage) {
    if (poolServiceState(pool, 'relay') === 'unknown') throw Error('The Premium runtime needs manual review before image replacement.');
    poolCompose(pool, ['up', '-d', '--no-build', '--pull', 'never', 'relay']);
  } else recoverPoolService(pool, 'relay');
  await waitFor(() => runtimeAvailable(pool) && poolServiceImageMatches(pool, 'relay'), 45);
}
function poolServiceState(pool, service) {
  if (!pools.includes(pool) || !['monitor', 'relay'].includes(service)) return 'unknown';
  try {
    const project = `galx-${pool}`;
    const ids = docker(pool, ['ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`,
      '--filter', `label=com.docker.compose.service=${service}`]).split('\n').filter(Boolean);
    if (ids.length === 0) return 'missing';
    if (ids.length !== 1 || !/^[a-f0-9]{12,64}$/i.test(ids[0])) return 'unknown';
    const records = JSON.parse(docker(pool, ['inspect', ids[0]]));
    const container = records.length === 1 ? records[0] : undefined;
    if (container?.Config?.Labels?.['com.docker.compose.project'] !== project ||
        container?.Config?.Labels?.['com.docker.compose.service'] !== service) return 'unknown';
    return typeof container.State?.Status === 'string' ? container.State.Status : 'unknown';
  } catch { return 'unknown'; }
}
function poolServiceImageMatches(pool, service) {
  if (!pools.includes(pool) || !['monitor', 'relay'].includes(service)) return false;
  const expected = reviewedImage(pool, service);
  if (typeof expected.tag !== 'string' || !/^[\w./:-]+$/.test(expected.tag)
    || typeof expected.id !== 'string' || !/^sha256:[a-f0-9]{64}$/i.test(expected.id)) return false;
  try {
    const project = `galx-${pool}`;
    const ids = docker(pool, ['ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`,
      '--filter', `label=com.docker.compose.service=${service}`]).split('\n').filter(Boolean);
    if (ids.length !== 1 || !/^[a-f0-9]{12,64}$/i.test(ids[0])) return false;
    const records = JSON.parse(docker(pool, ['inspect', ids[0]]));
    const container = records.length === 1 ? records[0] : undefined;
    return container?.Config?.Labels?.['com.docker.compose.project'] === project
      && container?.Config?.Labels?.['com.docker.compose.service'] === service
      && container?.Config?.Image === expected.tag
      && container?.Image === expected.id;
  } catch { return false; }
}
function recoverPoolService(pool, service) {
  const action = poolServiceRecoveryAction(poolServiceState(pool, service));
  if (action === 'restart') {
    console.log(`Restarting the unresponsive Premium ${service}…`);
    poolCompose(pool, ['restart', '--timeout', '35', service]);
  } else if (action === 'start') {
    console.log(`Starting the unavailable Premium ${service}…`);
    poolCompose(pool, ['up', '-d', '--no-build', '--pull', 'never', service]);
  } else throw Error('A local service needs manual review before recovery.');
}
function installFile(pool, filename, bytes, mode = 0o600) {
  if (!/^\/opt\/galx\/[a-zA-Z0-9/_.-]+$/.test(filename)) throw Error('Invalid guest destination.');
  guest(pool, ['sudo', 'python3', '-c',
    'import sys,pathlib,os; p=pathlib.Path(sys.argv[1]); p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(sys.stdin.buffer.read()); os.chown(p,1000,1000); os.chmod(p,int(sys.argv[2]));',
    filename, String(mode)], bytes);
}
function centralEnv() {
  const env = { ...process.env };
  for (const key of ['COMPOSE_FILE', 'COMPOSE_PROFILES', 'COMPOSE_PROJECT_NAME', 'COMPOSE_ENV_FILES', 'DOCKER_CONTEXT', 'DOCKER_HOST']) delete env[key];
  return { ...env, GALX_CENTRAL_CONFIG_FILE: path.join(components, 'central.json'),
    GALX_LOCAL_TLS_KEY: path.join(pki, 'server.key'), GALX_LOCAL_TLS_CERT: path.join(pki, 'server.crt'),
    GALX_LOCAL_TLS_CA: path.join(pki, 'ca.crt') };
}
function centralCompose(args) {
  const r = spawnSync('docker', ['--context', 'desktop-linux', 'compose', '--env-file', '/dev/null', '-f', 'docker/relay-pools/local/central.yaml', ...args],
    { cwd: root, env: centralEnv(), encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0) throw Error(r.stderr || 'Local central Compose failed.');
  return r.stdout.trim();
}
function poolCompose(pool, args) {
  const upper = pool.toUpperCase();
  const monitorImage = reviewedImage(pool, 'monitor');
  const runtimeImage = reviewedImage(pool, 'relay');
  const gid = guest(pool, ['stat', '-c', '%g', '/var/run/docker.sock']);
  if (!/^\d+$/.test(gid)) throw Error('Invalid Docker group.');
  return guest(pool, ['sudo', '-n', 'env', `GALX_${upper}_RUNTIME_CONFIG_FILE=/opt/galx/config/runtime.json`,
    `GALX_${upper}_MONITOR_CONFIG_FILE=/opt/galx/config/monitor.json`, `GALX_DOCKER_SOCKET_GID=${gid}`, `GALX_LOCAL_GATEWAY=${gateway}`,
    `GALX_LOCAL_MONITOR_IMAGE=${monitorImage.tag}`,
    `GALX_LOCAL_RUNTIME_IMAGE=${runtimeImage.tag}`,
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
  return records;
}
async function verify() {
  const records = identities();
  checkImages();
  let checks = 0;
  const check = (value, message) => { assert(value, message); checks++; };
  check(centralAvailable(), 'Central services are not healthy.');
  const cookies = {};
  for (const record of records) {
    const pool = record.pool;
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
      check(c.Image === reviewedImages().find(image => image.pool === pool && image.component === kind)?.id, 'Image changed.');
    }
    const runtime = containers.find(c => c.Config.Labels['io.galx.component'] === 'runtime');
    const origin = 'http://127.0.0.1:13311';
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
    console.log(`${pool}: authenticated monitor, scoped services and TLS verified.`);
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
      if (!existsSync(path.join(components, `${name}.json`))) throw Error('Export the three service configurations first.');
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
    for (const pool of pools) await wakeMonitor(pool);
    console.log('Premium monitor: http://127.0.0.1:13311');
  } else if (action === 'stop') {
    await withLauncherLock(async () => {
      if (keepOnlineEnabled()) throw Error('Turn off Keep Premium online from the GALX menu before stopping local services.');
      for (const pool of pools) {
        const vmReady = colimaProfileStatus(pool).toLowerCase() === 'running';
        if (vmReady) {
          console.log(poolCompose(pool, ['stop', '--timeout', '35']));
          run('colima', ['stop', pool]);
        } else console.log('Premium VM is already stopped.');
      }
      let desktopReady = true;
      try { docker('central', ['info', '--format', '{{.ID}}']); } catch { desktopReady = false; }
      if (desktopReady) console.log(centralCompose(['stop', '--timeout', '35']));
      else console.log('Docker Desktop is already stopped.');
      console.log('Local services and VMs stopped; accounts, desktops, disks and database records retained.');
    });
  } else if (action === 'verify') {
    await verify();
  } else if (action === 'status') {
    await status();
  } else if (action === 'supervise') {
    await supervise();
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
    console.log('Opened Premium.');
  } else throw Error('Usage: node scripts/relay-local.mjs install|up|stop|status|verify|supervise|open premium');
} catch (error) {
  // Subprocess input can contain a secret; never forward execFile error objects or arguments.
  console.error(error instanceof Error && !('cmd' in error) ? error.message : 'Local operation failed. Inspect the owning service; no automatic retry was performed.');
  process.exitCode = 1;
}
