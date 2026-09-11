/** Record the local integration demonstration without starting any model/tool work. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_POLICY, requireThat } from './contracts';
import { JobStore, SQLITE_VERSION } from './storage';
import { ArtifactStore } from './artifacts';

const [directory, id] = process.argv.slice(2);
requireThat(directory && id, 'state_and_job_required');
const store = new JobStore(directory, 'local-session', DEFAULT_POLICY);
try {
  const job = store.get(id);
  requireThat(job.phase === 'ready' && job.attempts.length === 1 && job.publication === null && job.target === null, 'unexpected_demo_state');
  const archive = new ArtifactStore(path.join(store.root, 'artifacts')).read(job);
  const retained = fileURLToPath(new URL('./artifacts', import.meta.url));
  fs.mkdirSync(retained, { recursive: true });
  fs.writeFileSync(path.join(retained, 'durable-static-draft.tar.gz'), archive);
  const report = {
    checkedAt: new Date().toISOString(), node: process.version, sqlite: SQLITE_VERSION,
    status: job.phase, stateDirectory: store.root, jobId: job.id,
    evidenceMode: 'recorded_fixture_replayed_across_separate_processes',
    newLiveModelRequests: 0, fixtureReplayDispatches: job.attempts.length,
    officialPackaging: 'Sites 0.1.66 package-site.mjs',
    normalization: 'Verified exact files; removed macOS PAX attributes and canonicalized archive metadata',
    artifact: { ...job.artifact, retained: 'artifacts/durable-static-draft.tar.gz' },
    account: store.account(), budgetUnitMeaning: 'Local fixture reservation units; not money or verified tokens',
    usageReconciled: false, publishingConfigured: false, siteCreated: false, deployed: false,
    events: store.events(id),
  };
  fs.writeFileSync(fileURLToPath(new URL('./local-observations.json', import.meta.url)), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, artifactHash: job.artifact!.hash, newLiveModelRequests: 0, deployed: false }));
} finally { store.close(); }
