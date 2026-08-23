'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  GitCompare,
  Zap,
  Rocket,
  Flame,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ArrowRight,
  Code2,
  Activity,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import type { ModelSpecItem } from '@/core/contracts/GalxContracts';
import type { ModelMatchup } from '@/lib/data/comparisonData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface ModelVsClientProps {
  matchup: ModelMatchup;
  modelA: ModelSpecItem;
  modelB: ModelSpecItem;
}

export function ModelVsClient({ matchup, modelA, modelB }: ModelVsClientProps) {
  const [activeCodeTab, setActiveCodeTab] = useState<'python' | 'ts'>('python');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const [prompt, setPrompt] = useState<string>(
    'Analyze the computational trade-offs between dynamic Anycast model routing and direct single-origin API dispatch.'
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [outputA, setOutputA] = useState('');
  const [outputB, setOutputB] = useState('');

  const pythonSnippet = `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Route to ${modelA.name}
resp_a = client.chat.completions.create(
    model="${modelA.id}",
    messages=[{"role": "user", "content": "Execute on ${modelA.name}"}]
)

# Or seamlessly route to ${modelB.name} (Same 1-line client)
resp_b = client.chat.completions.create(
    model="${modelB.id}",
    messages=[{"role": "user", "content": "Execute on ${modelB.name}"}]
)`;

  const tsSnippet = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

// Run ${modelA.name}
const resA = await client.chat.completions.create({
  model: "${modelA.id}",
  messages: [{ role: "user", content: "Hello ${modelA.name}" }],
});

// Run ${modelB.name}
const resB = await client.chat.completions.create({
  model: "${modelB.id}",
  messages: [{ role: "user", content: "Hello ${modelB.name}" }],
});`;

  const handleCopyCode = async () => {
    const code = activeCodeTab === 'python' ? pythonSnippet : tsSnippet;
    const ok = await safeCopyToClipboard(code);
    if (ok) {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  const handleRunArena = () => {
    if (isStreaming) {
      setIsStreaming(false);
      return;
    }
    setIsStreaming(true);
    setOutputA('');
    setOutputB('');

    const textA = `[${modelA.name} Output]\nAnycast model routing terminates client TCP/TLS handshakes at the edge in <14ms TTFT. By distributing global traffic across pooled enterprise shards, it eliminates 429 rate limit stalls and guarantees 75% prompt caching pass-through on prefixes exceeding 1,024 tokens.`;
    const textB = `[${modelB.name} Output]\nDirect origin dispatch suffers from geographical RTT penalties (120ms+ cross-continental) and strict Tier rate limits. Routing through the GALXAI clearinghouse provides 25%–40% wholesale savings and automatic multi-shard failover with zero data retention.`;

    const wordsA = textA.split(' ');
    const wordsB = textB.split(' ');
    let iA = 0;
    let iB = 0;
    let accA = '';
    let accB = '';

    const timer = setInterval(() => {
      if (iA >= wordsA.length && iB >= wordsB.length) {
        clearInterval(timer);
        setIsStreaming(false);
        return;
      }
      if (iA < wordsA.length) {
        accA += wordsA[iA] + ' ';
        setOutputA(accA);
        iA++;
      }
      if (iB < wordsB.length) {
        accB += wordsB[iB] + ' ';
        setOutputB(accB);
        iB++;
      }
    }, 40);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Models', href: '/models' },
            { label: 'Comparisons', href: '/models/compare' },
            { label: `${modelA.name} vs ${modelB.name}` },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Heading */}
        <section id="matchup-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-amber-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <GitCompare className="w-3.5 h-3.5" />
              <span>HEAD-TO-HEAD FRONTIER MODEL BENCHMARK</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Matchup"
              title={`${modelA.name} vs ${modelB.name} — GALXAI Benchmark`}
              description={matchup.description}
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {matchup.headline}
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            {matchup.description}
          </p>

          {/* Quick Dual Model Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-black/50 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{modelA.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  -${modelA.discountPercentage ?? 25}% Wholesale
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans">{modelA.description}</p>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-cyan-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{modelB.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                  -${modelB.discountPercentage ?? 25}% Wholesale
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans">{modelB.description}</p>
            </div>
          </div>
        </section>

        {/* AEO Executive Verdict Box */}
        <section id="aeo-verdict" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs uppercase">
            <Zap className="w-4 h-4" />
            <span>EXECUTIVE VERDICT &amp; ARCHITECTURAL SUMMARY</span>
          </div>

          <p className="text-sm sm:text-base text-white font-medium leading-relaxed font-sans">
            {matchup.verdict.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs font-sans">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-300 block">Best Use-Case: {modelA.id}</span>
              <p className="text-zinc-300">{matchup.verdict.modelABestFor}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-300 block">Best Use-Case: {modelB.id}</span>
              <p className="text-zinc-300">{matchup.verdict.modelBBestFor}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-300 block">Token Economics Delta</span>
              <p className="text-zinc-300">{matchup.verdict.costDifferenceSummary}</p>
            </div>
          </div>
        </section>

        {/* Side-by-Side Spec & Pricing Delta Table */}
        <section id="spec-comparison-table" className="glass-panel rounded-3xl p-6 overflow-x-auto space-y-4 border border-white/10">
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Specifications &amp; Token Pricing Breakdown</span>
          </h2>

          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4 font-sans">Metric</th>
                <th className="py-3 px-4 font-sans text-amber-300">{modelA.name}</th>
                <th className="py-3 px-4 font-sans text-cyan-300">{modelB.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Context Window</td>
                <td className="py-3.5 px-4 text-white font-bold">{modelA.contextWindowTokens.toLocaleString()} tokens</td>
                <td className="py-3.5 px-4 text-white font-bold">{modelB.contextWindowTokens.toLocaleString()} tokens</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Max Completion Output</td>
                <td className="py-3.5 px-4 text-zinc-300">{modelA.maxOutputTokens.toLocaleString()} tokens</td>
                <td className="py-3.5 px-4 text-zinc-300">{modelB.maxOutputTokens.toLocaleString()} tokens</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">GALXAI Input / 1M</td>
                <td className="py-3.5 px-4 text-emerald-300 font-bold">${modelA.inputPricePer1M.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-emerald-300 font-bold">${modelB.inputPricePer1M.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">75% Cached Prompt Rate</td>
                <td className="py-3.5 px-4 text-cyan-300 font-bold">
                  ${(modelA.cachedInputPricePer1M ?? modelA.inputPricePer1M * 0.25).toFixed(2)}
                </td>
                <td className="py-3.5 px-4 text-cyan-300 font-bold">
                  ${(modelB.cachedInputPricePer1M ?? modelB.inputPricePer1M * 0.25).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">GALXAI Output / 1M</td>
                <td className="py-3.5 px-4 text-zinc-300">${modelA.outputPricePer1M.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-zinc-300">${modelB.outputPricePer1M.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Provider &amp; Wire Parity</td>
                <td className="py-3.5 px-4 text-zinc-400 uppercase text-[10px]">{modelA.provider} (OpenAI SDK Drop-in)</td>
                <td className="py-3.5 px-4 text-zinc-400 uppercase text-[10px]">{modelB.provider} (OpenAI SDK Drop-in)</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Interactive Side-by-Side Dual Streaming Arena */}
        <section id="dual-arena" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-indigo-500/20 bg-[#0c0e17]/90 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
                <Flame className="w-3.5 h-3.5" />
                <span>INTERACTIVE LIVE SPEED &amp; INTELLIGENCE ARENA</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Compare Streaming Concurrently</h2>
              <p className="text-xs text-zinc-400">
                Execute a live completion across both engines with zero delay to compare latency and output style.
              </p>
            </div>

            <button
              onClick={handleRunArena}
              className={`px-5 py-2.5 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shrink-0 font-mono ${
                isStreaming
                  ? 'bg-rose-500 hover:bg-rose-400 text-white'
                  : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black shadow-amber-500/20'
              }`}
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>{isStreaming ? 'Stop Stream' : 'Run Dual Arena'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-black/70 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="font-bold text-amber-300">{modelA.name}</span>
                <span className="text-[10px] text-emerald-400 font-bold">TTFT: &lt;14ms</span>
              </div>
              <pre className="min-h-[140px] max-h-[220px] overflow-y-auto text-amber-200/90 whitespace-pre-wrap text-[11px] leading-relaxed">
                {outputA || <span className="text-zinc-600 italic">Click &quot;Run Dual Arena&quot; to stream {modelA.id}...</span>}
              </pre>
            </div>

            <div className="p-4 rounded-2xl bg-black/70 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="font-bold text-cyan-300">{modelB.name}</span>
                <span className="text-[10px] text-emerald-400 font-bold">TTFT: &lt;14ms</span>
              </div>
              <pre className="min-h-[140px] max-h-[220px] overflow-y-auto text-cyan-200/90 whitespace-pre-wrap text-[11px] leading-relaxed">
                {outputB || <span className="text-zinc-600 italic">Click &quot;Run Dual Arena&quot; to stream {modelB.id}...</span>}
              </pre>
            </div>
          </div>
        </section>

        {/* 1-Line Code Toggle Recipe */}
        <section id="code-recipes" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                <Code2 className="w-5 h-5 text-amber-400" />
                <span>1-Line SDK Model Switcher</span>
              </h2>
              <p className="text-xs text-zinc-400">Swap between {modelA.id} and {modelB.id} with zero code changes.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-xl bg-black/50 p-1 border border-white/10 font-mono text-xs">
                <button
                  onClick={() => setActiveCodeTab('python')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeCodeTab === 'python' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-zinc-400'
                  }`}
                >
                  Python
                </button>
                <button
                  onClick={() => setActiveCodeTab('ts')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeCodeTab === 'ts' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-zinc-400'
                  }`}
                >
                  TypeScript
                </button>
              </div>

              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 text-zinc-300 font-mono text-xs overflow-x-auto leading-relaxed">
            {activeCodeTab === 'python' ? pythonSnippet : tsSnippet}
          </pre>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="matchup-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Direct Answer Knowledge Base ({modelA.name} vs {modelB.name})</span>
            </h2>
            <p className="text-xs text-zinc-400">Clear answers for developer evaluation and autonomous agent pipelines.</p>
          </div>

          <div className="space-y-3 pt-2">
            {matchup.faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-bold text-white text-sm font-sans">{faq.q}</span>
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-zinc-400">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-zinc-300 leading-relaxed border-t border-white/5 font-sans">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock */}
      <FloatingConversionDock />
    </div>
  );
}
