'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { ModelCatalog } from '@/core/router/PublicModelCatalog';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';
import {
  Cpu,
  Search,
  CheckCircle2,
  ArrowRight,
  Zap,
  Copy,
  Check,
  Code2,
  Terminal,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface PresetGroup {
  group: string;
  items: string[];
}

const PRESET_GROUPS: PresetGroup[] = [
  {
    group: 'Frontier Reasoning & Coding',
    items: ['sol', 'gpt-5', 'claude-3-7-sonnet', 'deepseek-r1', 'coding'],
  },
  {
    group: 'High Throughput & Low Latency',
    items: ['terra', 'luna', 'o3-mini', 'fast', 'cheap'],
  },
  {
    group: 'Visual & Multimodal',
    items: ['image', 'dalle-3', 'openai-gpt-image-latest'],
  },
  {
    group: 'Namespaced & Legacy Aliases',
    items: ['openai/gpt-5.6-sol:latest', '@anthropic/claude-3-5-sonnet'],
  },
];

export function ResolverClient() {
  const [query, setQuery] = useState('sol');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'python' | 'ts'>('curl');

  const resolved = ModelCatalog.resolveModel(query.trim());

  const handleCopy = async (text: string, key: string) => {
    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    }
  };

  const getCurlSnippet = (modelId: string, isImage: boolean) => {
    if (isImage) {
      return `curl https://galx.ai/v1/images/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -d '{
    "model": "${modelId}",
    "prompt": "Architectural technical diagram of a distributed edge gateway",
    "size": "1024x1024",
    "quality": "standard"
  }'`;
    }
    return `curl https://galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -d '{
    "model": "${modelId}",
    "messages": [
      {"role": "system", "content": "You are a production systems architect."},
      {"role": "user", "content": "Analyze zero-downtime routing strategies."}
    ],
    "temperature": 0.2
  }'`;
  };

  const getPythonSnippet = (modelId: string, isImage: boolean) => {
    if (isImage) {
      return `from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

result = client.images.generate(
    model="${modelId}",
    prompt="Architectural technical diagram of a distributed edge gateway",
    size="1024x1024"
)
print(result.data[0].url)`;
    }
    return `from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="${modelId}",
    messages=[
        {"role": "system", "content": "You are a production systems architect."},
        {"role": "user", "content": "Analyze zero-downtime routing strategies."}
    ],
    temperature=0.2
)
print(response.choices[0].message.content)`;
  };

  const getTsSnippet = (modelId: string, isImage: boolean) => {
    if (isImage) {
      return `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

const res = await client.images.generate({
  model: "${modelId}",
  prompt: "Architectural technical diagram of a distributed edge gateway",
  size: "1024x1024",
});
console.log(res.data[0].url);`;
    }
    return `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

const res = await client.chat.completions.create({
  model: "${modelId}",
  messages: [
    { role: "system", content: "You are a production systems architect." },
    { role: "user", content: "Analyze zero-downtime routing strategies." },
  ],
  temperature: 0.2,
});
console.log(res.choices[0].message.content);`;
  };

  const activeSnippet = resolved
    ? activeCodeTab === 'curl'
      ? getCurlSnippet(resolved.id, resolved.category === 'image')
      : activeCodeTab === 'python'
      ? getPythonSnippet(resolved.id, resolved.category === 'image')
      : getTsSnippet(resolved.id, resolved.category === 'image')
    : '';

  return (
    <div className="min-h-screen flex flex-col bg-[#07080d] text-zinc-100">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Models', href: '/models' },
            { label: 'Universal Model Alias Resolver' },
          ]}
        />

        {/* Hero Header */}
        <section id="hero-resolver" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 relative overflow-hidden border border-white/10 bg-gradient-to-b from-[#0e1322] via-[#090c16] to-[#07080d]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Cpu className="w-3.5 h-3.5" />
            <span>0MS MODEL ALIAS &amp; CANONICAL RESOLVER</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Universal Model Alias Resolver
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
            Test how the GALXAI gateway resolves shorthand aliases, vendor namespace prefixes, and legacy model strings to canonical frontier specifications in 0ms in-memory trie resolution.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] uppercase text-zinc-500 block">Resolution Speed</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> &lt;1ms (In-Memory)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] uppercase text-zinc-500 block">Wire Protocol</span>
              <span className="text-cyan-300 font-bold">100% OpenAI Wire</span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] uppercase text-zinc-500 block">Prompt Caching</span>
              <span className="text-amber-400 font-bold">Up to -90% Rebate</span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] uppercase text-zinc-500 block">Privacy Guarantee</span>
              <span className="text-indigo-300 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Zero Data Retention
              </span>
            </div>
          </div>
        </section>

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Search Input & Categorized Presets */}
        <section id="resolver-search" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="model-alias-input" className="block text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                Test Model String or Alias
              </label>
              <span className="text-[10px] font-mono text-zinc-500">Case-insensitive &amp; prefix-tolerant</span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="model-alias-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type an alias (e.g. sol, terra, luna, gpt-5, dalle, fast)..."
                className="w-full pl-11 pr-24 py-3.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-zinc-600"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 text-xs font-mono transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Grouped Preset Chips */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">
              Quick Test Presets by Category
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_GROUPS.map((group) => (
                <div key={group.group} className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-[10px] font-mono text-cyan-400/90 font-bold block">
                    {group.group}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((alias) => {
                      const isActive = query.trim().toLowerCase() === alias.toLowerCase();
                      return (
                        <button
                          key={alias}
                          type="button"
                          onClick={() => setQuery(alias)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                            isActive
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                              : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5'
                          }`}
                        >
                          {alias}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Resolution Output Card */}
        {resolved ? (
          <section id="resolution-result" className="glass-card rounded-3xl p-6 sm:p-8 border border-cyan-500/30 space-y-6 animate-in fade-in duration-150">
            {/* Resolution Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Zap className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400">Input &quot;{query}&quot; →</span>
                    <span className="text-base font-bold text-white font-mono">{resolved.id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 uppercase pt-0.5">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Resolved in &lt;1ms (In-Memory Trie)
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400">Canonical Target Verified</span>
                  </div>
                </div>
              </div>

              {/* 1-Click Copy Canonical ID */}
              <button
                type="button"
                onClick={() => handleCopy(resolved.id, 'canonical-id')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-mono font-semibold border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                {copiedKey === 'canonical-id' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">ID Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy Model ID</span>
                  </>
                )}
              </button>
            </div>

            {/* Resolved Model Specification Metrics */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-zinc-500 text-[10px] uppercase block">Target Provider</span>
                <span className="text-white font-bold">{resolved.provider.toUpperCase()}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-zinc-500 text-[10px] uppercase block">Context Window</span>
                <span className="text-cyan-300 font-bold">
                  {resolved.category === 'image'
                    ? '1024x1024'
                    : `${(resolved.contextWindowTokens / 1000).toLocaleString()}K tokens`}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-zinc-500 text-[10px] uppercase block">
                  {resolved.category === 'image' ? 'Standard Rate' : 'Wholesale Input / 1M'}
                </span>
                <span className="text-emerald-300 font-bold">
                  ${resolved.inputPricePer1M.toFixed(resolved.category === 'image' ? 3 : 2)}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-zinc-500 text-[10px] uppercase block">
                  {resolved.category === 'image' ? 'Resolution' : 'Wholesale Output / 1M'}
                </span>
                <span className="text-emerald-300 font-bold">
                  {resolved.category === 'image' ? '1024x1024' : `$${resolved.outputPricePer1M.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Live Interactive Code Snippet for the Resolved Model */}
            <div className="rounded-2xl bg-black/70 border border-white/10 overflow-hidden space-y-0">
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-mono text-zinc-300 font-semibold text-[11px]">
                    Live Executable Request for {resolved.id}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-black/60 p-0.5 rounded-lg border border-white/10 font-mono text-[10px]">
                    {(['curl', 'python', 'ts'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveCodeTab(tab)}
                        className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                          activeCodeTab === tab
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {tab === 'curl' ? 'cURL' : tab === 'python' ? 'Python' : 'TypeScript'}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(activeSnippet, 'resolved-code')}
                    className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy snippet"
                  >
                    {copiedKey === 'resolved-code' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4 relative">
                <pre className="text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                  <code>{activeSnippet}</code>
                </pre>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Link
                href={`/models/${resolved.id.replace('/', '-')}`}
                className="text-xs font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-1 transition-colors"
              >
                <span>View full specifications for {resolved.id}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-2">
                <Link
                  href="/playground"
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-mono font-semibold border border-white/10 transition-colors"
                >
                  Open in Playground
                </Link>

                <Link
                  href="/keys"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold font-mono flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
                >
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  <span>Generate API Key</span>
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <div className="glass-panel rounded-3xl p-8 text-center space-y-2 border border-rose-500/20 bg-rose-500/5">
            <p className="text-sm text-zinc-300 font-mono">No direct match for &quot;{query}&quot;.</p>
            <p className="text-xs text-zinc-500">
              Try shorthand aliases like <strong className="text-zinc-300 font-mono">sol</strong>, <strong className="text-zinc-300 font-mono">terra</strong>, <strong className="text-zinc-300 font-mono">luna</strong>, or <strong className="text-zinc-300 font-mono">dalle</strong>.
            </p>
          </div>
        )}

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}
