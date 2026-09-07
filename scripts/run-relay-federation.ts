import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { readShardRegistry, decryptRegistryShard } from '../src/relay/shard-registry.js';
import { DockerShardDriver } from '../src/relay/docker-shard-driver.js';
import { RelayFederationLifecycle, type DesiredShard } from '../src/relay/federation-lifecycle.js';
import { RelayFederationServer } from '../src/relay/federation-server.js';

// Host controller only. Workers receive one assigned credential and no database or vault keys.
const namespace = process.env.RELAY_FEDERATION_NAMESPACE || 'vnext-canary';
if (!/^[a-z0-9-]{1,32}$/.test(namespace)) throw new Error('Invalid federation namespace');
const directory = path.resolve('.relay', `federation-${namespace}`);
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const lock = path.join(directory, 'controller.lock');
// A stale lock requires explicit operator recovery; never race a potentially live controller.
let lockFd: number;
try { lockFd = fs.openSync(lock, 'wx', 0o600); }
catch { throw new Error(`Controller lock exists at ${lock}. Verify the previous controller has stopped before removing it.`); }
fs.writeFileSync(lockFd, String(process.pid));
let timer: NodeJS.Timeout | undefined;
let server: RelayFederationServer | undefined;
let lifecycle: RelayFederationLifecycle | undefined;
let stopping = false;
let shutdown: Promise<void> | undefined;
function stop(): Promise<void> {
  if (shutdown) return shutdown;
  stopping = true;
  if (timer) clearInterval(timer);
  shutdown = (async () => {
    try { try { await server?.stop(); } finally { await lifecycle?.stop(); } }
    finally { fs.closeSync(lockFd); fs.unlinkSync(lock); }
  })();
  return shutdown;
}
process.once('SIGTERM', () => { void stop().catch(() => { console.error('Federation shutdown incomplete'); process.exitCode = 1; }); });
process.once('SIGINT', () => { void stop().catch(() => { console.error('Federation shutdown incomplete'); process.exitCode = 1; }); });
try {
  const secretPath = path.join(directory, 'signing-secret');
  if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
  const secret = fs.readFileSync(secretPath, 'utf8');
  const read = async (): Promise<DesiredShard[]> => {
    const rows = await readShardRegistry();
    const shards: DesiredShard[] = [];
    for (const row of rows) {
      if (row.provider !== 'openai' || row.permission_retracted || !['active', 'healthy', 'warming_up', 'half_open', 'cooldown', 'exhausted', 'rate_limited'].includes(row.status)) continue;
      const credential = decryptRegistryShard(row);
      // An unreadable credential is missing authority, not a deletion event.
      if (!credential?.accessToken || !credential?.accountId) throw new Error('Cannot decrypt an active shard credential');
      const expiries = [Number(row.credential_expires_at_ms), Number(credential.expiresAtMs)].filter(n => Number.isFinite(n) && n > 0);
      try { const exp = JSON.parse(Buffer.from(credential.accessToken.split('.')[1], 'base64url').toString()).exp; if (typeof exp === 'number' && Number.isFinite(exp)) expiries.push(exp * 1000); } catch {}
      shards.push({ id: row.id, provider: row.provider, accountId: credential.accountId, accessToken: credential.accessToken,
        credentialRevision: createHash('sha256').update(JSON.stringify([credential.accessToken, credential.accountId])).digest('hex'),
        cooldownUntilMs: Number(row.cooldown_until_ms) || undefined,
        expiresAtMs: expiries.length ? Math.min(...expiries) : undefined });
    }
    return shards;
  };
  lifecycle = new RelayFederationLifecycle(read, new DockerShardDriver({ namespace, secret, image: process.env.RELAY_FEDERATION_IMAGE || 'galxai-relay:vnext' }));
  server = new RelayFederationServer(lifecycle, { secret, apiKeys: (process.env.RELAY_API_KEYS || '').split(',').filter(Boolean),
    adminKeys: (process.env.RELAY_ADMIN_API_KEYS || '').split(',').filter(Boolean), port: Number(process.env.RELAY_FEDERATION_PORT || 3301) });
  await lifecycle.reconcile();
  if (stopping) throw new Error('Federation startup interrupted');
  await server.start();
  if (stopping) throw new Error('Federation startup interrupted');
  timer = setInterval(() => { void lifecycle!.reconcile(); }, 2000);
  console.log(`Federation ${namespace} listening on loopback port ${process.env.RELAY_FEDERATION_PORT || 3301}`);
} catch (error) { await stop(); throw error; }
