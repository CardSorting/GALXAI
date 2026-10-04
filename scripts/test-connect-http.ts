/** Loopback HTTP transport with synthetic permission and executor. No live account/provider calls. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { invokeNova } from '../src/lib/nova/inference';
import { NovaError, type NovaAccess } from '../src/lib/nova/contract';

test('raw HTTP bodies, headers, streamed errors and capacity retain the public boundary', async t => {
  let deny = false, mode: 'json' | 'stream' | 'uncertain' = 'json', calls = 0;
  const states: string[] = [];
  const access: NovaAccess = {
    admit: async () => { if (deny) throw new NovaError('service_busy', 503); return { id:'request-public',userId:'PRIVATE_ACCOUNT',grantId:'PRIVATE_GRANT' }; },
    finish: async (_id,state) => { states.push(state); },
  };
  const server = createServer(async (incoming,outgoing) => {
    try {
      const chunks: Buffer[] = []; for await (const chunk of incoming) chunks.push(chunk);
      const request = new Request(`http://127.0.0.1${incoming.url}`, { method:incoming.method,headers:incoming.headers as Record<string,string>,body:Buffer.concat(chunks) });
      const response = await invokeNova(request,'http://127.0.0.1',access,async () => {
        calls++;
        if (mode === 'uncertain') throw new Error('PRIVATE_UPSTREAM_DIAGNOSTIC');
        const value = { id:'PRIVATE_ID',model:'PRIVATE_MODEL',usage:{private:'PRIVATE_USAGE'},choices:[{message:{role:'assistant',content:'A result.',reasoning_content:'PRIVATE_REASONING'},delta:{content:'A result.',reasoning_content:'PRIVATE_REASONING'},finish_reason:'stop'}] };
        return mode === 'json' ? Response.json(value,{headers:{'X-Private-Route':'PRIVATE_HEADER'}})
          : new Response(`data: ${JSON.stringify(value)}\n\ndata: {"error":{"message":"PRIVATE_STREAM_ERROR"}}\n\n`,{headers:{'Content-Type':'text/event-stream','X-Private-Route':'PRIVATE_HEADER'}});
      });
      outgoing.writeHead(response.status,Object.fromEntries(response.headers));
      if (response.body) for await (const chunk of response.body) outgoing.write(chunk);
      outgoing.end();
    } catch { outgoing.writeHead(500);outgoing.end('Fixture failure'); }
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async () => { server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve())); });
  const address=server.address();assert(address&&typeof address==='object');
  const send = (authorization = `Bearer galx_connect_at_${'a'.repeat(43)}`) => fetch(`http://127.0.0.1:${address.port}/v1/inference`,{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json','Idempotency-Key':'request_0123456789'},body:JSON.stringify({messages:[{role:'user',content:'Make a thing.'}],stream:mode==='stream'})});
  const safe = async (response:Response) => {
    const body=await response.text();assert.doesNotMatch(body+JSON.stringify([...response.headers]),/PRIVATE_(?:ID|MODEL|USAGE|REASONING|HEADER|ACCOUNT|GRANT|UPSTREAM|STREAM)/);
    assert.equal(response.headers.get('x-private-route'),null);assert.match(response.headers.get('cache-control')||'',/no-store/);return body;
  };
  const ok=await send();assert.equal(ok.status,200);const result=JSON.parse(await safe(ok));assert.deepEqual(Object.keys(result).sort(),['choices','id','model','object']);assert.equal(result.choices[0].message.content,'A result.');
  const invalid=await send('Bearer account-session');assert.equal(invalid.status,401);assert.match(invalid.headers.get('www-authenticate')||'',/invalid_token/);await safe(invalid);assert.equal(calls,1);
  deny=true;const busy=await send();assert.equal(busy.status,503);assert.equal(busy.headers.get('www-authenticate'),null);assert.equal(JSON.parse(await safe(busy)).error.code,'service_busy');assert.equal(calls,1);deny=false;
  mode='uncertain';const uncertain=await send();assert.equal(JSON.parse(await safe(uncertain)).error.execution_state,'unknown');assert.equal(calls,2);
  mode='stream';const stream=await send();assert.match(stream.headers.get('content-type')||'',/text\/event-stream/);const frames=await safe(stream);assert.match(frames,/A result/);assert.match(frames,/outcome_unconfirmed/);assert.doesNotMatch(frames,/\[DONE\]/);assert.equal(calls,3);assert.deepEqual(states,['completed','unknown','unknown']);
});
