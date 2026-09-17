'use client';
import { useEffect, useRef, useState } from 'react';
import { clearCreditCheckoutAttempt, creditCheckoutAttempt } from '@/lib/billing/checkout-attempt';

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
/** Shared hosted checkout. A retry keeps the same durable payment attempt. */
export function TopUpForm({ token, available, accountId, draft }: { token?: string; available: boolean; accountId: string; draft?: { amount: string; onChange: (value: string) => void } }) {
  const [localAmount, setLocalAmount] = useState('10');
  const amount = draft?.amount ?? localAmount;
  const setAmount = draft?.onChange ?? setLocalAmount;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<{ amountUsd: number; creditUsd: number; bonusUsd: number } | null>(null);
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [quoteError, setQuoteError] = useState('');
  const active = useRef(true);
  const amountId = 'topup-amount';
  const attempt = useRef<{ amount: number; id: string } | null>(null);
  const inFlight = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('amount');
    const value = Number(requested);
    if (requested && Number.isFinite(value) && value >= 1 && value <= 10000 && Math.abs(value*100-Math.round(value*100)) < 0.000001) setAmount(String(value));
  }, [setAmount]);
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
    try {
      if (!attempt.current || attempt.current.amount !== Number(amount)) {
        let id: string;
        try { id = creditCheckoutAttempt(sessionStorage, accountId, Number(amount)); } catch { id = crypto.randomUUID(); }
        attempt.current = { amount: Number(amount), id };
      }
      const response = await fetch('/api/stripe/checkout', { method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(45000), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ amount: Number(amount), requestId: attempt.current.id }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) { attempt.current = null; try { clearCreditCheckoutAttempt(sessionStorage, accountId, Number(amount)); } catch { /* Optional storage. */ } }
        throw new Error(result.error || 'Could not open checkout. Try again.');
      }
      const target = new URL(result.url);
      if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com' || target.port || target.username || target.password) throw new Error('Could not open secure checkout. Try again.');
      if (active.current) window.location.assign(target.href);
    } catch (e) { if (active.current) { setError((e as Error).name === 'TimeoutError' ? 'Checkout took too long. Retry to resume the same payment attempt.' : (e as Error).message); setBusy(false); } inFlight.current = false; }
  }
  const PRESET_TIERS: { amount: number; label: string; badge?: string }[] = [
    { amount: 10,  label: 'Developer Tier',       badge: '⚡ Instant Unlock' },
    { amount: 25,  label: 'Starter Builder',       badge: '50% Match' },
    { amount: 50,  label: 'Growth VIP',            badge: '60% Match' },
    { amount: 100, label: 'Fleet Scale',           badge: '75% Match' },
    { amount: 250, label: 'Enterprise Sovereign',  badge: '100% Double Match' },
    { amount: 500, label: 'Hyperscale Infra',      badge: '100% Double Match' },
  ];

  return <form className="mt-6 space-y-5" onSubmit={event => { event.preventDefault(); void checkout(); }}>
    <fieldset disabled={busy || !available} className="space-y-4"><legend className="mb-3 text-sm font-medium text-zinc-300">Select compute tier (USD one-time deposit)</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{PRESET_TIERS.map(({ amount: value, label, badge }) => {
        const active = Number(amount) === value;
        return (
          <button key={value} type="button" aria-pressed={active} onClick={() => { setAmount(String(value)); setError(''); }}
            className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left text-sm transition-all focus-visible:outline-indigo-300 ${
              active ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-100' : 'border-white/10 text-zinc-100 hover:border-white/20 hover:bg-white/[0.04]'
            }`}>
            <span className="font-semibold tabular-nums">${value}</span>
            <span className={`mt-0.5 truncate text-[11px] ${active ? 'text-indigo-300' : 'text-zinc-500'}`}>{label}</span>
            {badge && <span className={`mt-1 text-[10px] font-medium ${active ? 'text-indigo-300' : 'text-zinc-600'}`}>{badge}</span>}
          </button>
        );
      })}</div>
      <div className="pt-1">
        <label htmlFor={amountId} className="block text-sm text-zinc-400">Custom amount</label>
        <input id={amountId} aria-describedby={`${amountId}-help`} aria-invalid={!valid} className="mt-1.5 block min-h-11 w-full rounded-md border border-white/15 bg-[#090b10] px-3 py-2 text-base text-zinc-100 focus-visible:outline-indigo-300 sm:w-48" type="number" inputMode="decimal" min="1" max="10000" step="0.01" required value={amount} onChange={event => { setAmount(event.target.value); setError(''); }} />
        <p id={`${amountId}-help`} className={`mt-1 text-xs ${valid ? 'text-zinc-500' : 'text-red-300'}`}>Enter $1–$10,000. Credits are non-expiring.</p>
      </div>
    </fieldset>
    {quote && quote.amountUsd === Number(amount) && <dl className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-1.5 text-sm"><div className="flex justify-between gap-4"><dt className="text-zinc-400">You pay once</dt><dd>{money(quote.amountUsd)}</dd></div><div className="flex justify-between gap-4"><dt className="text-zinc-400">Credit added{quote.bonusUsd > 0 ? ' · includes match bonus' : ''}</dt><dd className="font-semibold text-zinc-100">{money(quote.creditUsd)}</dd></div>{quote.bonusUsd > 0 && <div className="flex justify-between gap-4"><dt className="text-emerald-400">Match bonus</dt><dd className="font-medium text-emerald-400">+{money(quote.bonusUsd)}</dd></div>}</dl>}
    {quoteError && <p role="alert" className="text-sm text-red-300">{quoteError} <button type="button" onClick={() => setQuoteRevision(n => n + 1)} className="underline">Retry</button></p>}
    {valid && available && !quote && !quoteError && <p role="status" className="text-sm text-zinc-400">Calculating your credit…</p>}
    <button type="submit" disabled={!valid || busy || !available || !quote || quote.amountUsd !== Number(amount)} className="min-h-11 w-full rounded-md border border-indigo-400/40 bg-indigo-500/20 px-4 py-2.5 text-sm font-medium text-indigo-100 hover:bg-indigo-500/30 focus-visible:outline-indigo-300 disabled:opacity-50 sm:w-auto">{busy ? 'Opening checkout…' : 'Continue to checkout'}</button>
    <p className="text-xs leading-6 text-zinc-400">{available ? 'Paid securely via Stripe. Non-expiring compute credits — no subscriptions, no negative overdrafts, no hidden fees.' : 'Online payments are currently unavailable. Please try again later.'}</p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </form>;
}
