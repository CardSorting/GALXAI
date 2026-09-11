import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ArtifactStore } from './artifacts';
import { DEFAULT_POLICY, type PublishIntent } from './contracts';
import { JobStore } from './storage';
import { DraftRunner } from './runner';
import { LiveSitesAdapter, type SitesCall } from './live-sites';
import { LiveBillingAdapter } from './live-billing';
import { archive, brief, request } from './test-fixtures';

async function setup(t: any, saved = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sites-live-test-'));
  const store = new JobStore(path.join(root, 'state'), 'owner', DEFAULT_POLICY);
  t.after(() => { store.close(); fs.rmSync(root, { force: true, recursive: true }); });
  const artifacts = new ArtifactStore(path.join(root, 'artifacts'));
  const job = store.create('request', request); store.bindTarget(job.id, 'connection', 'project');
  const runner = new DraftRunner(store, artifacts, { generate: async () => ({ text: JSON.stringify(brief), cost: { units: 10, receipt: 'billing-receipt' } }), package: async job => archive(job) });
  await runner.draft(job.id);
  const ready = store.get(job.id);
  const intent: PublishIntent = { connectionId: 'connection', projectId: 'project', versionId: 'project~version', commitSha: 'a'.repeat(40), artifactHash: ready.artifact!.hash, audience: 'owner' };
  const site = { id: 'project', title: 'Test product', status: 'active', current_user_role: 'owner', access_policy: {
    project_id: 'project', access_mode: 'custom', allowed_account_user_ids: ['account'], external_visitor_count: 0,
    allowed_workspace_group_ids: [], allowed_tenant_group_ids: [], allowed_groups: [] } };
  const version = { id: 'project~version', project_id: 'project', source: { commit_sha: intent.commitSha }, archive_storage: { content_hash: 'sha256:'+'c'.repeat(64), archive_format: 'tar', size_bytes: 10240 }, deployment_id: null as string | null };
  if (saved) {
    const saving = store.beginVersionSave(job.id, intent.commitSha);
    store.recordSavedVersion(job.id, saving.savedVersion!.operationId, version);
  }
  const deployment = { id: 'deployment', project_id: 'project', version_id: 'project~version', type: 'publish', status: 'succeeded', url: 'https://site.example/' };
  const calls: string[] = [];
  const call: SitesCall = async tool => { calls.push(tool); return structuredClone(tool === 'sites.get_site' ? site : ['sites.get_site_version', 'sites.save_site_version'].includes(tool) ? version : deployment); };
  return { root, store, artifacts, runner, job, intent, site, version, deployment, calls, call,
    adapter: (rpc: SitesCall = call) => new LiveSitesAdapter(store, job.id, 'connection', 'account', rpc, 0) };
}
test('live Sites adapter verifies account/source/archive, deploys and records terminal receipt', async t => {
  const f = await setup(t);
  assert.equal((await f.runner.publishSaved(f.job.id, f.intent, f.adapter())).status, 'published');
  const result = f.store.get(f.job.id);
  assert.equal(result.publication?.deploymentId, 'deployment'); assert.equal(result.publication?.receipt, 'deployment');
  assert.equal(result.publication?.url, 'https://site.example/');
  assert.equal(f.calls.filter(c => c === 'sites.deploy_private_site_version').length, 1);
  await f.runner.publishSaved(f.job.id, f.intent, f.adapter());
  assert.equal(f.calls.filter(c => c === 'sites.deploy_private_site_version').length, 1);
});
test('shared access, wrong owner and changed artifact fail before any deployment', async t => {
  const f = await setup(t);
  f.site.access_policy.allowed_account_user_ids.push('other');
  await assert.rejects(f.runner.publishSaved(f.job.id, f.intent, f.adapter()), /site_owner_access_required/);
  f.site.access_policy.allowed_account_user_ids = ['account']; f.version.archive_storage.content_hash = 'b'.repeat(64);
  await assert.rejects(f.runner.publishSaved(f.job.id, f.intent, f.adapter()), /saved_version_mismatch/);
  assert(!f.calls.includes('sites.deploy_private_site_version'));
});
test('existing in-progress version is polled without another deployment', async t => {
  const f = await setup(t); f.version.deployment_id = 'deployment';
  let polls = 0;
  const call: SitesCall = async (tool, args, signal) => tool === 'sites.get_deployment_status'
    ? { ...f.deployment, status: polls++ ? 'succeeded' : 'publishing' } : f.call(tool, args, signal);
  await f.runner.publishSaved(f.job.id, f.intent, f.adapter(call));
  assert.equal(polls, 2); assert(!f.calls.includes('sites.deploy_private_site_version'));
});
test('lost deployment reply reconciles by exact saved version without redispatch', async t => {
  const f = await setup(t);
  const call: SitesCall = async (tool, args, signal) => {
    if (tool === 'sites.deploy_private_site_version') { f.version.deployment_id = 'deployment'; throw new Error('lost reply'); }
    return f.call(tool, args, signal);
  };
  await assert.rejects(f.runner.publishSaved(f.job.id, f.intent, f.adapter(call)), /publication_needs_reconciliation/);
  assert.equal(f.store.get(f.job.id).phase, 'needs_reconciliation');
  assert.equal((await f.adapter().reconcile(new AbortController().signal)).phase, 'published');
  assert(!f.calls.includes('sites.deploy_private_site_version'));
});
test('wrong deployment identities and absent outcomes retain the target lock', async t => {
  const f = await setup(t); f.deployment.version_id = 'wrong-version';
  await assert.rejects(f.runner.publishSaved(f.job.id, f.intent, f.adapter()), /publication_needs_reconciliation/);
  await assert.rejects(f.adapter().reconcile(new AbortController().signal), /publication_needs_reconciliation/);
  assert.equal(f.store.get(f.job.id).phase, 'needs_reconciliation');
});
test('billing companion uses authenticated fixed endpoint, never redirects, and verifies receipt binding', async () => {
  const requests: any[] = [];
  const client = new LiveBillingAdapter('https://galx.example', 'session', async (url, init) => {
    requests.push([String(url), init]);
    if (init?.method === 'GET') return Response.json({ currency: 'USD', unit: 'micro_usd', quoteVersion: 'v1', maxChargeMicroUsd: 100 });
    return Response.json({ operationId: 'op', text: JSON.stringify(brief), cost: { units: 10, receipt: 'receipt' } });
  });
  const signal = new AbortController().signal;
  const quote = await client.quote(signal);
  const result = await client.generate({ operationId: 'op', requestedModel: 'private-choice', messages: [{ role: 'user', content: 'brief' }], signal }, quote);
  assert.equal(result.cost?.units, 10);
  assert(requests.every(([url, init]) => url === 'https://galx.example/api/sites/content' && init.redirect === 'error' && init.credentials === 'omit'));
  assert(!requests[1][1].body.includes('private-choice'));
  const wrong = new LiveBillingAdapter('https://galx.example', 'session', async () => Response.json({ operationId: 'another', text: '', cost: null }));
  await assert.rejects(wrong.reconcile('op', signal), /billing_receipt_mismatch/);
  assert.throws(() => new LiveBillingAdapter('http://remote.example', 'session'), /invalid_billing_origin/);
});
test('saving binds normalized remote tar receipt to the validated local gzip and compound version ID', async t => {
  const f = await setup(t, false);
  await assert.rejects(f.runner.publishSaved(f.job.id, f.intent, f.adapter()), /saved_version_receipt_required/);
  const job = await f.adapter().saveVersion(f.intent.commitSha, f.artifacts, new AbortController().signal);
  assert.equal(job.savedVersion?.versionId, 'project~version');
  assert.notEqual(job.savedVersion?.remoteHash, job.artifact?.hash);
  await f.adapter().saveVersion(f.intent.commitSha, f.artifacts, new AbortController().signal);
  assert.equal(f.calls.filter(c => c === 'sites.save_site_version').length, 1);
  assert.equal((await f.runner.publishSaved(f.job.id, f.intent, f.adapter())).status, 'published');
});
test('lost save acknowledgement is journaled and never causes a second upload', async t => {
  const f = await setup(t, false); let uploads = 0;
  const rpc: SitesCall = async (tool, args, signal) => {
    if (tool === 'sites.save_site_version') { uploads++; throw new Error('lost save'); }
    return f.call(tool, args, signal);
  };
  await assert.rejects(f.adapter(rpc).saveVersion(f.intent.commitSha, f.artifacts, new AbortController().signal));
  await assert.rejects(f.adapter(rpc).saveVersion(f.intent.commitSha, f.artifacts, new AbortController().signal), /version_save_needs_reconciliation/);
  assert.equal(uploads, 1); assert.equal(f.store.get(f.job.id).savedVersion?.state, 'started');
});

