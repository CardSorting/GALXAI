'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import {
  GitCompare,
  Zap,
  Rocket,
  CheckCircle2,
  XCircle,
  Sparkles,
  Terminal,
  ArrowRight,
  Cpu,
  Layers
} from 'lucide-react';

export default function CompareModelsPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
    'x-ai/grok-4.5'
  ]);

  const toggleModel = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        setSelectedIds(selectedIds.filter(item => item !== id));
      }
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const comparedModels = selectedIds.map(id =>
    EXCLUSIVE_MODEL_CATALOG.find(m => m.id === id)!
  ).filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Models', href: '/models' },
            { label: 'Side-by-Side Model Comparison' }
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-3 relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <GitCompare className="w-3.5 h-3.5" />
            <span>SIDE-BY-SIDE FRONTIER MODEL BENCHMARKS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Compare Modern AI Models</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Compare context window boundaries, output limits, pricing structures, coding velocity, and visual capabilities side-by-side to choose the optimal engine for your agent pipeline.
          </p>
        </div>

        {/* Model Selector Bar */}
        <div className="glass-panel rounded-2xl p-4 space-y-2">
          <span className="text-xs font-bold uppercase text-zinc-400 block">Select Models to Compare (2 to 4)</span>
          <div className="flex flex-wrap gap-2">
            {EXCLUSIVE_MODEL_CATALOG.map((m) => {
              const isSelected = selectedIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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

        {/* Comparison Matrix Table */}
        <div className="glass-panel rounded-3xl p-6 overflow-x-auto">
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
                        <XCircle className="w-4 h-4" /> N/A
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Multimodal Vision */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Vision & Images</td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4">
                    {m.supportsVision ? (
                      <span className="flex items-center gap-1.5 text-cyan-400 font-sans font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Multimodal
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-zinc-500 font-sans">
                        <XCircle className="w-4 h-4" /> Text Only
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Model Details Action */}
              <tr>
                <td className="py-4 px-4 font-sans font-bold text-zinc-400">Action</td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/models/${m.id}`}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans font-semibold text-xs flex items-center justify-center gap-1 border border-white/10"
                      >
                        <span>Specs</span>
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
        </div>
      </main>
    </div>
  );
}
