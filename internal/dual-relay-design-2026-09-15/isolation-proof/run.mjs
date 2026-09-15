// Owns four disposable containers and two private networks. No production targets.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

if (process.argv.length !== 2) throw new Error('This fixture accepts no target arguments.');
const image = 'pgvector/pgvector@sha256:cf134a767f474095eeba57e0117be8e568e011a63f33fbf252f14c9b760f8e6f';
const runId = randomUUID(), label = 'galx.separation-proof.run';
const resources = [], checks = [];
let interrupted = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { interrupted = true; });
const env = { PATH: process.env.PATH, HOME: process.env.HOME };

// Never log argv, environment, SQL input or raw child errors containing passwords.
function docker(args, { input = '', variables = {}, timeout = 20000, cleanup = false } = {}) {
  if (interrupted && !cleanup) throw new Error('Fixture interrupted');
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { env: { ...env, ...variables }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false, overflow = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeout);
    child.on('error', () => { clearTimeout(timer); reject(new Error('Docker could not start')); });
    for (const [stream, kind] of [[child.stdout, 'out'], [child.stderr, 'err']]) stream.on('data', chunk => {
      if (kind === 'out') stdout += chunk; else stderr += chunk;
      if (stdout.length + stderr.length > 1024 * 1024) { overflow = true; child.kill('SIGKILL'); }
    });
    child.on('close', code => {
      clearTimeout(timer);
      if (timedOut || overflow) reject(new Error('Docker command exceeded fixture limits'));
      else resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
    child.stdin.on('error', () => {}); // EPIPE when docker cannot connect; exit code is checked.
    child.stdin.end(input);
  });
}
function ok(result, context) {
  if (result.code !== 0) {
    const permission = /permission denied|operation not permitted/i.test(result.stderr);
    throw new Error(`${context} failed${permission ? ': Docker socket permission denied' : ''}`);
  }
  return result.stdout;
}
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
  console.log(`PASS ${name}`);
}
async function inspect(resource, cleanup = false) {
  const args = resource.kind === 'network' ? ['network', 'inspect', resource.name] : ['inspect', resource.name];
  const result = await docker(args, { cleanup });
  if (result.code !== 0 && /No such (object|container|network)/i.test(result.stderr)) return undefined;
  const data = JSON.parse(ok(result, 'Owned resource inspection'))[0];
  const labels = resource.kind === 'network' ? data.Labels : data.Config.Labels;
  assert.equal(labels?.[label], runId, 'Refusing a resource with foreign ownership');
  return data;
}
const sides = ['premium', 'standard'].map(pool => ({
  pool, network: `galx-separation-${runId}-${pool}`,
  db: `galx-separation-${runId}-${pool}-db`, client: `galx-separation-${runId}-${pool}-client`,
  admin: randomBytes(24).toString('hex'), password: randomBytes(24).toString('hex'),
  monitor: randomBytes(24).toString('hex'),
}));
async function query(side, sql, { host = 'database', password = side.password, user = 'proof_runtime' } = {}) {
  return docker(['exec', '-i', '--env', 'PGPASSWORD', '--env', 'PGCONNECT_TIMEOUT=2', side.client,
    'psql', '-X', '-w', '-h', host, '-U', user, '-d', 'galx_separation_proof', '-At',
    '--set=ON_ERROR_STOP=1', '--set=VERBOSITY=verbose'], { input: sql, variables: { PGPASSWORD: password } });
}
async function readable(side) {
  return ok(await query(side, 'SELECT pool FROM separation_lab.identity;'), `${side.pool} database read`);
}

