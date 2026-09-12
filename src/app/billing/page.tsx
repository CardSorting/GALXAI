import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingClient } from '@/components/billing/BillingClient';
import { constructMetadata } from '@/lib/seo/metadata';
export const metadata = constructMetadata({ title: 'Billing', description: 'Your account balance, transactions, invoices, and payment settings.', canonicalPath: '/billing', noIndex: true });
export default function BillingPage() {
  return <div className="min-h-screen bg-[#090b10] text-zinc-100"><Navigation /><main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
    <Breadcrumbs items={[{ label: 'Billing' }]} />
    <header className="border-b border-white/10 pb-6"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Billing</h1><p className="mt-3 text-base leading-7 text-zinc-400">Manage your plan, check your balance, and review payments.</p><nav aria-label="Billing sections" className="mt-5 flex flex-wrap gap-5 text-sm text-indigo-300"><a href="#plan" className="underline underline-offset-4">Your plan</a><a href="#balance" className="underline underline-offset-4">Balance</a><a href="#history" className="underline underline-offset-4">Transactions</a><a href="#payments" className="underline underline-offset-4">Invoices and payments</a></nav></header>
    <p className="mt-5 text-sm text-zinc-300">Images and Sites are available without developer preview approval. Purchasing credits or a plan does not grant developer API access.</p>
    <BillingClient />
  </main></div>;
}
