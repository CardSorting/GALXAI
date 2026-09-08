import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/PublicModelCatalog';

function formatTokens(tokens: number) {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return tokens.toLocaleString();
}

function formatRate(value: number) {
  return `$${value.toFixed(value < 1 ? 3 : 2)}`;
}

export function ModelsGuideClient() {
  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      <Navigation />

      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Breadcrumbs items={[{ label: 'Docs', href: '/docs' }, { label: 'Models' }]} />

        <header className="max-w-3xl pb-8 pt-6">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Choose a model</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            Use Sol for maximum capability, Terra for balanced production work, and Luna for high-volume execution. Image models remain API capabilities for downstream applications.
          </p>
          <Link href="/models" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-indigo-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">
            Open the model catalog
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </header>

        <DocsSubNav />

        <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
          {FRONTEND_VISIBLE_MODELS.map((model) => (
            <article key={model.id} className="grid gap-4 py-6 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-lg font-semibold text-white">{model.name}</h2>
                  <code className="text-xs text-cyan-300">{model.id}</code>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{model.description}</p>
                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <div>
                    <dt className="sr-only">Category</dt>
                    <dd className="capitalize text-zinc-300">{model.category}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Context window</dt>
                    <dd className="text-zinc-300">{formatTokens(model.contextWindowTokens)} context</dd>
                  </div>
                  {model.category === 'llm' ? (
                    <>
                      <div>
                        <dt className="sr-only">Input rate</dt>
                        <dd className="text-zinc-300">{formatRate(model.inputPricePer1M)} input / 1M</dd>
                      </div>
                      <div>
                        <dt className="sr-only">Output rate</dt>
                        <dd className="text-zinc-300">{formatRate(model.outputPricePer1M)} output / 1M</dd>
                      </div>
                    </>
                  ) : (
                    <div>
                      <dt className="sr-only">Generation rate</dt>
                      <dd className="text-zinc-300">{formatRate(model.inputPricePer1M)} generation rate</dd>
                    </div>
                  )}
                </dl>
              </div>
              <Link href={`/models/${model.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">
                Details
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-6 text-sm leading-6 text-zinc-500">
          This page reads directly from the canonical frontend model catalog so model IDs, limits, and rates do not drift from `/models`.
        </p>
      </main>
    </div>
  );
}
