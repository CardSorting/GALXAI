import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BASE_IMAGE, STOP_SECONDS, composePlan, readConfig, validateNovaConfig, sha256, hashFile, verifyPackage, runtimeAcceptanceHash } from './lib/self-host.mjs';
import { packageSelfHosted } from './package-self-hosted.mjs';

const help = `GALX self-hosting preparation — private operator commands

  node scripts/self-host.mjs doctor
  node scripts/self-host.mjs package <retained-build> <new-package>
  node scripts/self-host.mjs verify <package>
  node scripts/self-host.mjs build <package>
  node scripts/self-host.mjs plan <package> <private-config.json> <new-plan-directory> [port]
  node scripts/self-host.mjs plan-nova <package> <private-config.json> <new-plan-directory> [port]
  node scripts/self-host.mjs stage <plan-directory>
  node scripts/self-host.mjs resume <plan-directory>
  node scripts/self-host.mjs status <plan-directory>
  node scripts/self-host.mjs stop <plan-directory>

doctor / verify / status are read-only. package / build / plan create local
artifacts. stage creates one disabled loopback application; it never replaces an
existing container. plan-nova is the separately authorized private Nova runtime
profile; it excludes unrelated Media/billing authority and opens no ingress.
resume explicitly starts that same stopped container.
stop allows 480 seconds for requests and terminal work.
No command changes DNS, tunnel routes, grants, databases or live deployments.
Runbook: docs/runbooks/mac-self-hosting.md
`;
const env = { PATH: process.env.PATH, HOME: process.env.HOME, DOCKER_CONFIG: process.env.DOCKER_CONFIG };
function docker(args, { inherit = false, timeout = 60000 } = {}) {
  const result = spawnSync('docker', ['--context', 'desktop-linux', ...args], { env, encoding: 'utf8', stdio: inherit ? 'inherit' : 'pipe', timeout, maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) throw Error('Docker command failed or its result is uncertain. Inspect status before repeating a mutation.');
  return result.stdout?.trim();
}
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function requireLocalDocker() {
  const endpoint = JSON.parse(docker(['context', 'inspect', 'desktop-linux', '--format', '{{json .Endpoints.docker.Host}}']));
  if (typeof endpoint !== 'string' || !endpoint.startsWith('unix://') || endpoint.includes('/.colima/')) throw Error('The application requires the local Docker Desktop daemon, outside the provider daemon.');
}
function loadPlan(directory) {
  const root = fs.realpathSync(directory), record = json(path.join(root, 'plan.json'));
  const composeFile = path.join(root, 'compose.json');
  if (sha256(fs.readFileSync(composeFile)) !== record.composeSha256) throw Error('Plan changed; prepare a new reviewed plan.');
  const expected = composePlan(record);
  if (JSON.stringify(json(composeFile)) !== JSON.stringify(expected)) throw Error('Plan contains unapproved runtime settings.');
  if (record.phase && !['disabled-loopback-preparation', 'private-nova-acceptance'].includes(record.phase)) throw Error('Unknown activation phase.');
  if (record.phase === 'private-nova-acceptance' && record.project !== 'galx-web-nova') throw Error('Private Nova requires its own project identity.');
  return { root, record, composeFile };
}
function inspect(project) {
  const ids = docker(['ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`, '--filter', 'label=com.docker.compose.service=web']);
  if (!ids) return [];
  return JSON.parse(docker(['inspect', ...ids.split('\n')])).map(c => ({
    id: c.Id, image: c.Image, status: c.State.Status, health: c.State.Health?.Status || 'not_reported',
    exitCode: c.State.ExitCode, oomKilled: c.State.OOMKilled, restarts: c.RestartCount,
    startedAt: c.State.StartedAt, finishedAt: c.State.FinishedAt,
  }));
}
async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || ['help', '--help', '-h'].includes(command)) { console.log(help); return; }
  if (['doctor', 'build', 'stage', 'resume', 'status', 'stop'].includes(command)) requireLocalDocker();
  if (command === 'doctor') {
    if (args.length) throw Error('doctor takes no arguments.');
    const server = jsonText(docker(['info', '--format', '{{json .}}']));
    const power = process.platform === 'darwin' ? spawnSync('pmset', ['-g', 'assertions'], { encoding: 'utf8', timeout: 5000 }).stdout || '' : '';
    console.log(JSON.stringify({ platform: `${process.platform}/${process.arch}`, context: 'desktop-linux', engine: server.ServerVersion, architecture: server.Architecture, dockerMemoryBytes: server.MemTotal, hostMemoryBytes: os.totalmem(), compose: docker(['compose', 'version', '--short']), keepAwakeAssertion: /PreventSystemSleep\s+1|PreventUserIdleSystemSleep\s+1/.test(power), status: 'OBSERVED — release readiness requires the runbook acceptance checks', limits: ['Docker Desktop must be running after login.', 'One Mac is one failure domain.', 'A liveness check does not establish provider or account readiness.'] }, null, 2)); return;
  }
  if (command === 'package') {
    if (args.length !== 2) throw Error('package requires a retained build and new output directory.');
    console.log(JSON.stringify(packageSelfHosted(...args), null, 2)); return;
  }
  if (['verify', 'build'].includes(command)) {
    if (args.length !== 1) throw Error(`${command} requires a package directory.`);
    const root = fs.realpathSync(args[0]), manifest = verifyPackage(root), manifestSha256 = sha256(fs.readFileSync(path.join(root, 'manifest.json')));
    if (command === 'verify') {
      let retainedImage;
      if (fs.existsSync(path.join(root, 'image.json'))) {
        retainedImage = json(path.join(root, 'image.json'));
        if (retainedImage.manifestSha256 !== manifestSha256 || retainedImage.imageArchiveSha256 !== hashFile(path.join(root, 'image.tar')) || !/^sha256:[a-f0-9]{64}$/.test(retainedImage.image)) throw Error('Retained image archive or identity changed.');
      }
      console.log(JSON.stringify({ status: 'VERIFIED', manifestSha256, image: retainedImage?.image, archiveVerified: !!retainedImage, files: Object.keys(manifest.files).length, equivalence: manifest.equivalence, deployed: false }, null, 2)); return;
    }
    if (fs.existsSync(path.join(root, 'image.json'))) throw Error('Image already retained; use verify or a new package directory.');
    docker(['image', 'inspect', BASE_IMAGE]);
    const tag = `galxai-web:selfhost-${manifestSha256.slice(0, 16)}`;
    docker(['build', '--platform', 'linux/amd64', '--network', 'none', '--pull=false', '--label', `ai.galx.manifest=${manifestSha256}`, '--label', `ai.galx.source=${manifest.sourceManifestSha256}`, '-t', tag, root], { inherit: true, timeout: 600000 });
    const image = JSON.parse(docker(['image', 'inspect', tag]))[0];
    if (image.Architecture !== 'amd64' || image.Config.User !== '1000:1000') throw Error('Built image does not match its runtime contract.');
    // Retain a reloadable rollback artifact, not only a mutable local tag.
    docker(['image', 'save', '-o', path.join(root, 'image.tar'), image.Id], { timeout: 600000 });
    const imageArchiveSha256 = hashFile(path.join(root, 'image.tar'));
    fs.writeFileSync(path.join(root, 'image.tar.sha256'), imageArchiveSha256 + '  image.tar\n');
    const record = { image: image.Id, tag, manifestSha256, imageArchiveSha256, platform: 'linux/amd64', builtAt: new Date().toISOString(), deployed: false };
    fs.writeFileSync(path.join(root, 'image.json'), JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify(record, null, 2)); return;
  }
  if (['plan', 'plan-nova'].includes(command)) {
    if (args.length < 3 || args.length > 4) throw Error('plan requires package, private config, new directory and optional port.');
    const [directory, config, destination, portValue] = args, root = fs.realpathSync(directory), manifest = verifyPackage(root);
    const nova = command === 'plan-nova';
    const image = json(path.join(root, 'image.json')), configFile = fs.realpathSync(config), values = readConfig(config, { preparation: !nova });
    if (nova) validateNovaConfig(values);
    if (image.manifestSha256 !== sha256(fs.readFileSync(path.join(root, 'manifest.json')))) throw Error('Image does not match the verified package.');
    const acceptanceFile = path.join(root, 'acceptance.json');
    if (!fs.existsSync(acceptanceFile)) throw Error('Run the whole-image runtime acceptance before preparing a stage plan.');
    const acceptance = json(acceptanceFile);
    if (acceptance.status !== 'PASSED' || acceptance.image !== image.image || acceptance.manifestSha256 !== image.manifestSha256 || acceptance.testSha256 !== runtimeAcceptanceHash(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))) throw Error('Local runtime acceptance does not match this image and current test.');
    for (const [name, digest] of Object.entries(manifest.publicInputHashes)) if (sha256(values[name] || '') !== digest) throw Error('Public runtime configuration differs from the compiled build.');
    if (fs.existsSync(destination)) throw Error('Plan directory must not exist.');
    const record = { image: image.image, configFile, port: portValue ? Number(portValue) : 17787, project: nova ? 'galx-web-nova' : 'galx-web-stage', manifestSha256: image.manifestSha256, configSha256: sha256(fs.readFileSync(config)), phase: nova ? 'private-nova-acceptance' : 'disabled-loopback-preparation', localAcceptance: { image: acceptance.image, manifestSha256: acceptance.manifestSha256, status: acceptance.status, receiptSha256: hashFile(acceptanceFile) } };
    const compose = composePlan(record), bytes = JSON.stringify(compose, null, 2) + '\n';
    fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(destination, 'compose.json'), bytes, { mode: 0o600 });
    fs.writeFileSync(path.join(destination, 'plan.json'), JSON.stringify({ ...record, composeSha256: sha256(bytes) }, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ status: 'PLAN RETAINED', image: image.image, port: record.port, connect: nova ? 'private acceptance only' : 'disabled', configurationValuesPrinted: false, deployed: false }, null, 2)); return;
  }
  if (['stage', 'resume', 'status', 'stop'].includes(command)) {
    if (args.length !== 1) throw Error(`${command} requires a plan directory.`);
    const { record, composeFile } = loadPlan(args[0]), current = inspect(record.project);
    if (command === 'status') { console.log(JSON.stringify({ containers: current, readiness: 'Liveness is not inference acceptance.' }, null, 2)); return; }
    if (current.length > 1 || current.some(c => c.image !== record.image)) throw Error('Existing container identity differs; no replacement or stop performed.');
    const base = ['compose', '--project-name', record.project, '-f', composeFile];
    if (command === 'stop') {
      docker([...base, 'stop', '--timeout', String(STOP_SECONDS), 'web'], { timeout: (STOP_SECONDS + 30) * 1000 });
      console.log(JSON.stringify({ containers: inspect(record.project), note: 'A forced exit is not terminal-write acceptance; preserve uncertain executions.' }, null, 2)); return;
    }
    const nova = record.phase === 'private-nova-acceptance';
    const values = readConfig(record.configFile, { preparation: !nova });
    if (nova) validateNovaConfig(values);
    if (record.localAcceptance?.status !== 'PASSED' || record.localAcceptance.image !== record.image || record.localAcceptance.manifestSha256 !== record.manifestSha256) throw Error('Plan lacks matching whole-image acceptance.');
    if (sha256(fs.readFileSync(record.configFile)) !== record.configSha256) throw Error('Configuration changed; prepare a new plan.');
    const image = JSON.parse(docker(['image', 'inspect', record.image]))[0];
    if (image.Config.Labels?.['ai.galx.manifest'] !== record.manifestSha256) throw Error('Image identity does not match the retained plan.');
    if (command === 'resume') {
      if (current.length !== 1 || current[0].status !== 'exited') throw Error('resume requires exactly one stopped container from this plan.');
      docker([...base, 'start', '--wait', '--wait-timeout', '90', 'web'], { timeout: 120000 });
    } else {
      if (current.length) throw Error('Container already exists. Use status or resume; no implicit replacement.');
      docker([...base, 'up', '-d', '--no-build', '--pull', 'never', '--no-recreate', '--wait', '--wait-timeout', '90', 'web'], { timeout: 120000 });
    }
    console.log(JSON.stringify({ containers: inspect(record.project), publicCutover: false, connect: nova ? 'private acceptance only' : 'disabled' }, null, 2)); return;
  }
  throw Error('Unknown command. Use --help.');
}
function jsonText(value) { return JSON.parse(value); }
main().catch(error => { console.error(error.message); process.exitCode = 1; });
