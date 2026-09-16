'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { BILLING_PAGES, billingReturnDestination } from '@/lib/billing/navigation';
import { BillingProvider } from './BillingProvider';
import { useAuth } from '@/contexts/AuthContext';

/** Operate: persistent billing navigation, one task per page, existing dark flat design. */
export function BillingWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname(), router = useRouter();
  const { user } = useAuth();
  const page = Object.values(BILLING_PAGES).find(item => item.href === pathname) || BILLING_PAGES.overview;
  const [returns, setReturns] = useState<Record<string, string>>({});
  useEffect(() => { setReturns({}); }, [user?.id]);
  useEffect(() => {
    const destination = billingReturnDestination(new URLSearchParams(window.location.search), window.location.hash);
    if (pathname === BILLING_PATHS.overview && destination) { router.replace(destination); return; }
    if (destination && (pathname === BILLING_PATHS.credits || pathname === BILLING_PATHS.plan)) {
      setReturns(previous => ({ ...previous, [pathname]: destination }));
    }
  }, [pathname, router, user?.id]);
  return <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
    <div className="grid min-w-0 gap-7 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10">
      <aside className="min-w-0">
        <nav aria-label="Billing" className="flex flex-wrap gap-1 border-b border-white/10 pb-5 md:flex-col md:border-b-0 md:pb-0">
          {Object.values(BILLING_PAGES).map(item => <Link key={item.href} href={returns[item.href] || item.href} aria-current={pathname === item.href ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm leading-6 focus-visible:outline-indigo-300 ${pathname === item.href ? 'bg-white/[0.06] font-medium text-indigo-200' : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100'}`}>{item.label}</Link>)}
        </nav>
      </aside>
      <main id="main-content" className="min-w-0 max-w-4xl">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-zinc-400"><Link href={BILLING_PATHS.overview} className="inline-flex min-h-11 items-center hover:text-zinc-100 focus-visible:outline-indigo-300">Billing</Link><span aria-hidden="true">/</span><span aria-current="page">{page.label}</span></nav>
        <header className="border-b border-white/10 pb-6"><h1 className="break-words text-3xl font-semibold tracking-tight">{page.title}</h1><p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">{page.description}</p></header>
        <BillingProvider>{children}</BillingProvider>
        <footer className="mt-10 flex flex-wrap gap-x-6 border-t border-white/10 pt-4 text-sm text-zinc-400"><Link href="/pricing" className="inline-flex min-h-11 items-center hover:text-indigo-200">Plans and rates</Link><a href="mailto:support@galx.ai" className="inline-flex min-h-11 items-center hover:text-indigo-200">Billing support</a></footer>
      </main>
    </div>
  </div>;
}
