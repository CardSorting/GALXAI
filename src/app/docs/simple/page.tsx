import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'GALXAI in Plain Language',
  description: 'What GALXAI does, what it does not do, and how to connect an application.',
  canonicalPath: '/docs/simple',
  keywords: ['GALXAI explained', 'AI inference API', 'AI gateway'],
});

export default function SimpleDocsPage() {
  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      <Navigation />

      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Breadcrumbs items={[{ label: 'Docs', href: '/docs' }, { label: 'Plain language' }]} />

        <header className="max-w-3xl pb-8 pt-6">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">GALXAI in plain language</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            GALXAI gives your software one API for accessing supported AI models. It handles authentication, routing, usage, and operational controls between your application and model providers.
          </p>
        </header>

        <DocsSubNav />

        <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
          <section className="grid gap-2 py-6 md:grid-cols-[14rem_1fr]">
            <h2 className="text-lg font-semibold">What you build</h2>
            <p className="text-sm leading-6 text-zinc-400">Your application owns its chat, agent, image, or automation experience. GALXAI does not provide a hosted conversation or image studio.</p>
          </section>
          <section className="grid gap-2 py-6 md:grid-cols-[14rem_1fr]">
            <h2 className="text-lg font-semibold">What GALXAI provides</h2>
            <p className="text-sm leading-6 text-zinc-400">A model catalog, API keys, compatible inference endpoints, routing, metering, telemetry, billing, and governance.</p>
          </section>
          <section className="grid gap-2 py-6 md:grid-cols-[14rem_1fr]">
            <h2 className="text-lg font-semibold">How to start</h2>
            <p className="text-sm leading-6 text-zinc-400">Choose a model, create a key, then change the base URL in an OpenAI-compatible client to <code className="text-cyan-300">https://api.galx.ai/v1</code>.</p>
          </section>
          <section className="grid gap-2 py-6 md:grid-cols-[14rem_1fr]">
            <h2 className="text-lg font-semibold">How pricing works</h2>
            <p className="text-sm leading-6 text-zinc-400">Rates and cached-input prices are model-specific. Use the live model catalog instead of relying on a fixed discount claim.</p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/models" className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-400">
            Browse models
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/docs/quickstart" className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-white/5">
            Read the quickstart
          </Link>
        </div>
      </main>
    </div>
  );
}
