import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Zap, Sparkles, Terminal, Code2, ArrowRight, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: '2-Minute Quickstart Guide | GALXAI Docs',
  description: 'Learn how to connect to the GALXAI API Gateway in under 2 minutes using Python, TypeScript, or Cursor IDE.',
};

export default function QuickstartDocPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: '2-Minute Quickstart' }
          ]}
        />

        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span>GET STARTED IN 2 MINUTES</span>
          </div>
          <h1 className="text-3xl font-black text-white">2-Minute Gateway Quickstart</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Follow these 3 simple steps to route flagship OpenAI Codex and xAI Grok models through your local GALXAI router.
          </p>
        </div>

        {/* Step 1 */}
        <section className="glass-panel rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold">
            STEP 01
          </div>
          <h2 className="text-lg font-bold text-white">1. Connect Your Account</h2>
          <p className="text-xs text-zinc-400">
            Connect your OpenAI or xAI Grok account with 1-click single sign-on. Your identity automatically provisions compute quota in the background.
          </p>
          <div className="pt-2">
            <Link
              href="/auth/connect"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
            >
              <span>Connect Account Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Step 2 */}
        <section className="glass-panel rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold">
            STEP 02
          </div>
          <h2 className="text-lg font-bold text-white">2. Create a Gateway API Key</h2>
          <p className="text-xs text-zinc-400">
            Generate a unified client token (<code className="text-cyan-300 font-mono">galx_live_...</code>) for authenticating your applications.
          </p>
          <div className="pt-2">
            <Link
              href="/keys/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
            >
              <span>Generate Gateway Key</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Step 3 */}
        <section className="glass-panel rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold">
            STEP 03
          </div>
          <h2 className="text-lg font-bold text-white">3. Point Your Code to localhost:3000/v1</h2>
          <p className="text-xs text-zinc-400">
            Replace the OpenAI API base URL in your application with <code className="text-cyan-300 font-mono">http://localhost:3000/v1</code>.
          </p>

          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-zinc-200 border border-white/10 overflow-x-auto selection:bg-amber-500 selection:text-black">
            <code>{`from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="galx_live_your_key_here"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol", # or "x-ai/grok-4.5", "gpt-5.6-terra", "gpt-5.6-luna"
    messages=[{"role": "user", "content": "Explain continuous token-bucket calculus."}],
    stream=True
)`}</code>
          </pre>
        </section>
      </main>
    </div>
  );
}
