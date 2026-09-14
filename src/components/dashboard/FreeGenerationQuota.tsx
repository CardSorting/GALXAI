'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { workspaceFetch } from '@/lib/auth/workspace-client';
import { GENERATION_QUOTA_CHANGED, readGenerationAllowance, type GenerationAllowance } from '@/lib/billing/free-generation-contract';
import styles from './navigation.module.css';

export function FreeGenerationQuota() {
  const { user } = useAuth();
  const owner=user?.id, token=user?.token;
  const pathname = usePathname();
  const [state,setState] = useState<{owner:string; value:GenerationAllowance | null; failed:boolean} | null>(null);
  useEffect(() => {
    if (!owner) return;
    let alive=true, active=false;
    const controller=new AbortController();
    const refresh=async () => {
      if(active || document.visibilityState==='hidden') return;
      active=true;
      try {
        const response=await workspaceFetch(owner,'/api/billing/generation-quota',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]),
          headers:token ? {Authorization:`Bearer ${token}`} : {}});
        if(!response.ok) throw new Error();
        const value=readGenerationAllowance(await response.json());
        if(!value) throw new Error();
        if(alive)setState({owner,value,failed:false});
      } catch { if(alive)setState(current=>({owner,value:current?.owner===owner && current.value?.plan==='pro'?current.value:null,failed:true})); }
      finally { active=false; }
    };
    void refresh();
    const sync=()=>void refresh();
    window.addEventListener(GENERATION_QUOTA_CHANGED,sync);
    window.addEventListener('focus',sync);
    document.addEventListener('visibilitychange',sync);
    const timer=setInterval(sync,60000);
    return()=>{alive=false;controller.abort();clearInterval(timer);window.removeEventListener(GENERATION_QUOTA_CHANGED,sync);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',sync);};
  },[owner,token,pathname]);
  if(!user) return null;
  const current=state?.owner===user.id ? state : null;
  if(current?.value?.plan==='pro') return null;
  const quota=current?.value?.quota;
  return <div className={styles.quota} role="status" aria-live="polite" aria-atomic="true">
    <span>Free generation quota:</span>{quota ? <><span className={styles.quotaCounts}>Sites: {quota.sites} <span aria-hidden="true">·</span> Images: {quota.images}</span><span>Site turns: {quota.siteTurns} of 3 left</span></>
      : <span className={styles.quotaCounts}>{current?.failed?'Temporarily unavailable':'Loading…'}</span>}
  </div>;
}
