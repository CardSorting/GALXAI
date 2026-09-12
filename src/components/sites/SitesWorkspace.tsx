'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight, Plus, Globe2, Monitor, Smartphone, RefreshCw, Check, ChevronDown, MessageSquare, PanelsTopLeft, Search, Download, X, Archive, Pencil, LoaderCircle, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { renderSitePreview } from '@/lib/sites/site-preview';
import { type SiteDocument, type WorkspaceSite } from '@/lib/sites/workspace-contract';
import { useSitesWorkspace } from './use-sites-workspace';
import './sites.css';

const EXAMPLE: SiteDocument = { schema_version:1,title:'Good ideas deserve a place to grow.',summary:'Introduce your next project with a considered, simple website. Start with an idea. Make it your own, one conversation at a time.',sections:[{heading:'A little about you',body:'Your story, your work, and the details that make this yours. A clear introduction gives people a reason to stay.'},{heading:'Something worth sharing',body:'Bring your offering into focus. Tell visitors what they can discover, and what you want them to do next.'}] };
const STARTERS = [ {name:'A product launch',brief:'Create a launch page for a thoughtfully designed task planner called Daylight. Explain how it helps small teams plan a calmer week.'},
  {name:'My portfolio',brief:'Create a portfolio for an independent brand designer. Keep it warm and confident, with sections for selected work, approach, and getting in touch.'},
  {name:'An event page',brief:'Create a page for a neighborhood makers market. Include an introduction, what visitors can expect, and practical event information with clearly marked details to fill in.'} ];
