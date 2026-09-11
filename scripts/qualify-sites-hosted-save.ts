/** Explicit operator canary: existing owner-private Site, fixed synthetic content,
 * local fixture ledger only. No model request, production wallet or audience edit.
 * Packaging and source push use the official/previously scoped helpers separately. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { ArtifactStore, atomicWrite } from '../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/artifacts';
import { DEFAULT_POLICY, WORKFLOW_VERSION, requireThat } from '../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/contracts';
import { JobStore } from '../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/storage';
import { LiveSitesAdapter, nativeSitesCall } from '../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/live-sites';
import { DraftRunner } from '../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/runner';
import { renderBrief } from '../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/workflow';

function read(filename: string) {
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try { const s = fs.fstatSync(fd); requireThat(s.isFile() && s.nlink === 1 && s.size <= 8192, 'invalid_input');
    return JSON.parse(fs.readFileSync(fd, 'utf8')); } finally { fs.closeSync(fd); }
}
const [flag, command, filename, extra] = process.argv.slice(2);
requireThat(flag === '--live-private-update' && ['prepare', 'request', 'accept', 'publish'].includes(command) && filename, 'explicit_flag_required');
const signal = AbortSignal.timeout(240000);
const brief = { schema_version: 1 as const, title: 'Client delivery review',
  summary: 'Your client deliverable is ready for review.', sections: [
    { heading: 'Review the latest revision', body: 'Confirm the wording and scope before sharing with your client.' },
    { heading: 'Plan your next update', body: 'Keep the next round of changes focused on the agreed deliverable.' }] };
let store: JobStore | undefined;
try {
  if (command === 'prepare') {
    const root = fs.realpathSync(filename), manifest = read(path.join(root, '.openai/hosting.json'));
    // This probe must reuse the already authorized disposable Site, not a customer Site.
    requireThat(manifest.project_id === 'appgprj_6aa38dfbd9ac81919938c46f2a121cef' && manifest.static?.directory === 'dist', 'canary_project_required');
    execFileSync('python3', ['-c', 'import importlib.util, pathlib, sys; p=pathlib.Path(sys.argv[1]); s=importlib.util.spec_from_file_location("push", p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); m.validate(pathlib.Path(sys.argv[2]))',
      path.resolve('internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/push-source.py'), root], { stdio: 'pipe' });
    const site = await nativeSitesCall('sites.get_site', { project_id: manifest.project_id }, signal);
    const account = site.access_policy?.allowed_account_user_ids?.[0];
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-hosted-save-'));
    store = new JobStore(path.join(directory, 'state'), 'operator-fixture', DEFAULT_POLICY);
    const job = store.create(randomUUID(), { schemaVersion: 1, template: WORKFLOW_VERSION,
      brief: 'Synthetic delivery review', requestedModel: 'no-model-execution' });
    const adapter = new LiveSitesAdapter(store, job.id, 'operator-native-host', account);
    await adapter.verifyOwner(manifest.project_id, signal);
    store.bindTarget(job.id, 'operator-native-host', manifest.project_id);
    const lease = store.acquire(job.id, randomUUID()), operation = store.beginGeneration(job.id, lease);
    store.completeGeneration(job.id, lease, operation, brief, { units: 0, receipt: 'operator-fixture-no-inference' });
    store.release(job.id, lease);
    const state = { directory, root, jobId: job.id, account, projectId: manifest.project_id, modelTurns: 0, walletWrites: false };
    atomicWrite(directory, 'canary.json', JSON.stringify(state));
    atomicWrite(path.join(root, 'dist'), 'index.html', renderBrief(brief));
    console.log(JSON.stringify({ checkpoint: path.join(directory, 'canary.json'), sourceReady: true, modelTurns: 0, walletWrites: false }));
  } else {
    const state = read(filename);
    requireThat(state.projectId === 'appgprj_6aa38dfbd9ac81919938c46f2a121cef', 'canary_project_required');
    store = new JobStore(path.join(state.directory, 'state'), 'operator-fixture', DEFAULT_POLICY);
    const artifacts = new ArtifactStore(path.join(state.directory, 'artifacts'));
    const adapter = new LiveSitesAdapter(store, state.jobId, 'operator-native-host', state.account);
    if (command === 'request') {
      const commit = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: state.root, encoding: 'utf8' }).trim();
      requireThat(execFileSync('git', ['status', '--porcelain'], { cwd: state.root, encoding: 'utf8' }).trim() === '', 'source_changed');
      const lease = store.acquire(state.jobId, randomUUID());
      try { const job = store.beginPackaging(state.jobId, lease); store.completePackaging(job.id, lease, artifacts.put(fs.readFileSync(extra), job)); }
      finally { store.release(state.jobId, lease); }
      const request = await adapter.requestHostedSave(commit, artifacts, signal);
      atomicWrite(state.directory, 'request.json', JSON.stringify(request));
      console.log(JSON.stringify({ checkpoint: filename, request }));
    } else if (command === 'accept') {
      const job = await adapter.acceptHostedSave(read(extra), artifacts, signal);
      console.log(JSON.stringify({ accepted: true, versionId: job.savedVersion!.versionId, modelTurns: 0, walletWrites: false }));
    } else {
      const job = store.get(state.jobId), saved = job.savedVersion;
      requireThat(saved?.state === 'saved' && saved.versionId, 'receipt_required');
      const runner = new DraftRunner(store, artifacts, { generate: async () => { throw new Error('forbidden'); }, package: async () => { throw new Error('forbidden'); } }, 240000);
      await runner.publishSaved(job.id, { connectionId: 'operator-native-host', projectId: state.projectId,
        commitSha: saved.commitSha, artifactHash: saved.artifactHash, versionId: saved.versionId, audience: 'owner' }, adapter, signal);
      const final = store.get(job.id);
      const evidence = { checkedAt: new Date().toISOString(), modelTurns: 0, walletWrites: false, syntheticLedger: true,
        projectId: state.projectId, commitSha: saved.commitSha, artifactHash: saved.artifactHash, remoteHash: saved.remoteHash,
        versionId: saved.versionId, deploymentId: final.publication?.deploymentId, url: final.publication?.url,
        phase: final.phase, uploadTransport: 'hosted_native', receiptVerifiedByCli: true, cliPublication: true };
      atomicWrite(path.resolve('internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable'), 'hosted-save-verification.json', JSON.stringify(evidence, null, 2)+'\n');
      console.log(JSON.stringify({ published: final.phase === 'published', url: final.publication?.url, modelTurns: 0, walletWrites: false }));
    }
  }
} finally { store?.close(); }
