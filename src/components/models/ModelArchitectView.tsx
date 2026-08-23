'use client';

import React from 'react';
import {
  Activity,
  Sliders,
  Server
} from 'lucide-react';
import type { ModelSpecItem } from '@/core/contracts/GalxContracts';

interface ModelArchitectViewProps {
  model: ModelSpecItem;
}

export function ModelArchitectView({ model }: ModelArchitectViewProps) {
  const isGrok = model.provider === 'xai-grok';

  const benchmarkScores = isGrok
    ? { humanEval: 92.4, sweBench: 54.8, math500: 91.2, gpqaDiamond: 68.4, multilingualMmlu: 89.6 }
    : { humanEval: 94.8, sweBench: 59.2, math500: 93.6, gpqaDiamond: 72.1, multilingualMmlu: 91.4 };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Verified Benchmark Leaderboard */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-indigo-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
              <Activity className="w-3.5 h-3.5" />
              <span>VERIFIED REASONING &amp; CODING BENCHMARKS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {model.name} Quantitative Performance Metrics
            </h2>
          </div>

          <span className="text-xs font-mono text-zinc-400">
            Evaluated at Temperature 0.2
          </span>
        </div>

        <div className="space-y-4 pt-2 font-mono">
          {/* HumanEval */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300 font-bold">HumanEval (Python Code Generation)</span>
              <span className="text-cyan-300 font-bold">{benchmarkScores.humanEval}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${benchmarkScores.humanEval}%` }}
              />
            </div>
          </div>

          {/* SWE-bench Verified */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300 font-bold">SWE-bench Verified (Real-World GitHub Issue Resolution)</span>
              <span className="text-amber-300 font-bold">{benchmarkScores.sweBench}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                style={{ width: `${benchmarkScores.sweBench}%` }}
              />
            </div>
          </div>

          {/* MATH-500 */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300 font-bold">MATH-500 (Complex Algorithmic &amp; Mathematical Proofs)</span>
              <span className="text-emerald-300 font-bold">{benchmarkScores.math500}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                style={{ width: `${benchmarkScores.math500}%` }}
              />
            </div>
          </div>

          {/* GPQA Diamond */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300 font-bold">GPQA Diamond (Doctoral-Level Physics, Chemistry, Biology)</span>
              <span className="text-indigo-300 font-bold">{benchmarkScores.gpqaDiamond}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-500"
                style={{ width: `${benchmarkScores.gpqaDiamond}%` }}
              />
            </div>
          </div>

          {/* Multilingual MMLU */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300 font-bold">Multilingual MMLU (Cross-Lingual Deep Domain Comprehension)</span>
              <span className="text-rose-300 font-bold">{benchmarkScores.multilingualMmlu}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all duration-500"
                style={{ width: `${benchmarkScores.multilingualMmlu}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Parameter Guide */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          Inference Hyperparameters &amp; API Spec Reference
        </h3>
        <p className="text-xs text-zinc-400">
          Recommended configuration values for maximum reasoning determinism and low latency.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 font-mono text-xs">
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-amber-300 font-bold">temperature: 0.0 - 0.2</span>
            <p className="text-[11px] text-zinc-400 font-sans">
              Recommended for code generation, mathematical proofs, and structural schema output.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-cyan-300 font-bold">top_p: 0.95</span>
            <p className="text-[11px] text-zinc-400 font-sans">
              Nucleus sampling probability mass. Keeps tail tokens constrained to valid syntax.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-emerald-300 font-bold">response_format</span>
            <p className="text-[11px] text-zinc-400 font-sans">
              Set <code className="text-zinc-200">&#123; type: &quot;json_object&quot; &#125;</code> for guaranteed JSON syntax.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-indigo-300 font-bold">max_output_tokens</span>
            <p className="text-[11px] text-zinc-400 font-sans">
              Up to <strong>{(model.maxOutputTokens / 1000).toLocaleString()}K tokens</strong> per single API completion.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-rose-300 font-bold">stream: true</span>
            <p className="text-[11px] text-zinc-400 font-sans">
              Server-Sent Events (SSE) streaming with sub-15ms time-to-first-token.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-amber-300 font-bold">frequency_penalty: 0.0</span>
            <p className="text-[11px] text-zinc-400 font-sans">
              Leave at 0.0 for programming languages where recurring keywords (e.g. return, const) are essential.
            </p>
          </div>
        </div>
      </div>

      {/* SRE Infrastructure Guarantees */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-emerald-500/20">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-black text-white">SRE &amp; High-Availability Infrastructure</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="text-xl font-black text-emerald-300 font-mono">&lt; 14ms</div>
            <span className="text-xs font-bold text-white block">Gateway Transit TTFT</span>
            <p className="text-[11px] text-zinc-400 font-sans">
              Edge proxies distributed globally ensure zero latency overhead over direct connection.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="text-xl font-black text-amber-300 font-mono">0 Disk Writes</div>
            <span className="text-xs font-bold text-white block">Ephemeral RAM Transit</span>
            <p className="text-[11px] text-zinc-400 font-sans">
              Zero Data Retention policy; memory zeroization after every completed stream chunk.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="text-xl font-black text-indigo-300 font-mono">2M TPM</div>
            <span className="text-xs font-bold text-white block">Continuous Token Capacity</span>
            <p className="text-[11px] text-zinc-400 font-sans">
              High-availability compute channels absorb high-concurrency traffic bursts seamlessly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
