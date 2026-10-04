import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { BASE_IMAGE, STOP_SECONDS, sha256, hashFile, inside, regularFile, assertPayloadPath, composePlan, readConfig, validateConfig, validateNovaConfig, verifyPackage, runtimeAcceptanceHash } from './lib/self-host.mjs';
import { packageSelfHosted } from './package-self-hosted.mjs';

const config = () => ({ GALX_CONNECT_ENABLED: '0', GALX_CONNECT_ORIGIN: 'https://galx.ai', GALX_NOVA_RESOURCE: 'https://nova.galx.ai', GALX_CONNECT_CLIENTS: '[]', NEXT_PUBLIC_APP_URL: 'https://galx.ai', NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', GALX_VAULT_KEY_V1: 'a'.repeat(64), GALX_AUDIT_SIGNING_SECRET: 'b'.repeat(64) });
function temporary(t) { const p = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'galx-self-host-'))); t.after(() => fs.rmSync(p, { recursive: true, force: true })); return p; }
const write = (root, name, bytes) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof bytes === 'string' ? bytes : JSON.stringify(bytes)); };
function fixture(t) {
  const root = temporary(t), build = path.join(root, 'build'), app = path.join(build, 'app'), out = path.join(root, 'out');
  const source = { 'package.json': sha256('{}') };
  write(app, 'package.json', '{}');
  write(app, '.next/BUILD_ID', 'synthetic-build');
  write(app, '.next/server/app/v1/inference/route.js', '// accepted Nova fixture');
  write(app, '.next/server/pages/index.js', '// accepted page fixture');
  write(app, '.next/static/example.js', '// browser fixture');
  write(app, 'public/example.txt', 'public fixture');
  write(app, 'node_modules/next/package.json', { name: 'next', version: '15.5.25' });
  write(app, '.next/required-server-files.json', { version: 1, appDir: '/build/app', config: { distDir: '.next', outputFileTracingRoot: '/build/app' }, files: [] });
  write(app, '.next/next-server.js.nft.json', { version: 1, files: ['../node_modules/next/package.json', 'server/app/v1/inference/route.js'] });
  const stored = '.vercel/output/shared/nova';
  write(app, stored, '// accepted Nova fixture');
  write(app, '.vercel/output/functions/nova.func/.vc-config.json', { filePathMap: { '.next/server/app/v1/inference/route.js': stored } });
  const manifest = { [stored]: sha256('// accepted Nova fixture'), '.vercel/output/functions/nova.func/.vc-config.json': hashFile(path.join(app, '.vercel/output/functions/nova.func/.vc-config.json')), '.vercel/output/static/_next/static/example.js': sha256('// browser fixture'), '.vercel/output/static/example.txt': sha256('public fixture') };
  write(build, 'artifact-manifest.json', manifest);
  write(build, 'hosted-candidate.tgz', 'synthetic-retained-archive');
  write(build, 'artifact.json', { archiveSha256: sha256('synthetic-retained-archive'), manifestSha256: sha256(JSON.stringify(manifest)) });
  write(build, 'build-canaries.json', { test: 'CANARY_' + 'x'.repeat(40) });
  write(app, '.vercel/.env.production.local', 'NEXT_PUBLIC_APP_URL="https://galx.ai"\n');
  write(build, 'provenance.json', { builder: { image: BASE_IMAGE, platform: 'linux/amd64' }, source, sourceManifestSha256: sha256(JSON.stringify(source)), dependencyLockSha256: 'fixture-lock', publicBuildInputNames: ['NEXT_PUBLIC_APP_URL'] });
  return { root, build, app, out };
}

