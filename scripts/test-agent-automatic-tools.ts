import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentRuntime } from '../src/sdk/agent.js';
import { ChatCompletionStream } from '../src/sdk/stream.js';

const call=(id:string,args='{}',name='work')=>({id,type:'function',function:{name,arguments:args}});
const reply=(calls?:any[])=>({id:'response',object:'chat.completion',created:1,model:'fixture',choices:[{index:0,message:{role:'assistant',content:calls?null:'Finished',...(calls?{tool_calls:calls}:{})},finish_reason:calls?'tool_calls':'stop'}]});
const facade=(next:(request:any)=>Promise<any>)=>({create:next,stream:(r:any)=>new ChatCompletionStream((async function*(){const result=await next(r);const c=result.choices[0];yield {...result,choices:[{index:0,delta:{content:c.message.content,...(c.message.tool_calls?{tool_calls:c.message.tool_calls.map((x:any,index:number)=>({index,...x}))}:{})},finish_reason:c.finish_reason}]};})())});

for(const streaming of [false,true]){
  const run=async(agent:AgentRuntime,options:any={})=>{if(!streaming)return agent.run('Work',options);for await(const e of agent.stream('Work',options))if(e.type==='finish')return e.result;};
  test(`automatic ${streaming?'stream':'run'} corrects malformed arguments without executing them`,async()=>{
    let steps=0,executions=0;
    const agent=new AgentRuntime(facade(async r=>{
      steps++;
      if(steps===1)return reply([call('a','{bad')]);
      if(steps===2){assert(r.messages.at(-1).content.includes('required schema'));return reply([call('b','{"value":"wrong"}')]);}
      if(steps===3){assert(r.messages.at(-1).content.includes('required schema'));return reply([call('c','{"value":3}')]);}
      assert.equal(r.messages.at(-1).content,'4');return reply();
    }) as any,{tools:{work:{schema:{safeParse:(value:any)=>typeof value?.value==='number'?{success:true,data:value}:{success:false}},execute:({value}:any)=>{executions++;return value+1;}}}});
    assert.equal((await run(agent))?.text,'Finished');assert.equal(steps,4);assert.equal(executions,1);
  });
  test(`automatic ${streaming?'stream':'run'} rejects duplicate calls before executing a batch`,async()=>{
    let executions=0;
    const agent=new AgentRuntime(facade(async()=>reply([call('same'),call('same')])) as any,{tools:{work:()=>{executions++;}}});
    await assert.rejects(()=>run(agent),/repeated tool call/);assert.equal(executions,0);
  });
  test(`automatic ${streaming?'stream':'run'} never reexecutes a call from an earlier step`,async()=>{
    let executions=0;
    const agent=new AgentRuntime(facade(async()=>reply([call('same')])) as any,{tools:{work:()=>{executions++;return 'ok';}}});
    await assert.rejects(()=>run(agent),/repeated tool call/);assert.equal(executions,1);
  });
  test(`automatic ${streaming?'stream':'run'} honors cancellation between callbacks`,async()=>{
    const controller=new AbortController();let executions=0;
    const agent=new AgentRuntime(facade(async()=>reply([call('a'),call('b')])) as any,{parallelToolExecution:false,tools:{work:()=>{executions++;controller.abort();return 'stopped';}}});
    await assert.rejects(()=>run(agent,{signal:controller.signal}),{name:'AbortError'});assert.equal(executions,1);
  });
}

test('a missing executor fails before inference instead of returning invented success',async()=>{
  let requests=0;
  const agent=new AgentRuntime({create:async()=>{requests++;return reply();}} as any,{tools:{work:{description:'Missing callback'}}});
  await assert.rejects(()=>agent.run('Work'),/must provide/);assert.equal(requests,0);
});

test('automatic continuation retains a configured step bound',async()=>{
  let requests=0,executions=0;
  const agent=new AgentRuntime({create:async()=>reply([call(`call_${requests++}`)])} as any,{maxSteps:2,tools:{work:()=>{executions++;return 'ok';}}});
  await assert.rejects(()=>agent.run('Work'),/maximum execution steps/);assert.equal(requests,2);assert.equal(executions,2);
});
