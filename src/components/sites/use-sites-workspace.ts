'use client';
import { GENERATION_QUOTA_CHANGED } from '@/lib/billing/free-generation-contract';
import { workspaceFetch } from '@/lib/auth/workspace-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { startActivityPolling, recoveryDelay } from '@/lib/resilience/activity-polling';
import { readWorkspaceSite, readSiteSummary, readSiteMessage, workspaceError, type WorkspaceSite, type SiteSummary, type SitesAccess, type SiteIntent, type SiteMessage, type SiteVersion, readSiteDocument } from '@/lib/sites/workspace-contract';

class WorkspaceClientError extends Error {
  constructor(message:string,readonly status:number,readonly retryAfter:string|null=null){super(message);}
  get definitive(){return [400,401,402,403,404,409,429].includes(this.status);}
}
const EMPTY_MESSAGES:SiteMessage[]=[];
const newer=(a:{revision:number;updatedAt:string},b:{revision:number;updatedAt:string})=>a.revision>b.revision || (a.revision===b.revision && Date.parse(a.updatedAt)>=Date.parse(b.updatedAt));
export function useSitesWorkspace(owner: string | null, token?: string, initialId?: string) {
  const [sites,setSites] = useState<SiteSummary[]>([]), [site,setSite] = useState<WorkspaceSite | null>(null);
  const [loading,setLoading] = useState(Boolean(owner)), [busy,setBusy] = useState(false), [activity,setActivity]=useState(''),[error,setError] = useState('');
  const [access,setAccess] = useState<SitesAccess>('unavailable'), [setupLoading,setSetupLoading] = useState(Boolean(owner));
  const [publishing,setPublishing] = useState(false), [username,setUsername] = useState<string | null>(null);
  const [older,setOlder]=useState<{id:string;messages:SiteMessage[];cursor:number|null}|null>(null),[historyBusy,setHistoryBusy]=useState(false);
  const [connection,setConnection]=useState<'online'|'offline'|'reconnecting'>('online');
  const channel=useRef<BroadcastChannel|null>(null);
  const alive = useRef(true), lock = useRef(false), controllers = useRef(new Set<AbortController>()), selected = useRef(initialId),currentRef=useRef(site),loadEpoch=useRef(0);
  currentRef.current=site;
  const call = useCallback(async (body?: Record<string,unknown>, query = '', signal?: AbortSignal) => {
    const controller = new AbortController(); controllers.current.add(controller);
    const timer = setTimeout(() => controller.abort(),body?.action === 'generate' ? 95000 : 25000);
    try {
      const response = await workspaceFetch(owner, '/api/sites/workspace'+query,{ method:body ? 'POST':'GET', cache:'no-store', signal:signal ? AbortSignal.any([signal,controller.signal]) : controller.signal,
        headers:{ 'Accept':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(body ? {'Content-Type':'application/json'} : {}) },
        ...(body ? {body:JSON.stringify(body)} : {}) });
      if (!response.ok) {
        if(response.status===403 && alive.current){setAccess('paid_plan_required');setPublishing(false);}
        if(body)window.dispatchEvent(new Event(GENERATION_QUOTA_CHANGED));
        let code: unknown; try { code = (await response.json())?.error?.code; } catch {}
        throw new WorkspaceClientError(code === 'free_site_limit' ? 'Your free site has already been created. Open it in My sites, or upgrade to Pro to create more.'
          : code === 'free_generation_paused' ? 'Free Site creation is temporarily paused. Your turn was not used. Try later or explore Pro.'
          : code === 'free_generation_busy' ? 'Free Site creation is busy right now. Your turn was not used. Try again later.'
          : code === 'free_quota_exhausted' ? 'Your three free site turns are used up. Upgrade to Pro to keep creating.'
          : code === 'invalid_username' ? 'Use 3–20 lowercase letters, numbers, or hyphens. Start with a letter and end with a letter or number.'
          : code === 'username_unavailable' ? 'That username isn’t available. Choose another, or refresh to use your saved username.'
          : code === 'request_too_long' ? 'Shorten your message or project notes, then try again.' : workspaceError(response.status),response.status,response.headers.get('Retry-After'));
      }
      const result=await response.json();if(body)window.dispatchEvent(new Event(GENERATION_QUOTA_CHANGED));if(alive.current)setConnection('online');return result;
    } catch(error) {
      if(alive.current && !signal?.aborted && !(error instanceof WorkspaceClientError))setConnection(navigator.onLine?'reconnecting':'offline');
      throw error;
    } finally { clearTimeout(timer); controllers.current.delete(controller); }
  },[owner,token]);
  const accept = useCallback((input: unknown) => {
    const next = readWorkspaceSite(input);
    if (!alive.current) return next;
    setSites(current => {const old=current.find(s=>s.id===next.id);return old && !newer(next,old)?current:[readSiteSummary(next),...current.filter(s=>s.id!==next.id)];});
    if (selected.current === next.id) setSite(current=>current?.id===next.id && !newer(next,current)?current:next);
    return next;
  },[]);
  const loadSite=useCallback(async(id:string)=>{const result=await call(undefined,`?id=${id}`);return accept(result.site);},[call,accept]);
  const refreshInFlight = useRef<{ query: string; promise: Promise<void> } | null>(null);
  const refreshedAt = useRef(0);
  const refresh = useCallback((preserveError = false): Promise<void> => {
    if (!owner) return Promise.resolve();
    const query = `?view=bootstrap${selected.current ? `&id=${selected.current}` : ''}`;
    if (refreshInFlight.current?.query === query) return refreshInFlight.current.promise;
    const epoch = ++loadEpoch.current;
    if (!preserveError) { setLoading(true); setSetupLoading(true); setError(''); }
    const promise = (async () => {
      try {
        const data = await call(undefined, query);
        if (!Array.isArray(data.sites) || data.sites.length > 50 || !data.setup) throw new Error();
        const rows: SiteSummary[] = data.sites.map(readSiteSummary);
        if (!alive.current || epoch !== loadEpoch.current) return;
        if (data.site) accept(data.site);
        setSites(current => rows.map(row => { const old=current.find(s=>s.id===row.id); return old && newer(old,row) ? old : row; }));
        setAccess(data.setup.access==='free' ? 'free' : data.setup.access==='included' ? 'included' : data.setup.access==='paid_plan_required' ? 'paid_plan_required' : 'unavailable');
        setPublishing(data.setup.publishing==='available');
        setUsername(typeof data.setup.username==='string' ? data.setup.username : null);
        refreshedAt.current = Date.now();
      } catch (e) {
        if (alive.current && epoch === loadEpoch.current) {
          setError(e instanceof WorkspaceClientError ? e.message : 'Your Sites couldn’t be loaded. Try refreshing.');
          if (e instanceof WorkspaceClientError && [401,403].includes(e.status)) { setAccess('unavailable'); setPublishing(false); }
        }
      } finally {
        if (alive.current && epoch === loadEpoch.current) { setLoading(false); setSetupLoading(false); }
      }
    })();
    const flight = { query, promise }; refreshInFlight.current = flight;
    void promise.finally(() => { if (refreshInFlight.current === flight) refreshInFlight.current = null; });
    return promise;
  }, [call, owner, accept]);
  useEffect(() => {
    const epochRef = loadEpoch, pendingControllers = controllers.current;
    alive.current = true; refreshedAt.current = 0; void refresh();
    return () => { alive.current = false; ++epochRef.current; refreshInFlight.current = null; for (const controller of pendingControllers) controller.abort(); };
  }, [owner, refresh]);
  const select=useCallback((next:SiteSummary|null,navigate=true)=>{
    selected.current=next?.id;setSite(null);setOlder(null);setError('');
    if(navigate)window.history.pushState(null,'',next?`/sites/${next.id}`:'/sites');
    if(next && owner){const epoch=++loadEpoch.current;setLoading(true);void loadSite(next.id).catch(e=>{if(alive.current && selected.current===next.id)setError(e instanceof WorkspaceClientError?e.message:workspaceError(503));}).finally(()=>{if(alive.current && epoch===loadEpoch.current)setLoading(false);});}
    else{++loadEpoch.current;setLoading(false);}
  },[loadSite,owner]);
  useEffect(()=>{const pop=()=>{const id=window.location.pathname.match(/^\/sites\/([a-f0-9-]{36})$/)?.[1];
    if(id===selected.current)return;select(id?{id} as SiteSummary:null,false);};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[select]);
  useEffect(() => {
    if (!owner) return;
    let dirty = false, trailing: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      clearTimeout(trailing);
      if (!navigator.onLine) { setConnection('offline'); return; }
      if (document.visibilityState !== 'visible') return;
      if (!dirty && Date.now() - refreshedAt.current < 30_000) return;
      if (lock.current || refreshInFlight.current) { trailing = setTimeout(sync, 1000); return; }
      dirty = false; void refresh(true);
    };
    const reconnect = () => { dirty = true; sync(); };
    const offline = () => setConnection('offline');
    try {
      channel.current = new BroadcastChannel(`galx-sites:${owner}`);
      channel.current.onmessage = event => {
        if (event.data?.type==='changed' && typeof event.data.id==='string' && /^[a-f0-9-]{36}$/.test(event.data.id)) reconnect();
      };
    } catch {}
    if (!navigator.onLine) offline();
    window.addEventListener('online',reconnect); window.addEventListener('offline',offline);
    window.addEventListener('focus',sync); document.addEventListener('visibilitychange',sync);
    return () => {
      clearTimeout(trailing); channel.current?.close(); channel.current=null;
      window.removeEventListener('online',reconnect); window.removeEventListener('offline',offline);
      window.removeEventListener('focus',sync); document.removeEventListener('visibilitychange',sync);
    };
  }, [owner,refresh]);
  const changed=(id:string)=>{try{channel.current?.postMessage({type:'changed',id});}catch{}};
  useEffect(() => {
    const id = site?.id, generating = site?.generating, addressStatus = site?.address?.status;
    if (!owner || !id || busy || (!generating && addressStatus!=='pending' && addressStatus!=='reserved')) return;
    let failures = 0;
    return startActivityPolling(async signal => {
      if (lock.current || refreshInFlight.current) return 4000;
      try {
        const result = await call(generating ? {action:'recover',id} : undefined,generating ? '' : `?id=${id}`,signal);
        if (signal.aborted || !alive.current) return null;
        const next = accept(result.site); failures = 0;
        if (generating && !next.generating) changed(id);
        return next.generating || next.address?.status==='pending' || next.address?.status==='reserved' ? 8000 : null;
      } catch (error) {
        if (signal.aborted || !alive.current) return null;
        if (error instanceof WorkspaceClientError && [400,401,403,404].includes(error.status)) {
          setError(error.message); return null;
        }
        if (++failures >= 2) setConnection(navigator.onLine ? 'reconnecting' : 'offline');
        return recoveryDelay(failures,error instanceof WorkspaceClientError ? error.retryAfter : null);
      }
    },undefined,4000);
  },[site?.id,site?.generating,site?.address?.status,owner,busy,call,accept]);
  async function send(brief: string,intent:SiteIntent,onCreated?:(id:string)=>void): Promise<WorkspaceSite | null> {
    if (!owner || !navigator.onLine || !['included','free'].includes(access) || loading || (selected.current && !site) || lock.current || site?.generating || site?.archived) return null;
    lock.current = true; setBusy(true);setActivity(intent==='discuss'?'Thinking through your question…':'Updating your draft…');setError('');
    let operationKey='',operationId='',targetId='';
    try {
      let current = site;
      if (!current) {
        const key = `galx-sites-create:${owner}`;
        let id: string | null = null; try { id = sessionStorage.getItem(key); } catch {}
        if (!id || !/^[a-f0-9-]{36}$/.test(id)) id = crypto.randomUUID();
        try { sessionStorage.setItem(key,id); } catch {}
        current = readWorkspaceSite((await call({action:'create',id,title:'Untitled Site'})).site);
        if (!alive.current) return null;
        onCreated?.(current.id);selected.current = current.id;accept(current);window.history.replaceState(null,'',`/sites/${current.id}`);
        try { sessionStorage.removeItem(key); } catch {}
      }
      operationKey=`galx-sites-turn:${owner}:${current.id}`;
      targetId=current.id;operationId=crypto.randomUUID();
      try{const saved=JSON.parse(sessionStorage.getItem(operationKey)||'null');if(saved?.brief===brief.trim() && saved?.intent===intent && /^[a-f0-9-]{36}$/.test(saved.id))operationId=saved.id;
        sessionStorage.setItem(operationKey,JSON.stringify({id:operationId,brief:brief.trim(),intent}));}catch{}
      const optimistic={...current,generating:true,messages:[...current.messages.slice(-79),{id:`${operationId}:user`,role:'user',text:brief.trim(),status:'pending'}]};
      accept(optimistic);
      const result = await call({action:'generate',id:current.id,revision:current.revision,operationId,brief:brief.trim(),intent});
      try{sessionStorage.removeItem(operationKey);}catch{}
      const next=accept(result.site);changed(next.id);return next;
    } catch (e) {const definitive=e instanceof WorkspaceClientError && e.definitive;
      if(definitive && operationKey)try{sessionStorage.removeItem(operationKey);}catch{}
      if(!definitive && targetId && alive.current){
        setActivity('Checking your reply…');
        try{const recovered=await loadSite(targetId);
          if(recovered.messages.some(message=>message.id===`${operationId}:assistant` && message.status==='completed')){
            try{sessionStorage.removeItem(operationKey);}catch{}changed(targetId);return recovered;
          }
        }catch{}
      }
      if (alive.current) {setError(definitive ? (e as WorkspaceClientError).message : 'We couldn’t confirm the reply. Refresh to check its progress before trying again.');void refresh(true);}return null;
    } finally { lock.current = false; if (alive.current){setBusy(false);setActivity('');} }
  }
  async function change(body: Record<string,unknown>): Promise<boolean> {
    const current=currentRef.current;if (!owner || !current || !navigator.onLine || lock.current) return false;
    lock.current = true; setBusy(true);setActivity('Saving…');setError('');
    try { const result = await call({ ...body,id:current.id,revision:current.revision }); accept(result.site);changed(current.id); return true; }
    catch (e) { if (alive.current){setError(e instanceof WorkspaceClientError ? e.message : workspaceError(503));void loadSite(current.id).catch(()=>{});}return false; }
    finally { lock.current = false; if (alive.current){setBusy(false);setActivity('');} }
  }
  async function loadEarlier(){
    if(!site || historyBusy)return;const id=site.id,cursor=older?.id===id?older.cursor:site.historyCursor;if(!cursor)return;
    setHistoryBusy(true);try{const data=await call(undefined,`?id=${id}&view=history&before=${cursor}`);
      if(!Array.isArray(data.messages)||data.messages.length>80 || (data.cursor!==null && (!Number.isSafeInteger(data.cursor)||data.cursor<1)))throw new Error();
      const messages=data.messages.map(readSiteMessage);if(alive.current && selected.current===id)setOlder(current=>({id,messages:[...messages,...(current?.id===id?current.messages:[])].slice(0,160),cursor:data.cursor}));
    }catch{if(alive.current)setError('Earlier messages couldn’t be loaded. Try again.');}finally{if(alive.current)setHistoryBusy(false);}
  }
  async function versions(id:string,before?:number):Promise<{versions:SiteVersion[];cursor:number|null}>{
    const data=await call(undefined,`?id=${id}&view=versions${before?`&before=${before}`:''}`);
    if(!Array.isArray(data.versions)||data.versions.length>20 || (data.cursor!==null && (!Number.isSafeInteger(data.cursor)||data.cursor<1)))throw new Error();
    return {versions:data.versions.map((v:SiteVersion)=>{if(!Number.isSafeInteger(v.version)||v.version<1||typeof v.label!=='string'||v.label.length>200||!Number.isFinite(Date.parse(v.createdAt)))throw new Error();return{version:v.version,label:v.label,createdAt:v.createdAt};}),cursor:data.cursor};
  }
  async function version(id:string,number:number){const data=await call(undefined,`?id=${id}&version=${number}`),document=readSiteDocument(data.document);if(!document || data.version!==number)throw new Error();return {version:number,document};}
  const earlier=older?.id===site?.id?older:null;
  return { sites,site,selectedId:selected.current,loading,openingSite:Boolean(owner && selected.current && !site),busy,activity,error,setError,access,setupLoading,publishing,username,connection,select,send,change,versions,version,
    earlier:earlier?.messages || EMPTY_MESSAGES,historyCursor:earlier?earlier.cursor:site?.historyCursor,historyBusy,loadEarlier,resetHistory:()=>setOlder(null),
    refresh };
}
