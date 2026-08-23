'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Activity,
  Zap,
  Gauge,
  Flame,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Radio,
  Clock,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { BENCHMARKS_DATA, BENCHMARK_FAQS, type ModelBenchmarkItem } from '@/lib/data/benchmarksData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export function BenchmarksClient() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'ttft' | 'tokens' | 'price'>('ttft');
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Streaming Race Simulator State
  const [isRacing, setIsRacing] = useState(false);
  const [raceProgress, setRaceProgress] = useState<{ [key: string]: number }>({});

  const filteredData = useMemo(() => {
    return BENCHMARKS_DATA.filter((item) => {
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'openai') return item.provider === 'OpenAI';
      if (selectedCategory === 'xai') return item.provider === 'xAI';
      return true;
    }).sort((a, b) => {
      if (sortBy === 'ttft') return a.avgTtftMs - b.avgTtftMs;
      if (sortBy === 'tokens') return b.tokensPerSec - a.tokensPerSec;
      if (sortBy === 'price') return a.inputPricePer1M - b.inputPricePer1M;
      return 0;
    });
  }, [selectedCategory, sortBy]);

  const handleCopyCitation = async () => {
    const citation = `GALXAI Universal AI Gateway: Real-Time LLM Latency & Throughput Benchmark Leaderboard (Sub-15ms Anycast TTFT, 75% Prompt Caching Rebates). Source: https://galx.ai/benchmarks`;
    const ok = await safeCopyToClipboard(citation);
    if (ok) {
      setCopiedCitation(true);
      setTimeout(() => setCopiedCitation(false), 2000);
    }
  };

  const startRace = () => {
    if (isRacing) return;
    setIsRacing(true);
    setRaceProgress({});

    const initial: { [key: string]: number } = {};
    BENCHMARKS_DATA.filter((m) => m.tokensPerSec > 0).forEach((m) => {
      initial[m.modelId] = 0;
    });
    setRaceProgress(initial);

    const interval = setInterval(() => {
      setRaceProgress((prev) => {
        let allDone = true;
        const next: { [key: string]: number } = { ...prev };

        BENCHMARKS_DATA.filter((m) => m.tokensPerSec > 0).forEach((m) => {
          const inc = (m.tokensPerSec / 20) * (0.85 + Math.random() * 0.3);
          const current = (prev[m.modelId] || 0) + inc;
          if (current < 100) {
            next[m.modelId] = current;
            allDone = false;
          } else {
            next[m.modelId] = 100;
          }
        });

        if (allDone) {
          clearInterval(interval);
          setIsRacing(false);
        }
        return next;
      });
    }, 50);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs items={[{ label: 'Benchmarks & Latency Leaderboard' }]} />

        {/* Hero Header */}
        <section id="benchmark-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Activity className="w-3.5 h-3.5" />
              <span>GLOBAL ANYCAST TELEMETRY LEADERBOARD</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCitation}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedCitation ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCitation ? 'Citation Copied' : 'Cite Telemetry'}</span>
              </button>
              <ShareButton
                variant="pill"
                label="Share"
                title="GALXAI LLM Latency & Throughput Benchmark Leaderboard"
                description="Live Time-To-First-Token, tokens/sec throughput, and prompt cache hit latency across GPT-5.6 and Grok."
              />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Real-Time LLM Latency &amp; Speed Leaderboard
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            Authoritative, end-to-end telemetry measuring Time-To-First-Token (TTFT), generation velocity (tokens/second), and prompt caching acceleration across OpenAI Codex and xAI Grok on the GALXAI Anycast edge.
          </p>

          {/* Inverted Pyramid AEO Quick Summary */}
          <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-xs leading-relaxed font-sans font-medium">
            <strong>Key Finding:</strong> GPT-5.6 Luna achieves the fastest raw speed (11.8ms TTFT, 145.2 tok/s), while warm prompt cache hits reduce TTFT to 6.4ms–7.8ms across all models with a 75% token cost reduction.
          </div>
        </section>

        {/* Live Multi-Model Streaming Race */}
        <section id="streaming-race" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-indigo-500/20 bg-[#0c0e17]/90 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-400 uppercase">
                <Gauge className="w-3.5 h-3.5" />
                <span>INTERACTIVE SPEED SIMULATION</span>
              </div>
              <h2 className="text-xl font-black text-white">Live Generation Velocity Race (100 Tokens)</h2>
            </div>

            <button
              onClick={startRace}
              disabled={isRacing}
              className={`px-5 py-2.5 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg font-mono ${
                isRacing
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black shadow-cyan-500/20'
              }`}
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>{isRacing ? 'Racing...' : 'Launch Live Race'}</span>
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {BENCHMARKS_DATA.filter((m) => m.tokensPerSec > 0).map((model) => {
              const progress = raceProgress[model.modelId] || 0;
              return (
                <div key={model.modelId} className="space-y-1.5 p-3 rounded-2xl bg-black/50 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{model.name}</span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-emerald-400 font-bold">{model.tokensPerSec} tok/s</span>
                      <span className="text-zinc-400">TTFT: {model.avgTtftMs}ms</span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 transition-all duration-75 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Telemetry Leaderboard Table */}
        <section id="leaderboard-table" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white font-mono flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Verified Gateway Telemetry Matrix</span>
              </h2>
              <p className="text-xs text-zinc-400">Sorted by live Anycast edge response benchmarks.</p>
            </div>

            {/* Filter & Sort Controls */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <div className="flex rounded-xl bg-black/50 p-1 border border-white/10">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedCategory === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-zinc-400'
                  }`}
                >
                  All Providers
                </button>
                <button
                  onClick={() => setSelectedCategory('openai')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedCategory === 'openai' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-zinc-400'
                  }`}
                >
                  OpenAI
                </button>
                <button
                  onClick={() => setSelectedCategory('xai')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedCategory === 'xai' ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-zinc-400'
                  }`}
                >
                  xAI
                </button>
              </div>

              <div className="flex rounded-xl bg-black/50 p-1 border border-white/10">
                <button
                  onClick={() => setSortBy('ttft')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    sortBy === 'ttft' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-zinc-400'
                  }`}
                >
                  Lowest TTFT
                </button>
                <button
                  onClick={() => setSortBy('tokens')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    sortBy === 'tokens' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-zinc-400'
                  }`}
                >
                  Highest Tok/s
                </button>
                <button
                  onClick={() => setSortBy('price')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    sortBy === 'price' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-zinc-400'
                  }`}
                >
                  Lowest Price
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4 font-sans">Model Engine</th>
                  <th className="py-3 px-4 font-sans">Architecture Tier</th>
                  <th className="py-3 px-4 font-sans text-cyan-300">Avg TTFT</th>
                  <th className="py-3 px-4 font-sans text-emerald-300">Cache Hit TTFT</th>
                  <th className="py-3 px-4 font-sans text-amber-300">Velocity</th>
                  <th className="py-3 px-4 font-sans">Input / 1M</th>
                  <th className="py-3 px-4 font-sans">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredData.map((item) => (
                  <tr key={item.modelId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-sans font-bold text-white">
                      <div>{item.name}</div>
                      <span className="text-[10px] text-zinc-500 font-mono">{item.modelId}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-zinc-300">
                        {item.architectureTier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-cyan-300 font-bold text-sm">
                      {item.avgTtftMs > 0 ? `${item.avgTtftMs.toFixed(1)}ms` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-300 font-bold">
                      {item.cacheHitTtftMs > 0 ? `${item.cacheHitTtftMs.toFixed(1)}ms (-55%)` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-amber-300 font-bold">
                      {item.tokensPerSec > 0 ? `${item.tokensPerSec.toFixed(1)} tok/s` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300">
                      ${item.inputPricePer1M.toFixed(item.inputPricePer1M < 0.1 ? 3 : 2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/models/${item.modelId.replace('/', '-')}`}
                        className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-sans text-xs font-semibold inline-flex items-center gap-1 transition-all"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="benchmark-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Direct Answer Benchmark Knowledge Base</span>
            </h2>
            <p className="text-xs text-zinc-400">Telemetry methodology, TTFT measurement, and Anycast architecture.</p>
          </div>

          <div className="space-y-3 pt-2">
            {BENCHMARK_FAQS.map((faq, idx) => {
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
