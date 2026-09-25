import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { IMAGE_PLAN_OFFERS, PRICING_FAQS } from '@/lib/data/pricingSummary';

const linkStyle = 'text-indigo-300 underline underline-offset-4 hover:text-indigo-200 focus-visible:outline-indigo-300';

/** Compatibility pricing surface kept aligned with the canonical /pricing page. */
export function PricingClient() {
  return (
    <div className="min-h-screen bg-[#090b10] text-zinc-100">
      <Navigation />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Pricing' }]} />
        <header className="border-b border-white/10 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Discover what the Stars are making.</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">Public discovery does not require a prompt or invoke image generation. Human creation, when available, is private and bounded by a purchased allowance.</p>
          <Link href="/explore" className={`${linkStyle} mt-4 inline-flex min-h-11 items-center`}>Explore GALX</Link>
        </header>

        <section className="border-b border-white/10 py-8" aria-labelledby="private-plans">
          <h2 id="private-plans" className="text-xl font-semibold">Private creation plans</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Private creation requires a signed-in account, an eligible purchased plan, and enough remaining allowance. No free or unlimited image-generation path is offered.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {IMAGE_PLAN_OFFERS.map(plan => <article key={plan.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{plan.name}</h3><p className="mt-1 text-xs text-zinc-400">{plan.audience}</p></div><span className="rounded-full border border-white/15 px-2 py-1 text-[11px] text-zinc-300">{plan.status}</span></div>
              <p className="mt-5 text-2xl font-semibold tabular-nums">${plan.monthlyPrice}<span className="ml-1 text-xs font-normal text-zinc-400">/month</span></p>
              <p className="mt-3 text-sm font-medium text-zinc-100">{plan.allowance ? `${plan.allowance.monthlyUnits.toLocaleString('en-US')} units per month` : 'Monthly allowance unavailable'}</p>
              {plan.allowance && <p className="mt-1 text-xs leading-5 text-zinc-400">Standard image: {plan.allowance.standardOutputUnits} unit · HD image: {plan.allowance.hdOutputUnits} units</p>}
              <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-400">{plan.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
              <p className="mt-4 text-xs leading-5 text-zinc-400">{plan.boundary}</p>
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
