'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authEntryPath } from '@/lib/auth/redirects';
import type { BillingData } from '@/lib/billing/account';
import { billingReturnDestination } from '@/lib/billing/navigation';

interface BillingState {
  accountId: string; token?: string; email: string;
  data: BillingData | null; loading: boolean; loadingMore: boolean; error: string;
  filter: string; setFilter: (value: string) => void; loadedFilter: string;
  load: (cursor?: string) => Promise<void>;
  creditAmount: string; setCreditAmount: (value: string) => void;
  paymentPending: boolean; setPaymentPending: (value: boolean) => void;
  checkoutSearch?: string;
  planSearch?: string;
  paymentBusy: boolean; paymentError: string; openPayments: () => Promise<void>;
}
const Context = createContext<BillingState | null>(null);
export function useBilling() {
  const value = useContext(Context);
  if (!value) throw new Error('Billing must be inside its account provider.');
  return value;
}

export function BillingProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, status, retrySession } = useAuth();
  const pathname = usePathname();
  const [destination, setDestination] = useState(pathname);
  useEffect(() => { setDestination(pathname + window.location.search); }, [pathname]);
  if (isLoading) return <p role="status" className="py-8 text-sm text-zinc-400">Loading account…</p>;
  if (!user) return <div className="space-y-4 py-8 text-sm"><p className="text-zinc-400">{status === 'unavailable' ? 'Your account could not be checked. Try again to view billing.' : 'Sign in to view and manage your billing.'}</p>{status === 'unavailable' ? <button type="button" onClick={() => void retrySession()} className="min-h-11 text-indigo-300 underline underline-offset-4">Retry account</button> : <Link href={authEntryPath(destination)} className="inline-flex min-h-11 items-center text-indigo-300 underline underline-offset-4">Sign in to billing</Link>}</div>;
  return <AccountBilling key={user.id} accountId={user.id} token={user.token} email={user.email || 'Signed-in account'}>{children}</AccountBilling>;
}

function AccountBilling({ children, accountId, token, email }: { children: ReactNode; accountId: string; token?: string; email: string }) {
  const pathname = usePathname();
  const needsWallet = pathname !== BILLING_PATHS.plan;
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true), [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(''), [filter, setFilter] = useState('all'), [loadedFilter, setLoadedFilter] = useState('all');
  const [creditAmount, setCreditAmount] = useState('25'), [paymentPending, setPaymentPending] = useState(false);
  const [checkoutSearch, setCheckoutSearch] = useState<string>();
  const [planSearch, setPlanSearch] = useState<string>();
  const [paymentBusy, setPaymentBusy] = useState(false), [paymentError, setPaymentError] = useState('');
  const version = useRef(0), active = useRef(true), paymentInFlight = useRef(false);
  const request = useRef<AbortController | null>(null), paymentRequest = useRef<AbortController | null>(null);
  const load = useCallback(async (cursor?: string) => {
    const revision = ++version.current;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setError('');
    if (cursor) setLoadingMore(true); else { setLoading(true); setLoadingMore(false); }
    try {
      const params = new URLSearchParams({ type: filter });
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(`/api/billing?${params}`, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]), headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const result = await response.json();
      if (!response.ok) throw new Error();
      if (!active.current || version.current !== revision) return;
      setData(previous => ({ ...result, transactions: cursor ? [...(previous?.transactions || []), ...result.transactions] : result.transactions }));
      setLoadedFilter(filter);
    } catch (e) {
      if (active.current && version.current === revision && !controller.signal.aborted) setError((e as Error).name === 'TimeoutError' ? 'Billing took too long to load. Please try again.' : 'Could not refresh billing. Please try again.');
    } finally { if (active.current && version.current === revision) { setLoading(false); setLoadingMore(false); } }
  }, [token, filter]);
  useEffect(() => { active.current = true; return () => { active.current = false; request.current?.abort(); paymentRequest.current?.abort(); }; }, []);
  useEffect(() => {
    if (!needsWallet) return;
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    window.addEventListener('focus', refresh);
    return () => { request.current?.abort(); window.removeEventListener('focus', refresh); };
  }, [load, needsWallet]);
  useEffect(() => { setPaymentError(''); }, [pathname]);
  useEffect(() => {
    const destination = billingReturnDestination(new URLSearchParams(window.location.search));
    if (pathname === BILLING_PATHS.credits && destination?.startsWith('/billing/credits?')) setCheckoutSearch(destination.slice(BILLING_PATHS.credits.length));
    if (pathname === BILLING_PATHS.plan && destination?.startsWith('/billing/plan?')) setPlanSearch(destination.slice(BILLING_PATHS.plan.length));
  }, [pathname]);

  const openPayments = async () => {
    if (paymentInFlight.current) return;
    paymentInFlight.current = true; setPaymentBusy(true); setPaymentError('');
    const controller = new AbortController(); paymentRequest.current = controller;
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST', credentials: 'same-origin', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: '{}' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('Could not open payment settings. Please try again.');
      const target = new URL(result.url);
      if (target.protocol !== 'https:' || target.hostname !== 'billing.stripe.com' || target.port || target.username || target.password) throw new Error('Could not open a secure payment page. Please try again.');
      if (active.current && !controller.signal.aborted) window.location.assign(target.href);
    } catch (e) { if (active.current && !controller.signal.aborted) setPaymentError((e as Error).name === 'TimeoutError' ? 'Opening payment settings took too long. Please try again.' : (e as Error).message); }
    finally { paymentInFlight.current = false; if (active.current) setPaymentBusy(false); }
  };
  return <Context.Provider value={{ accountId, token, email, data, loading, loadingMore, error, filter, setFilter, loadedFilter, load, creditAmount, setCreditAmount, paymentPending, setPaymentPending, checkoutSearch, planSearch, paymentBusy, paymentError, openPayments }}>{children}</Context.Provider>;
}
