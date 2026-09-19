import Link from 'next/link';
import { ArrowRight, BookOpen, KeyRound, Layers, Terminal } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/PublicModelCatalog';

const DEFAULT_MODEL_ID = FRONTEND_VISIBLE_MODELS.find((model) => model.category === 'llm')?.id ?? 'galx-nova';

const GUIDE_GROUPS = [
  {
    title: 'Start',
    links: [
      ['/docs/quickstart', 'Quickstart', 'Send one authenticated request.'],
      ['/docs/models-guide', 'Models', 'Choose a model from the live catalog.'],
      ['/docs/migration', 'Migration', 'Move an existing provider integration.'],
      ['/docs/ide-setup', 'IDEs', 'Connect Cursor, Windsurf, or Claude Code.'],
    ],
  },
  {
    title: 'Build',
    links: [
      ['/docs/api-reference', 'API reference', 'Endpoints, authentication, and payloads.'],
      ['/docs/sdks', 'SDKs', 'Language and framework integrations.'],
      ['/docs/streaming', 'Streaming', 'Consume OpenAI-compatible SSE.'],
      ['/docs/structured-outputs', 'Structured outputs', 'Return schema-constrained JSON.'],
      ['/docs/function-calling', 'Function calling', 'Send tools and handle tool results.'],
      ['/docs/embeddings', 'Embeddings', 'Create vectors for retrieval.'],
    ],
  },
  {
    title: 'Operate',
    links: [
      ['/docs/error-handling', 'Errors', 'Classify failures and retry safely.'],
      ['/docs/rate-limits', 'Rate limits', 'Plan throughput and concurrency.'],
      ['/docs/security-spec', 'Security', 'Credential custody and retention modes.'],
      ['/docs/prompt-caching', 'Prompt caching', 'Keep reusable prefixes stable.'],
      ['/docs/architecture', 'Architecture', 'Understand routing and authority.'],
    ],
  },
  {
    title: 'Patterns',
    links: [
      ['/docs/agents', 'Agents', 'Run isolated agent sessions.'],
      ['/docs/cookbook', 'Cookbook', 'Use complete integration patterns.'],
      ['/docs/integrations', 'Integrations', 'Connect supported developer tools.'],
      ['/docs/simple', 'Plain-language guide', 'Review the platform without jargon.'],
    ],
  },
] as const;

export function DocsClient() {
  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      <Navigation />

      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Breadcrumbs items={[{ label: 'Documentation' }]} />

        <header className="max-w-3xl pb-8 pt-6 sm:pb-10">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
            Connect to GALXAI
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            Review supported capabilities and point an authorized server-side client at GALXAI. These docs cover integration contracts—not a hosted chat or image application.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/models"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              Browse models
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/developers"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Private access guidance
            </Link>
          </div>
        </header>

        <DocsSubNav />

        <section aria-labelledby="first-request" className="mt-10 border-y border-white/10 py-8">
          <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
            <div>
              <h2 id="first-request" className="text-xl font-semibold text-white">First request</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Use a server-side key. Replace the model ID after reviewing `/models`.</p>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-sm leading-6 text-cyan-200 ring-1 ring-white/10">
              <code>{`export GALXAI_API_KEY="galx_live_..."

curl https://galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${DEFAULT_MODEL_ID}","messages":[{"role":"user","content":"Hello"}]}'`}</code>
            </pre>
          </div>
        </section>

        <div className="grid gap-x-12 gap-y-10 py-10 md:grid-cols-2">
          {GUIDE_GROUPS.map((group) => (
            <section key={group.title} aria-labelledby={`docs-${group.title.toLowerCase()}`}>
              <div className="flex items-center gap-2">
                {group.title === 'Start' && <Terminal className="h-4 w-4 text-indigo-300" aria-hidden="true" />}
                {group.title === 'Build' && <BookOpen className="h-4 w-4 text-indigo-300" aria-hidden="true" />}
                {group.title === 'Operate' && <Layers className="h-4 w-4 text-indigo-300" aria-hidden="true" />}
                <h2 id={`docs-${group.title.toLowerCase()}`} className="text-lg font-semibold text-white">{group.title}</h2>
              </div>
              <div className="mt-3 divide-y divide-white/10 border-t border-white/10">
                {group.links.map(([href, title, description]) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-start justify-between gap-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                  >
                    <span>
                      <span className="block text-sm font-medium text-zinc-100 group-hover:text-indigo-200">{title}</span>
                      <span className="mt-0.5 block text-sm leading-5 text-zinc-500">{description}</span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-300" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
