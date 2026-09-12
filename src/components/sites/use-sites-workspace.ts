'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { readWorkspaceSite, workspaceError, type WorkspaceSite, type SitesAccess } from '@/lib/sites/workspace-contract';

class WorkspaceClientError extends Error {}

export function useSitesWorkspace(owner: string | null, token?: string, initialId?: string) {
  const [sites,setSites] = useState<WorkspaceSite[]>([]), [site,setSite] = useState<WorkspaceSite | null>(null);
  const [loading,setLoading] = useState(Boolean(owner)), [busy,setBusy] = useState(false), [error,setError] = useState('');
  const [access,setAccess] = useState<SitesAccess>('unavailable'), [setupLoading,setSetupLoading] = useState(Boolean(owner));
  const [publishing,setPublishing] = useState(false), [username,setUsername] = useState<string | null>(null);
  const alive = useRef(true), lock = useRef(false), controllers = useRef(new Set<AbortController>()), selected = useRef(initialId);
  const call = useCallback(async (body?: Record<string,unknown>, query = '') => {
    const controller = new AbortController(); controllers.current.add(controller);
    const timer = setTimeout(() => controller.abort(),body?.action === 'generate' ? 95000 : 25000);
    try {
      const response = await fetch('/api/sites/workspace'+query,{ method:body ? 'POST':'GET', cache:'no-store', signal:controller.signal,
        headers:{ 'Accept':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(body ? {'Content-Type':'application/json'} : {}) },
        ...(body ? {body:JSON.stringify(body)} : {}) });
      if (!response.ok) {
        if(response.status===403){setAccess('paid_plan_required');setPublishing(false);}
        let code: unknown; try { code = (await response.json())?.error?.code; } catch {}
        throw new WorkspaceClientError(code === 'invalid_username' ? 'Use 3–20 lowercase letters, numbers, or hyphens. Start with a letter and end with a letter or number.'
          : code === 'username_unavailable' ? 'That username isn’t available. Choose another, or refresh to use your saved username.' : workspaceError(response.status));
      }
      return await response.json();
    } finally { clearTimeout(timer); controllers.current.delete(controller); }
  },[token]);
  const refreshAccess=useCallback(async()=>{
    if(!owner)return;setSetupLoading(true);
    try{
      const data=await call(undefined,'?view=setup');if(!alive.current)return;
      setAccess(data.access==='included'?'included':data.access==='paid_plan_required'?'paid_plan_required':'unavailable');
      setPublishing(data.publishing==='available');setUsername(typeof data.username==='string'?data.username:null);
    }catch{if(alive.current){setAccess('unavailable');setPublishing(false);}}
    finally{if(alive.current)setSetupLoading(false);}
  },[call,owner]);
  const accept = useCallback((input: unknown) => {
    const next = readWorkspaceSite(input);
    if (!alive.current) return next;
    setSites(current => [next,...current.filter(s => s.id !== next.id)]);
    if (selected.current === next.id) setSite(next);
    return next;
  },[]);
  const refresh = useCallback(async (preserveError = false) => {
    if (!owner) return;
    setLoading(true); if (!preserveError) setError('');
    try { const data = await call(); if (!Array.isArray(data.sites) || data.sites.length>50) throw new Error();
      const rows = data.sites.map(readWorkspaceSite); if (!alive.current) return; setSites(rows);
      if (selected.current) { const current = rows.find((s: WorkspaceSite) => s.id === selected.current);
        if (current) setSite(current); else { setSite(null); setError('This Site is unavailable. Choose another from My Sites.'); } }
    } catch (e) { if (alive.current) setError(e instanceof Error && e.message.startsWith('Sign in') ? e.message : 'Your Sites couldn’t be loaded. Try refreshing.'); }
    finally { if (alive.current) setLoading(false); }
  },[call,owner]);
  useEffect(() => {
    alive.current = true; void refresh(); void refreshAccess();
    return () => { alive.current = false; for (const controller of controllers.current) controller.abort(); };
  },[call,owner,refresh,refreshAccess]);
  useEffect(() => {
    if (!owner || !site?.generating) return;
    const id = site.id; let cancelled = false; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const result = await call({action:'recover',id}); if (!cancelled && alive.current) accept(result.site); }
      catch { /* Keep the pending state and allow manual refresh/recovery. */ }
      if (!cancelled) timer = setTimeout(() => void poll(),8000);
    };
    timer = setTimeout(() => void poll(),4000);
    return () => { cancelled = true; clearTimeout(timer); };
  },[site?.id,site?.generating,owner,call,accept]);
  useEffect(() => {
    if (!owner || !site?.address || site.address.status === 'active') return;
    const id = site.id; let cancelled = false;
    const timer = setInterval(() => { void call(undefined,`?id=${id}`).then(result => { if (!cancelled) accept(result.site); }).catch(() => {}); },10000);
    return () => { cancelled = true; clearInterval(timer); };
  },[site?.id,site?.address?.status,owner,call,accept]);
  function select(next: WorkspaceSite | null) { selected.current = next?.id; setSite(next); setError(''); }
  async function send(brief: string): Promise<WorkspaceSite | null> {
    if (!owner || access!=='included' || loading || (selected.current && !site) || lock.current || site?.generating || site?.archived) return null;
    lock.current = true; setBusy(true); setError('');
    try {
      let current = site;
      if (!current) {
        // Retain the creation ID before the request so an interrupted create can be retried safely.
        const key = `galx-sites-create:${owner}`;
        let id: string | null = null; try { id = sessionStorage.getItem(key); } catch {}
        if (!id || !/^[a-f0-9-]{36}$/.test(id)) id = crypto.randomUUID();
        try { sessionStorage.setItem(key,id); } catch {}
        current = readWorkspaceSite((await call({action:'create',id,title:'Untitled Site'})).site);
        if (!alive.current) return null;
        selected.current = current.id; accept(current); setSite(current);
        try { sessionStorage.removeItem(key); } catch {}
      }
      const result = await call({action:'generate',id:current.id,revision:current.revision,operationId:crypto.randomUUID(),brief:brief.trim().replace(/[\r\n\t]+/g,' ')});
      return accept(result.site);
    } catch (e) { if (alive.current) { setError(e instanceof WorkspaceClientError ? e.message : 'The update was interrupted. Refresh to check its progress before trying again.'); void refresh(true); } return null; }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function change(body: Record<string,unknown>): Promise<boolean> {
    if (!owner || !site || lock.current) return false;
    lock.current = true; setBusy(true); setError('');
    try { const result = await call({ ...body,id:site.id,revision:site.revision }); accept(result.site); return true; }
    catch (e) { if (alive.current) setError(e instanceof WorkspaceClientError ? e.message : workspaceError(503)); return false; }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  return { sites,site,loading,openingSite:Boolean(owner && selected.current && !site),busy,error,setError,access,setupLoading,publishing,username,select,send,change,refresh:async(preserveError=false)=>{await Promise.all([refresh(preserveError),refreshAccess()]);} };
}
