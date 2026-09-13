import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Must be the first dependency: no repository, R2 or provider singleton may see
// inherited application credentials. Local storage belongs to this run only.
const retained = new Set(['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'SystemRoot', 'SYSTEMROOT', 'TSX_TSCONFIG_PATH']);
for (const key of Object.keys(process.env)) if (!retained.has(key)) delete process.env[key];
Object.assign(process.env, {
  NODE_ENV: 'test',
  GALX_VAULT_ACTIVE_KEY_VERSION: 'v1',
  GALX_VAULT_KEY_V1: randomBytes(48).toString('base64url'),
  GALX_AUDIT_SIGNING_SECRET: randomBytes(48).toString('base64url'),
});
const previousDirectory = process.cwd();
const workspace = mkdtempSync(path.join(tmpdir(), 'galx-worker-fixture-'));
process.chdir(workspace);
process.on('exit', () => {
  process.chdir(previousDirectory);
  rmSync(workspace, { recursive: true, force: true });
});

// The suite replaces this with an explicit fixture dispatcher, never live fetch.
let bootstrapRequests = 0;
globalThis.fetch = async () => {
  bootstrapRequests++;
  throw new Error('Worker fixture transport is not installed');
};
process.on('exit', () => {
  if (bootstrapRequests) {
    console.error(`Unexpected HTTP during worker fixture initialization: ${bootstrapRequests}`);
    process.exitCode = 1;
  }
});
