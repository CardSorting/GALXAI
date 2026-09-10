import fs from 'node:fs';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { Duplex } from 'node:stream';
import { RequestError } from './request-policy.js';
import { createHash, randomUUID } from 'node:crypto';
import { DesktopCredentialError, parseDesktopCredential, type DesktopCredentialFile, type CredentialSource } from './desktop-credentials.js';
import type { RefreshDesktopCredential, MatchDesktopCredential } from './desktop-credential-refresh.js';
import { saveDesktopJournal } from './desktop-journal.js';
import { desktopLoginState, type DesktopLoginState } from './desktop-login-state.js';
import { DesktopOrganization } from './desktop-organization.js';

interface DesktopActivity {
  id: string; sequence: number; desktopId: string; name: string; action: string;
  outcome: 'queued' | 'running' | 'completed' | 'failed'; at: number; updatedAt: number;
  startedAt?: number; finishedAt?: number; durationMs?: number; code?: string;
}

export interface DesktopRecord {
  id: string; name: string; relayId?: string; createdAt: number; updatedAt: number;
  desired: 'running' | 'stopped'; error?: string;
  credentialSync?: boolean;
  syncedFingerprint?: string;
  credentialIntent?: { fingerprint: string; expectedRevision: string };
}
export interface DesktopContainer { id: string; containerId: string; running: boolean; healthy: boolean; unhealthy?: boolean; }
export interface DesktopDriver {
  available(): Promise<boolean>;
  list(): Promise<DesktopContainer[]>;
  create(id: string): Promise<void>;
  start(id: string): Promise<void>;
  stop(id: string): Promise<void>;
  destroy(id: string): Promise<void>;
  launch(id: string, app: 'terminal' | 'chrome' | 'signin' | 'signin-device' | 'signin-cancel'): Promise<void>;
  display(id: string, containerId: string): Promise<Duplex>;
  clipboard(id: string, text?: string): Promise<string>;
  credentials?(id: string): Promise<DesktopCredentialFile[]>;
  loginStatus?(id: string): Promise<unknown>;
}
export const desktopId = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
const execute = promisify(execFile);

