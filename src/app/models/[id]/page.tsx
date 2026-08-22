import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { EXCLUSIVE_MODEL_CATALOG, ModelCatalog } from '@/core/router/ModelCatalog';
import {
  Zap,
  Rocket,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Terminal,
  Code2,
  Layers,
  ShieldCheck,
  Activity,
  Copy,
  TrendingDown
} from 'lucide-react';

interface ModelDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return EXCLUSIVE_MODEL_CATALOG.map((m) => ({
    id: m.id.replace('/', '-'),
  }));
}

export async function generateMetadata({ params }: ModelDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const canonicalId = id.replace('-', '/');
  const model = EXCLUSIVE_MODEL_CATALOG.find(
    m => m.id === canonicalId || m.id === id || m.upstreamId === id
  );

  if (!model) {
    return { title: 'Model Not Found | GALXAI' };
  }

  return {
    title: `${model.name} — Pricing & API Specs`,
    description: `Save ${model.discountPercentage || 25}% on ${model.name}. Token pricing: $${model.inputPricePer1M.toFixed(2)}/1M input, $${model.outputPricePer1M.toFixed(2)}/1M output, ${model.contextWindowTokens / 1000}K context window, and standard OpenAI SDK routing.`,
    keywords: [model.id, model.upstreamId, model.name, model.provider, 'Model Router', 'AI Gateway', 'API Specs', 'Discount Pricing'],
  };
}

export default async function ModelDetailPage({ params }: ModelDetailPageProps) {
  const { id } = await params;
  const canonicalId = id.replace('-', '/');
  const model = EXCLUSIVE_MODEL_CATALOG.find(
    m => m.id === canonicalId || m.id === id || m.upstreamId === id
  );

  if (!model) {
    notFound();
  }

  const isGrok = model.provider === 'xai-grok';
  const isImage = model.category === 'image';

  const pythonSnippet = `from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="${model.id}",
    messages=[{"role": "user", "content": "Explain your capabilities."}],
    stream=True
)

for chunk in response:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`;

  const curlSnippet = `curl http://localhost:3000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer galx_live_your_gateway_key" \\
  -d '{
    "model": "${model.id}",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'`;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Models', href: '/models' },
            { label: model.name }
          ]}
        />

        {/* Model Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 relative overflow-hidden space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isGrok
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                }`}>
                  {isGrok ? <Rocket className="w-5 h-5" /> : <Zap className="w-5 h-5 fill-amber-400" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-white">{model.name}</h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
                      -{model.discountPercentage}% Below List
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono">
                    Canonical ID: <code className="text-cyan-300 font-bold">{model.id}</code> • Upstream: <code className="text-zinc-300">{model.upstreamId}</code>
                  </p>
                </div>
              </div>
              <p className="text-sm text-zinc-300 max-w-3xl leading-relaxed">
                {model.description}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={`/playground?model=${model.id}`}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                <Terminal className="w-4 h-4" />
                <span>Test in Playground</span>
              </Link>
            </div>
          </div>

          {/* Quick Specs & Discount Pricing Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 font-mono">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex justify-between items-center text-zinc-500 text-[10px] uppercase">
                <span>Input Rate</span>
                {model.listPricePer1MInput && (
                  <span className="line-through text-zinc-600">${model.listPricePer1MInput.toFixed(2)}</span>
                )}
              </div>
              <div className="text-base font-bold text-emerald-300">${model.inputPricePer1M.toFixed(2)} <span className="text-xs text-zinc-500 font-normal">/ 1M</span></div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex justify-between items-center text-zinc-500 text-[10px] uppercase">
                <span>Output Rate</span>
                {model.listPricePer1MOutput && (
                  <span className="line-through text-zinc-600">${model.listPricePer1MOutput.toFixed(2)}</span>
                )}
              </div>
              <div className="text-base font-bold text-emerald-300">${model.outputPricePer1M.toFixed(2)} <span className="text-xs text-zinc-500 font-normal">/ 1M</span></div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Prompt Caching</span>
              <div className="text-base font-bold text-cyan-300">
                {model.cachedInputPricePer1M ? `$${model.cachedInputPricePer1M.toFixed(2)}` : 'Included'} <span className="text-xs text-zinc-500 font-normal">/ 1M</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Context Window</span>
              <div className="text-base font-bold text-amber-300">{model.contextWindowTokens.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">tok</span></div>
            </div>
          </div>
        </div>

        {/* Integration Code Snippets for this Model */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-amber-400" />
            Integrate {model.name}
          </h2>
          <p className="text-xs text-zinc-400">
            Use standard OpenAI client libraries pointing to the GALXAI local endpoint.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Python Snippet */}
            <div className="rounded-2xl bg-black/60 border border-white/10 overflow-hidden space-y-0">
              <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 text-[11px] font-mono text-zinc-400">
                Python (openai &gt;= 1.0.0)
              </div>
              <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto selection:bg-amber-500 selection:text-black">
                <code>{pythonSnippet}</code>
              </pre>
            </div>

            {/* cURL Snippet */}
            <div className="rounded-2xl bg-black/60 border border-white/10 overflow-hidden space-y-0">
              <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 text-[11px] font-mono text-zinc-400">
                cURL HTTP Request
              </div>
              <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto selection:bg-cyan-500 selection:text-black">
                <code>{curlSnippet}</code>
              </pre>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
