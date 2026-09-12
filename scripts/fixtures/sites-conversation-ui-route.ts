/** Copy only into an isolated local review app. Never a production route. */
import { randomUUID } from 'node:crypto';
const now=()=>new Date().toISOString();
const doc={schema_version:1,title:'Daylight. A calmer week.',summary:'A thoughtful planner for small teams who want more space for meaningful work.',sections:[{heading:'Plan with intention',body:'Bring tasks, priorities, and people into one considered weekly plan.'},{heading:'Make room for focus',body:'A little structure helps your team spend less time coordinating and more time doing the work that matters.'}]};
const seed=(id:string,title:string)=>({id,title,revision:4,version:2,publishedVersion:1,updatedAt:now(),document:{...doc,title},messages:[{id:randomUUID(),role:'user',text:'Create a page for a thoughtful weekly planner called Daylight. Our audience is small teams.',turn:1,status:'completed'},{id:randomUUID(),role:'assistant',text:'I’ve created an introduction and two sections about planning together and making room for focus.',turn:1,status:'completed',version:1},
{id:randomUUID(),role:'user',text:'Keep the audience and tone. Make the summary warmer.',turn:2,status:'completed'},{id:randomUUID(),role:'assistant',text:'I’ve made the introduction warmer while keeping the focus on small teams and a calmer working week.',turn:2,status:'completed',version:2}],generating:false,archived:false,published:true,address:{hostname:'daylight.alice.galx.ai',status:'active',url:'https://daylight.alice.galx.ai'},context:{notes:'Audience: small teams.\nTone: warm, clear, and considered.\nKeep the name Daylight.',summary:'Daylight is a weekly planner for small teams. Keep a warm, calm tone. The introduction now emphasizes making room for meaningful work.'},historyCursor:1});
const state=(globalThis as any).__sitesReview ||= {sites:[seed('b410d62b-e1c9-49ce-a051-593092b37dbf',doc.title),seed('5805aa30-bb13-45d3-a94e-7063c951b021','Neighborhood makers market')],versions:new Map(),requests:[]};
for(const s of state.sites)if(!state.versions.has(s.id))state.versions.set(s.id,[{version:2,label:'Make the summary warmer.',createdAt:now(),document:s.document},{version:1,label:'Create a page for Daylight.',createdAt:now(),document:{...s.document,summary:'Plan a calmer week.'}}]);
export async function GET(request:Request){
 const u=new URL(request.url),id=u.searchParams.get('id'),site=state.sites.find((s:any)=>s.id===id);
 if(u.searchParams.get('view')==='setup')return Response.json({access:'included',publishing:'available',username:'alice'});
 if(u.searchParams.get('view')==='library')return Response.json({sites:state.sites});
 if(!site)return Response.json({error:{code:'site_not_found'}},{status:404});
 if(u.searchParams.get('view')==='history')return Response.json({messages:[{id:'earlier',role:'user',text:'Earlier project idea: a calmer week for everyone.',turn:1,status:'completed'}],cursor:null});
 if(u.searchParams.get('view')==='versions')return Response.json({versions:state.versions.get(id).map(({document:_,...v}:any)=>v),cursor:null});
 if(u.searchParams.has('version')){const v=state.versions.get(id).find((v:any)=>v.version===Number(u.searchParams.get('version')));return Response.json({version:v.version,document:v.document});}
 return Response.json({site});
}
export async function POST(request:Request){
 const body=await request.json();state.requests.push(body);let site=state.sites.find((s:any)=>s.id===body.id);
 if(body.action==='create'){await new Promise(resolve=>setTimeout(resolve,5000));site={...seed(body.id,body.title),revision:0,version:0,publishedVersion:null,document:null,messages:[],context:{notes:'',summary:''},published:false,address:null,historyCursor:null};state.sites.unshift(site);state.versions.set(site.id,[]);}
 if(!site)return Response.json({error:{code:'site_not_found'}},{status:404});
 if(body.action==='generate'){
  if(body.brief.startsWith('Check a rejected first request'))return Response.json({error:{code:'rate_limited'}},{status:429});
  site.generating=true;const turn=site.messages.length+1;site.messages.push({id:body.operationId+':user',role:'user',text:body.brief,turn,status:'pending'});
  await new Promise(resolve=>setTimeout(resolve,7000));
  if(body.intent==='build'){site.document={...(site.document || doc),summary:'Bring your best ideas into the week. Daylight helps small teams find focus, together.'};site.version++;state.versions.get(site.id).unshift({version:site.version,label:body.brief.slice(0,200),createdAt:now(),document:site.document});}
  site.messages.at(-1).status='completed';site.messages.push({id:body.operationId+':assistant',role:'assistant',text:body.intent==='discuss'?'A shorter introduction would make the page easier to scan. Keep the warm tone and focus on small teams. Shall I apply that change?':'I’ve made the summary more inviting while preserving the small-team audience and warm tone.',turn,status:'completed',version:body.intent==='build'?site.version:null});site.context.summary='Daylight is for small teams. Keep a warm tone. The conversation now focuses on a shorter, inviting introduction.';site.generating=false;site.revision++;
 }
 if(body.action==='context'){site.context.notes=body.notes;site.revision++;}
 if(body.action==='restore'){site.document=state.versions.get(site.id).find((v:any)=>v.version===body.version).document;site.version++;site.revision++;site.messages.push({id:randomUUID(),role:'assistant',text:`Restored version ${body.version} as version ${site.version}. Your published Site is unchanged.`,version:site.version,status:'completed'});state.versions.get(site.id).unshift({version:site.version,label:`Restored version ${body.version}`,createdAt:now(),document:site.document});}
 if(body.action==='rename'){site.title=body.title;site.revision++;}
 if(body.action==='archive'){site.archived=body.archived;site.revision++;}
 if(body.action==='publish'){site.published=true;site.publishedVersion=site.version;site.revision++;}
 if(body.action==='unpublish'){site.published=false;site.publishedVersion=null;site.revision++;}
 site.updatedAt=now();return Response.json({site});
}
