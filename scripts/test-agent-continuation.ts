import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentRuntime, AgentContinuationError, type AgentCheckpoint } from '../src/sdk/agent.js';
import { APIError } from '../src/sdk/errors.js';
import { GalxAIClientCore } from '../src/sdk/client.js';
import { ChatCompletionStream } from '../src/sdk/stream.js';

const advanceRetry=(t:any,session:any)=>{const now=Math.max(Date.now(),session.export().checkpoint?.retryAtMs??0)+1;t.mock.method(Date,'now',()=>now);};
const call={id:'once',type:'function',function:{name:'work',arguments:'{}'}};
const reply=(tools=false)=>({id:'test',object:'chat.completion',created:1,model:'fixture',choices:[{index:0,message:{role:'assistant',content:tools?null:'Finished',...(tools?{tool_calls:[call]}:{})},finish_reason:tools?'tool_calls':'stop'}]});
const stopped=(state='failed')=>APIError.fromResponse(503,{error:{message:'Paused',execution_state:state}});
const facade=(next:(request:any)=>Promise<any>)=>({create:next,stream:(request:any)=>new ChatCompletionStream((async function*(){const r=await next(request);yield {...r,choices:[{index:0,delta:r.choices[0].message,finish_reason:r.choices[0].finish_reason}]};})())});

for(const streaming of [false,true])test(`${streaming?'stream':'JSON'} continuation preserves tool results and the original budget across process restoration`,async(t)=>{
  let requests=0,tools=0;const payloads:any[]=[],saved:AgentCheckpoint[]=[];
  const config={maxSteps:4,maxOutputTokens:700,onCheckpoint:(state:AgentCheckpoint)=>{saved.push(state);},tools:{work:()=>{tools++;return 'committed';}}};
  const transport=facade(async request=>{payloads.push(structuredClone(request));requests++;if(requests===1)return reply(true);if(requests===2)throw stopped();return reply();});
  const session=new AgentRuntime(transport as any,config).startSession();
  await assert.rejects(async()=>{if(streaming){for await(const _ of session.stream('Work')){}}else await session.run('Work');},e=>e instanceof AgentContinuationError&&e.recovery==='wait');
  assert.equal(tools,1);assert.equal(requests,2);assert.equal(session.getRecovery().action,'wait');advanceRetry(t,session);assert.equal(session.getRecovery().action,'continue');
  const snapshot=session.export();assert.equal(snapshot.checkpoint?.status,'ready');assert.equal(snapshot.messages.at(-1)?.content,'committed');
  const charged=snapshot.checkpoint!.chargedTokens;
  await assert.rejects(()=>session.run('Repeat work'),/unfinished turn/);
  const resumed=new AgentRuntime(transport as any,config).resumeSession(snapshot);
  const result=await resumed.resume();assert.equal(result.text,'Finished');assert.equal(tools,1);assert.equal(requests,3);
  assert.equal(result.stepsCount,3);assert.equal(result.toolCallsExecuted.length,1);assert(resumed.export().checkpoint!.chargedTokens>charged);
  assert(payloads.every(p=>p.max_tokens===700));assert.equal(new Set(payloads.map(p=>p.turn_id)).size,3);
  assert(payloads[2].messages.some((m:any)=>m.role==='tool'&&m.content==='committed'));
  assert(saved.some(c=>c.status==='tools_pending'&&c.toolCallsExecuted.length===0),'write intent precedes execution');
  assert(saved.some(c=>c.status==='tools_pending'&&c.toolCallsExecuted.length===1),'record output before another step');
  snapshot.messages[0].content='tampered';assert.notEqual(resumed.getHistory()[0].content,'tampered');
});

test('unknown model outcomes block continuation and preserve progress without replay',async()=>{
  let requests=0;const session=new AgentRuntime({create:async()=>{requests++;throw Error('connection lost');}} as any).startSession();
  await assert.rejects(()=>session.run('Work'),e=>e instanceof AgentContinuationError&&e.recovery==='review');
  assert.equal(session.export().checkpoint!.status,'model_pending');assert.equal(session.getRecovery().action,'review');
  await assert.rejects(()=>session.resume(),/Check the previous/);assert.equal(requests,1);
});

test('repeated explicit continuation cannot refill the original step or token budget',async(t)=>{
  let requests=0;const transport={create:async()=>{requests++;throw stopped('not_accepted');}};
  const session=new AgentRuntime(transport as any,{maxSteps:2,maxTotalTokens:10000,maxOutputTokens:200}).startSession();
  await assert.rejects(()=>session.run('Work'));advanceRetry(t,session);await assert.rejects(()=>session.resume());advanceRetry(t,session);
  const restored=new AgentRuntime(transport as any,{maxSteps:100,maxTotalTokens:1000000}).resumeSession(session.export());
  await assert.rejects(()=>restored.resume(),e=>e instanceof AgentContinuationError&&e.recovery==='budget_exhausted');assert.equal(requests,2);
  const limited=new AgentRuntime(transport as any,{maxTotalTokens:1400,maxOutputTokens:200}).startSession();
  await assert.rejects(()=>limited.run('Work'));const before=requests;advanceRetry(t,limited);
  await assert.rejects(()=>limited.resume(),e=>e instanceof AgentContinuationError&&e.code==='turn_budget_exceeded');assert.equal(requests,before);
});