/** Fixed Docker arguments only. A desktop never receives host keys, host files or the Docker socket. */
export class DockerDesktopDriver implements DesktopDriver {
  constructor(private readonly namespace: string, private readonly image = 'galxai-relay-desktop:v1', private readonly seccomp = path.resolve('src/relay/desktop/seccomp.json')) {
    if (!/^[a-z0-9-]{1,32}$/.test(namespace) || !image) throw new Error('Invalid desktop configuration');
  }
  private name(id: string) { if (!desktopId(id)) throw new RequestError(400, 'invalid_desktop', 'Invalid workspace ID.'); return `galx-desktop-${this.namespace}-${id}`; }
  private async docker(args: string[], timeout = 15000) {
    try { return (await execute('docker', args, { timeout, maxBuffer: 2 * 1024 * 1024 })).stdout.trim(); }
    catch { throw new RequestError(503, 'desktop_operation_failed', 'The desktop operation could not finish. Check Docker and retry.'); }
  }
  async available() { try { await this.docker(['image', 'inspect', this.image, '--format', '{{.Id}}']); return true; } catch { return false; } }
  async credentials(id: string): Promise<DesktopCredentialFile[]> {
    const c = await this.owned(id); if (!c.running) throw new Error('Desktop stopped');
    const program = fs.readFileSync(new URL('./desktop/read-credentials.py', import.meta.url), 'utf8');
    const raw = await this.docker(['exec', '--user', '1000:1000', c.containerId, 'python3', '-c', program], 5000);
    const result = JSON.parse(raw);
    if (!Array.isArray(result) || result.length > 2) throw new DesktopCredentialError('credential_invalid');
    return result;
  }
  async loginStatus(id: string): Promise<unknown> {
    const program = fs.readFileSync(new URL('./desktop/read-login-state.py', import.meta.url), 'utf8');
    return JSON.parse(await this.docker(['exec', '--user', '1000:1000', this.name(id), 'python3', '-c', program], 5000));
  }
  async list(): Promise<DesktopContainer[]> {
    const ids = (await this.docker(['ps', '-a', '--filter', `label=io.galx.desktop.namespace=${this.namespace}`, '--format', '{{.ID}}'])).split('\n').filter(Boolean);
    if (!ids.length) return [];
    if (ids.length > 32) throw new RequestError(503, 'desktop_inventory_limit', 'The desktop inventory exceeded its safety limit.');
    const raw = await this.docker(['inspect', '--format', '{{json .Id}}\t{{json .Name}}\t{{json .Config.Labels}}\t{{json .NetworkSettings.Ports}}\t{{.State.Running}}\t{{with index .State "Health"}}{{.Status}}{{end}}', ...ids]);
    return raw.split('\n').map(line => {
      const [container, name, labels, ports, running, health] = line.split('\t'), meta = JSON.parse(labels), id = meta['io.galx.desktop.id'];
      if (!desktopId(id) || JSON.parse(name) !== '/' + this.name(id) || meta['io.galx.desktop.namespace'] !== this.namespace) throw new Error('Invalid desktop ownership');
      if (Object.values(JSON.parse(ports) ?? {}).some(binding => Array.isArray(binding) && binding.length)) throw new Error('Desktop display ports must not be published');
      return { id, containerId: JSON.parse(container), running: running === 'true', healthy: health === 'healthy', unhealthy: health === 'unhealthy' };
    });
  }
  private async owned(id: string) { const container = (await this.list()).find(c => c.id === id); if (!container) throw new RequestError(404, 'desktop_missing', 'This desktop container is unavailable.'); return container; }
  private async resourceLabels(type: string, name: string): Promise<Record<string, string> | undefined> {
    // A failed inspect is not evidence of absence: retain the journal on daemon failures.
    const names = (await this.docker([type, 'ls', '--filter', `name=${name}`, '--format', '{{.Name}}'])).split('\n');
    if (!names.includes(name)) return undefined;
    return JSON.parse(await this.docker([type, 'inspect', name, '--format', '{{json .Labels}}']));
  }
  async create(id: string) {
    const name = this.name(id), label = ['--label', `io.galx.desktop.namespace=${this.namespace}`, '--label', `io.galx.desktop.id=${id}`];
    // Each ID owns exactly one network and one home volume. Reconcile an interrupted create without duplicates.
    for (const [resource, resourceName] of [['network', name + '-net'], ['volume', name + '-home']]) {
      const labels = await this.resourceLabels(resource, resourceName);
      if (labels !== undefined) { if (labels?.['io.galx.desktop.namespace'] !== this.namespace || labels?.['io.galx.desktop.id'] !== id) throw new Error('Desktop resource ownership mismatch'); }
      else await this.docker(resource === 'network' ? ['network', 'create', '--driver', 'bridge', '--opt', 'com.docker.network.bridge.enable_icc=false', ...label, resourceName] : ['volume', 'create', ...label, resourceName]);
    }
    await this.docker(['create', '--name', name, ...label, '--hostname', 'relay-desktop', '--restart', 'unless-stopped',
      '--user', '1000:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--security-opt', `seccomp=${this.seccomp}`,
      '--pids-limit', '512', '--memory', '2g', '--memory-swap', '2g', '--cpus', '2', '--shm-size', '256m',
      '--network', name + '-net', '--mount', `type=volume,source=${name}-home,target=/home/operator`,
      '--tmpfs', '/tmp:rw,nosuid,nodev,size=256m,uid=1000,gid=1000', '--log-opt', 'max-size=10m', '--log-opt', 'max-file=2', this.image], 30000);
  }
  async start(id: string) { const c = await this.owned(id); await this.docker(['start', c.containerId], 30000); }
  async stop(id: string) {
    const c = await this.owned(id);
    if (!c.running) return;
    try { await this.docker(['exec', c.containerId, 'pkill', '-TERM', '-x', 'chrome'], 5000); } catch { /* Chrome need not be open. */ }
    await this.docker(['stop', '--time', '15', c.containerId], 25000);
  }
  async destroy(id: string) {
    const c = (await this.list()).find(c => c.id === id), name = this.name(id);
    if (c) { if (c.running) await this.stop(id); await this.docker(['rm', c.containerId]); }
    for (const [type, namePart] of [['volume', '-home'], ['network', '-net']]) {
      const labels = await this.resourceLabels(type, name + namePart);
      if (labels === undefined) continue;
      if (labels?.['io.galx.desktop.namespace'] !== this.namespace || labels?.['io.galx.desktop.id'] !== id) throw new Error('Desktop resource ownership mismatch');
      await this.docker([type, 'rm', name + namePart]);
    }
  }
  async launch(id: string, app: 'terminal' | 'chrome' | 'signin' | 'signin-device' | 'signin-cancel') {
    if (!['terminal', 'chrome', 'signin', 'signin-device', 'signin-cancel'].includes(app)) throw new RequestError(400, 'invalid_app', 'Choose a supported desktop action.');
    const c = await this.owned(id); if (!c.running) throw new RequestError(409, 'desktop_stopped', 'Start this desktop first.');
    await this.docker(['exec', '--user', '1000:1000', c.containerId, '/opt/galx-desktop/open-app', app]);
  }
  async display(id: string, containerId: string): Promise<Duplex> {
    const c = await this.owned(id);
    if (!c.running || c.containerId !== containerId) throw new Error('Desktop changed');
    const child = spawn('docker', ['exec', '-i', '--user', '1000:1000', c.containerId, 'python3', '/opt/galx-desktop/display-bridge.py'], { stdio: ['pipe', 'pipe', 'ignore'] });
    const stream = Duplex.from({ readable: child.stdout, writable: child.stdin });
    child.once('error', () => stream.destroy(new Error('Display transport unavailable')));
    child.once('exit', () => stream.destroy());
    stream.once('close', () => child.kill('SIGTERM'));
    // Callers install their connection handlers after awaiting this method.
    stream.on('error', () => {});
    return stream;
  }
  async clipboard(id: string, value?: string): Promise<string> {
    const c = await this.owned(id);
    if (!c.running) throw new Error('Desktop stopped');
    if (value !== undefined) {
      if (typeof value !== 'string' || value.length > 65536) throw new RequestError(400, 'invalid_clipboard', 'Clipboard text is limited to 65,536 characters.');
      await new Promise<void>((resolve, reject) => {
        const child = spawn('docker', ['exec', '-i', '--user', '1000:1000', c.containerId, 'xclip', '-selection', 'clipboard', '-in'], { stdio: ['pipe', 'ignore', 'ignore'] });
        const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('Clipboard timed out')); }, 5000);
        child.once('error', () => { clearTimeout(timer); reject(new Error('Clipboard unavailable')); });
        child.once('exit', code => { clearTimeout(timer); if (code === 0) resolve(); else reject(new Error('Clipboard unavailable')); });
        child.stdin.on('error', () => {}); child.stdin.end(value, 'utf8');
      });
      return '';
    }
    const raw = await this.docker(['exec', '--user', '1000:1000', c.containerId, 'python3', '-c',
      'import gi,json;gi.require_version("Gtk","3.0");from gi.repository import Gtk,Gdk;print(json.dumps((Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD).wait_for_text() or "")[:65536]))'], 5000);
    const text = JSON.parse(raw);
    if (typeof text !== 'string' || text.length > 65536) throw new Error('Invalid clipboard');
    return text;
  }
}

