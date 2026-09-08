import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/PublicModelCatalog';

export function StreamingClient() {
  const defaultModel = FRONTEND_VISIBLE_MODELS.find((model) => model.category === 'llm')?.id ?? 'gpt-5.6-sol';

  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      <Navigation />

      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Breadcrumbs items={[{ label: 'Docs', href: '/docs' }, { label: 'Streaming' }]} />

        <header className="max-w-3xl pb-8 pt-6">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Stream responses</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            Set <code>stream: true</code> and consume standard OpenAI-compatible server-sent events. Measure latency from your deployment instead of relying on a fixed global estimate.
          </p>
        </header>

        <DocsSubNav />

        <section aria-labelledby="stream-request" className="mt-10 grid gap-6 md:grid-cols-[14rem_1fr]">
          <div>
            <h2 id="stream-request" className="text-xl font-semibold">Request</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">The OpenAI client exposes the response as an async iterator.</p>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-sm leading-6 text-cyan-200 ring-1 ring-white/10">
            <code>{`const stream = await client.chat.completions.create({
  model: "${defaultModel}",
  messages: [{ role: "user", content: "Hello" }],
  stream: true,
});

for await (const event of stream) {
  process.stdout.write(event.choices[0]?.delta?.content ?? "");
}`}</code>
          </pre>
        </section>

        <section aria-labelledby="wire-format" className="mt-10 grid gap-6 md:grid-cols-[14rem_1fr]">
          <div>
            <h2 id="wire-format" className="text-xl font-semibold">Wire format</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Each event starts with <code>data:</code>. The stream ends with <code>[DONE]</code>.</p>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-sm leading-6 text-cyan-200 ring-1 ring-white/10">
            <code>{`data: {"choices":[{"delta":{"content":"Hello"}}]}

data: [DONE]`}</code>
          </pre>
        </section>

        <section aria-labelledby="stream-rules" className="mt-10 max-w-3xl">
          <h2 id="stream-rules" className="text-xl font-semibold">Production rules</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-400">
            <li>Abort upstream work when the client disconnects.</li>
            <li>Do not buffer the full response before forwarding chunks.</li>
            <li>Retry only before application-visible output unless the workflow is resumable.</li>
            <li>Record observed timing and usage; do not infer them from marketing defaults.</li>
          </ul>
        </section>

        <nav aria-label="Related streaming documentation" className="mt-10 flex gap-6 border-t border-white/10 pt-6 text-sm">
          <Link href="/docs/error-handling" className="text-zinc-300 hover:text-white">Error handling</Link>
          <Link href="/docs/api-reference" className="text-zinc-300 hover:text-white">API reference</Link>
        </nav>
      </main>
    </div>
  );
}
