'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PRO_PLAN } from '@/lib/billing/pro-plan';

// Local extension of the existing billing surface: plan terms, current access,
// then one checkout action. Existing dark surfaces, type and controls are retained.
const control='rounded-md border border-white/15 px-4 py-2.5 text-sm text-zinc-100 hover:bg-white/5 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50';
type Status={access:'included'|'paid_plan_required'|'unavailable';checkoutAvailable:boolean;hasPaymentProfile:boolean};
export function PlanPanel({token,accountId}:{token?:string;accountId:string}) {
  const [status,setStatus]=useState<Status|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const alive=useRef(true),inFlight=useRef(false),attempt=useRef<string|null>(null);
  const authorization=useCallback(():Record<string,string>=>token?{Authorization:`Bearer ${token}`}:{},[token]);
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try {
      const response=await fetch('/api/billing/plan',{cache:'no-store',credentials:'same-origin',headers:authorization(),signal:AbortSignal.timeout(15000)});
      const body=await response.json();if(!response.ok)throw Error(body.error||'Could not load your plan. Try refreshing.');
      if(!['included','paid_plan_required','unavailable'].includes(body.access)||typeof body.checkoutAvailable!=='boolean')throw Error('Could not load your plan. Try refreshing.');
      if(alive.current)setStatus({access:body.access,checkoutAvailable:body.checkoutAvailable,hasPaymentProfile:body.hasPaymentProfile===true});
    }catch(e){if(alive.current){setStatus(null);setError((e as Error).name==='TimeoutError'?'Your plan took too long to load. Try refreshing.':(e as Error).message);}}
    finally{if(alive.current)setLoading(false);}
  },[authorization]);
  useEffect(()=>{
    alive.current=true;void load();
    const returned=new URLSearchParams(window.location.search).get('plan_checkout')==='returned';
    const timers=returned?[4000,10000,20000].map(ms=>setTimeout(()=>void load(),ms)):[];
    const focus=()=>void load();window.addEventListener('focus',focus);
    return()=>{alive.current=false;timers.forEach(clearTimeout);window.removeEventListener('focus',focus);};
  },[load]);
  async function action(kind:'checkout'|'portal'){
    if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
    const key=`galx-pro-checkout:${accountId}`;
    try {
      if(kind==='checkout'&&!attempt.current){try{attempt.current=sessionStorage.getItem(key);}catch{}attempt.current ||= crypto.randomUUID();try{sessionStorage.setItem(key,attempt.current);}catch{}}
      const response=await fetch('/api/billing/plan',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...authorization()},
        signal:AbortSignal.timeout(45000),body:JSON.stringify(kind==='checkout'?{action:kind,requestId:attempt.current}:{action:kind})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok){if(response.status===409){attempt.current=null;try{sessionStorage.removeItem(key);}catch{}}throw Error(body.error||'Could not open payment settings. Try again.');}
      const url=new URL(body.url),host=kind==='checkout'?'checkout.stripe.com':'billing.stripe.com';
      if(url.protocol!=='https:'||url.hostname!==host||url.port||url.username||url.password)throw Error('Could not open a secure payment page. Try again.');
      if(alive.current)window.location.assign(url.href);
    }catch(e){if(alive.current)setError((e as Error).name==='TimeoutError'?'The request took too long. Retry to resume the same checkout.':(e as Error).message);}
    finally{inFlight.current=false;if(alive.current)setBusy(false);}
  }
  return <section id="plan" className="scroll-mt-24 border-b border-white/10 pb-8" aria-labelledby="plan-heading">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 id="plan-heading" className="text-xl font-semibold">Your plan</h2><p className="mt-2 text-sm leading-6 text-zinc-400">{status?.access==='included'?'': 'Available plan: '}{PRO_PLAN.name} · ${PRO_PLAN.monthlyPriceUsd}/month for one account.</p></div>
      <button type="button" className={control} disabled={loading||busy} onClick={()=>void load()}>Refresh plan</button>
    </div>
    <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">Create and publish Sites with fair usage included. There is no per-update charge. API and image usage remain separate.</p>
    <p className="mt-2 text-sm leading-6 text-zinc-400">Renews monthly. Cancel anytime in Manage subscription; access continues through your paid period.</p>
    {loading?<p role="status" className="mt-4 text-sm text-zinc-400">Checking your plan…</p>:status?.access==='included'?<p role="status" className="mt-4 text-sm text-emerald-300">Your paid plan is active. Sites is included.</p>:status?.access==='paid_plan_required'?<p role="status" className="mt-4 text-sm text-zinc-300">You do not have an active paid plan for Sites. Choose Pro to get started.</p>:status?.access==='unavailable'?<p role="status" className="mt-4 text-sm text-zinc-400">Your plan could not be confirmed. Refresh before starting an update.</p>:null}
    <div className="mt-5 flex flex-wrap items-center gap-3">
      {status?.access==='included'?<Link href="/sites" className={`${control} border-indigo-400/40 bg-indigo-500/20 text-indigo-100`}>Open Sites</Link>:<button type="button" className={`${control} border-indigo-400/40 bg-indigo-500/20 text-indigo-100`} disabled={busy||loading||!status?.checkoutAvailable} onClick={()=>void action('checkout')}>{busy?'Opening…':'Continue to secure checkout'}</button>}
      {(status?.hasPaymentProfile||!status)&&<button type="button" className={control} disabled={busy||loading} onClick={()=>void action('portal')}>Manage subscription</button>}
    </div>
    {error&&<p role="alert" className="mt-4 max-w-2xl text-sm leading-6 text-red-300">{error}</p>}
  </section>;
}
