import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { AdmissionReceipts } from '../src/relay/admission-receipts.js';
import { DockerMutationJournal } from '../src/relay/docker-mutation-journal.js';

const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'galx-recovery-evidence-'));
const open=(file:string,now=Date.now)=>new AdmissionReceipts(now,600000,1000,32*1024*1024,file);

test('SIGKILL after persisted admission retains uncertainty without prompts or response bytes',async()=>{
  const directory=temporary(),file=path.join(directory,'admissions.json');
  const child=spawn(process.execPath,['--import','tsx','--input-type=module','-e',`
    import {AdmissionReceipts} from './src/relay/admission-receipts.ts';
    const r=new AdmissionReceipts(Date.now,600000,1000,33554432,process.argv[1]);
    r.begin('tenant','chat','stable-key',{model:'A',prompt:'private synthetic prompt'});
    process.stdout.write('committed');setInterval(()=>{},1000);
  `,file],{stdio:['ignore','pipe','pipe']});child.stderr!.resume();
  try {
    await Promise.race([once(child.stdout!,'data'),once(child,'exit').then(()=>{throw Error('Fixture exited before commit');}),
      new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Fixture deadline')),5000);timer.unref();})]);
    const exit=once(child,'exit');child.kill('SIGKILL');await exit;
    const r=open(file),entry=r.begin('tenant','chat','stable-key',{model:'A',prompt:'private synthetic prompt'});
    assert(entry.existing);assert.equal(entry.receipt.state,'unknown');
    assert(!fs.readFileSync(file,'utf8').includes('private synthetic prompt'));
    assert.throws(()=>r.begin('tenant','chat','stable-key',{model:'B'}),/different request parameters/);
    assert.equal(r.begin('other-tenant','chat','stable-key',{model:'A'}).existing,false);
  } finally {if(child.exitCode===null&&child.signalCode===null){const exit=once(child,'exit');child.kill('SIGKILL');await exit;}fs.rmSync(directory,{recursive:true,force:true});}
});

test('uncertain admissions do not expire, known non-dispatch releases its key, completed evidence retains the documented window',()=>{
  const directory=temporary(),file=path.join(directory,'admissions.json');let now=10000;
  try {
    let r=open(file,()=>now);
    const unknown=r.begin('tenant','chat','uncertain',{model:'A'});r.unknown(unknown.receipt);
    const beforeDispatch=r.begin('tenant','chat','not-dispatched',{model:'A'});r.forget(beforeDispatch.id);
    const complete=r.begin('tenant','chat','accepted',{model:'A'});r.complete(complete.receipt,202,{},Buffer.from('not persisted'));
    r=open(file,()=>now);
    assert.equal(r.begin('tenant','chat','accepted',{model:'A'}).receipt.state,'complete');
    assert.equal(r.begin('tenant','chat','accepted',{model:'A'}).receipt.response,undefined);
    assert.equal(r.begin('tenant','chat','not-dispatched',{model:'A'}).existing,false);
    now+=86400000;r.prune();r=open(file,()=>now);
    assert.equal(r.begin('tenant','chat','uncertain',{model:'A'}).receipt.state,'unknown');
    assert.equal(r.begin('tenant','chat','accepted',{model:'A'}).existing,false);
  } finally {fs.rmSync(directory,{recursive:true,force:true});}
});

test('missing initialized, corrupt and read-only admission storage fail closed; failed writes poison new admissions',()=>{
  const directory=temporary(),file=path.join(directory,'admissions.json');
  try {
    const diagnostics:string[] = [], r=new AdmissionReceipts(Date.now,600000,1000,32*1024*1024,file, event => diagnostics.push(event.code));fs.unlinkSync(file);
    assert.throws(()=>open(file),/recovery is temporarily unavailable/);
    assert.throws(()=>r.begin('a','chat','key',{}),/recovery is temporarily unavailable/);
    assert.equal(diagnostics.at(-1),'admission_storage_unavailable');
    assert.equal(r.diagnostics().storageHealthy,false);
    fs.writeFileSync(file,'malformed',{mode:0o600});assert.throws(()=>open(file),/recovery is temporarily unavailable/);
    fs.unlinkSync(file);fs.unlinkSync(file+'.initialized');
    const next=open(file);fs.chmodSync(directory,0o500);
    assert.throws(()=>next.begin('a','chat','key',{}),/recovery is temporarily unavailable/);
    fs.chmodSync(directory,0o700);
    assert.throws(()=>next.begin('a','chat','other',{}),/recovery is temporarily unavailable/);
  } finally {fs.chmodSync(directory,0o700);fs.rmSync(directory,{recursive:true,force:true});}
});

test('pending Docker mutations survive reopen and block conflicting work; corrupt or unavailable journal prevents mutation',()=>{
  const directory=temporary(),file=path.join(directory,'docker.json');
  try {
    let journal=new DockerMutationJournal(file);
    assert(fs.existsSync(file), 'first startup must create the empty mutation journal');
    const pending=journal.begin({action:'run',target:'synthetic-container',shardId:'synthetic-shard',generation:'synthetic-generation'});
    journal=new DockerMutationJournal(file);assert.throws(()=>journal.assertClear('synthetic-shard'),/docker_mutation_uncertain/);
    assert.equal(journal.pending().length,1);journal.complete(pending);assert.equal(journal.pending().length,0);
    fs.writeFileSync(file,'corrupt');assert.throws(()=>new DockerMutationJournal(file),/docker_journal_unavailable/);
    fs.writeFileSync(file,JSON.stringify({version:1,entries:[]}));fs.unlinkSync(file);assert.throws(()=>new DockerMutationJournal(file),/docker_journal_unavailable/);
    fs.chmodSync(directory,0o500);
    assert.throws(()=>journal.begin({action:'run',target:'synthetic-container',shardId:'synthetic-shard',generation:'synthetic-generation'}),/docker_journal_unavailable/);
    assert.equal(journal.pending().length,0);
  } finally {fs.chmodSync(directory,0o700);fs.rmSync(directory,{recursive:true,force:true});}
});
