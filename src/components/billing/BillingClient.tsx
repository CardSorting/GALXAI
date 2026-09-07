'use client';

import Link from 'next/link';
import { TopUpForm } from './TopUpForm';
import { CheckoutStatus } from './CheckoutStatus';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { BillingData } from '@/lib/billing/account';
import { billingCsv } from '@/lib/billing/csv';

const control = 'rounded-md border border-white/15 bg-[#090b10] px-3 py-2 text-sm text-zinc-100 focus-visible:outline-indigo-300 disabled:opacity-50';
const button = `${control} hover:bg-white/5 disabled:cursor-not-allowed`;
const link = 'text-indigo-300 underline underline-offset-4 hover:text-indigo-200';
const money = (amount: number) => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 });
const date = (value: string) => new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
const types: Record<string, string> = { deposit: 'Top-up', auto_reload: 'Auto-reload', usage_draw: 'Usage', match_grant: 'Credit', refund: 'Refund', adjustment: 'Adjustment' };

export function BillingClient() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p role="status" className="py-8 text-sm text-zinc-400">Loading account…</p>;
  if (!user) return <div className="space-y-4 py-8"><p className="text-sm text-zinc-400">Sign in to view your balance, transactions, and invoices.</p><Link href="/auth/signin?next=%2Fbilling" className={link}>Sign in</Link></div>;
  return <AccountBilling key={user.id} accountId={user.id} token={user.token} email={user.email || 'Signed-in account'} />;
}

