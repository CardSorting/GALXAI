'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Sparkles,
  Zap,
  TrendingDown,
  Clock,
  CheckCircle2,
  Code2,
  Cpu,
  Layers,
  Calculator,
  ArrowRight,
  Copy,
  Check,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';

export default function PromptCachingDocsPage() {
  const [systemTokens, setSystemTokens] = useState<number>(4000);
  const [dailyRequests, setDailyRequests] = useState<number>(5000);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  // Sol pricing: $1.875/1M input vs $0.46875/1M cached (75% rebate)
  const uncachedCost = (systemTokens * dailyRequests * 1.875) / 1000000;
  const cachedCost = (systemTokens * dailyRequests * 0.46875) / 1000000;
  const dailySavings = uncachedCost - cachedCost;
  const monthlySavings = dailySavings * 30;

  const inspectionSnippets = {
    python: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[
        {"role": "system", "content": "You are a senior systems engineer... (1,024+ tokens)"},
        {"role": "user", "content": "Refactor this handler."}
    ]
)

# Inspect automatic prompt cache hit details:
usage = response.usage
cached_tokens = getattr(usage.prompt_tokens_details, 'cached_tokens', 0) if usage.prompt_tokens_details else 0

print(f"Total Input: {usage.prompt_tokens}")
print(f"Cached Input (75% Rebate): {cached_tokens}")
print(f"Uncached Input: {usage.prompt_tokens - cached_tokens}")`,
    node: `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY || "galx_live_your_gateway_key",
});

const response = await openai.chat.completions.create({
  model: "gpt-5.6-sol",
  messages: [
    { role: "system", content: "You are an AI architect... (1,024+ tokens)" },
    { role: "user", content: "Audit this database schema." }
  ]
});

// Inspect automated cache hit tokens:
const cachedTokens = response.usage?.prompt_tokens_details?.cached_tokens ?? 0;
console.log(\`Cached Tokens (75% Rebate): \${cachedTokens} / \${response.usage?.prompt_tokens}\`);`
  };

  const handleCopy = async (code: string, tab: string) => {
    await safeCopyToClipboard(code);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'API & Model Reference', href: '/docs/api-reference' },
            { label: '75% Automated Prompt Caching' }
          ]}
        />

        {/* Header Hero */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>75% DISCOUNT PASS-THROUGH</span>
            </div>
            <Link
              href="/keys/new"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase font-mono tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Get Cache-Enabled Key</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Automated 75% Prompt Caching Guide</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            Cut input inference costs by 75% and slash Time-to-First-Token (TTFT) by up to 80% automatically. Zero code refactoring or custom routing parameters required.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Value Proposition Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-emerald-400 text-[10px] uppercase font-sans font-semibold">Cost Reduction</span>
            <div className="text-2xl font-black text-emerald-300">-75% Rebate</div>
            <div className="text-[11px] text-emerald-400 font-sans">On all cached prompt prefix tokens</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-cyan-400 text-[10px] uppercase font-sans font-semibold">Latency Acceleration</span>
            <div className="text-2xl font-black text-cyan-300">~65 ms TTFT</div>
            <div className="text-[11px] text-cyan-400 font-sans">Down from 450ms cold prefill</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-zinc-500 text-[10px] uppercase font-sans">Code Refactoring Needed</span>
            <div className="text-2xl font-black text-white">0 Lines of Code</div>
            <div className="text-[11px] text-zinc-400 font-sans">100% automated prefix discovery</div>
          </div>
        </div>

        {/* Interactive Prompt Cache Savings Simulator */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg sm:text-xl font-black text-white font-mono">Interactive Prompt Cache ROI Simulator</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-300">
                  <span>System Prompt / Context Prefix Size:</span>
                  <span className="text-amber-300 font-bold">{systemTokens.toLocaleString()} tokens</span>
                </div>
                <input
                  type="range"
                  min={1024}
                  max={32000}
                  step={512}
                  value={systemTokens}
                  onChange={(e) => setSystemTokens(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-300">
                  <span>Daily API Requests with Shared Prefix:</span>
                  <span className="text-cyan-300 font-bold">{dailyRequests.toLocaleString()} reqs/day</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={50000}
                  step={500}
                  value={dailyRequests}
                  onChange={(e) => setDailyRequests(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-2 gap-3 font-mono text-center">
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-1">
                <span className="text-zinc-500 text-[10px] uppercase block">Daily Cost (Without Cache)</span>
                <span className="text-zinc-400 line-through text-base font-bold">${uncachedCost.toFixed(2)}</span>
                <span className="text-emerald-400 text-lg font-black block">${cachedCost.toFixed(2)}/day</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 space-y-1">
                <span className="text-emerald-300 text-[10px] uppercase block font-bold">Monthly Savings</span>
                <span className="text-2xl font-black text-emerald-300 block">+${monthlySavings.toFixed(2)}</span>
                <span className="text-[10px] text-emerald-400/80">75% Net Compute Rebate</span>
              </div>
            </div>
          </div>
        </div>

        {/* How it Works Section */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              How Automated Prefix Caching Works
            </h2>
            <p className="text-xs text-zinc-400">
              When requests share the same prefix of 1,024+ tokens, the gateway matches the pre-computed KV-cache at the hardware layer.
            </p>
          </div>

          <div className="space-y-4 font-sans text-xs text-zinc-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 font-mono text-xs">
              <div className="text-amber-300 font-bold">1. Minimum Prefix Length:</div>
              <p className="text-zinc-400">
                Prompts with $\ge 1,024$ tokens of identical prefix (e.g. system prompt + tools array + static documentation) are automatically cached in 128-token increment blocks.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 font-mono text-xs">
              <div className="text-cyan-300 font-bold">2. Cache Lifetime &amp; Refresh:</div>
              <p className="text-zinc-400">
                Cached prefixes persist for 5 to 10 minutes following the most recent request. Every subsequent request with the same prefix refreshes the cache TTL.
              </p>
            </div>
          </div>
        </div>

        {/* Token Inspection Code Snippets */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white font-mono">How to Verify Cache Hits in Code</h3>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs">
              {(['python', 'node'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleCopy(inspectionSnippets[t], t)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all text-xs cursor-pointer border border-white/5"
                >
                  {copiedTab === t ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="uppercase">{t}</span>
                </button>
              ))}
            </div>
          </div>

          <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 font-mono text-xs text-cyan-300 overflow-x-auto">
            <code>{inspectionSnippets.python}</code>
          </pre>
        </div>

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
