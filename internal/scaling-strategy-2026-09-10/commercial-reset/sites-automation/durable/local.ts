/** Local-only workflow commands. No publishing command or server listener. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { parseBrief } from '../workflow';
import { executeRelayChat } from '../../../../../src/core/router/adapters/RelayChatTransport';
import { ArtifactStore } from './artifacts';
import { DEFAULT_POLICY, JobError, parseRequest, publicJob, requireThat } from './contracts';
import { JobStore } from './storage';
import { messages, withDeadline } from './runner';

const [command, directory, keyOrId, extra] = process.argv.slice(2);
const allowed = ['create', 'generate-fixture', 'generate-relay', 'prepare', 'accept-package', 'status', 'recover', 'cancel'];
async function main() {
  requireThat(allowed.includes(command) && directory && keyOrId, 'invalid_arguments');
  if (command === 'generate-relay') requireThat(process.env.GALX_SITES_TEST_RELAY === '1', 'designated_test_relay_required');
  const store = new JobStore(directory, 'local-session', DEFAULT_POLICY);
  const artifacts = new ArtifactStore(path.join(store.root, 'artifacts'));
  try {
    if (command === 'create') {
      requireThat(extra, 'request_file_required');
      const stat = fs.lstatSync(extra); requireThat(stat.isFile() && !stat.isSymbolicLink() && stat.size < 4000, 'invalid_request_file');
      console.log(JSON.stringify(publicJob(store.create(keyOrId, parseRequest(JSON.parse(fs.readFileSync(extra, 'utf8')))))));
      return;
    }
    if (command === 'status') { console.log(JSON.stringify(publicJob(store.get(keyOrId)))); return; }
    if (command === 'cancel') { console.log(JSON.stringify(publicJob(store.cancel(keyOrId)))); return; }
    if (command === 'recover') { console.log(JSON.stringify(publicJob(store.recover(keyOrId)))); return; }
    if (command === 'generate-fixture' || command === 'generate-relay') {
      const existing = store.get(keyOrId);
      requireThat(existing.phase === 'queued', 'generation_not_permitted');
      const fixture = command === 'generate-fixture';
      let base: string | undefined; let key: string | undefined;
      if (!fixture) {
        base = process.env.VM_RELAY_URL || process.env.GALXAI_RELAY_URL || process.env.RELAY_URL;
        key = process.env.VM_RELAY_API_KEY || process.env.RELAY_API_KEYS?.split(',')[0]?.trim();
        requireThat(base && key, 'relay_not_configured');
        const url = new URL(base);
        requireThat(!url.username && !url.password && !url.search && !url.hash &&
          (url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))), 'invalid_relay_origin');
      }
      const lease = store.acquire(keyOrId, randomUUID());
      let operationId: string;
      try { operationId = store.beginGeneration(keyOrId, lease); }
      catch (error) { try { store.release(keyOrId, lease); } catch { /* Preserve fenced state. */ } throw error; }
      const abort = new AbortController();
      const cancel = () => { try { store.cancel(keyOrId); } catch { /* Keep cancellation local if storage failed. */ } abort.abort(); };
      process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
      try {
        let content: string;
        if (fixture) {
          // Explicit replay of the previous synthetic brief: no fresh inference.
          content = fs.readFileSync(fileURLToPath(new URL('../artifacts/brief.json', import.meta.url)), 'utf8');
        } else {
          content = await withDeadline(async signal => {
            const result = await executeRelayChat({ url: base!, key, signal,
              taskId: operationId, idempotencyKey: operationId,
              payload: { model: existing.request.requestedModel, stream: false, messages: messages(existing), reasoning_effort: 'low', max_tokens: 700 },
              ttftTimeoutMs: 45000, wallTimeoutMs: 60000, idleTimeoutMs: 20000 });
            const reply = await result.response.json();
            requireThat(typeof reply.choices?.[0]?.message?.content === 'string', 'invalid_relay_response');
            return reply.choices[0].message.content;
          }, abort.signal, 60_000);
        }
        let brief = null;
        try { brief = parseBrief(content); } catch { /* A completed invalid response still has unknown cost. */ }
        // Neither a replayed fixture nor today's relay offers a billing receipt.
        const job = store.completeGeneration(keyOrId, lease, operationId, brief, null);
        store.release(keyOrId, lease);
        console.log(JSON.stringify({ ...publicJob(job), evidenceMode: fixture ? 'recorded_fixture' : 'live_relay', usage: 'unknown' }));
      } catch {
        try { store.generationUnknown(keyOrId, lease, operationId); } catch { /* Preserve uncertain/fenced state. */ }
        throw new JobError('generation_needs_reconciliation');
      } finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
      return;
    }
    const lease = store.acquire(keyOrId, randomUUID());
    try {
      if (command === 'prepare') {
        const job = store.beginPackaging(keyOrId, lease);
        const workspace = artifacts.prepareWorkspace(job, path.join(store.root, 'staging'));
        // Private operator command output; never a public API response.
        console.log(JSON.stringify({ ...publicJob(job), workspace, archiveOutput: path.join(workspace, 'draft.tar.gz') }));
      } else if (command === 'accept-package') {
        requireThat(extra, 'archive_required');
        const fd = fs.openSync(extra, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
        let archive: Buffer;
        try { const stat = fs.fstatSync(fd); requireThat(stat.isFile() && stat.nlink === 1 && stat.size <= 128000, 'invalid_archive'); archive = fs.readFileSync(fd); }
        finally { fs.closeSync(fd); }
        const job = store.get(keyOrId);
        const verified = artifacts.put(archive, job);
        console.log(JSON.stringify(publicJob(store.completePackaging(keyOrId, lease, verified))));
      }
    } finally { try { store.release(keyOrId, lease); } catch { /* Never override an expired lease. */ } }
  } finally { store.close(); }
}
main().catch(error => {
  console.error(JSON.stringify({ error: error instanceof JobError ? error.code : 'local_workflow_failed' }));
  process.exitCode = 1;
});
