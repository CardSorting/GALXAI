import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const { readConfig, validateConfig } = require('../../deploy/self-host/runtime-config.cjs');
export const BASE_IMAGE = 'node@sha256:43aeff40f4afc22e83f7589a2f37e111cff5ca84529571f1c8415bcc5fcc21b2';
export const STOP_SECONDS = 480;
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function runtimeAcceptanceHash(root) {
  const files = ['scripts/test-self-host-runtime.ts', 'scripts/fixtures/self-host-http.ts', 'scripts/fixtures/self-host-browser.ts', 'scripts/fixtures/self-host-provider.cjs', 'scripts/fixtures/self-host-fixture-proxy.cjs'];
  return sha256(JSON.stringify(files.map(name => [name, hashFile(path.join(root, name))])));
}
export function hashFile(filename) {
  const hash = createHash('sha256'), buffer = Buffer.alloc(1024 * 1024), fd = fs.openSync(filename, 'r');
  try { for (;;) { const count = fs.readSync(fd, buffer, 0, buffer.length, null); if (!count) break; hash.update(buffer.subarray(0, count)); } }
  finally { fs.closeSync(fd); }
  return hash.digest('hex');
}
export function inside(root, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\\') || relative.includes('\0')) throw Error('Unsafe package path.');
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) throw Error('Package path escapes its root.');
  return resolved;
}
export function filesUnder(root, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw Error('Symbolic links are not accepted in the release payload.');
    if (entry.isDirectory()) out.push(...filesUnder(root, relative));
    else if (entry.isFile()) out.push(relative);
    else throw Error('Only regular files are accepted in the release payload.');
  }
  return out.sort();
}
export function regularFile(root, relative) {
  const target = inside(root, relative), real = fs.realpathSync(target);
  if (real !== target || !fs.statSync(target).isFile()) throw Error('Package inputs must be regular files without symbolic links.');
  return target;
}
export function publicAsset(relative) {
  return relative.startsWith('public/') || relative.startsWith('.next/static/') || /\.next\/server\/(app|pages)\/.*\.(html|rsc|body)$/.test(relative);
}
export function assertPayloadPath(relative) {
  if (!/^(?:node_modules\/|\.next\/|public\/|package\.json$)/.test(relative) || /(?:^|\/)(?:\.env(?:\.[^/]*)?|\.git|post-mortem|\.relay|\.vercel|test-fixtures)(?:\/|$)/.test(relative) || /^public\/(?:internal|docs)(?:\/|$)/.test(relative)) throw Error('Unapproved runtime payload path.');
  if (/^\.next\/(?:cache|trace|diagnostics|types)(?:\/|$)/.test(relative)) throw Error('Build diagnostics and caches are not runtime inputs.');
}
export function verifyPackage(directory) {
  const root = fs.realpathSync(directory);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  if (manifest.version !== 1 || manifest.platform !== 'linux/amd64' || manifest.baseImage !== BASE_IMAGE || !manifest.files || !Object.keys(manifest.files).length) throw Error('Invalid package manifest.');
  const actual = filesUnder(root).filter(n => !['manifest.json', 'image.json', 'image.tar', 'image.tar.sha256', 'acceptance.json'].includes(n));
  if (JSON.stringify(actual) !== JSON.stringify(Object.keys(manifest.files).sort())) throw Error('Unexpected or missing release files.');
  for (const relative of actual) {
    const expected = manifest.files[relative], file = regularFile(root, relative);
    if (sha256(fs.readFileSync(file)) !== expected.sha256 || fs.statSync(file).size !== expected.bytes) throw Error('Release file checksum mismatch.');
  }
  return manifest;
}
export function composePlan({ image, configFile, port = 17787, project = 'galx-web-stage' }) {
  if (!/^sha256:[a-f0-9]{64}$/.test(image)) throw Error('Use an immutable local Docker image ID.');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid loopback port.');
  if (!/^galx-web-[a-z0-9-]{1,32}$/.test(project)) throw Error('Use a distinct galx-web- project name.');
  if (!path.isAbsolute(configFile) || /[\u0000\r\n$]/.test(configFile)) throw Error('Use an absolute configuration path without interpolation.');
  return {
    name: project,
    services: { web: {
      image, platform: 'linux/amd64', pull_policy: 'never', init: true,
      user: '1000:1000', read_only: true, cap_drop: ['ALL'], security_opt: ['no-new-privileges:true'],
      ports: [`127.0.0.1:${port}:3000`], restart: 'unless-stopped', stop_signal: 'SIGTERM', stop_grace_period: `${STOP_SECONDS}s`,
      mem_limit: '1536m', cpus: 2, pids_limit: 160,
      tmpfs: [
        '/tmp:rw,noexec,nosuid,nodev,size=32m,uid=1000,gid=1000,mode=0700',
        '/app/.next/cache:rw,noexec,nosuid,nodev,size=128m,uid=1000,gid=1000,mode=0700',
        '/app/.next/server/app:rw,noexec,nosuid,nodev,size=128m,uid=1000,gid=1000,mode=0700',
        '/app/.next/server/pages:rw,noexec,nosuid,nodev,size=16m,uid=1000,gid=1000,mode=0700',
      ],
      volumes: [{ type: 'bind', source: configFile, target: '/run/secrets/galx-runtime.json', read_only: true, bind: { create_host_path: false } }],
      logging: { driver: 'json-file', options: { 'max-size': '10m', 'max-file': '3' } },
      labels: { 'ai.galx.self-host': 'v1', 'ai.galx.lifecycle': 'explicit-stop-480s' },
    } },
  };
}

/** Nova-only placement uses the already accepted image, with no Media/storage,
 * billing, account-administration or provider-account credential configuration. */
export function validateNovaConfig(values) {
  const names = new Set(['DATABASE_URL', 'SUPABASE_DB_SSL_MODE', 'SUPABASE_DB_CA_CERT', 'SUPABASE_POOL_SIZE', 'SUPABASE_POOL_MAX_USES', 'SUPABASE_TIMEOUT_MS',
    'GALX_VAULT_KEY_V1', 'GALX_VAULT_ACTIVE_KEY_VERSION', 'GALX_AUDIT_SIGNING_SECRET',
    'GALX_CONNECT_ENABLED', 'GALX_CONNECT_ORIGIN', 'GALX_NOVA_RESOURCE', 'GALX_CONNECT_CLIENTS',
    'GALX_PREMIUM_RELAY_URL', 'GALX_PREMIUM_RELAY_KEY']);
  for (const name of Object.keys(values)) if (!name.startsWith('NEXT_PUBLIC_') && !names.has(name)) throw Error('Nova configuration includes unrelated authority.');
  if (values.GALX_CONNECT_ENABLED !== '1' || !values.DATABASE_URL || !values.GALX_PREMIUM_RELAY_KEY || !values.GALX_PREMIUM_RELAY_URL) throw Error('Private Nova acceptance requires explicit access configuration.');
  if (values.GALX_CONNECT_ORIGIN !== 'https://galx.ai' || values.GALX_NOVA_RESOURCE !== 'https://nova.galx.ai') throw Error('Nova deployment identity does not match the approved transition.');
  const clients = JSON.parse(values.GALX_CONNECT_CLIENTS);
  if (!clients.length || clients.some(c => !['reference-native', 'reference-browser'].includes(c.id))) throw Error('Nova acceptance requires the approved first-party registry.');
  return values;
}
