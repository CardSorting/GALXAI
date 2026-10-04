import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';

const destination = path.resolve(process.argv[2] || '.relay/hosted-adaptation/lifetime');
fs.mkdirSync(destination, { recursive: true });
await build({ entryPoints: ['scripts/fixtures/nova-host-lifetime.ts'], outfile: path.join(destination, 'child.cjs'), platform: 'node', target: 'node22', format: 'cjs', bundle: true, banner: { js: "globalThis.AsyncLocalStorage = require('node:async_hooks').AsyncLocalStorage;" }, plugins: [{ name: 'entry-wrapper', setup(b) { b.onLoad({ filter: /nova-host-lifetime\.ts$/ }, async args => ({ contents: fs.readFileSync(args.path, 'utf8').replace('await workAsyncStorage.run(', 'void workAsyncStorage.run('), loader: 'ts' })); } }] });
fs.writeFileSync(path.join(destination, 'runner.cjs'), `
const fs = require('node:fs'), assert = require('node:assert/strict'), { fork } = require('node:child_process');
(async () => {
  const results = [];
  for (const mode of ['completed', 'disconnect', 'deadline']) {
    const file = '/evidence/' + mode + '.json';
    const child = fork('/evidence/child.cjs', [mode, file], { env: { PATH: process.env.PATH }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    let errors = '', settled = false; const messages = [];
    child.stderr.on('data', b => { errors += b.toString(); });
    child.on('message', m => {
      messages.push(m.event);
      if (m.event === 'stream-observed' && mode === 'disconnect') child.send('disconnect');
      // The actual Next 15.5.25 after() registered its promise with waitUntil.
      // Host teardown is allowed only when that work settles (or maxDuration).
      if (m.event === 'host-work-settled') { settled = true; child.kill('SIGKILL'); }
    });
    const timeout = setTimeout(() => child.kill('SIGKILL'), 360000);
    const exit = await new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
    clearTimeout(timeout);
    assert.equal(errors, ''); assert(settled);
    const state = JSON.parse(fs.readFileSync(file));
    assert.equal(state.registrations, 1); assert.equal(state.dispatches, 1); assert.equal(state.writes, 1);
    assert(state.committed); assert(state.sanitized);
    assert.equal(state.durableState, mode === 'completed' ? 'completed' : 'unknown');
    if (mode !== 'completed') assert(state.signalAborted);
    if (mode === 'deadline') { assert(state.elapsedMs >= 300000); assert(state.elapsedMs < 360000); }
    results.push({ ...state, exit, messages });
    console.log(mode + ': ' + state.durableState + ' persisted before host reclamation (' + state.elapsedMs + ' ms)');
  }
  fs.writeFileSync('/evidence/result.json', JSON.stringify({ at: new Date().toISOString(), node: process.version, platform: process.platform, architecture: process.arch, framework: 'Next 15.5.25 after() + AfterContext', realHostInvocation: false, network: 'disabled', realProvider: false, realDatabase: false, results }, null, 2) + '\\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
`);
execFileSync('docker', ['run', '--rm', '--platform', 'linux/amd64', '--network', 'none', '--mount', `type=bind,src=${destination},dst=/evidence`, 'node@sha256:43aeff40f4afc22e83f7589a2f37e111cff5ca84529571f1c8415bcc5fcc21b2', 'node', '/evidence/runner.cjs'], { stdio: 'inherit', env: { PATH: process.env.PATH, HOME: process.env.HOME, DOCKER_CONTEXT: process.env.DOCKER_CONTEXT || 'desktop-linux' } });