const stateLabel = (s: WorkspaceSite) => s.archived ? 'Archived' : s.generating ? 'Updating' : s.published && s.address?.status === 'active' ? 'Live' : s.published && s.address ? 'Address pending' : 'Draft';
export function SitesWorkspace({initialId}: {initialId?:string}) {
  const {user,isLoading} = useAuth();
  return <Workspace key={user?.id || 'guest'} owner={user?.id || null} token={user?.token} authLoading={isLoading} initialId={initialId} />;
}
function Workspace({owner,token,authLoading,initialId}: {owner:string|null;token?:string;authLoading:boolean;initialId?:string}) {
  const studio = useSitesWorkspace(owner,token,initialId);
  const [prompt,setPrompt] = useState(''), [tab,setTab] = useState<'chat'|'sites'>('chat'), [mobile,setMobile] = useState<'chat'|'preview'>('chat');
  const [device,setDevice] = useState<'desktop'|'mobile'>('desktop'), [search,setSearch] = useState(''), [archived,setArchived] = useState(false);
  const [publishOpen,setPublishOpen] = useState(false), [username,setUsername] = useState(''), [rename,setRename] = useState(false), [title,setTitle] = useState('');
  const [notice,setNotice] = useState('');
  const promptRef = useRef<HTMLTextAreaElement>(null), messagesRef = useRef<HTMLDivElement>(null);
  const {site,busy} = studio;
  const openingSite = studio.openingSite || Boolean(initialId && authLoading);
  const preview = useMemo(() => renderSitePreview(site?.document || EXAMPLE),[site?.document]);
  const draftKey = `galx-sites-unsent:${owner || 'guest'}`;
  useEffect(() => { try { const saved = sessionStorage.getItem(draftKey) || (owner ? sessionStorage.getItem('galx-sites-unsent:guest') : null); if (saved) setPrompt(saved.slice(0,1800)); if (owner) sessionStorage.removeItem('galx-sites-unsent:guest'); } catch {} },[draftKey,owner]);
  useEffect(() => { messagesRef.current?.scrollTo({top:site?.messages.length||site?.generating||busy?messagesRef.current.scrollHeight:0,behavior:'instant'}); },[site?.messages.length,site?.generating,busy]);
  useEffect(() => { if (studio.username) setUsername(studio.username); },[studio.username]);
  function remember(value:string) { setPrompt(value); try { sessionStorage.setItem(draftKey,value); } catch {} }
  function choose(next: WorkspaceSite | null) {
    if (busy) return;
    studio.select(next); setTab('chat'); setMobile('chat'); setPublishOpen(false); setRename(false); setNotice('');
    if (!next) requestAnimationFrame(() => promptRef.current?.focus());
    // Keep navigation local so selecting a Site does not remount an in-flight update.
    window.history.replaceState(null,'',next ? `/sites/${next.id}` : '/sites');
  }
  async function submit() {
    if (!prompt.trim()) return;
    const result = await studio.send(prompt);
    if (result) { remember(''); window.history.replaceState(null,'',`/sites/${result.id}`); }
  }
  function download() {
    if (!site?.document) return;
    const url = URL.createObjectURL(new Blob([renderSitePreview(site.document)],{type:'text/html'}));
    const a = document.createElement('a'); a.href=url; a.download='site.html'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); setNotice('Your page was downloaded.');
  }
  const filtered = studio.sites.filter(s => s.archived === archived && s.title.toLowerCase().includes(search.toLowerCase()));
  return <main className="sites-workspace" aria-label="Sites workspace">
    <div className="sites-heading"><div className="sites-heading-title"><PanelsTopLeft aria-hidden="true" /><h1>Sites</h1><span>A place for your next idea.</span></div>
      <button className="sites-button" onClick={() => choose(null)} disabled={busy}><Plus aria-hidden="true" />New Site</button></div>
    {(studio.error || notice) && <div className="sites-feedback sites-shared-feedback" role={studio.error?'alert':'status'}><p>{studio.error || notice}</p>{studio.error && <button className="sites-text-button" onClick={()=>void studio.refresh()}>Refresh Site<RefreshCw aria-hidden="true" /></button>}<button className="sites-icon" aria-label="Dismiss message" onClick={()=>{studio.setError('');setNotice('');}}><X aria-hidden="true" /></button></div>}
    <div className="sites-mobile-tabs" aria-label="Workspace panels"><button aria-pressed={mobile==='chat'} onClick={() => setMobile('chat')}><MessageSquare aria-hidden="true" />Chat</button><button aria-pressed={mobile==='preview'} onClick={() => setMobile('preview')}><Monitor aria-hidden="true" />Preview</button></div>
    <div className="sites-split" data-mobile-panel={mobile}>
      <section className="sites-conversation" aria-label="Create and manage Sites">
        <nav className="sites-panel-tabs" aria-label="Sites views"><button aria-current={tab==='chat'?'page':undefined} onClick={() => setTab('chat')}><MessageSquare aria-hidden="true" />Chat</button><button aria-current={tab==='sites'?'page':undefined} onClick={() => setTab('sites')}><PanelsTopLeft aria-hidden="true" />My Sites{studio.sites.filter(s=>!s.archived).length>0 && <span>{studio.sites.filter(s=>!s.archived).length}</span>}</button></nav>
        {tab==='sites' ? <div className="sites-library"><div className="sites-library-tools"><label className="sites-search"><Search aria-hidden="true" /><input aria-label="Search your Sites" placeholder="Find a Site…" value={search} onChange={e=>setSearch(e.target.value)} /></label><button className="sites-icon" aria-label="Refresh Sites" disabled={studio.loading} onClick={()=>void studio.refresh()}><RefreshCw aria-hidden="true" /></button></div>
          <button className="sites-text-button" aria-pressed={archived} onClick={()=>setArchived(!archived)}>{archived?'Show current Sites':'Show archived Sites'}<ChevronDown aria-hidden="true" /></button>
          {studio.loading && <p role="status" className="sites-help">Loading your Sites…</p>}
          {!studio.loading && !filtered.length && <div className="sites-library-empty"><h2>{search?'No matching Sites':archived?'No archived Sites':'Your ideas will live here.'}</h2><p>{search?'Try another name.':owner?'Start a conversation to create your first Site.':'Sign in to see your saved Sites.'}</p><button className="sites-button" onClick={()=>setTab('chat')}>Start creating<ArrowUpRight aria-hidden="true" /></button></div>}
          <ul className="sites-list">{filtered.map(item=><li key={item.id}><button className="sites-list-item" onClick={()=>choose(item)} aria-current={site?.id===item.id?'true':undefined}><span className="sites-list-art" aria-hidden="true"><span/><span/><span/></span><span><strong>{item.title}</strong><small>{stateLabel(item)} · {new Date(item.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</small></span><ArrowUpRight aria-hidden="true" /></button></li>)}</ul>
        </div> : <>
          <div ref={messagesRef} className="sites-messages" aria-live="polite" aria-relevant="additions text">
            {openingSite && <div className="sites-welcome" role="status"><h2>{studio.loading || authLoading?'Loading your Site…':'This Site is unavailable.'}</h2><p>{studio.loading || authLoading?'Your saved conversation and preview will appear here.':'Choose a saved Site from My Sites, or start a new one.'}</p></div>}
            {!openingSite && (!site || !site.messages.length) && <div className="sites-welcome"><div className="sites-assistant-mark" aria-hidden="true"><PanelsTopLeft /></div><h2>What are we making?</h2><p>Describe your idea. We’ll shape a page together, with your preview right beside you.</p><div className="sites-starters">{STARTERS.map(starter=><button key={starter.name} onClick={()=>{remember(starter.brief);promptRef.current?.focus();}}>{starter.name}<ArrowUpRight aria-hidden="true" /></button>)}</div><p className="sites-note">Start with a landing page, portfolio, or simple information site. Your draft stays private until you publish.</p></div>}
            {site?.messages.map(message=><div key={message.id} className={`sites-message sites-message-${message.role}`}><span>{message.role==='user'?'You':'GALX'}</span><p>{message.text}</p></div>)}
            {(busy || site?.generating) && <div className="sites-working" role="status"><LoaderCircle aria-hidden="true" /><span>{site?.generating?'Updating your draft…':'Working on your Site…'}</span><p>You can return to this Site to check its progress.</p></div>}
          </div>
          <div className="sites-compose-area">
            {owner && !studio.setupLoading && studio.access==='paid_plan_required' && <p className="sites-help" role="status">Create and update Sites with an eligible paid plan. <Link href="/pricing">View plans<ArrowUpRight aria-hidden="true" size={14}/></Link></p>}
            {owner && !studio.setupLoading && studio.access==='unavailable' && <p className="sites-help" role="status">Site updates are unavailable right now. Your saved Sites are still here. Try again shortly.</p>}
            {site?.archived ? <div className="sites-archived"><p>This Site is archived.</p><button className="sites-button" onClick={()=>void studio.change({action:'archive',archived:false})}>Restore Site</button></div> : <form className="sites-composer" onSubmit={e=>{e.preventDefault();void submit();}}>
              <label className="sr-only" htmlFor="site-prompt">Describe your Site or ask for a change</label>
              <textarea id="site-prompt" ref={promptRef} value={prompt} maxLength={1800} rows={3} placeholder={site?.document?'What would you like to change?':'Tell us about your Site…'} onChange={e=>remember(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(owner)void submit();}}}/>
              <div className="sites-composer-actions"><span>{site?.document?'Describe a change':'Your idea, in your words'}</span>{owner?<button className="sites-send" type="submit" disabled={authLoading||studio.loading||openingSite||busy||site?.generating||studio.access!=='included'||!prompt.trim()||new TextEncoder().encode(prompt).length>2000} aria-label="Send message"><ArrowUp aria-hidden="true" /></button>:<Link className="sites-primary" href="/auth/login?redirect=%2Fsites">Sign in to create<ArrowUpRight aria-hidden="true" /></Link>}</div>
            </form>}
            <p className="sites-help sites-plan-note">{studio.access==='included'?'Included with your plan.':'Available with eligible paid plans.'} Fair usage applies; you may need to pause between updates.</p>
          </div>
        </>}
      </section>
      <section className="sites-preview" aria-label="Site preview">
        <div className="sites-preview-toolbar"><div className="sites-document-name">{site?<><span className={`sites-state ${site.address?.status==='active'?'sites-state-live':''}`}>{stateLabel(site)}</span><strong title={site.title}>{site.title}</strong></>:<span>{openingSite?'Your Site':'Example preview'}</span>}</div>
          <div className="sites-preview-actions"><div className="sites-devices" aria-label="Preview size"><button className="sites-icon" aria-label="Desktop preview" aria-pressed={device==='desktop'} onClick={()=>setDevice('desktop')}><Monitor aria-hidden="true" /></button><button className="sites-icon" aria-label="Mobile preview" aria-pressed={device==='mobile'} onClick={()=>setDevice('mobile')}><Smartphone aria-hidden="true" /></button></div>
            {site && <button className="sites-icon" aria-label="Site settings" aria-expanded={rename} onClick={()=>{setRename(!rename);setTitle(site.title);}}><Pencil aria-hidden="true" /></button>}
            <button className="sites-primary" disabled={!site?.document||busy||site?.generating||site?.archived} onClick={()=>setPublishOpen(!publishOpen)}><Globe2 aria-hidden="true" />Publish</button></div></div>
        {rename && site && <form className="sites-settings" onSubmit={async e=>{e.preventDefault();if(await studio.change({action:'rename',title}))setRename(false);}}><label>Site name<input autoFocus value={title} maxLength={90} onChange={e=>setTitle(e.target.value)}/></label><button className="sites-button" disabled={busy||!title.trim()}>Save name</button><button type="button" className="sites-text-button" disabled={busy||site.generating} onClick={async()=>{if(await studio.change({action:'archive',archived:!site.archived}))setRename(false);}}><Archive aria-hidden="true" />{site.archived?'Restore':'Archive'}</button><span className="sites-help">Archiving keeps a published Site online.</span><button type="button" className="sites-icon" aria-label="Close settings" onClick={()=>setRename(false)}><X aria-hidden="true" /></button></form>}
        {publishOpen && site && <div className="sites-publish"><div><h2>{site.published?'Publish an update':'Ready to share your Site?'}</h2><p>Publishing makes this page available to anyone with its link. Your chat stays private.</p></div>
          {studio.publishing ? <form onSubmit={async e=>{e.preventDefault();if(await studio.change({action:'publish',username,audience:'public'})){setPublishOpen(false);setNotice('Publication saved. Your address will appear as soon as it’s ready.');}}}><label>Your username<input value={username} readOnly={Boolean(studio.username)} required pattern="[a-z][a-z0-9-]{1,18}[a-z0-9]" maxLength={20} placeholder="your-name" onChange={e=>setUsername(e.target.value.toLowerCase())}/></label><span className="sites-help">Used in your Sites’ addresses. Choose it once.</span><button className="sites-primary" disabled={busy||!username.trim()}>Publish publicly<ArrowUpRight aria-hidden="true" /></button></form>:<p className="sites-help">Publishing isn’t available for this account yet. Your draft is saved, and you can download the page.</p>}
          <button className="sites-text-button" onClick={download}><Download aria-hidden="true" />Download page</button>{site.published && <button className="sites-text-button" disabled={busy} onClick={async()=>{if(await studio.change({action:'unpublish'})){setPublishOpen(false);setNotice('Your Site is no longer published. Your draft and address are saved.');}}}>Unpublish Site</button>}<button className="sites-icon sites-publish-close" aria-label="Close publishing" onClick={()=>setPublishOpen(false)}><X aria-hidden="true" /></button></div>}
        <div className="sites-viewport-area"><div className={`sites-viewport sites-viewport-${device}`}><div className="sites-address-bar"><span className="sites-window-dots" aria-hidden="true"><i/><i/><i/></span><span><LockKeyhole aria-hidden="true" />{site?.address?.hostname || (openingSite?'Opening your Site…':site ? 'Private draft' : 'Your Site takes shape here')}</span>{site?.published && site.address?.url?<a className="sites-icon" href={site.address.url} target="_blank" rel="noopener noreferrer" aria-label="Open published Site"><ArrowUpRight aria-hidden="true" /></a>:<span className="sites-address-placeholder"/>}</div>
          {openingSite ? <div className="sites-preview-empty" role="status"><PanelsTopLeft aria-hidden="true"/><h2>{studio.loading || authLoading?'Loading your preview…':'Preview unavailable.'}</h2><p>Your saved draft will appear here when it’s available.</p></div> : site && !site.document ? <div className="sites-preview-empty"><PanelsTopLeft aria-hidden="true" /><h2>Your canvas is ready.</h2><p>{site.generating?'Your first draft will appear here when it’s ready.':'Describe your Site in the chat to bring it to life.'}</p></div>:<iframe title={site?'Your Site draft preview':'Example Site preview'} sandbox="" referrerPolicy="no-referrer" srcDoc={preview}/>}
        </div><div className="sites-preview-caption"><span>{site?.document?<><Check aria-hidden="true" />Saved draft · {site.published?'Published changes appear after you publish again.':'Only you can see this draft.'}</>:<>A live preview of the page you’re creating.</>}</span>{site?.document && <button className="sites-text-button" onClick={download}><Download aria-hidden="true" />Download</button>}</div></div>
      </section>
    </div>
  </main>;
}
