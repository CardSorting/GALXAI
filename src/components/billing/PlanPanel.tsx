'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PRO_PLAN } from '@/lib/billing/pro-plan';
import { parsePlanStatus, type ConsumerPlanId, type PlanStatus } from '@/lib/billing/plan-status';

const control = 'min-h-11 rounded-md border border-white/15 px-4 py-2.5 text-sm text-zinc-100 hover:bg-white/5 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50';
const primary = `${control} border-indigo-400/40 bg-indigo-500/20 text-indigo-100`;
const date = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function PlanPanel({ token, accountId, compact = false, returnSearch, refreshKey = 0 }: { token?: string; accountId: string; compact?: boolean; returnSearch?: string; refreshKey?: number }) {
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'checkout' | 'portal' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<ConsumerPlanId>('pro');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [returned, setReturned] = useState<'returned' | 'canceled' | null>(null);
  const [waiting, setWaiting] = useState(false);
  const alive = useRef(true), inFlight = useRef(false), attempt = useRef<string | null>(null);
  const confirmed = useRef(false);
  const read = useRef<AbortController | null>(null), actionRequest = useRef<AbortController | null>(null);
  const authorization = useCallback((): Record<string, string> => token ? { Authorization: `Bearer ${token}` } : {}, [token]);
  const load = useCallback(async () => {
    read.current?.abort();
    const controller = new AbortController();
    read.current = controller;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/billing/plan', { cache: 'no-store', credentials: 'same-origin', headers: authorization(), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
      const body = await response.json();
      const next = parsePlanStatus(body);
      if (!response.ok || !next) throw new Error('Could not refresh your plan. Please try again.');
      if (!alive.current || controller.signal.aborted) return;
      setStatus(next);
      confirmed.current = next.access === 'included';
      if (next.access === 'included') {
        setWaiting(false);
        attempt.current = null;
        try { sessionStorage.removeItem(`galx-plan-checkout:${accountId}:${selectedPlan}`); } catch { /* Optional retry storage. */ }
      }
    } catch (error) {
      if (alive.current && !controller.signal.aborted) setError((error as Error).name === 'TimeoutError' ? 'Checking your plan took too long. Please try again.' : 'Could not refresh your plan. Please try again.');
    } finally {
      if (alive.current && !controller.signal.aborted) setLoading(false);
    }
  }, [authorization, accountId, selectedPlan]);

  useEffect(() => {
    alive.current = true;
    const value = new URLSearchParams(window.location.search).get('plan_checkout') || new URLSearchParams(returnSearch).get('plan_checkout');
    const requestedPlan = new URLSearchParams(window.location.search).get('plan') || new URLSearchParams(returnSearch).get('plan');
    if (requestedPlan && ['pro', 'creator', 'studio', 'max'].includes(requestedPlan)) setSelectedPlan(requestedPlan as ConsumerPlanId);
    setReturned(value === 'returned' || value === 'canceled' ? value : null);
    setWaiting(value === 'returned');
    void load();
    // Only read status after a return. Never repeat checkout creation automatically.
    const timers = value === 'returned' ? [4000, 10000, 20000].map(ms => setTimeout(() => { if (!confirmed.current) void load(); }, ms)) : [];
    const stopWaiting = value === 'returned' ? setTimeout(() => setWaiting(false), 22000) : undefined;
    const focus = () => { if (document.visibilityState === 'visible') void load(); };
    window.addEventListener('focus', focus);
    return () => {
      alive.current = false;
      read.current?.abort(); actionRequest.current?.abort();
      timers.forEach(clearTimeout); clearTimeout(stopWaiting);
      window.removeEventListener('focus', focus);
    };
  }, [load, returnSearch, refreshKey]);

  async function action(kind: 'checkout' | 'portal') {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(kind); setActionError('');
    const key = `galx-plan-checkout:${accountId}:${selectedPlan}`;
    const controller = new AbortController(); actionRequest.current = controller;
    try {
      if (kind === 'checkout' && !attempt.current) {
        try { attempt.current = sessionStorage.getItem(key); } catch { /* Optional retry storage. */ }
        attempt.current ||= crypto.randomUUID();
        try { sessionStorage.setItem(key, attempt.current); } catch { /* Keep the in-memory identity. */ }
      }
      const response = await fetch('/api/billing/plan', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...authorization() },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(45000)]), body: JSON.stringify(kind === 'checkout' ? { action: kind, requestId: attempt.current, plan: selectedPlan } : { action: kind }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) {
          attempt.current = null; try { sessionStorage.removeItem(key); } catch { /* Optional storage. */ }
          void load();
        }
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not open billing. Please try again.');
      }
      const url = new URL(body.url), host = kind === 'checkout' ? 'checkout.stripe.com' : 'billing.stripe.com';
      if (url.protocol !== 'https:' || url.hostname !== host || url.port || url.username || url.password) throw new Error('Could not open a secure payment page. Please try again.');
      if (alive.current && !controller.signal.aborted) window.location.assign(url.href);
    } catch (error) {
      if (alive.current && !controller.signal.aborted) setActionError((error as Error).name === 'TimeoutError' ? 'The request took too long. Try again to resume the same checkout.' : (error as Error).message);
    } finally {
      inFlight.current = false;
      if (alive.current && !controller.signal.aborted) setBusy(null);
    }
  }

  const subscription = status?.subscription;
  const included = status?.access === 'included';
  const paymentRequired = subscription?.state === 'payment_required';
  const canManage = status?.hasPaymentProfile || !status || Boolean(error);
  // A return URL is a hint to check; it never proves payment or permits another purchase.
  const confirming = returned === 'returned' && !included && !['payment_required', 'paused', 'canceled'].includes(subscription?.state || '');
  const selectedOffer = status?.offers.find(offer => offer.id === selectedPlan) || status?.offers[0];
  let title = 'Your plan';
  let detail = 'Checking your plan…';
  if (status) {
    title = included || ['active', 'ending', 'payment_required', 'paused', 'processing'].includes(subscription?.state || '') ? 'Your subscription' : 'Choose a plan';
    detail = included ? 'Your Image Studio subscription is active under the published fair-use terms.' : 'Choose a monthly Image Studio plan to continue creating.';
    if (subscription?.state === 'ending') detail = included ? 'Your subscription is set to end. Pro access is still active.' : 'Your subscription is set to end. Check billing for your current access.';
    else if (paymentRequired) detail = 'Your subscription needs a payment update. Review it in billing to continue.';
    else if (subscription?.state === 'paused') detail = 'Your subscription is paused. Review it in billing.';
    else if (subscription?.state === 'processing') detail = 'Your subscription is being confirmed. Check billing before starting another checkout.';
    else if (subscription?.state === 'canceled' && !included) detail = 'Your previous subscription has ended. Choose a plan again when you’re ready.';
    else if (subscription?.state === 'active' && !included) detail = 'Your subscription is active, but access could not be confirmed. Review billing before paying again.';
    else if (status.access === 'unavailable' || (subscription?.state === 'unavailable' && !included)) detail = 'Your plan could not be confirmed. Please refresh before starting a checkout.';
  } else if (!loading) detail = 'Your plan is temporarily unavailable. You can still open billing management.';

  if (compact) return <section aria-labelledby="plan-summary-heading" className="border-b border-white/10 pb-7"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="plan-summary-heading" className="text-xl font-semibold">{title}</h2><Link href={BILLING_PATHS.plan} className={paymentRequired ? primary : control}>{paymentRequired ? 'Review payment' : 'View plan'}</Link></div><p role="status" className={`mt-3 max-w-2xl text-sm leading-6 ${paymentRequired ? 'text-amber-200' : 'text-zinc-400'}`}>{detail}</p>{loading && status && <p role="status" className="mt-2 text-sm text-zinc-400">Refreshing your plan…</p>}{(subscription?.endsAt || subscription?.periodEnd) && <p className="mt-3 text-sm text-zinc-300">{subscription.endsAt ? 'Subscription ends' : 'Current billing period ends'} {date(subscription.endsAt || subscription.periodEnd!)} · UTC</p>}{error && <p role="alert" className="mt-3 text-sm leading-6 text-red-300">{status ? 'Showing your last checked plan. ' : ''}{error} <button type="button" disabled={loading} onClick={() => void load()} className="min-h-11 text-indigo-300 underline underline-offset-4">Refresh plan</button></p>}</section>;

  return <section id="plan" className="scroll-mt-24" aria-labelledby="plan-heading">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><h2 id="plan-heading" className="text-xl font-semibold">{title}</h2><p role="status" className={`mt-2 max-w-2xl text-sm leading-6 ${paymentRequired ? 'text-amber-200' : included ? 'text-emerald-300' : 'text-zinc-300'}`}>{detail}</p></div>
      <button type="button" className={control} disabled={loading || Boolean(busy)} onClick={() => void load()}>{loading && status ? 'Refreshing…' : 'Refresh plan'}</button>
    </div>
    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
      <div><dt className="text-zinc-400">{included ? 'Current access' : ['none', 'canceled'].includes(subscription?.state || '') ? 'Selected plan' : 'Plan'}</dt><dd className="mt-1 leading-6 text-zinc-100">{included ? 'Image Studio access · one account' : `${selectedOffer?.name || PRO_PLAN.name} · $${selectedOffer?.monthlyPriceUsd || PRO_PLAN.monthlyPriceUsd} / month · one account`}</dd></div>
      {subscription?.endsAt ? <div><dt className="text-zinc-400">Subscription ends</dt><dd className="mt-1 leading-6 text-zinc-100">{date(subscription.endsAt)} · UTC</dd></div> : subscription?.periodEnd ? <div><dt className="text-zinc-400">Current billing period ends</dt><dd className="mt-1 leading-6 text-zinc-100">{date(subscription.periodEnd)} · UTC</dd></div> : null}
    </dl>
    {!included && status?.offers.length ? <fieldset className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Choose an Image Studio plan"><legend className="sr-only">Choose an Image Studio plan</legend>{status.offers.map(offer => { const selected = selectedPlan === offer.id; return <label key={offer.id} className={`block rounded-lg border p-4 transition ${selected ? 'border-indigo-400/60 bg-white/[0.06]' : 'border-white/10 bg-white/[0.02]'} ${offer.checkoutAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}><span className="flex items-start justify-between gap-3"><span><span className="block font-medium text-zinc-100">{offer.name}</span><span className={`mt-1 block text-xs leading-5 ${selected ? 'text-indigo-100/90' : 'text-zinc-400'}`}>{offer.audience}</span></span><span className={`whitespace-nowrap text-sm tabular-nums ${selected ? 'text-indigo-50' : 'text-zinc-200'}`}>${offer.monthlyPriceUsd}/mo</span></span><input className="sr-only" type="radio" name="image-plan" value={offer.id} checked={selected} disabled={!offer.checkoutAvailable || Boolean(busy)} onChange={() => { setSelectedPlan(offer.id); attempt.current = null; setActionError(''); }} /><span className={`mt-3 block text-xs ${selected ? 'text-indigo-100' : 'text-zinc-300'}`}>{offer.checkoutAvailable ? 'Available through secure checkout.' : 'Temporarily unavailable.'}</span></label>; })}</fieldset> : null}
    <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">All active Image Studio plans are for one account and follow the published fair-use terms. MAX is an individual plan; account sharing, seats, and shared workspaces are not included.</p>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{subscription?.state === 'ending' ? 'Renewal is canceled. Review your subscription in billing; access continues through the paid period.' : 'Paid subscriptions renew monthly. Cancel in Manage subscription; access continues through the paid period.'}</p>
    {returned === 'canceled' && <p role="status" className="mt-4 text-sm leading-6 text-zinc-300">Checkout was closed. You can resume when you’re ready.</p>}
    {confirming && <p role="status" className="mt-4 text-sm leading-6 text-zinc-300">{waiting ? 'Confirming your subscription… This can take a moment.' : 'Your subscription is still being confirmed. Refresh your plan or open billing before paying again.'}</p>}
    <div className="mt-5 flex flex-wrap items-center gap-3">
      {paymentRequired ? <button type="button" className={primary} disabled={Boolean(busy)} onClick={() => void action('portal')}>{busy === 'portal' ? 'Opening billing…' : 'Review payment'}</button> : included ? <Link href="/images" className={primary}>Open Image Studio</Link> : <button type="button" className={primary} disabled={Boolean(busy) || loading || Boolean(error) || confirming || !selectedOffer?.checkoutAvailable} onClick={() => void action('checkout')}>{busy === 'checkout' ? 'Opening checkout…' : returned === 'canceled' ? 'Resume checkout' : `Choose ${selectedOffer?.name || PRO_PLAN.name} · $${selectedOffer?.monthlyPriceUsd || PRO_PLAN.monthlyPriceUsd}/month`}</button>}
      {included && paymentRequired && <Link href="/images" className={control}>Open Image Studio</Link>}
      {canManage && !paymentRequired && <button type="button" className={control} disabled={Boolean(busy)} onClick={() => void action('portal')}>{busy === 'portal' ? 'Opening billing…' : 'Manage subscription'}</button>}
      <Link href="/pricing/galx-pro" className="inline-flex min-h-11 items-center text-sm text-indigo-300 underline underline-offset-4">View plan details</Link>
    </div>
    {status && !included && !status.checkoutAvailable && !confirming && ['none', 'canceled'].includes(subscription?.state || '') && <p className="mt-3 text-sm text-zinc-400">Plan checkout is temporarily unavailable. Please try again later.</p>}
    {error && <p role="alert" className="mt-4 max-w-2xl text-sm leading-6 text-red-300">{status ? 'Showing your last checked plan. ' : ''}{error}</p>}
    {actionError && <p role="alert" className="mt-4 max-w-2xl text-sm leading-6 text-red-300">{actionError}</p>}
  </section>;
}