try {
  console.log(`Owned fixture run: ${runId}. Separate networks and clusters; shared Docker host is outside the proof.`);
  // Do not pull mutable tags or consult production service configuration.
  ok(await docker(['image', 'inspect', image, '--format', '{{.Id}}']), 'Pinned local image lookup');
  const fixture = await readFile(new URL('./fixture.sql', import.meta.url), 'utf8');
  for (const side of sides) {
    // Record intent before mutation so lost acknowledgements still reach ownership-checked cleanup.
    resources.push({ kind: 'network', name: side.network });
    ok(await docker(['network', 'create', '--internal', '--driver', 'bridge', '--label', `${label}=${runId}`, side.network]), 'Network creation');
    resources.push({ kind: 'container', name: side.db });
    ok(await docker(['run', '--detach', '--rm', '--name', side.db, '--label', `${label}=${runId}`,
      '--network', side.network, '--network-alias', 'database', '--memory', '512m', '--cpus', '1',
      '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,noexec,size=536870912',
      '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_DB=galx_separation_proof',
      '--env', 'POSTGRES_HOST_AUTH_METHOD=scram-sha-256', image],
    { variables: { POSTGRES_PASSWORD: side.admin }, timeout: 60000 }), 'Database creation');
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      // TCP avoids observing the entrypoint's temporary socket-only initialization server.
      const result = await docker(['exec', side.db, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']);
      if (result.code === 0) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'Disposable database must start before testing denials');
    const sql = `${fixture}\nALTER ROLE proof_runtime PASSWORD '${side.password}';\nALTER ROLE proof_monitor PASSWORD '${side.monitor}';\n`;
    ok(await docker(['exec', '-i', side.db, 'psql', '-X', '-U', 'postgres', '-d', 'galx_separation_proof', `--set=pool=${side.pool}`], { input: sql }), 'Fixture schema setup');
    side.cluster = ok(await docker(['exec', side.db, 'psql', '-X', '-U', 'postgres', '-d', 'galx_separation_proof', '-Atc', 'SELECT system_identifier FROM pg_control_system();']), 'Cluster identity read');
    resources.push({ kind: 'container', name: side.client });
    ok(await docker(['run', '--detach', '--rm', '--name', side.client, '--label', `${label}=${runId}`,
      '--network', side.network, '--user', '65534:65534', '--read-only', '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges:true', '--pids-limit', '32', '--memory', '64m', '--cpus', '0.5',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=1m',
      // Override the image's VOLUME declaration even though this client never starts PostgreSQL.
      '--tmpfs', '/var/lib/postgresql/data:rw,noexec,nosuid,size=1m',
      '--entrypoint', 'sleep', image, 'infinity']), 'Probe client creation');
    const record = await inspect({ kind: 'container', name: side.db });
    side.ip = record.NetworkSettings.Networks[side.network].IPAddress;
    check(`${side.pool}: no published database ports`, Object.values(record.NetworkSettings.Ports ?? {}).every(value => !value?.length));
    check(`${side.pool}: exactly one private network`, Object.keys(record.NetworkSettings.Networks).join() === side.network);
    check(`${side.pool}: database uses disposable memory storage`,
      Boolean(record.HostConfig.Tmpfs?.['/var/lib/postgresql/data']) && record.Mounts.every(m => m.Type === 'tmpfs'));
    const client = await inspect({ kind: 'container', name: side.client });
    check(`${side.pool}: client has no host mounts, Docker socket or peer network`,
      client.Mounts.every(m => m.Type === 'tmpfs') && Object.keys(client.NetworkSettings.Networks).join() === side.network);
    check(`${side.pool}: client is unprivileged with a read-only root`, !client.HostConfig.Privileged && client.HostConfig.ReadonlyRootfs && client.Config.User === '65534:65534' && client.HostConfig.CapDrop.includes('ALL'));
    const net = await inspect({ kind: 'network', name: side.network });
    check(`${side.pool}: internal network with IPv6 disabled`, net.Internal && !net.EnableIPv6);
    check(`${side.pool}: own database works through local DNS`, await readable(side) === side.pool);
    check(`${side.pool}: own monitor sees allowlisted data`, ok(await query(side, 'SELECT * FROM separation_lab.monitor_records;', { user: 'proof_monitor', password: side.monitor }), 'Monitor read') === `fixture-account|${side.pool}`);
    const privateRead = await query(side, 'SELECT fixture_payload FROM separation_lab.records;', { user: 'proof_monitor', password: side.monitor });
    check(`${side.pool}: monitor cannot read payload`, privateRead.code !== 0 && privateRead.stderr.includes('42501'));
    const monitorWrite = await query(side, `INSERT INTO separation_lab.records VALUES ('forbidden','${side.pool}','synthetic');`, { user: 'proof_monitor', password: side.monitor });
    check(`${side.pool}: monitor cannot mutate`, monitorWrite.code !== 0 && monitorWrite.stderr.includes('42501'));
  }
  check('clusters have different PostgreSQL system identities', sides[0].cluster !== sides[1].cluster);
  check('runtime and administrator passwords are independently generated', new Set(sides.flatMap(s => [s.password, s.monitor, s.admin])).size === 6);

  for (const [own, peer] of [[sides[0], sides[1]], [sides[1], sides[0]]]) {
    const dns = await query(own, 'SELECT 1;', { host: peer.db, password: peer.password });
    check(`${own.pool}: peer database name cannot resolve`, dns.code !== 0 && /could not translate host name/.test(dns.stderr));
    // Correct peer credentials deliberately remove authentication as the reason for failure.
    const ip = await query(own, 'SELECT 1;', { host: peer.ip, password: peer.password });
    check(`${own.pool}: peer IP blocked even with the correct peer password`, ip.code !== 0 && /timeout expired|Network is unreachable|No route to host/.test(ip.stderr));
    check(`${peer.pool}: denial was not caused by a stopped peer`, await readable(peer) === peer.pool);
    const wrong = await query(own, 'SELECT 1;', { password: peer.password });
    check(`${own.pool}: the other runtime password cannot authenticate locally`, wrong.code !== 0 && /password authentication failed/.test(wrong.stderr));
    const move = await query(own, `INSERT INTO separation_lab.records VALUES ('foreign','${peer.pool}','synthetic');`);
    check(`${own.pool}: local schema refuses a foreign pool record`, move.code !== 0 && move.stderr.includes('23503'));
    const alter = await query(own, `UPDATE separation_lab.identity SET pool='${peer.pool}';`);
    check(`${own.pool}: runtime cannot change the installed destination`, alter.code !== 0 && alter.stderr.includes('42501'));
    const members = await inspect({ kind: 'network', name: own.network });
    check(`${own.pool}: no peer or unrelated container joined its network`,
      Object.values(members.Containers).map(c => c.Name).sort().join() === [own.db, own.client].sort().join());
  }

  // Destroy each disposable DB in turn: demonstrate independent failure and clean reconstruction.
  for (const [stopped, survivor] of [[sides[0], sides[1]], [sides[1], sides[0]]]) {
    const stoppedResource = resources.find(r => r.name === stopped.db);
    const owned = await inspect(stoppedResource);
    ok(await docker(['stop', '--time', '2', owned.Id]), 'Owned database stop');
    // --rm deletes a stopped server container and its tmpfs. Recovery recreates only this side.
    for (let attempt = 0; attempt < 40 && await inspect(stoppedResource); attempt++) await new Promise(r => setTimeout(r, 100));
    check(`${survivor.pool}: own reads survive peer database loss`, await readable(survivor) === survivor.pool);
    const insert = await query(survivor, `INSERT INTO separation_lab.records VALUES ('peer-offline','${survivor.pool}','synthetic'); SELECT count(*) FROM separation_lab.records;`);
    check(`${survivor.pool}: own writes survive peer database loss`, ok(insert, 'Independent write').endsWith('2'));
    const ownDown = await query(stopped, 'SELECT 1;');
    check(`${stopped.pool}: failed local connection is not replaced with peer data`, ownDown.code !== 0);
    // Only the first stopped DB needs recovery to perform the reverse outage test.
    if (stopped === sides[0]) {
      ok(await docker(['run', '--detach', '--rm', '--name', stopped.db, '--label', `${label}=${runId}`,
        '--network', stopped.network, '--network-alias', 'database', '--memory', '512m', '--cpus', '1',
        '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,noexec,size=536870912',
        '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_DB=galx_separation_proof',
        '--env', 'POSTGRES_HOST_AUTH_METHOD=scram-sha-256', image],
      { variables: { POSTGRES_PASSWORD: stopped.admin }, timeout: 60000 }), 'Owned database recreation');
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        if ((await docker(['exec', stopped.db, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'])).code === 0) { ready = true; break; }
        await new Promise(r => setTimeout(r, 250));
      }
      assert.ok(ready, 'Recreated fixture database must start');
      ok(await docker(['exec', '-i', stopped.db, 'psql', '-X', '-U', 'postgres', '-d', 'galx_separation_proof', `--set=pool=${stopped.pool}`],
        { input: `${fixture}\nALTER ROLE proof_runtime PASSWORD '${stopped.password}';\n` }), 'Recreated fixture schema');
      check(`${stopped.pool}: clean local reconstruction is usable`, await readable(stopped) === stopped.pool);
    }
  }
  console.log(`${checks.length} isolation checks passed. No provider traffic, live services or public ports used.`);
} catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message : `Separation proof failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  let cleanupFailed = false;
  for (const resource of resources.toReversed()) {
    try {
      const record = await inspect(resource, true);
      if (!record) continue;
      ok(await docker(resource.kind === 'network' ? ['network', 'rm', record.Id] : ['stop', '--time', '2', record.Id], { cleanup: true }), 'Owned resource cleanup');
    } catch {
      cleanupFailed = true;
      console.error(`Cleanup incomplete for owned fixture ${resource.name}; ownership label ${label}=${runId}.`);
    }
  }
  if (cleanupFailed) process.exitCode = 1;
  else console.log('Owned fixture containers and networks removed.');
}
