import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { Terminal, Code2, CheckCircle2, Laptop } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cursor, Windsurf & IDE Configuration | GALXAI Docs',
  description: 'How to configure Cursor, Windsurf, Continue.dev, and Cline with the GALXAI API Gateway.',
};

export default function IdeSetupDocPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Cursor & IDE Setup' }
          ]}
        />

        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Terminal className="w-3.5 h-3.5" />
            <span>IDE & AGENT INTEGRATION</span>
          </div>
          <h1 className="text-3xl font-black text-white">Cursor, Windsurf & Continue.dev Configuration</h1>
          <p className="text-sm text-zinc-400 leading-relaxed font-sans">
            Configure Cursor IDE, Windsurf, Continue.dev, or Cline to route coding completions through your high-speed gateway with sub-15ms latency and 25%–40% wholesale savings.
          </p>
        </div>

        <DocsSubNav />

        {/* Cursor Settings */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-lg font-bold text-white font-mono">1. Cursor IDE Settings</h2>
          <p className="text-xs text-zinc-300 font-sans">
            In Cursor Settings &gt; Models &gt; OpenAI API Key, toggle "Override OpenAI Base URL":
          </p>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-amber-300 border border-white/10 overflow-x-auto">
            <code>{`Base URL: https://api.galxai.com/v1
API Key: galx_live_your_gateway_key
Models to enable: gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, x-ai/grok-4.5`}</code>
          </pre>
        </section>

        {/* Continue.dev Extension config.json */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-lg font-bold text-white font-mono">2. Continue.dev Extension (~/.continue/config.json)</h2>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-cyan-300 border border-white/10 overflow-x-auto">
            <code>{`{
  "models": [
    {
      "title": "GALXAI GPT-5.6 Sol",
      "provider": "openai",
      "model": "gpt-5.6-sol",
      "apiBase": "https://api.galxai.com/v1",
      "apiKey": "galx_live_your_gateway_key"
    },
    {
      "title": "GALXAI Grok 4.5",
      "provider": "openai",
      "model": "x-ai/grok-4.5",
      "apiBase": "https://api.galxai.com/v1",
      "apiKey": "galx_live_your_gateway_key"
    }
  ]
}`}</code>
          </pre>
        </section>

        {/* Cline / Roo-Code JSON Settings */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-lg font-bold text-white font-mono">3. Cline & Roo-Code VS Code Extension</h2>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-emerald-300 border border-white/10 overflow-x-auto">
            <code>{`API Provider: OpenAI-Compatible
Base URL: https://api.galxai.com/v1
API Key: galx_live_your_gateway_key
Model ID: gpt-5.6-sol`}</code>
          </pre>
        </section>
      </main>
    </div>
  );
}
