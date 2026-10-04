import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';
import assert from 'node:assert/strict';

const results = [];
for (const mode of ['complete', 'cancel-persistent', 'cancel-reclaimed']) {
  const destination = path.join('/evidence', mode + '.json');
  const child = fork('/fixture/lifetime-child.cjs', [mode, destination], {
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env: { PATH: process.env.PATH },
  });
  const messages = []; let errors = '';
  child.stderr.on('data', value => { errors += value.toString(); });
  child.on('message', message => {
    messages.push(message.event);
    // Models an allowed serverless teardown, not a measured Vercel invocation.
    // It is deliberately event-driven; no timing race is required to fail.
    if (mode === 'cancel-reclaimed' && message.event === 'cleanup-started') child.kill('SIGKILL');
  });
  const timeout = setTimeout(() => child.kill('SIGKILL'), 10_000);
  const exit = await new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
  clearTimeout(timeout);
  assert.equal(errors, '');
  const evidence = JSON.parse(fs.readFileSync(destination));
  assert.equal(evidence.dispatches, 1); assert.equal(evidence.providerFailures, 0);
  assert.equal(evidence.responseSanitized, true); assert.equal(evidence.cleanupStarted, true);
  if (mode === 'cancel-reclaimed') {
    assert.equal(exit.signal, 'SIGKILL'); assert.equal(evidence.durableState, 'running');
    assert.equal(evidence.cleanupCommitted, false); assert.equal(evidence.upstreamCancelled, true);
  } else {
    assert.equal(exit.code, 0); assert.equal(evidence.cleanupCommitted, true);
    assert.equal(evidence.durableState, mode === 'complete' ? 'completed' : 'unknown');
  }
  if (mode !== 'complete') assert.equal(evidence.signalAborted, true);
  results.push({ ...evidence, exit, messages });
}
const report = { at: new Date().toISOString(), kind: 'offline allowed-host-teardown reproduction',
  node: process.version, platform: process.platform, architecture: process.arch,
  realProvider: false, realDatabase: false, hostedInvocation: false, network: 'disabled',
  applicationSourceChanged: false, results,
  conclusion: 'The unchanged Nova implementation completes terminal persistence in a surviving process. Reclaiming an unprotected invocation after cancellation can leave its admission running. This models the documented host contract; it is not a live Vercel failure measurement.' };
fs.writeFileSync('/evidence/lifetime-reproduction.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
