'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TopUpForm } from '@/components/billing/TopUpForm';
import { CheckoutStatus } from '@/components/billing/CheckoutStatus';

export function QuickTopUpClient() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p role="status" className="text-sm text-zinc-400">Loading account…</p>;
  if (!user) return <div className="space-y-4 text-sm"><p className="text-zinc-400">Sign in to add credit to your account.</p><Link href="/auth/signin?next=%2Fkeys%2Ftop-up" className="text-indigo-300 underline underline-offset-4">Sign in</Link></div>;
  return <AccountTopUp key={user.id} accountId={user.id} token={user.token} email={user.email} />;
}

function AccountTopUp({ token, email, accountId }: { token?: string; email?: string; accountId: string }) {
  const [data, setData] = useState<{ balance: number; debt: number; available: boolean } | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [paymentPending, setPaymentPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(() => { setRevision(value => value + 1); window.dispatchEvent(new Event('galx_wallet_update')); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setRefreshing(true); setError('');
    fetch('/api/wallet/summary', { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]), headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || typeof result.summary?.balanceUsd !== 'number') throw new Error(result.error || 'Could not load your balance. Try again.');
        if (!controller.signal.aborted) setData({ balance: result.summary.balanceUsd, debt: result.summary.paymentDebtUsd || 0, available: result.paymentsAvailable === true });
      }).catch(e => { if (!controller.signal.aborted) setError(e.name === 'TimeoutError' ? 'Balance took too long to load. Please retry.' : e.message); })
      .finally(() => { if (!controller.signal.aborted) setRefreshing(false); });
    return () => controller.abort();
  }, [token, revision]);
  useEffect(() => {
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);
  return <div className="space-y-5">
    {email && <p className="break-all text-sm text-zinc-400">{email}</p>}
    <CheckoutStatus accountId={accountId} token={token} onConfirmed={refresh} onPending={setPaymentPending} />
    {error ? <div className="space-y-3"><p role="alert" className="text-sm text-red-300">{error}</p><button type="button" onClick={refresh} className="text-sm text-indigo-300 underline underline-offset-4">Try again</button></div> : !data ? <p role="status" className="text-sm text-zinc-400">Loading balance…</p> : <>
      <div className="flex items-center justify-between gap-4 border-y border-white/10 py-5"><div><p className="text-sm text-zinc-400">Available credit</p><p className="mt-2 text-3xl font-semibold tabular-nums">{data.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 })}</p></div><button type="button" onClick={refresh} className="rounded-md border border-white/15 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5">Refresh</button></div>
      {data.debt > 0 && <p className="text-sm text-amber-200">${data.debt.toFixed(2)} outstanding from a payment adjustment. Your next top-up covers this first.</p>}
      {refreshing && <p role="status" className="text-xs text-zinc-400">Updating balance…</p>}
      {!paymentPending && <TopUpForm accountId={accountId} token={token} available={data.available} surface="keys" />}
    </>}
    <p className="pt-3 text-sm"><Link href="/keys" className="text-indigo-300 underline underline-offset-4">Back to API keys</Link></p>
  </div>;
}