/** Explicit manual lifecycle: browser disconnects and host restarts never create or delete environments. */
export class DesktopManager {
  private readonly organization: DesktopOrganization;
  private records = new Map<string, DesktopRecord>();
  private containers = new Map<string, DesktopContainer>();
  private operations = new Map<string, { activity: DesktopActivity; key: string; action: string; phase: 'queued' | 'running'; enqueuedAt: number; startedAt?: number; run: () => Promise<unknown>; promise: Promise<unknown>; resolve: (value: unknown) => void; reject: (error: unknown) => void }>();
  private reserved = new Set<string>();
  private admission: Promise<unknown> = Promise.resolve();
  private active = 0;
  private events: DesktopActivity[] = [];
  private activityEvicted = 0;
  private readonly activityStartedAt: number;
  private readonly credentialJobs = new Map<string, Promise<void>>();
  private readonly credentialJobKinds = new Map<string, 'signin' | 'check'>();
  private readonly ioJobs = new Map<string, { desktopId: string; key: string; promise: Promise<unknown> }>();
  private readonly loginStates = new Map<string, DesktopLoginState>();
  private readonly credentialStates = new Map<string, { state: 'waiting' | 'checking' | 'updated' | 'current' | 'error'; checkedAt?: number; syncedAt?: number; source?: CredentialSource; code?: string }>();
  private readonly credentialAttempts = new Map<string, { fingerprint: string; retryAt: number; failures?: number }>();
  private readonly credentialRevisions = new Map<string, string>();
  private credentialPollAt = 0;
  private credentialPolling?: Promise<void>;
  private credentialClosing = false;
  private sequence = 0;
  readonly maxOperations = 2;
  private refreshing?: Promise<void>;
  private refreshedAt = 0;
  private ready = false;
  private inventoryError = false;
  private corrupt = false;
  readonly maxRunning = 3;
  readonly maxDesktops = 12;
  constructor(private readonly file: string, readonly driver: DesktopDriver, private readonly now = Date.now,
    private readonly refreshCredential?: RefreshDesktopCredential, private readonly matchCredential?: MatchDesktopCredential) {
    this.activityStartedAt = now();
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    try {
      if (fs.existsSync(file)) {
        const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!Array.isArray(rows) || rows.length > this.maxDesktops || rows.some(r => !desktopId(r.id) || typeof r.name !== 'string' || r.name.length > 64 || !['running', 'stopped'].includes(r.desired) || !Number.isFinite(r.createdAt) || !Number.isFinite(r.updatedAt)
          || (r.credentialSync !== undefined && typeof r.credentialSync !== 'boolean') || (r.syncedFingerprint !== undefined && !/^[a-f0-9]{64}$/.test(r.syncedFingerprint))
          || (r.credentialIntent !== undefined && (!r.credentialIntent || typeof r.credentialIntent !== 'object' || Object.keys(r.credentialIntent).length !== 2 || !/^[a-f0-9]{64}$/.test(r.credentialIntent.fingerprint) || !/^[a-f0-9]{64}$/.test(r.credentialIntent.expectedRevision)))) || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('Invalid journal');
        this.records = new Map(rows.map(r => [r.id, { id: r.id, name: r.name, relayId: typeof r.relayId === 'string' ? r.relayId : undefined, credentialSync: r.credentialSync !== false, syncedFingerprint: r.syncedFingerprint, credentialIntent: r.credentialIntent, desired: r.desired, createdAt: r.createdAt, updatedAt: r.updatedAt, error: r.error ? 'desktop_operation_failed' : undefined }]));
      }
    } catch { this.corrupt = true; }
    this.organization = new DesktopOrganization(file + '.organization.json', () => [...this.records.keys()]);
  }
  organize(body: Record<string, unknown>) {
    this.accepting();
    if (this.corrupt) throw new RequestError(503, 'desktop_journal_unavailable', 'Workspace records are unavailable. Restore them before organizing.');
    return this.organization.change(body);
  }
  private save() { saveDesktopJournal(this.file, [...this.records.values()]); }
  refresh(force = false): Promise<void> {
    if (!force && this.now() - this.refreshedAt < 3000) return Promise.resolve();
    if (this.refreshing) return this.refreshing;
    return this.refreshing ??= (async () => {
      try {
        const [containers, ready] = await Promise.all([this.driver.list(), this.driver.available()]);
        this.containers = new Map(containers.map(c => [c.id, c])); this.ready = ready; this.inventoryError = false;
        if (this.driver.loginStatus) await Promise.all([...this.records.keys()].map(async id => {
          if (!this.containers.get(id)?.running) { this.loginStates.delete(id); return; }
          try { this.loginStates.set(id, desktopLoginState(await this.driver.loginStatus!(id), this.now())); }
          catch { this.loginStates.set(id, { state: 'unavailable' }); }
        }));
      }
      catch { this.inventoryError = true; }
      finally { this.refreshedAt = this.now(); }
    })().finally(() => { this.refreshing = undefined; });
  }
  snapshot(applied: (shardId: string, revision: string) => boolean = () => false) {
    return { available: this.ready && !this.corrupt && !this.inventoryError, imageReady: this.ready, inventoryFresh: !this.inventoryError && this.refreshedAt > 0 && this.now() - this.refreshedAt < 15000,
      journalHealthy: !this.corrupt, organization: this.organization.snapshot(), capturedAt: this.refreshedAt, maxRunning: this.maxRunning, maxDesktops: this.maxDesktops,
      runningCount: [...this.containers.values()].filter(c => c.running).length,
      reservedCount: [...this.reserved].filter(id => !this.containers.get(id)?.running).length,
      activeOperations: this.active + this.credentialJobs.size, queuedOperations: this.operations.size - this.active, maxOperations: this.maxOperations,
      activeIOOperations: this.ioJobs.size,
      activity: this.events.map(e => ({ ...e })),
      activityHistory: { startedAt: this.activityStartedAt, capacity: 100, evicted: this.activityEvicted },
      desktops: [...this.records.values()].sort((a, b) => b.createdAt - a.createdAt).map(r => {
        const c = this.containers.get(r.id), operation = this.operations.get(r.id);
        return { id: r.id, name: r.name, relayId: r.relayId, createdAt: r.createdAt, updatedAt: r.updatedAt,
          ioBusy: this.hasInput(r.id), busyApps: ['terminal', 'chrome'].filter(app => this.ioJobs.has(r.id + ':launch-' + app)),
          login: { available: !!this.driver.loginStatus, ...(this.loginStates.get(r.id) ?? { state: 'idle' as const }) },
          state: operation ? operation.phase === 'queued' ? 'queued' : operation.action : (this.inventoryError ? 'unknown' : c?.running ? c.healthy ? 'running' : c.unhealthy ? 'unhealthy' : 'starting' : c ? 'stopped' : r.error ? 'error' : 'missing'),
          operation: operation ? { action: operation.action, phase: operation.phase, enqueuedAt: operation.enqueuedAt, startedAt: operation.startedAt } : undefined,
          credentialSync: { enabled: r.credentialSync !== false, available: !!this.refreshCredential && !!this.driver.credentials,
            canMatch: !!this.matchCredential,
            applied: !!r.relayId && !!this.credentialRevisions.get(r.id) && applied(r.relayId, this.credentialRevisions.get(r.id)!),
            operation: this.credentialJobKinds.get(r.id),
            retryAt: Number.isFinite(this.credentialAttempts.get(r.id)?.retryAt) && (this.credentialAttempts.get(r.id)?.retryAt ?? 0) > this.now() ? this.credentialAttempts.get(r.id)!.retryAt : undefined,
            ...(this.credentialStates.get(r.id) ?? { state: 'waiting' }), busy: this.credentialJobs.has(r.id) },
          error: r.error, canConnect: !operation && !this.inventoryError && !!c?.running && !!c?.healthy };
      }) };
  }
  private record(id: string) { if (!desktopId(id) || !this.records.has(id)) throw new RequestError(404, 'desktop_not_found', 'Desktop not found.'); return this.records.get(id)!; }
  linkedShard(id: string) { return this.record(id).relayId; }
  link(id: string, shardId: unknown, expectedShardId: unknown): void {
    this.accepting();
    const r = this.record(id);
    if (this.corrupt) throw new RequestError(503, 'desktop_journal_unavailable', 'Desktop records are unavailable. Restore the journal before changing links.');
    if (this.operations.has(id) || this.credentialJobs.has(id)) throw new RequestError(409, 'desktop_busy', 'Wait for this desktop operation to finish before changing its link.');
    if (expectedShardId !== (r.relayId ?? null)) throw new RequestError(409, 'desktop_link_changed', 'This workspace link changed. Refresh before updating it.');
    if (shardId !== null && (typeof shardId !== 'string' || !/^[\w.:-]{1,128}$/.test(shardId))) throw new RequestError(400, 'invalid_shard', 'Select a registered shard.');
    this.records.set(id, { ...r, relayId: shardId ?? undefined, syncedFingerprint: undefined, credentialIntent: undefined, updatedAt: this.now() });
    try { this.save(); }
    catch { this.records.set(id, r); throw new RequestError(503, 'desktop_journal_unavailable', 'The workspace link could not be saved. Check the journal and retry.'); }
    this.credentialStates.delete(id); this.credentialAttempts.delete(id); this.credentialRevisions.delete(id);
    this.updateActivity(this.beginActivity(id, 'linking'), 'completed');
  }
  private beginActivity(id: string, action: string, name?: string): DesktopActivity {
    const event: DesktopActivity = { id: randomUUID(), sequence: ++this.sequence, desktopId: id,
      name: name ?? this.records.get(id)?.name ?? 'Workspace', action, outcome: 'queued', at: this.now(), updatedAt: this.now() };
    this.events.unshift(event);
    // Never evict work still in progress, even during a burst of instant link changes.
    while (this.events.length > 100) {
      const index = this.events.findLastIndex(e => e.outcome === 'completed' || e.outcome === 'failed');
      if (index < 0) break;
      this.events.splice(index, 1); this.activityEvicted++;
    }
    return event;
  }
  private updateActivity(event: DesktopActivity, outcome: DesktopActivity['outcome'], code?: string) {
    event.outcome = outcome; event.updatedAt = this.now();
    if (outcome === 'running') event.startedAt = this.now();
    if (outcome === 'completed' || outcome === 'failed') {
      event.finishedAt = this.now(); event.durationMs = Math.max(0, event.finishedAt - (event.startedAt ?? event.at));
    }
    if (code) event.code = code;
  }
  private schedule<T>(id: string, key: string, action: string, run: () => Promise<T>, name?: string): Promise<T> {
    this.accepting();
    if (this.hasInput(id)) throw new RequestError(409, 'desktop_busy', 'Wait for this desktop input operation to finish.');
    if (this.credentialJobs.has(id)) throw new RequestError(409, 'desktop_busy', 'A sign-in check is in progress. Wait for it to finish.');
    if (this.corrupt) throw new RequestError(503, 'desktop_journal_unavailable', 'Desktop records could not be read. Restore the local desktop journal before making changes.');
    const existing = this.operations.get(id);
    if (existing) {
      if (existing.key === key) return existing.promise as Promise<T>;
      throw new RequestError(409, 'desktop_busy', 'An operation is already in progress for this desktop. Other workspaces remain available.');
    }
    if (this.operations.size >= 8) throw new RequestError(429, 'desktop_busy', 'Desktop operations are busy. Wait and retry.');
    let resolve!: (value: unknown) => void, reject!: (error: unknown) => void;
    const promise = new Promise<unknown>((a, b) => { resolve = a; reject = b; });
    const activity = this.beginActivity(id, action, name);
    this.operations.set(id, { activity, key, action, phase: 'queued', enqueuedAt: activity.at, run, promise, resolve, reject });
    this.drain(); return promise as Promise<T>;
  }
  private drain() {
    for (const [id, job] of this.operations) {
      if (this.active + this.credentialJobs.size >= this.maxOperations) break;
      if (job.phase !== 'queued') continue;
      this.active++; job.phase = 'running'; job.startedAt = this.now(); this.updateActivity(job.activity, 'running');
      void (async () => {
        try { const value = await job.run(); this.updateActivity(job.activity, 'completed'); job.resolve(value); }
        catch (error) {
          const allowed = ['desktop_capacity', 'desktop_limit', 'desktop_confirmation_required', 'desktop_not_ready', 'desktop_inventory_unavailable', 'desktop_conflict', 'desktop_not_found'];
          this.updateActivity(job.activity, 'failed', error instanceof RequestError && allowed.includes(error.code) ? error.code : 'desktop_operation_failed'); job.reject(error);
        } finally { this.operations.delete(id); this.reserved.delete(id); this.active--; this.drain(); }
      })();
    }
  }
  private admit<T>(action: () => Promise<T>): Promise<T> {
    const result = this.admission.then(action); this.admission = result.catch(() => {}); return result;
  }
  private async capacity(id: string) {
    await this.refresh(true);
    if (this.inventoryError || !this.ready) throw new RequestError(503, 'desktop_not_ready', 'The desktop image or Docker is unavailable. Build the desktop image on the host and refresh.');
    if (this.containers.get(id)?.running) return;
    const occupied = new Set([...this.containers.values()].filter(c => c.running).map(c => c.id));
    for (const pending of this.reserved) occupied.add(pending);
    if (occupied.size >= this.maxRunning) throw new RequestError(409, 'desktop_capacity', `Stop a desktop before starting another. Up to ${this.maxRunning} can run at once.`);
    this.reserved.add(id);
  }
  create(input: { id: unknown; name: unknown; relayId?: unknown }) {
    if (!desktopId(input.id) || typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 64 || /[\u0000-\u001f\u007f]/.test(input.name)
      || (input.relayId !== undefined && (typeof input.relayId !== 'string' || !/^[\w.:-]{1,128}$/.test(input.relayId)))) throw new RequestError(400, 'invalid_desktop', 'Enter a workspace name of 1–64 characters.');
    const id = input.id, name = input.name.trim(), relayId = input.relayId as string | undefined;
    return this.schedule(id, JSON.stringify(['create', name, relayId]), 'creating', async () => {
      const previous = this.records.get(id);
      if (previous) { if (previous.name !== name || previous.relayId !== relayId) throw new RequestError(409, 'desktop_conflict', 'This create request already belongs to another desktop.'); return id; }
      await this.admit(async () => {
        if (this.records.size >= this.maxDesktops) throw new RequestError(409, 'desktop_limit', 'Delete an unused desktop before creating another.');
        await this.capacity(id);
        this.records.set(id, { id, name, relayId, desired: 'running', createdAt: this.now(), updatedAt: this.now() }); this.save();
      });
      await this.perform(id, 'creating', async () => { await this.driver.create(id); await this.driver.start(id); }); return id;
    }, name);
  }
  action(id: string, action: 'start' | 'stop' | 'delete', confirmation?: unknown) {
    this.record(id);
    return this.schedule(id, JSON.stringify([action, confirmation]), action === 'start' ? 'starting' : action === 'stop' ? 'stopping' : 'deleting', async () => {
      const r = this.record(id); await this.refresh(true);
      if (this.inventoryError) throw new RequestError(503, 'desktop_inventory_unavailable', 'Docker inventory is unavailable. Refresh before making changes.');
      if (action === 'delete') {
        if (confirmation !== r.name) throw new RequestError(400, 'desktop_confirmation_required', 'Type the desktop name to permanently delete it and its files.');
        await this.perform(id, 'deleting', async () => { await this.driver.destroy(id); this.records.delete(id); this.save();
          this.credentialStates.delete(id); this.credentialAttempts.delete(id); this.credentialRevisions.delete(id); }); return;
      }
      if (action !== 'start' && action !== 'stop') throw new RequestError(400, 'invalid_desktop_action', 'Unsupported desktop action.');
      if (action === 'start') await this.admit(() => this.capacity(id));
      r.desired = action === 'start' ? 'running' : 'stopped'; r.updatedAt = this.now(); this.save();
      await this.perform(id, action === 'start' ? 'starting' : 'stopping', async () => {
        if (action === 'start') { if (!this.containers.has(id)) await this.driver.create(id); await this.driver.start(id); }
        else if (this.containers.has(id)) await this.driver.stop(id);
      });
    });
  }
  private async perform(id: string, _operation: string, action: () => Promise<void>) {
    try { await action(); const r = this.records.get(id); if (r) { r.error = undefined; r.updatedAt = this.now(); this.save(); } }
    catch { const r = this.records.get(id); if (r) { r.error = 'desktop_operation_failed'; this.save(); } throw new RequestError(503, 'desktop_operation_failed', 'The operation did not finish. Your desktop record is retained. Refresh and retry.'); }
    finally { await this.refreshing; await this.refresh(true); }
  }
  async connection(id: string) {
    this.accepting();
    this.record(id); await this.refresh(true);
    const c = this.containers.get(id);
    if (this.corrupt || this.inventoryError || this.operations.has(id) || !c?.running || !c.healthy) throw new RequestError(409, 'desktop_not_running', 'Wait for the desktop to finish starting.');
    return { containerId: c.containerId };
  }
  async display(id: string, containerId: string) { return this.driver.display(id, containerId); }
  private hasInput(id: string) { return [...this.ioJobs.values()].some(job => job.desktopId === id); }
  private input<T>(id: string, key: string, run: () => Promise<T>): Promise<T> {
    this.accepting(); this.record(id);
    const slot = id + ':' + (key.startsWith('launch-') || key === 'match-credential' || key === 'cancel-signin' ? key : 'clipboard');
    const existing = this.ioJobs.get(slot);
    if (existing) {
      if (existing.key === key) return existing.promise as Promise<T>;
      throw new RequestError(409, 'desktop_busy', 'Another input operation is running in this desktop. Retry shortly.');
    }
    if (this.ioJobs.size >= 4 || this.operations.has(id)) throw new RequestError(429, 'desktop_busy', 'Desktop input is busy. Retry shortly.');
    const promise = (async () => { await this.connection(id); this.accepting(); return run(); })().finally(() => this.ioJobs.delete(slot));
    this.ioJobs.set(slot, { desktopId: id, key, promise }); return promise;
  }
  clipboard(id: string, text?: string) {
    if (text !== undefined && (typeof text !== 'string' || text.length > 65536)) throw new RequestError(400, 'invalid_clipboard', 'Clipboard text is limited to 65,536 characters.');
    return this.input(id, text === undefined ? 'clipboard-read' : 'clipboard-' + createHash('sha256').update(text).digest('hex'), () => this.driver.clipboard(id, text));
  }
  launch(id: string, app: 'terminal' | 'chrome') { return this.input(id, 'launch-' + app, () => this.driver.launch(id, app)); }
  private accepting() { if (this.credentialClosing) throw new RequestError(503, 'desktops_unavailable', 'The controller is restarting. Reconnect shortly.'); }
  signIn(id: string, shardId: unknown, method: 'browser' | 'device' = 'browser'): Promise<void> {
    this.accepting();
    const r = this.record(id);
    if (!['browser', 'device'].includes(method)) throw new RequestError(400, 'invalid_signin', 'Choose a supported sign-in method.');
    if (!r.relayId || shardId !== r.relayId) throw new RequestError(409, 'desktop_link_changed', 'Refresh and review the linked shard.');
    if (!this.refreshCredential || !this.driver.credentials) throw new RequestError(503, 'credential_sync_unavailable', 'Terminal sign-in sync is unavailable on this controller.');
    if (this.corrupt || this.inventoryError || this.operations.has(id) || this.credentialJobs.has(id) || this.active + this.credentialJobs.size >= this.maxOperations) throw new RequestError(409, 'desktop_busy', 'Wait for the current desktop operation to finish.');
    const event = this.beginActivity(id, 'opening_signin'); this.updateActivity(event, 'running');
    const job = (async () => {
      try {
        await this.connection(id);
        this.accepting();
        if (this.records.get(id) !== r) throw new Error('Workspace changed');
        await this.driver.launch(id, method === 'device' ? 'signin-device' : 'signin');
        this.updateActivity(event, 'completed');
      } catch { this.updateActivity(event, 'failed', 'desktop_operation_failed'); throw new RequestError(503, 'desktop_operation_failed', 'Sign-in could not open. Refresh and try again.'); }
    })().finally(() => { this.credentialJobs.delete(id); this.credentialJobKinds.delete(id); this.drain(); });
    this.credentialJobs.set(id, job); this.credentialJobKinds.set(id, 'signin'); return job;
  }
  cancelSignIn(id: string, shardId: unknown) {
    const r = this.record(id);
    if (shardId !== r.relayId) throw new RequestError(409, 'desktop_link_changed', 'Refresh and review the linked shard.');
    return this.input(id, 'cancel-signin', () => this.driver.launch(id, 'signin-cancel'));
  }
  matchSavedCredential(id: string, shardId: unknown): Promise<string> {
    const r = this.record(id);
    if (shardId !== (r.relayId ?? null)) throw new RequestError(409, 'desktop_link_changed', 'Refresh and review the linked shard.');
    if (!this.matchCredential || !this.driver.credentials) throw new RequestError(503, 'credential_sync_unavailable', 'Account matching is unavailable.');
    return this.input(id, 'match-credential', async () => {
      const candidate = parseDesktopCredential(await this.driver.credentials!(id), this.now());
      const matched = await this.matchCredential!(candidate);
      if (this.records.get(id) !== r) throw new RequestError(409, 'desktop_link_changed', 'Refresh and review the linked shard.');
      return matched;
    });
  }
  configureCredentialSync(id: string, shardId: unknown, enabled: unknown) {
    this.accepting();
    const r = this.record(id);
    if (!r.relayId || shardId !== r.relayId) throw new RequestError(409, 'desktop_link_changed', 'Refresh and review the linked shard.');
    if (typeof enabled !== 'boolean') throw new RequestError(400, 'invalid_sync_setting', 'Choose whether to sync terminal sign-ins.');
    if (this.corrupt || this.credentialJobs.has(id) || this.operations.has(id)) throw new RequestError(409, 'desktop_busy', 'Wait for the current desktop operation to finish.');
    this.records.set(id, { ...r, credentialSync: enabled });
    try { this.save(); } catch { this.records.set(id, r); throw new RequestError(503, 'desktop_journal_unavailable', 'The sign-in setting could not be saved.'); }
    this.credentialAttempts.delete(id);
  }
  async pollCredentialSync() {
    if (this.credentialPolling) return this.credentialPolling;
    if (this.credentialClosing || !this.refreshCredential || !this.driver.credentials || this.now() < this.credentialPollAt) return;
    this.credentialPollAt = this.now() + 10000;
    this.credentialPolling = (async () => {
      await this.refresh();
      const targets = [...this.records.values()].filter(r => r.relayId && r.credentialSync !== false && this.containers.get(r.id)?.running);
      let cursor = 0;
      await Promise.all(Array.from({ length: Math.min(this.maxOperations, targets.length) }, async () => {
        while (cursor < targets.length && !this.credentialClosing) {
          const r = targets[cursor++];
          try { await this.syncCredential(r.id, r.relayId, false); } catch { /* Mutations and slot pressure defer this workspace to the next bounded poll. */ }
        }
      }));
    })().finally(() => { this.credentialPolling = undefined; });
    return this.credentialPolling;
  }
  syncCredential(id: string, shardId: unknown, force = true): Promise<void> {
    const r = this.record(id);
    if (!r.relayId || shardId !== r.relayId) throw new RequestError(409, 'desktop_link_changed', 'Refresh and review the linked shard.');
    if (!this.refreshCredential || !this.driver.credentials) throw new RequestError(503, 'credential_sync_unavailable', 'Terminal sign-in sync is unavailable on this controller.');
    const existing = this.credentialJobs.get(id);
    if (existing) {
      if (this.credentialJobKinds.get(id) === 'check') return existing;
      throw new RequestError(409, 'desktop_busy', 'Sign-in is opening. Wait for it to open, then check the saved login.');
    }
    if (this.credentialClosing || this.corrupt || this.inventoryError || this.operations.has(id) || this.active + this.credentialJobs.size >= this.maxOperations) return Promise.reject(new RequestError(409, 'desktop_busy', 'An operation slot is not available yet. Try again shortly.'));
    const current = () => !this.credentialClosing && this.records.get(id) === r && this.containers.get(id)?.running === true;
    const job = (async () => {
      const previous = this.credentialStates.get(id); let event: DesktopActivity | undefined;
      let parsed = false;
      try {
        const candidate = parseDesktopCredential(await this.driver.credentials!(id), this.now());
        parsed = true;
        const attempt = this.credentialAttempts.get(id);
        if (!force && attempt?.fingerprint === candidate.fingerprint && this.now() < attempt.retryAt) return;
        if (!current()) throw new DesktopCredentialError('credential_conflict');
        this.credentialAttempts.set(id, { fingerprint: candidate.fingerprint, retryAt: this.now() + 30000, failures: attempt?.fingerprint === candidate.fingerprint ? attempt.failures : 0 });
        this.credentialStates.set(id, { ...previous, state: 'checking', code: undefined, source: candidate.source });
        if (force || r.syncedFingerprint !== candidate.fingerprint || previous?.state === 'error') { event = this.beginActivity(id, 'refreshing_credentials'); this.updateActivity(event, 'running'); }
        const result = await this.refreshCredential!(r.relayId!, candidate, async () => {
          if (!current()) return false;
          try { const latest = parseDesktopCredential(await this.driver.credentials!(id), this.now()); return current() && latest.fingerprint === candidate.fingerprint; }
          catch { return false; }
        }, r.syncedFingerprint === candidate.fingerprint, {
          expectedRevision: r.credentialIntent?.fingerprint === candidate.fingerprint ? r.credentialIntent.expectedRevision : undefined,
          prepare: expectedRevision => {
            const previousIntent = r.credentialIntent;
            r.credentialIntent = { fingerprint: candidate.fingerprint, expectedRevision };
            try { this.save(); } catch { r.credentialIntent = previousIntent; throw new DesktopCredentialError('credential_checkpoint_unavailable'); }
          },
        });
        if (r.syncedFingerprint !== candidate.fingerprint || r.credentialIntent) {
          const previousFingerprint = r.syncedFingerprint, previousIntent = r.credentialIntent;
          r.syncedFingerprint = candidate.fingerprint; r.credentialIntent = undefined;
          try { this.save(); } catch { r.syncedFingerprint = previousFingerprint; r.credentialIntent = previousIntent; throw new DesktopCredentialError('credential_checkpoint_unavailable'); }
        }
        this.credentialRevisions.set(id, createHash('sha256').update(JSON.stringify([candidate.accessToken, candidate.accountId])).digest('hex'));
        this.credentialAttempts.set(id, { fingerprint: candidate.fingerprint, retryAt: this.now() + 60000 });
        this.credentialStates.set(id, { state: result.outcome, checkedAt: this.now(), source: candidate.source,
          syncedAt: result.outcome === 'updated' ? this.now() : previous?.syncedAt });
        if (event) this.updateActivity(event, 'completed');
      } catch (error) {
        if (!parsed) this.credentialAttempts.delete(id);
        const code = error instanceof DesktopCredentialError ? error.code : 'credential_check_unavailable';
        const attempt = this.credentialAttempts.get(id);
        if (attempt) {
          if (['credential_conflict', 'credential_registry_unavailable', 'credential_check_unavailable', 'credential_checkpoint_unavailable'].includes(code)) {
            attempt.failures = Math.min(5, (attempt.failures ?? 0) + 1);
            attempt.retryAt = this.now() + Math.round(Math.min(300000, 15000 * 2 ** attempt.failures) * (.8 + Math.random() * .4));
          } else attempt.retryAt = Infinity;
        }
        this.credentialStates.set(id, { ...previous, state: code === 'credential_missing' ? 'waiting' : 'error', code, checkedAt: this.now() });
        if (event) this.updateActivity(event, 'failed', code);
        else if (code !== 'credential_missing' && previous?.code !== code) this.updateActivity(this.beginActivity(id, 'refreshing_credentials'), 'failed', code);
      }
    })().finally(() => { this.credentialJobs.delete(id); this.credentialJobKinds.delete(id); this.drain(); });
    this.credentialJobs.set(id, job); this.credentialJobKinds.set(id, 'check'); return job;
  }
  async settle() {
    this.credentialClosing = true;
    await this.credentialPolling;
    await Promise.allSettled(this.credentialJobs.values());
    await Promise.allSettled([...this.ioJobs.values()].map(job => job.promise));
    while (this.operations.size) await Promise.allSettled([...this.operations.values()].map(job => job.promise));
  }
}