test('standard container contract bounds authority, resource use, logs and shutdown', () => {
  const x = composePlan({ image: 'sha256:' + 'a'.repeat(64), configFile: '/private/galx/runtime.json' }), w = x.services.web;
  assert.equal(w.ports[0], '127.0.0.1:17787:3000'); assert.equal(w.read_only, true);
  assert.deepEqual(w.cap_drop, ['ALL']); assert.equal(w.user, '1000:1000');
  assert.equal(w.stop_grace_period, '480s'); assert(STOP_SECONDS > 300 + 60);
  assert.equal(w.restart, 'unless-stopped'); assert.equal(w.pull_policy, 'never');
  assert.equal(w.mem_limit, '1536m'); assert.equal(w.cpus, 2); assert.equal(w.pids_limit, 160);
  assert.equal(w.logging.options['max-size'], '10m'); assert.equal(w.logging.options['max-file'], '3');
  assert(w.tmpfs.every(v => /size=\d+m/.test(v) && /nosuid/.test(v) && /noexec/.test(v)));
  assert.equal(w.volumes.length, 1); assert.equal(w.volumes[0].read_only, true); assert.equal(w.volumes[0].bind.create_host_path, false);
  assert.equal(w.environment, undefined); assert.equal(w.build, undefined); assert.equal(w.network_mode, undefined);
});
for (const [label, change] of [
  ['mutable image tag', { image: 'galx:latest' }], ['privileged port', { port: 80 }], ['non-numeric port', { port: '17787' }],
  ['another service project', { project: 'galx-premium' }], ['interpolated mount', { configFile: '/tmp/${SECRET}/config' }], ['relative mount', { configFile: './config' }],
]) test(`plan refuses ${label}`, () => assert.throws(() => composePlan({ image: 'sha256:' + 'a'.repeat(64), configFile: '/tmp/private-config', ...change })));

test('preparation cannot enable Connect or smuggle process/cloud/provider authority', () => {
  assert.equal(validateConfig(config(), { preparation: true }).GALX_CONNECT_ENABLED, '0');
  assert.throws(() => validateConfig({ ...config(), GALX_CONNECT_ENABLED: '1' }, { preparation: true }), /disabled/);
  for (const name of ['NODE_OPTIONS', 'NEXT_MANUAL_SIG_HANDLE', 'GALX_REQUEST_ORIGIN_MODE', 'GALX_SELF_HOST_AUTHORITY', 'CLOUDFLARE_API_TOKEN', 'OPENAI_API_KEY', 'GALX_SHARD_TOKEN', '__proto__']) {
    const value = JSON.parse(JSON.stringify(config()).slice(0, -1) + `,"${name}":"PRIVATE_CANARY"}`);
    assert.throws(() => validateConfig(value), e => !e.message.includes('PRIVATE_CANARY'));
  }
});
test('configuration errors never echo secret values', () => {
  assert.throws(() => validateConfig({ ...config(), GALX_CONNECT_ORIGIN: 'https://PRIVATE_CANARY:password@galx.ai' }), e => !e.message.includes('PRIVATE_CANARY'));
  assert.throws(() => validateConfig({ ...config(), NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'sk_live_PRIVATE_CANARY' }), /Private material/);
  const privilegedJwt = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.synthetic';
  assert.throws(() => validateConfig({ ...config(), NEXT_PUBLIC_SUPABASE_ANON_KEY: privilegedJwt }), /Private material/);
  assert.throws(() => validateConfig({ ...config(), GALX_VAULT_KEY_V1: 'PRIVATE_CANARY\n' }), e => !e.message.includes('PRIVATE_CANARY'));
});

