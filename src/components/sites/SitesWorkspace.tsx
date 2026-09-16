'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight, Plus, Globe2, Monitor, Smartphone, RefreshCw, Check, ChevronDown, MessageSquare, PanelsTopLeft, Search, Download, X, Archive, Pencil, LoaderCircle, LockKeyhole, History, NotebookPen, ArrowDown, RotateCcw, Copy, List, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspaceSessionBoundary } from '@/components/auth/WorkspaceSessionBoundary';
import { renderSitePreview } from '@/lib/sites/site-preview';
import { type SiteDocument, type SiteSummary, type SiteIntent, type SiteVersion } from '@/lib/sites/workspace-contract';
import { SITE_STARTERS, type SiteStarterSelection } from '@/lib/sites/starters';
import { PRO_PLAN } from '@/lib/billing/pro-plan';
import { GenerationGateNotice, useGenerationGate } from '@/components/dashboard/GenerationGateNotice';
import { useSitesWorkspace } from './use-sites-workspace';
import { SiteNotesEditor } from './SiteNotesEditor';
import { SiteContentPanel } from './SiteContentPanel';
import './sites.css';

const EXAMPLE: SiteDocument = { schema_version:1,title:'Good ideas deserve a place to grow.',summary:'Introduce your next project with a considered, simple website. Start with an idea. Make it your own, one conversation at a time.',sections:[{heading:'A little about you',body:'Your story, your work, and the details that make this yours. A clear introduction gives people a reason to stay.'},{heading:'Something worth sharing',body:'Bring your offering into focus. Tell visitors what they can discover, and what you want them to do next.'}] };
const stateLabel = (s: SiteSummary) => s.archived ? 'Archived' : s.generating ? 'Replying' : s.published && s.address?.status === 'active' ? 'Live' : s.published && s.address ? 'Address pending' : 'Draft';
export function SitesWorkspace({initialId,initialStarter}: {initialId?:string;initialStarter?:SiteStarterSelection}) {
  const {user,isLoading} = useAuth();
  return <WorkspaceSessionBoundary><Workspace key={user?.id || 'guest'} owner={user?.id || null} token={user?.token} authLoading={isLoading} initialId={initialId} initialStarter={initialStarter} /></WorkspaceSessionBoundary>;
}
function Workspace({owner,token,authLoading,initialId,initialStarter}: {owner:string|null;token?:string;authLoading:boolean;initialId?:string;initialStarter?:SiteStarterSelection}) {
  const studio = useSitesWorkspace(owner,token,initialId);
  const gate=useGenerationGate('sites',studio.access==='free');
  const workspaceRef=useRef<HTMLElement>(null);
  useEffect(()=>{
    const element=workspaceRef.current;if(!element)return;
    const resize=()=>element.style.setProperty('--sites-available-height',`${Math.max(640,window.innerHeight-element.getBoundingClientRect().top-window.scrollY)}px`);
    const observer=new ResizeObserver(resize),header=document.querySelector('header');
    if(header)observer.observe(header);window.addEventListener('resize',resize);resize();
    return()=>{observer.disconnect();window.removeEventListener('resize',resize);};
  },[]);
  const [prompt,setPrompt] = useState(''), [tab,setTab] = useState<'chat'|'sites'|'context'|'history'>('chat'), [mobile,setMobile] = useState<'chat'|'preview'>('chat');
  const [device,setDevice] = useState<'desktop'|'mobile'>('desktop'), [search,setSearch] = useState(''), [archived,setArchived] = useState(false);
  const [publishOpen,setPublishOpen] = useState(false), [username,setUsername] = useState(''), [rename,setRename] = useState(false), [title,setTitle] = useState('');
  const [notice,setNotice] = useState(''),[intent,setIntent]=useState<SiteIntent>('build'),[canvas,setCanvas]=useState<'preview'|'content'>('preview');
  const [versions,setVersions]=useState<SiteVersion[]>([]),[versionCursor,setVersionCursor]=useState<number|null>(null),[versionBusy,setVersionBusy]=useState(false);
  const [checkpoint,setCheckpoint]=useState<{version:number;document:SiteDocument}|null>(null),[restoreOpen,setRestoreOpen]=useState(false),[unread,setUnread]=useState(false);
  const stick=useRef(true),scrollAnchor=useRef<{height:number;top:number}|null>(null),draftValue=useRef(''),activeDraftKey=useRef(''),versionRequest=useRef(0),draftTransfer=useRef<{key:string;text:string;intent:SiteIntent}|null>(null),submitting=useRef(false);
  const promptRef = useRef<HTMLTextAreaElement>(null), messagesRef = useRef<HTMLDivElement>(null);
  const appliedStarter = useRef<string | null>(null);
  const {site,busy} = studio;
  const openingSite = studio.openingSite || Boolean(initialId && authLoading);
  const preview = useMemo(() => renderSitePreview(checkpoint?.document || site?.document || EXAMPLE,true),[checkpoint?.document,site?.document]);
  const draftKey = `galx-sites-draft:${owner || 'guest'}:${studio.selectedId || 'new'}`;
  activeDraftKey.current=draftKey;draftValue.current=prompt;
  useEffect(() => {let value='',mode:SiteIntent='build';try{let saved=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(!saved && owner && !studio.selectedId){saved=JSON.parse(sessionStorage.getItem('galx-sites-draft:guest:new')||'null');if(saved){sessionStorage.setItem(draftKey,JSON.stringify(saved));sessionStorage.removeItem('galx-sites-draft:guest:new');}}value=typeof saved?.text==='string'?saved.text.slice(0,1800):'';mode=saved?.intent==='discuss'?'discuss':'build';}catch{}
    if(draftTransfer.current?.key===draftKey){value=draftTransfer.current.text;mode=draftTransfer.current.intent;draftTransfer.current=null;}
    else if(!submitting.current && !value){try{const pending=JSON.parse(sessionStorage.getItem(draftKey+':submitted') || 'null');if(typeof pending?.text==='string'){value=pending.text.slice(0,1800);mode=pending.intent==='discuss'?'discuss':'build';}}catch{}}
    if(!initialId && !studio.selectedId && initialStarter && appliedStarter.current!==initialStarter.href){
      appliedStarter.current=initialStarter.href;
      if(!value.trim()) {value=initialStarter.brief;mode='build';try{sessionStorage.setItem(draftKey,JSON.stringify({text:value,intent:mode}));}catch{}}
      else if(value!==initialStarter.brief) setNotice(`Your unsent draft is still here. Send or clear it before choosing “${initialStarter.name}” below.`);
    }
    setPrompt(value);draftValue.current=value;setIntent(mode);},[draftKey,initialId,initialStarter,studio.selectedId,owner]);
  useEffect(()=>{setCheckpoint(null);setRestoreOpen(false);setVersions([]);setVersionCursor(null);setVersionBusy(false);setCanvas('preview');stick.current=true;setUnread(false);studio.resetHistory();++versionRequest.current;},[site?.id]); // Each Site owns its draft and context.
  const tail=site?.messages.at(-1);
  const hasConversation=Boolean(site?.messages.length || studio.earlier.length || site?.generating || busy);
  useEffect(() => {
    const node=messagesRef.current;if(!node)return;
    if(!hasConversation){node.scrollTop=0;scrollAnchor.current=null;setUnread(false);return;}
    if(scrollAnchor.current){node.scrollTop=scrollAnchor.current.top+node.scrollHeight-scrollAnchor.current.height;scrollAnchor.current=null;return;}
    if(stick.current){node.scrollTo({top:node.scrollHeight,behavior:'instant'});setUnread(false);}else setUnread(true);
  },[tail?.id,tail?.text,tail?.status,site?.messages.length,site?.generating,studio.earlier,tab,hasConversation]);
  useEffect(()=>{const node=messagesRef.current;if(!node)return;const observer=new ResizeObserver(()=>{if(!hasConversation)node.scrollTop=0;else if(stick.current)node.scrollTop=node.scrollHeight;});observer.observe(node);return()=>observer.disconnect();},[tab,site?.id,hasConversation]);
  useEffect(() => { if (studio.username) setUsername(studio.username); },[studio.username]);
  function remember(value:string,mode:SiteIntent=intent) {setPrompt(value);draftValue.current=value;setIntent(mode);try{sessionStorage.setItem(draftKey,JSON.stringify({text:value,intent:mode}));}catch{}}
  function prepareRequest(text:string,mode:SiteIntent='build') {
    if(prompt.trim()){setNotice('Your unsent message is still here. Send or clear it before starting another request.');setTab('chat');setMobile('chat');return;}
    remember(text,mode);setTab('chat');setMobile('chat');requestAnimationFrame(()=>promptRef.current?.focus());
  }
  async function copyMessage(text:string){try{await navigator.clipboard.writeText(text);setNotice('Message copied.');}catch{setNotice('Copy isn’t available here. Select the message text to copy it.');}}
  function choose(next: SiteSummary | null) {
    if (busy) return;
    studio.select(next);setCheckpoint(null);setTab('chat');setMobile('chat');setPublishOpen(false);setRename(false);setNotice('');
    if (!next) requestAnimationFrame(() => promptRef.current?.focus());
  }
  async function submit() {
    if (gate.blocked || !owner || !prompt.trim() || busy || studio.loading || !['included','free'].includes(studio.access) || site?.generating || checkpoint) return;
    const submitted=prompt;let targetKey=draftKey;stick.current=true;submitting.current=true;
    try{sessionStorage.setItem(targetKey+':submitted',JSON.stringify({text:submitted,intent}));}catch{}
    remember('');
    const result = await studio.send(submitted,intent,id=>{
      const nextKey=`galx-sites-draft:${owner}:${id}`;let value={text:draftValue.current,intent};
      try{const saved=JSON.parse(sessionStorage.getItem(targetKey)||'null');if(saved && typeof saved.text==='string')value={text:saved.text,intent:saved.intent==='discuss'?'discuss':'build'};
        sessionStorage.setItem(nextKey,JSON.stringify(value));sessionStorage.setItem(nextKey+':submitted',JSON.stringify({text:submitted,intent}));sessionStorage.removeItem(targetKey);sessionStorage.removeItem(targetKey+':submitted');}catch{}
      draftTransfer.current={key:nextKey,...value};activeDraftKey.current=nextKey;targetKey=nextKey;
    });
    submitting.current=false;
    // A resolved creation owns both the next draft and recovery of a rejected submission.
    if(!result && activeDraftKey.current===targetKey && draftValue.current===''){
      if(draftTransfer.current?.key===targetKey)draftTransfer.current.text=submitted;setPrompt(submitted);draftValue.current=submitted;try{sessionStorage.setItem(targetKey,JSON.stringify({text:submitted,intent}));}catch{}
    }
    if(result || activeDraftKey.current===targetKey)try{sessionStorage.removeItem(targetKey+':submitted');}catch{}
  }
  async function openVersions(more=false){
    if(!site)return;setTab('history');setVersionBusy(true);const id=site.id,request=++versionRequest.current;
    try{const page=await studio.versions(id,more?versionCursor || undefined:undefined);if(request===versionRequest.current){setVersions(old=>more?[...old,...page.versions]:page.versions);setVersionCursor(page.cursor);}}
    catch{if(request===versionRequest.current)studio.setError('Versions couldn’t be loaded. Open History to try again.');}finally{if(request===versionRequest.current)setVersionBusy(false);}
  }
  async function previewVersion(number:number){
    if(!site || busy || versionBusy)return;const request=++versionRequest.current;setVersionBusy(true);setRestoreOpen(false);
    try{const saved=await studio.version(site.id,number);if(request===versionRequest.current){setCheckpoint(saved);setMobile('preview');}}
    catch{if(request===versionRequest.current)studio.setError('This version couldn’t be opened. Try again.');}finally{if(request===versionRequest.current)setVersionBusy(false);}
  }
  const historicalWindow=studio.earlier.length>=160;
  const messages=historicalWindow?studio.earlier:[...studio.earlier.filter(m=>!site?.messages.some(latest=>latest.id===m.id)),...(site?.messages || [])];
  function download() {
    const content=checkpoint?.document ?? site?.document;if (!content) return;
    const url = URL.createObjectURL(new Blob([renderSitePreview(content)],{type:'text/html'}));
    const a = document.createElement('a'); a.href=url; a.download=checkpoint?`site-version-${checkpoint.version}.html`:'site.html'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); setNotice(checkpoint?`Version ${checkpoint.version} was downloaded.`:'Your page was downloaded.');
  }
  const filtered = studio.sites.filter(s => s.archived === archived && s.title.toLowerCase().includes(search.toLowerCase()));
  return <main ref={workspaceRef} className="sites-workspace" aria-label="Sites workspace">
    <div className="sites-heading"><div className="sites-heading-title"><PanelsTopLeft aria-hidden="true" /><h1>Sites</h1><span>A place for your next idea.</span></div>
      <button className="sites-button" onClick={() => choose(null)} disabled={busy}><Plus aria-hidden="true" />New Site</button></div>
    {(studio.error || notice) && <div className="sites-feedback sites-shared-feedback" role={studio.error?'alert':'status'}><p>{studio.error || notice}</p>{studio.error && <button className="sites-text-button" onClick={()=>void studio.refresh()}>Refresh Site<RefreshCw aria-hidden="true" /></button>}<button className="sites-icon" aria-label="Dismiss message" onClick={()=>{studio.setError('');setNotice('');}}><X aria-hidden="true" /></button></div>}
    {studio.connection!=='online' && <div className="sites-connection" role="status"><WifiOff aria-hidden="true"/><p>{studio.connection==='offline'?'You’re offline. Keep drafting, then reconnect before sending.':'Checking your saved progress. Your draft is still here.'}</p>{studio.connection==='reconnecting' && <button className="sites-text-button" onClick={()=>void studio.refresh()}>Check again<RefreshCw aria-hidden="true"/></button>}</div>}
    <div className="sites-mobile-tabs" aria-label="Workspace panels"><button aria-pressed={mobile==='chat'} onClick={() => setMobile('chat')}><MessageSquare aria-hidden="true" />Chat</button><button aria-pressed={mobile==='preview'} onClick={() => setMobile('preview')}><Monitor aria-hidden="true" />Preview</button></div>
    <div className="sites-split" data-mobile-panel={mobile}>
      <section className="sites-conversation" aria-label="Create and manage Sites">
        <nav className="sites-panel-tabs" aria-label="Sites views"><button aria-current={tab==='chat'?'page':undefined} onClick={() => setTab('chat')}><MessageSquare aria-hidden="true" />Chat</button><button aria-current={tab==='sites'?'page':undefined} onClick={() => setTab('sites')}><PanelsTopLeft aria-hidden="true" />My Sites{studio.sites.filter(s=>!s.archived).length>0 && <span>{studio.sites.filter(s=>!s.archived).length}</span>}</button>{site && <><button aria-current={tab==='context'?'page':undefined} onClick={()=>setTab('context')}><NotebookPen aria-hidden="true"/>Context</button><button aria-current={tab==='history'?'page':undefined} onClick={()=>void openVersions()}><History aria-hidden="true"/>History</button></>}</nav>
        {tab==='context' && site ? <div className="sites-context"><h2>Project context</h2><p className="sites-help">Keep the details you want every conversation to remember.</p>
          <SiteNotesEditor key={`${owner}:${site.id}`} storageKey={`galx-sites-notes:${owner}:${site.id}`} saved={site.context.notes} disabled={busy||site.generating||studio.connection==='offline'} onSave={async notes=>{const saved=await studio.change({action:'context',notes});if(saved)setNotice('Project notes saved. They’ll guide your next message.');return saved;}}/><div className="sites-context-summary"><h3>Conversation summary</h3><p>{site.context.summary || 'As you chat, a summary of your decisions and open questions will appear here.'}</p><span className="sites-help">Updated after each reply. To correct a detail, tell us in chat or pin it in your project notes.</span></div>
          <button className="sites-text-button" onClick={()=>setTab('chat')}>Back to chat<ArrowUpRight aria-hidden="true"/></button></div>
        : tab==='history' && site ? <div className="sites-history"><h2>Version history</h2><p className="sites-help">Preview an earlier draft or restore it as a new version. Your published page stays as it is.</p>
          {versionBusy && <p role="status" className="sites-help">Loading version…</p>}{!versionBusy && !versions.length && <p className="sites-help">Your first saved draft will appear here. Discussions don’t create versions.</p>}
          <ol className="sites-version-list">{versions.map(v=><li key={v.version}><button disabled={versionBusy||busy} aria-pressed={checkpoint?.version===v.version} onClick={()=>void previewVersion(v.version)}><span><strong>Version {v.version}</strong><small>{v.version===site.version?'Current draft':v.version===site.publishedVersion?'Published':'Saved draft'} · {new Date(v.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</small></span><p>{v.label}</p></button></li>)}</ol>
          {versionCursor && <button className="sites-button" disabled={versionBusy} onClick={()=>void openVersions(true)}>Load earlier versions</button>}<button className="sites-text-button" onClick={()=>{setCheckpoint(null);setTab('chat');}}>Back to current draft<ArrowUpRight aria-hidden="true"/></button></div>
        : tab==='sites' ? <div className="sites-library"><div className="sites-library-tools"><label className="sites-search"><Search aria-hidden="true" /><input aria-label="Search your Sites" placeholder="Find a Site…" value={search} onChange={e=>setSearch(e.target.value)} /></label><button className="sites-icon" aria-label="Refresh Sites" disabled={studio.loading} onClick={()=>void studio.refresh()}><RefreshCw aria-hidden="true" /></button></div>
          <button className="sites-text-button" aria-pressed={archived} onClick={()=>setArchived(!archived)}>{archived?'Show current Sites':'Show archived Sites'}<ChevronDown aria-hidden="true" /></button>
          {studio.loading && <p role="status" className="sites-help">Loading your Sites…</p>}
          {!studio.loading && !filtered.length && <div className="sites-library-empty"><h2>{search?'No matching Sites':archived?'No archived Sites':'Your ideas will live here.'}</h2><p>{search?'Try another name.':owner?'Start a conversation to create your first Site.':'Sign in to see your saved Sites.'}</p><button className="sites-button" onClick={()=>setTab('chat')}>Start creating<ArrowUpRight aria-hidden="true" /></button></div>}
          <ul className="sites-list">{filtered.map(item=><li key={item.id}><button className="sites-list-item" onClick={()=>choose(item)} aria-current={site?.id===item.id?'true':undefined}><span className="sites-list-art" aria-hidden="true"><span/><span/><span/></span><span><strong>{item.title}</strong><small>{stateLabel(item)} · {new Date(item.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</small></span><ArrowUpRight aria-hidden="true" /></button></li>)}</ul>
        </div> : <>
          <div ref={messagesRef} className="sites-messages" tabIndex={0} role="log" aria-label="Site conversation" aria-live="polite" aria-relevant="additions" onScroll={e=>{const node=e.currentTarget;stick.current=node.scrollHeight-node.scrollTop-node.clientHeight<80;if(stick.current)setUnread(false);}}>
            {studio.historyCursor && <button className="sites-text-button sites-earlier" disabled={studio.historyBusy} onClick={()=>{const node=messagesRef.current;if(node)scrollAnchor.current={height:node.scrollHeight,top:node.scrollTop};void studio.loadEarlier();}}>{studio.historyBusy?'Loading earlier messages…':'Load earlier messages'}</button>}
            {historicalWindow && <p className="sites-help">Viewing earlier conversation. <button className="sites-text-button" onClick={()=>{studio.resetHistory();stick.current=true;}}>Return to latest</button></p>}
            {openingSite && <div className="sites-welcome" role="status"><h2>{studio.loading || authLoading?'Loading your Site…':'This Site is unavailable.'}</h2><p>{studio.loading || authLoading?'Your saved conversation and preview will appear here.':'Choose a saved Site from My Sites, or start a new one.'}</p></div>}
            {!openingSite && (!site || !site.messages.length) && <div className="sites-welcome"><div className="sites-assistant-mark" aria-hidden="true"><PanelsTopLeft /></div><h2>What are we making?</h2><p>Describe your idea. We’ll shape a page together, with your preview right beside you.</p><div className="sites-starters">{SITE_STARTERS.map(starter=><button key={starter.name} onClick={()=>prepareRequest(starter.brief)}>{starter.name}<ArrowUpRight aria-hidden="true" /></button>)}</div><p className="sites-note">Start with a landing page, portfolio, or simple information site. Your draft stays private until you publish.</p></div>}
            {messages.map(message=><div key={message.id} className={`sites-message sites-message-${message.role}`}><span>{message.role==='user'?'You':'GALX'}{message.intent==='discuss'?' · Discuss':''}</span><p>{message.text}</p>{message.status==='pending' && <small>Reply pending</small>}{message.status==='failed' && message.role==='user' && <small>Reply incomplete</small>}
              <div className="sites-message-actions">{message.version && <button className="sites-version-link" onClick={()=>void previewVersion(message.version!)} disabled={busy||versionBusy}>Version {message.version}<History aria-hidden="true"/></button>}
                {message.status!=='pending' && <button className="sites-text-button" onClick={()=>void copyMessage(message.text)} aria-label={`Copy ${message.role==='user'?'your message':'reply'}`}><Copy aria-hidden="true"/>Copy</button>}
                {message.role==='assistant' && message.intent==='discuss' && message.status==='completed' && <button className="sites-text-button" disabled={Boolean(checkpoint)||site?.archived} onClick={()=>prepareRequest(`Use this direction to update my page:\n${message.text}`)}>Continue in Build<ArrowUpRight aria-hidden="true"/></button>}
                {message.role==='user' && message.status==='failed' && <button className="sites-text-button" disabled={Boolean(checkpoint)||site?.archived} onClick={()=>prepareRequest(message.text,message.intent)}>Edit and resend<Pencil aria-hidden="true"/></button>}</div></div>)}
            {(busy || site?.generating) && <div className="sites-working" role="status"><LoaderCircle aria-hidden="true" /><span>{studio.activity || 'Preparing your reply…'}</span><p>You can return to this Site to check its progress.</p></div>}
          </div>
          <div className="sites-compose-area">
            {unread && !historicalWindow && <button className="sites-jump sites-button" onClick={()=>{stick.current=true;messagesRef.current?.scrollTo({top:messagesRef.current.scrollHeight,behavior:'instant'});setUnread(false);}}>Latest message<ArrowDown aria-hidden="true"/></button>}
            {checkpoint && <p className="sites-help">You’re previewing version {checkpoint.version}. <button className="sites-text-button" onClick={()=>setCheckpoint(null)}>Return to current draft to chat</button></p>}
            {owner && !studio.setupLoading && studio.access==='paid_plan_required' && <p className="sites-help" role="status">Create and update Sites with {PRO_PLAN.name}. <Link href={BILLING_PATHS.plan}>View your plan<ArrowUpRight aria-hidden="true" size={14}/></Link></p>}
            {owner && !studio.setupLoading && studio.access==='unavailable' && <p className="sites-help" role="status">Site updates are unavailable right now. Your saved Sites are still here. Try again shortly.</p>}
            {site?.archived ? <div className="sites-archived"><p>This Site is archived.</p><button className="sites-button" onClick={()=>void studio.change({action:'archive',archived:false})}>Restore Site</button></div> : <form className="sites-composer" onSubmit={e=>{e.preventDefault();void submit();}}>
              <label className="sr-only" htmlFor="site-prompt">Describe your Site or ask for a change</label>
              <textarea id="site-prompt" ref={promptRef} value={prompt} maxLength={1800} rows={3} placeholder={site?.generating?'Draft your next message while we work…':intent==='discuss'?'Ask a question or explore an idea…':site?.document?'What would you like to change?':'Tell us about your Site…'} onChange={e=>remember(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(owner)void submit();}}}/>
              <div className="sites-composer-actions"><div className="sites-modes" aria-label="Message mode"><button type="button" aria-pressed={intent==='build'} onClick={()=>remember(prompt,'build')}>Build</button><button type="button" aria-pressed={intent==='discuss'} onClick={()=>remember(prompt,'discuss')}>Discuss</button></div>{owner?<button className="sites-send" type="submit" disabled={gate.blocked||studio.connection==='offline'||authLoading||studio.loading||openingSite||busy||Boolean(checkpoint)||site?.generating||!['included','free'].includes(studio.access)||!prompt.trim()||new TextEncoder().encode(prompt).length>2000} aria-label="Send message"><ArrowUp aria-hidden="true" /></button>:<Link className="sites-primary" href={`/login?next=${encodeURIComponent(initialStarter?.href || "/sites")}`}>Sign in to create<ArrowUpRight aria-hidden="true" /></Link>}</div>
            </form>}
            <p className="sites-composer-hint">{new TextEncoder().encode(prompt).length>2000?'Shorten your message to send it.':intent==='discuss'?'Explore ideas without changing your draft.':'Build applies your request to the current draft.'} <span>Shift + Enter for a new line.</span></p>
            {owner && <GenerationGateNotice kind="sites" knownFree={studio.access==='free'}/>}
            <p className="sites-help sites-plan-note">{studio.access==='free'?'Your free site includes 3 turns total.':studio.access==='included'?'Included with your plan.':`Create with ${PRO_PLAN.name} for $${PRO_PLAN.monthlyPriceUsd}/month.`} Fair use applies; you may need to pause between updates.</p>
          </div>
        </>}
      </section>
      <section className="sites-preview" aria-label="Site preview">
        <div className="sites-preview-toolbar"><div className="sites-document-name">{site?<><span className={`sites-state ${site.address?.status==='active'?'sites-state-live':''}`}>{stateLabel(site)}</span><strong title={site.title}>{site.title}</strong></>:<span>{openingSite?'Your Site':'Example preview'}</span>}</div>
          <div className="sites-preview-actions"><div className="sites-devices" aria-label="Preview size"><button className="sites-icon" aria-label="Desktop preview" aria-pressed={device==='desktop'} onClick={()=>setDevice('desktop')}><Monitor aria-hidden="true" /></button><button className="sites-icon" aria-label="Mobile preview" aria-pressed={device==='mobile'} onClick={()=>setDevice('mobile')}><Smartphone aria-hidden="true" /></button></div>
            {site && <button className="sites-icon" aria-label="Site settings" aria-expanded={rename} onClick={()=>{setRename(!rename);setTitle(site.title);}}><Pencil aria-hidden="true" /></button>}
            <button className="sites-primary" disabled={!site?.document||busy||Boolean(checkpoint)||site?.generating||site?.archived} onClick={()=>setPublishOpen(!publishOpen)}><Globe2 aria-hidden="true" />Publish</button></div></div>
        {site?.document && <div className="sites-canvas-tabs" aria-label="Page view"><button aria-pressed={canvas==='preview'} onClick={()=>setCanvas('preview')}><Monitor aria-hidden="true"/>Preview</button><button aria-pressed={canvas==='content'} onClick={()=>setCanvas('content')}><List aria-hidden="true"/>{checkpoint?'Content and changes':'Page content'}</button><button className="sites-canvas-download" onClick={download}><Download aria-hidden="true"/>Download</button></div>}
        {checkpoint && site && <div className="sites-version-banner"><div><strong>Previewing version {checkpoint.version}</strong><p>{restoreOpen?'Restore this content as a new draft? Your published page stays unchanged.':'Your current draft is saved.'}</p></div><div>{checkpoint.version!==site.version && <button className="sites-button" disabled={busy||site.generating||site.archived||studio.connection==='offline'} onClick={async()=>{if(!restoreOpen){setRestoreOpen(true);setCanvas('content');return;}if(await studio.change({action:'restore',version:checkpoint.version})){setCheckpoint(null);setRestoreOpen(false);setTab('chat');setNotice('Version restored as a new draft.');}}}><RotateCcw aria-hidden="true"/>{restoreOpen?'Confirm restore':'Restore this version'}</button>}<button className="sites-text-button" onClick={()=>{setCheckpoint(null);setRestoreOpen(false);}}>Back to current draft</button></div></div>}
        {rename && site && <form className="sites-settings" onSubmit={async e=>{e.preventDefault();if(await studio.change({action:'rename',title}))setRename(false);}}><label>Site name<input autoFocus value={title} maxLength={90} onChange={e=>setTitle(e.target.value)}/></label><button className="sites-button" disabled={busy||!title.trim()}>Save name</button><button type="button" className="sites-text-button" disabled={busy||site.generating} onClick={async()=>{if(await studio.change({action:'archive',archived:!site.archived}))setRename(false);}}><Archive aria-hidden="true" />{site.archived?'Restore':'Archive'}</button><span className="sites-help">Archiving keeps a published Site online.</span><button type="button" className="sites-icon" aria-label="Close settings" onClick={()=>setRename(false)}><X aria-hidden="true" /></button></form>}
        {publishOpen && site && <div className="sites-publish"><div><h2>{site.published?'Publish an update':'Ready to share your Site?'}</h2><p>Publishing makes this page available to anyone with its link. Your chat stays private.</p></div>
          {studio.publishing ? <form onSubmit={async e=>{e.preventDefault();if(await studio.change({action:'publish',username,audience:'public'})){setPublishOpen(false);setNotice('Publication saved. Your address will appear as soon as it’s ready.');}}}><label>Your username<input value={username} readOnly={Boolean(studio.username)} required pattern="[a-z][a-z0-9-]{1,18}[a-z0-9]" maxLength={20} placeholder="your-name" onChange={e=>setUsername(e.target.value.toLowerCase())}/></label><span className="sites-help">Used in your Sites’ addresses. Choose it once.</span><button className="sites-primary" disabled={busy||!username.trim()}>Publish publicly<ArrowUpRight aria-hidden="true" /></button></form>:<p className="sites-help">Publishing isn’t available for this account yet. Your draft is saved, and you can download the page.</p>}
          <button className="sites-text-button" onClick={download}><Download aria-hidden="true" />Download page</button>{site.published && <button className="sites-text-button" disabled={busy} onClick={async()=>{if(await studio.change({action:'unpublish'})){setPublishOpen(false);setNotice('Your Site is no longer published. Your draft and address are saved.');}}}>Unpublish Site</button>}<button className="sites-icon sites-publish-close" aria-label="Close publishing" onClick={()=>setPublishOpen(false)}><X aria-hidden="true" /></button></div>}
        {canvas==='content' && site?.document ? <SiteContentPanel key={`${site.id}:${checkpoint?.version || "current"}`} document={checkpoint?.document || site.document} current={checkpoint?site.document:undefined} version={checkpoint?.version} disabled={Boolean(checkpoint)||site.archived} onEdit={label=>prepareRequest(`Update ${label}: `)}/> : <div className="sites-viewport-area"><div className={`sites-viewport sites-viewport-${device}`}><div className="sites-address-bar"><span className="sites-window-dots" aria-hidden="true"><i/><i/><i/></span><span><LockKeyhole aria-hidden="true" />{site?.address?.hostname || (openingSite?'Opening your Site…':site ? 'Private draft' : 'Your Site takes shape here')}</span>{site?.published && site.address?.url?<a className="sites-icon" href={site.address.url} target="_blank" rel="noopener noreferrer" aria-label="Open published Site"><ArrowUpRight aria-hidden="true" /></a>:<span className="sites-address-placeholder"/>}</div>
          {openingSite ? <div className="sites-preview-empty" role="status"><PanelsTopLeft aria-hidden="true"/><h2>{studio.loading || authLoading?'Loading your preview…':'Preview unavailable.'}</h2><p>Your saved draft will appear here when it’s available.</p></div> : site && !site.document ? <div className="sites-preview-empty"><PanelsTopLeft aria-hidden="true" /><h2>Your canvas is ready.</h2><p>{site.generating?'Your first draft will appear here when it’s ready.':'Describe your Site in the chat to bring it to life.'}</p></div>:<iframe title={site?'Your Site draft preview':'Example Site preview'} sandbox="" referrerPolicy="no-referrer" srcDoc={preview}/>}
        </div><div className="sites-preview-caption"><span>{checkpoint?<>Version {checkpoint.version} preview</>:site?.document?<><Check aria-hidden="true" />Saved{site.version?` · Version ${site.version}`:''} · {site.published?'Published changes appear after you publish again.':'Only you can see this draft.'}</>:<>A live preview of the page you’re creating.</>}</span></div></div>}
      </section>
    </div>
  </main>;
}