test('large tool results stop before another model request; explicit compaction retains complete recent tool groups',async()=>{
  let requests=0;const session=new AgentRuntime({create:async()=>{requests++;return reply(true);}} as any,{maxInputBytes:1400,tools:{work:()=> 'x'.repeat(4000)}}).startSession();
  await assert.rejects(()=>session.run('Work'),e=>e instanceof AgentContinuationError&&e.recovery==='reduce_context');assert.equal(requests,1);
  assert.equal(session.export().checkpoint?.status,'ready');assert.equal(session.getRecovery().action,'compact');
  const historical=new AgentRuntime({create:async()=>reply()} as any).startSession({messages:[{role:'system',content:'Keep the constraint'},{role:'user',content:'old'.repeat(3000)},{role:'assistant',content:'old answer'},{role:'user',content:'recent'}, {role:'assistant',content:null,tool_calls:[call] as any},{role:'tool',tool_call_id:'once',content:'already done'}]});
  const previous=historical.compact('Earlier work completed; preserve the constraint.',1);
  assert.notEqual(previous.id,historical.sessionId);assert(previous.messages[1].content!.length>8000);
  assert(historical.getHistory().some(m=>m.role==='system'));assert.equal(historical.getHistory().at(-1)?.role,'tool');
  assert(historical.getHistory().some(m=>m.tool_calls?.[0].id==='once'));
  assert(!JSON.stringify(historical.getHistory()).includes('oldoldold'));
});

test('checkpoint write failure prevents inference and callback start',async()=>{
  let requests=0,tools=0;
  const transport={create:async()=>{requests++;return reply(true);}};
  const beforeModel=new AgentRuntime(transport as any,{onCheckpoint:()=>{throw Error('storage unavailable');}});
  await assert.rejects(()=>beforeModel.run('Work'));assert.equal(requests,0);
  const beforeTool=new AgentRuntime(transport as any,{onCheckpoint:s=>{if(s.status==='tools_pending')throw Error('storage unavailable');},tools:{work:()=>{tools++;}}});
  await assert.rejects(()=>beforeTool.run('Work'));assert.equal(requests,1);assert.equal(tools,0);
});

test('parallel callback completion is awaited and checkpointed even when a sibling start is cancelled',async()=>{
  const controller=new AbortController();let saved:AgentCheckpoint|undefined;
  // Direct run accepts cancellation; persisted output survives even though the batch remains unresolved.
  const runtime=new AgentRuntime({create:async()=>({...reply(true),choices:[{index:0,message:{role:'assistant',content:null,tool_calls:[call,{...call,id:'two'}]},finish_reason:'tool_calls'}]})} as any,{onCheckpoint:c=>{saved=c;},tools:{work:async()=>{controller.abort();await new Promise(r=>setTimeout(r,5));return 'committed';}}});
  await assert.rejects(()=>runtime.run('Work',{signal:controller.signal}));
  assert.equal(saved?.status,'tools_pending');assert.equal(saved?.toolCallsExecuted.length,1);assert.equal(saved?.messages.at(-1)?.content,'committed');
});

test('SDK SSE errors and truncated streams cannot become false successful answers',async()=>{
  for(const data of ['data: {"error":{"message":"Stopped","execution_state":"failed"}}\n\n','data: {"choices":[{"delta":{"content":"partial"}}]}\n\n']){
    const core=new GalxAIClientCore({apiKey:'fixture',baseURL:'https://example.test',fetch:async()=>new Response(data,{headers:{'Content-Type':'text/event-stream'}})} as any);
    await assert.rejects(async()=>{for await(const _ of core.requestStream('/v1/chat/completions')){}},(e:any)=>data.includes('execution_state')?e.executionState==='failed'&&e.shouldRetry===false:e.code==='incomplete_stream');
  }
});

test('revision-aware persistence prevents two restored callers from executing the same checkpoint',async(t)=>{
  let requests=0,revision=0;let saved:AgentCheckpoint|undefined;
  const persist=(next:AgentCheckpoint,expected:number)=>{assert.equal(expected,revision,'checkpoint owner changed');revision=next.revision;saved=next;};
  const transport={create:async()=>{requests++;throw stopped();}};
  const first=new AgentRuntime(transport as any,{onCheckpoint:persist});
  await assert.rejects(()=>first.run('Work'));
  const original=structuredClone(saved!);t.mock.method(Date,'now',()=>original.retryAtMs!+1);
  const outcomes=await Promise.allSettled([first.resume(original),first.resume(original)]);
  assert(outcomes.every(o=>o.status==='rejected'));assert.equal(requests,2,'only one of the two restored callers can dispatch');
  assert.equal(original.revision<revision,true);
});

