import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { amount, digest, exact, identifier, JobError, parseIntent, parseRequest, policy, requireThat,
  validBrief, WORKFLOW_VERSION, type Artifact, type DraftRequest, type Job, type Lease,
  type Policy, type PublishIntent } from './contracts';
import type { SiteBrief } from '../workflow';

// The application pins @types/node 20. Keep this private adapter's small Node
// SQLite surface explicit instead of altering application dependencies.
type Binding = string | number | null;
interface Statement {
  get(...args: Binding[]): Record<string, unknown> | undefined;
  all(...args: Binding[]): Array<Record<string, unknown>>;
  run(...args: Binding[]): { changes: number | bigint };
}
interface Database { exec(sql: string): void; prepare(sql: string): Statement; close(): void; }
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as {
  DatabaseSync: new (filename: string, options: { allowExtension: boolean }) => Database;
};
const runtimeDatabase = new DatabaseSync(':memory:', { allowExtension: false });
export const SQLITE_VERSION = String(runtimeDatabase.prepare('SELECT sqlite_version() AS version').get()?.version);
runtimeDatabase.close();
export function requireSupportedSQLite(version: string) {
  const parts = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  requireThat(parts, 'sqlite_version_not_qualified');
  const [major, minor, patch] = parts.slice(1).map(Number);
  // SQLite's March 2026 WAL-reset fix: >=3.51.3, or the explicitly
  // documented backports. Passing crash tests cannot qualify an affected build.
  const fixed = major === 3 && (minor > 51 || (minor === 51 && patch >= 3) ||
    version === '3.50.7' || version === '3.44.6');
  requireThat(fixed, 'sqlite_version_not_qualified');
}