function hostedReply(f: Awaited<ReturnType<typeof setup>>, operation: { operationId: string; artifactHash: string }) {
  return { schemaVersion: 1, operationId: operation.operationId, artifactHash: operation.artifactHash,
    version: { id: f.version.id, project_id: f.version.project_id, source: f.version.source, archive_storage: f.version.archive_storage } };
}
test('native-host handoff resumes after store restart and publishes once through CLI reads', async t => {
  const f = await setup(t, false), signal = new AbortController().signal;
  const operation = await f.adapter().requestHostedSave(f.intent.commitSha, f.artifacts, signal);
  assert.equal(operation.tool, 'sites.save_site_version'); assert.equal(operation.arguments.project_id, 'project');
  assert.equal(operation.artifactHash, f.store.get(f.job.id).artifact!.hash);
  // Restart the local companion between the host's upload and acknowledgement.
  f.store.close();
  const reopened = new JobStore(path.join(f.root, 'state'), 'owner', DEFAULT_POLICY); t.after(() => reopened.close());
  const adapter = new LiveSitesAdapter(reopened, f.job.id, 'connection', 'account', f.call, 0);
  const receipt = hostedReply(f, operation);
  await adapter.acceptHostedSave(receipt, f.artifacts, signal);
  await adapter.acceptHostedSave(receipt, f.artifacts, signal);
  const runner = new DraftRunner(reopened, f.artifacts, { generate: async () => { throw new Error('no generation'); }, package: async () => { throw new Error('no packaging'); } });
  await runner.publishSaved(f.job.id, f.intent, adapter);
  await runner.publishSaved(f.job.id, f.intent, adapter);
  assert(!f.calls.includes('sites.save_site_version'));
  assert.equal(f.calls.filter(c => c === 'sites.deploy_private_site_version').length, 1);
});
test('unfinished native handoff never falls back to CLI save or emits a second upload request', async t => {
  const f = await setup(t, false), signal = new AbortController().signal;
  await f.adapter().requestHostedSave(f.intent.commitSha, f.artifacts, signal);
  await assert.rejects(f.adapter().requestHostedSave(f.intent.commitSha, f.artifacts, signal), /version_save_needs_reconciliation/);
  await assert.rejects(f.adapter().saveVersion(f.intent.commitSha, f.artifacts, signal), /saved_version_mismatch/);
  assert(!f.calls.includes('sites.save_site_version'));
  assert.equal(f.store.get(f.job.id).savedVersion?.state, 'started');
});
test('hosted receipt identity, remote storage, account and field tampering fail closed', async t => {
  const f = await setup(t, false), signal = new AbortController().signal;
  const op = await f.adapter().requestHostedSave(f.intent.commitSha, f.artifacts, signal), original = hostedReply(f, op);
  for (const mutate of [
    (v: any) => { v.operationId = 'another-operation'; }, (v: any) => { v.artifactHash = 'd'.repeat(64); },
    (v: any) => { v.version.project_id = 'another-project'; }, (v: any) => { v.version.source.commit_sha = 'd'.repeat(40); },
    (v: any) => { v.version.archive_storage.content_hash = 'sha256:'+'d'.repeat(64); },
    (v: any) => { v.version.archive_storage.size_bytes = 1; }, (v: any) => { v.version.url = 'https://evil.example'; },
  ]) {
    const value = structuredClone(original); mutate(value);
    await assert.rejects(f.adapter().acceptHostedSave(value, f.artifacts, signal));
    assert.equal(f.store.get(f.job.id).savedVersion?.state, 'started');
  }
  f.site.access_policy.allowed_account_user_ids.push('other');
  await assert.rejects(f.adapter().acceptHostedSave(original, f.artifacts, signal), /site_owner_access_required/);
  assert(!f.calls.includes('sites.deploy_private_site_version')); assert(!f.calls.includes('sites.save_site_version'));
});
test('cancellation and post-ack conflicting receipts cannot reopen a hosted save', async t => {
  const f = await setup(t, false), signal = new AbortController().signal;
  const op = await f.adapter().requestHostedSave(f.intent.commitSha, f.artifacts, signal), receipt = hostedReply(f, op);
  await f.adapter().acceptHostedSave(receipt, f.artifacts, signal);
  const changed = structuredClone(receipt); changed.version.id = 'other-version'; f.version.id = changed.version.id;
  await assert.rejects(f.adapter().acceptHostedSave(changed, f.artifacts, signal), /saved_version_mismatch/);
  const g = await setup(t, false);
  const pending = await g.adapter().requestHostedSave(g.intent.commitSha, g.artifacts, signal);
  g.store.cancel(g.job.id);
  await assert.rejects(g.adapter().acceptHostedSave(hostedReply(g, pending), g.artifacts, signal), /version_save_not_permitted/);
});

test('hosted acknowledgement is snapshotted before asynchronous authorization', async t => {
  const f = await setup(t, false), signal = new AbortController().signal;
  const op = await f.adapter().requestHostedSave(f.intent.commitSha, f.artifacts, signal), receipt = hostedReply(f, op);
  const call: SitesCall = async (tool, args, abort) => {
    receipt.version.id = 'changed-after-validation';
    return f.call(tool, args, abort);
  };
  const saved = await f.adapter(call).acceptHostedSave(receipt, f.artifacts, signal);
  assert.equal(saved.savedVersion?.versionId, f.version.id);
});
