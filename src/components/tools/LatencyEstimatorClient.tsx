'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Gauge,
  Zap,
  Globe,
  Activity,
  Copy,
  Check,
  ArrowRight,
  HelpCircle,
  Clock,
  Radio,
  Server,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface ModelLatencyProfile {
  name: string;
  id: string;
  prefillMsPer1k: number; // Prefill processing time per 1k input tokens
  tokPerSec: number;     // Token generation throughput
  baseTlsHandshakeMs: number;
}

const MODELS: ModelLatencyProfile[] = [
  { name: 'OpenAI GPT-5.6 Luna', id: 'gpt-5.6-luna', prefillMsPer1k: 2.2, tokPerSec: 145, baseTlsHandshakeMs: 4 },
  { name: 'OpenAI GPT-5.6 Terra', id: 'gpt-5.6-terra', prefillMsPer1k: 3.8, tokPerSec: 92, baseTlsHandshakeMs: 5 },
  { name: 'OpenAI GPT-5.6 Sol', id: 'gpt-5.6-sol', prefillMsPer1k: 5.5, tokPerSec: 68, baseTlsHandshakeMs: 6 },
  { name: 'xAI Grok 4.5', id: 'x-ai/grok-4.5', prefillMsPer1k: 4.1, tokPerSec: 110, baseTlsHandshakeMs: 5 },
  { name: 'xAI Grok 4.6 (1M)', id: 'x-ai/grok-4.6', prefillMsPer1k: 6.2, tokPerSec: 75, baseTlsHandshakeMs: 6 },
];

interface RegionLatency {
  name: string;
  id: string;
  anycastEdgeRttMs: number;
  originRttMs: number;
}

const REGIONS: RegionLatency[] = [
  { name: 'North America (US-East / US-West)', id: 'us', anycastEdgeRttMs: 8, originRttMs: 45 },
  { name: 'Europe (Frankfurt / London / Dublin)', id: 'eu', anycastEdgeRttMs: 12, originRttMs: 115 },
  { name: 'Asia Pacific (Tokyo / Singapore / Sydney)', id: 'apac', anycastEdgeRttMs: 15, originRttMs: 175 },
  { name: 'South America (São Paulo)', id: 'sa', anycastEdgeRttMs: 18, originRttMs: 160 },
];

