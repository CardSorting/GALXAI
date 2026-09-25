/** Fixed repository-native release gate runner; no deployment or hosted writes. */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type GateStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'UNAPPROVED';
interface Gate { name: string; status: GateStatus; evidence: string }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gates: Gate[] = [];
const add = (name: string, status: GateStatus, evidence: string) => gates.push({ name, status, evidence });
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(name: string, command: string, args: string[], options: { unsetIntegrationDb?: boolean } = {}) {
  const env = { ...process.env };
  if (options.unsetIntegrationDb) delete env.GALX_INTEGRATION_DATABASE_URL;
  const result = spawnSync(command, args, { cwd: root, env, encoding: 'utf8', timeout: 15 * 60_000, maxBuffer: 8 * 1024 * 1024 });
  if (result.status === 0) {
    add(name, 'PASS', `${command} ${args.join(' ')}`);
    return { ok: true, output: `${result.stdout || ''}\n${result.stderr || ''}` };
  }
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const dockerUnavailable = options.unsetIntegrationDb && /Cannot connect to the Docker daemon|docker daemon is not running|Is the docker daemon running/i.test(output);
  add(name, dockerUnavailable ? 'BLOCKED' : 'FAIL', dockerUnavailable
    ? 'Disposable Postgres requires an available local Docker daemon.'
    : `${command} ${args.join(' ')} exited ${result.status ?? result.error?.name ?? 'without a status'}.`);
  return { ok: false, output };
}

const nodeRun = (name: string, args: string[], options?: { unsetIntegrationDb?: boolean }) =>
  run(name, process.execPath, args, options);
const npmRun = (name: string, script: string, options?: { unsetIntegrationDb?: boolean }) =>
  run(name, npm, ['run', script], options);

function statusFromAudit(output: string): GateStatus {
  try {
    const report = JSON.parse(output.trim());
    const findings = Array.isArray(report.findings) ? report.findings as Array<{ status: GateStatus }> : [];
    if (findings.some(finding => finding.status === 'FAIL')) return 'FAIL';
    if (findings.some(finding => finding.status === 'BLOCKED')) return 'BLOCKED';
    if (findings.some(finding => finding.status === 'UNAPPROVED')) return 'UNAPPROVED';
    return report.status === 'RELEASE READY' ? 'PASS' : 'FAIL';
  } catch { return 'FAIL'; }
}

function auditFindingStatus(output: string, gate: string): GateStatus | undefined {
  try {
    const report = JSON.parse(output.trim());
    const finding = Array.isArray(report.findings)
      ? (report.findings as Array<{ gate?: string; status?: GateStatus }>).find(item => item.gate === gate)
      : undefined;
    return finding?.status;
  } catch { return undefined; }
}

async function freeLoopbackPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>(resolve => server.close(() => resolve()));
  return port;
}

async function localHttpProbe(buildOk: boolean) {
  if (!buildOk) { add('local production HTTP probe', 'BLOCKED', 'Production build did not pass.'); return; }
  let port: number;
  try { port = await freeLoopbackPort(); }
  catch {
    add('local production HTTP probe', 'BLOCKED', 'The execution environment did not permit binding a disposable loopback port.');
    return;
  }
  const origin = `http://127.0.0.1:${port}`;
  const nextBin = path.join(root, 'node_modules/next/dist/bin/next');
  const server = spawn(process.execPath, [nextBin, 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: root, env: { ...process.env, NODE_ENV: 'production' }, stdio: 'ignore',
  });
  let ready = false;
  try {
    for (let attempt = 0; attempt < 80 && server.exitCode === null; attempt++) {
      try {
        const response = await fetch(`${origin}/explore`, { signal: AbortSignal.timeout(1500) });
        if (response.status === 200) { ready = true; break; }
      } catch { /* Server is still binding or rendering its first request. */ }
      await delay(500);
    }
    if (!ready) { add('local production HTTP probe', 'BLOCKED', 'Local production server did not become ready on loopback.'); return; }
    const env = { ...process.env, GALX_VERIFY_ORIGIN: origin };
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/verify-image-public-http.ts'], {
      cwd: root, env, encoding: 'utf8', timeout: 120_000, maxBuffer: 2 * 1024 * 1024,
    });
    add('local production HTTP probe', result.status === 0 ? 'PASS' : 'FAIL', result.status === 0
      ? 'Rendered public discovery and unauthenticated image HTTP boundaries passed against local next start.'
      : 'Compiled HTTP verifier failed against local next start.');
  } catch {
    add('local production HTTP probe', 'FAIL', 'Loopback production HTTP verification failed.');
  } finally {
    if (server.exitCode === null) {
      server.kill('SIGTERM');
      await Promise.race([once(server, 'exit').then(() => undefined), delay(2500)]);
      if (server.exitCode === null) server.kill('SIGKILL');
    }
  }
}

