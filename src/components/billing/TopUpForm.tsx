'use client';
import { useEffect, useRef, useState } from 'react';

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
/** Shared hosted checkout. A retry keeps the same durable payment attempt. */
export function TopUpForm({ token, available, surface = 'billing', accountId }: { token?: string; available: boolean; surface?: 'billing' | 'keys'; accountId: string }) {
  const [amount, setAmount] = useState('25');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<{ amountUsd: number; creditUsd: number; bonusUsd: number } | null>(null);
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [quoteError, setQuoteError] = useState('');
  const active = useRef(true);
  const attempt = useRef<{ amount: number; id: string } | null>(null);
  const inFlight = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('amount');
    const value = Number(requested);
    if (requested && Number.isFinite(value) && value >= 1 && value <= 10000 && Math.abs(value*100-Math.round(value*100)) < 0.000001) setAmount(String(value));
  }, []);
  const valid = amount.trim() !== '' && Number.isFinite(Number(amount)) && Number(amount) >= 1 && Number(amount) <= 10000 && Math.abs(Number(amount) * 100 - Math.round(Number(amount) * 100)) < 0.000001;
  useEffect(() => {
    setQuote(null); setQuoteError('');
    if (!valid || !available) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/billing/quote?amount=${Number(amount)}`, { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]), headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load credit terms.');
        if (result.amountUsd !== Number(amount) || !Number.isFinite(result.creditUsd) || !Number.isFinite(result.bonusUsd)) throw new Error('Could not load credit terms. Please retry.');
        if (!controller.signal.aborted) setQuote(result);
      } catch (e) { if (!controller.signal.aborted) setQuoteError((e as Error).name === 'TimeoutError' ? 'Credit terms took too long to load.' : (e as Error).message); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [amount, valid, available, token, quoteRevision]);
  async function checkout() {
    if (!valid || !available || inFlight.current || !quote || quote.amountUsd !== Number(amount)) return;
    inFlight.current = true; setBusy(true); setError('');
    const storageKey = `galx_checkout:${accountId}:${surface}:${Number(amount)}`;
    try {
      if (!attempt.current || attempt.current.amount !== Number(amount)) {
        let saved: { id: string; created: number } | null = null;
        try { saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { /* Storage can be disabled. */ }
        const id = saved && Date.now() - saved.created < 90 * 60_000 ? saved.id : crypto.randomUUID();
        attempt.current = { amount: Number(amount), id };
        try { sessionStorage.setItem(storageKey, JSON.stringify({ id, created: saved?.id === id ? saved.created : Date.now() })); } catch { /* In-memory retry remains available. */ }
      }
      const response = await fetch('/api/stripe/checkout', { method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(45000), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ amount: Number(amount), surface, requestId: attempt.current.id }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) { attempt.current = null; try { sessionStorage.removeItem(storageKey); } catch { /* Optional storage. */ } }
        throw new Error(result.error || 'Could not open checkout. Try again.');
      }
      const target = new URL(result.url);
      if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com' || target.port || target.username || target.password) throw new Error('Could not open secure checkout. Try again.');
      if (active.current) window.location.assign(target.href);
    } catch (e) { if (active.current) { setError((e as Error).name === 'TimeoutError' ? 'Checkout took too long. Retry to resume the same payment attempt.' : (e as Error).message); setBusy(false); } inFlight.current = false; }
  }
  return <form className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); void checkout(); }}>
    <fieldset disabled={busy || !available} className="space-y-3"><legend className="mb-2 text-sm text-zinc-300">Top-up amount (USD)</legend>
      <div className="flex flex-wrap gap-2">{[25,50,100].map(value => <button key={value} type="button" aria-pressed={Number(amount) === value} onClick={() => { setAmount(String(value)); setError(''); }} className={`rounded-md border px-4 py-2 text-sm focus-visible:outline-indigo-300 ${Number(amount) === value ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-100' : 'border-white/15 text-zinc-100 hover:bg-white/5'}`}>${value}</button>)}</div>
      <label className="block text-sm text-zinc-400">Custom amount<input className="mt-2 block w-full rounded-md border border-white/15 bg-[#090b10] px-3 py-2 text-sm text-zinc-100 focus-visible:outline-indigo-300 sm:w-48" type="number" min="1" max="10000" step="0.01" required value={amount} onChange={event => { setAmount(event.target.value); setError(''); }} /></label>
    </fieldset>
    {quote && quote.amountUsd === Number(amount) && <dl className="max-w-sm space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-zinc-400">You pay once</dt><dd>{money(quote.amountUsd)}</dd></div><div className="flex justify-between gap-4"><dt className="text-zinc-400">Credit added{quote.bonusUsd > 0 ? ' · includes bonus' : ''}</dt><dd className="font-medium text-zinc-100">{money(quote.creditUsd)}</dd></div></dl>}
    {quoteError && <p role="alert" className="text-sm text-red-300">{quoteError} <button type="button" onClick={() => setQuoteRevision(n => n + 1)} className="underline">Retry</button></p>}
    <button type="submit" disabled={!valid || busy || !available || !quote || quote.amountUsd !== Number(amount)} className="w-full rounded-md border border-indigo-400/40 bg-indigo-500/20 px-4 py-2.5 text-sm font-medium text-indigo-100 hover:bg-indigo-500/30 focus-visible:outline-indigo-300 disabled:opacity-50 sm:w-auto">{busy ? 'Opening checkout…' : 'Continue to checkout'}</button>
    <p className="text-xs leading-6 text-zinc-400">{available ? 'Pay securely with Stripe. No subscription or automatic reload. Credit is added after payment confirmation.' : 'Online payments are currently unavailable. Please try again later.'}</p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </form>;
}
