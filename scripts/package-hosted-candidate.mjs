import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { retainHostedOutput } from './retain-hosted-output.mjs';

// Build only. This command has no deployment, account or provider credentials.
// The explicit JSON input contains public build variables and project metadata.
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [destination, configuration, sourceRoot] = process.argv.slice(2);
if (!destination || !configuration || process.argv.length > 5) throw new Error('Usage: node scripts/package-hosted-candidate.mjs <empty-output-directory> <public-build-inputs.json> [isolated-source-root]');
const root = fs.realpathSync(sourceRoot || repository);
const output = path.resolve(destination), input = JSON.parse(fs.readFileSync(configuration, 'utf8'));
if (fs.existsSync(output)) throw new Error('Output must not exist; cached or partial builds are not accepted');
const allowed = new Set(['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_ACCOUNT_API_URL', 'NEXT_PUBLIC_ACCOUNT_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION', 'NEXT_PUBLIC_BING_SITE_VERIFICATION', 'NEXT_PUBLIC_YANDEX_SITE_VERIFICATION', 'NEXT_PUBLIC_BAIDU_SITE_VERIFICATION', 'NEXT_PUBLIC_GALX_EDGE_URL', 'PUBLIC_ASSETS_URL']);
for (const [key, value] of Object.entries(input.publicEnvironment || {})) {
  if (!allowed.has(key) || typeof value !== 'string' || /[\r\n\u0000]/.test(value)) throw new Error('Unapproved build variable');
}
if (!input.projectId || !input.orgId || !(input.publicEnvironment?.NEXT_PUBLIC_ACCOUNT_API_URL || input.publicEnvironment?.NEXT_PUBLIC_SUPABASE_URL)) throw new Error('Missing declared project/public build inputs');
const app = path.join(output, 'app'), tooling = path.join(output, 'tooling');
fs.mkdirSync(app, { recursive: true }); fs.mkdirSync(tooling);
const sha = value => createHash('sha256').update(value).digest('hex');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'src', 'public', 'BROC'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
files.push('package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'postcss.config.mjs', 'tailwind.config.ts', 'eslint.config.mjs', 'vercel.json', '.vercelignore');
const source = {};
for (const name of [...new Set(files)].sort()) {
  const original = path.join(root, name);
  if (!fs.statSync(original).isFile() || fs.lstatSync(original).isSymbolicLink()) throw new Error('Build inputs must be regular files');
  const bytes = fs.readFileSync(original); source[name] = sha(bytes);
  fs.mkdirSync(path.dirname(path.join(app, name)), { recursive: true }); fs.writeFileSync(path.join(app, name), bytes);
}
for (const name of ['package.json', 'package-lock.json']) fs.copyFileSync(path.join(repository, 'deploy/hosted', name), path.join(tooling, name));
fs.mkdirSync(path.join(app, '.vercel'));
fs.writeFileSync(path.join(app, '.vercel/project.json'), JSON.stringify({ projectId: input.projectId, orgId: input.orgId, projectName: 'galxai', settings: { framework: 'nextjs', nodeVersion: '22.x', installCommand: 'npm ci', buildCommand: 'next build', devCommand: null, outputDirectory: null, rootDirectory: null, directoryListing: false } }, null, 2));
fs.writeFileSync(path.join(app, '.vercel/.env.production.local'), Object.entries(input.publicEnvironment).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
const image = 'node@sha256:43aeff40f4afc22e83f7589a2f37e111cff5ca84529571f1c8415bcc5fcc21b2';
const provenance = { at: new Date().toISOString(), sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), workingTreeSnapshot: true, sourceManifestSha256: sha(JSON.stringify(source)), files: Object.keys(source).length, source, dependencyLockSha256: source['package-lock.json'], toolingLockSha256: sha(fs.readFileSync(path.join(tooling, 'package-lock.json'))), builder: { image, platform: 'linux/amd64', node: '22.23.2', cli: '48.5.0' }, publicBuildInputNames: Object.keys(input.publicEnvironment).sort(), publicBuildInputSha256: sha(JSON.stringify(input.publicEnvironment)), ephemeralBuildInputs: ['GALX_VAULT_KEY_V1', 'GALX_AUDIT_SIGNING_SECRET'], ephemeralBuildInputAuthority: 'Fresh throwaway values satisfy import-time validation, as in the existing CI build; no database or provider authority. Must be absent from the artifact.', excluded: ['ambient environment', 'existing dependencies', 'existing output', 'ignored files', 'sibling repositories', 'server secrets', 'private documentation'], deployed: false };
fs.writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
// Container entrypoint uses only pinned tools and this new snapshot. Its HOME
// and package cache are fresh. No host credential directories are mounted.
fs.writeFileSync(path.join(output, 'build.sh'), '#!/bin/sh\nset -eu\ncd /build/tooling\nnpm ci --no-audit --no-fund\ncd /build/app\nnode /build/run-build.cjs\n');
fs.writeFileSync(path.join(output, 'run-build.cjs'), `const { randomBytes } = require('node:crypto');
const fs = require('node:fs'), { spawnSync } = require('node:child_process');
const ephemeral = { GALX_VAULT_KEY_V1: randomBytes(32).toString('hex'), GALX_AUDIT_SIGNING_SECRET: randomBytes(32).toString('hex') };
fs.writeFileSync('/build/build-canaries.json', JSON.stringify(ephemeral), { mode: 0o600 });
const result = spawnSync('/build/tooling/node_modules/.bin/vercel', ['build', '--prod'], { stdio: 'inherit', env: { ...process.env, ...ephemeral } });
process.exit(result.status ?? 1);
`);
execFileSync('docker', ['run', '--rm', '--platform', 'linux/amd64', '--cpus', '4', '--memory', '6g', '-e', 'NEXT_TELEMETRY_DISABLED=1', '-e', 'VERCEL_TELEMETRY_DISABLED=1', '-e', 'NODE_OPTIONS=--max-old-space-size=4096', '--mount', `type=bind,src=${output},dst=/build`, image, 'sh', '/build/build.sh'], { stdio: 'inherit', env: { PATH: process.env.PATH, DOCKER_CONTEXT: process.env.DOCKER_CONTEXT || 'desktop-linux', HOME: process.env.HOME } });
for (const [name, hash] of Object.entries(source)) if (sha(fs.readFileSync(path.join(app, name))) !== hash) throw new Error('Build mutated a source input: ' + name);
retainHostedOutput(output);
const canaries = Object.values(JSON.parse(fs.readFileSync(path.join(output, 'build-canaries.json'))));
const manifest = JSON.parse(fs.readFileSync(path.join(output, 'artifact-manifest.json')));
for (const name of Object.keys(manifest)) {
  if (typeof manifest[name] !== 'string') continue;
  const bytes = fs.readFileSync(path.join(app, name));
  if (canaries.some(value => bytes.includes(Buffer.from(value)))) throw new Error('Build-only canary escaped into the artifact');
}
console.log('Hosted build retained at ' + path.join(output, 'app/.vercel/output') + '; no deployment performed.');
