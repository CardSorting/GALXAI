import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import { GalxaiRelayServer } from '../src/relay/relay-server.js';
import { RelayFederationLifecycle, type DesiredShard, type RelayDriver, type RelayHandle } from '../src/relay/federation-lifecycle.js';
import { RelayFederationServer } from '../src/relay/federation-server.js';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn: () => boolean) { for(let i=0;i<400;i++) { if(fn()) return; await delay(5); } throw new Error('State did not converge'); }
test('real HTTP federation preserves exact models, tenant ownership and active stream affinity across capability loss', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(),'galx-federation-http-'));
  const upstream = http.createServer(); const ws = new WebSocketServer({server:upstream});
  const attempts: {account:string; model:string}[] = []; let held: WebSocket | undefined;
  ws.on('connection',(socket,req)=>socket.on('message',raw=>{
    const request = JSON.parse(raw.toString()); attempts.push({account:String(req.headers['chatgpt-account-id']),model:request.model});
    socket.send(JSON.stringify({type:'response.output_text.delta',delta:'first'}));
    if(JSON.stringify(request).includes('hold-stream')) held=socket;
    else socket.send(JSON.stringify({type:'response.completed'}));
  }));
  await new Promise<void>(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  let desired: DesiredShard[] = ['a','b','c'].map(id=>({id,provider:'openai',credentialRevision:'v1',accessToken:`fake-${id}`,accountId:id}));
  const inventories = new Map([['a',['A','B']],['b',['B','C']],['c',['A','C']]]);
  const workers = new Map<string,{relay:GalxaiRelayServer;handle:RelayHandle}>();
  const starts: string[]=[]; const removals:string[]=[];
  const driver: RelayDriver = {
    async list(){return [...workers.values()].map(w=>w.handle);},
    async start(s){
      starts.push(s.id); const generation=`generation-${s.id}`;
      const relay=new GalxaiRelayServer({port:0,host:'127.0.0.1',assignedShard:s,assignedShardId:s.id,relayId:`relay-${s.id}`,generation,
        apiKeys:['internal-inference'],adminApiKeys:['internal-admin'],registryEnabled:false,discoverHostCredentials:false,
        stateSnapshotPath:path.join(directory,`${s.id}.json`),shardsJsonPath:path.join(directory,'absent'),drainTimeoutMs:20,
        capabilityDiscovery:async()=>inventories.get(s.id)!,wsEndpoint:`ws://127.0.0.1:${(upstream.address() as any).port}`});
      await relay.start();
      const handle={id:`relay-${s.id}`,shardId:s.id,generation,credentialRevision:s.credentialRevision,endpoint:`http://127.0.0.1:${(relay as any).server.address().port}`,inferenceKey:'internal-inference',adminKey:'internal-admin'};
      workers.set(s.id,{relay,handle});return handle;
    },
    async inspect(h){const relay=workers.get(h.shardId)!.relay as any; await relay.refreshCapabilities(); return {record:relay.capabilitySnapshot().shards[0]};},
    async remove(h){removals.push(h.shardId);await workers.get(h.shardId)!.relay.stop();workers.delete(h.shardId);}
  };
  const lifecycle=new RelayFederationLifecycle(async()=>desired,driver);
  const front=new RelayFederationServer(lifecycle,{apiKeys:['tenant-one','tenant-two'],adminKeys:['admin'],secret:'federation-test-signing-secret-32-characters',port:0});
  try {
    await lifecycle.reconcile(); await front.start();const base=`http://127.0.0.1:${(front.server.address() as any).port}`;
    const headers=(key='tenant-one')=>({Authorization:`Bearer ${key}`,'Content-Type':'application/json'});
    const submit=(model:string,prompt:string,key?:string)=>fetch(base+'/v1/chat/completions',{method:'POST',headers:headers(key),body:JSON.stringify({model,messages:[{role:'user',content:prompt}]})});
    assert.equal((await fetch(base+'/api/capabilities',{headers:headers()})).status,401);
    assert.equal((await fetch(base+'/api/capabilities',{headers:headers('admin')})).status,200);
    const missing=await submit('missing','unknown');assert.equal(missing.status,503);assert.equal(attempts.length,0);
    const image=await fetch(base+'/v1/images/generations',{method:'POST',headers:headers(),body:JSON.stringify({model:'A',prompt:'unverified image operation'})});assert.equal(image.status,503);assert.equal(attempts.length,0);
    const response=await submit('B','hold-stream');assert.equal(response.status,202);const job=await response.json();assert(job.id);assert.equal(job.streamUrl,`/v1/jobs/${job.id}/stream`);
    await until(()=>!!held);assert.deepEqual(attempts[0],{account:'a',model:'B'});
    assert.equal((await fetch(base+job.statusUrl,{headers:headers('tenant-two')})).status,404);
    inventories.set('a',['A']);await lifecycle.reconcile();assert.equal(starts.length,3);assert.equal(removals.length,0);
    assert.deepEqual(lifecycle.capabilities.eligible('B').map(s=>s.shardId),['b']);
    held!.send(JSON.stringify({type:'response.output_text.delta',delta:' second'}));held!.send(JSON.stringify({type:'response.completed'}));
    const stream=await fetch(base+job.streamUrl,{headers:headers()});assert.equal(stream.status,200);const transcript=await stream.text();assert(transcript.includes('first'));assert(transcript.includes('second'));
    const next=await submit('B','only-b');assert.equal(next.status,202);await until(()=>attempts.length===2);assert.deepEqual(attempts[1],{account:'b',model:'B'});
    desired=desired.filter(s=>s.id!=='b');await lifecycle.reconcile();
    const denied=await submit('B','now-unavailable');assert.equal(denied.status,503);assert.equal((await denied.json()).error.code,'model_temporarily_unavailable');
    assert.equal((await submit('A','A-still-works')).status,202);assert.equal((await submit('C','C-still-works')).status,202);
    inventories.set('a',['A','B']);await lifecycle.reconcile();assert.equal((await submit('B','recovered')).status,202);assert.equal(starts.length,3);
    assert.equal((await fetch(base+'/federation')).status,200);
  } finally { await front.stop();await lifecycle.stop();for(const socket of ws.clients)socket.terminate();await new Promise<void>(resolve=>ws.close(()=>resolve()));await new Promise<void>(resolve=>upstream.close(()=>resolve()));fs.rmSync(directory,{recursive:true,force:true}); }
});