test('private Nova profile requires explicit first-party authority and excludes Media and provider accounts', () => {
  const values = { ...config(), GALX_CONNECT_ENABLED: '1', DATABASE_URL: 'postgresql://fixture.invalid/db', GALX_PREMIUM_RELAY_URL: 'https://fixture.invalid', GALX_PREMIUM_RELAY_KEY: 'PRIVATE_CANARY', GALX_CONNECT_CLIENTS: JSON.stringify([{ id: 'reference-native' }]) };
  assert.deepEqual(validateNovaConfig(validateConfig(values)), values);
  for (const name of ['R2_SECRET_ACCESS_KEY', 'STRIPE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GALX_INTERNAL_ADMIN_KEY']) {
    assert.throws(() => validateNovaConfig({ ...values, [name]: 'PRIVATE_CANARY' }), e => !e.message.includes('PRIVATE_CANARY'));
  }
  assert.throws(() => validateNovaConfig({ ...values, GALX_NOVA_RESOURCE: 'https://other.example' }));
  assert.throws(() => validateNovaConfig({ ...values, GALX_CONNECT_ENABLED: '0' }));
  assert.throws(() => validateNovaConfig({ ...values, GALX_CONNECT_CLIENTS: '[{"id":"unreviewed-app"}]' }));
});
test('configuration file must be regular, private and valid JSON', t => {
  const root = temporary(t), file = path.join(root, 'config.json'); fs.writeFileSync(file, JSON.stringify(config()), { mode: 0o600 });
  assert.equal(readConfig(file).GALX_CONNECT_ENABLED, '0');
  fs.chmodSync(file, 0o644); assert.throws(() => readConfig(file), /owner-only/);
  fs.chmodSync(file, 0o600); fs.symlinkSync(file, path.join(root, 'link')); assert.throws(() => readConfig(path.join(root, 'link')), /owner-only/);
  fs.writeFileSync(file, 'PRIVATE_CANARY'); assert.throws(() => readConfig(file), e => !e.message.includes('PRIVATE_CANARY'));
});
test('paths cannot traverse or dereference private sibling files', t => {
  const root = temporary(t); write(root, 'real', 'x'); fs.symlinkSync(path.join(root, 'real'), path.join(root, 'link'));
  for (const p of ['../secret', '/tmp/secret', '..\\secret']) assert.throws(() => inside(root, p));
  assert.throws(() => regularFile(root, 'link'), /symbolic/);
  for (const p of ['.env.local', 'post-mortem/evidence.json', 'public/.env', 'public/docs/private.md', '.next/cache/data']) assert.throws(() => assertPayloadPath(p));
  assert.doesNotThrow(() => assertPayloadPath('.next/server/app/api/internal/route.js'));
  assert.doesNotThrow(() => assertPayloadPath('node_modules/semver/internal/debug.js'));
});
test('packaging retains accepted payloads and omits ambient workspace files', t => {
  const f = fixture(t); write(f.app, '.env.local', 'AMBIENT_PRIVATE'); write(f.app, 'post-mortem/private.md', 'AMBIENT_PRIVATE'); write(f.app, '.next/cache/dirty', 'AMBIENT_PRIVATE');
  const result = packageSelfHosted(f.build, f.out, { startupTrace: { files: ['node_modules/next/package.json'], warnings: 0 } }), manifest = verifyPackage(f.out);
  assert(result.comparedToAcceptedArtifact >= 3); assert.equal(result.bytesChanged, 0);
  assert.equal(fs.readFileSync(path.join(f.out, 'runtime/.next/server/app/v1/inference/route.js'), 'utf8'), '// accepted Nova fixture');
  assert(!Object.keys(manifest.files).some(n => /post-mortem|\.env|cache\/dirty/.test(n)));
  assert.throws(() => packageSelfHosted(f.build, f.out, { startupTrace: { files: ['node_modules/next/package.json'], warnings: 0 } }), /new output/);
});
test('modified accepted source prevents packaging', t => {
  const f = fixture(t); write(f.app, 'package.json', '{"changed":true}'); assert.throws(() => packageSelfHosted(f.build, f.out, { startupTrace: { files: ['node_modules/next/package.json'], warnings: 0 } }), /source changed/); assert(!fs.existsSync(f.out));
});
test('modified compiled Nova prevents packaging', t => {
  const f = fixture(t); write(f.app, '.next/server/app/v1/inference/route.js', '// altered handler'); assert.throws(() => packageSelfHosted(f.build, f.out, { startupTrace: { files: ['node_modules/next/package.json'], warnings: 0 } }), /differ/); assert(!fs.existsSync(f.out));
});
test('trace traversal and symlink substitution prevent packaging', t => {
  const f = fixture(t); write(f.build, 'private', 'sibling secret'); write(f.app, '.next/next-server.js.nft.json', { version: 1, files: ['../../private'] });
  assert.throws(() => packageSelfHosted(f.build, f.out, { startupTrace: { files: ['node_modules/next/package.json'], warnings: 0 } })); assert(!fs.existsSync(f.out));
  write(f.app, '.next/next-server.js.nft.json', { version: 1, files: ['../node_modules/next/package.json'] });
  fs.unlinkSync(path.join(f.app, 'public/example.txt')); fs.symlinkSync(path.join(f.build, 'private'), path.join(f.app, 'public/example.txt'));
  assert.throws(() => packageSelfHosted(f.build, f.out, { startupTrace: { files: ['node_modules/next/package.json'], warnings: 0 } }), /Symbolic/);
});
test('build-only secrets and private public content prevent packaging', t => {
  const f = fixture(t); write(f.app, '.next/server/leak.js', 'CANARY_' + 'x'.repeat(40));
  assert.throws(() => packageSelfHosted(f.build, f.out, { startupTrace: { files: ['node_modules/next/package.json'], warnings: 0 } }), /Private material/);
  fs.unlinkSync(path.join(f.app, '.next/server/leak.js')); write(f.app, 'public/leak.txt', 'GALX_PRIVATE_POST_MORTEM_CONTENT');
  assert.throws(() => packageSelfHosted(f.build, f.out, { startupTrace: { files: ['node_modules/next/package.json'], warnings: 0 } }), /Private diagnostic/);
});
test('release verification detects changed, missing, extra and symlink files', t => {
  const f = fixture(t); packageSelfHosted(f.build, f.out, { startupTrace: { files: ['node_modules/next/package.json'], warnings: 0 } }); const payload = path.join(f.out, 'runtime/public/example.txt');
  fs.writeFileSync(payload, 'changed'); assert.throws(() => verifyPackage(f.out), /checksum/);
  fs.writeFileSync(payload, 'public fixture'); write(f.out, 'runtime/extra', 'x'); assert.throws(() => verifyPackage(f.out), /Unexpected/);
  fs.unlinkSync(path.join(f.out, 'runtime/extra')); fs.unlinkSync(payload); assert.throws(() => verifyPackage(f.out), /missing/);
  fs.symlinkSync(path.join(f.app, 'public/example.txt'), payload); assert.throws(() => verifyPackage(f.out), /Symbolic/);
});

