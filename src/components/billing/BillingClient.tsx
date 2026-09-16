'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';

import Link from 'next/link';
import { useState } from 'react';
import { TopUpForm } from './TopUpForm';
import { PlanPanel } from './PlanPanel';
import { CheckoutStatus } from './CheckoutStatus';
import { useBilling } from './BillingProvider';
import { billingCsv } from '@/lib/billing/csv';
import type { BillingPage } from '@/lib/billing/navigation';

const control = 'min-h-11 rounded-md border border-white/15 bg-[#090b10] px-3 py-2 text-sm text-zinc-100 focus-visible:outline-indigo-300 disabled:opacity-50';
const button = `${control} hover:bg-white/5 disabled:cursor-not-allowed`;
const link = 'inline-flex min-h-11 items-center text-indigo-300 underline underline-offset-4 hover:text-indigo-200 focus-visible:outline-indigo-300';
const primary = 'inline-flex min-h-11 items-center justify-center rounded-md border border-indigo-400/40 bg-indigo-500/20 px-4 py-2.5 text-sm font-medium text-indigo-100 hover:bg-indigo-500/30 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50';
const money = (amount: number) => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 });
const date = (value: string) => new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
const types: Record<string, string> = { deposit: 'Top-up', auto_reload: 'Auto-reload', usage_draw: 'Usage', match_grant: 'Credit', refund: 'Refund', adjustment: 'Adjustment' };
const filters = [['all', 'All transactions'], ['deposit', 'Top-ups'], ['usage', 'Usage'], ['grant', 'Credits'], ['refund', 'Refunds']];

/** Each route renders its own task; the layout retains account state and credit drafts. */
export function BillingClient({ page = 'overview' }: { page?: BillingPage }) {
  const state = useBilling();
  const [planRefresh, setPlanRefresh] = useState(0);
  const { accountId, token, email, loading, loadingMore, data, error, load } = state;
  return <div className="space-y-7 pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="min-w-0 break-all text-sm text-zinc-400">{email}</p>{page !== 'plan' && <button type="button" className={button} disabled={loading || loadingMore} onClick={() => { void load(); if (page === 'overview') setPlanRefresh(value => value + 1); window.dispatchEvent(new Event('galx_wallet_update')); }}>{loading && data ? 'Refreshing…' : 'Refresh'}</button>}</div>
    {page === 'plan' ? <PlanPanel accountId={accountId} token={token} returnSearch={state.planSearch} /> : <>
      {error && <p role="alert" className="text-sm leading-6 text-red-300">{data ? 'Showing your last checked billing details. ' : ''}{error}</p>}
      {loading && <p role="status" className="text-sm text-zinc-400">{data ? 'Updating billing details…' : 'Loading billing…'}</p>}
      {page === 'overview' && <>
        <PlanPanel accountId={accountId} token={token} compact refreshKey={planRefresh} />
        {data && <section aria-labelledby="overview-credit"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="overview-credit" className="text-xl font-semibold">Prepaid credit</h2><Link href={BILLING_PATHS.credits} className={primary}>Add credit</Link></div><p className="mt-2 text-sm leading-6 text-zinc-400">For API and image usage. Separate from your Pro subscription.</p><BalanceSummary compact /><div className="mt-3 flex flex-wrap gap-x-6"><Link href={BILLING_PATHS.transactions} className={link}>View transactions</Link><Link href="/keys/activity" className={link}>Usage by API key</Link></div></section>}
        <div className="divide-y divide-white/10 border-y border-white/10">{[
          [BILLING_PATHS.invoices, 'Invoices', 'Find invoices and download them from Stripe.'],
          [BILLING_PATHS.payments, 'Payment settings', 'Update the payment methods saved to your account.'],
        ].map(([href, title, description]) => <Link key={href} href={href} className="group block py-5 focus-visible:outline-indigo-300"><span className="text-sm font-medium text-indigo-300 underline-offset-4 group-hover:underline">{title}</span><p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p></Link>)}</div>
      </>}
      {page === 'credits' && <>
        <CheckoutStatus accountId={accountId} token={token} returnSearch={state.checkoutSearch} onConfirmed={() => void load()} onPending={state.setPaymentPending} />
        {data && <><BalanceSummary /><section aria-labelledby="add-credit" className="border-t border-white/10 pt-7"><h2 id="add-credit" className="text-xl font-semibold">Add credit</h2>{state.paymentPending ? <p className="mt-3 text-sm leading-6 text-zinc-400">Confirm your current payment above before starting another top-up.</p> : <TopUpForm accountId={accountId} token={token} available={data.paymentsAvailable && !error} draft={{ amount: state.creditAmount, onChange: state.setCreditAmount }} />}</section><div className="border-t border-white/10 pt-5"><p className="text-sm leading-6 text-zinc-400">Purchasing credit does not grant developer API access. Developer tools require separate preview approval.</p><div className="mt-2 flex flex-wrap gap-x-6"><Link href={BILLING_PATHS.transactions} className={link}>View transactions</Link><Link href={BILLING_PATHS.plan} className={link}>Looking for Pro?</Link></div></div></>}
      </>}
      {page === 'transactions' && data && <Transactions />}
      {page === 'invoices' && <Invoices />}
      {page === 'payments' && <PaymentSettings />}
    </>}
  </div>;
}

