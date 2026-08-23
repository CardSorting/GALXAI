'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Trophy,
  CheckCircle2,
  Medal,
  Zap,
  ArrowRight,
  Gauge,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Flame,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import type { WorkloadBenchmarkItem } from '@/lib/data/workloadBenchmarksData';
import { WORKLOAD_BENCHMARKS_DATA } from '@/lib/data/workloadBenchmarksData';

interface WorkloadBenchmarkClientProps {
  benchmark: WorkloadBenchmarkItem;
}

export function WorkloadBenchmarkClient({ benchmark }: WorkloadBenchmarkClientProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const siblingBenchmarks = WORKLOAD_BENCHMARKS_DATA.filter(
    (b) => b.workloadSlug !== benchmark.workloadSlug
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Benchmarks', href: '/benchmarks' },
            { label: benchmark.badge },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="workload-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-amber-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <Trophy className="w-3.5 h-3.5" />
              <span>WORKLOAD LEADERBOARD • {benchmark.badge}</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Benchmark"
              title={benchmark.title}
              description={benchmark.description}
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {benchmark.headline}
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            {benchmark.description}
          </p>

          {/* Inverted Pyramid AEO Direct Answer Box */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed font-sans font-medium flex items-start gap-3">
            <Medal className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-mono text-[11px] uppercase">
                #1 Recommended Model: {benchmark.topRankedWinner}
              </strong>
              <span>{benchmark.aeoDirectAnswer}</span>
            </div>
          </div>

          {/* Target Use Cases */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-mono text-zinc-400">Target Applications:</span>
            {benchmark.targetUseCases.map((uc, idx) => (
              <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-[11px] font-mono">
                {uc}
              </span>
            ))}
          </div>
        </section>

        {/* Ranked Leaderboard Matrix */}
        <section id="ranked-leaderboard" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-4">
            <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">
              Verified Performance Rankings
            </span>
            <h2 className="text-xl font-black text-white font-mono">
              Model Performance Matrix &amp; Latency Scores
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4 font-sans">Rank</th>
                  <th className="py-3 px-4 font-sans">Model Engine</th>
                  <th className="py-3 px-4 font-sans text-cyan-300">Primary Benchmark</th>
                  <th className="py-3 px-4 font-sans text-emerald-300">Secondary Metric</th>
                  <th className="py-3 px-4 font-sans text-amber-300">TTFT / Velocity</th>
                  <th className="py-3 px-4 font-sans">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {benchmark.rankedModels.map((m) => (
                  <tr key={m.modelId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                          m.rank === 1
                            ? 'bg-amber-400 text-black'
                            : m.rank === 2
                            ? 'bg-zinc-300 text-black'
                            : 'bg-amber-700/60 text-amber-200'
                        }`}
                      >
                        {m.rank}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-sans font-bold text-white">
                      <div>{m.name}</div>
                      <span className="text-[10px] text-zinc-500 font-mono">{m.modelId}</span>
                    </td>
                    <td className="py-3.5 px-4 text-cyan-300 font-bold text-sm">
                      {m.primaryScore}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-300 font-bold">
                      {m.secondaryScore}
                    </td>
                    <td className="py-3.5 px-4 text-amber-300 font-bold">
                      {m.ttftMs > 0 ? `${m.ttftMs}ms` : 'N/A'}{' '}
                      {m.tokensPerSec > 0 && `• ${m.tokensPerSec} tok/s`}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/models/${m.modelId.replace('/', '-')}`}
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

        {/* Detailed Qualitative Winner Rationale */}
        <section id="winner-breakdown" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <span>Architectural Rationale &amp; Strengths</span>
            </h2>
            <p className="text-xs text-zinc-400">Why these specific models excel for this workload.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 font-sans text-xs">
            {benchmark.rankedModels.map((m) => (
              <div key={m.modelId} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-mono text-xs">{m.name}</span>
                  <span className="text-[10px] text-amber-400 font-bold font-mono">Rank #{m.rank}</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">{m.whyItWins}</p>
                <div className="text-[11px] text-cyan-300 font-mono font-bold pt-1 border-t border-white/5">
                  Input Rate: ${m.inputPrice1M.toFixed(2)}/1M
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="workload-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions ({benchmark.badge})</span>
            </h2>
            <p className="text-xs text-zinc-400">Evaluation methodology, accuracy metrics, and setup guidance.</p>
          </div>

          <div className="space-y-3 pt-2">
            {benchmark.faqs.map((faq, idx) => {
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

        {/* Sibling Workload Benchmarks */}
        <section id="other-benchmarks" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono">
              Explore More Workload Benchmarks
            </h2>
            <p className="text-xs text-zinc-400">Compare latency, throughput, and accuracy across other enterprise tasks.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {siblingBenchmarks.map((sb) => (
              <Link
                key={sb.workloadSlug}
                href={`/benchmarks/${sb.workloadSlug}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-amber-500/40 transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-amber-300 font-mono">
                    {sb.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-300 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                  {sb.description}
                </p>
              </Link>
            ))}
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