test('a package that boots cannot be staged without matching whole-image acceptance', t => {
  const f = fixture(t); packageSelfHosted(f.build, f.out, { startupTrace: { files: ['node_modules/next/package.json'], warnings: 0 } });
  const manifestSha256 = hashFile(path.join(f.out, 'manifest.json')), image = 'sha256:' + 'c'.repeat(64);
  write(f.out, 'image.json', { image, manifestSha256 });
  const privateFile = path.join(f.root, 'private.json'); fs.writeFileSync(privateFile, JSON.stringify(config()), { mode: 0o600 });
  const destination = path.join(f.root, 'plan');
  const run = () => spawnSync(process.execPath, [path.resolve('scripts/self-host.mjs'), 'plan', f.out, privateFile, destination], { encoding: 'utf8' });
  let result = run(); assert.equal(result.status, 1); assert.match(result.stderr, /whole-image runtime acceptance/); assert(!fs.existsSync(destination));
  const receipt = { status: 'PASSED', image, manifestSha256, testSha256: runtimeAcceptanceHash(process.cwd()) };
  for (const change of [{ status: 'FAILED' }, { image: 'sha256:' + 'd'.repeat(64) }, { manifestSha256: 'stale' }, { testSha256: 'stale' }]) {
    write(f.out, 'acceptance.json', { ...receipt, ...change }); result = run();
    assert.equal(result.status, 1); assert.match(result.stderr, /does not match/); assert(!fs.existsSync(destination));
  }
});

