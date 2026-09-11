import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { digest, exact, identifier, JobError, parseIntent, requireThat, type Job, type PublishIntent } from './contracts';
import type { PublishAdapter } from './runner';
import { JobStore } from './storage';
import { ArtifactStore } from './artifacts';
import path from 'node:path';

export type SitesTool = 'sites.list_sites' | 'sites.get_site' | 'sites.get_site_version' | 'sites.save_site_version' | 'sites.deploy_private_site_version' | 'sites.get_deployment_status';
export type SitesCall = (tool: SitesTool, args: Record<string, string | number>, signal: AbortSignal) => Promise<Record<string, any>>;

export const nativeSitesCall: SitesCall = (tool, args, signal) => new Promise((resolve, reject) => {
  // No relay, database, model keys, shell startup hooks or NODE_OPTIONS enter Codex.
  const env: NodeJS.ProcessEnv = {};
  for (const name of ['PATH', 'HOME', 'CODEX_HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'GALX_CODEX_BINARY']) {
    if (process.env[name]) env[name] = process.env[name];
  }
  const child = execFile('python3', [fileURLToPath(new URL('./sites-rpc.py', import.meta.url))],
    { env, signal, timeout: 60_000, killSignal: 'SIGTERM', maxBuffer: 65536, encoding: 'utf8' }, (error, stdout) => {
      if (error) { reject(new JobError('sites_connection_failed')); return; }
      try {
        const value = JSON.parse(stdout);
        requireThat(value && typeof value === 'object' && !Array.isArray(value) && !value.error, 'sites_result_invalid');
        resolve(value);
      } catch { reject(new JobError('sites_result_invalid')); }
    });
  child.stdin?.on('error', () => { /* Completion callback handles a closed transport. */ });
  child.stdin?.end(JSON.stringify({ tool, arguments: args }));
});

export class LiveSitesAdapter implements PublishAdapter {
  constructor(private readonly store: JobStore, private readonly jobId: string,
    readonly connectionId: string, private readonly accountUserId: string,
    private readonly call: SitesCall = nativeSitesCall, private readonly pollMs = 1500) {
    identifier(connectionId); identifier(accountUserId);
    requireThat(Number.isSafeInteger(pollMs) && pollMs >= 0 && pollMs <= 5000, 'invalid_deadline');
  }
  async verifyOwner(projectId: string, signal: AbortSignal) {
    identifier(projectId);
    const site = await this.call('sites.get_site', { project_id: projectId }, signal);
    const p = site.access_policy;
    requireThat(site.id === projectId && site.status === 'active' && site.current_user_role === 'owner' &&
      p?.project_id === projectId && p.access_mode === 'custom' &&
      Array.isArray(p.allowed_account_user_ids) && p.allowed_account_user_ids.length === 1 && p.allowed_account_user_ids[0] === this.accountUserId &&
      p.external_visitor_count === 0 && Array.isArray(p.allowed_workspace_group_ids) && p.allowed_workspace_group_ids.length === 0 &&
      Array.isArray(p.allowed_tenant_group_ids) && p.allowed_tenant_group_ids.length === 0 &&
      Array.isArray(p.allowed_groups) && p.allowed_groups.length === 0, 'site_owner_access_required');
    for (const key of ['allowed_users', 'allowed_editors']) {
      if (p[key] !== undefined) requireThat(Array.isArray(p[key]) && p[key].every((u: any) =>
        u && u.account_user_id === this.accountUserId && u.is_external !== true), 'site_owner_access_required');
    }
  }
  private async version(intent: PublishIntent, signal: AbortSignal) {
    const v = await this.call('sites.get_site_version', { project_id: intent.projectId, version_id: intent.versionId }, signal);
    // Sites normalizes uploads. Bind its storage receipt to the exact locally
    // verified upload at save time; a gzip digest is not a remote tar digest.
    const saved = this.store.get(this.jobId).savedVersion;
    requireThat(saved?.state === 'saved' && saved.versionId === intent.versionId && saved.commitSha === intent.commitSha &&
      saved.artifactHash === intent.artifactHash, 'saved_version_receipt_required');
    requireThat(v.id === intent.versionId && v.project_id === intent.projectId && v.source?.commit_sha === intent.commitSha &&
      v.archive_storage?.content_hash === saved.remoteHash && v.archive_storage?.archive_format === saved.archiveFormat &&
      v.archive_storage?.size_bytes === saved.remoteBytes, 'saved_version_mismatch');
    if (v.deployment_id != null) identifier(v.deployment_id);
    return v;
  }
  async saveVersion(commitSha: string, artifacts: ArtifactStore, signal: AbortSignal) {
    const current = this.store.get(this.jobId);
    requireThat(current.target?.connectionId === this.connectionId, 'sites_connection_mismatch');
    await this.verifyOwner(current.target.projectId, signal);
    const archive = artifacts.read(current);
    const job = this.store.beginVersionSave(this.jobId, commitSha);
    if (job.savedVersion!.state === 'saved') return job;
    requireThat(digest(archive) === job.savedVersion!.artifactHash, 'artifact_intent_mismatch');
    const receipt = await this.call('sites.save_site_version', { project_id: current.target.projectId, commit_sha: commitSha,
      archive: path.join(artifacts.root, job.savedVersion!.artifactHash + '.tar.gz') }, signal);
    // A timeout leaves the durable save intent pending. Never blindly upload again.
    return this.store.recordSavedVersion(job.id, job.savedVersion!.operationId, receipt as any);
  }
  /** Local native-host boundary, never an HTTP/model-input API. The host must
   * execute exactly this one call and persist its reply before doing other work.
   * Returning the intent twice could authorize duplicate uploads, so an unfinished
   * handoff only accepts recovery receipts; it never emits another save request. */
  async requestHostedSave(commitSha: string, artifacts: ArtifactStore, signal: AbortSignal) {
    const current = this.store.get(this.jobId);
    requireThat(current.target?.connectionId === this.connectionId, 'sites_connection_mismatch');
    await this.verifyOwner(current.target.projectId, signal);
    artifacts.read(current);
    const job = this.store.beginVersionSave(this.jobId, commitSha, 'hosted');
    const saved = job.savedVersion!;
    requireThat(saved.state === 'started', 'version_already_saved');
    return { schemaVersion: 1 as const, operationId: saved.operationId, artifactHash: saved.artifactHash,
      tool: 'sites.save_site_version' as const, arguments: { project_id: current.target.projectId, commit_sha: commitSha,
        archive: path.join(artifacts.root, saved.artifactHash + '.tar.gz') } };
  }
  async acceptHostedSave(input: unknown, artifacts: ArtifactStore, signal: AbortSignal) {
    // The local host attests which archive it uploaded. The remote normalized tar
    // is not derivable from the local gzip digest; do not pretend hashes match.
    input = structuredClone(input);
    exact(input, ['schemaVersion', 'operationId', 'artifactHash', 'version']);
    requireThat(input.schemaVersion === 1, 'invalid_hosted_receipt');
    identifier(input.operationId);
    const job = this.store.get(this.jobId), saved = job.savedVersion;
    requireThat(job.target?.connectionId === this.connectionId && saved?.transport === 'hosted' &&
      saved.operationId === input.operationId && saved.artifactHash === input.artifactHash, 'hosted_receipt_mismatch');
    artifacts.read(job);
    exact(input.version, ['id', 'project_id', 'source', 'archive_storage']);
    const receipt = input.version;
    identifier(receipt.id);
    exact(receipt.source, ['commit_sha']);
    exact(receipt.archive_storage, ['content_hash', 'size_bytes', 'archive_format']);
    requireThat(receipt.project_id === job.target.projectId && receipt.source.commit_sha === saved.commitSha &&
      typeof receipt.archive_storage.content_hash === 'string' && /^sha256:[a-f0-9]{64}$/.test(receipt.archive_storage.content_hash) &&
      receipt.archive_storage.archive_format === 'tar' && Number.isSafeInteger(receipt.archive_storage.size_bytes) &&
      (receipt.archive_storage.size_bytes as number) > 0 && (receipt.archive_storage.size_bytes as number) <= 128000, 'hosted_receipt_mismatch');
    await this.verifyOwner(job.target.projectId, signal);
    // Independently authenticate the supplied acknowledgement against Sites.
    const remote = await this.call('sites.get_site_version', { project_id: job.target.projectId, version_id: receipt.id }, signal);
    requireThat(remote.id === receipt.id && remote.project_id === receipt.project_id && remote.source?.commit_sha === saved.commitSha &&
      remote.archive_storage?.content_hash === receipt.archive_storage.content_hash &&
      remote.archive_storage?.size_bytes === receipt.archive_storage.size_bytes &&
      remote.archive_storage?.archive_format === receipt.archive_storage.archive_format, 'saved_version_mismatch');
    await this.verifyOwner(job.target.projectId, signal);
    return this.store.recordSavedVersion(job.id, saved.operationId, receipt as any);
  }
  async authorize(job: Job, intent: PublishIntent, signal: AbortSignal) {
    parseIntent(intent);
    requireThat(job.id === this.jobId && job.owner === this.store.owner && intent.connectionId === this.connectionId &&
      job.target?.connectionId === intent.connectionId && job.target.projectId === intent.projectId, 'sites_connection_mismatch');
    await this.verifyOwner(intent.projectId, signal);
    await this.version(intent, signal);
  }
  private async terminal(intent: PublishIntent, operationId: string, initial: Record<string, any>, signal: AbortSignal) {
    let status = initial;
    for (let polls = 0; polls < 20; polls++) {
      requireThat(status.project_id === intent.projectId && status.version_id === intent.versionId && status.type === 'publish', 'deployment_identity_conflict');
      identifier(status.id);
      this.store.observeDeployment(this.jobId, operationId, status.id);
      if (status.status === 'succeeded') {
        // Recheck current access before handing a successful result to the host.
        await this.verifyOwner(intent.projectId, signal);
        requireThat(typeof status.url === 'string', 'deployment_url_missing');
        const url = new URL(status.url);
        requireThat(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash, 'deployment_url_invalid');
        this.store.observeDeployment(this.jobId, operationId, status.id, status.url);
        return { status: 'succeeded' as const, receipt: status.id, intentHash: digest(JSON.stringify(intent)) };
      }
      if (status.status === 'failed') throw new JobError('site_deployment_failed');
      requireThat(['pending', 'building', 'publishing'].includes(status.status), 'deployment_status_invalid');
      await delay(this.pollMs, undefined, { signal });
      status = await this.call('sites.get_deployment_status', { project_id: intent.projectId, deployment_id: status.id }, signal);
    }
    throw new JobError('deployment_pending');
  }
  async deploy(input: { operationId: string; intent: PublishIntent; archive: Buffer; signal: AbortSignal }) {
    const intent = parseIntent(input.intent);
    requireThat(digest(input.archive) === intent.artifactHash && intent.connectionId === this.connectionId, 'artifact_intent_mismatch');
    const job = this.store.get(this.jobId);
    requireThat(job.publication?.id === input.operationId && job.publication.state === 'started' && job.publication.intentHash === digest(JSON.stringify(intent)), 'stale_publication');
    await this.authorize(job, intent, input.signal);
    const v = await this.version(intent, input.signal);
    // A saved version may already be publishing or published. Reuse that attempt.
    const status = v.deployment_id
      ? await this.call('sites.get_deployment_status', { project_id: intent.projectId, deployment_id: v.deployment_id }, input.signal)
      : await this.call('sites.deploy_private_site_version', { project_id: intent.projectId, version_id: intent.versionId }, input.signal);
    return this.terminal(intent, input.operationId, status, input.signal);
  }
  async reconcile(signal: AbortSignal) {
    const job = this.store.get(this.jobId);
    requireThat(job.phase === 'needs_reconciliation' && job.publication?.state === 'unknown', 'publication_not_reconcilable');
    const publication = job.publication;
    await this.authorize(job, publication.intent, signal);
    const v = await this.version(publication.intent, signal);
    const deploymentId = publication.deploymentId || v.deployment_id;
    // An absent deployment is not proof that a timed-out request did not start.
    requireThat(deploymentId, 'publication_needs_reconciliation');
    const status = await this.call('sites.get_deployment_status', { project_id: publication.intent.projectId, deployment_id: deploymentId }, signal);
    const receipt = await this.terminal(publication.intent, publication.id, status, signal);
    return this.store.resolvePublication(job.id, publication.id, 'succeeded', receipt.receipt);
  }
}
