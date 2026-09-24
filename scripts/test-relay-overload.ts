import assert from 'node:assert/strict';
import test from 'node:test';
import { PoolExecution } from '../src/relay/pool-execution.js';
import { RequestBulkhead } from '../src/relay/request-bulkhead.js';

const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
async function until(predicate:()=>boolean){for(let i=0;i<200;i++){if(predicate())return;await tick();}throw Error('Fixture did not reach expected state');}
function fixture(){
  let now=0,lease=0;
  const rows=new Map<string,any>();
  const c={finishActive:0,finishPeak:0,finishes:0,pending:0,settles:0,settleActive:0,settlePeak:0,failSettle:false,failBind:false,failFinish:false,gate:undefined as Promise<void>|undefined};
  const store={call:async(action:string,b:any={})=>{
    if(action==='reserve'){const row={...b,state:'reserved'};rows.set(b.requestKey,row);return row;}
    const row=rows.get(b.requestKey);
    if(action==='bind'){if(c.failBind)throw Error('bind unavailable');Object.assign(row,{leaseId:b.leaseId,state:'running'});return row;}
    if(action==='finish'){c.finishes++;c.finishActive++;c.finishPeak=Math.max(c.finishPeak,c.finishActive);await tick();c.finishActive--;if(c.failFinish)throw Error('write unavailable');Object.assign(row,{state:'completed',success:b.success});return row;}
    if(action==='pending'){c.pending++;return [...rows.values()].filter(r=>r.state==='completed'&&!r.settled);}
    if(action==='settled'){row.settled=true;return row;}
    throw Error('Unexpected store action');
  }};
  const central={identity:{pool:'premium'},call:async(route:string)=>{
    if(route==='/runtime/acquire')return{leaseId:`lease_${++lease}`,expiresAtMs:Date.now()+30000,fencingToken:1};
    assert.equal(route,'/runtime/settle');c.settles++;c.settleActive++;c.settlePeak=Math.max(c.settlePeak,c.settleActive);
    try{await c.gate;return{success:!c.failSettle};}finally{c.settleActive--;}
  }};
  const execution=new PoolExecution(central as any,store,'fixture-epoch',{now:()=>now,random:()=>0.5});
  const account={id:'own',revision:1,assignmentRevision:1,credentialRevision:'revision',state:'enabled' as const,desktopId:'desktop',models:['fixture'],expiresAtMs:Date.now()+600000};
  const admit=(id:string)=>execution.policy(account).admit({url:'/v1/chat/completions',headers:{'idempotency-key':id}} as any,{messages:[{role:'user',content:id}]},'owner',id);
  return{execution,rows,c,admit,advance:(n:number)=>{now+=n;}};
}

test('completion storms persist once and do not wait for a stalled remote settlement',async()=>{
  const f=fixture();let release!:()=>void;f.c.gate=new Promise<void>(r=>{release=r;});
  try{
    const grants=await Promise.all(Array.from({length:4},(_,i)=>f.admit(`job_${i}`)));
    await Promise.all(grants.map(g=>g.complete(true,10)));
    await until(()=>f.c.settles===1);
    assert.equal(f.c.finishes,4);assert.equal(f.c.finishPeak,1);assert.equal(f.execution.accountAvailable('own'),true);
    const pending=Array.from({length:100},()=>f.execution.settlePending());assert(pending.every(p=>p===pending[0]));
    assert.equal(f.c.pending,1);assert.equal(f.c.settles,1);release();await Promise.all(pending);
    assert.equal(f.c.settles,4);assert.equal(f.c.settlePeak,1);assert([...f.rows.values()].every(r=>r.settled));
  }finally{release();f.execution.stop();await f.execution.settlePending();}
});

test('settlement failure stops fan-out, backs off and drains only eight retained receipts per pass',async()=>{
  const f=fixture();for(let i=0;i<20;i++)f.rows.set(`r${i}`,{requestKey:`r${i}`,epoch:'original-epoch',leaseId:`l${i}`,state:'completed',success:true});
  f.c.failSettle=true;await f.execution.settlePending();assert.equal(f.c.settles,1);
  await Promise.all(Array.from({length:100},()=>f.execution.settlePending()));assert.equal(f.c.settles,1);assert.equal(f.c.pending,1);
  f.advance(1499);await f.execution.settlePending();assert.equal(f.c.settles,1);
  f.advance(1);f.c.failSettle=false;await f.execution.settlePending();assert.equal(f.c.settles,9);
  assert.equal([...f.rows.values()].filter(r=>r.settled).length,8);
  await f.execution.settlePending();assert.equal(f.c.settles,9);
  f.advance(1000);await f.execution.settlePending();assert.equal(f.c.settles,17);
  f.advance(1000);await f.execution.settlePending();assert.equal(f.c.settles,21);assert([...f.rows.values()].every(r=>r.settled));
});

test('an acquired but unbound lease is retained and blocks new admission until its exact settlement succeeds',async()=>{
  const f=fixture();f.c.failBind=true;f.c.failSettle=true;
  await assert.rejects(()=>f.admit('failed-bind'));assert.equal(f.c.settles,1);
  await assert.rejects(()=>f.admit('must-wait'));assert.equal(f.rows.size,1);
  f.advance(2000);f.c.failSettle=false;f.c.failBind=false;await f.execution.settlePending();
  const grant=await f.admit('after-reconciliation');await grant.complete(true);f.execution.stop();await f.execution.settlePending();
});

test('request bulkheads bound total work and each owner without queuing or stale-release leaks',()=>{
  const gate=new RequestBulkhead(),releases:Array<()=>void>=[];
  for(const owner of ['a','b','c','d']){for(let i=0;i<8;i++)releases.push(gate.reserve(owner)!);assert.equal(gate.reserve(owner),undefined);}
  assert.equal(gate.reserve('e'),undefined);releases[0]();const latest=gate.reserve('e')!;assert(latest);releases[0]();assert.equal(gate.reserve('f'),undefined);
  releases.forEach(release=>release());latest();assert.equal((gate as any).owners.size,0);assert.equal((gate as any).active,0);
});