test('operator commands fence configuration drift, explicit resume and Docker context without printing secrets', t => {
  const root = temporary(t), bin = path.join(root, 'bin'); fs.mkdirSync(bin);
  const privateFile = path.join(root, 'private.json'), values = config();
  fs.writeFileSync(privateFile, JSON.stringify(values), { mode: 0o600 });
  const image = 'sha256:' + 'c'.repeat(64), manifestSha256 = 'd'.repeat(64);
  const record = { image, manifestSha256, configFile: privateFile, port: 17787, project: 'galx-web-stage', configSha256: hashFile(privateFile), localAcceptance: { status: 'PASSED', image, manifestSha256 } };
  const compose = JSON.stringify(composePlan(record), null, 2) + '\n';
  fs.writeFileSync(path.join(root, 'compose.json'), compose);
  fs.writeFileSync(path.join(root, 'plan.json'), JSON.stringify({ ...record, composeSha256: sha256(compose) }));
  const state = { exists: false, status: 'exited' };
  write(bin, 'state.json', state);
  write(bin, 'docker', `#!${process.execPath}
const fs=require('fs'),path=require('path');const args=process.argv.slice(2),base=__dirname;
fs.appendFileSync(path.join(base,'calls.jsonl'),JSON.stringify(args)+'\\n');
if(args[0]!=='--context'||args[1]!=='desktop-linux')process.exit(1);
const a=args.slice(2),p=path.join(base,'state.json'),s=JSON.parse(fs.readFileSync(p));
if(a[0]==='context')console.log(JSON.stringify('unix:///fixture/.docker/run/docker.sock'));
else if(a[0]==='ps')console.log(s.exists?'fixture-container':'');
else if(a[0]==='inspect')console.log(JSON.stringify([{Id:'fixture-container',Image:'${image}',State:{Status:s.status,Health:{Status:'healthy'},ExitCode:0,OOMKilled:false},RestartCount:0}]));
else if(a[0]==='image')console.log(JSON.stringify([{Config:{Labels:{'ai.galx.manifest':'${manifestSha256}'}}}]));
else if(a[0]==='compose'){s.exists=true;s.status=a.includes('stop')?'exited':'running';fs.writeFileSync(p,JSON.stringify(s));}
else process.exit(1);
`);
  fs.chmodSync(path.join(bin, 'docker'), 0o700);
  const run = command => spawnSync(process.execPath, [path.resolve('scripts/self-host.mjs'), command, root], { encoding: 'utf8', env: { PATH: bin + path.delimiter + process.env.PATH, HOME: process.env.HOME, DOCKER_CONTEXT: 'colima-premium', GALX_PREMIUM_RELAY_KEY: 'AMBIENT_PRIVATE_CANARY' } });
  const staged = run('stage'); assert.equal(staged.status, 0, staged.stderr);
  assert.equal(run('stage').status, 1); // no implicit replacement/restart
  assert.equal(run('stop').status, 0);
  assert.equal(run('resume').status, 0);
  fs.writeFileSync(privateFile, JSON.stringify({ ...values, GALX_CONNECT_ENABLED: '1' }));
  assert.equal(run('resume').status, 1);
  const calls = fs.readFileSync(path.join(bin, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(calls.filter(c => c.includes('up')).length, 1);
  assert.equal(calls.filter(c => c.includes('start')).length, 1);
  assert(calls.find(c => c.includes('stop')).includes('480'));
  const allOutput = staged.stdout + staged.stderr + JSON.stringify(calls);
  assert(!allOutput.includes(values.GALX_VAULT_KEY_V1)); assert(!allOutput.includes('AMBIENT_PRIVATE_CANARY'));
});
