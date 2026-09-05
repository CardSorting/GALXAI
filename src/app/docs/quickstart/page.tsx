import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createBreadcrumbSchema, createHowToSchema, createTechArticleSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Quickstart — Send Your First API Request',
  description: 'Choose a model, create a GALXAI API key, and send an OpenAI-compatible request.',
  canonicalPath: '/docs/quickstart',
  keywords: ['GALXAI quickstart', 'OpenAI compatible API', 'GALXAI API key'],
});

export default function QuickstartDocPage() {
  const defaultModel = FRONTEND_VISIBLE_MODELS.find((model) => model.category === 'llm')?.id ?? 'gpt-5.6-sol';
  const request = `export GALXAI_API_KEY="galx_live_..."

curl https://api.galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${defaultModel}","messages":[{"role":"user","content":"Hello"}]}'`;

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createHowToSchema({
        name: 'Send a GALXAI API request',
        description: 'Choose a model, create an API key, and send an OpenAI-compatible request.',
        totalTime: 'PT2M',
        steps: [
          { name: 'Choose a model', text: 'Review the live model catalog and copy a model ID.' },
          { name: 'Create an API key', text: 'Create a GALXAI key and store it in a server-side environment variable.' },
          { name: 'Send the request', text: 'Call the OpenAI-compatible chat completions endpoint.' },
        ],
      }),
      createTechArticleSchema({
        headline: 'GALXAI API Quickstart',
        description: 'The shortest path to a valid GALXAI inference request.',
        path: '/docs/quickstart',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Quickstart', url: '/docs/quickstart' },
      ]),
    ],
  };

  const steps = [
    {
      title: 'Choose a model',
      body: 'Open the live catalog and copy the model ID that matches your workload.',
      href: '/models',
      action: 'Browse models',
    },
    {
      title: 'Create a key',
      body: 'Create a gateway key and keep it in a server-side environment variable.',
      href: '/keys/new',
      action: 'Create API key',
    },
  ] as const;

  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      <JsonLd data={pageSchema} />
      <Navigation />

      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Breadcrumbs items={[{ label: 'Docs', href: '/docs' }, { label: 'Quickstart' }]} />

        <header className="max-w-3xl pb-8 pt-6">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Send your first request</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            GALXAI is an inference API. Select a model, create a key, and call it from your application or terminal.
          </p>
        </header>

        <DocsSubNav />

        <div className="mt-10 grid gap-8 md:grid-cols-[15rem_1fr]">
          <div className="space-y-6">
            {steps.map((step, index) => (
              <section key={step.title}>
                <p className="text-sm font-medium text-indigo-300">{index + 1}. {step.title}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-400">{step.body}</p>
                <Link href={step.href} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-zinc-100 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">
                  {step.action}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </section>
            ))}
          </div>

          <section aria-labelledby="send-request">
            <h2 id="send-request" className="text-lg font-semibold">3. Send the request</h2>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 text-sm leading-6 text-cyan-200 ring-1 ring-white/10">
              <code>{request}</code>
            </pre>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              A successful response returns an OpenAI-compatible completion. The `chat` path names the wire protocol; GALXAI does not host a browser chat client.
            </p>
          </section>
        </div>

        <nav aria-label="Next steps" className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-sm">
          <Link href="/docs/api-reference" className="text-zinc-300 hover:text-white">API reference</Link>
          <Link href="/docs/sdks" className="text-zinc-300 hover:text-white">SDKs</Link>
          <Link href="/docs/streaming" className="text-zinc-300 hover:text-white">Streaming</Link>
          <Link href="/docs/error-handling" className="text-zinc-300 hover:text-white">Errors</Link>
        </nav>
      </main>
    </div>
  );
}
