'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type OrbitStatus = { name:string; handle:string; checkoutAvailable:boolean; testMode:boolean; state:string; paidThrough:string|null;
  canManage:boolean; canCancel:boolean; works:Array<{id:string;title:string;imageUrl:string;thumbnailUrl:string}> };
const control='inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm text-zinc-100 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50';

export function OrbitPanel({ handle, name }: {handle:string;name:string}) {
  const [status,setStatus]=useState<OrbitStatus|null>(null);
  const [signedOut,setSignedOut]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [confirm,setConfirm]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const request=useRef<AbortController|null>(null);
  const load=useCallback(async()=>{
    request.current?.abort(); const controller=new AbortController(); request.current=controller;
    setLoading(true);setError('');
    try {
      const response=await fetch(`/api/billing/orbit?handle=${encodeURIComponent(handle)}`,{cache:'no-store',credentials:'same-origin',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
      if(response.status===401){setSignedOut(true);setStatus(null);return;}
      if(!response.ok)throw new Error('Could not check your Orbit. Please try again.');
      const body=await response.json();
      if(!controller.signal.aborted){setStatus(body);setSignedOut(false);}
    } catch(e) {if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Could not check your Orbit.');}
    finally {if(!controller.signal.aborted)setLoading(false);}
  },[handle]);
  useEffect(()=>{void load();return()=>request.current?.abort();},[load]);
  async function action(action:'checkout'|'portal'|'cancel') {
    if(busy)return;setBusy(true);setError('');setNotice('');
    try {
      const response=await fetch('/api/billing/orbit',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action,handle}),signal:AbortSignal.timeout(30000)});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Could not update your Orbit. Try again.');
      if(action==='cancel'){setConfirm(false);setNotice('Future renewal canceled. Paid access continues through your current period.');await load();}
      else {
        const url=new URL(body.url);
        if(url.protocol!=='https:'||url.hostname!==(action==='checkout'?'checkout.stripe.com':'billing.stripe.com')||url.username||url.password||url.port)throw new Error('Could not open secure billing.');
        window.location.assign(url.href);
      }
    } catch(e){setError(e instanceof Error?e.message:'Could not update your Orbit.');}
    finally {setBusy(false);}
  }
  const active=status?.state==='active'||status?.state==='ending';
  return <section className="my-10 border-y border-white/10 py-8" aria-labelledby="orbit-heading">
    <h2 id="orbit-heading" className="text-xl font-semibold">Orbit {name}</h2>
    <p className="mt-2 text-base text-zinc-200">Support the practice. $10 USD / month.</p>
    {status?.testMode&&<p className="mt-2 text-sm text-amber-200">Test mode — no live payment or live patron access.</p>}
    <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Access designated patron-only digital work from {name}. Public work and following remain free. Orbit does not include generation, commissions, or creative control.</p>
    {active&&<p className="mt-4 text-sm text-zinc-200">Patron of {name}{status?.paidThrough&&<> · {status.state==='ending'?'Access ends':'Paid through'} {new Date(status.paidThrough).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})} UTC</>}</p>}
    <div className="mt-5 flex flex-wrap gap-3">
      {signedOut?<Link className={control} href={`/login?next=${encodeURIComponent(`/profile/${handle}`)}`}>Sign in to view your Orbit</Link>:
        status?.checkoutAvailable?<button className={control} disabled={busy||loading} onClick={()=>void action('checkout')}>{busy?'Opening checkout…':`Orbit ${name} — $10/month`}</button>:
        !active&&<p className="text-sm text-zinc-300">{loading?'Checking Orbit availability…':status?.state==='processing'?'Your subscription is being confirmed. Refresh before purchasing again.':status?.state==='payment_required'?'Your payment needs attention. Manage billing to update your payment method.':'New Orbit subscriptions are not available yet.'}</p>}
      {status?.canManage&&<button className={control} disabled={busy} onClick={()=>void action('portal')}>Manage billing</button>}
      {status?.canCancel&&!confirm&&<button className={control} disabled={busy} onClick={()=>setConfirm(true)}>Cancel renewal</button>}
      {!signedOut&&<button className={control} disabled={busy||loading} onClick={()=>void load()}>Refresh status</button>}
    </div>
    {confirm&&<div className="mt-5 space-y-3"><p className="text-sm text-zinc-200">Cancel future renewals of Orbit {name}? Your current paid access will continue until the end of the billing period.</p><div className="flex flex-wrap gap-3"><button className={control} disabled={busy} onClick={()=>void action('cancel')}>{busy?'Canceling renewal…':'Confirm cancellation'}</button><button className={control} disabled={busy} onClick={()=>setConfirm(false)}>Keep my Orbit</button></div></div>}
    {notice&&<p role="status" className="mt-4 text-sm text-zinc-200">{notice}</p>}
    {error&&<p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    {active&&<div className="mt-8"><h3 className="text-lg font-semibold">{name} — Patron Works</h3>{status?.works.length?<div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{status.works.map(work=><figure key={work.id}><a href={work.imageUrl} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300"><img src={work.thumbnailUrl} alt={work.title} loading="lazy" className="h-auto w-full rounded-md" /></a><figcaption className="mt-2 text-sm text-zinc-200">{work.title}</figcaption></figure>)}</div>:<p className="mt-3 text-sm text-zinc-300">No patron works are available right now. Your public archive remains open below.</p>}</div>}
  </section>;
}
