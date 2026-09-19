import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { PRICING_FAQS, PRICING_PLANS } from '@/lib/data/pricingSummary';

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
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pricing</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">Choose GALX Pro for image creation, or subscribe to the GALX Nova Developer Access membership for programmable API access.</p>
        </header>

        <section className="border-b border-white/10 py-8" aria-labelledby="consumer-plan">
          <h2 id="consumer-plan" className="text-xl font-semibold">{plan.name}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{plan.audience}</p>
          <p className="mt-5 text-3xl font-semibold tabular-nums">${plan.monthlyPrice}<span className="ml-1 text-sm font-normal text-zinc-400">USD / month</span></p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">Published Image Studio terms and fair-use boundaries apply. Developer access is separate.</p>
          <Link href="/billing/plan" className="mt-5 inline-flex min-h-11 items-center rounded-md border border-indigo-400/40 bg-indigo-500/20 px-4 py-2.5 text-sm font-medium text-indigo-100">Choose Pro</Link>
        </section>

        <section className="border-b border-white/10 py-8" aria-labelledby="developer-access">
          <h2 id="developer-access" className="text-xl font-semibold">GALX Nova — Developer Access</h2>
          <p className="mt-2 text-2xl font-semibold">$50/month</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">A developer membership for programmable access to GALX Nova’s managed intelligence.</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">$50/month recurring subscription for API access. Usage billed separately. No usage credits included.</p>
          <Link href="/developers" className={`${linkStyle} mt-5 inline-flex min-h-11 items-center`}>Subscribe to Developer Access</Link>
        </section>

        <section className="border-b border-white/10 py-8" aria-labelledby="membership-explanation">
          <h2 id="membership-explanation" className="text-xl font-semibold">Membership for access. Separate billing for usage.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">Think of Developer Access like membership to a managed workspace. The subscription gives you access to the service; consumption is billed separately.</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">Your $50 monthly subscription provides API access. API usage is billed separately and is not deducted from the subscription fee.</p>
          <Link href="/pricing/usage" className={`${linkStyle} mt-5 inline-flex min-h-11 items-center`}>View usage pricing and terms</Link>
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
