import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Terminal, Code2, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cursor, Cline & IDE Configuration | GALXAI Docs',
  description: 'How to configure Cursor, Cline, Roo-Code, and VS Code extensions with the GALXAI API Gateway.',
};

export default function IdeSetupDocPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Cursor & IDE Setup' }
          ]}
        />

        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Terminal className="w-3.5 h-3.5" />
            <span>IDE & AGENT INTEGRATION</span>
          </div>
          <h1 className="text-3xl font-black text-white">Cursor & Cline IDE Configuration</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Configure Cursor IDE, Cline, or Roo-Code to route coding requests through your local pool with zero latency.
          </p>
        </div>

        {/* Cursor Settings */}
        <section className="glass-panel rounded-3xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Cursor IDE Settings</h2>
          <p className="text-xs text-zinc-300">
            In Cursor Settings &gt; Models &gt; OpenAI API Key, enable "Override OpenAI Base URL":
          </p>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-zinc-200 border border-white/10 overflow-x-auto selection:bg-amber-500 selection:text-black">
            <code>{`Base URL: http://localhost:3000/v1
API Key: galx_live_your_gateway_key
Model: gpt-5.6-sol (or gpt-5.6-terra, gpt-5.6-luna, x-ai/grok-4.5)`}</code>
          </pre>
        </section>

        {/* Cline / Roo-Code JSON Settings */}
        <section className="glass-panel rounded-3xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Cline & Roo-Code Settings JSON</h2>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-zinc-200 border border-white/10 overflow-x-auto selection:bg-cyan-500 selection:text-black">
            <code>{`{
  "apiProvider": "openai",
  "openAiBaseUrl": "http://localhost:3000/v1",
  "openAiApiKey": "galx_live_your_gateway_key",
  "openAiModelId": "gpt-5.6-sol",
  "customModels": [
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "x-ai/grok-4.5"
  ]
}`}</code>
          </pre>
        </section>
      </main>
    </div>
  );
}
