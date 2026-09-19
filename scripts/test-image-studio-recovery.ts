/** DOM-only integration test: no browser, credentials or external requests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { useImageStudio } from '../src/components/images/use-image-studio';

const { JSDOM } = await import(process.env.GALX_JSDOM_MODULE || 'jsdom');
test('availability stays silent while generation survives transient failures, reload and lost acknowledgement', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost', pretendToBeVisual: true });
  const originalFetch = globalThis.fetch;
  const replacements: Record<string, unknown> = { window: dom.window, document: dom.window.document,
    navigator: dom.window.navigator, sessionStorage: dom.window.sessionStorage, Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent, IS_REACT_ACT_ENVIRONMENT: true };
  const previous = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis,key)]));
  for (const [key,value] of Object.entries(replacements)) Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  let studio!: ReturnType<typeof useImageStudio>, mode = 'queued', posts = 0;
  const submitted: Array<{key:string;body:string}> = [], polled: string[] = [];
  const result = () => Response.json({data:[{url:'/v1/images/assets/completed'}]});
  let available = true, availabilityReads = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('/api/images/availability')) { availabilityReads++; return Response.json({status:available?'available':'unavailable'}); }
    if (init?.method === 'POST') {
      posts++; submitted.push({key:(init.headers as Record<string,string>)['Idempotency-Key'],body:String(init.body)});
      if (mode === 'lost') throw new Error('lost acknowledgement');
      return Response.json({id:`request-${posts}`,status:'queued'}, {status:202});
    }
    if (url.includes('/requests/')) {
      polled.push(url);
      if (mode === 'complete') return result();
      if (mode === 'busy') return Response.json({error:{code:'generation_not_started',message:'private-sentinel'}},{status:503});
      if (mode === 'transient') return Response.json({error:{code:'temporarily_unavailable'}},{status:503,headers:{'Retry-After':'1'}});
      return Response.json({status:'queued'}, {status:202});
    }
    return Response.json({success:true,records:[]});
  };
  function Harness() { studio=useImageStudio('owner','fixture',false); return null; }
  let root=createRoot(document.getElementById('root')!);
  const settle = async (ms=30) => { await act(async()=>{await new Promise(resolve=>setTimeout(resolve,ms));}); };
  try {
    await act(async()=>root.render(createElement(Harness)));
    await act(async()=>studio.setSettings({...studio.settings,prompt:'Original prompt'}));
    available=false;
    await act(async()=>{await studio.checkAvailability();});
    assert.equal(studio.availability,'unavailable');
    assert.equal(studio.notice,'','availability checks must not interrupt the prompt workflow');
    await act(async()=>{await studio.generate();}); assert.equal(posts,0);
    await act(async()=>{await studio.checkAvailability();}); assert.equal(posts,0);
    assert(availabilityReads>=2); assert.equal(studio.settings.prompt,'Original prompt');
    available=true;
    await act(async()=>{await studio.checkAvailability();});
    assert.equal(studio.availability,'available'); assert.equal(studio.notice,'','availability success must remain silent'); assert.equal(posts,0);
    for(let i=0;i<4;i++) await act(async()=>{await studio.generate();});
    await settle();
    assert.equal(studio.activeCount,4); assert(studio.atCapacity);
    await act(async()=>{await studio.generate();}); assert.equal(posts,4);
    assert.equal(new Set(polled).size,4,'every independent receipt is checked');
    assert.equal(JSON.parse(sessionStorage.getItem('galx-image-studio:owner:tasks')!).length,4);
    mode='transient'; await act(async()=>studio.setPolling(false)); await act(async()=>studio.resumeUpdates()); await settle();
    assert.equal(studio.activeCount,4,'503 cannot erase accepted work');
    await act(async()=>root.unmount());
    root=createRoot(document.getElementById('root')!);
    mode='complete'; await act(async()=>root.render(createElement(Harness))); await settle();
    assert.equal(studio.creations.length,4); assert.equal(studio.activeCount,0); assert.equal(posts,4,'reload only retrieves');
    mode='busy'; await act(async()=>{await studio.generate();}); await settle();
    assert.equal(studio.activeCount,0); assert.match(studio.error,/did not start/); assert.equal(studio.uncertain,false);
    // Remount clears this run's cooldown without changing request identity.
    await act(async()=>root.unmount()); root=createRoot(document.getElementById('root')!);
    await act(async()=>root.render(createElement(Harness)));
    mode='lost'; await act(async()=>{await studio.generate();});
    const lost=submitted.at(-1); assert(studio.uncertain); assert(studio.recoverableSubmission);
    await act(async()=>root.unmount()); root=createRoot(document.getElementById('root')!);
    await act(async()=>root.render(createElement(Harness)));
    assert(studio.uncertain); assert(studio.recoverableSubmission);
    mode='queued'; await act(async()=>studio.recoverSubmission()); await settle();
    assert.deepEqual(submitted.at(-1),lost,'explicit recovery preserves exact key and payload');
    assert.equal(studio.activeCount,1); assert.equal(studio.uncertain,false);
    assert.doesNotMatch(studio.error,/private-sentinel/);
  } finally {
    await act(async()=>root.unmount()); globalThis.fetch=originalFetch; dom.window.close();
    for(const [key,descriptor] of previous) {if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
  }
});