run('typecheck', 'npx', ['tsc', '--noEmit']);
npmRun('lint', 'lint');
const security = npmRun('application/security tests', 'test:image:security');
npmRun('image scale tests', 'test:image:scale');
npmRun('authentication/session tests', 'test:auth:sessions');
npmRun('billing lifecycle tests', 'test:billing:lifecycle');
const migrationStatic = npmRun('migration/static integrity', 'db:verify');
const postgres = npmRun('Postgres migration/integration and RLS/grant tests', 'test:image:db', { unsetIntegrationDb: true });
npmRun('documentation checks', 'docs:check');
const build = npmRun('production build', 'build');
npmRun('compiled boundary scan', 'docs:check:build');
nodeRun('sleeping-Star invariant', ['--import', 'tsx', '--test', 'scripts/test-sleeping-star-invariant.ts']);
npmRun('Sites fairness tests', 'test:sites:fair');
await localHttpProbe(build.ok);

const audit = nodeRun('read-only privacy/deployment audit', ['--import', 'tsx', 'scripts/audit-image-release.ts']);
const auditStatus = audit.ok ? statusFromAudit(audit.output) : 'FAIL';
add('hosted/deployment audit', auditStatus, auditStatus === 'PASS'
  ? 'Read-only hosted controls and full privacy inventory passed.'
  : 'See npm run audit:image:release for the read-only finding list; external object, CDN, production settings, or database evidence remains unresolved.');
if (security.ok && migrationStatic.ok && postgres.ok) add('database/grant verification', 'PASS', 'Disposable Postgres migration and RLS/grant tests passed.');
else if (postgres.ok === false && gates.some(gate => gate.name === 'Postgres migration/integration and RLS/grant tests' && gate.status === 'BLOCKED')) {
  add('database/grant verification', 'BLOCKED', 'Disposable Postgres could not start; no runtime database certification is claimed.');
} else if (!migrationStatic.ok || !postgres.ok) add('database/grant verification', 'FAIL', 'Static or disposable database verification failed.');
else add('database/grant verification', 'FAIL', 'Required database evidence was not recorded.');

const allowanceStatus = audit.ok
  ? auditFindingStatus(audit.output, 'purchased allowance approval') ?? 'FAIL'
  : 'FAIL';
add('allowance configuration approval', allowanceStatus, allowanceStatus === 'UNAPPROVED'
  ? 'No business values are approved; paid image checkout and dispatch must remain disabled.'
  : allowanceStatus === 'PASS' ? 'Typed allowance configuration is approved and validated.'
    : 'Allowance configuration could not be certified; checkout and dispatch must remain disabled.');

const counts = Object.fromEntries((['PASS', 'FAIL', 'BLOCKED', 'UNAPPROVED'] as const).map(status =>
  [status, gates.filter(gate => gate.status === status).length]));
const releaseReady = gates.every(gate => gate.name === 'hosted/deployment audit' &&
  (gate.status === 'BLOCKED' || gate.status === 'UNAPPROVED') ? true : gate.status === 'PASS');
console.log(JSON.stringify({ status: releaseReady ? 'RELEASE CANDIDATE READY' : 'RELEASE CANDIDATE NOT READY', counts, gates }, null, 2));
if (!releaseReady) process.exitCode = 1;
