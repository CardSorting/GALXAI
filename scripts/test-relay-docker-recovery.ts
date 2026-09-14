import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { DockerShardDriver } from '../src/relay/docker-shard-driver.js';
import { DockerMutationJournal } from '../src/relay/docker-mutation-journal.js';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch (e: any) { if (e.code === 'ESRCH') return false; throw e; } };
async function stopped(child: ChildProcess, ms: number) {
  const end = performance.now() + ms;
  while (child.exitCode === null && child.signalCode === null && performance.now() < end) await delay(20);
  return child.exitCode !== null || child.signalCode !== null;
}

// Real subprocesses, synthetic Docker executable, no Docker daemon or registry access.
test('a TERM-ignoring Docker executable is killed and list settles within its recovery budget', { timeout: 12000 }, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-docker-stall-'));
  const pidFile = path.join(directory, 'pid');
  const termFile = path.join(directory, 'term');
  fs.writeFileSync(path.join(directory, 'docker'), `#!${process.execPath}\n` +
    `const fs=require('node:fs');fs.writeFileSync(process.env.GALX_DOCKER_TEST_PID,String(process.pid));` +
    `process.on('SIGTERM',()=>fs.writeFileSync(process.env.GALX_DOCKER_TEST_TERM,'received'));setInterval(()=>{},1000);`, { mode: 0o700 });
  const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import { DockerShardDriver } from './src/relay/docker-shard-driver.ts';
    const driver=new DockerShardDriver({namespace:'test-stall',image:'unused',secret:'x'.repeat(32)});
    try { await driver.list(); process.exitCode=0; }
    catch(error) { console.log(JSON.stringify({code:error.code??'unclassified',message:error.message}));process.exitCode=2; }
  `], { cwd: process.cwd(), detached: true, env: { ...process.env, PATH: `${directory}:${process.env.PATH}`,
    GALX_DOCKER_TEST_PID: pidFile, GALX_DOCKER_TEST_TERM: termFile }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout!.on('data', chunk => { output += chunk; }); child.stderr!.resume();
  const started = performance.now();
  try {
    const finished = await stopped(child, 7500);
    assert(fs.existsSync(termFile), 'the actual Docker command deadline sends TERM');
    assert(finished, 'list remains blocked after execFile timeout because the subprocess ignores TERM');
    const pid = Number(fs.readFileSync(pidFile, 'utf8'));
    assert.equal(alive(pid), false, 'return only after command termination, not signal delivery');
    assert.equal(child.exitCode, 2);
    assert.match(output, /docker_command_timeout/);
    assert(!output.includes(pidFile));
    console.log(JSON.stringify({fault:'docker_ignores_term',recoveredMs:Math.round(performance.now()-started)}));
  } finally {
    if (fs.existsSync(pidFile)) { const pid = Number(fs.readFileSync(pidFile, 'utf8')); if (alive(pid)) process.kill(pid, 'SIGKILL'); }
    if (child.exitCode === null && child.signalCode === null) { const exit = once(child, 'exit'); process.kill(-child.pid!, 'SIGKILL'); await exit; }
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('delayed Docker stop/remove targets immutable container identity after its name is reused', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-docker-identity-'));
  const stateFile = path.join(directory, 'state.json');
  const name = 'galx-shard-' + createHash('sha256').update('synthetic-shard').digest('hex').slice(0,20);
  const originalId = 'a'.repeat(64), replacementId = 'b'.repeat(64);
  fs.writeFileSync(stateFile, JSON.stringify({ name, originalId, replacementId, calls: [], running: true }));
  fs.writeFileSync(path.join(directory, 'docker'), `#!${process.execPath}\n` + `
    const fs=require('node:fs'),s=JSON.parse(fs.readFileSync(process.env.GALX_DOCKER_TEST_STATE,'utf8'));
    const args=process.argv.slice(2);s.calls.push(args);
    if(args[0]==='inspect') {
      const labels={'io.galx.federation':'test-identity','io.galx.shard':'synthetic-shard','io.galx.generation':'generation','io.galx.credential-revision':'v1'};
      const fields=[JSON.stringify('/'+s.name),JSON.stringify(labels),JSON.stringify({'3001/tcp':[{HostIp:'127.0.0.1',HostPort:'3000'}]}),String(s.running),'no','started'];
      if(args.join(' ').includes('.Id'))fields.push(s.originalId);
      console.log(fields.join('\\t'));
    } else if(args[0]==='stop'||args[0]==='rm') {
      // The daemon resolves a reusable name after it has been assigned to a replacement.
      if(args.at(-1)===s.name)s.replacementMutated=true;
      s.running=false;
    }
    fs.writeFileSync(process.env.GALX_DOCKER_TEST_STATE,JSON.stringify(s));
  `, { mode: 0o700 });
  const oldPath = process.env.PATH, oldState = process.env.GALX_DOCKER_TEST_STATE;
  process.env.PATH = `${directory}:${oldPath}`; process.env.GALX_DOCKER_TEST_STATE = stateFile;
  try {
    const driver = new DockerShardDriver({ namespace:'test-identity', image:'unused', secret:'x'.repeat(32) });
    await driver.remove({id:name,shardId:'synthetic-shard',generation:'generation@started',credentialRevision:'v1',endpoint:'http://127.0.0.1:3000',inferenceKey:'synthetic',adminKey:'synthetic'});
    const state = JSON.parse(fs.readFileSync(stateFile,'utf8'));
    assert(!state.replacementMutated, 'a delayed name-based command mutated the replacement');
    assert(state.calls.filter((args:string[])=>['stop','rm'].includes(args[0])).every((args:string[])=>args.at(-1)===originalId));
  } finally {
    process.env.PATH=oldPath;
    if(oldState===undefined)delete process.env.GALX_DOCKER_TEST_STATE;else process.env.GALX_DOCKER_TEST_STATE=oldState;
    fs.rmSync(directory,{recursive:true,force:true});
  }
});

test('retained workers with a legacy restart policy are migrated before admission', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-docker-policy-'));
  const journalPath = path.join(directory, 'docker-operations.json');
  const name = 'galx-shard-' + createHash('sha256').update('policy-shard').digest('hex').slice(0, 20);
  const containerId = 'c'.repeat(64);
  let policy = 'unless-stopped';
  const calls: string[][] = [];
  const labels = { 'io.galx.federation': 'test-policy', 'io.galx.shard': 'policy-shard', 'io.galx.generation': 'generation', 'io.galx.credential-revision': 'v1' };
  const inspect = () => [JSON.stringify('/' + name), JSON.stringify(labels), JSON.stringify({ '3001/tcp': [{ HostIp: '127.0.0.1', HostPort: '3000' }] }), 'true', policy, 'started', containerId].join('\t');
  const driver = new DockerShardDriver({ namespace: 'test-policy', image: 'unused', secret: 'x'.repeat(32), mutationJournalPath: journalPath });
  t.mock.method(driver as any, 'docker', async (args: string[]) => {
    calls.push(args);
    if (args[0] === 'ps') return name;
    if (args[0] === 'inspect') return inspect();
    if (args[0] === 'update') { assert.deepEqual(args.slice(0, 3), ['update', '--restart', 'no']); assert.equal(args[3], containerId); policy = 'no'; return ''; }
    throw new Error('unexpected docker operation');
  });
  try {
    const first = await driver.list();
    assert.equal(first[0].restartPolicy, 'no');
    assert.equal(calls.filter(args => args[0] === 'update').length, 1);
    assert.deepEqual(new DockerMutationJournal(journalPath).pending(), []);
    await driver.list();
    assert.equal(calls.filter(args => args[0] === 'update').length, 1, 'a migrated retained worker is not updated on every reconciliation');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
