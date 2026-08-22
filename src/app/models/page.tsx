'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import {
  Cpu,
  Zap,
  Rocket,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Search,
  SlidersHorizontal
} from 'lucide-react';

export default function ModelsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'llm' | 'image'>('all');

  const filteredModels = EXCLUSIVE_MODEL_CATALOG.filter(m => {
    const matchesSearch =
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeCategory === 'all') return true;
    return m.category === activeCategory;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Supported Models & Pricing' }]} />

        {/* Page Hero */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
              <Cpu className="w-3.5 h-3.5" />
              <span>FRONTIER MODEL REGISTRY • 12 EXCLUSIVE ENGINES</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Supported Frontier Models & Architecture Specs
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              GALXAI exclusively routes to the latest generation OpenAI Codex coding models, xAI Grok 4.5 500K multimodal reasoning, and high-fidelity visual synthesis engines with 0% token leakage.
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models, providers, context..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 p-1 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold self-stretch sm:self-auto justify-center">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Models ({EXCLUSIVE_MODEL_CATALOG.length})
            </button>
            <button
              onClick={() => setActiveCategory('llm')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeCategory === 'llm'
                  ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              LLM & Reasoning (4)
            </button>
            <button
              onClick={() => setActiveCategory('image')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeCategory === 'image'
                  ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Visual Synthesis (8)
            </button>
          </div>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map((model) => {
            const isGrok = model.provider === 'xai-grok';
            const isImage = model.category === 'image';
            const detailHref = `/models/${model.id.replace('/', '-')}`;

            return (
              <div
                key={model.id}
                className="glass-card rounded-3xl p-6 border border-white/5 space-y-4 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isGrok
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      }`}>
                        {isGrok ? <Rocket className="w-4 h-4" /> : <Zap className="w-4 h-4 fill-amber-400" />}
                      </div>
                      <div>
                        <Link href={detailHref} className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                          {model.id}
                        </Link>
                        <p className="text-[10px] text-zinc-400 font-mono uppercase">{model.provider}</p>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold border border-indigo-500/30">
                      {isImage ? 'Visual' : `${model.contextWindowTokens / 1000}K Context`}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-zinc-200 line-clamp-1">{model.name}</h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {model.description}
                  </p>
                </div>

                {/* Specs Footer */}
                <div className="pt-3 border-t border-white/5 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-zinc-500 block text-[9px] uppercase">Input / 1M</span>
                      <span className="text-zinc-200 font-bold">${model.inputPricePer1M.toFixed(2)}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-zinc-500 block text-[9px] uppercase">Output / 1M</span>
                      <span className="text-zinc-200 font-bold">${model.outputPricePer1M.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Link
                      href={detailHref}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-semibold transition-colors"
                    >
                      <span>Full Specs</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>

                    <Link
                      href={`/playground?model=${model.id}`}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <span>Playground</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
