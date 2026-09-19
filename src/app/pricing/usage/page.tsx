import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, Info, ShieldCheck } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { constructMetadata } from '@/lib/seo/metadata';
import { USAGE_PRICING } from '@/lib/billing/usage-pricing';

export const metadata = constructMetadata({
  title: 'GALX Nova usage pricing status',
  description: 'GALX Nova Developer Access is $50/month for API access. Usage is billed at $0.02 per completed message with a default $25 monthly usage cap.',
  canonicalPath: USAGE_PRICING.path,
});

export default function UsagePricingPage() {
  return (
    <div className="min-h-screen bg-[#090b10] text-zinc-100">
      <Navigation />
      <main id="main-content" className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Pricing', href: '/pricing' }, { label: 'Usage pricing' }]} />

        <header className="border-b border-white/10 pb-8 pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">GALX Nova</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Usage pricing status</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            GALX Nova usage is billed at a simple, predictable rate per completed message.
          </p>
        </header>

        <section className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6" aria-labelledby="status-heading">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 shrink-0 text-amber-300" size={20} aria-hidden="true" />
            <div>
              <h2 id="status-heading" className="text-lg font-semibold text-white">Usage pricing is live.</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                GALX Nova Developer Access is <strong>$50/month recurring</strong> for API access. Usage is billed separately at <strong>$0.02 per completed message</strong>. No usage credits are included.
              </p>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                GALX does not sell API usage by token. Do not treat the membership fee as a balance, prepaid usage, or an inference allowance. A default <strong>$25 monthly usage cap</strong> and 16,000 input / 4,000 output request envelope protect against surprise spend.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="how-heading">
          <div className="max-w-2xl">
            <h2 id="how-heading" className="text-xl font-semibold">A familiar, predictable billing model</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              The planned experience follows the patterns developers already know from usage-based APIs: one clear unit, one monthly statement, and controls that prevent surprise spend.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="border-t border-white/10 pt-4">
              <CheckCircle2 className="text-emerald-300" size={19} aria-hidden="true" />
              <h3 className="mt-3 font-medium text-white">What counts</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">One successfully completed Developer API request is one message. Failed or rejected requests are not completed messages.</p>
            </div>
            <div className="border-t border-white/10 pt-4">
              <Clock3 className="text-cyan-300" size={19} aria-hidden="true" />
              <h3 className="mt-3 font-medium text-white">When it appears</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Usage is intended to roll up into the recurring billing cycle, rather than creating a payment flow for every request.</p>
            </div>
            <div className="border-t border-white/10 pt-4">
              <ShieldCheck className="text-indigo-300" size={19} aria-hidden="true" />
              <h3 className="mt-3 font-medium text-white">How you stay in control</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">A default $25 monthly hard cap applies. Requests stop at the cap until the next monthly reset; the billing workspace shows current usage and durable 50%, 80%, and 100% threshold notifications.</p>
            </div>
          </div>
        </section>

        <section className="mt-10 border-y border-white/10 py-8" aria-labelledby="controls-heading">
          <h2 id="controls-heading" className="text-xl font-semibold">Live contract and controls</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            Usage rolls into the recurring invoice. Failed, rejected, and duplicate requests are not completed messages and are not charged. Developer Access is not a prepaid wallet and the $50 subscription does not include usage credits.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            The published contract is the source of truth for the rate, limits, and stop behavior.
          </p>
          <dl className="mt-6 grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2" aria-label="Usage contract status">
            <div>
              <dt className="text-zinc-500">Billable unit</dt>
              <dd className="mt-1 font-medium text-white">Per completed message</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Public rate</dt>
              <dd className="mt-1 font-medium text-emerald-200">$0.02 per message</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Usage meter</dt>
              <dd className="mt-1 font-medium text-emerald-200">Active</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Spend controls</dt>
              <dd className="mt-1 font-medium text-emerald-200">$25 hard cap</dd>
            </div>
          </dl>
        </section>

        <section className="mt-8 border-b border-white/10 pb-8" aria-labelledby="membership-heading">
          <h2 id="membership-heading" className="text-xl font-semibold">Membership for access. Separate billing for usage.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            Think of Developer Access like membership to a managed workspace. The subscription gives you access to the service; consumption is billed separately. GALX handles the managed intelligence behind the supported API.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            The per-message rate is published separately from the access subscription. The subscription provides API access; consumption is billed by completed message.
          </p>
        </section>

        <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm" aria-label="Usage pricing actions">
          <Link href="/developers" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-indigo-500/20 px-4 py-2.5 font-medium text-indigo-100 ring-1 ring-indigo-400/40 hover:bg-indigo-500/30">
            Review Developer Access <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center px-2 py-2.5 text-cyan-300 underline underline-offset-4 hover:text-cyan-200">
            Read the terms
          </Link>
          <Link href="/pricing" className="inline-flex min-h-11 items-center px-2 py-2.5 text-cyan-300 underline underline-offset-4 hover:text-cyan-200">
            Compare GALX Pro
          </Link>
        </nav>
      </main>
    </div>
  );
}
