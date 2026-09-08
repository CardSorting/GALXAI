import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/PublicModelCatalog';

export function PromptCachingClient() {
  const languageModels = FRONTEND_VISIBLE_MODELS.filter((model) => model.category === 'llm');

  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      <Navigation />

      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Breadcrumbs items={[{ label: 'Docs', href: '/docs' }, { label: 'Prompt caching' }]} />

        <header className="max-w-3xl pb-8 pt-6">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Prompt caching</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            Keep stable instructions and tool definitions at the start of each request. GALXAI reports provider-observed cached tokens; it does not promise a fixed cache hit rate.
          </p>
        </header>

        <DocsSubNav />

        <section aria-labelledby="implementation" className="mt-10 grid gap-6 md:grid-cols-[14rem_1fr]">
          <div>
            <h2 id="implementation" className="text-xl font-semibold">Implementation</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Put stable content first and variable user input last.</p>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-sm leading-6 text-cyan-200 ring-1 ring-white/10">
            <code>{`const response = await client.chat.completions.create({
  model: "${languageModels[0]?.id ?? 'gpt-5.6-sol'}",
  messages: [
    { role: "system", content: STABLE_INSTRUCTIONS },
    { role: "user", content: variableInput },
  ],
});

const cached = response.usage?.prompt_tokens_details?.cached_tokens ?? 0;`}</code>
          </pre>
        </section>

        <section aria-labelledby="rates" className="mt-10">
          <h2 id="rates" className="text-xl font-semibold">Current catalog rates</h2>
          <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
            {languageModels.map((model) => {
              const cachedRate = model.cachedInputPricePer1M ?? model.inputPricePer1M;
              const reduction = model.inputPricePer1M > 0
                ? Math.round((1 - cachedRate / model.inputPricePer1M) * 100)
                : 0;
              return (
                <div key={model.id} className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_auto_auto] sm:gap-8">
                  <Link href={`/models/${model.id}`} className="font-medium text-zinc-100 hover:text-indigo-200">{model.id}</Link>
                  <span className="text-zinc-400">${model.inputPricePer1M.toFixed(2)} input / 1M</span>
                  <span className="text-zinc-400">${cachedRate.toFixed(2)} cached / 1M ({reduction}% lower)</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Rates are read from the same catalog used by `/models`.</p>
        </section>

        <section aria-labelledby="rules" className="mt-10 max-w-3xl">
          <h2 id="rules" className="text-xl font-semibold">Rules</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-400">
            <li>Do not reorder stable system instructions between requests.</li>
            <li>Keep tool schemas byte-for-byte stable where practical.</li>
            <li>Read usage fields instead of assuming a cache hit.</li>
            <li>Treat cache pricing and eligibility as model-specific.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
