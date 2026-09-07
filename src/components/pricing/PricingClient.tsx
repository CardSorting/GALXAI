import Link from 'next/link';
import { PricingEstimator } from './PricingEstimator';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';
import { PRICING_FAQS, PRICING_PLANS } from '@/lib/data/pricingSummary';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

const money = (amount: number) => `$${amount.toFixed(2)}`;
const supportHref = `mailto:${SITE_CONFIG.contactPoint.email}?subject=GALXAI%20plan%20inquiry`;
const textModels = FRONTEND_VISIBLE_MODELS.filter(model => model.category === 'llm');
const linkStyle = 'text-indigo-300 underline underline-offset-4 hover:text-indigo-200 focus-visible:outline-indigo-300';

export function PricingClient() {
  return (
    <div className="min-h-screen bg-[#090b10] text-zinc-100">
      <Navigation />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Pricing' }]} />
        <header className="border-b border-white/10 pb-6">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pricing</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">
            Start with pay-as-you-go API usage. Add a team plan when you need more seats.
          </p>
          <nav aria-label="Pricing sections" className="mt-5 flex flex-wrap gap-5 text-sm">
            <a href="#plans" className={linkStyle}>Plans</a>
            <a href="#rates" className={linkStyle}>Model rates</a>
            <a href="#billing-questions" className={linkStyle}>Billing questions</a>
          </nav>
        </header>

        <section id="plans" className="scroll-mt-24 pt-8">
          <h2 className="text-xl font-semibold">Choose a plan</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">USD per month. Model usage is separate from the plan fee.</p>
          <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
            {PRICING_PLANS.map(plan => (
              <div key={plan.id} className="grid gap-4 py-6 sm:grid-cols-[1fr_1.4fr_11rem] sm:items-center sm:gap-6">
                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{plan.audience}</p>
                  <p className="mt-3 text-2xl font-semibold tabular-nums">${plan.monthlyPrice}<span className="ml-1 text-sm font-normal text-zinc-400">/ month</span></p>
                </div>
                <ul className="space-y-2 text-sm leading-6 text-zinc-300">
                  <li>{plan.includedSeats} {plan.includedSeats === 1 ? 'seat' : 'seats'} included{plan.extraSeatPrice > 0 && ` · $${plan.extraSeatPrice} per extra seat / month`}</li>
                  <li>{plan.computeCredit === null ? 'Pay for model usage as you go' : `$${plan.computeCredit} in monthly compute credits`}</li>
                </ul>
                {plan.id === 'developer' ? (
                  <Link href="/keys" className="w-fit sm:justify-self-end rounded-md border border-indigo-400/40 bg-indigo-500/20 px-4 py-2.5 text-sm font-medium text-indigo-100 hover:bg-indigo-500/30 focus-visible:outline-indigo-300">Create API key</Link>
                ) : (
                  <a href={`${supportHref}%20-%20${plan.name}`} className="w-fit sm:justify-self-end rounded-md border border-white/15 px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/5 focus-visible:outline-indigo-300">Ask about {plan.name}</a>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3 text-sm leading-6">
            <p className="max-w-xl text-zinc-400">Team and Enterprise show published plan terms. Confirm availability and activation with support.</p>
            <Link href="/teams/seats" className={linkStyle}>Manage team members</Link>
          </div>
        </section>

        <section id="rates" className="scroll-mt-24 pt-10">
          <h2 className="text-xl font-semibold">Model rates</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">USD per 1 million tokens. Input is what you send; output is what the model generates.</p>
          <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-xs sm:text-sm">
              <caption className="sr-only">Text model prices in USD per one million tokens</caption>
              <thead className="bg-white/[0.03] text-zinc-400">
                <tr>{['Model', 'Input', 'Cached input', 'Output'].map(heading => <th key={heading} scope="col" className="px-2 py-3 font-medium sm:px-4">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {textModels.map(model => (
                  <tr key={model.id} className="border-t border-white/10">
                    <th scope="row" className="whitespace-nowrap px-2 py-4 font-normal sm:px-4"><Link href={`/models/${model.id}`} className={linkStyle}>{model.id}</Link></th>
                    <td className="px-2 py-4 tabular-nums sm:px-4">{money(model.inputPricePer1M)}</td>
                    <td className="px-2 py-4 tabular-nums sm:px-4">{model.cachedInputPricePer1M == null ? '—' : money(model.cachedInputPricePer1M)}</td>
                    <td className="px-2 py-4 tabular-nums sm:px-4">{money(model.outputPricePer1M)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Example: 1 million input tokens and 1 million output tokens cost {money(textModels[0].inputPricePer1M + textModels[0].outputPricePer1M)} with {textModels[0].id}, before any eligible caching.</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm">
            <Link href="/models" className={linkStyle}>All models and image pricing</Link>
          </div>
          <PricingEstimator models={textModels.map(({ id, inputPricePer1M, outputPricePer1M }) => ({ id, inputPricePer1M, outputPricePer1M }))} />
        </section>

        <section id="billing-questions" className="scroll-mt-24 pt-10">
          <h2 className="text-xl font-semibold">Billing questions</h2>
          <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {PRICING_FAQS.map(faq => <details key={faq.q} className="group py-4">
              <summary className="cursor-pointer text-sm font-medium leading-6 hover:text-indigo-200 focus-visible:outline-indigo-300">{faq.q}</summary>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">{faq.a}</p>
            </details>)}
          </div>
        </section>
        <footer className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm">
          <Link href="/billing" className={linkStyle}>Billing dashboard</Link>
          <Link href="/docs" className={linkStyle}>API quickstart</Link>
          <a href={supportHref} className={linkStyle}>Contact support</a>
        </footer>
      </main>
    </div>
  );
}