function AccountBilling({ token, email, accountId }: { token?: string; email: string; accountId: string }) {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState('all');
  const [paymentPending, setPaymentPending] = useState(false);
  const version = useRef(0);
  const active = useRef(true);
  const load = useCallback(async (cursor?: string) => {
    const revision = ++version.current;
    setError('');
    if (cursor) setLoadingMore(true); else { setLoading(true); setData(null); }
    try {
      const params = new URLSearchParams({ type: filter });
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(`/api/billing?${params}`, { credentials: 'same-origin', cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not load billing. Try again.');
      if (!active.current || version.current !== revision) return;
      setData(previous => ({ ...result, transactions: cursor ? [...(previous?.transactions || []), ...result.transactions] : result.transactions }));
    } catch (e) { if (active.current && version.current === revision) setError((e as Error).message); }
    finally { if (active.current && version.current === revision) { setLoading(false); setLoadingMore(false); } }
  }, [token, filter]);
  useEffect(() => { active.current = true; void load(); return () => { active.current = false; };  }, [load]);
  useEffect(() => {
    const refresh = () => { void load(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [load]);

  async function paymentAction(action: 'portal') {
    setBusy(action); setActionError('');
    try {
      const response = await fetch(`/api/stripe/${action}`, { method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: '{}' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not open payments. Try again.');
      const target = new URL(result.url);
      if (target.protocol !== 'https:' || target.hostname !== 'billing.stripe.com' || target.port || target.username || target.password) throw new Error('Could not open a secure payment page. Try again.');
      if (active.current) window.location.assign(target.href);
    } catch (e) { if (active.current) { setActionError((e as Error).message); setBusy(''); } }
  }

  function exportHistory() {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([billingCsv(data.transactions)], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'galxai-transactions.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="space-y-8 pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="break-all text-sm text-zinc-400">{email}</p><button type="button" className={button} disabled={loading || loadingMore} onClick={() => { void load(); window.dispatchEvent(new Event('galx_wallet_update')); }}>Refresh</button></div>
    <CheckoutStatus accountId={accountId} token={token} onConfirmed={() => { void load(); }} onPending={setPaymentPending} />
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {loading && <p role="status" className="text-sm text-zinc-400">Loading billing…</p>}
    {data && <>
      <section id="balance" className="scroll-mt-24 border-b border-white/10 pb-8">
        <h2 className="text-xl font-semibold">Balance</h2>
        <dl className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1"><dt className="text-sm text-zinc-400">Available credit</dt><dd className="mt-2 text-3xl font-semibold tabular-nums">{money(data.summary.balanceUsd)}</dd></div>
          <div><dt className="text-sm text-zinc-400">Usage this month · UTC</dt><dd className="mt-2 text-2xl tabular-nums">{money(data.summary.currentMonthSpendUsd)}</dd></div>
          <div><dt className="text-sm text-zinc-400">Total deposited</dt><dd className="mt-2 text-2xl tabular-nums">{money(data.summary.depositedTotalUsd)}</dd></div>
        </dl>
        {data.summary.paymentDebtUsd > 0 && <p className="mt-4 text-sm text-amber-200">{money(data.summary.paymentDebtUsd)} outstanding from a payment adjustment. Your next top-up covers this first.</p>}
        {!paymentPending && <TopUpForm accountId={accountId} token={token} available={data.paymentsAvailable} />}
      </section>
      <section id="history" className="scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Transactions</h2><div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="transaction-type">Transaction type</label><select id="transaction-type" value={filter} onChange={event => setFilter(event.target.value)} className={control}>{[['all', 'All transactions'], ['deposit', 'Top-ups'], ['usage', 'Usage'], ['grant', 'Credits'], ['refund', 'Refunds']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <button type="button" className={button} onClick={exportHistory} disabled={!data.transactions.length}>Export loaded rows</button>
        </div></div>
        <p className="mt-2 text-xs leading-6 text-zinc-400">Recorded wallet changes, newest first. Dates are UTC.</p>
        {!data.transactions.length ? <p className="py-6 text-sm text-zinc-400">No recorded transactions{filter === 'all' ? '.' : ' of this type.'}</p> : <div className="mt-4 hidden overflow-x-auto rounded-lg border border-white/10 sm:block"><table className="w-full text-left text-sm"><thead className="bg-white/[0.03] text-zinc-400"><tr>{['Date (UTC)', 'Transaction', 'Amount', 'Balance after'].map(heading => <th scope="col" key={heading} className="px-3 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>{data.transactions.map(row => <tr key={row.id} className="border-t border-white/10">
          <td className="whitespace-nowrap px-3 py-3 text-xs text-zinc-400">{date(row.createdAt)}</td><td className="min-w-40 px-3 py-3"><span>{types[row.type] || row.type}</span><p className="mt-1 max-w-sm break-words text-xs leading-5 text-zinc-400">{row.description}</p></td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{row.amountUsd > 0 ? '+' : ''}{money(row.amountUsd)}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{money(row.balanceAfterUsd)}</td>
        </tr>)}</tbody></table></div>}
        {data.transactions.length > 0 && <ul className="mt-4 divide-y divide-white/10 border-y border-white/10 sm:hidden">{data.transactions.map(row => <li key={row.id} className="space-y-2 py-4 text-sm">
          <div className="flex justify-between gap-3"><span>{types[row.type] || row.type}</span><span className="tabular-nums">{row.amountUsd > 0 ? '+' : ''}{money(row.amountUsd)}</span></div>
          <p className="break-words text-xs leading-5 text-zinc-400">{row.description}</p>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-zinc-400"><span>{date(row.createdAt)} UTC</span><span>Balance {money(row.balanceAfterUsd)}</span></div>
        </li>)}</ul>}
        {data.nextCursor && <button type="button" className={`${button} mt-4`} disabled={loadingMore} onClick={() => void load(data.nextCursor!)}>{loadingMore ? 'Loading…' : 'Load more'}</button>}
        <p className="mt-4 text-sm"><Link href="/keys/activity" className={link}>Usage by API key</Link></p>
      </section>
      <section id="payments" className="scroll-mt-24 border-t border-white/10 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Invoices and payments</h2><button type="button" className={button} disabled={Boolean(busy) || !data.hasCustomer || !data.paymentsAvailable} onClick={() => void paymentAction('portal')}>{busy === 'portal' ? 'Opening settings…' : 'Manage payment settings'}</button></div>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{data.hasCustomer ? 'Manage payment methods, billing details, and invoice history in Stripe.' : 'Your payment profile becomes available after your first top-up.'}</p>
        {actionError && <p role="alert" className="mt-3 text-sm text-red-300">{actionError}</p>}
        {data.summary.autoReloadEnabled && <p className="mt-3 text-sm text-zinc-300">Auto-reload is enabled on this account. Contact <a className={link} href="mailto:support@galx.ai">support</a> to change it.</p>}
        {!data.invoices.length ? <p className="py-6 text-sm text-zinc-400">No invoices recorded yet.</p> : <div className="mt-4 divide-y divide-white/10">{data.invoices.map(invoice => <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"><div><p>{date(invoice.createdAt)} UTC</p><p className="mt-1 text-xs text-zinc-400">{invoice.id} · {invoice.status}</p></div><div className="flex items-center gap-4"><span className="tabular-nums">{money(invoice.status === 'paid' ? invoice.amountPaidUsd : invoice.amountDueUsd)}</span>{invoice.url && <a href={invoice.url} target="_blank" rel="noopener noreferrer" className={link} aria-label={`View invoice ${invoice.id}`}>View invoice</a>}</div></div>)}<p className="pt-3 text-xs text-zinc-400">Up to 20 recent invoices. Open payment settings for older invoices.</p></div>}
      </section>
    </>}
    <footer className="flex flex-wrap gap-5 border-t border-white/10 pt-6 text-sm"><Link href="/pricing" className={link}>Plans and rates</Link><Link href="/teams/seats" className={link}>Team members</Link><a href="mailto:support@galx.ai" className={link}>Billing support</a></footer>
  </div>;
}
