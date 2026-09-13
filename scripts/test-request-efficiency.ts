import assert from 'node:assert/strict';
import test from 'node:test';
import { startActivityPolling, imageStatusDelay, recoveryDelay, type PollingEnvironment } from '../src/lib/resilience/activity-polling';
import { createIntentPrefetchBudget } from '../src/lib/resilience/intent-prefetch';

function clock() {
  let now=0, active=true, event=()=>{}, id=0;
  const timers=new Map<number,{at:number;run:()=>void}>();
  const environment: PollingEnvironment = {
    now:()=>now, active:()=>active,
    schedule:(run,delay)=>{timers.set(++id,{at:now+delay,run});return id as unknown as ReturnType<typeof setTimeout>;},
    cancel:timer=>{timers.delete(timer as unknown as number);},
    subscribe:callback=>{event=callback;return()=>{event=()=>{};};},
  };
  return { environment, timers,
    activity(value:boolean){active=value;event();},
    async advance(ms:number){
      const end=now+ms;
      for(;;){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next || next[1].at>end)break;
        now=next[1].at;timers.delete(next[0]);next[1].run();await Promise.resolve();await Promise.resolve();}
      now=end;
    },
  };
}
test('polling makes no hidden/offline requests and resumes once without catch-up or overlap',async()=>{
  const c=clock();let calls=0, release:((value:number|null)=>void)|undefined;
  c.activity(false);
  const stop=startActivityPolling(async()=>{calls++;return new Promise(resolve=>{release=resolve;});},c.environment);
  await c.advance(60_000);assert.equal(calls,0);
  c.activity(true);await c.advance(0);assert.equal(calls,1);
  for(let i=0;i<10;i++){c.activity(false);c.activity(true);}await c.advance(60_000);assert.equal(calls,1);
  release!(2500);await Promise.resolve();await Promise.resolve();
  c.activity(false);await c.advance(60_000);assert.equal(calls,1);
  c.activity(true);await c.advance(0);assert.equal(calls,2);
  stop();release!(2500);await c.advance(60_000);assert.equal(calls,2);assert.equal(c.timers.size,0);
});
test('Retry-After survives visibility events; completion stops polling',async()=>{
  const c=clock();let calls=0;
  const stop=startActivityPolling(async()=>++calls===1?30_000:null,c.environment);
  await c.advance(0);c.activity(false);await c.advance(10_000);c.activity(true);
  await c.advance(19_999);assert.equal(calls,1);await c.advance(1);assert.equal(calls,2);
  c.activity(false);c.activity(true);await c.advance(60_000);assert.equal(calls,2);stop();
});
test('unmount aborts the active read and unexpected errors cannot form a retry loop',async()=>{
  const c=clock();let signal:AbortSignal|undefined,calls=0;
  const stop=startActivityPolling(async s=>{signal=s;calls++;throw new Error('read failed');},c.environment);
  await c.advance(0);c.activity(false);c.activity(true);await c.advance(60_000);assert.equal(calls,1);
  stop();assert.equal(signal?.aborted,true);
});
test('five-minute pending fixture reduces checks from 120 to 35; idle uses zero',async()=>{
  const c=clock();let calls=0;
  const stop=startActivityPolling(async()=>imageStatusDelay(calls++,null),c.environment);
  await c.advance(299_999);assert.equal(calls,35);stop();
});
test('adaptive image polling honors delta/date server hints and rejects malformed values',()=>{
  assert.equal(imageStatusDelay(0,null),2500);assert.equal(imageStatusDelay(4,null),5000);assert.equal(imageStatusDelay(8,null),10000);
  assert.equal(imageStatusDelay(8,'1'),10000);assert.equal(imageStatusDelay(0,'30'),30000);
  assert.equal(imageStatusDelay(0,new Date(40_000).toUTCString(),10_000),30000);
  for(const value of ['invalid','-1','9'.repeat(400)])assert(imageStatusDelay(0,value)>=2500);
});
test('shared navigation budget collapses duplicate destinations and limits bursts',()=>{
  const claim=createIntentPrefetchBudget();
  assert(claim('/sites',100_000));assert(!claim('/sites',100_001));
  assert(claim('/images',100_002));assert(claim('/developers',100_003));assert(!claim('/pricing',100_004));
  assert(claim('/pricing',110_001));assert(!claim('/sites',110_002));assert(claim('/sites',130_001));
});
test('navigation cannot double its request budget at a time-window boundary',()=>{
  const claim=createIntentPrefetchBudget();
  assert(claim('/first',100_000));assert(claim('/second',109_998));assert(claim('/third',109_999));
  assert(claim('/fourth',110_000));
  assert(!claim('/fifth',110_001));assert(!claim('/sixth',110_002));
  assert(claim('/fifth',119_998));
});
test('initial recovery grace period survives hide/show and can be cancelled without a request',async()=>{
  const c=clock();let calls=0;
  const stop=startActivityPolling(async()=>{calls++;return 8000;},c.environment,4000);
  await c.advance(2000);c.activity(false);c.activity(true);await c.advance(1999);assert.equal(calls,0);
  await c.advance(1);assert.equal(calls,1);stop();
  const cancel=startActivityPolling(async()=>{calls++;return 8000;},c.environment,4000);
  cancel();await c.advance(60_000);assert.equal(calls,1);
});
test('recovery failures back off, preserve jitter at the cap and respect server hints',()=>{
  assert.equal(recoveryDelay(1,null,0,0),8000);assert.equal(recoveryDelay(2,null,0,0),16000);
  assert.equal(recoveryDelay(3,null,0,0),32000);assert.equal(recoveryDelay(50,null,0,0),50000);
  assert.equal(recoveryDelay(50,null,0,1),60000);assert.equal(recoveryDelay(2,null,0,1),19200);
  assert.equal(recoveryDelay(1,'90',0,1),90000);
  assert.equal(recoveryDelay(1,new Date(120_000).toUTCString(),10_000,0),110000);
});
test('five-minute failed recovery fixture makes at most eight checks and never catches up after inactivity',async()=>{
  const c=clock();let calls=0;
  const stop=startActivityPolling(async()=>recoveryDelay(++calls,null,0,0),c.environment,4000);
  await c.advance(299_999);assert.equal(calls,8);
  c.activity(false);await c.advance(300_000);assert.equal(calls,8);
  c.activity(true);await c.advance(0);assert.equal(calls,9);stop();
});
test('very long server hints are chunked without early polling or timer overflow',async()=>{
  const c=clock();let calls=0;
  const delay=3_000_000_000;
  const stop=startActivityPolling(async()=>{calls++;return delay;},c.environment);
  await c.advance(0);await c.advance(2_147_483_647);assert.equal(calls,1);
  c.activity(false);c.activity(true);await c.advance(delay-2_147_483_647-1);assert.equal(calls,1);
  await c.advance(1);assert.equal(calls,2);stop();
});
