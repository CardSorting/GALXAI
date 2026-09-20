import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { FREE_IMAGE_OFFER, IMAGE_PLAN_OFFERS, PRICING_FAQS, PRICING_PLANS } from '@/lib/data/pricingSummary';
import { FREE_PLAN_INCLUSIONS, PLAN_INCLUSIONS } from '@/lib/public-content/content';

const linkStyle = 'text-indigo-300 underline underline-offset-4 hover:text-indigo-200 focus-visible:outline-indigo-300';

/** Compatibility pricing surface kept aligned with the canonical /pricing page. */
export function PricingClient() {
  const plan = PRICING_PLANS[0];
  return (
    <div className="min-h-screen bg-[#090b10] text-zinc-100">
      <Navigation />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Pricing' }]} />
        <header className="border-b border-white/10 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Make more room for ideas.</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">Try the Image Studio with a one-time five-image allowance, then choose the monthly plan that fits how you create.</p>
        </header>

        <section className="border-b border-white/10 py-8" aria-labelledby="free-plan">
          <h2 id="free-plan" className="text-xl font-semibold">{FREE_IMAGE_OFFER.name}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{FREE_IMAGE_OFFER.allowance}. Choose from the supported creation controls and explore the public stream.</p>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-zinc-300">{FREE_PLAN_INCLUSIONS.map(([label, value]) => <li key={label}><strong className="text-zinc-100">{label}:</strong> {value}</li>)}</ul>
          <Link href="/images" className="mt-5 inline-flex min-h-11 items-center rounded-md border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-white/5">Start creating</Link>
        </section>

        <section className="border-b border-white/10 py-8" aria-labelledby="consumer-plan">
          <h2 id="consumer-plan" className="text-xl font-semibold">{plan.name}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{plan.audience}</p>
          <p className="mt-5 text-3xl font-semibold tabular-nums">${plan.monthlyPrice}<span className="ml-1 text-sm font-normal text-zinc-400">USD / month</span></p>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-zinc-300">{PLAN_INCLUSIONS.map(([label, value]) => <li key={label}><strong className="text-zinc-100">{label}:</strong> {value}</li>)}</ul>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">Published Image Studio terms and fair-use boundaries apply.</p>
          <Link href="/billing/plan?plan=pro" className="mt-5 inline-flex min-h-11 items-center rounded-md border border-indigo-400/40 bg-indigo-500/20 px-4 py-2.5 text-sm font-medium text-indigo-100">Choose Pro</Link>
        </section>

        <section className="border-b border-white/10 py-8" aria-labelledby="image-plans">
          <h2 id="image-plans" className="text-xl font-semibold">Choose the pace that fits your practice.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Creator, Studio, and MAX are live monthly Image Studio options for one account. They share the supported controls and published fair-use boundary; MAX does not include account sharing, seats, or shared workspaces.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {IMAGE_PLAN_OFFERS.map((plan) => <article key={plan.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{plan.name}</h3><p className="mt-1 text-xs text-zinc-400">{plan.audience}</p></div><span className="rounded-full border border-white/15 px-2 py-1 text-[11px] text-zinc-300">{plan.status}</span></div>
              <p className="mt-5 text-2xl font-semibold tabular-nums">${plan.monthlyPrice}<span className="ml-1 text-xs font-normal text-zinc-400">/month</span></p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-400">{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <p className="mt-4 text-xs leading-5 text-zinc-400">{plan.boundary}</p>
              <Link href={`/billing/plan?plan=${plan.id}`} className={`${linkStyle} mt-4 inline-flex min-h-11 items-center`}>Choose {plan.name}</Link>
            </article>)}
          </div>
        </section>

        <section className="pt-8" aria-labelledby="billing-questions">
          <h2 id="billing-questions" className="text-xl font-semibold">Billing questions</h2>
          <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {PRICING_FAQS.map(faq => <details key={faq.q} className="py-4"><summary className="cursor-pointer text-sm font-medium leading-6">{faq.q}</summary><p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">{faq.a}</p></details>)}
          </div>
        </section>
      </main>
    </div>
  );
}
