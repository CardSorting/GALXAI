/** Customer companion commands. Database and relay credentials stay on GALX. */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseBrief } from '../workflow';
import { ArtifactStore } from './artifacts';
import { DEFAULT_POLICY, JobError, parseIntent, parseRequest, policy, publicJob, requireThat } from './contracts';
import { DraftRunner, messages, withDeadline } from './runner';
import { JobStore } from './storage';
import { LiveBillingAdapter } from './live-billing';
import { LiveSitesAdapter, nativeSitesCall } from './live-sites';
import { LiveSiteDomains } from './live-domains';

function jsonFile(filename: string) {
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try { const stat = fs.fstatSync(fd); requireThat(stat.isFile() && stat.nlink === 1 && stat.size <= 8192, 'invalid_input_file');
    return JSON.parse(fs.readFileSync(fd, 'utf8')); } finally { fs.closeSync(fd); }
}
async function main() {
  const [command, directory, id, extra] = process.argv.slice(2);
  requireThat(['check-connection', 'quote', 'create', 'bind', 'connect-domain', 'generate', 'prepare', 'accept-package', 'save-version', 'request-hosted-save', 'accept-hosted-save', 'publish-saved', 'reconcile-billing', 'reconcile-publish', 'status', 'cancel', 'recover'].includes(command), 'invalid_arguments');
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort()); process.once('SIGTERM', () => controller.abort());
  const signal = controller.signal;
  if (command === 'check-connection') {
    const page = await nativeSitesCall('sites.list_sites', { limit: 1, role: 'owner' }, signal);
    console.log(JSON.stringify({ connected: true, owned_site_count_on_page: page.items.length, has_more: Boolean(page.cursor) })); return;
  }
  const billing = () => new LiveBillingAdapter(process.env.GALX_SITES_BILLING_ORIGIN!, process.env.GALX_SITES_SESSION!);
  if (command === 'quote') { console.log(JSON.stringify(await billing().quote(signal))); return; }
  requireThat(directory && id, 'invalid_arguments');
  const settings = policy({ ...DEFAULT_POLICY,
    reservationPerCall: Number(process.env.GALX_SITES_MAX_CHARGE_MICRO_USD),
    accountLimit: Number(process.env.GALX_SITES_ACCOUNT_LIMIT_MICRO_USD) });
  const store = new JobStore(directory, 'local-session', settings);
  const artifacts = new ArtifactStore(path.join(store.root, 'artifacts'));
  const domains = () => new LiveSiteDomains(process.env.GALX_SITES_BILLING_ORIGIN!, process.env.GALX_SITES_SESSION!, process.env.GALX_SITES_USERNAME!);
  const result = async () => {
    const job = store.get(id);
    if (!job.target) return publicJob(job);
    try {
      const domain = await domains().get(job.target.projectId, signal);
      return { ...publicJob(job), domain, ...(job.phase === 'published' && domain.url ? { url: domain.url } : {}) };
    } catch { return { ...publicJob(job), domain: { status: 'unavailable' } }; }
  };
  const sites = () => new LiveSitesAdapter(store, id, process.env.GALX_SITES_CONNECTION_ID!, process.env.GALX_SITES_ACCOUNT_USER_ID!);
  try {
    if (command === 'create') { console.log(JSON.stringify(publicJob(store.create(id, parseRequest(jsonFile(extra)))))); return; }
    if (command === 'status' || command === 'cancel' || command === 'recover') {
      if (command === 'cancel') store.cancel(id); else if (command === 'recover') store.recover(id);
      console.log(JSON.stringify(await result())); return;
    }
    if (command === 'bind') {
      const site = await sites().verifyOwner(extra, signal);
      store.bindTarget(id, process.env.GALX_SITES_CONNECTION_ID!, extra);
      await domains().connect(extra, site.title, () => sites().verifyOwner(extra, signal), signal);
      console.log(JSON.stringify(await result())); return;
    }
    if (command === 'connect-domain') {
      const projectId = store.get(id).target?.projectId; requireThat(projectId, 'site_target_required');
      const site = await sites().verifyOwner(projectId, signal);
      await domains().connect(projectId, site.title, () => sites().verifyOwner(projectId, signal), signal);
      console.log(JSON.stringify(await result())); return;
    }
    if (command === 'generate') {
      const client = billing(), quote = await client.quote(signal);
      requireThat(quote.maximum === settings.reservationPerCall, 'billing_quote_changed');
      const job = store.get(id), lease = store.acquire(id, randomUUID());
      let operation: string | undefined;
      const timer = setInterval(() => { try { store.renew(id, lease); } catch { controller.abort(); } }, 20_000);
      timer.unref();
      try {
        operation = store.beginGeneration(id, lease);
        const reply = await withDeadline(abort => client.generate({ operationId: operation!, requestedModel: job.request.requestedModel,
          messages: messages(job), signal: abort }, quote), signal, 75000);
        let brief = null; try { brief = parseBrief(reply.text); } catch { /* Known failed content still incurs actual usage. */ }
        console.log(JSON.stringify(publicJob(store.completeGeneration(id, lease, operation, brief, reply.cost))));
      } catch {
        if (operation) try { store.generationUnknown(id, lease, operation); } catch { /* Preserve fence. */ }
        throw new JobError('generation_needs_reconciliation');
      } finally { clearInterval(timer); try { store.release(id, lease); } catch { /* Preserve fence. */ } }
      return;
    }
    if (['reconcile-billing', 'save-version', 'request-hosted-save', 'accept-hosted-save', 'publish-saved', 'reconcile-publish'].includes(command)) {
      const client = billing();
      // Verify all charges at the authority, including locally marked settlements.
      for (const attempt of store.get(id).attempts) {
        const reply = await client.reconcile(attempt.id, signal);
        requireThat(reply.cost, 'usage_reconciliation_required');
        store.reconcileUsage(id, attempt.id, reply.cost);
        if (attempt.state === 'unknown') {
          let brief = null; try { brief = parseBrief(reply.text); } catch { /* Record authoritative completion. */ }
          store.resolveGeneration(id, attempt.id, { kind: 'completed', brief });
        }
      }
      if (command === 'reconcile-billing') { console.log(JSON.stringify(publicJob(store.get(id)))); return; }
      const adapter = sites();
      if (command === 'request-hosted-save') {
        console.log(JSON.stringify(await withDeadline(abort => adapter.requestHostedSave(extra, artifacts, abort), signal, 60000))); return;
      }
      if (command === 'accept-hosted-save') {
        const saved = await withDeadline(abort => adapter.acceptHostedSave(jsonFile(extra), artifacts, abort), signal, 60000);
        console.log(JSON.stringify({ ...publicJob(saved), versionId: saved.savedVersion?.versionId })); return;
      }
      if (command === 'save-version') {
        const saved = await withDeadline(abort => adapter.saveVersion(extra, artifacts, abort), signal, 60000);
        console.log(JSON.stringify({ ...publicJob(saved), versionId: saved.savedVersion?.versionId })); return;
      }
      if (command === 'reconcile-publish') {
        await withDeadline(abort => adapter.reconcile(abort), signal, 240000);
        console.log(JSON.stringify(await result())); return;
      }
      const runner = new DraftRunner(store, artifacts, {
        generate: async () => { throw new JobError('use_generate_command'); },
        package: async () => { throw new JobError('use_official_packager'); },
      }, 240000);
      await runner.publishSaved(id, parseIntent(jsonFile(extra)), adapter, signal);
      const projectId = store.get(id).target!.projectId;
      const site = await adapter.verifyOwner(projectId, signal);
      await domains().connect(projectId, site.title, () => adapter.verifyOwner(projectId, signal), signal);
      console.log(JSON.stringify(await result())); return;
    }
    const lease = store.acquire(id, randomUUID());
    try {
      if (command === 'prepare') {
        const job = store.beginPackaging(id, lease);
        console.log(JSON.stringify({ ...publicJob(job), workspace: artifacts.prepareWorkspace(job, path.join(store.root, 'staging')) }));
      } else {
        const fd = fs.openSync(extra, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
        let archive: Buffer;
        try { const stat = fs.fstatSync(fd); requireThat(stat.isFile() && stat.nlink === 1 && stat.size <= 128000, 'invalid_archive'); archive = fs.readFileSync(fd); }
        finally { fs.closeSync(fd); }
        console.log(JSON.stringify(publicJob(store.completePackaging(id, lease, artifacts.put(archive, store.get(id))))));
      }
    } finally { try { store.release(id, lease); } catch { /* Preserve fenced state. */ } }
  } finally { store.close(); }
}
main().catch(error => {
  console.error(JSON.stringify({ error: error instanceof JobError ? error.code : 'workflow_unavailable' })); process.exitCode = 1;
});