function BalanceSummary({ compact = false }: { compact?: boolean }) {
  const { data } = useBilling();
  if (!data) return null;
  const figures = [['Available credit', data.summary.balanceUsd], ['Usage this month · UTC', data.summary.currentMonthSpendUsd], ...(!compact ? [['Total deposited', data.summary.depositedTotalUsd]] : [])] as [string, number][];
  return <><dl className={`mt-5 grid grid-cols-1 gap-6 min-[400px]:grid-cols-2 ${compact ? '' : 'lg:grid-cols-3'}`}>{figures.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm leading-6 text-zinc-400">{label}</dt><dd className="mt-2 break-words text-2xl font-medium tabular-nums">{money(value)}</dd></div>)}</dl>{data.summary.paymentDebtUsd > 0 && <p className="mt-4 text-sm leading-6 text-amber-200">{money(data.summary.paymentDebtUsd)} outstanding from a payment adjustment. Your next top-up covers this first.</p>}</>;
}

function Transactions() {
  const { data, filter, loadedFilter, setFilter, loading, loadingMore, error, load } = useBilling();
  if (!data) return null;
  const rowsMatch = filter === loadedFilter;
  const exportHistory = () => {
    const url = URL.createObjectURL(new Blob([billingCsv(data.transactions)], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'galxai-transactions.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section aria-label="Transaction history">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><label className="mb-2 block text-sm text-zinc-400" htmlFor="transaction-type">Transaction type</label><select id="transaction-type" value={filter} onChange={event => setFilter(event.target.value)} className={`${control} max-w-full`}>{filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><button type="button" className={button} onClick={exportHistory} disabled={loading || loadingMore || Boolean(error) || !rowsMatch || !data.transactions.length}>Export loaded rows</button></div>
    <p className="mt-4 text-sm leading-6 text-zinc-400">Newest first. All dates are UTC. Exports include the rows loaded below.</p>
    {!rowsMatch && <p role="status" className="mt-3 text-sm text-amber-200">The selected filter has not loaded yet. Showing {filters.find(([value]) => value === loadedFilter)?.[1].toLowerCase()} from your last check.</p>}
    {!data.transactions.length ? <div className="border-b border-white/10 py-9"><h2 className="font-medium">{loadedFilter === 'all' ? 'No transactions yet' : 'No matching transactions'}</h2><p className="mt-2 text-sm leading-6 text-zinc-400">{loadedFilter === 'all' ? 'Credit added and usage will appear here after they are recorded.' : 'Choose another transaction type to see more activity.'}</p><Link href={loadedFilter === 'all' ? BILLING_PATHS.credits : BILLING_PATHS.invoices} className={`${link} mt-3`}>{loadedFilter === 'all' ? 'Add credit' : 'Looking for an invoice?'}</Link></div> : <>
      <div className="mt-4 hidden overflow-x-auto rounded-lg border border-white/10 sm:block"><table className="w-full text-left text-sm"><caption className="sr-only">Account transactions, newest first</caption><thead className="bg-white/[0.03] text-zinc-400"><tr>{['Date (UTC)', 'Transaction', 'Amount', 'Balance after'].map(heading => <th scope="col" key={heading} className="px-3 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>{data.transactions.map(row => <tr key={row.id} className="border-t border-white/10"><td className="whitespace-nowrap px-3 py-3 text-xs text-zinc-400">{date(row.createdAt)}</td><td className="min-w-40 px-3 py-3"><span>{types[row.type] || 'Adjustment'}</span><p className="mt-1 max-w-sm break-words text-xs leading-5 text-zinc-400">{row.description}</p></td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{row.amountUsd > 0 ? '+' : ''}{money(row.amountUsd)}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{money(row.balanceAfterUsd)}</td></tr>)}</tbody></table></div>
      <ul className="mt-4 divide-y divide-white/10 border-y border-white/10 sm:hidden">{data.transactions.map(row => <li key={row.id} className="space-y-2 py-4 text-sm"><div className="flex flex-wrap justify-between gap-3"><span>{types[row.type] || 'Adjustment'}</span><span className="break-words tabular-nums">{row.amountUsd > 0 ? '+' : ''}{money(row.amountUsd)}</span></div><p className="break-words text-xs leading-5 text-zinc-400">{row.description}</p><div className="flex flex-wrap justify-between gap-2 text-xs text-zinc-400"><span>{date(row.createdAt)} UTC</span><span className="break-words">Balance {money(row.balanceAfterUsd)}</span></div></li>)}</ul>
    </>}
    {data.nextCursor && <button type="button" className={`${button} mt-4`} disabled={loading || loadingMore || !rowsMatch || Boolean(error)} onClick={() => void load(data.nextCursor!)}>{loadingMore ? 'Loading…' : 'Load more'}</button>}
    <div className="mt-5 flex flex-wrap gap-x-6"><Link href={BILLING_PATHS.invoices} className={link}>View invoices</Link><Link href="/keys/activity" className={link}>Usage by API key</Link></div>
  </section>;
}

function PortalButton({ label = 'Open payment settings' }: { label?: string }) {
  const { data, error, paymentBusy, openPayments, paymentError } = useBilling();
  return <div><button type="button" className={primary} disabled={paymentBusy || (!error && Boolean(data) && (!data?.hasCustomer || !data?.paymentsAvailable))} onClick={() => void openPayments()}>{paymentBusy ? 'Opening Stripe…' : label}</button>{paymentError && <p role="alert" className="mt-3 text-sm leading-6 text-red-300">{paymentError}</p>}</div>;
}

function Invoices() {
  const { data } = useBilling();
  const statusLabels: Record<string, string> = { paid: 'Paid', open: 'Payment due', draft: 'Draft', void: 'Voided', uncollectible: 'Unpaid', unknown: 'Status unavailable' };
  return <section aria-label="Invoice history">
    <div className="flex flex-wrap items-center justify-between gap-4"><p className="max-w-md text-sm leading-6 text-zinc-400">Up to 20 recent invoices. Open Stripe for older invoices and available downloads.</p><PortalButton label="Invoice history in Stripe" /></div>
    {data && (!data.invoices.length ? <div className="border-b border-white/10 py-9"><h2 className="font-medium">No invoices yet</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Invoices appear here when they are issued. Credit usage is recorded separately in Transactions.</p><Link href={BILLING_PATHS.transactions} className={`${link} mt-3`}>View transactions</Link></div> : <ul className="mt-5 divide-y divide-white/10 border-y border-white/10">{data.invoices.map(invoice => <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-4 py-5 text-sm"><div className="min-w-0"><p className="break-words">{date(invoice.createdAt)} UTC</p><p className={`mt-2 ${invoice.status === 'open' || invoice.status === 'uncollectible' ? 'text-amber-200' : 'text-zinc-400'}`}>{statusLabels[invoice.status] || statusLabels.unknown}</p></div><div className="flex flex-wrap items-center gap-x-5"><span className="break-words font-medium tabular-nums">{money(invoice.status === 'paid' ? invoice.amountPaidUsd : invoice.amountDueUsd)}</span>{invoice.url ? <a href={invoice.url} target="_blank" rel="noopener noreferrer" className={link} aria-label={`View invoice from ${date(invoice.createdAt)} UTC (opens in new tab)`}>View invoice<span className="sr-only"> (opens in new tab)</span></a> : <span className="text-zinc-400">Link unavailable</span>}</div></li>)}</ul>)}
  </section>;
}

function PaymentSettings() {
  const { data } = useBilling();
  return <div className="space-y-8"><section aria-labelledby="payment-methods"><h2 id="payment-methods" className="text-xl font-semibold">Payment methods</h2><p className="mb-5 mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{data && !data.hasCustomer ? 'Your billing profile is created when you start a subscription or credit checkout.' : 'Open Stripe to review or update your saved payment methods. You can return to GALX when you’re done.'}</p><PortalButton />{data && !data.hasCustomer && <div className="mt-3 flex flex-wrap gap-x-6"><Link href={BILLING_PATHS.plan} className={link}>Explore Pro</Link><Link href={BILLING_PATHS.credits} className={link}>Add credit</Link></div>}</section>
    {data?.summary.autoReloadEnabled && <section className="border-t border-white/10 pt-6"><h2 className="font-semibold">Automatic reload</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Auto-reload is enabled on this account. Contact <a href="mailto:support@galx.ai" className="text-indigo-300 underline underline-offset-4">billing support</a> to change it.</p></section>}
    <section className="border-t border-white/10 pt-6"><h2 className="font-semibold">More billing options</h2><div className="mt-2 flex flex-wrap gap-x-6"><Link href={BILLING_PATHS.plan} className={link}>Manage your plan</Link><Link href={BILLING_PATHS.invoices} className={link}>View invoices</Link></div></section>
  </div>;
}
