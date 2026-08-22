import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { ShareButton } from '@/components/common/ShareButton';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { Zap, Sparkles, Terminal, Code2, ArrowRight, CheckCircle2, Copy, Flame, Coins, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: '30-Second Quickstart Guide | GALXAI Docs',
  description: 'Learn how to connect to the GALXAI API Gateway in under 30 seconds using Python, TypeScript, or cURL with 25%-40% wholesale savings.',
};

export default function QuickstartDocPage() {
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Connect to the GALXAI Universal AI Gateway in 30 Seconds',
    description: 'Learn how to route OpenAI Codex and xAI Grok requests through GALXAI with 25%–40% wholesale savings and zero code refactoring.',
    totalTime: 'PT30S',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Mint Your Gateway API Key',
        text: 'Generate a live developer API key (galx_live_...) with $5 free introductory credit.'
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Set Your Base URL',
        text: 'Set the OpenAI SDK or Cursor IDE Base URL to https://api.galx.ai/v1.'
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Execute Your First Completion',
        text: 'Run standard chat completion code against GPT-5.6 Sol or Grok 4.5.'
      }
    ]
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: '30-Second Quickstart' }
          ]}
        />

        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>GET STARTED IN 30 SECONDS</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Guide"
              title="GALXAI 30-Second Quickstart Guide"
              description="Connect to GALXAI Universal Gateway in under 30 seconds with 1 line of configuration."
            />
          </div>
          <h1 className="text-3xl font-black text-white">30-Second Gateway Quickstart</h1>
          <p className="text-sm text-zinc-400 leading-relaxed font-sans">
            Follow these 3 simple steps to route OpenAI and xAI Grok frontier models through the high-throughput GALXAI router with 25%–40% wholesale savings.
          </p>
        </div>

        {/* Founding Builder Grant Highlight Banner */}
        <div className="glass-panel rounded-2xl p-5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-indigo-600/15 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shrink-0">
              <Flame className="w-4 h-4 text-black fill-black" />
            </div>
            <div>
              <span className="text-white font-bold block">50% Instant Compute Match Bonus Active</span>
              <span className="text-zinc-300 text-[11px]">Deposit $50+ to receive 50% matched inference credits. Includes instant $5 free credit token.</span>
            </div>
          </div>
          <Link
            href="/keys/new"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 whitespace-nowrap cursor-pointer"
          >
            <span>Claim $5 Key</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </Link>
        </div>

        <DocsSubNav />

        {/* Step 1 */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3 border border-white/10">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold">
            STEP 01
          </div>
          <h2 className="text-lg font-bold text-white">1. Mint Your Gateway API Key</h2>
          <p className="text-xs text-zinc-400 font-sans">
            Create an API key with 1-click workload presets (Cursor IDE, Production Backend, or Agent Swarm).
          </p>
          <div className="pt-2">
            <Link
              href="/keys/new"
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black text-xs font-mono font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Mint Live API Key ($5 Free Credit)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Step 2 */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3 border border-white/10">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold">
            STEP 02
          </div>
          <h2 className="text-lg font-bold text-white">2. Point Your Client Base URL</h2>
          <p className="text-xs text-zinc-400 font-sans">
            Change your client&apos;s base URL to <code className="text-cyan-300 font-mono">https://api.galx.ai/v1</code>. No code refactoring is required.
          </p>
          <div className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-zinc-300 border border-white/5 space-y-1">
            <div className="text-zinc-500"># In your .env or environment configuration:</div>
            <div className="text-cyan-300">OPENAI_BASE_URL=&quot;https://api.galx.ai/v1&quot;</div>
            <div className="text-amber-300">OPENAI_API_KEY=&quot;galx_live_your_key_here&quot;</div>
          </div>
        </section>

        {/* Step 3 */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3 border border-white/10">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
            STEP 03
          </div>
          <h2 className="text-lg font-bold text-white">3. Execute Your First Completion</h2>
          <p className="text-xs text-zinc-400 font-sans">
            Call any supported model like <code className="text-cyan-300 font-mono">gpt-5.6-sol</code> or <code className="text-cyan-300 font-mono">x-ai/grok-4.5</code>.
          </p>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-cyan-300 border border-white/5 overflow-x-auto">
            <code>{`from openai import OpenAI

client = OpenAI(base_url="https://api.galx.ai/v1", api_key="galx_live_...")
res = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(res.choices[0].message.content)`}</code>
          </pre>
        </section>
      </main>

      {/* Floating Conversion Dock */}
      <FloatingConversionDock />
    </div>
  );
}
