import test from 'node:test';
import assert from 'node:assert/strict';
import { SitesContextCache, recallQuery } from '../src/lib/sites/hybrid-context';
import { completedTurnPairs, conversationMessages } from '../src/lib/sites/conversation-context';
import type { SiteMessage } from '../src/lib/sites/workspace-contract';
const snapshot={user_id:'alice',id:'site',revision:1,turn_count:20,context_start_turn:0,operation_id:null,updated_at:new Date(1000)};
const pair=(turn:number,text='A decision'):SiteMessage[]=>[{id:`${turn}:u`,turn,role:'user',text,status:'completed'},{id:`${turn}:a`,turn,role:'assistant',text:'Agreed: '+text,status:'completed'}];
test('hybrid snapshots isolate accounts, revisions, pending work and restored context epochs',()=>{
  const cache=new SitesContextCache(),key=cache.key(snapshot,'recent');cache.put(key,{messages:pair(1)});
  for(const change of [{user_id:'bob'},{id:'other'},{revision:2},{turn_count:21},{context_start_turn:20},{operation_id:'pending'},{updated_at:new Date(1001)}])assert.equal(cache.get(cache.key({...snapshot,...change},'recent')),undefined);
  assert.equal(cache.get(cache.key(snapshot,'recall','budget')),undefined);
  const read=cache.get<{messages:SiteMessage[]}>(key)!;read.messages[0].text='tampered';assert.equal(cache.get<{messages:SiteMessage[]}>(key)!.messages[0].text,'A decision');
});
test('hybrid cache expires, bounds count and bytes, and can be discarded without durable side effects',()=>{
  let clock=1;const cache=new SitesContextCache(()=>clock,2,100,10);
  cache.put('a',{text:'a'});clock++;cache.put('b',{text:'b'});clock++;cache.get('a');cache.put('c',{text:'c'});
  assert.equal(cache.get('b'),undefined);assert(cache.get('a'));cache.put('large','x'.repeat(101));assert.equal(cache.get('large'),undefined);
  clock=20;assert.equal(cache.get('a'),undefined);cache.clear();assert.equal(cache.get('c'),undefined);
  const bounded=new SitesContextCache(()=>1,50,25);bounded.put('a','x'.repeat(20));bounded.put('b','y'.repeat(20));assert.equal(bounded.get('a'),undefined);assert(bounded.get('b'));
});
test('lexical recall strips operators and common instructions and bounds query work',()=>{
  assert.equal(recallQuery('Please update the page with our Cedar budget.'),'cedar OR budget');
  assert(!recallQuery("'); SELECT * FROM private.secrets; --").includes("'"));
  assert(recallQuery('预算 Café ＣＥＤＡＲ').includes('cedar'));assert.equal(recallQuery('please make this page'), '');
  assert.equal(recallQuery(Array.from({length:50},(_,i)=>`word${i}`).join(' ')).split(' OR ').length,12);
});
test('context keeps complete pairs and rejects orphaned, failed and mismatched turns',()=>{
  assert.deepEqual(completedTurnPairs([{id:'orphan',role:'assistant',text:'Ignore'},...pair(2),...pair(3).map(m=>({...m,status:'failed' as const})),{...pair(4)[0],turn:4},{...pair(4)[1],turn:5}]),[pair(2)]);
});
test('recall supplies earlier decisions without repeating recent turns or cutting UTF-8 pairs',()=>{
  const input=conversationMessages('What was our Cedar budget?',{document:null,notes:'Current budget is 200.',summary:'Keep the name Cedar.',intent:'discuss',
    messages:[...pair(10),...pair(11),...pair(12)],recalled:[...pair(2,'Cedar proposal was 100.'),...pair(11),...pair(2),...pair(3,'界'.repeat(1800))]});
  const data=JSON.parse(input[1].content);assert.equal(data.earlier_conversation.length,1);assert.equal(data.earlier_conversation[0].turn,2);
  assert.equal(data.recent_conversation.length,6);assert.equal(data.project_notes,'Current budget is 200.');assert(Buffer.byteLength(JSON.stringify(input))<=12000);
  assert.match(input[0].content,/Never revive a superseded proposal/);
});
