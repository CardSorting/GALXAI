import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {NextRequest} from 'next/server';

test('Vercel denies every inference entry before authorization, input parsing or dispatch', async () => {
  const before={VERCEL:process.env.VERCEL,GALX_VAULT_KEY_V1:process.env.GALX_VAULT_KEY_V1,GALX_AUDIT_SIGNING_SECRET:process.env.GALX_AUDIT_SIGNING_SECRET};
  process.env.VERCEL='1';
  process.env.GALX_VAULT_KEY_V1=randomBytes(32).toString('hex');
  process.env.GALX_AUDIT_SIGNING_SECRET=randomBytes(32).toString('hex');
  const original=globalThis.fetch;
  globalThis.fetch=async()=>{throw Error('Retired execution must not make an outbound request');};
  try {
    const route=await import('../src/app/v1/inference/route');
    const {middleware}=await import('../src/middleware');
    const {withDeveloperUsageAccess,withDeveloperAccess}=await import('../src/lib/security/developer-access');
    let dispatched=0;
    const legacy=withDeveloperUsageAccess(async()=>{dispatched++;return new Response('Should not execute');});
    const queue=withDeveloperAccess(async()=>{dispatched++;return new Response('Should not dispatch queued work');});
    const paths=['/v1/inference','/v1/chat/completions','/v1/completions','/v1/messages','/v1/embeddings','/api/chat','/api/generate','/api/run','/api/queues','/api/queues/example/tasks','/api/queues/example/redrive'];
    for(const path of paths.flatMap(p=>[p,p+'/'])){
      for(const method of ['POST','OPTIONS','GET']){
        const request=new NextRequest('https://galx.ai'+path,{method,headers:{Authorization:'Bearer galx_connect_at_'+'a'.repeat(43),Host:'nova.galx.ai','X-Forwarded-Host':'nova.galx.ai','X-Forwarded-Proto':'https'},...(method==='POST'?{body:'deliberately invalid JSON'}:{})});
        const response=await middleware(request);
        assert.equal(response.status,410);assert.equal(await response.text(),'');
        assert.match(response.headers.get('cache-control')||'',/no-store/);
        if(method!=='GET'){
          const result=await route[method as 'POST'|'OPTIONS'](request);
          assert.equal(result.status,410);assert.equal(await result.text(),'');
        }
        assert.equal((await legacy(request)).status,410);
        assert.equal((await queue(request)).status,410);
      }
    }
    assert.equal(dispatched,0);
    const {retiredVercelInferencePath}=await import('../src/lib/security/inference-placement');
    for(const path of ['/v1/images/generations','/api/chat/sessions','/oauth/token','/connect','/api/connect/consent'])assert.equal(retiredVercelInferencePath(path),false);
    delete process.env.VERCEL;
    for(const path of paths)assert.equal(retiredVercelInferencePath(path),false);
  } finally {
    globalThis.fetch=original;
    for(const [key,value]of Object.entries(before))if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
});
