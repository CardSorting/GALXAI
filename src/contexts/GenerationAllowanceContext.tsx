'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { workspaceFetch } from '@/lib/auth/workspace-client';
import { GENERATION_QUOTA_CHANGED, readGenerationAllowance, type GenerationAllowance } from '@/lib/billing/free-generation-contract';
const AllowanceContext=createContext<{value:GenerationAllowance|null;failed:boolean;checking:boolean;refresh:()=>void}>({value:null,failed:false,checking:false,refresh:()=>{}});
export function GenerationAllowanceProvider({children}:{children:React.ReactNode}) {
  const { user } = useAuth();
  const owner=user?.id, token=user?.token;
  const pathname = usePathname();
  const [state,setState] = useState<{owner:string; value:GenerationAllowance | null; failed:boolean} | null>(null);
  const [checking,setChecking]=useState(false);
  const refreshRef=useRef<()=>void>(()=>{});
  useEffect(() => {
    if (!owner) return;
    let alive=true, active=false, queued=false;
    const controller=new AbortController();
    const refresh=async () => {
      if(document.visibilityState==='hidden') return;
      if(active){queued=true;return;}
      active=true;setChecking(true);
      try {
        const response=await workspaceFetch(owner,'/api/billing/generation-quota',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]),
          headers:token ? {Authorization:`Bearer ${token}`} : {}});
        if(!response.ok) throw new Error();
        const value=readGenerationAllowance(await response.json());
        if(!value) throw new Error();
        if(alive)setState({owner,value,failed:false});
      } catch { if(alive)setState(current=>({owner,value:current?.owner===owner && current.value?current.value:null,failed:true})); }
      finally { active=false;if(alive)setChecking(false); if(queued && alive){queued=false;void refresh();} }
    };
    refreshRef.current=()=>void refresh();
    void refresh();
    const sync=()=>void refresh();
    window.addEventListener(GENERATION_QUOTA_CHANGED,sync);
    window.addEventListener('focus',sync);
    document.addEventListener('visibilitychange',sync);
    const timer=setInterval(sync,60000);
    return()=>{refreshRef.current=()=>{};alive=false;controller.abort();clearInterval(timer);window.removeEventListener(GENERATION_QUOTA_CHANGED,sync);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',sync);};
  },[owner,token,pathname]);
  const refresh=useCallback(()=>refreshRef.current(),[]);
  const current=owner && state?.owner===owner?state:null;
  return <AllowanceContext.Provider value={{value:current?.value || null,failed:current?.failed || false,checking,refresh}}>{children}</AllowanceContext.Provider>;
}
export const useGenerationAllowance=()=>useContext(AllowanceContext);
