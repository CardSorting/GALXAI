import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/PublicModelCatalog';

const ENDPOINTS = [
  ['POST', '/v1/chat/completions', 'OpenAI-compatible text and reasoning inference. Supports SSE.'],
  ['POST', '/v1/messages', 'Anthropic Messages-compatible inference.'],
  ['POST', '/v1/images/generations', 'Image generation for downstream applications.'],
  ['POST', '/v1/embeddings', 'Vector embeddings for retrieval and search.'],
  ['GET', '/v1/models', 'Available model IDs and capabilities.'],
] as const;

export function ApiReferenceClient() {
  const defaultModel = FRONTEND_VISIBLE_MODELS.find((model) => model.category === 'llm')?.id ?? 'gpt-5.6-sol';
  const request = `curl https://galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${defaultModel}",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'`;

  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      <Navigation />

      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Breadcrumbs items={[{ label: 'Docs', href: '/docs' }, { label: 'API reference' }]} />

        <header className="max-w-3xl pb-8 pt-6">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">API reference</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            Send JSON to <code className="text-cyan-300">https://galx.ai/v1</code> with a Bearer key. Protocol names such as `chat` describe wire compatibility, not a hosted client.
          </p>
          <Link href="/keys" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-indigo-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">
            Create API key
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </header>

        <DocsSubNav />

        <section aria-labelledby="endpoints" className="mt-10">
          <h2 id="endpoints" className="text-xl font-semibold">Endpoints</h2>
          <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
            {ENDPOINTS.map(([method, path, description]) => (
              <div key={`${method}-${path}`} className="grid gap-2 py-4 sm:grid-cols-[4rem_15rem_1fr] sm:items-baseline">
                <span className="w-fit rounded bg-white/10 px-2 py-1 font-mono text-xs font-semibold text-zinc-200">{method}</span>
                <code className="text-sm text-cyan-300">{path}</code>
                <p className="text-sm leading-6 text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="authentication" className="mt-10 grid gap-5 md:grid-cols-[14rem_1fr]">
          <div>
            <h2 id="authentication" className="text-xl font-semibold">Authentication</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Keep keys server-side and send them in the request header.</p>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-sm leading-6 text-cyan-200 ring-1 ring-white/10">
            <code>Authorization: Bearer galx_live_...</code>
          </pre>
        </section>

        <section aria-labelledby="example-request" className="mt-10 grid gap-5 md:grid-cols-[14rem_1fr]">
          <div>
            <h2 id="example-request" className="text-xl font-semibold">Streaming request</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Set <code>stream</code> to false for one JSON response.</p>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-sm leading-6 text-cyan-200 ring-1 ring-white/10">
            <code>{request}</code>
          </pre>
        </section>

        <nav aria-label="Related API documentation" className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-sm">
          <Link href="/docs/streaming" className="text-zinc-300 hover:text-white">Streaming</Link>
          <Link href="/docs/error-handling" className="text-zinc-300 hover:text-white">Errors</Link>
          <Link href="/docs/rate-limits" className="text-zinc-300 hover:text-white">Rate limits</Link>
          <Link href="/docs/security-spec" className="text-zinc-300 hover:text-white">Security</Link>
        </nav>
      </main>
    </div>
  );
}
