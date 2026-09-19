import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata = constructMetadata({
  title: 'Private integration usage',
  description: 'GALX usage metering remains available for explicitly authorized private integrations and is not a public pricing offer.',
  canonicalPath: '/pricing/usage',
});

export default function UsagePricingPage() {
  return <div className="min-h-screen bg-[#090b10] text-zinc-100">
    <Navigation />
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: 'Pricing', href: '/pricing' }, { label: 'Private integration usage' }]} />
      <header className="border-b border-white/10 pb-8 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">GALX Nova</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Private integration usage</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">GALX continues to meter consumption for infrastructure operations, bounded cohorts, and selected integrations. There is no public usage-pricing contract or self-service developer plan.</p>
      </header>
      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold">Access is by decision</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">When GALX authorizes a private integration, its allocation and operating terms are established directly with that cohort. Metering remains first-class infrastructure and does not imply general commercial availability.</p>
      </section>
      <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm" aria-label="Usage actions">
        <Link href="/pricing" className="inline-flex min-h-11 items-center px-2 py-2.5 text-cyan-300 underline underline-offset-4 hover:text-cyan-200">Review GALX Pro</Link>
        <Link href="/developers" className="inline-flex min-h-11 items-center px-2 py-2.5 text-cyan-300 underline underline-offset-4 hover:text-cyan-200">Read the private access boundary</Link>
      </nav>
    </main>
  </div>;
}