/** Local trusted state, never a browser-submitted pathname. Same-UID code is trusted. */
export function privateDirectory(directory: string): string {
  const absolute = path.resolve(directory);
  try { fs.mkdirSync(absolute, { mode: 0o700 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  const stat = fs.lstatSync(absolute);
  requireThat(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0 &&
    (process.getuid === undefined || stat.uid === process.getuid()), 'unsafe_state_directory');
  return fs.realpathSync(absolute);
}
function privateFile(filename: string) {
  try { fs.closeSync(fs.openSync(filename, 'wx', 0o600)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  const stat = fs.lstatSync(filename);
  requireThat(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 &&
    (stat.mode & 0o077) === 0 && (process.getuid === undefined || stat.uid === process.getuid()), 'unsafe_state_file');
}
export interface Account { limit: number; reserved: number; consumed: number; unknown: number; }

/** Single-host, multi-process authority. Transactions include job, event and budget.
 * Owner comes from the trusted local host, not a request body. This is NOT an
 * authentication server or a remote multi-tenant API.
 */
export class JobStore {
  private db: Database;
  private poisoned = false;
  private closed = false;
  private readonly settings: Policy;
  readonly root: string;
  constructor(directory: string, readonly owner: string, settings: Policy,
    private readonly clock: () => number = Date.now) {
    requireSupportedSQLite(SQLITE_VERSION);
    identifier(owner); this.settings = policy(settings);
    this.root = privateDirectory(directory);
    const filename = path.join(this.root, 'workflow.sqlite');
    privateFile(filename);
    for (const suffix of ['-wal', '-shm', '-journal']) {
      if (fs.existsSync(filename + suffix) || (() => { try { fs.lstatSync(filename + suffix); return true; } catch { return false; } })()) privateFile(filename + suffix);
    }
    this.db = new DatabaseSync(filename, { allowExtension: false });
    try {
      this.db.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF;');
      requireThat(this.db.prepare('PRAGMA quick_check').get()?.quick_check === 'ok', 'state_corrupt');
      this.verifyIdentity();
      this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA fullfsync=ON; PRAGMA checkpoint_fullfsync=ON;');
      requireThat(this.db.prepare('PRAGMA journal_mode').get()?.journal_mode === 'wal' &&
        this.db.prepare('PRAGMA synchronous').get()?.synchronous === 2, 'durability_mode_unavailable');
      this.tx(() => {
        this.verifyIdentity();
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS accounts (
            owner TEXT PRIMARY KEY, settings TEXT NOT NULL, ceiling INTEGER NOT NULL,
            reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved >= 0),
            consumed INTEGER NOT NULL DEFAULT 0 CHECK(consumed >= 0),
            unknown_count INTEGER NOT NULL DEFAULT 0 CHECK(unknown_count >= 0)
          ) STRICT;
          CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES accounts(owner),
            request_key TEXT NOT NULL, fingerprint TEXT NOT NULL, data TEXT NOT NULL,
            UNIQUE(owner, request_key)
          ) STRICT;
          CREATE TABLE IF NOT EXISTS events (
            sequence INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id),
            revision INTEGER NOT NULL, kind TEXT NOT NULL, happened_at INTEGER NOT NULL,
            UNIQUE(job_id, revision)
          ) STRICT;
          CREATE TABLE IF NOT EXISTS publication_locks (
            target TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id)
          ) STRICT;
          CREATE TABLE IF NOT EXISTS targets (
            target TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES accounts(owner)
          ) STRICT;
          CREATE TABLE IF NOT EXISTS receipts (
            owner TEXT NOT NULL, receipt TEXT NOT NULL, attempt_id TEXT NOT NULL,
            PRIMARY KEY(owner, receipt)
          ) STRICT;
          PRAGMA user_version=1;
          PRAGMA application_id=1195461720;
        `);
        const existing = this.db.prepare('SELECT settings FROM accounts WHERE owner=?').get(owner);
        const serialized = JSON.stringify(this.settings);
        requireThat(!existing || existing.settings === serialized, 'policy_changed_requires_migration');
        this.db.prepare('INSERT OR IGNORE INTO accounts(owner,settings,ceiling) VALUES(?,?,?)').run(owner, serialized, this.settings.accountLimit);
      });
    } catch (error) { this.db.close(); this.closed = true; throw error; }
  }
  close() { if (!this.closed) { this.db.close(); this.closed = true; } }
  private verifyIdentity() {
    const version = Number(this.db.prepare('PRAGMA user_version').get()?.user_version);
    requireThat(version === 0 || version === 1, 'unsupported_store_version');
    const application = Number(this.db.prepare('PRAGMA application_id').get()?.application_id);
    requireThat(application === 0x47414c58 || (application === 0 && version === 0 &&
      this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().length === 0), 'foreign_state_database');
  }
  private healthy() { requireThat(!this.closed && !this.poisoned, 'store_unavailable'); }
  private now() { const now = this.clock(); amountTime(now); return now; }
  private tx<T>(fn: () => T): T {
    this.healthy();
    try { this.db.exec('BEGIN IMMEDIATE'); }
    catch { throw new JobError('store_busy_or_unavailable'); }
    try {
      const value = fn();
      this.db.exec('COMMIT');
      return value;
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch { this.poisoned = true; }
      if (!(error instanceof JobError)) this.poisoned = true;
      throw error instanceof JobError ? error : new JobError('store_write_failed');
    }
  }
  get(id: string): Job {
    this.healthy(); identifier(id);
    const row = this.db.prepare('SELECT data FROM jobs WHERE id=? AND owner=?').get(id, this.owner);
    requireThat(row, 'job_unavailable');
    const value = JSON.parse(String(row.data)) as Job;
    requireThat(value.schemaVersion === 1 && value.owner === this.owner && value.id === id &&
      value.request.template === WORKFLOW_VERSION, 'unsupported_job_version');
    return value;
  }
  events(id: string) {
    this.get(id);
    return this.db.prepare('SELECT revision,kind FROM events WHERE job_id=? ORDER BY revision').all(id);
  }
  account(): Account {
    this.healthy();
    const row = this.db.prepare('SELECT ceiling,reserved,consumed,unknown_count FROM accounts WHERE owner=?').get(this.owner)!;
    return { limit: Number(row.ceiling), reserved: Number(row.reserved), consumed: Number(row.consumed), unknown: Number(row.unknown_count) };
  }
  create(requestKey: string, input: DraftRequest): Job {
    identifier(requestKey); const request = parseRequest(input);
    const fingerprint = digest(JSON.stringify(request));
    return this.tx(() => {
      const existing = this.db.prepare('SELECT id,fingerprint FROM jobs WHERE owner=? AND request_key=?').get(this.owner, requestKey);
      if (existing) {
        requireThat(existing.fingerprint === fingerprint, 'idempotency_conflict');
        return this.get(String(existing.id));
      }
      const now = this.now();
      const job: Job = { schemaVersion: 1, id: randomUUID(), owner: this.owner, requestKey,
        fingerprint, request, phase: 'queued', revision: 0, fence: 0, lease: null,
        cancellationRequested: false, attempts: [], brief: null, artifact: null, publication: null, target: null,
        createdAt: now, updatedAt: now };
      this.db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?)').run(job.id, this.owner, requestKey, fingerprint, JSON.stringify(job));
      return this.save(job, 'created');
    });
  }
  private save(job: Job, kind: string): Job {
    job.revision++; job.updatedAt = Math.max(job.updatedAt, this.now());
    this.db.prepare('UPDATE jobs SET data=? WHERE id=? AND owner=?').run(JSON.stringify(job), job.id, this.owner);
    this.db.prepare('INSERT INTO events(job_id,revision,kind,happened_at) VALUES(?,?,?,?)').run(job.id, job.revision, kind, job.updatedAt);
    return structuredClone(job);
  }
  /** Trusted connector host calls this only after verifying the real account's
   * ownership. Local binding enforces continuity; it does not authenticate Sites.
   */
  bindTarget(id: string, connectionId: string, projectId: string): Job {
    identifier(connectionId); identifier(projectId);
    return this.tx(() => {
      const job = this.get(id);
      requireThat(['queued', 'generated'].includes(job.phase) && !job.cancellationRequested && !job.lease, 'target_binding_not_permitted');
      requireThat(!job.target || (job.target.connectionId === connectionId && job.target.projectId === projectId), 'target_binding_immutable');
      const target = digest(JSON.stringify(['sites', projectId]));
      const existing = this.db.prepare('SELECT owner FROM targets WHERE target=?').get(target);
      requireThat(!existing || existing.owner === this.owner, 'target_unavailable');
      this.db.prepare('INSERT OR IGNORE INTO targets VALUES(?,?)').run(target, this.owner);
      if (job.target) return job;
      job.target = { connectionId, projectId }; return this.save(job, 'target_bound');
    });
  }
  private active(job: Job, lease: Lease) {
    requireThat(job.lease && lease.fence === job.lease.fence && lease.holder === job.lease.holder &&
      this.now() < job.lease.expiresAt && !job.cancellationRequested, 'lease_lost_or_cancelled');
  }
  acquire(id: string, holder: string): Lease {
    identifier(holder);
    return this.tx(() => {
      const job = this.get(id); const now = this.now();
      requireThat(!['published', 'cancelled', 'failed', 'needs_reconciliation'].includes(job.phase) && !job.cancellationRequested, 'job_not_runnable');
      requireThat(!job.lease || job.lease.expiresAt <= now, 'job_busy');
      requireThat(!['generating', 'publishing'].includes(job.phase), 'recovery_required');
      requireThat(Number.isSafeInteger(job.fence + 1), 'fence_exhausted');
      job.lease = { holder, fence: ++job.fence, expiresAt: now + this.settings.leaseMs };
      this.save(job, 'lease_acquired'); return { ...job.lease };
    });
  }
  renew(id: string, lease: Lease): Lease {
    return this.tx(() => { const job = this.get(id); this.active(job, lease);
      job.lease!.expiresAt = this.now() + this.settings.leaseMs;
      this.save(job, 'lease_renewed'); return { ...job.lease! }; });
  }
  release(id: string, lease: Lease) {
    this.tx(() => { const job = this.get(id); this.active(job, lease);
      requireThat(!['generating', 'publishing'].includes(job.phase), 'operation_inflight');
      job.lease = null; this.save(job, 'lease_released'); });
  }
  beginGeneration(id: string, lease: Lease): string {
    return this.tx(() => {
      const job = this.get(id); this.active(job, lease);
      requireThat(job.phase === 'queued' && job.attempts.length < this.settings.maxCalls, 'generation_not_permitted');
      const account = this.account();
      requireThat(account.unknown === 0, 'usage_reconciliation_required');
      requireThat(account.consumed + account.reserved + this.settings.reservationPerCall <= account.limit, 'budget_exhausted');
      const active = this.db.prepare('SELECT data FROM jobs WHERE owner=?').all(this.owner)
        .map(row => JSON.parse(String(row.data)) as Job)
        .filter(other => other.attempts.some(attempt => attempt.state === 'started')).length;
      requireThat(active < this.settings.maxConcurrentGenerations, 'capacity_exhausted');
      const attempt = { id: randomUUID(), state: 'started' as const, reservation: this.settings.reservationPerCall,
        charge: null, settled: false, receipt: null };
      job.attempts.push(attempt); job.phase = 'generating';
      this.db.prepare('UPDATE accounts SET reserved=reserved+? WHERE owner=?').run(attempt.reservation, this.owner);
      this.save(job, 'generation_dispatched'); return attempt.id;
    });
  }
  private settle(job: Job, attemptId: string, charge: number, receipt: string) {
    amount(charge); identifier(receipt);
    const attempt = job.attempts.find(item => item.id === attemptId);
    requireThat(attempt && !attempt.settled, 'usage_already_settled');
    requireThat(!this.db.prepare('SELECT receipt FROM receipts WHERE owner=? AND receipt=?').get(this.owner, receipt), 'receipt_reused');
    this.db.prepare('INSERT INTO receipts VALUES(?,?,?)').run(this.owner, receipt, attemptId);
    const wasUnknown = attempt.state !== 'started';
    this.db.prepare('UPDATE accounts SET reserved=reserved-?, consumed=consumed+?, unknown_count=unknown_count-? WHERE owner=?')
      .run(attempt.reservation, charge, wasUnknown ? 1 : 0, this.owner);
    attempt.charge = charge; attempt.settled = true; attempt.receipt = receipt;
  }
  completeGeneration(id: string, lease: Lease, attemptId: string, brief: SiteBrief | null,
    cost: { units: number; receipt: string } | null): Job {
    if (cost !== null) exact(cost, ['units', 'receipt']);
    const checked = brief === null ? null : validBrief(brief);
    return this.tx(() => {
      const job = this.get(id); this.active(job, lease);
      const attempt = job.attempts.at(-1);
      requireThat(job.phase === 'generating' && attempt?.id === attemptId && attempt.state === 'started', 'stale_generation');
      if (cost) this.settle(job, attemptId, cost.units, cost.receipt);
      else this.db.prepare('UPDATE accounts SET unknown_count=unknown_count+1 WHERE owner=?').run(this.owner);
      attempt.state = checked ? 'valid' : 'invalid'; job.brief = checked;
      job.phase = checked ? 'generated' : job.attempts.length < this.settings.maxCalls && cost ? 'queued' : 'failed';
      return this.save(job, checked ? 'content_validated' : 'content_rejected');
    });
  }
  generationUnknown(id: string, lease: Lease, attemptId: string): Job {
    return this.tx(() => {
      const job = this.get(id); this.active(job, lease);
      requireThat(job.phase === 'generating' && job.attempts.at(-1)?.id === attemptId, 'stale_generation');
      return this.unknownGeneration(job);
    });
  }
  private unknownGeneration(job: Job): Job {
    const attempt = job.attempts.at(-1)!;
    requireThat(attempt.state === 'started', 'stale_generation');
    attempt.state = 'unknown'; job.phase = 'needs_reconciliation'; job.lease = null;
    this.db.prepare('UPDATE accounts SET unknown_count=unknown_count+1 WHERE owner=?').run(this.owner);
    return this.save(job, 'generation_outcome_unknown');
  }
  reconcileUsage(id: string, attemptId: string, cost: { units: number; receipt: string }): Job {
    return this.tx(() => {
      const job = this.get(id); const attempt = job.attempts.find(item => item.id === attemptId);
      requireThat(attempt && attempt.state !== 'started', 'usage_not_reconcilable');
      if (attempt.settled) {
        requireThat(attempt.charge === cost.units && attempt.receipt === cost.receipt, 'receipt_conflict'); return job;
      }
      this.settle(job, attemptId, cost.units, cost.receipt);
      return this.save(job, 'usage_reconciled');
    });
  }
  resolveGeneration(id: string, attemptId: string, outcome: { kind: 'not_accepted' } | { kind: 'completed'; brief: SiteBrief | null }): Job {
    requireThat(outcome && ['not_accepted', 'completed'].includes(outcome.kind), 'invalid_reconciliation');
    exact(outcome, outcome.kind === 'not_accepted' ? ['kind'] : ['kind', 'brief']);
    return this.tx(() => {
      const job = this.get(id); const attempt = job.attempts.at(-1);
      requireThat(job.phase === 'needs_reconciliation' && attempt?.id === attemptId && attempt.state === 'unknown' && attempt.settled, 'outcome_not_reconcilable');
      if (outcome.kind === 'not_accepted') {
        requireThat(attempt.charge === 0, 'not_accepted_has_charge'); attempt.state = 'not_accepted';
        job.phase = job.attempts.length < this.settings.maxCalls ? 'queued' : 'failed';
      } else {
        job.brief = outcome.brief === null ? null : validBrief(outcome.brief);
        attempt.state = job.brief ? 'valid' : 'invalid'; job.phase = job.brief ? 'generated' : 'failed';
      }
      if (job.cancellationRequested) job.phase = 'cancelled';
      return this.save(job, 'generation_reconciled');
    });
  }
  beginPackaging(id: string, lease: Lease): Job {
    return this.tx(() => { const job = this.get(id); this.active(job, lease);
      requireThat(job.phase === 'generated' && job.brief, 'packaging_not_permitted');
      job.phase = 'packaging'; return this.save(job, 'packaging_started'); });
  }
  completePackaging(id: string, lease: Lease, artifact: Artifact): Job {
    requireThat(/^[a-f0-9]{64}$/.test(artifact.hash) && /^[a-f0-9]{64}$/.test(artifact.htmlHash) &&
      Number.isSafeInteger(artifact.bytes) && artifact.bytes > 0 && artifact.bytes <= 128000 && artifact.template === WORKFLOW_VERSION, 'invalid_artifact');
    return this.tx(() => { const job = this.get(id); this.active(job, lease);
      requireThat(job.phase === 'packaging', 'packaging_not_permitted');
      job.artifact = { hash: artifact.hash, bytes: artifact.bytes, htmlHash: artifact.htmlHash, template: artifact.template };
      job.phase = 'ready'; return this.save(job, 'artifact_verified'); });
  }
  beginPublication(id: string, lease: Lease, input: PublishIntent): PublicationDispatch {
    const intent = parseIntent(input);
    return this.tx(() => {
      const job = this.get(id); this.active(job, lease);
      requireThat(job.phase === 'ready' && job.artifact?.hash === intent.artifactHash && job.publication === null, 'publication_not_permitted');
      requireThat(job.target?.connectionId === intent.connectionId && job.target.projectId === intent.projectId, 'target_binding_mismatch');
      requireThat(job.attempts.every(attempt => attempt.settled) && this.account().consumed <= this.account().limit, 'usage_reconciliation_required');
      const target = digest(JSON.stringify(['sites', intent.projectId]));
      requireThat(this.db.prepare('SELECT owner FROM targets WHERE target=?').get(target)?.owner === this.owner, 'target_unavailable');
      requireThat(!this.db.prepare('SELECT target FROM publication_locks WHERE target=?').get(target), 'publication_target_busy');
      this.db.prepare('INSERT INTO publication_locks VALUES(?,?)').run(target, id);
      job.publication = { id: randomUUID(), intent, intentHash: digest(JSON.stringify(intent)), state: 'started', receipt: null };
      job.phase = 'publishing'; this.save(job, 'publication_dispatched');
      return { operationId: job.publication.id, intent: structuredClone(intent) };
    });
  }
  completePublication(id: string, lease: Lease, operationId: string, receipt: string): Job {
    identifier(receipt);
    return this.tx(() => { const job = this.get(id); this.active(job, lease);
      requireThat(job.phase === 'publishing' && job.publication?.id === operationId && job.publication.state === 'started', 'stale_publication');
      job.publication.state = 'succeeded'; job.publication.receipt = receipt; job.phase = 'published'; job.lease = null;
      this.db.prepare('DELETE FROM publication_locks WHERE job_id=?').run(id);
      return this.save(job, 'publication_verified'); });
  }
  observeDeployment(id: string, operationId: string, deploymentId: string, verifiedUrl?: string): void {
    identifier(deploymentId);
    if (verifiedUrl !== undefined) {
      const url = new URL(verifiedUrl);
      requireThat(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && verifiedUrl.length <= 2048, 'deployment_url_invalid');
    }
    this.tx(() => {
      const job = this.get(id);
      requireThat(job.publication?.id === operationId && ['started', 'unknown'].includes(job.publication.state), 'stale_publication');
      requireThat(!job.publication.deploymentId || job.publication.deploymentId === deploymentId, 'deployment_identity_conflict');
      requireThat(!job.publication.url || !verifiedUrl || job.publication.url === verifiedUrl, 'deployment_identity_conflict');
      if (job.publication.deploymentId && (!verifiedUrl || job.publication.url)) return;
      job.publication.deploymentId = deploymentId;
      if (verifiedUrl) job.publication.url = verifiedUrl;
      this.save(job, 'deployment_observed');
    });
  }
  beginVersionSave(id: string, commitSha: string, transport: 'cli' | 'hosted' = 'cli'): Job {
    requireThat(/^[0-9a-f]{40}$/.test(commitSha), 'invalid_commit');
    requireThat(transport === 'cli' || transport === 'hosted', 'invalid_save_transport');
    return this.tx(() => {
      const job = this.get(id);
      requireThat(job.phase === 'ready' && job.target && job.artifact && !job.cancellationRequested && !job.lease, 'version_save_not_permitted');
      if (job.savedVersion) {
        requireThat(job.savedVersion.commitSha === commitSha && job.savedVersion.artifactHash === job.artifact.hash &&
          (job.savedVersion.transport ?? 'cli') === transport, 'saved_version_mismatch');
        requireThat(job.savedVersion.state === 'saved', 'version_save_needs_reconciliation');
        return job;
      }
      job.savedVersion = { operationId: randomUUID(), commitSha, artifactHash: job.artifact.hash, state: 'started', transport };
      return this.save(job, 'version_save_dispatched');
    });
  }
  recordSavedVersion(id: string, operationId: string, receipt: { id: string; project_id: string; source: { commit_sha: string };
    archive_storage: { content_hash: string; size_bytes: number; archive_format: string } }): Job {
    identifier(receipt.id);
    requireThat(/^sha256:[0-9a-f]{64}$/.test(receipt.archive_storage?.content_hash) && receipt.archive_storage.archive_format === 'tar' &&
      Number.isSafeInteger(receipt.archive_storage.size_bytes) && receipt.archive_storage.size_bytes > 0 && receipt.archive_storage.size_bytes <= 128000, 'saved_version_mismatch');
    return this.tx(() => {
      const job = this.get(id), saved = job.savedVersion;
      requireThat(saved?.operationId === operationId && job.target?.projectId === receipt.project_id &&
        saved.commitSha === receipt.source?.commit_sha && saved.artifactHash === job.artifact?.hash, 'saved_version_mismatch');
      if (saved.state === 'saved') {
        requireThat(saved.versionId === receipt.id && saved.remoteHash === receipt.archive_storage.content_hash &&
          saved.remoteBytes === receipt.archive_storage.size_bytes && saved.archiveFormat === receipt.archive_storage.archive_format, 'saved_version_mismatch');
        return job;
      }
      requireThat(saved.state === 'started' && job.phase === 'ready' && !job.cancellationRequested && !job.lease, 'version_save_not_permitted');
      job.savedVersion = { ...saved, state: 'saved', versionId: receipt.id, remoteHash: receipt.archive_storage.content_hash,
        remoteBytes: receipt.archive_storage.size_bytes, archiveFormat: receipt.archive_storage.archive_format };
      return this.save(job, 'version_save_acknowledged');
    });
  }
  publicationUnknown(id: string, lease: Lease): Job {
    return this.tx(() => { const job = this.get(id); this.active(job, lease);
      requireThat(job.phase === 'publishing' && job.publication?.state === 'started', 'stale_publication');
      job.publication.state = 'unknown'; job.phase = 'needs_reconciliation'; job.lease = null;
      return this.save(job, 'publication_outcome_unknown'); });
  }
  resolvePublication(id: string, operationId: string, outcome: 'succeeded' | 'not_applied', receipt: string): Job {
    requireThat(outcome === 'succeeded' || outcome === 'not_applied', 'invalid_reconciliation');
    identifier(receipt);
    return this.tx(() => { const job = this.get(id);
      requireThat(job.phase === 'needs_reconciliation' && job.publication?.id === operationId && job.publication.state === 'unknown', 'publication_not_reconcilable');
      job.publication.state = outcome; job.publication.receipt = receipt;
      // A verified side effect stays published even if cancellation was requested.
      // Proven non-execution ends this job; a new authorized job may be submitted.
      job.phase = outcome === 'succeeded' ? 'published' : job.cancellationRequested ? 'cancelled' : 'failed';
      this.db.prepare('DELETE FROM publication_locks WHERE job_id=?').run(id);
      return this.save(job, 'publication_reconciled'); });
  }
  cancel(id: string): Job {
    return this.tx(() => { const job = this.get(id);
      if (['published', 'cancelled', 'failed'].includes(job.phase) || job.cancellationRequested) return job;
      job.cancellationRequested = true;
      if (job.phase === 'generating') return this.unknownGeneration(job);
      if (job.phase === 'publishing') { job.publication!.state = 'unknown'; job.phase = 'needs_reconciliation'; }
      else if (job.phase !== 'needs_reconciliation') job.phase = 'cancelled';
      job.lease = null; return this.save(job, 'cancellation_requested'); });
  }
  recover(id: string): Job {
    return this.tx(() => { const job = this.get(id);
      requireThat(!job.lease || job.lease.expiresAt <= this.now(), 'job_busy');
      if (job.phase === 'generating') return this.unknownGeneration(job);
      if (job.phase === 'publishing') {
        job.publication!.state = 'unknown'; job.phase = 'needs_reconciliation';
      } else if (job.phase === 'packaging') job.phase = 'generated';
      else if (!job.lease) return job;
      job.lease = null; return this.save(job, 'recovered'); });
  }
}
function amountTime(value: number) { requireThat(Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER - 300_000, 'invalid_clock'); }
export interface PublicationDispatch { operationId: string; intent: PublishIntent; }
