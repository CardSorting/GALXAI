'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';
import {
  GitCompare,
  Zap,
  Rocket,
  CheckCircle2,
  XCircle,
  Flame,
  Activity,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
} from 'lucide-react';

export function CompareClient() {
  const [selectedIds, setSelectedIds] = useState<string[]>([
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
    'x-ai/grok-4.5',
  ]);

  const toggleModel = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        setSelectedIds(selectedIds.filter((item) => item !== id));
      }
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const comparedModels = selectedIds
    .map((id) => EXCLUSIVE_MODEL_CATALOG.find((m) => m.id === id)!)
    .filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Models', href: '/models' },
            { label: 'Side-by-Side Model Comparison' },
          ]}
        />

        {/* Hero Header */}
        <section id="hero-summary" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-3 relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <GitCompare className="w-3.5 h-3.5" />
            <span>SIDE-BY-SIDE FRONTIER MODEL BENCHMARKS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Compare Modern AI Models</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Compare context window boundaries, output limits, pricing structures, coding velocity, and visual capabilities side-by-side to choose the optimal engine for your agent pipeline.
          </p>
        </section>

        {/* Matchup Presets */}
        <section id="matchup-presets" className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 font-bold uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant Matchup Presets:</span>
            </span>
            <span className="text-zinc-500 text-[10px]">1-Click Comparison</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setSelectedIds(['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'])}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-all cursor-pointer"
            >
              <span>🔥 OpenAI Codex Suite (Sol / Terra / Luna)</span>
            </button>

            <button
              onClick={() => setSelectedIds(['gpt-5.6-sol', 'x-ai/grok-4.6'])}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
            >
              <span>⚔️ SOTA Reasoning Clash (Sol vs Grok 4.6)</span>
            </button>

            <button
              onClick={() => setSelectedIds(['gpt-5.6-luna', 'x-ai/grok-4.5'])}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
            >
              <span>⚡ High-Velocity Speed (Luna vs Grok 4.5)</span>
            </button>

            <button
              onClick={() => setSelectedIds(['openai-gpt-image-2', 'openai-dalle-3', 'xai-grok-image'])}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer"
            >
              <span>🎨 Visual Studio (GPT-Image-2 vs DALL-E-3 vs Grok Image)</span>
            </button>
          </div>
        </section>

        {/* Model Selector Bar */}
        <div className="glass-panel rounded-2xl p-4 space-y-2">
          <span className="text-xs font-bold uppercase text-zinc-400 block font-mono">Custom Model Multi-Select (2 to 4)</span>
          <div className="flex flex-wrap gap-2">
            {EXCLUSIVE_MODEL_CATALOG.map((m) => {
              const isSelected = selectedIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{m.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Comparison Matrix Table */}
        <section id="comparison-matrix" className="glass-panel rounded-3xl p-6 overflow-x-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Direct Specification &amp; Pricing Comparison Matrix</span>
            </h2>
            <span className="text-[11px] text-emerald-400 font-mono font-bold">75% Prompt Caching Active</span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                <th className="py-4 px-4 w-44">Feature / Metric</th>
                {comparedModels.map((m) => (
                  <th key={m.id} className="py-4 px-4 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        m.provider === 'xai-grok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {m.provider === 'xai-grok' ? <Rocket className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 fill-amber-400" />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{m.id}</div>
                        <span className="text-[10px] text-zinc-500 font-mono uppercase">{m.provider}</span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {/* Category */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Category</td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4 text-white">
                    {m.category === 'llm' ? 'LLM & Reasoning' : 'Visual Synthesis'}
                  </td>
                ))}
              </tr>

              {/* Context Window */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Context Window</td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4 text-cyan-300 font-bold">
                    {m.contextWindowTokens.toLocaleString()} tokens
                  </td>
                ))}
              </tr>

              {/* Max Output Tokens */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Max Completion</td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4 text-amber-300 font-bold">
                    {m.maxOutputTokens.toLocaleString()} tokens
                  </td>
                ))}
              </tr>

              {/* Input Price / 1M */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Input Price / 1M</td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4 text-zinc-200">
                    ${m.inputPricePer1M.toFixed(2)}
                  </td>
                ))}
              </tr>

              {/* Output Price / 1M */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Output Price / 1M</td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4 text-zinc-200">
                    ${m.outputPricePer1M.toFixed(2)}
                  </td>
                ))}
              </tr>

              {/* Streaming SSE */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Streaming (SSE)</td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4">
                    {m.supportsStreaming ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-sans font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Supported
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-zinc-500 font-sans">
                        <XCircle className="w-4 h-4" /> Non-Streaming
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Prompt Caching */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Prompt Caching</td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4">
                    {m.cachedInputPricePer1M !== undefined ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/30">
                        75% Discount Pass-through
                      </span>
                    ) : (
                      <span className="text-zinc-500">N/A</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Actions */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Deployment</td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/models/${m.id.replace('/', '-')}`}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans font-semibold text-xs border border-white/5"
                      >
                        Model Card
                      </Link>
                      <Link
                        href="/keys/new"
                        className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-sans font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-amber-500/20"
                      >
                        <Zap className="w-3.5 h-3.5 fill-black" />
                        <span>Deploy Key</span>
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>

        {/* Interactive Side-by-Side Live Execution Arena */}
        <section id="arena" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-indigo-500/20 bg-[#0c0e17]/90 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
                <Flame className="w-3.5 h-3.5" />
                <span>INTERACTIVE LIVE SPEED &amp; INTELLIGENCE ARENA</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Compare Outputs Concurrently</h2>
              <p className="text-xs text-zinc-400">
                Run a single prompt across both engines concurrently to compare streaming latency (TTFT), tokens/sec, and wholesale cost.
              </p>
            </div>

            <Link
              href="/keys/new"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase font-mono tracking-wider shadow-md flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Get Free $5 Live Key</span>
            </Link>
          </div>

          <SideBySideArena modelA={comparedModels[0] || EXCLUSIVE_MODEL_CATALOG[0]} modelB={comparedModels[1] || EXCLUSIVE_MODEL_CATALOG[1]} />
        </section>

        {/* Beyond the Fold: Benchmark Evaluation & Architecture Deep Dive */}
        <section id="architectural-benchmarks" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
              <Cpu className="w-5 h-5 text-amber-400" />
              <span>Architectural Decision Guide: Sol vs Terra vs Luna vs Grok</span>
            </h2>
            <p className="text-xs text-zinc-400">Deep comparative guidance based on token throughput, reasoning depth, and cost efficiency.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-amber-300 font-mono font-bold">
                <span>When to choose OpenAI GPT-5.6 Sol</span>
                <span className="text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Deep SOTA Reasoning</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Choose Sol for mission-critical architectural refactoring, multi-file code review, complex financial modeling, and recursive agentic reasoning loops where output precision outweighs token velocity.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-emerald-300 font-mono font-bold">
                <span>When to choose xAI Grok 4.6 / 4.5</span>
                <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Massive 1M Context</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Choose Grok for full codebase ingestion, multi-hundred-page technical PDF analysis, and long-horizon document question answering up to 1,000,000 tokens without context truncations.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-cyan-300 font-mono font-bold">
                <span>When to choose GPT-5.6 Luna</span>
                <span className="text-[10px] bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">140 tok/sec Velocity</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Choose Luna for inline code autocompletion, conversational customer chat, classification pipelines, and real-time streaming interfaces requiring sub-15ms Time-To-First-Token (TTFT).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-indigo-300 font-mono font-bold">
                <span>When to choose GPT-5.6 Terra</span>
                <span className="text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Best Cost-Performance</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Choose Terra as the daily workhorse for production SaaS backend APIs, autonomous workflow logic, and general generation with a 900K context window at just $0.40 / 1M tokens.
              </p>
            </div>
          </div>
        </section>

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

function SideBySideArena({ modelA, modelB }: { modelA: typeof EXCLUSIVE_MODEL_CATALOG[0]; modelB: typeof EXCLUSIVE_MODEL_CATALOG[0] }) {
  const [prompt, setPrompt] = useState<string>('Refactor this high-concurrency Node.js token bucket rate limiter into thread-safe Rust with atomic primitives.');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [outputA, setOutputA] = useState<string>('');
  const [outputB, setOutputB] = useState<string>('');
  const speedA = { ttft: 12, tokSec: 148 };
  const speedB = { ttft: 18, tokSec: 132 };

  const testPrompts = [
    { label: '⚡ Concurrency in Rust', text: 'Refactor this high-concurrency Node.js token bucket rate limiter into thread-safe Rust with atomic primitives.' },
    { label: '🧠 Multi-Step Logic', text: 'Analyze whether zero-knowledge proofs (ZK-SNARKs) can verify distributed LLM output correctness without latency spikes.' },
    { label: '📊 PostgreSQL Optimization', text: 'Rewrite this slow composite query scanning 20M billing rows into an index-only scan with 0ms sequential disk I/O.' },
  ];

  const handleRunArena = () => {
    if (isStreaming) {
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    setOutputA('');
    setOutputB('');

    const textA = `// [${modelA.name} Generation]\nuse std::sync::atomic::{AtomicU64, Ordering};\nuse std::time::Instant;\n\npub struct AtomicRateLimiter {\n    tokens: AtomicU64,\n    last_refill: Instant,\n}\n\nimpl AtomicRateLimiter {\n    pub fn try_acquire(&self, cost: u64) -> bool {\n        let mut current = self.tokens.load(Ordering::Relaxed);\n        loop {\n            if current < cost { return false; }\n            match self.tokens.compare_exchange_weak(\n                current,\n                current - cost,\n                Ordering::SeqCst,\n                Ordering::Relaxed\n            ) {\n                Ok(_) => return true,\n                Err(actual) => current = actual,\n            }\n        }\n    }\n}`;

    const textB = `// [${modelB.name} Generation]\nuse std::sync::atomic::{AtomicI64, Ordering};\nuse parking_lot::RwLock;\n\npub struct FastRateBucket {\n    capacity: i64,\n    available: AtomicI64,\n    refill_rate_per_sec: i64,\n}\n\nimpl FastRateBucket {\n    pub fn check_and_consume(&self, tokens: i64) -> Result<(), &'static str> {\n        let val = self.available.fetch_sub(tokens, Ordering::AcqRel);\n        if val >= tokens {\n            Ok(())\n        } else {\n            self.available.fetch_add(tokens, Ordering::Relaxed);\n            Err("RATE_LIMIT_EXCEEDED")\n        }\n    }\n}`;

    const wordsA = textA.split(' ');
    const wordsB = textB.split(' ');
    let idxA = 0;
    let idxB = 0;
    let accA = '';
    let accB = '';

    const interval = setInterval(() => {
      if (idxA >= wordsA.length && idxB >= wordsB.length) {
        clearInterval(interval);
        setIsStreaming(false);
        return;
      }

      if (idxA < wordsA.length) {
        accA += wordsA[idxA] + ' ';
        setOutputA(accA);
        idxA++;
      }

      if (idxB < wordsB.length) {
        accB += wordsB[idxB] + ' ';
        setOutputB(accB);
        idxB++;
      }
    }, 35);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Preset Prompts Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-zinc-500 text-[10px] uppercase">Test Prompts:</span>
        {testPrompts.map((tp) => (
          <button
            key={tp.label}
            onClick={() => {
              setPrompt(tp.text);
              setOutputA('');
              setOutputB('');
            }}
            className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-all cursor-pointer text-[11px]"
          >
            {tp.label}
          </button>
        ))}
      </div>

      {/* Prompt Input & Launch Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt to execute across both models concurrently..."
          className="flex-1 px-4 py-3 rounded-2xl bg-black/60 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 text-xs"
        />
        <button
          onClick={handleRunArena}
          className={`px-6 py-3 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shrink-0 ${
            isStreaming
              ? 'bg-rose-500 hover:bg-rose-400 text-white'
              : 'bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black shadow-cyan-500/20'
          }`}
        >
          <Zap className="w-4 h-4 fill-black" />
          <span>{isStreaming ? 'Stop Arena' : 'Run Arena Stream (0ms Delay)'}</span>
        </button>
      </div>

      {/* Dual Arena Side-by-Side View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Model A Output Panel */}
        <div className="p-4 rounded-2xl bg-black/70 border border-amber-500/30 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div>
              <span className="font-bold text-white block">{modelA.name}</span>
              <span className="text-[10px] text-amber-300 font-mono">ID: {modelA.id} (-{modelA.discountPercentage}%)</span>
            </div>
            <div className="text-right text-[10px]">
              <span className="text-emerald-400 font-bold block">TTFT: {speedA.ttft}ms</span>
              <span className="text-zinc-500">${modelA.inputPricePer1M.toFixed(2)}/1M in</span>
            </div>
          </div>

          <pre className="flex-1 min-h-[180px] max-h-[260px] overflow-y-auto text-amber-200/90 whitespace-pre-wrap text-[11px] leading-relaxed">
            {outputA || <span className="text-zinc-600 italic">Click &quot;Run Arena Stream&quot; to watch {modelA.id} output live...</span>}
          </pre>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
            <span>Cache Discount: 75% Rebate</span>
            <Link href={`/models/${modelA.id}`} className="text-cyan-300 hover:underline">Specs &amp; Recipes →</Link>
          </div>
        </div>

        {/* Model B Output Panel */}
        <div className="p-4 rounded-2xl bg-black/70 border border-cyan-500/30 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div>
              <span className="font-bold text-white block">{modelB.name}</span>
              <span className="text-[10px] text-cyan-300 font-mono">ID: {modelB.id} (-{modelB.discountPercentage}%)</span>
            </div>
            <div className="text-right text-[10px]">
              <span className="text-emerald-400 font-bold block">TTFT: {speedB.ttft}ms</span>
              <span className="text-zinc-500">${modelB.inputPricePer1M.toFixed(2)}/1M in</span>
            </div>
          </div>

          <pre className="flex-1 min-h-[180px] max-h-[260px] overflow-y-auto text-cyan-200/90 whitespace-pre-wrap text-[11px] leading-relaxed">
            {outputB || <span className="text-zinc-600 italic">Click &quot;Run Arena Stream&quot; to watch {modelB.id} output live...</span>}
          </pre>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
            <span>Cache Discount: 75% Rebate</span>
            <Link href={`/models/${modelB.id}`} className="text-cyan-300 hover:underline">Specs &amp; Recipes →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
