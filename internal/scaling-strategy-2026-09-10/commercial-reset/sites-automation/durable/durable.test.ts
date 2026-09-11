import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { gunzipSync, gzipSync } from 'node:zlib';
import { ArtifactStore } from './artifacts';
import { DEFAULT_POLICY, digest, JobError, parseRequest, publicJob, type Job, type Policy, type PublishIntent } from './contracts';
import { DraftRunner, type DraftAdapters, type PublishAdapter } from './runner';
import { JobStore, requireSupportedSQLite } from './storage';
import { archive, brief, entries, paxEntry, request, tar } from './test-fixtures';

const run = promisify(execFile);
const child = fileURLToPath(new URL('./crash-fixture.ts', import.meta.url));
function fixture(t: { after(fn: () => void): void }, settings: Policy = DEFAULT_POLICY) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-durable-test-'));
  const state = path.join(directory, 'state');
  const stores: JobStore[] = [];
  let now = Date.now();
  const open = (owner = 'owner-a') => { const store = new JobStore(state, owner, settings, () => now); stores.push(store); return store; };
  const store = open();
  const artifacts = new ArtifactStore(path.join(directory, 'artifacts'));
  t.after(() => { for (const item of stores) item.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  return { directory, state, store, artifacts, open, advance: (ms: number) => { now += ms; } };
}
function generated(store: JobStore, key = 'request-1', target = false) {
  let job = store.create(key, request);
  if (target) job = store.bindTarget(job.id, 'connection-a', 'project-a');
  const lease = store.acquire(job.id, 'worker-a');
  const attempt = store.beginGeneration(job.id, lease);
  job = store.completeGeneration(job.id, lease, attempt, brief, { units: 10, receipt: `cost-${key}` });
  return { job, lease, attempt };
}
function ready(store: JobStore, artifacts: ArtifactStore, key = 'request-1', target = true) {
  const state = generated(store, key, target);
  store.beginPackaging(state.job.id, state.lease);
  const artifact = artifacts.put(archive(state.job), state.job);
  const job = store.completePackaging(state.job.id, state.lease, artifact);
  return { ...state, job };
}
function intent(job: Job): PublishIntent {
  return { connectionId: 'connection-a', projectId: 'project-a', commitSha: 'a'.repeat(40),
    versionId: 'version-a', audience: 'owner', artifactHash: job.artifact!.hash };
}
function adapters(overrides: Partial<DraftAdapters> = {}): DraftAdapters {
  return { generate: async input => ({ text: JSON.stringify(brief), cost: { units: 10, receipt: input.operationId } }),
    package: async job => archive(job), ...overrides };
}
const code = (expected: string) => (error: unknown) => error instanceof JobError && error.code === expected;

test('request identity persists and changed intent conflicts', t => {
  const f = fixture(t); const job = f.store.create('same-key', request);
  f.store.close(); const reopened = f.open();
  assert.equal(reopened.create('same-key', request).id, job.id);
  assert.throws(() => reopened.create('same-key', { ...request, brief: 'Different brief' }), code('idempotency_conflict'));
  assert.throws(() => reopened.create('same-key', { ...request, requestedModel: 'another' }), code('idempotency_conflict'));
  assert.equal(reopened.events(job.id).length, 1);
});
test('owner checks isolate reads, cancellation, events and reconciliation', t => {
  const f = fixture(t); const job = f.store.create('same-key', request); const other = f.open('owner-b');
  assert.notEqual(other.create('same-key', request).id, job.id);
  for (const call of [() => other.get(job.id), () => other.cancel(job.id), () => other.events(job.id),
    () => other.recover(job.id), () => other.reconcileUsage(job.id, 'attempt', { units: 0, receipt: 'receipt' })]) {
    assert.throws(call, code('job_unavailable'));
  }
});
test('durable generation intent atomically reserves budget and prevents replay', t => {
  const f = fixture(t); const job = f.store.create('request', request);
  const lease = f.store.acquire(job.id, 'worker'); f.store.beginGeneration(job.id, lease);
  f.store.close(); const reopened = f.open();
  assert.equal(reopened.account().reserved, 1000);
  assert.equal(reopened.get(job.id).attempts.length, 1);
  assert.throws(() => reopened.beginGeneration(job.id, lease), code('generation_not_permitted'));
  assert.equal(reopened.events(job.id).at(-1)?.kind, 'generation_dispatched');
});
for (const mode of ['before-dispatch', 'after-dispatch']) test(`SIGKILL ${mode} recovers uncertainty and never replays`, t => {
  const f = fixture(t); const job = f.store.create('crash', request); f.store.close();
  const result = spawnSync(process.execPath, ['--import', 'tsx', child, f.state, job.id, mode], { encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.signal, 'SIGKILL');
  const reopened = f.open(); const recovered = reopened.recover(job.id);
  assert.equal(recovered.phase, 'needs_reconciliation');
  assert.equal(reopened.account().reserved, 1000); assert.equal(reopened.account().unknown, 1);
  reopened.recover(job.id); assert.equal(reopened.account().unknown, 1);
  assert.throws(() => reopened.acquire(job.id, 'restart'), code('job_not_runnable'));
  assert.equal(fs.existsSync(path.join(f.state, 'external-effect.fixture')), mode === 'after-dispatch');
});
test('separate OS processes cannot dispatch the same job twice', async t => {
  const f = fixture(t); const job = f.store.create('contend', request); f.store.close();
  const results = await Promise.all([1, 2].map(() => run(process.execPath,
    ['--import', 'tsx', child, f.state, job.id, 'contend'], { timeout: 10_000, maxBuffer: 10000 })));
  assert.deepEqual(results.map(result => result.stdout.trim()).sort(), ['acquired', 'blocked']);
  assert.equal(f.open().get(job.id).attempts.length, 1);
});
test('a failed event write rolls back job and reservation together and poisons the handle', t => {
  const f = fixture(t); const job = f.store.create('rollback', request); const lease = f.store.acquire(job.id, 'worker');
  const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
  const fault = new DatabaseSync(path.join(f.state, 'workflow.sqlite'));
  fault.exec("CREATE TRIGGER fail_generation BEFORE INSERT ON events WHEN NEW.kind='generation_dispatched' BEGIN SELECT RAISE(ABORT,'fault'); END;");
  assert.throws(() => f.store.beginGeneration(job.id, lease), code('store_write_failed'));
  assert.throws(() => f.store.get(job.id), code('store_unavailable'));
  fault.exec('DROP TRIGGER fail_generation'); fault.close(); f.store.close();
  const reopened = f.open();
  assert.equal(reopened.get(job.id).phase, 'queued'); assert.equal(reopened.get(job.id).attempts.length, 0);
  assert.equal(reopened.account().reserved, 0);
});
test('stale workers cannot commit after a new fenced lease is issued', t => {
  const f = fixture(t); const state = generated(f.store);
  f.advance(DEFAULT_POLICY.leaseMs + 1);
  const next = f.store.acquire(state.job.id, 'worker-b'); assert(next.fence > state.lease.fence);
  assert.throws(() => f.store.beginPackaging(state.job.id, state.lease), code('lease_lost_or_cancelled'));
  f.store.beginPackaging(state.job.id, next);
});
test('account reservation and concurrency are enforced across job handles', t => {
  const f = fixture(t); const a = f.store.create('a', request); const b = f.store.create('b', request);
  const first = f.store.acquire(a.id, 'one'); const second = f.open(); const next = second.acquire(b.id, 'two');
  f.store.beginGeneration(a.id, first);
  assert.throws(() => second.beginGeneration(b.id, next), code('capacity_exhausted'));
  assert.equal(second.account().reserved, 1000);
});
test('unknown usage retains the reservation and blocks further model admission', t => {
  const f = fixture(t); const job = f.store.create('a', request); const lease = f.store.acquire(job.id, 'worker');
  const attempt = f.store.beginGeneration(job.id, lease);
  f.store.completeGeneration(job.id, lease, attempt, brief, null);
  assert.deepEqual(f.store.account(), { limit: 2000, reserved: 1000, consumed: 0, unknown: 1 });
  const second = f.store.create('b', request); const next = f.store.acquire(second.id, 'other');
  assert.throws(() => f.store.beginGeneration(second.id, next), code('usage_reconciliation_required'));
  f.store.reconcileUsage(job.id, attempt, { units: 20, receipt: 'trusted-receipt' });
  f.store.reconcileUsage(job.id, attempt, { units: 20, receipt: 'trusted-receipt' });
  assert.equal(f.store.account().consumed, 20); assert.equal(f.store.account().reserved, 0);
  assert.throws(() => f.store.reconcileUsage(job.id, attempt, { units: 0, receipt: 'trusted-receipt' }), code('receipt_conflict'));
});
test('a billing receipt cannot settle two different operations', t => {
  const f = fixture(t); generated(f.store, 'a');
  const job = f.store.create('b', request); const lease = f.store.acquire(job.id, 'worker');
  const attempt = f.store.beginGeneration(job.id, lease);
  assert.throws(() => f.store.completeGeneration(job.id, lease, attempt, brief, { units: 10, receipt: 'cost-a' }), code('receipt_reused'));
  assert.equal(f.store.get(job.id).phase, 'generating'); assert.equal(f.store.account().reserved, 1000);
});
test('an actual cost above the reservation is recorded and closes new admission', t => {
  const f = fixture(t); const job = f.store.create('a', request); const lease = f.store.acquire(job.id, 'worker');
  const attempt = f.store.beginGeneration(job.id, lease);
  f.store.completeGeneration(job.id, lease, attempt, brief, { units: 2500, receipt: 'overrun' });
  assert.equal(f.store.account().consumed, 2500);
  const second = f.store.create('b', request); const next = f.store.acquire(second.id, 'other');
  assert.throws(() => f.store.beginGeneration(second.id, next), code('budget_exhausted'));
});
test('uncertain generation requires both cost and outcome evidence to resume', t => {
  const f = fixture(t); const job = f.store.create('a', request); const lease = f.store.acquire(job.id, 'worker');
  const attempt = f.store.beginGeneration(job.id, lease); f.store.generationUnknown(job.id, lease, attempt);
  assert.throws(() => f.store.resolveGeneration(job.id, attempt, { kind: 'not_accepted' }), code('outcome_not_reconcilable'));
  f.store.reconcileUsage(job.id, attempt, { units: 0, receipt: 'not-admitted' });
  assert.equal(f.store.resolveGeneration(job.id, attempt, { kind: 'not_accepted' }).phase, 'queued');
  assert.equal(f.store.get(job.id).attempts.length, 1);
});
test('failed local packaging resumes from persisted content without another model call', async t => {
  const f = fixture(t); const job = f.store.create('a', request); let models = 0; let packages = 0;
  const runner = new DraftRunner(f.store, f.artifacts, adapters({ generate: async input => { models++;
    return { text: JSON.stringify(brief), cost: { units: 10, receipt: input.operationId } }; },
    package: async job => { if (++packages === 1) throw new Error('disk unavailable'); return archive(job); } }));
  await assert.rejects(runner.draft(job.id));
  assert.equal(f.store.get(job.id).phase, 'packaging');
  f.store.close(); const reopened = f.open();
  const next = new DraftRunner(reopened, f.artifacts, adapters({ generate: async () => { throw new Error('must not repeat'); } }));
  assert.equal((await next.draft(job.id)).status, 'ready'); assert.equal(models, 1);
  assert.equal((await next.draft(job.id)).status, 'ready'); assert.equal(reopened.get(job.id).attempts.length, 1);
});
test('completed malformed content gets at most one repair, without echoing the bad output', async t => {
  const f = fixture(t); const job = f.store.create('a', request); let calls = 0;
  const runner = new DraftRunner(f.store, f.artifacts, adapters({ generate: async input => {
    calls++; assert(!JSON.stringify(input.messages).includes('MALICIOUS_RESPONSE'));
    return { text: calls === 1 ? 'MALICIOUS_RESPONSE' : JSON.stringify(brief), cost: { units: 10, receipt: input.operationId } };
  } }));
  assert.equal((await runner.draft(job.id)).status, 'ready'); assert.equal(calls, 2);
  assert.equal(f.store.account().consumed, 20);
});
test('repeated malformed output fails with bounded cost and no archive', async t => {
  const f = fixture(t); const job = f.store.create('a', request); let calls = 0;
  const runner = new DraftRunner(f.store, f.artifacts, adapters({ generate: async input => { calls++;
    return { text: 'invalid', cost: { units: 10, receipt: input.operationId } }; } }));
  assert.equal((await runner.draft(job.id)).status, 'failed'); assert.equal(calls, 2);
  assert.equal(f.store.get(job.id).artifact, null);
});
test('transport failures are sanitized, held for reconciliation and never retried', async t => {
  const f = fixture(t); const job = f.store.create('a', request); let calls = 0;
  const runner = new DraftRunner(f.store, f.artifacts, adapters({ generate: async () => { calls++; throw new Error('SECRET upstream-host credential'); } }));
  await assert.rejects(runner.draft(job.id), code('generation_needs_reconciliation'));
  await assert.rejects(runner.draft(job.id), code('job_not_runnable'));
  assert.equal(calls, 1); assert.equal(f.store.account().reserved, 1000);
  assert(!JSON.stringify(f.store.events(job.id)).includes('SECRET'));
});
test('missing costs do not prevent a local artifact but do prevent publication', async t => {
  const f = fixture(t); const job = f.store.create('a', request); f.store.bindTarget(job.id, 'connection-a', 'project-a');
  const runner = new DraftRunner(f.store, f.artifacts, adapters({ generate: async () => ({ text: JSON.stringify(brief), cost: null }) }));
  assert.equal((await runner.draft(job.id)).status, 'ready');
  const lease = f.store.acquire(job.id, 'publisher');
  assert.throws(() => f.store.beginPublication(job.id, lease, intent(f.store.get(job.id))), code('usage_reconciliation_required'));
});
test('a pre-cancelled job makes no model call', async t => {
  const f = fixture(t); const job = f.store.create('a', request); const controller = new AbortController(); controller.abort(); let calls = 0;
  const runner = new DraftRunner(f.store, f.artifacts, adapters({ generate: async () => { calls++; throw new Error(); } }));
  await assert.rejects(runner.draft(job.id, controller.signal), code('operation_interrupted'));
  assert.equal(calls, 0); assert.equal(f.store.get(job.id).phase, 'cancelled');
});
test('cancellation of an adapter that ignores abort remains uncertain, including its cost', async t => {
  const f = fixture(t); const job = f.store.create('a', request); const controller = new AbortController();
  const runner = new DraftRunner(f.store, f.artifacts, adapters({ generate: async () => {
    setTimeout(() => controller.abort(), 5); return new Promise(() => {});
  } }));
  await assert.rejects(runner.draft(job.id, controller.signal), code('generation_needs_reconciliation'));
  assert.equal(f.store.get(job.id).phase, 'needs_reconciliation'); assert.equal(f.store.get(job.id).brief, null);
  assert.equal(f.store.account().reserved, 1000);
});
test('wall deadline returns even when the adapter never resolves', async t => {
  const f = fixture(t); const job = f.store.create('a', request);
  const runner = new DraftRunner(f.store, f.artifacts, adapters({ generate: async () => new Promise(() => {}) }), 15);
  await assert.rejects(runner.draft(job.id), code('generation_needs_reconciliation'));
  assert.equal(f.store.get(job.id).phase, 'needs_reconciliation');
});
test('publication is tied to the bound account, project, artifact and owner-only audience', t => {
  const f = fixture(t); const state = ready(f.store, f.artifacts);
  assert.throws(() => f.store.beginPublication(state.job.id, state.lease, { ...intent(state.job), projectId: 'project-b' }), code('target_binding_mismatch'));
  assert.throws(() => f.store.beginPublication(state.job.id, state.lease, { ...intent(state.job), artifactHash: 'b'.repeat(64) }), code('publication_not_permitted'));
  assert.throws(() => f.store.beginPublication(state.job.id, state.lease, { ...intent(state.job), audience: 'public' } as any), code('unsupported_audience'));
  assert.throws(() => f.store.bindTarget(state.job.id, 'connection-a', 'project-b'), code('target_binding_not_permitted'));
});
test('a different local owner cannot claim an already bound Sites target', t => {
  const f = fixture(t); const job = f.store.create('a', request); f.store.bindTarget(job.id, 'connection-a', 'project-a');
  const other = f.open('owner-b'); const otherJob = other.create('b', request);
  assert.throws(() => other.bindTarget(otherJob.id, 'connection-a', 'project-a'), code('target_unavailable'));
});
test('an unbound local artifact cannot enter publication', t => {
  const f = fixture(t); const state = ready(f.store, f.artifacts, 'a', false);
  assert.throws(() => f.store.beginPublication(state.job.id, state.lease, intent(state.job)), code('target_binding_mismatch'));
});
test('ambiguous publication locks its target across jobs until an evidenced outcome', t => {
  const f = fixture(t); const first = ready(f.store, f.artifacts, 'a');
  const dispatch = f.store.beginPublication(first.job.id, first.lease, intent(first.job));
  f.store.publicationUnknown(first.job.id, first.lease);
  const second = ready(f.store, f.artifacts, 'b');
  assert.throws(() => f.store.beginPublication(second.job.id, second.lease, intent(second.job)), code('publication_target_busy'));
  assert.throws(() => f.store.resolvePublication(first.job.id, 'wrong-operation', 'not_applied', 'receipt'), code('publication_not_reconcilable'));
  f.store.resolvePublication(first.job.id, dispatch.operationId, 'not_applied', 'verified-absent');
  assert(f.store.beginPublication(second.job.id, second.lease, intent(second.job)).operationId);
});
test('a different connection alias cannot bypass serialization for the same Site', t => {
  const f = fixture(t); const first = ready(f.store, f.artifacts, 'a');
  f.store.beginPublication(first.job.id, first.lease, intent(first.job));
  const next = f.store.create('b', request); f.store.bindTarget(next.id, 'connection-alias', 'project-a');
  const lease = f.store.acquire(next.id, 'worker-b'); const operation = f.store.beginGeneration(next.id, lease);
  let job = f.store.completeGeneration(next.id, lease, operation, brief, { units: 10, receipt: 'b-cost' });
  f.store.beginPackaging(next.id, lease); job = f.store.completePackaging(next.id, lease, f.artifacts.put(archive(job), job));
  assert.throws(() => f.store.beginPublication(job.id, lease, { ...intent(job), connectionId: 'connection-alias' }), code('publication_target_busy'));
});
test('invalid reconciliation outcomes cannot release an uncertain publication lock', t => {
  const f = fixture(t); const state = ready(f.store, f.artifacts);
  const dispatch = f.store.beginPublication(state.job.id, state.lease, intent(state.job));
  f.store.publicationUnknown(state.job.id, state.lease);
  assert.throws(() => f.store.resolvePublication(state.job.id, dispatch.operationId, 'probably-failed' as any, 'receipt'), code('invalid_reconciliation'));
  assert.equal(f.store.get(state.job.id).phase, 'needs_reconciliation');
});
test('cancellation after a remote effect cannot relabel that effect as absent', t => {
  const f = fixture(t); const state = ready(f.store, f.artifacts);
  const dispatch = f.store.beginPublication(state.job.id, state.lease, intent(state.job));
  f.store.cancel(state.job.id);
  assert.equal(f.store.get(state.job.id).phase, 'needs_reconciliation');
  assert.equal(f.store.resolvePublication(state.job.id, dispatch.operationId, 'succeeded', 'verified-deployment').phase, 'published');
});
test('publication completion requires a matching verified receipt and cannot replay', async t => {
  const f = fixture(t); const state = ready(f.store, f.artifacts); f.store.release(state.job.id, state.lease);
  let deployed = 0;
  const adapter: PublishAdapter = { authorize: async () => {}, deploy: async input => {
    deployed++; return { status: 'succeeded', receipt: 'deployment-a', intentHash: digest(JSON.stringify(input.intent)) }; } };
  const runner = new DraftRunner(f.store, f.artifacts, adapters());
  assert.equal((await runner.publishSaved(state.job.id, intent(state.job), adapter)).status, 'published');
  assert.equal((await runner.publishSaved(state.job.id, intent(state.job), adapter)).status, 'published');
  await assert.rejects(runner.publishSaved(state.job.id, { ...intent(state.job), versionId: 'different-version' }, adapter), code('publication_intent_conflict'));
  assert.equal(deployed, 1);
});
test('untrusted publication output cannot mark a job published', async t => {
  const f = fixture(t); const state = ready(f.store, f.artifacts); f.store.release(state.job.id, state.lease);
  const runner = new DraftRunner(f.store, f.artifacts, adapters());
  await assert.rejects(runner.publishSaved(state.job.id, intent(state.job), {
    authorize: async () => {}, deploy: async () => ({ status: 'succeeded', receipt: 'deployment-a', intentHash: 'wrong' }),
  }), code('publication_needs_reconciliation'));
  assert.equal(f.store.get(state.job.id).phase, 'needs_reconciliation');
});
test('mutating caller-owned intent during authorization cannot change the dispatched release', async t => {
  const f = fixture(t); const state = ready(f.store, f.artifacts); f.store.release(state.job.id, state.lease);
  const proposed = intent(state.job); const originalCommit = proposed.commitSha;
  const runner = new DraftRunner(f.store, f.artifacts, adapters());
  await runner.publishSaved(state.job.id, proposed, {
    authorize: async () => { proposed.commitSha = 'b'.repeat(40); proposed.versionId = 'unapproved-version'; },
    deploy: async input => {
      assert.equal(input.intent.commitSha, originalCommit); assert.equal(input.intent.versionId, 'version-a');
      return { status: 'succeeded', receipt: 'immutable-release', intentHash: digest(JSON.stringify(input.intent)) };
    },
  });
  assert.equal(f.store.get(state.job.id).publication!.intent.commitSha, originalCommit);
});
test('publication deadline preserves a target lock when the adapter ignores cancellation', async t => {
  const f = fixture(t); const state = ready(f.store, f.artifacts); f.store.release(state.job.id, state.lease);
  const runner = new DraftRunner(f.store, f.artifacts, adapters(), 15);
  await assert.rejects(runner.publishSaved(state.job.id, intent(state.job), {
    authorize: async () => {}, deploy: async () => new Promise(() => {}),
  }), code('publication_needs_reconciliation'));
  const second = ready(f.store, f.artifacts, 'second');
  assert.throws(() => f.store.beginPublication(second.job.id, second.lease, intent(second.job)), code('publication_target_busy'));
});
test('authorization refusal dispatches no publishing action', async t => {
  const f = fixture(t); const state = ready(f.store, f.artifacts); f.store.release(state.job.id, state.lease); let calls = 0;
  const runner = new DraftRunner(f.store, f.artifacts, adapters());
  await assert.rejects(runner.publishSaved(state.job.id, intent(state.job), {
    authorize: async () => { throw new JobError('connection_revoked'); }, deploy: async () => { calls++; throw new Error(); },
  }), code('connection_revoked'));
  assert.equal(calls, 0); assert.equal(f.store.get(state.job.id).phase, 'ready');
});
test('artifact verification detects tampering before any publishing call', async t => {
  const f = fixture(t); const state = ready(f.store, f.artifacts); f.store.release(state.job.id, state.lease);
  fs.writeFileSync(path.join(f.artifacts.root, state.job.artifact!.hash + '.tar.gz'), 'tampered');
  let calls = 0; const runner = new DraftRunner(f.store, f.artifacts, adapters());
  await assert.rejects(runner.publishSaved(state.job.id, intent(state.job), {
    authorize: async () => { calls++; }, deploy: async () => { throw new Error(); },
  }), code('artifact_verification_failed'));
  assert.equal(calls, 0);
});
test('canonical archive passes and malicious members, duplicates, links and manifests fail', t => {
  const f = fixture(t); const { job } = generated(f.store);
  const original = entries(job);
  assert.equal(f.artifacts.check(archive(job), job).htmlHash.length, 64);
  const attacks = [
    [...original, { name: '../escape', body: 'leak' }],
    [...original, original[1]],
    original.map(entry => entry.name === 'dist/index.html' ? { name: entry.name, type: '2', link: '/etc/passwd' } : entry),
    original.map(entry => entry.name === 'dist/index.html' ? { name: entry.name, type: '1', link: 'private' } : entry),
    original.map(entry => entry.name === 'dist/index.html' ? { ...entry, body: '<script>bad()</script>' } : entry),
    original.map(entry => entry.name.endsWith('hosting.json') ? { ...entry, body: '{"static":{"directory":"dist"},"secret":"bad"}' } : entry),
    [...original, { name: 'dist/._index.html', body: 'metadata' }],
  ];
  for (const attack of attacks) assert.throws(() => f.artifacts.check(tar(attack), job), code('artifact_verification_failed'));
  assert.throws(() => f.artifacts.check(gzipSync(Buffer.alloc(128001)), job), code('artifact_verification_failed'));
  const hidden = gzipSync(Buffer.concat([gunzipSync(archive(job)), Buffer.from('hidden trailing payload')]));
  assert.throws(() => f.artifacts.check(hidden, job), code('artifact_verification_failed'));
});
test('cancellation while packaging cannot expose the completed local archive as ready', async t => {
  const f = fixture(t); const job = f.store.create('a', request); const controller = new AbortController();
  const runner = new DraftRunner(f.store, f.artifacts, adapters({ package: async job => { controller.abort(); return archive(job); } }));
  await assert.rejects(runner.draft(job.id, controller.signal), code('operation_interrupted'));
  assert.equal(f.store.get(job.id).phase, 'cancelled'); assert.equal(f.store.get(job.id).artifact, null);
});
test('symlinked artifacts are rejected rather than followed', t => {
  const f = fixture(t); const state = ready(f.store, f.artifacts);
  const filename = path.join(f.artifacts.root, state.job.artifact!.hash + '.tar.gz');
  const outside = path.join(f.directory, 'outside'); fs.renameSync(filename, outside); fs.symlinkSync(outside, filename);
  assert.throws(() => f.artifacts.read(state.job), code('artifact_unavailable'));
});
test('canonicalization removes extended attributes and produces identical bytes for identical content', t => {
  const f = fixture(t); const { job } = generated(f.store);
  const original = f.artifacts.put(archive(job), job);
  const metadata = tar([paxEntry('LIBARCHIVE.xattr.com.apple.provenance', 'PRIVATE_METADATA'), ...entries(job)]);
  assert.throws(() => f.artifacts.check(metadata, job), code('artifact_verification_failed'));
  const normalized = f.artifacts.put(metadata, job);
  assert.deepEqual(normalized, original);
  const bytes = fs.readFileSync(path.join(f.artifacts.root, normalized.hash + '.tar.gz'));
  assert(!gunzipSync(bytes).includes(Buffer.from('PRIVATE_METADATA')));
  const structural = tar([paxEntry('linkpath', '/private/secret'), ...entries(job)]);
  assert.throws(() => f.artifacts.put(structural, job), code('artifact_verification_failed'));
});
test('maximum valid content still packages after HTML escaping expands its bytes', t => {
  const f = fixture(t); const job = f.store.create('expanded', request); const lease = f.store.acquire(job.id, 'worker');
  const operation = f.store.beginGeneration(job.id, lease);
  const expanded = { schema_version: 1 as const, title: '"'.repeat(90), summary: '"'.repeat(350),
    sections: Array.from({ length: 3 }, () => ({ heading: '"'.repeat(90), body: '"'.repeat(650) })) };
  const completed = f.store.completeGeneration(job.id, lease, operation, expanded, { units: 10, receipt: 'expanded-cost' });
  assert(Buffer.byteLength(entries(completed)[1].body!) > 12000);
  assert(f.artifacts.put(archive(completed), completed).hash);
});
test('staging uses fresh directories and excludes prior files and credentials', t => {
  const f = fixture(t); const { job } = generated(f.store);
  const first = f.artifacts.prepareWorkspace(job, path.join(f.directory, 'staging'));
  fs.writeFileSync(path.join(first, '.env'), 'synthetic-secret');
  const second = f.artifacts.prepareWorkspace(job, path.join(f.directory, 'staging'));
  assert.notEqual(first, second);
  assert.deepEqual(fs.readdirSync(second).sort(), ['.openai', 'dist']);
  assert(!fs.existsSync(path.join(second, '.env')));
});
test('state directory permissions, symlink roots and corrupt databases fail closed', t => {
  const f = fixture(t);
  const permissive = path.join(f.directory, 'permissive'); fs.mkdirSync(permissive, { mode: 0o755 }); fs.chmodSync(permissive, 0o755);
  assert.throws(() => new JobStore(permissive, 'owner-a', DEFAULT_POLICY), code('unsafe_state_directory'));
  const linked = path.join(f.directory, 'linked'); fs.symlinkSync(f.state, linked);
  assert.throws(() => new JobStore(linked, 'owner-a', DEFAULT_POLICY), code('unsafe_state_directory'));
  const corrupted = path.join(f.directory, 'corrupt'); fs.mkdirSync(corrupted, { mode: 0o700 });
  fs.writeFileSync(path.join(corrupted, 'workflow.sqlite'), 'not a database', { mode: 0o600 });
  assert.throws(() => new JobStore(corrupted, 'owner-a', DEFAULT_POLICY));
  assert.equal(fs.readFileSync(path.join(corrupted, 'workflow.sqlite'), 'utf8'), 'not a database');
});
test('changing the persisted policy requires an explicit migration', t => {
  const f = fixture(t); f.store.close();
  assert.throws(() => new JobStore(f.state, 'owner-a', { ...DEFAULT_POLICY, accountLimit: 999 }), code('policy_changed_requires_migration'));
});
test('foreign SQLite files are rejected without adding workflow tables', t => {
  const f = fixture(t); const foreign = path.join(f.directory, 'foreign'); fs.mkdirSync(foreign, { mode: 0o700 });
  const filename = path.join(foreign, 'workflow.sqlite'); fs.writeFileSync(filename, '', { mode: 0o600 });
  const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
  const database = new DatabaseSync(filename); database.exec('CREATE TABLE unrelated(id TEXT)');
  assert.throws(() => new JobStore(foreign, 'owner-a', DEFAULT_POLICY), code('foreign_state_database'));
  assert.deepEqual(database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row: any) => row.name), ['unrelated']);
  assert.equal(database.prepare('PRAGMA journal_mode').get().journal_mode, 'delete');
  database.close();
});
test('affected SQLite WAL-reset versions fail qualification despite functional compatibility', () => {
  for (const version of ['3.50.4', '3.51.2', '3.44.5', 'unknown', '4.0.0']) {
    assert.throws(() => requireSupportedSQLite(version), code('sqlite_version_not_qualified'));
  }
  for (const version of ['3.51.3', '3.53.4', '3.50.7', '3.44.6']) requireSupportedSQLite(version);
});
test('public status uses an exact field allowlist and never forwards diagnostics', t => {
  const f = fixture(t); const job = f.store.create('a', request);
  const decorated = { ...job, credential: 'SECRET', upstream: 'private-host', error: 'internal-stack', phase: 'needs_reconciliation' as const };
  assert.deepEqual(publicJob(decorated), { id: job.id, status: 'attention_required' });
  assert(!JSON.stringify(publicJob(decorated)).includes('SECRET'));
  assert.equal(publicJob({ ...decorated, phase: 'SECRET' } as any).status, 'attention_required');
});
test('caller input cannot change schema, template, model authority or execute paths', () => {
  for (const changed of [{ ...request, template: 'new-template' }, { ...request, command: 'run' },
    { ...request, brief: 'x'.repeat(2001) }, { ...request, requestedModel: '../model' }, { ...request, schemaVersion: 2 }]) {
    assert.throws(() => parseRequest(changed));
  }
});
