import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { BASE_IMAGE, assertPayloadPath, filesUnder, inside, publicAsset, regularFile, sha256 } from './lib/self-host.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeFiles = ['server.cjs', 'healthcheck.cjs', 'runtime-config.cjs'];

/** Retain the accepted production bytes, not a rebuild from a dirty checkout. */
export function packageSelfHosted(buildDirectory, outputDirectory, fixtureOptions) {
  const build = fs.realpathSync(buildDirectory), app = fs.realpathSync(path.join(build, 'app'));
  const output = path.resolve(outputDirectory);
  if (fs.existsSync(output) || output.startsWith(build + path.sep)) throw Error('Use a new output directory outside the retained build.');
  const provenance = JSON.parse(fs.readFileSync(path.join(build, 'provenance.json')));
  if (provenance.builder?.image !== BASE_IMAGE || provenance.builder?.platform !== 'linux/amd64') throw Error('Unsupported accepted build platform.');
  const source = provenance.source;
  if (!source || sha256(JSON.stringify(source)) !== provenance.sourceManifestSha256) throw Error('Invalid source provenance.');
  for (const [relative, digest] of Object.entries(source)) {
    if (sha256(fs.readFileSync(regularFile(app, relative))) !== digest) throw Error('Accepted source changed.');
  }
  const archive = JSON.parse(fs.readFileSync(path.join(build, 'artifact.json')));
  if (sha256(fs.readFileSync(path.join(build, 'hosted-candidate.tgz'))) !== archive.archiveSha256) throw Error('Accepted archive changed.');
  const acceptedManifest = JSON.parse(fs.readFileSync(path.join(build, 'artifact-manifest.json')));
  if (sha256(JSON.stringify(acceptedManifest)) !== archive.manifestSha256) throw Error('Accepted artifact manifest changed.');
  const required = JSON.parse(fs.readFileSync(regularFile(app, '.next/required-server-files.json')));
  if (required.config.distDir !== '.next' || required.config.outputFileTracingRoot !== required.appDir) throw Error('Unsupported tracing layout.');
  const selected = new Set(['package.json', '.next/BUILD_ID', '.next/required-server-files.json', ...required.files]);
  for (const subtree of ['.next/server', '.next/static', 'public']) {
    for (const item of filesUnder(path.join(app, subtree))) selected.add(`${subtree}/${item}`);
  }
  const traces = ['.next/next-server.js.nft.json', ...filesUnder(path.join(app, '.next/server')).filter(n => n.endsWith('.nft.json')).map(n => `.next/server/${n}`)];
  for (const relative of traces) {
    const trace = JSON.parse(fs.readFileSync(regularFile(app, relative)));
    if (trace.version !== 1 || !Array.isArray(trace.files)) throw Error('Invalid Next output trace.');
    for (const target of trace.files) selected.add(path.relative(app, path.resolve(path.dirname(path.join(app, relative)), target)));
  }
  // A serverless build need not trace the persistent host's startup module.
  // Trace that one declared framework entry using Next's own pinned NFT, in
  // the target runtime with no network or ambient environment. Do not copy a
  // developer's entire node_modules or maintain guessed dependency lists.
  const startupTrace = fixtureOptions?.startupTrace ?? JSON.parse(execFileSync('docker', [
    '--context', 'desktop-linux', 'run', '--rm', '--platform', 'linux/amd64', '--network', 'none', '--read-only', '--memory', '768m', '--cpus', '2',
    '--mount', `type=bind,src=${app},dst=/app,readonly`, BASE_IMAGE, 'node', '-e',
    `const {nodeFileTrace}=require('/app/node_modules/next/dist/compiled/@vercel/nft');nodeFileTrace(['/app/node_modules/next/dist/server/lib/start-server.js'],{base:'/app',processCwd:'/app',mixedModules:true}).then(r=>console.log(JSON.stringify({files:[...r.fileList].sort(),warnings:r.warnings.size}))).catch(()=>process.exit(1));`,
  ], { encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024, env: { PATH: process.env.PATH, HOME: process.env.HOME } }));
  if (!Array.isArray(startupTrace.files)) throw Error('Invalid startup trace.');
  for (const relative of startupTrace.files) selected.add(relative);
  // Check traced application bytes against the retained function maps; check
  // browser/static bytes against the existing hosted static manifest as well.
  const accepted = new Map();
  for (const relative of Object.keys(acceptedManifest).filter(n => n.endsWith('/.vc-config.json'))) {
    const configFile = regularFile(app, relative);
    if (sha256(fs.readFileSync(configFile)) !== acceptedManifest[relative]) throw Error('Accepted function metadata changed.');
    const config = JSON.parse(fs.readFileSync(configFile));
    for (const [runtimePath, stored] of Object.entries(config.filePathMap || {})) {
      const digest = acceptedManifest[stored];
      if (typeof digest !== 'string' || sha256(fs.readFileSync(regularFile(app, stored))) !== digest) throw Error('Retained function payload changed.');
      if (accepted.has(runtimePath) && accepted.get(runtimePath) !== digest) throw Error('Conflicting retained application bytes.');
      accepted.set(runtimePath, digest);
    }
  }
  const canaries = Object.values(JSON.parse(fs.readFileSync(path.join(build, 'build-canaries.json'))));
  if (!canaries.length || canaries.some(v => typeof v !== 'string' || v.length < 32)) throw Error('Missing build-canary boundary evidence.');
  const payload = new Map();
  let compared = 0, publicFiles = 0, totalBytes = 0;
  for (const relative of [...selected].sort()) {
    assertPayloadPath(relative);
    const input = regularFile(app, relative), bytes = fs.readFileSync(input), digest = sha256(bytes);
    let expected = accepted.get(relative);
    if (relative.startsWith('.next/static/')) expected = acceptedManifest['.vercel/output/static/_next/static/' + relative.slice('.next/static/'.length)];
    if (relative.startsWith('public/')) expected = acceptedManifest['.vercel/output/static/' + relative.slice('public/'.length)];
    if (expected !== undefined) {
      if (expected !== digest) throw Error('Application bytes differ from the retained accepted artifact.');
      compared++;
    }
    if (canaries.some(c => bytes.includes(Buffer.from(c))) || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(bytes.toString('utf8'))) throw Error('Private material in runtime payload.');
    if (publicAsset(relative)) {
      publicFiles++;
      if (/GALX_PRIVATE_(?:POST_MORTEM|KNOWLEDGE)_CONTENT|GALX_PREMIUM_RELAY_KEY|GALX_VAULT_KEY_V1/.test(bytes.toString('utf8'))) throw Error('Private diagnostic content in public assets.');
    }
    payload.set(relative, bytes); totalBytes += bytes.length;
  }
  if (!accepted.has('.next/server/app/v1/inference/route.js')) throw Error('Accepted Nova payload is missing.');
  fs.mkdirSync(path.join(output, 'runtime'), { recursive: true, mode: 0o700 });
  for (const [relative, bytes] of payload) {
    const destination = inside(path.join(output, 'runtime'), relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { mode: 0o644 });
  }
  for (const name of runtimeFiles) fs.copyFileSync(path.join(repository, 'deploy/self-host', name), path.join(output, 'runtime', name));
  fs.copyFileSync(path.join(repository, 'deploy/self-host/Dockerfile'), path.join(output, 'Dockerfile'));
  fs.writeFileSync(path.join(output, '.dockerignore'), '**\n!Dockerfile\n!runtime\n!runtime/**\n');
  const publicInputHashes = {};
  const publicLines = fs.readFileSync(path.join(app, '.vercel/.env.production.local'), 'utf8').split('\n');
  for (const name of provenance.publicBuildInputNames) {
    const line = publicLines.find(v => v.startsWith(name + '='));
    if (!line) throw Error('Missing public build input.');
    publicInputHashes[name] = sha256(JSON.parse(line.slice(name.length + 1)));
  }
  const files = {};
  for (const relative of filesUnder(output)) { const bytes = fs.readFileSync(path.join(output, relative)); files[relative] = { sha256: sha256(bytes), bytes: bytes.length }; }
  const manifest = {
    version: 1, format: 'Next traced production runtime', platform: 'linux/amd64', baseImage: BASE_IMAGE,
    sourceRevision: provenance.sourceRevision, sourceManifestSha256: provenance.sourceManifestSha256,
    dependencyLockSha256: provenance.dependencyLockSha256, acceptedArchiveSha256: archive.archiveSha256,
    framework: JSON.parse(payload.get('node_modules/next/package.json')).version,
    buildId: payload.get('.next/BUILD_ID').toString().trim(), publicInputHashes,
    equivalence: { tracedFiles: payload.size, startupTraceFiles: startupTrace.files.length, startupTraceWarnings: startupTrace.warnings, comparedToAcceptedArtifact: compared, bytesChanged: 0, publicFilesScanned: publicFiles, applicationBytes: totalBytes },
    runtimeAdaptation: 'Traced dependencies plus standard Next startup and explicit mac-loopback-v1 origin policy. Bounded writable ISR/cache copies; compiled candidate bytes and Next configuration unchanged. No framework patch or authorization bypass.',
    startup: { hostname: '0.0.0.0', port: 3000, boundary: 'Loopback-only published port behind exact-host trusted ingress. No direct public listener or wildcard host route. Whole-image acceptance is required before staging.' },
    files,
  };
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
  return { directory: output, manifestSha256: sha256(fs.readFileSync(path.join(output, 'manifest.json'))), ...manifest.equivalence };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4) throw Error('Usage: node scripts/package-self-hosted.mjs <retained-build-directory> <new-package-directory>');
    console.log(JSON.stringify(packageSelfHosted(process.argv[2], process.argv[3]), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