export function LatencyEstimatorClient() {
  const [promptTokens, setPromptTokens] = useState<number>(2500);
  const [completionTokens, setCompletionTokens] = useState<number>(400);
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-5.6-luna');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('eu');
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const model = MODELS.find((m) => m.id === selectedModelId) || MODELS[0];
  const region = REGIONS.find((r) => r.id === selectedRegionId) || REGIONS[1];

  // Latency Calculations: Anycast vs Origin
  const anycastHandshake = region.anycastEdgeRttMs + model.baseTlsHandshakeMs;
  const originHandshake = region.originRttMs + model.baseTlsHandshakeMs;

  const prefillTimeMs = Math.round((promptTokens / 1000) * model.prefillMsPer1k);
  const generationTimeMs = Math.round((completionTokens / model.tokPerSec) * 1000);

  const anycastTtft = anycastHandshake + prefillTimeMs;
  const originTtft = originHandshake + prefillTimeMs;

  const anycastTotalDuration = anycastTtft + generationTimeMs;
  const originTotalDuration = originTtft + generationTimeMs;

  const ttftReductionMs = originTtft - anycastTtft;
  const ttftImprovementPct = Math.round((ttftReductionMs / originTtft) * 100);

  const pythonSnippet = `from openai import OpenAI
import time

# Benchmark sub-15ms Anycast streaming on GALXAI
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

t0 = time.perf_counter()
stream = client.chat.completions.create(
    model="${model.id}",
    messages=[{"role": "user", "content": "Execute low-latency streaming benchmark"}],
    stream=True
)

first_token = True
for chunk in stream:
    if first_token:
        ttft = (time.perf_counter() - t0) * 1000
        print(f"Time To First Token (TTFT): {ttft:.1f}ms")
        first_token = False
    print(chunk.choices[0].delta.content or "", end="", flush=True)`;

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(pythonSnippet);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Tools', href: '/calculator' },
            { label: 'Latency & TTFT Estimator' },
          ]}
        />

        {/* Hero Section */}
        <section id="tool-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-amber-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <Gauge className="w-3.5 h-3.5" />
              <span>TIME-TO-FIRST-TOKEN (TTFT) &amp; STREAMING LATENCY SIMULATOR</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Tool"
              title="AI Latency & TTFT Estimator — GALXAI Tools"
              description="Calculate Time-To-First-Token and streaming duration across Anycast Edge vs Single-Origin routing."
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              AI Latency &amp; Time-To-First-Token (TTFT) Estimator
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 max-w-3xl leading-relaxed font-sans">
              Accurately model end-to-end streaming latency, TLS handshake overhead, prefill computation, and token velocity. Discover how <strong className="text-amber-300">Anycast edge termination</strong> slashes TTFT by up to <strong className="text-emerald-300">80% worldwide</strong>.
            </p>
          </div>
        </section>

        {/* AEO BLUF Direct Answer */}
        <section id="aeo-direct-answer" className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/30 bg-emerald-500/5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Direct Answer: How Does Anycast Routing Reduce AI Latency?</span>
          </div>
          <p className="text-sm sm:text-base text-white leading-relaxed font-sans">
            <strong>Time-To-First-Token (TTFT)</strong> is dominated by TCP/TLS network round-trips plus model prefill processing. Traditional origin routing forces global clients to incur 120ms–180ms cross-continental round-trips before the model begins computing. GALXAI Anycast edge nodes terminate TLS connections in <strong>&lt;15ms locally</strong>, pre-warming connections to upstream compute clusters and reducing end-to-end TTFT by <strong>40ms to 120ms per request</strong>.
          </p>
        </section>

        {/* Simulator Grid */}
        <section id="interactive-simulator" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Sliders */}
            <div className="lg:col-span-1 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase block">
                  Select Frontier Model
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  aria-label="Select Frontier Model"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                >
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.tokPerSec} tok/s)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase block">
                  Client Geographic Region
                </label>
                <select
                  value={selectedRegionId}
                  onChange={(e) => setSelectedRegionId(e.target.value)}
                  aria-label="Client Geographic Region"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                >
                  {REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <label htmlFor="prompt-slider" className="font-bold text-zinc-300 uppercase">Prompt Tokens (Prefill)</label>
                  <span className="text-amber-300 font-bold">{promptTokens.toLocaleString()} Tokens</span>
                </div>
                <input
                  id="prompt-slider"
                  type="range"
                  min="100"
                  max="50000"
                  step="500"
                  value={promptTokens}
                  onChange={(e) => setPromptTokens(Number(e.target.value))}
                  aria-label="Prompt Tokens Slider"
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <label htmlFor="completion-slider" className="font-bold text-zinc-300 uppercase">Completion Tokens</label>
                  <span className="text-cyan-300 font-bold">{completionTokens.toLocaleString()} Tokens</span>
                </div>
                <input
                  id="completion-slider"
                  type="range"
                  min="50"
                  max="4000"
                  step="50"
                  value={completionTokens}
                  onChange={(e) => setCompletionTokens(Number(e.target.value))}
                  aria-label="Completion Tokens Slider"
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Visual Timeline & Comparison */}
            <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
              {/* Dual TTFT Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                {/* Anycast Result */}
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 uppercase text-[11px]">GALXAI Anycast Edge</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      -{ttftImprovementPct}% Faster TTFT
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {anycastTtft} ms <span className="text-xs text-zinc-400 font-sans font-normal">TTFT</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans">
                      Total stream duration: <strong>{anycastTotalDuration} ms</strong> (~{(anycastTotalDuration / 1000).toFixed(2)}s)
                    </p>
                  </div>
                </div>

                {/* Legacy Origin Result */}
                <div className="p-5 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-400 uppercase text-[11px]">Direct Single-Origin</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                      +{ttftReductionMs} ms Penalty
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-2xl sm:text-3xl font-black text-zinc-300 font-mono">
                      {originTtft} ms <span className="text-xs text-zinc-500 font-sans font-normal">TTFT</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-sans">
                      Total stream duration: <strong>{originTotalDuration} ms</strong> (~{(originTotalDuration / 1000).toFixed(2)}s)
                    </p>
                  </div>
                </div>
              </div>

              {/* Streaming Timeline Stages */}
              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4">
                <span className="text-xs font-mono font-bold text-zinc-300 uppercase block">
                  Latency Breakdown by Request Lifecycle Phase
                </span>

                <div className="space-y-3 font-mono text-xs">
                  {/* Phase 1: TLS Handshake */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>1. Edge TLS Handshake</span>
                      <span className="text-emerald-400 font-bold">{anycastHandshake}ms (Anycast) vs {originHandshake}ms (Origin)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${Math.max(5, (anycastHandshake / anycastTotalDuration) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Phase 2: Prefill Computation */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>2. Model KV Cache &amp; Prefill ({promptTokens.toLocaleString()} tokens)</span>
                      <span className="text-amber-300 font-bold">{prefillTimeMs}ms</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${Math.max(5, (prefillTimeMs / anycastTotalDuration) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Phase 3: Token Streaming */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>3. Token Generation ({completionTokens} tokens @ {model.tokPerSec} tok/s)</span>
                      <span className="text-cyan-300 font-bold">{generationTimeMs}ms</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                      <div className="h-full bg-cyan-400" style={{ width: `${Math.max(10, (generationTimeMs / anycastTotalDuration) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Code Snippet for Latency Benchmarking */}
        <section id="code-snippet" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Python TTFT &amp; Streaming Latency Benchmark Script</span>
              </h2>
              <p className="text-xs text-zinc-400">Measure Time-To-First-Token in microsecond precision.</p>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 text-zinc-300 font-mono text-xs overflow-x-auto leading-relaxed">
            {pythonSnippet}
          </pre>
        </section>

        {/* FAQs for AEO */}
        <section id="faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2 border-b border-white/10 pb-3">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Frequently Asked Questions — AI Latency &amp; TTFT Optimization</span>
          </h2>

          <div className="space-y-3 pt-2">
            {[
              {
                q: 'What is the fastest model for streaming completions on GALXAI?',
                a: 'OpenAI GPT-5.6 Luna is our fastest streaming engine, delivering sub-12ms Time-To-First-Token (TTFT) and sustained throughput exceeding 145 tokens/second.',
              },
              {
                q: 'How does prompt size affect TTFT latency?',
                a: 'Every 1,000 prompt tokens require 2ms–6ms of GPU prefill computation. For massive prompts (e.g. 50,000+ tokens), prompt caching cuts prefill time by over 70% by keeping attention matrices warm in GPU memory.',
              },
              {
                q: 'What makes GALXAI Anycast edge routing faster than direct provider APIs?',
                a: 'GALXAI terminates TCP and TLS handshakes at distributed Anycast points-of-presence worldwide in <15ms, maintaining persistent HTTP/2 and HTTP/3 multiplexed tunnels to upstream provider clusters.',
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02]"
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

        <TrustSeals />
      </main>

      <FloatingConversionDock />
    </div>
  );
}