test('a failed initial save retains the input and shows review without leaking store diagnostics',async()=>{
  let requests=0;
  const session=new AgentRuntime({create:async()=>{requests++;return reply();}} as any,{onCheckpoint:()=>{throw Error('PRIVATE_DATABASE_SECRET');}}).startSession();
  await assert.rejects(()=>session.run('Keep this task'),(e:any)=>e.recovery==='review'&&!e.message.includes('PRIVATE'));
  assert.equal(requests,0);assert.equal(session.getHistory().at(-1)?.content,'Keep this task');assert.equal(session.getRecovery().action,'review');
  await assert.rejects(()=>session.resume(),/Check the previous/);assert.equal(requests,0);
});

test('a failed final save retains the answer but cannot authorize a new turn',async()=>{
  let requests=0;
  const session=new AgentRuntime({create:async()=>{requests++;return reply();}} as any,{onCheckpoint:s=>{if(s.status==='complete')throw Error('write failed');}}).startSession();
  await assert.rejects(()=>session.run('Work'),(e:any)=>e.recovery==='review');
  assert.equal(session.getHistory().at(-1)?.content,'Finished');assert.equal(session.getRecovery().action,'review');
  await assert.rejects(()=>session.run('More work'),/unfinished turn/);
  await assert.rejects(()=>session.resume(),/Check the previous/);assert.equal(requests,1);
});

test('parallel results remain in the local snapshot after the first persistence failure without further writes',async()=>{
  let callbacks=0,writes=0;
  const transport={create:async()=>({...reply(true),choices:[{index:0,message:{role:'assistant',content:null,tool_calls:[call,{...call,id:'two'}]},finish_reason:'tool_calls'}]})};
  const session=new AgentRuntime(transport as any,{onCheckpoint:s=>{if(s.toolCallsExecuted.length){writes++;throw Error('write failed');}},tools:{work:()=>{callbacks++;return `committed ${callbacks}`;}}}).startSession();
  await assert.rejects(()=>session.run('Work'),(e:any)=>e.recovery==='review');
  assert.equal(callbacks,2);assert.equal(writes,1);assert.equal(session.export().checkpoint?.toolCallsExecuted.length,2);
  assert.equal(session.getHistory().filter(m=>m.role==='tool').length,2);assert.equal(session.getRecovery().action,'review');
  await assert.rejects(()=>session.resume());assert.equal(callbacks,2);
});

test('capacity waits survive restoration, honor Retry-After and reject click storms without spending another step',async(t)=>{
  let now=Date.now(),requests=0;t.mock.method(Date,'now',()=>now);
  const transport={create:async()=>{requests++;throw APIError.fromResponse(503,{error:{execution_state:'not_accepted'}},{'Retry-After':'120'});}};
  const session=new AgentRuntime(transport as any).startSession();
  await assert.rejects(()=>session.run('Work'));
  const before=session.export();assert(before.checkpoint!.retryAtMs!>=now+120000);
  const restored=new AgentRuntime(transport as any).resumeSession(before);
  for(let i=0;i<100;i++)await assert.rejects(()=>restored.resume(),(e:any)=>e.code==='continuation_wait');
  assert.equal(requests,1);assert.equal(restored.export().checkpoint?.steps,1);assert.equal(restored.export().checkpoint?.chargedTokens,before.checkpoint?.chargedTokens);
  assert.equal(restored.getRecovery().action,'wait');now=before.checkpoint!.retryAtMs!+1;
  assert.equal(restored.getRecovery().action,'continue');await assert.rejects(()=>restored.resume());assert.equal(requests,2);
});

test('tool fan-out stays bounded and a persistence failure stops queued callbacks while retaining in-flight results',async()=>{
  for(const fail of [false,true]){
    let active=0,peak=0,started=0,model=0;
    const tools=Array.from({length:12},(_,i)=>({...call,id:`call_${i}`}));
    const transport={create:async()=>++model===1?({...reply(true),choices:[{index:0,message:{role:'assistant',content:null,tool_calls:tools},finish_reason:'tool_calls'}]}):reply()};
    const session=new AgentRuntime(transport as any,{maxConcurrentTools:2,onCheckpoint:s=>{if(fail&&s.toolCallsExecuted.length)throw Error('store offline');},tools:{work:async()=>{started++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;return 'committed';}}}).startSession();
    if(fail)await assert.rejects(()=>session.run('Work'));else await session.run('Work');
    assert.equal(peak,2);assert.equal(active,0);assert.equal(started,fail?2:12);assert.equal(session.export().checkpoint?.toolCallsExecuted.length,started);
    assert.equal(model,fail?1:2);
  }
});
