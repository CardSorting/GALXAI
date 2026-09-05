import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';

const SECURITY_CONTROLS = [
  ['Credential custody', 'Provider credentials remain server-side and encrypted at rest. Browser code must never receive or persist upstream secrets.'],
  ['Stateless inference', 'Requests are not converted into durable conversation history unless the caller explicitly selects a durable session mode.'],
  ['Durable sessions', 'Opt-in sessions store owner-scoped conversations and messages for continuity. They are a disclosed retention mode, not a hosted chat product.'],
  ['Tenant authority', 'Server-mediated authorization and PostgreSQL row policies enforce tenant ownership. Client input is never database authority.'],
] as const;

export function SecuritySpecClient() {
  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      <Navigation />

      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Breadcrumbs items={[{ label: 'Docs', href: '/docs' }, { label: 'Security' }]} />

        <header className="max-w-3xl pb-8 pt-6">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Security and retention</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            Keep credentials out of browser code, distinguish stateless requests from opt-in durable sessions, and enforce authority on the server.
          </p>
          <Link href="/compliance" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-indigo-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">
            Compliance documentation
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </header>

        <DocsSubNav />

        <dl className="mt-10 divide-y divide-white/10 border-y border-white/10">
          {SECURITY_CONTROLS.map(([term, description]) => (
            <div key={term} className="grid gap-2 py-5 md:grid-cols-[14rem_1fr]">
              <dt className="text-sm font-medium text-zinc-100">{term}</dt>
              <dd className="text-sm leading-6 text-zinc-400">{description}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="key-rule" className="mt-10 max-w-3xl">
          <h2 id="key-rule" className="text-xl font-semibold">Key rule</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 text-sm leading-6 text-cyan-200 ring-1 ring-white/10">
            <code>{`// Server environment only
GALXAI_API_KEY=galx_live_...

// Never expose this as NEXT_PUBLIC_GALXAI_API_KEY`}</code>
          </pre>
        </section>

        <p className="mt-10 border-t border-white/10 pt-6 text-sm leading-6 text-zinc-500">
          Retiring GALXAI-hosted chat and image clients does not remove the API security boundary or explicit durable-session contracts.
        </p>
      </main>
    </div>
  );
}
