import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { startControllerProgress, controllerStage } from '../src/relay/controller-progress.js';
import { desiredShard } from '../src/relay/desired-shards.js';
import { readShardRegistry, decryptRegistryShard, configureRegistryEgressGuard, getRegistryEgressSnapshot } from '../src/relay/shard-registry.js';
import { DockerShardDriver } from '../src/relay/docker-shard-driver.js';
import { RelayFederationLifecycle, type DesiredShard } from '../src/relay/federation-lifecycle.js';
import { RelayFederationServer } from '../src/relay/federation-server.js';
import { FileInvalidCredentialStore } from '../src/relay/invalid-credential-store.js';
import { FileShardMaintenanceStore } from '../src/relay/shard-maintenance-store.js';
import { DesktopManager, DockerDesktopDriver } from '../src/relay/desktop-manager.js';
import { createDesktopEnrollment } from '../src/relay/desktop-enrollment.js';
import { createDesktopCredentialRefresh, createDesktopCredentialMatch } from '../src/relay/desktop-credential-refresh.js';

// Host controller only. Workers receive one assigned credential and no database or vault keys.
const namespace = process.env.RELAY_FEDERATION_NAMESPACE || 'vnext-canary';
if (!/^[a-z0-9-]{1,32}$/.test(namespace)) throw new Error('Invalid federation namespace');
const directory = path.resolve('.relay', `federation-${namespace}`);
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
// Authority is kernel-held by the external supervisor and inherited here.
startControllerProgress();
let timer: NodeJS.Timeout | undefined;
let server: RelayFederationServer | undefined;
let lifecycle: RelayFederationLifecycle | undefined;
let stopping = false;
let shutdown: Promise<void> | undefined;
function stop(): Promise<void> {
  if (shutdown) return shutdown;
  stopping = true;
  controllerStage('shutdown');
  if (timer) clearInterval(timer);
  shutdown = (async () => {
    try { try { await server?.stop(); } finally { await lifecycle?.stop(); } }
    finally { controllerStage('stopped'); }
  })();
  return shutdown;
}
process.once('SIGTERM', () => { void stop().catch(() => { console.error('Federation shutdown incomplete'); process.exitCode = 1; }); });
process.once('SIGINT', () => { void stop().catch(() => { console.error('Federation shutdown incomplete'); process.exitCode = 1; }); });
try {
  configureRegistryEgressGuard(path.join(directory, 'registry-egress.json'));
  const secretPath = path.join(directory, 'signing-secret');
  if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
  const secret = fs.readFileSync(secretPath, 'utf8');
  const read = async (): Promise<DesiredShard[]> => {
    const rows = await readShardRegistry();
    const shards: DesiredShard[] = [];
    for (const row of rows) {
      const shard = desiredShard(row, decryptRegistryShard(row));
      if (shard) shards.push(shard);
    }
    return shards;
  };
  lifecycle = new RelayFederationLifecycle(read, new DockerShardDriver({ namespace, secret, mutationJournalPath: path.join(directory, 'docker-operations.json'),
    onDiagnostic: event => console.error(JSON.stringify({ component: 'federation_docker', ...event })), codexImageToolAlias: process.env.RELAY_CODEX_IMAGE_TOOL_ALIAS === 'true',
    sitesOutputLimitForwarding: process.env.RELAY_SITES_OUTPUT_LIMIT_FORWARDING === 'true', image: process.env.RELAY_FEDERATION_IMAGE || 'galxai-relay:vnext' }),
    Date.now, 15000, new FileInvalidCredentialStore(path.join(directory, 'invalid-credentials.json')), new FileShardMaintenanceStore(path.join(directory, 'maintenance.json')));
  server = new RelayFederationServer(lifecycle, { secret, admissionReceiptPath: path.join(directory, 'admissions.json'), apiKeys: (process.env.RELAY_API_KEYS || '').split(',').filter(Boolean),
    adminKeys: (process.env.RELAY_ADMIN_API_KEYS || '').split(',').filter(Boolean), port: Number(process.env.RELAY_FEDERATION_PORT || 3301),
    egressSnapshot: getRegistryEgressSnapshot,
    desktops: new DesktopManager(path.join(directory, 'desktops.json'), new DockerDesktopDriver(namespace, process.env.RELAY_DESKTOP_IMAGE || 'galxai-relay-desktop:v1'), Date.now, createDesktopCredentialRefresh(), createDesktopCredentialMatch(), createDesktopEnrollment()) });
  controllerStage('reconcile');
  await lifecycle.reconcile();
  if (stopping) throw new Error('Federation startup interrupted');
  await server.start();
  if (stopping) throw new Error('Federation startup interrupted');
  controllerStage('idle');
  let reconciliations = 0;
  let unavailableSince = Date.now();
  let readinessAlerted = false;
  timer = setInterval(() => {
    if (stopping) return;
    const ready = lifecycle!.routable() && lifecycle!.capabilities.snapshot().models.some(model => model.eligibleShardCount > 0);
    if (ready) {
      unavailableSince = Date.now();
      if (readinessAlerted) console.log(JSON.stringify({ component: 'federation_controller', code: 'capability_readiness_restored' }));
      readinessAlerted = false;
    } else if (!readinessAlerted && Date.now() - unavailableSince >= 60_000) {
      readinessAlerted = true;
      console.error(JSON.stringify({ component: 'federation_controller', code: 'capability_readiness_missing', stage: 'readiness', action: 'Inspect private capability and registry diagnostics; provider unavailability alone does not require controller restart' }));
    }
    if (reconciliations++ === 0) controllerStage('reconcile');
    void lifecycle!.reconcile().catch(() => { console.error('Federation reconciliation failed'); })
      .finally(() => { if (--reconciliations === 0 && !stopping) controllerStage('idle'); });
  }, 2000);
  console.log(`Federation ${namespace} listening on loopback port ${process.env.RELAY_FEDERATION_PORT || 3301}`);
} catch (error) { await stop(); throw error; }
